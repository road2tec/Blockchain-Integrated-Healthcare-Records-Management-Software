import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { authApi } from '@/services/api';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string, role?: string) => Promise<void>;
    signup: (data: {
        email: string;
        password: string;
        role: string;
        profile: Record<string, string>;
    }) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    setUser: (user: User) => void;
    setTokens: (tokens: AuthTokens) => void;
    clearError: () => void;
    checkAuth: () => Promise<void>;
    connectWallet: (address: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email, password, role) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login({ email, password, role });
                    const { user, accessToken, refreshToken } = response.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: unknown) {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message || 'Login failed';
                    set({ error: message, isLoading: false });
                    throw new Error(message);
                }
            },

            signup: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.signup(data);
                    const { user, accessToken, refreshToken, message } = response.data;

                    // For doctors, they won't get tokens (pending approval)
                    if (accessToken && refreshToken) {
                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('refreshToken', refreshToken);

                        set({
                            user,
                            accessToken,
                            refreshToken,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                    } else {
                        set({ isLoading: false });
                    }

                    return { success: true, message: message || 'Registration successful' };
                } catch (error: unknown) {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message || 'Registration failed';
                    set({ error: message, isLoading: false });
                    return { success: false, message };
                }
            },

            logout: async () => {
                try {
                    const refreshToken = get().refreshToken;
                    if (refreshToken) {
                        await authApi.logout(refreshToken);
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    set({
                        user: null,
                        accessToken: null,
                        refreshToken: null,
                        isAuthenticated: false,
                    });
                }
            },

            setUser: (user) => set({ user }),

            setTokens: (tokens) => {
                localStorage.setItem('accessToken', tokens.accessToken);
                localStorage.setItem('refreshToken', tokens.refreshToken);
                set({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    isAuthenticated: true,
                });
            },

            clearError: () => set({ error: null }),

            checkAuth: async () => {
                const accessToken = localStorage.getItem('accessToken');
                const refreshToken = localStorage.getItem('refreshToken');

                if (!accessToken || !refreshToken) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }

                set({ isLoading: true });
                try {
                    const response = await authApi.getMe();
                    set({
                        user: response.data.user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: any) {
                    console.error('Auth check failed:', error);
                    set({ isLoading: false });

                    // Only logout if it's explicitly an auth error (401)
                    // and the interceptor failed to refresh
                    if (error.response?.status === 401) {
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        set({
                            user: null,
                            accessToken: null,
                            refreshToken: null,
                            isAuthenticated: false,
                        });
                    }
                }
            },

            connectWallet: async (address) => {
                try {
                    await authApi.connectWallet(address);
                    const user = get().user;
                    if (user) {
                        set({ user: { ...user, ethereumAddress: address } });
                    }
                } catch (error: unknown) {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message || 'Failed to connect wallet';
                    throw new Error(message);
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
            }),
        }
    )
);
