'use client';

import { useBlockchain } from '@/hooks/useBlockchain';
import { Button, Badge } from '@/components/ui';
import { Wallet, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface MetaMaskButtonProps {
    onConnect?: (address: string) => void;
    showAddress?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function MetaMaskButton({
    onConnect,
    showAddress = true,
    size = 'md',
}: MetaMaskButtonProps) {
    const {
        isInstalled,
        isConnected,
        isConnecting,
        account,
        chainId,
        error,
        connectAndSave,
        disconnect,
        switchToGanache,
        clearError,
    } = useBlockchain();

    const handleConnect = async () => {
        clearError();
        try {
            const address = await connectAndSave();
            if (address) {
                toast.success('Wallet connected successfully');
                onConnect?.(address);
            }
        } catch (err) {
            toast.error((err as Error).message || 'Failed to connect wallet');
        }
    };

    const handleSwitchNetwork = async () => {
        const success = await switchToGanache();
        if (success) {
            toast.success('Switched to Ganache network');
        } else {
            toast.error('Failed to switch network');
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Not installed
    if (!isInstalled) {
        return (
            <div className="flex flex-col items-center gap-2">
                <Button
                    variant="outline"
                    size={size}
                    onClick={() => window.open('https://metamask.io/download/', '_blank')}
                    leftIcon={<Wallet className="w-4 h-4" />}
                    rightIcon={<ExternalLink className="w-3 h-3" />}
                >
                    Install MetaMask
                </Button>
                <p className="text-xs text-gray-500">MetaMask is required for blockchain transactions</p>
            </div>
        );
    }

    // Connected
    if (isConnected && account) {
        const isWrongNetwork = chainId !== 1337; // Ganache chain ID

        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {showAddress && (
                            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                                {formatAddress(account)}
                            </span>
                        )}
                        <Badge variant="success" size="sm">Connected</Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={disconnect}
                    >
                        Disconnect
                    </Button>
                </div>

                {isWrongNetwork && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-700 dark:text-amber-400">
                            Wrong network
                        </span>
                        <Button size="sm" variant="secondary" onClick={handleSwitchNetwork}>
                            Switch to Ganache
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Not connected
    return (
        <div className="flex flex-col gap-2">
            <Button
                variant="primary"
                size={size}
                onClick={handleConnect}
                isLoading={isConnecting}
                leftIcon={<Wallet className="w-4 h-4" />}
            >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    );
}

// Transaction status component
interface TransactionStatusProps {
    status: 'pending' | 'success' | 'error';
    hash?: string;
    message?: string;
}

export function TransactionStatus({ status, hash, message }: TransactionStatusProps) {
    const statusConfig = {
        pending: {
            icon: <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />,
            text: 'Transaction pending...',
            className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        },
        success: {
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            text: 'Transaction successful',
            className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
        },
        error: {
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            text: message || 'Transaction failed',
            className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
        },
    };

    const config = statusConfig[status];

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${config.className}`}>
            {config.icon}
            <div className="flex-1">
                <p className="font-medium">{config.text}</p>
                {hash && (
                    <p className="text-sm font-mono opacity-75 truncate">
                        {hash.slice(0, 20)}...{hash.slice(-8)}
                    </p>
                )}
            </div>
        </div>
    );
}
