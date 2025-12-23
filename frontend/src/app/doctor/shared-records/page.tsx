'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Wallet, Eye, FileText, Clock, User, Search, X, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Input, Badge, Modal, Spinner, EmptyState } from '@/components/ui';
import { doctorSharedApi } from '@/services/api';

interface PatientInfo {
    id: string;
    name: string;
    email: string;
}

interface AccessInfo {
    expiresAt: string;
    expirationDays: number;
    grantedAt: string;
    daysRemaining: number;
}

interface SharedRecord {
    id: string;
    title: string;
    description: string;
    recordType: string;
    fileHash: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
    patient: PatientInfo;
    access: AccessInfo;
}

interface WalletForm {
    walletAddress: string;
}

export default function DoctorSharedRecordsPage() {
    const [records, setRecords] = useState<SharedRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [currentWallet, setCurrentWallet] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingRecord, setViewingRecord] = useState<SharedRecord | null>(null);
    const [viewUrl, setViewUrl] = useState<string>('');

    const { register, handleSubmit, formState: { errors } } = useForm<WalletForm>();

    const handleSearch = async (data: WalletForm) => {
        setLoading(true);
        setSearched(true);
        setCurrentWallet(data.walletAddress);

        try {
            const response = await doctorSharedApi.getRecordsByWallet(data.walletAddress);
            setRecords(response.data.records);

            if (response.data.records.length === 0) {
                toast.error('No records found for this wallet address');
            } else {
                toast.success(`Found ${response.data.records.length} record(s)`);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to search records');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewRecord = (record: SharedRecord) => {
        // Open PDF in new browser tab - more reliable than iframe
        const url = doctorSharedApi.getViewUrl(record.id, currentWallet);
        window.open(url, '_blank');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <DashboardLayout role="doctor">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shared Records Access</h1>
                    <p className="text-gray-600">Enter your wallet address to view records shared with you</p>
                </div>

                {/* Wallet Search */}
                <Card className="p-6">
                    <form onSubmit={handleSubmit(handleSearch)} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    label="Your Wallet Address"
                                    placeholder="0x..."
                                    {...register('walletAddress', {
                                        required: 'Wallet address is required',
                                        pattern: {
                                            value: /^0x[a-fA-F0-9]{40}$/,
                                            message: 'Invalid Ethereum address format'
                                        }
                                    })}
                                    error={errors.walletAddress?.message}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button type="submit" disabled={loading}>
                                    {loading ? <Spinner size="sm" /> : (
                                        <>
                                            <Search className="w-4 h-4 mr-2" />
                                            Search Records
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            <Wallet className="w-3 h-3 inline mr-1" />
                            Enter the wallet address that patients have granted access to. This is typically the same address you use with MetaMask.
                        </p>
                    </form>
                </Card>

                {/* Results */}
                {searched && (
                    <>
                        {records.length === 0 ? (
                            <EmptyState
                                icon={<FileText className="w-12 h-12" />}
                                title="No Records Found"
                                description="No patients have shared records with this wallet address, or access may have expired."
                            />
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Records Shared With You ({records.length})
                                </h2>
                                <div className="grid gap-4">
                                    {records.map((record) => (
                                        <Card key={record.id} className="p-6">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                                {/* Record Info */}
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className="p-3 bg-indigo-100 rounded-lg">
                                                        <FileText className="w-6 h-6 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900">{record.title}</h3>
                                                        {record.description && (
                                                            <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                                            <Badge variant="info">{record.recordType}</Badge>
                                                            <span className="text-sm text-gray-500">
                                                                {formatFileSize(record.fileSize)}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                Uploaded {formatDate(record.createdAt)}
                                                            </span>
                                                        </div>

                                                        {/* Patient Info */}
                                                        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                                                            <User className="w-4 h-4" />
                                                            <span><strong>Patient:</strong> {record.patient.name}</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span>{record.patient.email}</span>
                                                        </div>

                                                        {/* Access Info */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Clock className="w-4 h-4 text-amber-500" />
                                                            {record.access.daysRemaining > 0 ? (
                                                                <Badge variant="success">
                                                                    {record.access.daysRemaining} days remaining
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="danger">Access Expired</Badge>
                                                            )}
                                                            <span className="text-xs text-gray-500">
                                                                Expires: {formatDate(record.access.expiresAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* View Button */}
                                                <div>
                                                    <Button
                                                        onClick={() => handleViewRecord(record)}
                                                        disabled={record.access.daysRemaining <= 0}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Record
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* View Modal (PDF Viewer - No Download) */}
                <Modal
                    isOpen={showViewModal}
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingRecord(null);
                        setViewUrl('');
                    }}
                    title={viewingRecord?.title || 'View Record'}
                >
                    <div className="space-y-4">
                        {/* Warning */}
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <strong>View Only:</strong> This record is for viewing purposes only.
                                Downloading or saving is not permitted to protect patient privacy.
                            </div>
                        </div>

                        {/* Record Info */}
                        {viewingRecord && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span><strong>Patient:</strong> {viewingRecord.patient.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm mt-1">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span><strong>Access expires:</strong> {formatDate(viewingRecord.access.expiresAt)}</span>
                                </div>
                            </div>
                        )}

                        {/* PDF Viewer */}
                        <div
                            className="rounded-lg overflow-hidden border"
                            style={{ height: '60vh' }}
                            onContextMenu={(e) => e.preventDefault()} // Disable right-click
                        >
                            {viewUrl && (
                                <iframe
                                    src={viewUrl}
                                    className="w-full h-full"
                                    style={{ border: 'none' }}
                                    title="Medical Record Viewer"
                                />
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowViewModal(false);
                                    setViewingRecord(null);
                                    setViewUrl('');
                                }}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
