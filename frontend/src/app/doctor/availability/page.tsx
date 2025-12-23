'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Clock, Calendar, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { doctorAppointmentApi } from '@/services/api';

interface Availability {
    _id: string;
    dayOfWeek: number;
    dayName: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
    date?: string; // ISO date string
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorAvailabilityPage() {
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [adding, setAdding] = useState(false);
    const [formData, setFormData] = useState({
        type: 'weekly', // 'weekly' or 'specific'
        dayOfWeek: 1,
        date: '',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30
    });

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const response = await doctorAppointmentApi.getAvailability();
            setAvailability(response.data.availability);
        } catch (error) {
            console.error('Error fetching availability:', error);
            toast.error('Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        setAdding(true);
        try {
            await doctorAppointmentApi.addAvailability(formData);
            toast.success('Availability added!');
            setShowAddModal(false);
            fetchAvailability();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to add availability');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this availability slot?')) return;

        try {
            await doctorAppointmentApi.deleteAvailability(id);
            toast.success('Slot removed');
            fetchAvailability();
        } catch (error) {
            toast.error('Failed to remove slot');
        }
    };

    // Group by day
    const groupedAvailability = availability.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) {
            acc[slot.dayOfWeek] = [];
        }
        acc[slot.dayOfWeek].push(slot);
        return acc;
    }, {} as Record<number, Availability[]>);

    if (loading) {
        return (
            <DashboardLayout role="doctor">
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="doctor">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
                        <p className="text-gray-600">Set your available time slots for appointments</p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Slot
                    </Button>
                </div>

                {/* Weekly Schedule */}
                {availability.length === 0 ? (
                    <EmptyState
                        icon={<Calendar className="w-12 h-12" />}
                        title="No Availability Set"
                        description="Add your available time slots so patients can book appointments"
                        action={
                            <Button onClick={() => setShowAddModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Slot
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-4">
                        {dayNames.map((dayName, dayIndex) => (
                            <Card key={dayIndex} className="p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{dayName}</h3>
                                    {groupedAvailability[dayIndex] ? (
                                        <div className="flex flex-wrap gap-2">
                                            {groupedAvailability[dayIndex].map((slot) => (
                                                <div
                                                    key={slot._id}
                                                    className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg"
                                                >
                                                    <Clock className="w-4 h-4 text-green-600" />
                                                    <span className="text-sm">
                                                        {slot.startTime} - {slot.endTime}
                                                    </span>
                                                    {slot.date && (
                                                        <Badge variant="warning">
                                                            {new Date(slot.date).toLocaleDateString()}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="info">{slot.slotDuration}min</Badge>
                                                    <button
                                                        onClick={() => handleDelete(slot._id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">Not available</span>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Add Modal */}
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Add Availability Slot"
                >
                    <div className="space-y-4">
                        {/* Type Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.type === 'weekly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setFormData({ ...formData, type: 'weekly', date: '' })}
                            >
                                Weekly Recurring
                            </button>
                            <button
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.type === 'specific' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setFormData({ ...formData, type: 'specific' })}
                            >
                                Specific Date
                            </button>
                        </div>

                        {formData.type === 'weekly' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                                <select
                                    value={formData.dayOfWeek}
                                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {dayNames.map((day, idx) => (
                                        <option key={idx} value={idx}>{day}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration</label>
                            <select
                                value={formData.slotDuration}
                                onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>60 minutes</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleAdd} disabled={adding} className="flex-1">
                                {adding ? <Spinner size="sm" /> : 'Add Slot'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
