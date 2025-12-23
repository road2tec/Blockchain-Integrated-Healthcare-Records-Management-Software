import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', newRefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authApi = {
    signup: (data: {
        email: string;
        password: string;
        role: string;
        profile: Record<string, string>;
    }) => api.post('/auth/signup', data),

    login: (data: { email: string; password: string; role?: string }) =>
        api.post('/auth/login', data),

    logout: (refreshToken?: string) =>
        api.post('/auth/logout', { refreshToken }),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),

    getMe: () => api.get('/auth/me'),

    updateProfile: (profile: Record<string, unknown>) =>
        api.put('/auth/profile', { profile }),

    changePassword: (currentPassword: string, newPassword: string) =>
        api.put('/auth/password', { currentPassword, newPassword }),

    connectWallet: (ethereumAddress: string) =>
        api.post('/auth/connect-wallet', { ethereumAddress }),
};

// Admin API
export const adminApi = {
    getStats: () => api.get('/admin/stats'),

    getDoctors: (params?: { status?: string; page?: number; limit?: number }) =>
        api.get('/admin/doctors', { params }),

    approveDoctor: (id: string) => api.put(`/admin/doctors/${id}/approve`),

    rejectDoctor: (id: string, reason?: string) =>
        api.put(`/admin/doctors/${id}/reject`, { reason }),

    getPatients: (params?: { status?: string; page?: number; limit?: number }) =>
        api.get('/admin/patients', { params }),

    updatePatientStatus: (id: string, status: 'active' | 'suspended') =>
        api.put(`/admin/patients/${id}/status`, { status }),

    getAuditLogs: (params?: { userAddress?: string; limit?: number }) =>
        api.get('/admin/audit-logs', { params }),

    getUser: (id: string) => api.get(`/admin/users/${id}`),

    deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
};

// Doctor API
export const doctorApi = {
    getDashboard: () => api.get('/doctor/dashboard'),

    getPatients: (params?: { status?: string; page?: number; limit?: number }) =>
        api.get('/doctor/patients', { params }),

    requestConsent: (patientId: string, data?: { message?: string; scope?: object }) =>
        api.post(`/doctor/consent-request/${patientId}`, data),

    getPatientRecords: (patientId: string, params?: { recordType?: string; page?: number; limit?: number }) =>
        api.get(`/doctor/records/${patientId}`, { params }),

    uploadRecord: (formData: FormData) =>
        api.post('/doctor/records', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    verifyRecord: (recordId: string) =>
        api.get(`/doctor/verify-record/${recordId}`),

    searchPatients: (query: string) =>
        api.get('/doctor/search-patients', { params: { query } }),
};

// Patient API
export const patientApi = {
    getDashboard: () => api.get('/patient/dashboard'),

    getRecords: (params?: { recordType?: string; doctorId?: string; page?: number; limit?: number }) =>
        api.get('/patient/records', { params }),

    getRecord: (recordId: string) => api.get(`/patient/records/${recordId}`),

    verifyRecord: (recordId: string) =>
        api.get(`/patient/records/${recordId}/verify`),

    downloadRecord: (recordId: string) =>
        api.get(`/patient/records/${recordId}/download`, { responseType: 'blob' }),

    getConsentRequests: (status?: string) =>
        api.get('/patient/consent-requests', { params: { status } }),

    getConsents: () => api.get('/patient/consents'),

    grantConsent: (doctorId: string, data?: { scope?: object; responseMessage?: string; transactionHash?: string }) =>
        api.post(`/patient/consent/${doctorId}/grant`, data),

    revokeConsent: (doctorId: string, data?: { reason?: string; transactionHash?: string }) =>
        api.post(`/patient/consent/${doctorId}/revoke`, data),

    getAccessLogs: (params?: { page?: number; limit?: number }) =>
        api.get('/patient/access-logs', { params }),

    uploadDocument: (formData: FormData) =>
        api.post('/patient/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    // Shared Records - Wallet-based access
    uploadSharedRecord: (formData: FormData) =>
        api.post('/patient/shared-records', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getSharedRecords: () => api.get('/patient/shared-records'),

    grantWalletAccess: (recordId: string, walletAddress: string, expirationDays: number) =>
        api.post(`/patient/shared-records/${recordId}/grant`, { walletAddress, expirationDays }),

    revokeWalletAccess: (recordId: string, walletAddress: string) =>
        api.post(`/patient/shared-records/${recordId}/revoke`, { walletAddress }),

    deleteSharedRecord: (recordId: string) =>
        api.delete(`/patient/shared-records/${recordId}`),
};

// Doctor Shared Record API (for wallet-based access)
export const doctorSharedApi = {
    getRecordsByWallet: (walletAddress: string) =>
        api.post('/doctor/shared-records/by-wallet', { walletAddress }),

    getRecordInfo: (recordId: string, walletAddress: string) =>
        api.get(`/doctor/shared-records/${recordId}/info`, { params: { walletAddress } }),

    // Returns the URL for viewing PDF inline (not a download)
    // Uses public endpoint that only requires wallet validation (no JWT)
    getViewUrl: (recordId: string, walletAddress: string) =>
        `${API_BASE_URL}/public/shared-records/${recordId}/view?walletAddress=${walletAddress}`,
};

