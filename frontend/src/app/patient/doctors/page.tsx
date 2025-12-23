'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, Calendar, Clock, User, Building, Stethoscope, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Input, Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { patientAppointmentApi } from '@/services/api';

interface Doctor {
    _id: string;
    email: string;
    profile: {
        firstName: string;
        lastName: string;
        specialization?: string;
        hospital?: string;
        bio?: string;
    };
    hasAvailability: boolean;
    availableDays: number[];
}

interface Slot {
    startTime: string;
    endTime: string;
    date: string;
    isAvailable: boolean;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BrowseDoctorsPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [bookingReason, setBookingReason] = useState('');
    const [bookingSymptoms, setBookingSymptoms] = useState('');
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async (searchQuery = '') => {
        try {
            setLoading(true);
            const response = await patientAppointmentApi.getDoctors({ search: searchQuery });
            setDoctors(response.data.doctors);
        } catch (error) {
            console.error('Error fetching doctors:', error);
            toast.error('Failed to load doctors');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchDoctors(search);
    };

    const handleSelectDoctor = (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setSlots([]);
        setSelectedDate('');
    };

    const handleDateChange = async (date: string) => {
        if (!selectedDoctor) return;
        setSelectedDate(date);
        setLoadingSlots(true);

        try {
            const response = await patientAppointmentApi.getDoctorSlots(selectedDoctor._id, date);
            setSlots(response.data.slots);
            if (response.data.slots.length === 0) {
                toast.error('No slots available on this day');
            }
        } catch (error) {
            console.error('Error fetching slots:', error);
            toast.error('Failed to load slots');
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleSlotClick = (slot: Slot) => {
        if (!slot.isAvailable) return;
        setSelectedSlot(slot);
        setShowBookingModal(true);
    };

    const handleBookAppointment = async () => {
        if (!selectedDoctor || !selectedSlot) return;

        setBooking(true);
        try {
            await patientAppointmentApi.bookAppointment({
                doctorId: selectedDoctor._id,
                date: selectedDate,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                reason: bookingReason,
                symptoms: bookingSymptoms
            });
            toast.success('Appointment booked! Waiting for doctor approval.');
            setShowBookingModal(false);
            setSelectedSlot(null);
            setBookingReason('');
            setBookingSymptoms('');
            // Refresh slots
            handleDateChange(selectedDate);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to book appointment');
        } finally {
            setBooking(false);
        }
    };

    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    if (loading) {
        return (
            <DashboardLayout role="patient">
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="patient">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Book an Appointment</h1>
                    <p className="text-gray-600">Browse doctors and book your consultation</p>
                </div>

                {/* Search */}
                <Card className="p-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by name, specialization, or hospital..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch}>
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                    </div>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Doctor List */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Available Doctors ({doctors.length})</h2>
                        {doctors.length === 0 ? (
                            <EmptyState
                                icon={<Stethoscope className="w-12 h-12" />}
                                title="No Doctors Found"
                                description="No approved doctors available at the moment"
                            />
                        ) : (
                            <div className="space-y-3">
                                {doctors.map((doctor) => (
                                    <Card
                                        key={doctor._id}
                                        className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedDoctor?._id === doctor._id ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
                                            }`}
                                        onClick={() => handleSelectDoctor(doctor)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <User className="w-6 h-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        Dr. {doctor.profile.firstName} {doctor.profile.lastName}
                                                    </h3>
                                                    {doctor.profile.specialization && (
                                                        <p className="text-sm text-indigo-600">{doctor.profile.specialization}</p>
                                                    )}
                                                    {doctor.profile.hospital && (
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Building className="w-3 h-3" />
                                                            {doctor.profile.hospital}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doctor.hasAvailability ? (
                                                    <Badge variant="success">Available</Badge>
                                                ) : (
                                                    <Badge variant="warning">No Slots Set</Badge>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </div>
                                        {doctor.availableDays.length > 0 && (
                                            <div className="mt-2 flex gap-1">
                                                {doctor.availableDays.map(day => (
                                                    <span key={day} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                        {dayNames[day]}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Slot Selection */}
                    <div className="space-y-4">
                        {selectedDoctor ? (
                            <>
                                <h2 className="text-lg font-semibold">
                                    Select Date & Time - Dr. {selectedDoctor.profile.firstName} {selectedDoctor.profile.lastName}
                                </h2>
                                <Card className="p-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                <Calendar className="w-4 h-4 inline mr-1" />
                                                Select Date
                                            </label>
                                            <input
                                                type="date"
                                                min={getMinDate()}
                                                value={selectedDate}
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>

                                        {loadingSlots && (
                                            <div className="flex justify-center py-8">
                                                <Spinner />
                                            </div>
                                        )}

                                        {selectedDate && !loadingSlots && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <Clock className="w-4 h-4 inline mr-1" />
                                                    Available Slots
                                                </label>
                                                {slots.length === 0 ? (
                                                    <p className="text-gray-500 text-center py-4">
                                                        No slots available on this day
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {slots.map((slot, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleSlotClick(slot)}
                                                                disabled={!slot.isAvailable}
                                                                className={`p-2 text-sm rounded-lg border transition-all ${slot.isAvailable
                                                                    ? 'border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer'
                                                                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                {slot.startTime}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </>
                        ) : (
                            <Card className="p-8 text-center">
                                <Stethoscope className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">Select a doctor to view available slots</p>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Booking Modal */}
                <Modal
                    isOpen={showBookingModal}
                    onClose={() => setShowBookingModal(false)}
                    title="Confirm Appointment"
                >
                    <div className="space-y-4">
                        {selectedDoctor && selectedSlot && (
                            <div className="p-4 bg-indigo-50 rounded-lg">
                                <p className="font-medium">Dr. {selectedDoctor.profile.firstName} {selectedDoctor.profile.lastName}</p>
                                <p className="text-sm text-indigo-600">{selectedDoctor.profile.specialization}</p>
                                <div className="mt-2 flex gap-4 text-sm text-gray-600">
                                    <span><Calendar className="w-4 h-4 inline mr-1" />{selectedDate}</span>
                                    <span><Clock className="w-4 h-4 inline mr-1" />{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason for Visit
                            </label>
                            <input
                                type="text"
                                value={bookingReason}
                                onChange={(e) => setBookingReason(e.target.value)}
                                placeholder="e.g., Regular checkup, Follow-up"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Symptoms (Optional)
                            </label>
                            <textarea
                                value={bookingSymptoms}
                                onChange={(e) => setBookingSymptoms(e.target.value)}
                                placeholder="Describe your symptoms..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowBookingModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBookAppointment}
                                disabled={booking}
                                className="flex-1"
                            >
                                {booking ? <Spinner size="sm" /> : 'Book Appointment'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
