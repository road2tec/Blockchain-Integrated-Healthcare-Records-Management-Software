'use client';

import { useMetaMask } from './useMetaMask';
import { useAuthStore } from '@/store/authStore';
import { useCallback } from 'react';

export function useBlockchain() {
    const metaMask = useMetaMask();
    const { user, connectWallet } = useAuthStore();

    // Connect wallet and save to backend
    const connectAndSave = useCallback(async () => {
        const address = await metaMask.connect();
        if (address && user) {
            try {
                await connectWallet(address);
                return address;
            } catch (error) {
                console.error('Failed to save wallet:', error);
                throw error;
            }
        }
        return address;
    }, [metaMask, user, connectWallet]);

    // Sign consent grant message
    const signConsentGrant = useCallback(
        async (doctorAddress: string) => {
            if (!metaMask.account) {
                throw new Error('Wallet not connected');
            }

            const message = `I, ${metaMask.account}, grant access to my medical records to doctor ${doctorAddress}.\n\nTimestamp: ${new Date().toISOString()}`;

            const signature = await metaMask.signMessage(message);
            return { message, signature };
        },
        [metaMask]
    );

    // Sign consent revoke message
    const signConsentRevoke = useCallback(
        async (doctorAddress: string) => {
            if (!metaMask.account) {
                throw new Error('Wallet not connected');
            }

            const message = `I, ${metaMask.account}, revoke access to my medical records from doctor ${doctorAddress}.\n\nTimestamp: ${new Date().toISOString()}`;

            const signature = await metaMask.signMessage(message);
            return { message, signature };
        },
        [metaMask]
    );

    // Sign record upload message
    const signRecordUpload = useCallback(
        async (fileHash: string, patientAddress: string) => {
            if (!metaMask.account) {
                throw new Error('Wallet not connected');
            }

            const message = `I, ${metaMask.account}, certify the creation of medical record with hash ${fileHash} for patient ${patientAddress}.\n\nTimestamp: ${new Date().toISOString()}`;

            const signature = await metaMask.signMessage(message);
            return { message, signature };
        },
        [metaMask]
    );

    // Verify a message signature
    const verifySignature = useCallback(
        async (message: string, signature: string, expectedAddress: string): Promise<boolean> => {
            try {
                const { ethers } = await import('ethers');
                const recoveredAddress = ethers.verifyMessage(message, signature);
                return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
            } catch (error) {
                console.error('Verification error:', error);
                return false;
            }
        },
        []
    );

    // Generate SHA-256 hash of a file
    const generateFileHash = useCallback(async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }, []);

    return {
        // MetaMask state
        isInstalled: metaMask.isInstalled,
        isConnected: metaMask.isConnected,
        isConnecting: metaMask.isConnecting,
        account: metaMask.account,
        chainId: metaMask.chainId,
        error: metaMask.error,

        // Actions
        connect: metaMask.connect,
        connectAndSave,
        disconnect: metaMask.disconnect,
        signMessage: metaMask.signMessage,
        switchToGanache: metaMask.switchToGanache,
        clearError: metaMask.clearError,

        // Healthcare-specific actions
        signConsentGrant,
        signConsentRevoke,
        signRecordUpload,
        verifySignature,
        generateFileHash,

        // User's saved address
        savedAddress: user?.ethereumAddress,
        isWalletLinked: !!user?.ethereumAddress,
    };
}
