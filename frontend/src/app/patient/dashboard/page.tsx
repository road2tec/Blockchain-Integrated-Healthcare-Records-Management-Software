'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Spinner } from '@/components/ui';
import { MetaMaskButton } from '@/components/blockchain/MetaMaskButton';
import { patientApi } from '@/services/api';
import { PatientDashboard, MedicalRecord } from '@/types';
import { useBlockchain } from '@/hooks/useBlockchain';
import {
    FileText,
    ClipboardCheck,
    Bell,
    Wallet,
    AlertCircle,
    CheckCircle2,
    Clock,
} from 'lucide-react';

export default function PatientDashboardPage() {
    const [data, setData] = useState<PatientDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const { isConnected, isWalletLinked } = useBlockchain();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await patientApi.getDashboard();
                setData(response.data.dashboard);
            } catch (error) {
                console.error('Failed to fetch dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Patient Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Your health records, your control
                    </p>
                </div>

                {/* Wallet Connection Alert */}
                {!isWalletLinked && (
                    <Card className="p-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Connect Your Wallet
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                                    Connect MetaMask to grant or revoke doctor access on the blockchain.
                                </p>
                                <MetaMaskButton size="sm" />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Pending Requests */}
                {data?.pendingRequests && data.pendingRequests > 0 && (
                    <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-blue-500" />
                                <span className="text-sm text-blue-700 dark:text-blue-400">
                                    You have {data.pendingRequests} pending consent request(s)
                                </span>
                            </div>
                            <a
                                href="/patient/consent"
                                className="text-sm font-medium text-blue-600 hover:underline"
                            >
                                Review →
                            </a>
                        </div>
                    </Card>
                )}

                {/* Stats */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6" hover>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Medical Records</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {data?.recordCount || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6" hover>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Active Consents</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {data?.activeConsents || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                                <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6" hover>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Requests</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {data?.pendingRequests || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                                <Bell className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6" hover>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Wallet Status</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                    {isConnected ? 'Connected' : 'Not Connected'}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                <Wallet className={`w-6 h-6 ${isConnected ? 'text-emerald-600' : 'text-gray-400'}`} />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Recent Records */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Recent Medical Records
                        </h2>
                        <a href="/patient/records" className="text-sm text-blue-600 hover:underline">
                            View All →
                        </a>
                    </div>
                    {data?.recentRecords && data.recentRecords.length > 0 ? (
                        <div className="space-y-3">
                            {data.recentRecords.map((record: MedicalRecord) => (
                                <div
                                    key={record._id}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {record.title}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {record.recordType} • {new Date(record.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={record.status === 'verified' ? 'success' : 'warning'}>
                                            {record.status === 'verified' ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Verified
                                                </>
                                            ) : (
                                                record.status
                                            )}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No medical records yet</p>
                        </div>
                    )}
                </Card>

                {/* Info Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                        <ClipboardCheck className="w-8 h-8 mb-3 opacity-80" />
                        <h3 className="font-semibold mb-1">You're In Control</h3>
                        <p className="text-sm opacity-80">
                            Only you can grant or revoke access to your medical records. All actions are recorded on the blockchain.
                        </p>
                    </Card>
                    <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                        <FileText className="w-8 h-8 mb-3 opacity-80" />
                        <h3 className="font-semibold mb-1">Verified Records</h3>
                        <p className="text-sm opacity-80">
                            Every medical record is hashed and stored on the blockchain, ensuring tamper-proof integrity.
                        </p>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
