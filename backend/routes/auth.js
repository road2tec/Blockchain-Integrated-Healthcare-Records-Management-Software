const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role, profile } = req.body;

        // Validate required fields
        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and role are required'
            });
        }

        // Validate role
        if (!['admin', 'doctor', 'patient'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be admin, doctor, or patient'
            });
        }

        // Check if admin signup is allowed (only first admin or seeded)
        if (role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin registration is restricted. Contact existing admin.'
                });
            }
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password,
            role,
            profile: {
                firstName: profile?.firstName || '',
                lastName: profile?.lastName || '',
                phone: profile?.phone || '',
                ...profile
            }
        });

        await user.save();

        // For doctors, return pending status message
        if (role === 'doctor') {
            return res.status(201).json({
                success: true,
                message: 'Registration successful. Your account is pending admin approval.',
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    status: user.status
                }
            });
        }

        // For patients and first admin, generate tokens
        const tokens = generateTokens(user._id, user.role);

        // Save refresh token
        user.refreshTokens.push({ token: tokens.refreshToken });
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: user.getPublicProfile(),
            ...tokens
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get tokens
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email and include password
        let query = { email: email.toLowerCase() };
        if (role) {
            query.role = role;
        }

        const user = await User.findOne(query).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check account status
        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval. Please wait for admin approval.'
            });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Contact administrator.'
            });
        }

        // Generate tokens
        const tokens = generateTokens(user._id, user.role);

        // Save refresh token
        user.refreshTokens.push({ token: tokens.refreshToken });
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login successful',
            user: user.getPublicProfile(),
            ...tokens
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Find user and check if refresh token exists
        const user = await User.findOne({
            _id: decoded.userId,
            'refreshTokens.token': refreshToken
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check account status
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `Account is ${user.status}`
            });
        }

        // Generate new tokens
        const tokens = generateTokens(user._id, user.role);

        // Remove old refresh token and add new one
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        user.refreshTokens.push({ token: tokens.refreshToken });
        await user.save();

        res.json({
            success: true,
            ...tokens
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Token refresh failed',
            error: error.message
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user & invalidate refresh token
// @access  Private
router.post('/logout', protect, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Remove specific refresh token
            req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== refreshToken);
        } else {
            // Remove all refresh tokens (logout from all devices)
            req.user.refreshTokens = [];
        }

        await req.user.save();

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
});

// @route   POST /api/auth/connect-wallet
// @desc    Link Ethereum address to user account (after login)
// @access  Private
router.post('/connect-wallet', protect, async (req, res) => {
    try {
        const { ethereumAddress, signature, message } = req.body;

        if (!ethereumAddress) {
            return res.status(400).json({
                success: false,
                message: 'Ethereum address is required'
            });
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(ethereumAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address format'
            });
        }

        // Check if address is already linked to another account
        const existingUser = await User.findOne({
            ethereumAddress: ethereumAddress.toLowerCase(),
            _id: { $ne: req.user._id }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'This Ethereum address is already linked to another account'
            });
        }

        // TODO: Verify signature if provided
        // This ensures the user actually owns the wallet

        // Update user's Ethereum address
        req.user.ethereumAddress = ethereumAddress.toLowerCase();
        await req.user.save();

        res.json({
            success: true,
            message: 'Wallet connected successfully',
            ethereumAddress: req.user.ethereumAddress
        });
    } catch (error) {
        console.error('Connect wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to connect wallet',
            error: error.message
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.getPublicProfile()
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: error.message
        });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const { profile } = req.body;

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: 'Profile data is required'
            });
        }

        // Update allowed profile fields
        const allowedFields = [
            'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'address',
            'specialization', 'licenseNumber', 'hospitalAffiliation', // Doctor fields
            'bloodGroup', 'emergencyContact', 'allergies', 'chronicConditions' // Patient fields
        ];

        allowedFields.forEach(field => {
            if (profile[field] !== undefined) {
                req.user.profile[field] = profile[field];
            }
        });

        await req.user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: req.user.getPublicProfile()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current and new password are required'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }

        // Update password
        user.password = newPassword;
        user.refreshTokens = []; // Invalidate all sessions
        await user.save();

        // Generate new tokens
        const tokens = generateTokens(user._id, user.role);
        user.refreshTokens.push({ token: tokens.refreshToken });
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully',
            ...tokens
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
});

module.exports = router;
