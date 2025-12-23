'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, Eye, EyeOff, User, Phone, Stethoscope, ShieldCheck, Building, Award } from 'lucide-react';
import toast from 'react-hot-toast';

interface SignupFormData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phone: string;
    // Doctor fields
    specialization?: string;
    licenseNumber?: string;
    hospitalAffiliation?: string;
}

interface SignupFormProps {
    defaultRole?: 'doctor' | 'patient';
}

export function SignupForm({ defaultRole = 'patient' }: SignupFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(defaultRole);
    const { signup, isLoading, error, clearError } = useAuthStore();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignupFormData>();

    const password = watch('password');

    const onSubmit = async (data: SignupFormData) => {
        clearError();

        const signupData = {
            email: data.email,
            password: data.password,
            role: selectedRole,
            profile: {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                ...(selectedRole === 'doctor' && {
                    specialization: data.specialization,
                    licenseNumber: data.licenseNumber,
                    hospitalAffiliation: data.hospitalAffiliation,
                }),
            },
        };

        const result = await signup(signupData);

        if (result.success) {
            toast.success(result.message);

            if (selectedRole === 'doctor') {
                // Doctors need admin approval
                router.push('/login?pending=true');
            } else {
                // Patients are auto-activated
                router.push('/patient/dashboard');
            }
        } else {
            toast.error(result.message);
        }
    };

    const roles = [
        { id: 'patient', label: 'Patient', icon: User, description: 'Manage your health records' },
        { id: 'doctor', label: 'Doctor', icon: Stethoscope, description: 'Treat patients & upload records' },
    ];

    return (
        <Card className="w-full max-w-xl p-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create Account
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Join our secure healthcare platform
                </p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {roles.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;
                    return (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(role.id as typeof selectedRole)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {role.label}
                            </span>
                            <span className="text-xs text-gray-500 text-center">{role.description}</span>
                        </button>
                    );
                })}
            </div>

            {selectedRole === 'doctor' && (
                <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                    <strong>Note:</strong> Doctor accounts require admin approval before activation.
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        placeholder="John"
                        leftIcon={<User className="w-4 h-4" />}
                        error={errors.firstName?.message}
                        {...register('firstName', { required: 'First name is required' })}
                    />
                    <Input
                        label="Last Name"
                        placeholder="Doe"
                        error={errors.lastName?.message}
                        {...register('lastName', { required: 'Last name is required' })}
                    />
                </div>

                <Input
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
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

                <Input
                    label="Phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    leftIcon={<Phone className="w-4 h-4" />}
                    error={errors.phone?.message}
                    {...register('phone')}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <Input
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            error={errors.password?.message}
                            {...register('password', {
                                required: 'Password is required',
                                minLength: {
                                    value: 8,
                                    message: 'Min 8 characters',
                                },
                            })}
                        />
                    </div>
                    <div className="relative">
                        <Input
                            label="Confirm Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            leftIcon={<Lock className="w-4 h-4" />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword', {
                                required: 'Please confirm password',
                                validate: (value) =>
                                    value === password || 'Passwords do not match',
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
                </div>

                {/* Doctor-specific fields */}
                {selectedRole === 'doctor' && (
                    <>
                        <hr className="my-4 border-gray-200 dark:border-gray-700" />
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Professional Information
                        </h3>
                        <Input
                            label="Specialization"
                            placeholder="e.g., Cardiology, General Medicine"
                            leftIcon={<Stethoscope className="w-4 h-4" />}
                            error={errors.specialization?.message}
                            {...register('specialization', {
                                required: selectedRole === 'doctor' ? 'Specialization is required' : false,
                            })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="License Number"
                                placeholder="MD-12345"
                                leftIcon={<Award className="w-4 h-4" />}
                                error={errors.licenseNumber?.message}
                                {...register('licenseNumber', {
                                    required: selectedRole === 'doctor' ? 'License number is required' : false,
                                })}
                            />
                            <Input
                                label="Hospital Affiliation"
                                placeholder="City Hospital"
                                leftIcon={<Building className="w-4 h-4" />}
                                error={errors.hospitalAffiliation?.message}
                                {...register('hospitalAffiliation')}
                            />
                        </div>
                    </>
                )}

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
                    Create Account
                </Button>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-600 hover:underline font-medium">
                        Sign In
                    </Link>
                </p>
            </form>
        </Card>
    );
}
