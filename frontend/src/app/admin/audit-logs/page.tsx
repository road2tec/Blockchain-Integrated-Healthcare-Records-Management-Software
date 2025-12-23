'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, EmptyState } from '@/components/ui';
import { ScrollText, Database } from 'lucide-react';

export default function AdminAuditLogsPage() {
    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Blockchain Audit Logs
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View immutable audit trail from the blockchain
                    </p>
                </div>

                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                            On-Chain Activity Log
                        </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Audit logs are stored on the Ethereum blockchain and cannot be modified or deleted.
                            This ensures complete transparency and regulatory compliance.
                        </p>
                    </div>

                    <EmptyState
                        icon={<ScrollText className="w-12 h-12" />}
                        title="Connect to Blockchain"
                        description="Start Ganache and deploy contracts to view audit logs from the blockchain"
                    />
                </Card>
            </div>
        </DashboardLayout>
    );
}
