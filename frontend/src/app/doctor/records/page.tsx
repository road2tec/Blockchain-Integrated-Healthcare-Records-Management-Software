'use client';

import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, Button, Input, Badge } from '@/components/ui';
import { doctorApi } from '@/services/api';
import { useBlockchain } from '@/hooks/useBlockchain';
import { Upload, FileText, CheckCircle2, AlertCircle, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DoctorRecordsPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileHash, setFileHash] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        patientId: '',
        title: '',
        description: '',
        recordType: 'diagnosis',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { generateFileHash, isConnected, signRecordUpload } = useBlockchain();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Generate hash immediately
            const hash = await generateFileHash(file);
            setFileHash(hash);
            toast.success('File hash generated');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !formData.patientId || !formData.title) {
            toast.error('Please fill all required fields');
            return;
        }

        if (!isConnected) {
            toast.error('Please connect MetaMask to sign records');
            return;
        }

        setUploading(true);
        try {
            // Sign the record
            const signature = await signRecordUpload(fileHash, formData.patientId);

            const data = new FormData();
            data.append('file', selectedFile);
            data.append('patientId', formData.patientId);
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('recordType', formData.recordType);
            if (signature) {
                data.append('signature', signature.signature!);
            }

            await doctorApi.uploadRecord(data);
            toast.success('Record uploaded and stored on blockchain');

            // Reset form
            setSelectedFile(null);
            setFileHash('');
            setFormData({
                patientId: '',
                title: '',
                description: '',
                recordType: 'diagnosis',
            });
        } catch (error) {
            toast.error('Failed to upload record');
        } finally {
            setUploading(false);
        }
    };

    const recordTypes = [
        { value: 'diagnosis', label: 'Diagnosis' },
        { value: 'prescription', label: 'Prescription' },
        { value: 'lab_result', label: 'Lab Result' },
        { value: 'imaging', label: 'Imaging' },
        { value: 'surgery', label: 'Surgery' },
        { value: 'consultation', label: 'Consultation' },
        { value: 'vaccination', label: 'Vaccination' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <DashboardLayout role="doctor">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Medical Records
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Upload medical records with blockchain verification
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Upload Form */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Upload New Record
                        </h2>

                        <div className="space-y-4">
                            <Input
                                label="Patient ID"
                                placeholder="Enter patient's ID"
                                value={formData.patientId}
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                            />

                            <Input
                                label="Record Title"
                                placeholder="e.g., Blood Test Results"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Record Type
                                </label>
                                <select
                                    value={formData.recordType}
                                    onChange={(e) => setFormData({ ...formData, recordType: e.target.value })}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100"
                                >
                                    {recordTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-gray-100"
                                    placeholder="Additional notes..."
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Medical Document
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                                >
                                    {selectedFile ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <FileText className="w-8 h-8 text-blue-500" />
                                            <div className="text-left">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Click to upload or drag and drop
                                            </p>
                                            <p className="text-sm text-gray-400 mt-1">
                                                PDF, JPG, PNG, DOC up to 50MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                isLoading={uploading}
                                onClick={handleUpload}
                                disabled={!selectedFile || !formData.patientId || !formData.title}
                            >
                                Upload & Store on Blockchain
                            </Button>
                        </div>
                    </Card>

                    {/* Hash Preview */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Blockchain Verification
                        </h2>

                        <div className="space-y-4">
                            {!isConnected ? (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Wallet Not Connected
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                Connect MetaMask to sign and verify records on the blockchain
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm text-emerald-700 dark:text-emerald-400">
                                            Ready to sign transactions
                                        </span>
                                    </div>
                                </div>
                            )}

                            {fileHash && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Hash className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            SHA-256 Hash
                                        </span>
                                        <Badge variant="info" size="sm">Generated</Badge>
                                    </div>
                                    <code className="block text-xs font-mono text-gray-600 dark:text-gray-400 break-all bg-gray-100 dark:bg-gray-900 p-3 rounded-lg">
                                        {fileHash}
                                    </code>
                                    <p className="text-xs text-gray-500 mt-2">
                                        This hash will be stored on the blockchain to verify record integrity
                                    </p>
                                </div>
                            )}

                            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                                    How It Works
                                </h3>
                                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                                        <span>File is hashed using SHA-256</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                                        <span>You sign the record with MetaMask</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                                        <span>Hash is stored on blockchain</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
                                        <span>Record integrity can be verified anytime</span>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
