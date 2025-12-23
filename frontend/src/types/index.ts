// User types
export interface User {
    id: string;
    email: string;
    role: 'admin' | 'doctor' | 'patient';
    status: 'pending' | 'active' | 'suspended';
    ethereumAddress?: string;
    profile: UserProfile;
    createdAt: string;
}

export interface UserProfile {
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    // Doctor-specific
    specialization?: string;
    licenseNumber?: string;
    hospitalAffiliation?: string;
    // Patient-specific
    bloodGroup?: string;
    emergencyContact?: {
        name?: string;
        phone?: string;
        relationship?: string;
    };
    allergies?: string[];
    chronicConditions?: string[];
}

// Auth types
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
    role?: 'admin' | 'doctor' | 'patient';
}

export interface SignupData {
    email: string;
    password: string;
    role: 'admin' | 'doctor' | 'patient';
    profile: {
        firstName: string;
        lastName: string;
        phone?: string;
        [key: string]: string | undefined;
    };
}

// Medical Record types
export interface MedicalRecord {
    _id: string;
    patientId: string | User;
    doctorId: string | User;
    title: string;
    description?: string;
    recordType: RecordType;
    fileName: string;
    originalFileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    fileHash: string;
    blockchain?: BlockchainInfo;
    signature?: SignatureInfo;
    metadata?: RecordMetadata;
    status: 'draft' | 'pending' | 'verified' | 'revoked';
    accessLog: AccessLogEntry[];
    createdAt: string;
    updatedAt: string;
}

export type RecordType =
    | 'diagnosis'
    | 'prescription'
    | 'lab_result'
    | 'imaging'
    | 'surgery'
    | 'consultation'
    | 'vaccination'
    | 'other';

export interface BlockchainInfo {
    recordId?: string;
    transactionHash?: string;
    blockNumber?: number;
    storedAt?: string;
    verified?: boolean;
}

export interface SignatureInfo {
    hash?: string;
    signedBy?: string;
    signedAt?: string;
    transactionHash?: string;
}

export interface RecordMetadata {
    diagnosis?: string;
    treatment?: string;
    medications?: string[];
    followUpDate?: string;
    notes?: string;
}

export interface AccessLogEntry {
    accessedBy: string | User;
    accessType: 'view' | 'download' | 'share';
    accessedAt: string;
    ipAddress?: string;
}

// Consent types
export interface Consent {
    id: string;
    patientId: string | User;
    doctorId: string | User;
    status: 'pending' | 'granted' | 'revoked' | 'expired';
    blockchain?: ConsentBlockchain;
    scope: ConsentScope;
    requestMessage?: string;
    responseMessage?: string;
    requestedAt: string;
    respondedAt?: string;
}

export interface ConsentBlockchain {
    grantTransactionHash?: string;
    grantBlockNumber?: number;
    grantedAt?: string;
    revokeTransactionHash?: string;
    revokeBlockNumber?: number;
    revokedAt?: string;
}

export interface ConsentScope {
    recordTypes: (RecordType | 'all')[];
    startDate?: string;
    endDate?: string;
    allowDownload?: boolean;
    allowShare?: boolean;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    error?: string;
    data?: T;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Dashboard Stats
export interface AdminStats {
    doctors: {
        total: number;
        pending: number;
        active: number;
    };
    patients: {
        total: number;
        active: number;
        suspended: number;
    };
    records: {
        total: number;
    };
    consents: {
        active: number;
    };
}

export interface DoctorDashboard {
    patientCount: number;
    recordCount: number;
    recentRecords: MedicalRecord[];
}

export interface PatientDashboard {
    recordCount: number;
    activeConsents: number;
    pendingRequests: number;
    recentRecords: MedicalRecord[];
}

// Verification types
export interface VerificationResult {
    recordId: string;
    fileHash: string;
    fileIntegrity: {
        valid: boolean;
        actualHash?: string;
        expectedHash?: string;
        error?: string;
    };
    blockchain?: {
        valid: boolean;
        onChainHash?: string;
        expectedHash?: string;
        storedAt?: string;
        error?: string;
    };
    status: 'VERIFIED' | 'TAMPERED';
    message?: string;
}
