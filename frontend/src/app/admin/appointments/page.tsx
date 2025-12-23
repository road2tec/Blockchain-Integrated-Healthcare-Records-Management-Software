'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Stethoscope, Search, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Badge, Spinner, EmptyState, Input } from '@/components/ui';
import { adminApi } from '@/services/api';

interface Doctor {
    _id: string;
    profile: {
        firstName: string;
        lastName: string;
        specialization?: string;
    };
}

interface Patient {
    _id: string;
    profile: {
        firstName: string;
        lastName: string;
    };
}

interface Appointment {
    _id: string;
    patientId: Patient;
    doctorId: Doctor;
    date: string;
    startTime: string;
    endTime: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    reason?: string;
    meetingLink?: string;
    createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' | 'info' }> = {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },
    completed: { label: 'Completed', variant: 'info' },
    cancelled: { label: 'Cancelled', variant: 'default' }
};

export default function AdminAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getAllAppointments({ status: filter || undefined });
            setAppointments(response.data.appointments);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const filteredAppointments = appointments.filter(apt => {
        if (!search) return true;
        const doctorName = `${apt.doctorId.profile.firstName} ${apt.doctorId.profile.lastName}`.toLowerCase();
        const patientName = `${apt.patientId.profile.firstName} ${apt.patientId.profile.lastName}`.toLowerCase();
        return doctorName.includes(search.toLowerCase()) || patientName.includes(search.toLowerCase());
    });

    if (loading) {
        return (
            <DashboardLayout role="admin">
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Appointments</h1>
                    <p className="text-gray-600">Monitor and manage all system appointments</p>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by doctor or patient name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(statusConfig).map(([status, config]) => {
                        const count = appointments.filter(a => a.status === status).length;
                        return (
                            <Card key={status} className="p-4">
                                <div className="text-2xl font-bold">{count}</div>
                                <div className="text-sm text-gray-500">{config.label}</div>
                            </Card>
                        );
                    })}
                </div>

                {/* Appointments List */}
                {filteredAppointments.length === 0 ? (
                    <EmptyState
                        icon={<Calendar className="w-12 h-12" />}
                        title="No Appointments"
                        description="No appointments found matching your criteria"
                    />
                ) : (
                    <div className="space-y-4">
                        {filteredAppointments.map((appointment) => {
                            const config = statusConfig[appointment.status];
                            return (
                                <Card key={appointment._id} className="p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                                <Calendar className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="flex items-center gap-1 text-sm">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <strong>Patient:</strong> {appointment.patientId.profile.firstName} {appointment.patientId.profile.lastName}
                                                    </span>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="flex items-center gap-1 text-sm">
                                                        <Stethoscope className="w-4 h-4 text-gray-400" />
                                                        <strong>Doctor:</strong> Dr. {appointment.doctorId.profile.firstName} {appointment.doctorId.profile.lastName}
                                                    </span>
                                                </div>
                                                {appointment.doctorId.profile.specialization && (
                                                    <p className="text-sm text-indigo-600">{appointment.doctorId.profile.specialization}</p>
                                                )}
                                                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(appointment.date)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {appointment.startTime} - {appointment.endTime}
                                                    </span>
                                                </div>
                                                {appointment.reason && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        <strong>Reason:</strong> {appointment.reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <Badge variant={config.variant}>{config.label}</Badge>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
