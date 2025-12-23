const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'granted', 'revoked', 'expired'],
        default: 'pending'
    },
    // Blockchain reference
    blockchain: {
        grantTransactionHash: String,
        grantBlockNumber: Number,
        grantedAt: Date,
        revokeTransactionHash: String,
        revokeBlockNumber: Number,
        revokedAt: Date
    },
    // Access scope
    scope: {
        recordTypes: [{
            type: String,
            enum: ['diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'consultation', 'vaccination', 'other', 'all']
        }],
        startDate: Date,
        endDate: Date, // Optional expiry
        allowDownload: {
            type: Boolean,
            default: false
        },
        allowShare: {
            type: Boolean,
            default: false
        }
    },
    // Request details
    requestMessage: {
        type: String,
        trim: true
    },
    responseMessage: {
        type: String,
        trim: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date
    },
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

// Compound index to ensure unique consent per patient-doctor pair
consentSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
consentSchema.index({ status: 1 });

const Consent = mongoose.model('Consent', consentSchema);

module.exports = Consent;
