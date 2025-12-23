'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Button, Spinner, EmptyState, Input, Modal } from '@/components/ui';
import { doctorApi } from '@/services/api';
import { User, Consent } from '@/types';
import { UserCheck, Search, Plus, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PatientWithConsent {
    consent: {
        id: string;
        status: string;
        scope: { recordTypes: string[] };
        grantedAt?: string;
        requestedAt: string;
    };
    patient: User;
}

export default function DoctorPatientsPage() {
    const [patients, setPatients] = useState<PatientWithConsent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; email: string; firstName: string; lastName: string; consentStatus: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [requestingConsent, setRequestingConsent] = useState<string | null>(null);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const response = await doctorApi.getPatients({ status: 'granted' });
            setPatients(response.data.patients);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleSearch = async () => {
        if (searchQuery.length < 2) {
            toast.error('Search query must be at least 2 characters');
            return;
        }

        setSearching(true);
        try {
            const response = await doctorApi.searchPatients(searchQuery);
            setSearchResults(response.data.patients);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const handleRequestConsent = async (patientId: string) => {
        setRequestingConsent(patientId);
        try {
            await doctorApi.requestConsent(patientId, {
                message: 'I would like to access your medical records for treatment purposes.',
            });
            toast.success('Consent request sent');
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            toast.error('Failed to send consent request');
        } finally {
            setRequestingConsent(null);
        }
    };

    return (
        <DashboardLayout role="doctor">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            My Patients
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Patients who have granted you access to their records
                        </p>
                    </div>
                    <Button
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowSearchModal(true)}
                    >
                        Request Access
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : patients.length === 0 ? (
                    <Card className="p-8">
                        <EmptyState
                            icon={<UserCheck className="w-12 h-12" />}
                            title="No patients yet"
                            description="Search for patients and request access to their medical records"
                            action={
                                <Button
                                    leftIcon={<Search className="w-4 h-4" />}
                                    onClick={() => setShowSearchModal(true)}
                                >
                                    Find Patients
                                </Button>
                            }
                        />
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {patients.map((item) => (
                            <Card key={item.consent.id} className="p-6" hover>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-semibold">
                                        {item.patient?.profile?.firstName?.[0]}{item.patient?.profile?.lastName?.[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {item.patient?.profile?.firstName} {item.patient?.profile?.lastName}
                                            </h3>
                                            <Badge variant="success">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Consent Granted
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {item.patient?.email}
                                        </p>
                                        {item.consent.grantedAt && (
                                            <p className="text-xs text-gray-400 mt-2">
                                                Access granted: {new Date(item.consent.grantedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <a
                                        href={`/doctor/records?patient=${item.patient?.id}`}
                                        className="text-sm text-blue-600 hover:underline font-medium"
                                    >
                                        View Medical Records →
                                    </a>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Search Modal */}
                <Modal
                    isOpen={showSearchModal}
                    onClose={() => {
                        setShowSearchModal(false);
                        setSearchQuery('');
                        setSearchResults([]);
                    }}
                    title="Request Patient Access"
                    size="md"
                >
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="w-4 h-4" />}
                            />
                            <Button onClick={handleSearch} isLoading={searching}>
                                Search
                            </Button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {searchResults.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {patient.firstName} {patient.lastName}
                                            </p>
                                            <p className="text-sm text-gray-500">{patient.email}</p>
                                        </div>
                                        {patient.consentStatus === 'granted' ? (
                                            <Badge variant="success">Access Granted</Badge>
                                        ) : patient.consentStatus === 'pending' ? (
                                            <Badge variant="warning">Pending</Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                leftIcon={<Send className="w-3 h-3" />}
                                                isLoading={requestingConsent === patient.id}
                                                onClick={() => handleRequestConsent(patient.id)}
                                            >
                                                Request
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
