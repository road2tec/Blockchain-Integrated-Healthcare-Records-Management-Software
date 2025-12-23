'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Button, Spinner, EmptyState } from '@/components/ui';
import { adminApi } from '@/services/api';
import { User } from '@/types';
import { Stethoscope, CheckCircle, XCircle, Clock, Building, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDoctorsPage() {
    const [doctors, setDoctors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const params = filter === 'all' ? {} : { status: filter };
            const response = await adminApi.getDoctors(params);
            setDoctors(response.data.doctors);
        } catch (error) {
            console.error('Failed to fetch doctors:', error);
            toast.error('Failed to load doctors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, [filter]);

    const handleApprove = async (id: string) => {
        try {
            await adminApi.approveDoctor(id);
            toast.success('Doctor approved successfully');
            fetchDoctors();
        } catch (error) {
            toast.error('Failed to approve doctor');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await adminApi.rejectDoctor(id);
            toast.success('Doctor registration rejected');
            fetchDoctors();
        } catch (error) {
            toast.error('Failed to reject doctor');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="success">Active</Badge>;
            case 'pending':
                return <Badge variant="warning">Pending</Badge>;
            case 'suspended':
                return <Badge variant="danger">Suspended</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Doctor Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Approve registrations and manage doctor accounts
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {(['all', 'pending', 'active'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Doctors List */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : doctors.length === 0 ? (
                    <Card className="p-8">
                        <EmptyState
                            icon={<Stethoscope className="w-12 h-12" />}
                            title="No doctors found"
                            description={filter === 'pending' ? 'No pending doctor registrations' : 'No doctors registered yet'}
                        />
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {doctors.map((doctor) => (
                            <Card key={doctor.id} className="p-6" hover>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
                                            {doctor.profile.firstName?.[0]}{doctor.profile.lastName?.[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    Dr. {doctor.profile.firstName} {doctor.profile.lastName}
                                                </h3>
                                                {getStatusBadge(doctor.status)}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {doctor.email}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                {doctor.profile.specialization && (
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="w-4 h-4" />
                                                        {doctor.profile.specialization}
                                                    </span>
                                                )}
                                                {doctor.profile.licenseNumber && (
                                                    <span className="flex items-center gap-1">
                                                        <Award className="w-4 h-4" />
                                                        {doctor.profile.licenseNumber}
                                                    </span>
                                                )}
                                                {doctor.profile.hospitalAffiliation && (
                                                    <span className="flex items-center gap-1">
                                                        <Building className="w-4 h-4" />
                                                        {doctor.profile.hospitalAffiliation}
                                                    </span>
                                                )}
                                            </div>
                                            {doctor.ethereumAddress && (
                                                <p className="text-xs font-mono text-gray-400 mt-2">
                                                    Wallet: {doctor.ethereumAddress.slice(0, 10)}...{doctor.ethereumAddress.slice(-8)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {doctor.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                leftIcon={<CheckCircle className="w-4 h-4" />}
                                                onClick={() => handleApprove(doctor.id)}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                leftIcon={<XCircle className="w-4 h-4" />}
                                                onClick={() => handleReject(doctor.id)}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
