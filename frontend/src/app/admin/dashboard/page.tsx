'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Spinner } from '@/components/ui';
import { adminApi } from '@/services/api';
import { AdminStats } from '@/types';
import {
    Users,
    Stethoscope,
    FileText,
    ClipboardCheck,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingUp,
} from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await adminApi.getStats();
                setStats(response.data.stats);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <DashboardLayout role="admin">
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    const statCards = [
        {
            title: 'Total Doctors',
            value: stats?.doctors.total || 0,
            subtext: `${stats?.doctors.pending || 0} pending approval`,
            icon: Stethoscope,
            color: 'from-blue-500 to-indigo-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: 'Total Patients',
            value: stats?.patients.total || 0,
            subtext: `${stats?.patients.active || 0} active`,
            icon: Users,
            color: 'from-emerald-500 to-teal-500',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
            title: 'Medical Records',
            value: stats?.records.total || 0,
            subtext: 'Blockchain verified',
            icon: FileText,
            color: 'from-purple-500 to-violet-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            title: 'Active Consents',
            value: stats?.consents.active || 0,
            subtext: 'Patient-granted access',
            icon: ClipboardCheck,
            color: 'from-amber-500 to-orange-500',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
    ];

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Overview of the healthcare blockchain system
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={index} className="p-6" hover>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {stat.title}
                                        </p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                            {stat.value}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
                                    </div>
                                    <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                                        <Icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ color: 'inherit' }} />
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Pending Approvals */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Pending Doctor Approvals
                            </h2>
                            <Badge variant="warning">{stats?.doctors.pending || 0} pending</Badge>
                        </div>
                        {stats?.doctors.pending ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {stats.doctors.pending} doctor(s) awaiting approval
                                            </p>
                                            <p className="text-sm text-gray-500">Review registrations</p>
                                        </div>
                                    </div>
                                    <a
                                        href="/admin/doctors"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Review
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                                <p>No pending approvals</p>
                            </div>
                        )}
                    </Card>

                    {/* System Health */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            System Status
                        </h2>
                        <div className="space-y-3">
                            {[
                                { name: 'MongoDB Atlas', status: 'connected', icon: CheckCircle2 },
                                { name: 'Blockchain (Ganache)', status: 'active', icon: CheckCircle2 },
                                { name: 'Smart Contracts', status: 'deployed', icon: CheckCircle2 },
                            ].map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-5 h-5 text-emerald-500" />
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {item.name}
                                            </span>
                                        </div>
                                        <Badge variant="success">{item.status}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                        <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
                        <h3 className="font-semibold mb-1">Blockchain Security</h3>
                        <p className="text-sm opacity-80">
                            All medical records are hashed with SHA-256 and stored immutably on the blockchain
                        </p>
                    </Card>
                    <Card className="p-6 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                        <ClipboardCheck className="w-8 h-8 mb-3 opacity-80" />
                        <h3 className="font-semibold mb-1">Consent Management</h3>
                        <p className="text-sm opacity-80">
                            Patient consent is recorded on-chain for transparent and verifiable access control
                        </p>
                    </Card>
                    <Card className="p-6 bg-gradient-to-br from-purple-600 to-violet-600 text-white">
                        <FileText className="w-8 h-8 mb-3 opacity-80" />
                        <h3 className="font-semibold mb-1">Audit Trail</h3>
                        <p className="text-sm opacity-80">
                            Complete audit logs stored on blockchain for regulatory compliance
                        </p>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
