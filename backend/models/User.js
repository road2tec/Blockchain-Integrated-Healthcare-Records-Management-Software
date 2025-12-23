const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'doctor', 'patient'],
        required: [true, 'Role is required']
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: function () {
            // Doctors need approval, patients are active by default
            return this.role === 'doctor' ? 'pending' : 'active';
        }
    },
    ethereumAddress: {
        type: String,
        default: null,
        sparse: true
    },
    profile: {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other']
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        },
        // Doctor-specific fields
        specialization: {
            type: String
        },
        licenseNumber: {
            type: String
        },
        hospitalAffiliation: {
            type: String
        },
        // Patient-specific fields
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        },
        emergencyContact: {
            name: String,
            phone: String,
            relationship: String
        },
        allergies: [String],
        chronicConditions: [String]
    },
    refreshTokens: [{
        token: String,
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 604800 // 7 days in seconds
        }
    }],
    lastLogin: {
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

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        email: this.email,
        role: this.role,
        status: this.status,
        ethereumAddress: this.ethereumAddress,
        profile: this.profile,
        createdAt: this.createdAt
    };
};

// Index for faster queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ ethereumAddress: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
