'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Button, Spinner, EmptyState } from '@/components/ui';
import { patientApi } from '@/services/api';
import { User, Consent } from '@/types';
import { useBlockchain } from '@/hooks/useBlockchain';
import { ClipboardCheck, CheckCircle, XCircle, Clock, Stethoscope, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConsentRequest {
    id: string;
    doctor: User;
    message: string;
    scope: { recordTypes: string[] };
    requestedAt: string;
    status: string;
}

interface ActiveConsent {
    id: string;
    doctor: User;
    status: string;
    grantedAt?: string;
    blockchain?: {
        grantTransactionHash?: string;
    };
}

export default function PatientConsentPage() {
    const [pendingRequests, setPendingRequests] = useState<ConsentRequest[]>([]);
    const [activeConsents, setActiveConsents] = useState<ActiveConsent[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const { isConnected, signConsentGrant, signConsentRevoke } = useBlockchain();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [requestsRes, consentsRes] = await Promise.all([
                patientApi.getConsentRequests('pending'),
                patientApi.getConsents(),
            ]);
            setPendingRequests(requestsRes.data.requests);
            setActiveConsents(consentsRes.data.consents.filter((c: ActiveConsent) => c.status === 'granted'));
        } catch (error) {
            console.error('Failed to fetch consents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGrant = async (doctorId: string, doctorAddress?: string) => {
        if (!isConnected) {
            toast.error('Please connect MetaMask to grant consent');
            return;
        }

        setProcessing(doctorId);
        try {
            // Sign consent on blockchain (if doctor has address)
            let signature = null;
            if (doctorAddress) {
                signature = await signConsentGrant(doctorAddress);
            }

            await patientApi.grantConsent(doctorId, {
                transactionHash: signature?.signature || undefined,
            });

            toast.success('Consent granted successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to grant consent');
        } finally {
            setProcessing(null);
        }
    };

    const handleRevoke = async (doctorId: string, doctorAddress?: string) => {
        if (!isConnected) {
            toast.error('Please connect MetaMask to revoke consent');
            return;
        }

        setProcessing(doctorId);
        try {
            // Sign revocation on blockchain (if doctor has address)
            let signature = null;
            if (doctorAddress) {
                signature = await signConsentRevoke(doctorAddress);
            }

            await patientApi.revokeConsent(doctorId, {
                reason: 'Consent revoked by patient',
                transactionHash: signature?.signature || undefined,
            });

            toast.success('Consent revoked successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to revoke consent');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <DashboardLayout role="patient">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Consent Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Control who can access your medical records
                    </p>
                </div>

                {!isConnected && (
                    <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            <span className="text-sm text-amber-700 dark:text-amber-400">
                                Connect MetaMask to grant or revoke consents on the blockchain
                            </span>
                        </div>
                    </Card>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Pending Requests */}
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-amber-500" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Pending Requests
                                </h2>
                                {pendingRequests.length > 0 && (
                                    <Badge variant="warning">{pendingRequests.length}</Badge>
                                )}
                            </div>

                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                    <p>No pending requests</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                    <Stethoscope className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        Dr. {request.doctor?.profile?.firstName} {request.doctor?.profile?.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {request.doctor?.profile?.specialization || 'General Medicine'}
                                                    </p>
                                                    {request.message && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                                            &quot;{request.message}&quot;
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Requested: {new Date(request.requestedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    leftIcon={<CheckCircle className="w-4 h-4" />}
                                                    onClick={() => handleGrant(request.doctor?.id, request.doctor?.ethereumAddress)}
                                                    isLoading={processing === request.doctor?.id}
                                                    disabled={!isConnected}
                                                >
                                                    Grant Access
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    leftIcon={<XCircle className="w-4 h-4" />}
                                                    disabled={processing === request.doctor?.id}
                                                >
                                                    Deny
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Active Consents */}
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Active Consents
                                </h2>
                                {activeConsents.length > 0 && (
                                    <Badge variant="success">{activeConsents.length}</Badge>
                                )}
                            </div>

                            {activeConsents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                    <p>No active consents</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeConsents.map((consent) => (
                                        <div
                                            key={consent.id}
                                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            Dr. {consent.doctor?.profile?.firstName} {consent.doctor?.profile?.lastName}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {consent.doctor?.profile?.specialization || 'General Medicine'}
                                                        </p>
                                                        {consent.grantedAt && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Granted: {new Date(consent.grantedAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                        {consent.blockchain?.grantTransactionHash && (
                                                            <p className="text-xs font-mono text-gray-400 mt-1">
                                                                Tx: {consent.blockchain.grantTransactionHash.slice(0, 16)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleRevoke(consent.doctor?.id, consent.doctor?.ethereumAddress)}
                                                    isLoading={processing === consent.doctor?.id}
                                                    disabled={!isConnected}
                                                >
                                                    Revoke
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* Info */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        How Blockchain Consent Works
                    </h3>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <li>• When you grant consent, it&apos;s recorded on the Ethereum blockchain</li>
                        <li>• Doctors can only access your records with blockchain-verified consent</li>
                        <li>• Revoking consent immediately removes access and is logged on-chain</li>
                        <li>• All consent actions are immutable and auditable</li>
                    </ul>
                </Card>
            </div>
        </DashboardLayout>
    );
}
