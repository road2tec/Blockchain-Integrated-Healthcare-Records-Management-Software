'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers, BrowserProvider, Eip1193Provider, JsonRpcSigner } from 'ethers';

declare global {
    interface Window {
        ethereum?: Eip1193Provider & {
            isMetaMask?: boolean;
            on?: (event: string, callback: (...args: unknown[]) => void) => void;
            removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
    }
}

interface MetaMaskState {
    isInstalled: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    account: string | null;
    chainId: number | null;
    error: string | null;
    provider: BrowserProvider | null;
    signer: JsonRpcSigner | null;
}

export function useMetaMask() {
    const [state, setState] = useState<MetaMaskState>({
        isInstalled: false,
        isConnected: false,
        isConnecting: false,
        account: null,
        chainId: null,
        error: null,
        provider: null,
        signer: null,
    });

    // Check if MetaMask is installed
    useEffect(() => {
        const checkMetaMask = async () => {
            if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
                setState((prev) => ({ ...prev, isInstalled: true }));

                // Check if already connected
                try {
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts',
                    }) as string[];

                    if (accounts.length > 0) {
                        const provider = new ethers.BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const network = await provider.getNetwork();

                        setState((prev) => ({
                            ...prev,
                            isConnected: true,
                            account: accounts[0],
                            chainId: Number(network.chainId),
                            provider,
                            signer,
                        }));
                    }
                } catch (error) {
                    console.error('Error checking MetaMask:', error);
                }
            }
        };

        checkMetaMask();
    }, []);

    // Listen for account/chain changes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.ethereum) return;

        const handleAccountsChanged = async (accounts: unknown) => {
            const accountList = accounts as string[];
            if (accountList.length === 0) {
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                    account: null,
                    signer: null,
                }));
            } else {
                const provider = new ethers.BrowserProvider(window.ethereum!);
                const signer = await provider.getSigner();
                setState((prev) => ({
                    ...prev,
                    isConnected: true,
                    account: accountList[0],
                    provider,
                    signer,
                }));
            }
        };

        const handleChainChanged = (chainId: unknown) => {
            setState((prev) => ({
                ...prev,
                chainId: parseInt(chainId as string, 16),
            }));
            // Reload to reset provider state
            window.location.reload();
        };

        window.ethereum.on?.('accountsChanged', handleAccountsChanged);
        window.ethereum.on?.('chainChanged', handleChainChanged);

        return () => {
            window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
            window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
        };
    }, []);

    // Connect to MetaMask
    const connect = useCallback(async () => {
        if (!window.ethereum) {
            setState((prev) => ({
                ...prev,
                error: 'MetaMask is not installed. Please install MetaMask.',
            }));
            return null;
        }

        setState((prev) => ({ ...prev, isConnecting: true, error: null }));

        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            }) as string[];

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const network = await provider.getNetwork();

            setState((prev) => ({
                ...prev,
                isConnected: true,
                isConnecting: false,
                account: accounts[0],
                chainId: Number(network.chainId),
                provider,
                signer,
            }));

            return accounts[0];
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || 'Failed to connect';
            setState((prev) => ({
                ...prev,
                isConnecting: false,
                error: message,
            }));
            return null;
        }
    }, []);

    // Disconnect (just clears local state, MetaMask stays connected)
    const disconnect = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isConnected: false,
            account: null,
            signer: null,
        }));
    }, []);

    // Sign a message
    const signMessage = useCallback(
        async (message: string): Promise<string | null> => {
            if (!state.signer) {
                setState((prev) => ({ ...prev, error: 'Not connected to MetaMask' }));
                return null;
            }

            try {
                const signature = await state.signer.signMessage(message);
                return signature;
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || 'Signing failed';
                setState((prev) => ({ ...prev, error: message }));
                return null;
            }
        },
        [state.signer]
    );

    // Switch to Ganache network
    const switchToGanache = useCallback(async () => {
        if (!window.ethereum) return false;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x539' }], // 1337 in hex
            });
            return true;
        } catch (error: unknown) {
            // Chain doesn't exist, try to add it
            if ((error as { code?: number })?.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: '0x539',
                                chainName: 'Ganache Local',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                                rpcUrls: ['http://127.0.0.1:7545'],
                            },
                        ],
                    });
                    return true;
                } catch (addError) {
                    console.error('Failed to add Ganache network:', addError);
                    return false;
                }
            }
            console.error('Failed to switch network:', error);
            return false;
        }
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        signMessage,
        switchToGanache,
        clearError: () => setState((prev) => ({ ...prev, error: null })),
    };
}
