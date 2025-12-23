'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Spinner } from '@/components/ui';
import { MetaMaskButton } from '@/components/blockchain/MetaMaskButton';
import { doctorApi } from '@/services/api';
import { DoctorDashboard, MedicalRecord } from '@/types';
import { useBlockchain } from '@/hooks/useBlockchain';
import {
    Users,
    FileText,
    Clock,
    Wallet,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';

export default function DoctorDashboardPage() {
    const [data, setData] = useState<DoctorDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const { isConnected, isWalletLinked } = useBlockchain();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await doctorApi.getDashboard();
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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Doctor Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage patients and medical records securely
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
                                    Connect MetaMask to sign medical records and consent requests on the blockchain.
                                </p>
                                <MetaMaskButton size="sm" />
                            </div>
                        </div>
                    </Card>
                )}

                {isWalletLinked && isConnected && (
                    <Card className="p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                Wallet connected and ready for blockchain transactions
                            </span>
                        </div>
                    </Card>
                )}

                {/* Stats */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="p-6" hover>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Patients with Consent</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {data?.patientCount || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6" hover>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Records Uploaded</p>
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
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Recent Records
                    </h2>
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
                                    <Badge variant={record.status === 'verified' ? 'success' : 'warning'}>
                                        {record.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No records uploaded yet</p>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
