const mongoose = require('mongoose');

const sharedRecordSchema = new mongoose.Schema({
    // Record details
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    recordType: {
        type: String,
        enum: ['diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'consultation', 'vaccination', 'report', 'other'],
        default: 'report'
    },

    // File info
    fileName: {
        type: String,
        required: true
    },
    originalFileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number
    },
    mimeType: {
        type: String
    },
    fileHash: {
        type: String // SHA-256 hash for integrity
    },

    // Wallet-based access control
    grantedWallets: [{
        walletAddress: {
            type: String,
            required: true,
            lowercase: true // Normalize wallet addresses
        },
        grantedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        },
        expirationDays: {
            type: Number,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        accessCount: {
            type: Number,
            default: 0
        },
        lastAccessed: {
            type: Date
        }
    }],

    // Blockchain reference
    blockchain: {
        transactionHash: String,
        blockNumber: Number,
        recordedAt: Date
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Index for wallet-based queries
sharedRecordSchema.index({ 'grantedWallets.walletAddress': 1 });
sharedRecordSchema.index({ patientId: 1 });
sharedRecordSchema.index({ 'grantedWallets.expiresAt': 1 });

// Method to check if wallet has valid access
sharedRecordSchema.methods.hasValidAccess = function (walletAddress) {
    const normalizedWallet = walletAddress.toLowerCase();
    const grant = this.grantedWallets.find(g =>
        g.walletAddress === normalizedWallet &&
        g.isActive &&
        new Date() < new Date(g.expiresAt)
    );
    return grant || null;
};

// Method to grant access to wallet
sharedRecordSchema.methods.grantAccess = function (walletAddress, expirationDays) {
    const normalizedWallet = walletAddress.toLowerCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Check if already granted
    const existingIndex = this.grantedWallets.findIndex(g => g.walletAddress === normalizedWallet);

    if (existingIndex >= 0) {
        // Update existing grant
        this.grantedWallets[existingIndex].expiresAt = expiresAt;
        this.grantedWallets[existingIndex].expirationDays = expirationDays;
        this.grantedWallets[existingIndex].isActive = true;
        this.grantedWallets[existingIndex].grantedAt = new Date();
    } else {
        // Add new grant
        this.grantedWallets.push({
            walletAddress: normalizedWallet,
            expiresAt,
            expirationDays,
            grantedAt: new Date()
        });
    }

    return expiresAt;
};

// Method to revoke access
sharedRecordSchema.methods.revokeAccess = function (walletAddress) {
    const normalizedWallet = walletAddress.toLowerCase();
    const grant = this.grantedWallets.find(g => g.walletAddress === normalizedWallet);
    if (grant) {
        grant.isActive = false;
        return true;
    }
    return false;
};

// Static method to find records accessible by wallet
sharedRecordSchema.statics.findByWallet = function (walletAddress) {
    const normalizedWallet = walletAddress.toLowerCase();
    const now = new Date();

    return this.find({
        status: 'active',
        grantedWallets: {
            $elemMatch: {
                walletAddress: normalizedWallet,
                isActive: true,
                expiresAt: { $gt: now }
            }
        }
    }).populate('patientId', 'email profile');
};

module.exports = mongoose.model('SharedRecord', sharedRecordSchema);
