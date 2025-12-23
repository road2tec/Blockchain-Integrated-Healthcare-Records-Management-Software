const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Patient ID is required']
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Doctor ID is required']
    },
    title: {
        type: String,
        required: [true, 'Record title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    recordType: {
        type: String,
        enum: ['diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'consultation', 'vaccination', 'other'],
        required: [true, 'Record type is required']
    },
    fileName: {
        type: String,
        required: [true, 'File name is required']
    },
    originalFileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: [true, 'File path is required']
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    fileHash: {
        type: String,
        required: [true, 'SHA-256 hash is required']
    },
    // Blockchain reference
    blockchain: {
        recordId: {
            type: String // On-chain record ID
        },
        transactionHash: {
            type: String // Transaction hash when stored on-chain
        },
        blockNumber: {
            type: Number
        },
        storedAt: {
            type: Date
        },
        verified: {
            type: Boolean,
            default: false
        }
    },
    // Digital signature from doctor
    signature: {
        hash: String,
        signedBy: String, // Ethereum address
        signedAt: Date,
        transactionHash: String
    },
    // Metadata
    metadata: {
        diagnosis: String,
        treatment: String,
        medications: [String],
        followUpDate: Date,
        notes: String
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'verified', 'revoked'],
        default: 'pending'
    },
    accessLog: [{
        accessedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        accessType: {
            type: String,
            enum: ['view', 'download', 'share']
        },
        accessedAt: {
            type: Date,
            default: Date.now
        },
        ipAddress: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
medicalRecordSchema.index({ patientId: 1, createdAt: -1 });
medicalRecordSchema.index({ doctorId: 1, createdAt: -1 });
medicalRecordSchema.index({ fileHash: 1 });
medicalRecordSchema.index({ 'blockchain.recordId': 1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord;
