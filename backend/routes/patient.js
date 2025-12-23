const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const Consent = require('../models/Consent');
const { protect } = require('../middleware/auth');
const { isPatient } = require('../middleware/roleCheck');
const { generateHashFromBuffer, verifyFileHash } = require('../services/hashService');
const blockchainService = require('../services/blockchainService');

// Configure multer for personal document uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `patient_${req.user._id}_${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for personal docs
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
        }
    }
});

// Apply patient role check to all routes
router.use(protect, isPatient);

// @route   GET /api/patient/dashboard
// @desc    Get patient dashboard data
// @access  Patient
router.get('/dashboard', async (req, res) => {
    try {
        const [recordCount, activeConsents, pendingRequests, recentRecords] = await Promise.all([
            MedicalRecord.countDocuments({ patientId: req.user._id }),
            Consent.countDocuments({ patientId: req.user._id, status: 'granted' }),
            Consent.countDocuments({ patientId: req.user._id, status: 'pending' }),
            MedicalRecord.find({ patientId: req.user._id })
                .populate('doctorId', 'profile.firstName profile.lastName profile.specialization')
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        res.json({
            success: true,
            dashboard: {
                recordCount,
                activeConsents,
                pendingRequests,
                recentRecords
            }
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard',
            error: error.message
        });
    }
});

// @route   GET /api/patient/records
// @desc    Get own medical records
// @access  Patient
router.get('/records', async (req, res) => {
    try {
        const { recordType, doctorId, page = 1, limit = 20 } = req.query;

        let query = { patientId: req.user._id };
        if (recordType) query.recordType = recordType;
        if (doctorId) query.doctorId = doctorId;

        const records = await MedicalRecord.find(query)
            .populate('doctorId', 'profile.firstName profile.lastName profile.specialization profile.hospitalAffiliation')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await MedicalRecord.countDocuments(query);

        res.json({
            success: true,
            records,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get records',
            error: error.message
        });
    }
});

// @route   GET /api/patient/records/:recordId
// @desc    Get a specific record
// @access  Patient
router.get('/records/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.recordId,
            patientId: req.user._id
        }).populate('doctorId', 'profile.firstName profile.lastName profile.specialization');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        res.json({
            success: true,
            record
        });
    } catch (error) {
        console.error('Get record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get record',
            error: error.message
        });
    }
});

// @route   GET /api/patient/records/:recordId/verify
// @desc    Verify record integrity
// @access  Patient
router.get('/records/:recordId/verify', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.recordId,
            patientId: req.user._id
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Verify file integrity
        const fileVerification = await verifyFileHash(record.filePath, record.fileHash);

        // Verify against blockchain
        let blockchainVerification = null;
        if (record.blockchain?.recordId) {
            try {
                blockchainVerification = await blockchainService.verifyRecordHash(
                    record.blockchain.recordId,
                    record.fileHash
                );
            } catch (bcError) {
                blockchainVerification = { error: bcError.message };
            }
        }

        const isValid = fileVerification.valid &&
            (!blockchainVerification || blockchainVerification.valid);

        res.json({
            success: true,
            verification: {
                recordId: record._id,
                title: record.title,
                fileHash: record.fileHash,
                fileIntegrity: fileVerification,
                blockchain: blockchainVerification,
                status: isValid ? 'VERIFIED' : 'TAMPERED',
                message: isValid
                    ? 'Record integrity verified successfully'
                    : 'WARNING: Record may have been tampered with!'
            }
        });
    } catch (error) {
        console.error('Verify record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify record',
            error: error.message
        });
    }
});

// @route   GET /api/patient/records/:recordId/download
// @desc    Download a record file
// @access  Patient
router.get('/records/:recordId/download', async (req, res) => {
    try {
        const record = await MedicalRecord.findOne({
            _id: req.params.recordId,
            patientId: req.user._id
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Log download access
        record.accessLog.push({
            accessedBy: req.user._id,
            accessType: 'download',
            ipAddress: req.ip
        });
        await record.save();

        res.download(record.filePath, record.originalFileName);
    } catch (error) {
        console.error('Download record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download record',
            error: error.message
        });
    }
});

// @route   GET /api/patient/consent-requests
// @desc    Get pending consent requests from doctors
// @access  Patient
router.get('/consent-requests', async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const requests = await Consent.find({
            patientId: req.user._id,
            status
        })
            .populate('doctorId', 'profile.firstName profile.lastName profile.specialization profile.hospitalAffiliation email')
            .sort({ requestedAt: -1 });

        res.json({
            success: true,
            requests: requests.map(r => ({
                id: r._id,
                doctor: r.doctorId?.getPublicProfile(),
                message: r.requestMessage,
                scope: r.scope,
                requestedAt: r.requestedAt,
                status: r.status
            }))
        });
    } catch (error) {
        console.error('Get consent requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get consent requests',
            error: error.message
        });
    }
});

// @route   GET /api/patient/consents
// @desc    Get all consents (active and revoked)
// @access  Patient
router.get('/consents', async (req, res) => {
    try {
        const consents = await Consent.find({
            patientId: req.user._id
        })
            .populate('doctorId', 'profile.firstName profile.lastName profile.specialization profile.hospitalAffiliation email')
            .sort({ updatedAt: -1 });

        res.json({
            success: true,
            consents: consents.map(c => ({
                id: c._id,
                doctor: c.doctorId?.getPublicProfile(),
                status: c.status,
                scope: c.scope,
                grantedAt: c.blockchain?.grantedAt,
                revokedAt: c.blockchain?.revokedAt,
                blockchain: c.blockchain
            }))
        });
    } catch (error) {
        console.error('Get consents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get consents',
            error: error.message
        });
    }
});

// @route   POST /api/patient/consent/:doctorId/grant
// @desc    Grant consent to a doctor (blockchain transaction)
// @access  Patient
router.post('/consent/:doctorId/grant', async (req, res) => {
    try {
        const { scope, responseMessage, transactionHash, signature } = req.body;
        const doctorId = req.params.doctorId;

        // Find doctor
        const doctor = await User.findOne({ _id: doctorId, role: 'doctor', status: 'active' });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found or inactive'
            });
        }

        // Find or create consent
        let consent = await Consent.findOne({
            patientId: req.user._id,
            doctorId
        });

        if (!consent) {
            return res.status(404).json({
                success: false,
                message: 'No consent request found from this doctor'
            });
        }

        if (consent.status === 'granted') {
            return res.status(400).json({
                success: false,
                message: 'Consent already granted'
            });
        }

        // Update consent
        consent.status = 'granted';
        consent.responseMessage = responseMessage;
        consent.respondedAt = new Date();

        if (scope) {
            consent.scope = { ...consent.scope, ...scope };
        }

        // Record blockchain transaction if provided
        if (transactionHash) {
            consent.blockchain.grantTransactionHash = transactionHash;
            consent.blockchain.grantedAt = new Date();

            // Get block number if possible
            try {
                const tx = await blockchainService.getTransaction(transactionHash);
                if (tx) {
                    consent.blockchain.grantBlockNumber = tx.blockNumber;
                }
            } catch (error) {
                console.log('Could not get transaction details:', error.message);
            }
        }

        await consent.save();

        // Log action on blockchain if server-side signing is enabled
        try {
            if (process.env.PATIENT_PRIVATE_KEY && req.user.ethereumAddress && doctor.ethereumAddress) {
                await blockchainService.logAccess(
                    req.user.ethereumAddress,
                    doctor.ethereumAddress,
                    'CONSENT_GRANTED',
                    consent._id.toString(),
                    process.env.PATIENT_PRIVATE_KEY
                );
            }
        } catch (bcError) {
            console.log('Blockchain logging skipped:', bcError.message);
        }

        res.json({
            success: true,
            message: 'Consent granted successfully',
            consent: {
                id: consent._id,
                status: consent.status,
                doctor: doctor.getPublicProfile(),
                blockchain: consent.blockchain
            }
        });
    } catch (error) {
        console.error('Grant consent error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant consent',
            error: error.message
        });
    }
});

// @route   POST /api/patient/consent/:doctorId/revoke
// @desc    Revoke consent from a doctor (blockchain transaction)
// @access  Patient
router.post('/consent/:doctorId/revoke', async (req, res) => {
    try {
        const { reason, transactionHash } = req.body;
        const doctorId = req.params.doctorId;

        const consent = await Consent.findOne({
            patientId: req.user._id,
            doctorId,
            status: 'granted'
        }).populate('doctorId', 'profile.firstName profile.lastName ethereumAddress');

        if (!consent) {
            return res.status(404).json({
                success: false,
                message: 'Active consent not found'
            });
        }

        // Update consent
        consent.status = 'revoked';
        consent.responseMessage = reason || 'Consent revoked by patient';

        if (transactionHash) {
            consent.blockchain.revokeTransactionHash = transactionHash;
            consent.blockchain.revokedAt = new Date();

            try {
                const tx = await blockchainService.getTransaction(transactionHash);
                if (tx) {
                    consent.blockchain.revokeBlockNumber = tx.blockNumber;
                }
            } catch (error) {
                console.log('Could not get transaction details:', error.message);
            }
        }

        await consent.save();

        res.json({
            success: true,
            message: 'Consent revoked successfully',
            consent: {
                id: consent._id,
                status: consent.status,
                blockchain: consent.blockchain
            }
        });
    } catch (error) {
        console.error('Revoke consent error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke consent',
            error: error.message
        });
    }
});

// @route   GET /api/patient/access-logs
// @desc    Get access logs for patient's records
// @access  Patient
router.get('/access-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const records = await MedicalRecord.find({ patientId: req.user._id })
            .populate('accessLog.accessedBy', 'profile.firstName profile.lastName role')
            .select('title accessLog createdAt');

        // Flatten and sort all access logs
        let allLogs = [];
        records.forEach(record => {
            record.accessLog.forEach(log => {
                allLogs.push({
                    recordId: record._id,
                    recordTitle: record.title,
                    accessedBy: log.accessedBy,
                    accessType: log.accessType,
                    accessedAt: log.accessedAt,
                    ipAddress: log.ipAddress
                });
            });
        });

        // Sort by date descending
        allLogs.sort((a, b) => new Date(b.accessedAt) - new Date(a.accessedAt));

        // Paginate
        const startIndex = (page - 1) * limit;
        const paginatedLogs = allLogs.slice(startIndex, startIndex + parseInt(limit));

        res.json({
            success: true,
            logs: paginatedLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: allLogs.length,
                pages: Math.ceil(allLogs.length / limit)
            }
        });
    } catch (error) {
        console.error('Get access logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get access logs',
            error: error.message
        });
    }
});

// @route   POST /api/patient/documents
// @desc    Upload personal health document
// @access  Patient
router.post('/documents', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        const { title, description, recordType } = req.body;

        // Generate SHA-256 hash
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = generateHashFromBuffer(fileBuffer);

        // Create record (self-uploaded)
        const record = new MedicalRecord({
            patientId: req.user._id,
            doctorId: req.user._id, // Self-uploaded
            title: title || 'Personal Document',
            description,
            recordType: recordType || 'other',
            fileName: req.file.filename,
            originalFileName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            fileHash,
            status: 'pending' // Not verified on blockchain
        });

        await record.save();

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            record: {
                id: record._id,
                title: record.title,
                fileHash: record.fileHash,
                createdAt: record.createdAt
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload document',
            error: error.message
        });
    }
});

// ========================================
// SHARED RECORDS - WALLET-BASED ACCESS
// ========================================

const SharedRecord = require('../models/SharedRecord');

// @route   POST /api/patient/shared-records
// @desc    Upload a record to share with doctors via wallet address
// @access  Patient
router.post('/shared-records', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        const { title, description, recordType } = req.body;

        // Generate SHA-256 hash
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = generateHashFromBuffer(fileBuffer);

        // Create shared record
        const sharedRecord = new SharedRecord({
            patientId: req.user._id,
            title: title || 'Medical Report',
            description,
            recordType: recordType || 'report',
            fileName: req.file.filename,
            originalFileName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            fileHash
        });

        await sharedRecord.save();

        res.status(201).json({
            success: true,
            message: 'Record uploaded successfully. You can now grant access to doctors.',
            record: {
                id: sharedRecord._id,
                title: sharedRecord.title,
                recordType: sharedRecord.recordType,
                fileHash: sharedRecord.fileHash,
                createdAt: sharedRecord.createdAt,
                grantedWallets: []
            }
        });
    } catch (error) {
        console.error('Upload shared record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload record',
            error: error.message
        });
    }
});

// @route   GET /api/patient/shared-records
// @desc    Get all shared records uploaded by patient
// @access  Patient
router.get('/shared-records', async (req, res) => {
    try {
        const records = await SharedRecord.find({
            patientId: req.user._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            records: records.map(r => ({
                id: r._id,
                title: r.title,
                description: r.description,
                recordType: r.recordType,
                fileHash: r.fileHash,
                createdAt: r.createdAt,
                grantedWallets: r.grantedWallets.map(g => ({
                    walletAddress: g.walletAddress,
                    expirationDays: g.expirationDays,
                    expiresAt: g.expiresAt,
                    isActive: g.isActive,
                    isExpired: new Date() > new Date(g.expiresAt),
                    accessCount: g.accessCount
                }))
            }))
        });
    } catch (error) {
        console.error('Get shared records error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shared records',
            error: error.message
        });
    }
});

// @route   POST /api/patient/shared-records/:recordId/grant
// @desc    Grant wallet-based access to a record with expiration
// @access  Patient
router.post('/shared-records/:recordId/grant', async (req, res) => {
    try {
        const { walletAddress, expirationDays } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required'
            });
        }

        if (!expirationDays || expirationDays < 1 || expirationDays > 365) {
            return res.status(400).json({
                success: false,
                message: 'Expiration days must be between 1 and 365'
            });
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum wallet address format'
            });
        }

        const record = await SharedRecord.findOne({
            _id: req.params.recordId,
            patientId: req.user._id,
            status: 'active'
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Grant access
        const expiresAt = record.grantAccess(walletAddress, parseInt(expirationDays));
        await record.save();

        res.json({
            success: true,
            message: `Access granted to wallet ${walletAddress} for ${expirationDays} days`,
            grant: {
                walletAddress: walletAddress.toLowerCase(),
                expirationDays,
                expiresAt,
                recordId: record._id,
                recordTitle: record.title
            }
        });
    } catch (error) {
        console.error('Grant wallet access error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant access',
            error: error.message
        });
    }
});

// @route   POST /api/patient/shared-records/:recordId/revoke
// @desc    Revoke wallet-based access from a record
// @access  Patient
router.post('/shared-records/:recordId/revoke', async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required'
            });
        }

        const record = await SharedRecord.findOne({
            _id: req.params.recordId,
            patientId: req.user._id
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        const revoked = record.revokeAccess(walletAddress);

        if (!revoked) {
            return res.status(404).json({
                success: false,
                message: 'No active access found for this wallet'
            });
        }

        await record.save();

        res.json({
            success: true,
            message: `Access revoked from wallet ${walletAddress}`
        });
    } catch (error) {
        console.error('Revoke wallet access error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke access',
            error: error.message
        });
    }
});

// @route   DELETE /api/patient/shared-records/:recordId
// @desc    Delete a shared record
// @access  Patient
router.delete('/shared-records/:recordId', async (req, res) => {
    try {
        const record = await SharedRecord.findOne({
            _id: req.params.recordId,
            patientId: req.user._id
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        record.status = 'deleted';
        await record.save();

        res.json({
            success: true,
            message: 'Record deleted successfully'
        });
    } catch (error) {
        console.error('Delete shared record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete record',
            error: error.message
        });
    }
});

module.exports = router;

