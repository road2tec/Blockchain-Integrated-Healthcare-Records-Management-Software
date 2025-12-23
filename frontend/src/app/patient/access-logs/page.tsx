'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Spinner, EmptyState } from '@/components/ui';
import { patientApi } from '@/services/api';
import { Eye, Download, Share, FileText, Clock, User } from 'lucide-react';

interface AccessLog {
    recordId: string;
    recordTitle: string;
    accessedBy: {
        _id: string;
        profile: {
            firstName: string;
            lastName: string;
        };
        role: string;
    };
    accessType: 'view' | 'download' | 'share';
    accessedAt: string;
}

export default function PatientAccessLogsPage() {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await patientApi.getAccessLogs({ limit: 50 });
                setLogs(response.data.logs);
            } catch (error) {
                console.error('Failed to fetch access logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const getAccessIcon = (type: string) => {
        switch (type) {
            case 'view':
                return <Eye className="w-4 h-4" />;
            case 'download':
                return <Download className="w-4 h-4" />;
            case 'share':
                return <Share className="w-4 h-4" />;
            default:
                return <Eye className="w-4 h-4" />;
        }
    };

    const getAccessColor = (type: string) => {
        switch (type) {
            case 'view':
                return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case 'download':
                return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
            case 'share':
                return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <DashboardLayout role="patient">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Access Logs
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        See who has accessed your medical records
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : logs.length === 0 ? (
                    <Card className="p-8">
                        <EmptyState
                            icon={<Eye className="w-12 h-12" />}
                            title="No access logs yet"
                            description="When someone accesses your records, it will appear here"
                        />
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Record
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Accessed By
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Date & Time
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.map((log, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-gray-400" />
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {log.recordTitle}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {log.accessedBy?.profile?.firstName} {log.accessedBy?.profile?.lastName}
                                                        </p>
                                                        <p className="text-xs text-gray-500 capitalize">
                                                            {log.accessedBy?.role}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getAccessColor(log.accessType)}`}>
                                                    {getAccessIcon(log.accessType)}
                                                    {log.accessType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Clock className="w-4 h-4" />
                                                    {new Date(log.accessedAt).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Info Card */}
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Complete Transparency
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Every access to your medical records is logged both in our database and on the blockchain.
                        This ensures complete transparency and allows you to track exactly who accessed your data and when.
                    </p>
                </Card>
            </div>
        </DashboardLayout>
    );
}
