'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { MetaMaskButton } from '@/components/blockchain/MetaMaskButton';
import { clsx } from 'clsx';
import {
    ShieldCheck,
    LayoutDashboard,
    Users,
    Stethoscope,
    FileText,
    LogOut,
    Menu,
    X,
    ScrollText,
    UserCheck,
    ClipboardList,
    Eye,
    Settings,
    Share2,
    Wallet,
} from 'lucide-react';

interface DashboardLayoutProps {
    children: ReactNode;
    role: 'admin' | 'doctor' | 'patient';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, checkAuth, isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        } else if (!isLoading && user && user.role !== role) {
            router.push(`/${user.role}/dashboard`);
        }
    }, [isLoading, isAuthenticated, user, role, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const navigation = {
        admin: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
            { name: 'Doctors', href: '/admin/doctors', icon: Stethoscope },
            { name: 'Patients', href: '/admin/patients', icon: Users },
            { name: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
        ],
        doctor: [
            { name: 'Dashboard', href: '/doctor/dashboard', icon: LayoutDashboard },
            { name: 'My Patients', href: '/doctor/patients', icon: UserCheck },
            { name: 'Medical Records', href: '/doctor/records', icon: FileText },
            { name: 'Shared Records', href: '/doctor/shared-records', icon: Wallet },
        ],
        patient: [
            { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard },
            { name: 'Medical Records', href: '/patient/records', icon: FileText },
            { name: 'Share My Records', href: '/patient/shared-records', icon: Share2 },
            { name: 'Consent Management', href: '/patient/consent', icon: ClipboardList },
            { name: 'Access Logs', href: '/patient/access-logs', icon: Eye },
        ],
    };

    const roleColors = {
        admin: 'from-purple-600 to-violet-600',
        doctor: 'from-blue-600 to-indigo-600',
        patient: 'from-emerald-600 to-teal-600',
    };

    const nav = navigation[role];

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                        <Link href="/" className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${roleColors[role]} rounded-xl flex items-center justify-center`}>
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">HealthChain</span>
                                <p className="text-xs text-gray-500 capitalize">{role} Panel</p>
                            </div>
                        </Link>
                        <button
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {nav.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                                        isActive
                                            ? `bg-gradient-to-r ${roleColors[role]} text-white shadow-lg`
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="mb-4">
                            <MetaMaskButton size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-br ${roleColors[role]} rounded-full flex items-center justify-center text-white font-semibold`}>
                                    {user.profile.firstName?.[0]}{user.profile.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                        {user.profile.firstName} {user.profile.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex-1" />
                        <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-7xl mx-auto animate-fadeIn">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
