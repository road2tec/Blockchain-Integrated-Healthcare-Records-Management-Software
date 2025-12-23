'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 focus:ring-red-500 shadow-lg shadow-red-500/25',
        ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-400 dark:hover:bg-gray-800',
        outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-5 py-2.5 text-sm gap-2',
        lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            type="button"
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                leftIcon
            )}
            {children}
            {rightIcon}
        </button>
    );
}

// Input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: ReactNode;
}

export function Input({
    label,
    error,
    leftIcon,
    className,
    ...props
}: InputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    className={clsx(
                        'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400',
                        'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none',
                        'disabled:bg-gray-50 disabled:cursor-not-allowed',
                        'dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500',
                        'transition-all duration-200',
                        leftIcon && 'pl-10',
                        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}

// Card component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export function Card({ children, className, hover = false, ...props }: CardProps) {
    return (
        <div
            className={clsx(
                'bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm',
                hover && 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// Badge component
interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
    const variants = {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    };

    return (
        <span className={clsx('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size])}>
            {children}
        </span>
    );
}

// Modal component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className={clsx(
                'relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full p-6',
                sizes[size]
            )}>
                {title && (
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        {title}
                    </h3>
                )}
                {children}
            </div>
        </div>
    );
}

// Spinner component
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className={clsx('animate-spin rounded-full border-2 border-gray-300 border-t-blue-600', sizes[size])} />
    );
}

// Empty state component
interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {icon && (
                <div className="text-gray-400 mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
