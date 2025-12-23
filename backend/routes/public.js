const express = require('express');
const router = express.Router();
const fs = require('fs');
const SharedRecord = require('../models/SharedRecord');

// ========================================
// PUBLIC ROUTES FOR SHARED RECORDS
// These routes use wallet-based authentication only (no JWT required)
// This allows iframes to load content directly
// ========================================

// @route   GET /api/public/shared-records/:recordId/view
// @desc    View a shared record (VIEW ONLY - NO DOWNLOAD)
// @access  Public (with valid wallet access)
router.get('/shared-records/:recordId/view', async (req, res) => {
    try {
        const { walletAddress } = req.query;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required as query parameter'
            });
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum wallet address format'
            });
        }

        const record = await SharedRecord.findOne({
            _id: req.params.recordId,
            status: 'active'
        }).populate('patientId', 'profile.firstName profile.lastName');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Check if wallet has valid access
        const grant = record.hasValidAccess(walletAddress);

        if (!grant) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Either no access granted, access revoked, or access has expired.'
            });
        }

        // Check if file exists
        if (!fs.existsSync(record.filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Update access count and last accessed
        grant.accessCount = (grant.accessCount || 0) + 1;
        grant.lastAccessed = new Date();
        await record.save();

        // Set headers for inline viewing (prevents download prompt)
        res.setHeader('Content-Type', record.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${record.originalFileName}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');

        // Stream the file
        const fileStream = fs.createReadStream(record.filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('View shared record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to view record',
            error: error.message
        });
    }
});

// @route   GET /api/public/shared-records/:recordId/info
// @desc    Get shared record metadata (without file content) 
// @access  Public (with valid wallet access)
router.get('/shared-records/:recordId/info', async (req, res) => {
    try {
        const { walletAddress } = req.query;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required'
            });
        }

        const record = await SharedRecord.findOne({
            _id: req.params.recordId,
            status: 'active'
        }).populate('patientId', 'profile.firstName profile.lastName email');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Check access
        const grant = record.hasValidAccess(walletAddress);

        if (!grant) {
            return res.status(403).json({
                success: false,
                message: 'Access denied or expired'
            });
        }

        res.json({
            success: true,
            record: {
                id: record._id,
                title: record.title,
                description: record.description,
                recordType: record.recordType,
                fileHash: record.fileHash,
                mimeType: record.mimeType,
                fileSize: record.fileSize,
                createdAt: record.createdAt,
                patient: {
                    name: `${record.patientId?.profile?.firstName} ${record.patientId?.profile?.lastName}`,
                    email: record.patientId?.email
                },
                access: {
                    expiresAt: grant.expiresAt,
                    daysRemaining: Math.max(0, Math.ceil((new Date(grant.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))),
                    accessCount: grant.accessCount
                }
            }
        });
    } catch (error) {
        console.error('Get shared record info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get record info',
            error: error.message
        });
    }
});

module.exports = router;
