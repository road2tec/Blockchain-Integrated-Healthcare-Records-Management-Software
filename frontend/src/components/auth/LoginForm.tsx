'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, Eye, EyeOff, Stethoscope, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginFormData {
    email: string;
    password: string;
}

interface LoginFormProps {
    defaultRole?: 'admin' | 'doctor' | 'patient';
}

export function LoginForm({ defaultRole = 'patient' }: LoginFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'admin' | 'doctor' | 'patient'>(defaultRole);
    const { login, isLoading, error, clearError } = useAuthStore();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>();

    const onSubmit = async (data: LoginFormData) => {
        clearError();
        try {
            await login(data.email, data.password, selectedRole);
            toast.success('Login successful');

            // Redirect based on role
            switch (selectedRole) {
                case 'admin':
                    router.push('/admin/dashboard');
                    break;
                case 'doctor':
                    router.push('/doctor/dashboard');
                    break;
                case 'patient':
                    router.push('/patient/dashboard');
                    break;
            }
        } catch (err) {
            toast.error((err as Error).message || 'Login failed');
        }
    };

    const roles = [
        { id: 'patient', label: 'Patient', icon: User, color: 'from-emerald-500 to-teal-500' },
        { id: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'from-blue-500 to-indigo-500' },
        { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'from-purple-500 to-violet-500' },
    ];

    return (
        <Card className="w-full max-w-md p-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Welcome Back
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Sign in to your healthcare account
                </p>
            </div>

            {/* Role Selection */}
            <div className="flex gap-2 mb-6">
                {roles.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;
                    return (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(role.id as typeof selectedRole)}
                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                                    ? `border-transparent bg-gradient-to-br ${role.color} text-white shadow-lg`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{role.label}</span>
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    leftIcon={<Mail className="w-4 h-4" />}
                    error={errors.email?.message}
                    {...register('email', {
                        required: 'Email is required',
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Invalid email address',
                        },
                    })}
                />

                <div className="relative">
                    <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        leftIcon={<Lock className="w-4 h-4" />}
                        error={errors.password?.message}
                        {...register('password', {
                            required: 'Password is required',
                            minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters',
                            },
                        })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                >
                    Sign In
                </Button>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                        Sign Up
                    </Link>
                </p>
            </form>
        </Card>
    );
}
