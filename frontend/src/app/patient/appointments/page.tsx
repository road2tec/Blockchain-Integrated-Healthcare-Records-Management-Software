'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, Video, User, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { patientAppointmentApi } from '@/services/api';
import { useRouter } from 'next/navigation';

interface Doctor {
    _id: string;
    profile: {
        firstName: string;
        lastName: string;
        specialization?: string;
        hospital?: string;
    };
    email: string;
}

interface Appointment {
    _id: string;
    doctorId: Doctor;
    date: string;
    startTime: string;
    endTime: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    reason?: string;
    symptoms?: string;
    meetingLink?: string;
    rejectionReason?: string;
    createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' | 'info'; icon: typeof CheckCircle }> = {
    pending: { label: 'Pending', variant: 'warning', icon: AlertCircle },
    approved: { label: 'Approved', variant: 'success', icon: CheckCircle },
    rejected: { label: 'Rejected', variant: 'danger', icon: XCircle },
    completed: { label: 'Completed', variant: 'info', icon: CheckCircle },
    cancelled: { label: 'Cancelled', variant: 'default', icon: X }
};

export default function PatientAppointmentsPage() {
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await patientAppointmentApi.getAppointments({ status: filter || undefined });
            setAppointments(response.data.appointments);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setShowCancelModal(true);
    };

    const handleCancelConfirm = async () => {
        if (!selectedAppointment) return;

        setCancelling(true);
        try {
            await patientAppointmentApi.cancelAppointment(selectedAppointment._id);
            toast.success('Appointment cancelled');
            setShowCancelModal(false);
            fetchAppointments();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to cancel');
        } finally {
            setCancelling(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
                        <p className="text-gray-600">View and manage your appointments</p>
                    </div>
                    <Button onClick={() => router.push('/patient/doctors')}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Book New
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {['', 'pending', 'approved', 'completed', 'rejected', 'cancelled'].map((status) => (
                        <Button
                            key={status}
                            variant={filter === status ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(status)}
                        >
                            {status || 'All'}
                        </Button>
                    ))}
                </div>

                {/* Appointments List */}
                {appointments.length === 0 ? (
                    <EmptyState
                        icon={<Calendar className="w-12 h-12" />}
                        title="No Appointments"
                        description={filter ? `No ${filter} appointments found` : 'You haven\'t booked any appointments yet'}
                        action={
                            <Button onClick={() => router.push('/patient/doctors')}>
                                Book an Appointment
                            </Button>
                        }
                    />
                ) : (
                    <div className="space-y-4">
                        {appointments.map((appointment) => {
                            const config = statusConfig[appointment.status];
                            const StatusIcon = config.icon;
                            return (
                                <Card key={appointment._id} className="p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                                <User className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    Dr. {appointment.doctorId.profile.firstName} {appointment.doctorId.profile.lastName}
                                                </h3>
                                                <p className="text-sm text-indigo-600">
                                                    {appointment.doctorId.profile.specialization}
                                                </p>
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

                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant={config.variant}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {config.label}
                                            </Badge>

                                            {appointment.status === 'approved' && appointment.meetingLink && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const link = appointment.meetingLink || '';
                                                        const url = link.startsWith('http') ? link : `https://${link}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    <Video className="w-4 h-4 mr-1" />
                                                    Join Meeting
                                                </Button>
                                            )}

                                            {['pending', 'approved'].includes(appointment.status) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelClick(appointment)}
                                                    className="text-red-600"
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    Cancel
                                                </Button>
                                            )}

                                            {appointment.status === 'rejected' && appointment.rejectionReason && (
                                                <p className="text-sm text-red-600">
                                                    Reason: {appointment.rejectionReason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Cancel Modal */}
                <Modal
                    isOpen={showCancelModal}
                    onClose={() => setShowCancelModal(false)}
                    title="Cancel Appointment?"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to cancel this appointment? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1"
                            >
                                Keep Appointment
                            </Button>
                            <Button
                                onClick={handleCancelConfirm}
                                disabled={cancelling}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                {cancelling ? <Spinner size="sm" /> : 'Yes, Cancel'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
