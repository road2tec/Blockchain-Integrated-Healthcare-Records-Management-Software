'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Upload, Share2, Clock, Trash2, Eye, X, FileText, Wallet } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Input, Badge, Modal, Spinner, EmptyState } from '@/components/ui';
import { patientApi } from '@/services/api';

interface GrantedWallet {
    walletAddress: string;
    expirationDays: number;
    expiresAt: string;
    isActive: boolean;
    isExpired: boolean;
    accessCount: number;
}

interface SharedRecord {
    id: string;
    title: string;
    description: string;
    recordType: string;
    fileHash: string;
    createdAt: string;
    grantedWallets: GrantedWallet[];
}

interface GrantAccessForm {
    walletAddress: string;
    expirationDays: number;
}

interface UploadForm {
    title: string;
    description: string;
    recordType: string;
}

export default function PatientSharedRecordsPage() {
    const [records, setRecords] = useState<SharedRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showGrantModal, setShowGrantModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<SharedRecord | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const uploadForm = useForm<UploadForm>();
    const grantForm = useForm<GrantAccessForm>({
        defaultValues: { expirationDays: 7 }
    });

    useEffect(() => {
        fetchSharedRecords();
    }, []);

    const fetchSharedRecords = async () => {
        try {
            const response = await patientApi.getSharedRecords();
            setRecords(response.data.records);
        } catch (error) {
            console.error('Error fetching shared records:', error);
            toast.error('Failed to load shared records');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
                toast.error('Only PDF and image files are allowed');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async (data: UploadForm) => {
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', data.title);
            formData.append('description', data.description || '');
            formData.append('recordType', data.recordType || 'report');

            await patientApi.uploadSharedRecord(formData);
            toast.success('Record uploaded successfully!');
            setShowUploadModal(false);
            setSelectedFile(null);
            uploadForm.reset();
            fetchSharedRecords();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to upload record');
        } finally {
            setUploading(false);
        }
    };

    const handleGrantAccess = async (data: GrantAccessForm) => {
        if (!selectedRecord) return;

        try {
            await patientApi.grantWalletAccess(
                selectedRecord.id,
                data.walletAddress,
                data.expirationDays
            );
            toast.success(`Access granted for ${data.expirationDays} days!`);
            setShowGrantModal(false);
            grantForm.reset({ expirationDays: 7 });
            fetchSharedRecords();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to grant access');
        }
    };

    const handleRevokeAccess = async (recordId: string, walletAddress: string) => {
        if (!confirm('Are you sure you want to revoke access for this wallet?')) return;

        try {
            await patientApi.revokeWalletAccess(recordId, walletAddress);
            toast.success('Access revoked');
            fetchSharedRecords();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to revoke access');
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (!confirm('Are you sure you want to delete this record? This will revoke all access.')) return;

        try {
            await patientApi.deleteSharedRecord(recordId);
            toast.success('Record deleted');
            fetchSharedRecords();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Failed to delete record');
        }
    };

    const openGrantModal = (record: SharedRecord) => {
        setSelectedRecord(record);
        setShowGrantModal(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysRemaining = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    };

    if (loading) {
        return (
            <DashboardLayout role="patient">
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="patient">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Share My Records</h1>
                        <p className="text-gray-600">Upload reports and grant wallet-based access to doctors</p>
                    </div>
                    <Button onClick={() => setShowUploadModal(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New Record
                    </Button>
                </div>

                {/* Records List */}
                {records.length === 0 ? (
                    <EmptyState
                        icon={<FileText className="w-12 h-12" />}
                        title="No Shared Records"
                        description="Upload your medical reports to share with doctors using their wallet address"
                        action={
                            <Button onClick={() => setShowUploadModal(true)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload First Record
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-6">
                        {records.map((record) => (
                            <Card key={record.id} className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    {/* Record Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                <FileText className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{record.title}</h3>
                                                {record.description && (
                                                    <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                                    <Badge variant="info">{record.recordType}</Badge>
                                                    <span>Uploaded {formatDate(record.createdAt)}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1 font-mono">
                                                    Hash: {record.fileHash.substring(0, 16)}...
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openGrantModal(record)}
                                        >
                                            <Share2 className="w-4 h-4 mr-1" />
                                            Grant Access
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteRecord(record.id)}
                                            className="text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Granted Wallets */}
                                {record.grantedWallets.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            Wallets with Access ({record.grantedWallets.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {record.grantedWallets.map((wallet, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center justify-between p-3 rounded-lg ${wallet.isExpired || !wallet.isActive
                                                        ? 'bg-gray-100'
                                                        : 'bg-green-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-mono text-sm">
                                                            {wallet.walletAddress.substring(0, 8)}...
                                                            {wallet.walletAddress.substring(36)}
                                                        </div>
                                                        {wallet.isExpired || !wallet.isActive ? (
                                                            <Badge variant="warning">Expired/Revoked</Badge>
                                                        ) : (
                                                            <Badge variant="success">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {getDaysRemaining(wallet.expiresAt)} days left
                                                            </Badge>
                                                        )}
                                                        {wallet.accessCount > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                <Eye className="w-3 h-3 inline mr-1" />
                                                                Viewed {wallet.accessCount}x
                                                            </span>
                                                        )}
                                                    </div>
                                                    {wallet.isActive && !wallet.isExpired && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRevokeAccess(record.id, wallet.walletAddress)}
                                                            className="text-red-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Revoke
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}

                {/* Upload Modal */}
                <Modal
                    isOpen={showUploadModal}
                    onClose={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                        uploadForm.reset();
                    }}
                    title="Upload Medical Record"
                >
                    <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-4">
                        <Input
                            label="Title"
                            placeholder="e.g., Blood Test Report"
                            {...uploadForm.register('title', { required: 'Title is required' })}
                            error={uploadForm.formState.errors.title?.message}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                rows={2}
                                placeholder="Brief description of the record..."
                                {...uploadForm.register('description')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Record Type
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                {...uploadForm.register('recordType')}
                            >
                                <option value="report">General Report</option>
                                <option value="lab_result">Lab Result</option>
                                <option value="imaging">Imaging/X-Ray</option>
                                <option value="prescription">Prescription</option>
                                <option value="diagnosis">Diagnosis</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                File (PDF or Image)
                            </label>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handleFileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            {selectedFile && (
                                <p className="text-sm text-green-600 mt-1">
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFile(null);
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={uploading || !selectedFile} className="flex-1">
                                {uploading ? <Spinner size="sm" /> : 'Upload'}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Grant Access Modal */}
                <Modal
                    isOpen={showGrantModal}
                    onClose={() => {
                        setShowGrantModal(false);
                        grantForm.reset({ expirationDays: 7 });
                    }}
                    title="Grant Wallet Access"
                >
                    <form onSubmit={grantForm.handleSubmit(handleGrantAccess)} className="space-y-4">
                        <div className="p-3 bg-indigo-50 rounded-lg mb-4">
                            <p className="text-sm text-indigo-800">
                                <strong>Record:</strong> {selectedRecord?.title}
                            </p>
                        </div>

                        <Input
                            label="Doctor's Wallet Address"
                            placeholder="0x..."
                            {...grantForm.register('walletAddress', {
                                required: 'Wallet address is required',
                                pattern: {
                                    value: /^0x[a-fA-F0-9]{40}$/,
                                    message: 'Invalid Ethereum address format'
                                }
                            })}
                            error={grantForm.formState.errors.walletAddress?.message}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Access Duration (Days)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                {...grantForm.register('expirationDays', {
                                    required: 'Duration is required',
                                    min: { value: 1, message: 'Minimum 1 day' },
                                    max: { value: 365, message: 'Maximum 365 days' }
                                })}
                            />
                            {grantForm.formState.errors.expirationDays && (
                                <p className="text-sm text-red-600 mt-1">
                                    {grantForm.formState.errors.expirationDays.message}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                The doctor will only be able to VIEW (not download) the record until it expires.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowGrantModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                <Share2 className="w-4 h-4 mr-2" />
                                Grant Access
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
