'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Badge, Button, Spinner, EmptyState, Modal } from '@/components/ui';
import { patientApi } from '@/services/api';
import { MedicalRecord, VerificationResult } from '@/types';
import { FileText, Download, CheckCircle2, XCircle, Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientRecordsPage() {
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<string | null>(null);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const response = await patientApi.getRecords();
            setRecords(response.data.records);
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleDownload = async (recordId: string, fileName: string) => {
        try {
            const response = await patientApi.downloadRecord(recordId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Download started');
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const handleVerify = async (recordId: string) => {
        setVerifying(recordId);
        try {
            const response = await patientApi.verifyRecord(recordId);
            setVerificationResult(response.data.verification);
            setShowVerificationModal(true);
        } catch (error) {
            toast.error('Verification failed');
        } finally {
            setVerifying(null);
        }
    };

    const getRecordTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            diagnosis: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            prescription: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            lab_result: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
            imaging: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            surgery: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            consultation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            vaccination: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
        return colors[type] || colors.other;
    };

    return (
        <DashboardLayout role="patient">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Medical Records
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            View and verify your complete medical history
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Spinner size="lg" />
                    </div>
                ) : records.length === 0 ? (
                    <Card className="p-8">
                        <EmptyState
                            icon={<FileText className="w-12 h-12" />}
                            title="No medical records"
                            description="Your medical records will appear here when doctors upload them"
                        />
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {records.map((record) => (
                            <Card key={record._id} className="p-6" hover>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {record.title}
                                            </h3>
                                            {record.description && (
                                                <p className="text-sm text-gray-500 mt-1">{record.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecordTypeColor(record.recordType)}`}>
                                                    {record.recordType.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm text-gray-400">
                                                    {new Date(record.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {typeof record.doctorId === 'object' && record.doctorId?.profile && (
                                                <p className="text-sm text-gray-500 mt-2">
                                                    By Dr. {record.doctorId.profile.firstName} {record.doctorId.profile.lastName}
                                                    {record.doctorId.profile.specialization && ` (${record.doctorId.profile.specialization})`}
                                                </p>
                                            )}
                                            {record.blockchain?.transactionHash && (
                                                <p className="text-xs font-mono text-gray-400 mt-2">
                                                    Tx: {record.blockchain.transactionHash.slice(0, 20)}...
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={record.status === 'verified' ? 'success' : 'warning'}>
                                            {record.status === 'verified' ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Blockchain Verified
                                                </>
                                            ) : (
                                                record.status
                                            )}
                                        </Badge>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                leftIcon={<Shield className="w-4 h-4" />}
                                                onClick={() => handleVerify(record._id)}
                                                isLoading={verifying === record._id}
                                            >
                                                Verify
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                leftIcon={<Download className="w-4 h-4" />}
                                                onClick={() => handleDownload(record._id, record.originalFileName)}
                                            >
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Verification Modal */}
                <Modal
                    isOpen={showVerificationModal}
                    onClose={() => {
                        setShowVerificationModal(false);
                        setVerificationResult(null);
                    }}
                    title="Record Verification"
                    size="md"
                >
                    {verificationResult && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl ${verificationResult.status === 'VERIFIED'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'bg-red-50 dark:bg-red-900/20'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {verificationResult.status === 'VERIFIED' ? (
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    ) : (
                                        <XCircle className="w-8 h-8 text-red-500" />
                                    )}
                                    <div>
                                        <p className={`font-semibold ${verificationResult.status === 'VERIFIED'
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : 'text-red-700 dark:text-red-400'
                                            }`}>
                                            {verificationResult.status === 'VERIFIED'
                                                ? 'Record Integrity Verified'
                                                : 'Record May Be Tampered'}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {verificationResult.message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">File Hash (SHA-256)</p>
                                    <code className="text-xs font-mono break-all text-gray-700 dark:text-gray-300">
                                        {verificationResult.fileHash}
                                    </code>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">File Integrity</p>
                                    <div className="flex items-center gap-2">
                                        {verificationResult.fileIntegrity.valid ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {verificationResult.fileIntegrity.valid ? 'File intact' : 'File modified'}
                                        </span>
                                    </div>
                                </div>

                                {verificationResult.blockchain && (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Blockchain Verification</p>
                                        <div className="flex items-center gap-2">
                                            {verificationResult.blockchain.valid ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {verificationResult.blockchain.valid
                                                    ? 'Hash matches on-chain record'
                                                    : 'Hash mismatch detected'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full"
                                onClick={() => {
                                    setShowVerificationModal(false);
                                    setVerificationResult(null);
                                }}
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </Modal>
            </div>
        </DashboardLayout>
    );
}
