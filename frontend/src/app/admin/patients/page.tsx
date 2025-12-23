'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Button, Spinner, EmptyState } from '@/components/ui';
import { adminApi } from '@/services/api';
import { User } from '@/types';
import { Users, CheckCircle, XCircle, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPatientsPage() {
    const [patients, setPatients] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const response = await adminApi.getPatients();
            setPatients(response.data.patients);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleStatusChange = async (id: string, status: 'active' | 'suspended') => {
        try {
            await adminApi.updatePatientStatus(id, status);
            toast.success(`Patient ${status === 'active' ? 'activated' : 'suspended'}`);
            fetchPatients();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Patient Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage patient accounts and access
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : patients.length === 0 ? (
                    <Card className="p-8">
                        <EmptyState
                            icon={<Users className="w-12 h-12" />}
                            title="No patients found"
                            description="No patients have registered yet"
                        />
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {patients.map((patient) => (
                            <Card key={patient.id} className="p-6" hover>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-semibold">
                                            {patient.profile.firstName?.[0]}{patient.profile.lastName?.[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {patient.profile.firstName} {patient.profile.lastName}
                                                </h3>
                                                <Badge variant={patient.status === 'active' ? 'success' : 'danger'}>
                                                    {patient.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                                <Mail className="w-3 h-3" />
                                                {patient.email}
                                            </div>
                                            {patient.profile.phone && (
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <Phone className="w-3 h-3" />
                                                    {patient.profile.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant={patient.status === 'active' ? 'danger' : 'primary'}
                                        size="sm"
                                        leftIcon={patient.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                        onClick={() => handleStatusChange(patient.id, patient.status === 'active' ? 'suspended' : 'active')}
                                    >
                                        {patient.status === 'active' ? 'Suspend' : 'Activate'}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
