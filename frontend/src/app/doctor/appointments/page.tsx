'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, CheckCircle, XCircle, Video, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Badge, Spinner, EmptyState, Modal, Input } from '@/components/ui';
import { doctorAppointmentApi } from '@/services/api';

interface Patient {
    _id: string;
    profile: {
        firstName: string;
        lastName: string;
        dateOfBirth?: string;
        phone?: string;
    };
    email: string;
}

interface Appointment {
    _id: string;
    patientId: Patient;
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' | 'info' }> = {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },
    completed: { label: 'Completed', variant: 'info' },
    cancelled: { label: 'Cancelled', variant: 'default' }
};

export default function DoctorAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('pending');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [meetingLink, setMeetingLink] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await doctorAppointmentApi.getAppointments({ status: filter || undefined });
            setAppointments(response.data.appointments);
            setStatusCounts(response.data.statusCounts || {});
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setMeetingLink('');
        setShowApproveModal(true);
    };

    const handleRejectClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleApprove = async () => {
        if (!selectedAppointment || !meetingLink) return;

        if (!meetingLink.includes('meet.google.com') && !meetingLink.includes('zoom.us')) {
            toast.error('Please provide a valid Google Meet or Zoom link');
            return;
        }

        setProcessing(true);
        try {
            await doctorAppointmentApi.approveAppointment(selectedAppointment._id, meetingLink);
            toast.success('Appointment approved! Patient will receive the meeting link.');
            setShowApproveModal(false);
            fetchAppointments();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to approve');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedAppointment) return;

        setProcessing(true);
        try {
            await doctorAppointmentApi.rejectAppointment(selectedAppointment._id, rejectReason);
            toast.success('Appointment rejected');
            setShowRejectModal(false);
            fetchAppointments();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to reject');
        } finally {
            setProcessing(false);
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await doctorAppointmentApi.completeAppointment(id);
            toast.success('Appointment marked as completed');
            fetchAppointments();
        } catch (error) {
            toast.error('Failed to complete appointment');
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
                        <h1 className="text-2xl font-bold text-gray-900">Appointment Requests</h1>
                        <p className="text-gray-600">Manage your patient appointments</p>
                    </div>
                    <Button onClick={() => window.location.href = '/doctor/availability'}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Manage Availability
                    </Button>
                </div>

                {/* Status Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(statusConfig).map(([status, config]) => (
                        <div
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`p-4 bg-white rounded-xl shadow-sm cursor-pointer transition-all hover:shadow-md ${filter === status ? 'ring-2 ring-indigo-500' : ''}`}
                        >
                            <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
                            <div className="text-sm text-gray-500">{config.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {['pending', 'approved', 'completed', 'rejected', 'cancelled', ''].map((status) => (
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
                        description={filter ? `No ${filter} appointments` : 'No appointments found'}
                    />
                ) : (
                    <div className="space-y-4">
                        {appointments.map((appointment) => {
                            const config = statusConfig[appointment.status];
                            return (
                                <Card key={appointment._id} className="p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                                <User className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {appointment.patientId.profile.firstName} {appointment.patientId.profile.lastName}
                                                </h3>
                                                <p className="text-sm text-gray-500">{appointment.patientId.email}</p>
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
                                                    <p className="text-sm text-gray-600 mt-2">
                                                        <strong>Reason:</strong> {appointment.reason}
                                                    </p>
                                                )}
                                                {appointment.symptoms && (
                                                    <p className="text-sm text-gray-600">
                                                        <strong>Symptoms:</strong> {appointment.symptoms}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant={config.variant}>{config.label}</Badge>

                                            {appointment.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleApproveClick(appointment)}>
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRejectClick(appointment)}
                                                        className="text-red-600"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}

                                            {appointment.status === 'approved' && (
                                                <div className="flex flex-col items-end gap-2">
                                                    {appointment.meetingLink && (
                                                        <a
                                                            href={appointment.meetingLink.startsWith('http') ? appointment.meetingLink : `https://${appointment.meetingLink}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-indigo-600 flex items-center gap-1"
                                                        >
                                                            <Video className="w-4 h-4" />
                                                            Meeting Link
                                                        </a>
                                                    )}
                                                    <Button size="sm" onClick={() => handleComplete(appointment._id)}>
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Mark Complete
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Approve Modal */}
                <Modal
                    isOpen={showApproveModal}
                    onClose={() => setShowApproveModal(false)}
                    title="Approve Appointment"
                >
                    <div className="space-y-4">
                        {selectedAppointment && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p><strong>Patient:</strong> {selectedAppointment.patientId.profile.firstName} {selectedAppointment.patientId.profile.lastName}</p>
                                <p><strong>Date:</strong> {formatDate(selectedAppointment.date)}</p>
                                <p><strong>Time:</strong> {selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <LinkIcon className="w-4 h-4 inline mr-1" />
                                Google Meet / Zoom Link *
                            </label>
                            <Input
                                placeholder="https://meet.google.com/..."
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Create a meeting in Google Meet or Zoom and paste the link here
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowApproveModal(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleApprove} disabled={processing || !meetingLink} className="flex-1">
                                {processing ? <Spinner size="sm" /> : 'Approve & Send Link'}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Reject Modal */}
                <Modal
                    isOpen={showRejectModal}
                    onClose={() => setShowRejectModal(false)}
                    title="Reject Appointment"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-lg flex gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-700">
                                The patient will be notified that their appointment request was rejected.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason (Optional)
                            </label>
                            <textarea
                                placeholder="Provide a reason for rejection..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReject}
                                disabled={processing}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                {processing ? <Spinner size="sm" /> : 'Reject Appointment'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}

