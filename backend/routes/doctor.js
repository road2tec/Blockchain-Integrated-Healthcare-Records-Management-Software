const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const Consent = require('../models/Consent');
const DoctorAvailability = require('../models/DoctorAvailability');
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');
const { isDoctor, hasConsent } = require('../middleware/roleCheck');
const { generateHashFromBuffer, generateRecordId } = require('../services/hashService');
const blockchainService = require('../services/blockchainService');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Apply doctor role check to all routes
router.use(protect, isDoctor);

// @route   GET /api/doctor/dashboard
// @desc    Get doctor dashboard data
// @access  Doctor
router.get('/dashboard', async (req, res) => {
    try {
        const [patientCount, recordCount, recentRecords] = await Promise.all([
            Consent.countDocuments({ doctorId: req.user._id, status: 'granted' }),
            MedicalRecord.countDocuments({ doctorId: req.user._id }),
            MedicalRecord.find({ doctorId: req.user._id })
                .populate('patientId', 'profile.firstName profile.lastName')
                .sort({ createdAt: -1 })
                .limit(5)
        ]);

        res.json({
            success: true,
            dashboard: {
                patientCount,
                recordCount,
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

// @route   GET /api/doctor/patients
// @desc    Get patients with consent
// @access  Doctor
router.get('/patients', async (req, res) => {
    try {
        const { status = 'granted', page = 1, limit = 20 } = req.query;

        const consents = await Consent.find({
            doctorId: req.user._id,
            status
        })
            .populate('patientId', '-password -refreshTokens')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Consent.countDocuments({
            doctorId: req.user._id,
            status
        });

        const patients = consents.map(c => ({
            consent: {
                id: c._id,
                status: c.status,
                scope: c.scope,
                grantedAt: c.blockchain?.grantedAt,
                requestedAt: c.requestedAt
            },
            patient: c.patientId?.getPublicProfile()
        }));

        res.json({
            success: true,
            patients,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get patients',
            error: error.message
        });
    }
});

// @route   POST /api/doctor/consent-request/:patientId
// @desc    Request consent from a patient
// @access  Doctor
router.post('/consent-request/:patientId', async (req, res) => {
    try {
        const { message, scope } = req.body;
        const patientId = req.params.patientId;

        // Check if patient exists
        const patient = await User.findOne({ _id: patientId, role: 'patient' });
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Check for existing consent request
        let consent = await Consent.findOne({
            patientId,
            doctorId: req.user._id
        });

        if (consent) {
            if (consent.status === 'granted') {
                return res.status(400).json({
                    success: false,
                    message: 'You already have consent from this patient'
                });
            }

            if (consent.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Consent request already pending'
                });
            }

            // Update existing revoked consent to pending
            consent.status = 'pending';
            consent.requestMessage = message;
            consent.scope = scope || { recordTypes: ['all'] };
            consent.requestedAt = new Date();
        } else {
            // Create new consent request
            consent = new Consent({
                patientId,
                doctorId: req.user._id,
                status: 'pending',
                requestMessage: message,
                scope: scope || { recordTypes: ['all'] }
            });
        }

        await consent.save();

        res.status(201).json({
            success: true,
            message: 'Consent request sent successfully',
            consent: {
                id: consent._id,
                status: consent.status,
                requestedAt: consent.requestedAt
            }
        });
    } catch (error) {
        console.error('Request consent error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to request consent',
            error: error.message
        });
    }
});

// @route   GET /api/doctor/records/:patientId
// @desc    Get patient records (requires consent)
// @access  Doctor
router.get('/records/:patientId', hasConsent, async (req, res) => {
    try {
        const { recordType, page = 1, limit = 20 } = req.query;

        let query = { patientId: req.params.patientId };
        if (recordType) {
            query.recordType = recordType;
        }

        const records = await MedicalRecord.find(query)
            .populate('doctorId', 'profile.firstName profile.lastName profile.specialization')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await MedicalRecord.countDocuments(query);

        // Log access
        for (const record of records) {
            record.accessLog.push({
                accessedBy: req.user._id,
                accessType: 'view',
                ipAddress: req.ip
            });
            await record.save();
        }

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

// @route   POST /api/doctor/records
// @desc    Upload a new medical record
// @access  Doctor
router.post('/records', upload.single('file'), hasConsent, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        const { patientId, title, description, recordType, metadata } = req.body;

        // Validate patient exists and has consent
        const patient = await User.findOne({ _id: patientId, role: 'patient' });
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Generate SHA-256 hash
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = generateHashFromBuffer(fileBuffer);
        const recordId = generateRecordId(fileHash);

        // Create medical record
        const record = new MedicalRecord({
            patientId,
            doctorId: req.user._id,
            title,
            description,
            recordType: recordType || 'other',
            fileName: req.file.filename,
            originalFileName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            fileHash,
            blockchain: {
                recordId
            },
            metadata: metadata ? JSON.parse(metadata) : {}
        });

        await record.save();

        // Store hash on blockchain if configured
        try {
            if (process.env.DOCTOR_PRIVATE_KEY || req.user.ethereumAddress) {
                const result = await blockchainService.storeRecordHash(
                    recordId,
                    fileHash,
                    patient.ethereumAddress || '0x0',
                    req.user.ethereumAddress || '0x0',
                    JSON.stringify({ title, recordType }),
                    process.env.DOCTOR_PRIVATE_KEY
                );

                if (result.success) {
                    record.blockchain.transactionHash = result.transactionHash;
                    record.blockchain.blockNumber = result.blockNumber;
                    record.blockchain.storedAt = new Date();
                    record.blockchain.verified = true;
                    record.status = 'verified';
                    await record.save();
                }
            }
        } catch (bcError) {
            console.log('Blockchain storage skipped:', bcError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Medical record uploaded successfully',
            record: {
                id: record._id,
                title: record.title,
                fileHash: record.fileHash,
                blockchain: record.blockchain,
                createdAt: record.createdAt
            }
        });
    } catch (error) {
        console.error('Upload record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload record',
            error: error.message
        });
    }
});

// @route   GET /api/doctor/verify-record/:recordId
// @desc    Verify record integrity against blockchain
// @access  Doctor
router.get('/verify-record/:recordId', async (req, res) => {
    try {
        const record = await MedicalRecord.findById(req.params.recordId);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Verify file hash
        const { verifyFileHash } = require('../services/hashService');
        const fileVerification = await verifyFileHash(record.filePath, record.fileHash);

        // Verify against blockchain if stored
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

        res.json({
            success: true,
            verification: {
                recordId: record._id,
                fileHash: record.fileHash,
                fileIntegrity: fileVerification,
                blockchain: blockchainVerification,
                status: fileVerification.valid &&
                    (!blockchainVerification || blockchainVerification.valid)
                    ? 'VERIFIED'
                    : 'TAMPERED'
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

// @route   GET /api/doctor/search-patients
// @desc    Search for patients to request consent
// @access  Doctor
router.get('/search-patients', async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const searchRegex = new RegExp(query, 'i');

        const patients = await User.find({
            role: 'patient',
            status: 'active',
            $or: [
                { email: searchRegex },
                { 'profile.firstName': searchRegex },
                { 'profile.lastName': searchRegex }
            ]
        })
            .select('email profile.firstName profile.lastName')
            .limit(parseInt(limit));

        // Check consent status for each patient
        const patientsWithConsent = await Promise.all(
            patients.map(async (p) => {
                const consent = await Consent.findOne({
                    patientId: p._id,
                    doctorId: req.user._id
                });

                return {
                    id: p._id,
                    email: p.email,
                    firstName: p.profile.firstName,
                    lastName: p.profile.lastName,
                    consentStatus: consent?.status || 'none'
                };
            })
        );

        res.json({
            success: true,
            patients: patientsWithConsent
        });
    } catch (error) {
        console.error('Search patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search patients',
            error: error.message
        });
    }
});

// ========================================
// SHARED RECORDS - WALLET-BASED ACCESS
// ========================================

const SharedRecord = require('../models/SharedRecord');

// @route   POST /api/doctor/shared-records/by-wallet
// @desc    Get records shared to a specific wallet address (VIEW ONLY, NO DOWNLOAD)
// @access  Doctor
router.post('/shared-records/by-wallet', async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required'
            });
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum wallet address format'
            });
        }

        // Find all records shared to this wallet with valid access
        const records = await SharedRecord.findByWallet(walletAddress);

        // Format response - NO download URLs, only view info
        const formattedRecords = records.map(record => {
            const grant = record.hasValidAccess(walletAddress);
            return {
                id: record._id,
                title: record.title,
                description: record.description,
                recordType: record.recordType,
                fileHash: record.fileHash,
                mimeType: record.mimeType,
                fileSize: record.fileSize,
                createdAt: record.createdAt,
                patient: {
                    id: record.patientId?._id,
                    name: record.patientId?.profile
                        ? `${record.patientId.profile.firstName} ${record.patientId.profile.lastName}`
                        : 'Unknown',
                    email: record.patientId?.email
                },
                access: {
                    expiresAt: grant?.expiresAt,
                    expirationDays: grant?.expirationDays,
                    grantedAt: grant?.grantedAt,
                    daysRemaining: grant?.expiresAt
                        ? Math.max(0, Math.ceil((new Date(grant.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
                        : 0
                }
            };
        });

        res.json({
            success: true,
            walletAddress: walletAddress.toLowerCase(),
            recordCount: formattedRecords.length,
            records: formattedRecords
        });
    } catch (error) {
        console.error('Get shared records by wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shared records',
            error: error.message
        });
    }
});

// @route   GET /api/doctor/shared-records/:recordId/view
// @desc    View a shared record (VIEW ONLY - NO DOWNLOAD, streams PDF inline)
// @access  Doctor (with valid wallet access)
router.get('/shared-records/:recordId/view', async (req, res) => {
    try {
        const { walletAddress } = req.query;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address is required as query parameter'
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

        // Update access count and last accessed
        grant.accessCount = (grant.accessCount || 0) + 1;
        grant.lastAccessed = new Date();
        await record.save();

        // Stream file for VIEW ONLY (inline disposition, not attachment)
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(record.filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Set headers for inline viewing (prevents download prompt)
        res.setHeader('Content-Type', record.mimeType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${record.originalFileName}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Prevent download by disabling content-length for browsers that use it to enable download
        // and adding cache headers
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

// @route   GET /api/doctor/shared-records/:recordId/info
// @desc    Get shared record metadata (without file content)
// @access  Doctor (with valid wallet access)
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

// ========================================
// AVAILABILITY MANAGEMENT ROUTES
// ========================================

// @route   POST /api/doctor/availability
// @desc    Add availability slot
// @access  Doctor
router.post('/availability', async (req, res) => {
    try {
        const { dayOfWeek, startTime, endTime, slotDuration, date } = req.body;

        // Validate required fields
        // If date is provided, dayOfWeek is derived. If no date, dayOfWeek is required.
        let derivedDayOfWeek = dayOfWeek;
        let formattedDate = null;

        if (date) {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format'
                });
            }
            d.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
            derivedDayOfWeek = d.getUTCDay();
            formattedDate = d;
        }

        if (derivedDayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'dayOfWeek (or date), startTime, and endTime are required'
            });
        }

        // Check for overlapping slots
        // If specific date, check overlap with other slots on that date
        // If recurring (no date), check overlap with other recurring slots
        const query = {
            doctorId: req.user._id,
            dayOfWeek: derivedDayOfWeek,
            isActive: true,
            $or: [
                { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
                { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
                { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
            ]
        };

        if (formattedDate) {
            query.date = formattedDate;
        } else {
            query.date = null; // Only check conflicts with recurring slots
        }

        const existing = await DoctorAvailability.findOne(query);

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'This time slot overlaps with an existing availability'
            });
        }

        const availability = new DoctorAvailability({
            doctorId: req.user._id,
            dayOfWeek: derivedDayOfWeek,
            date: formattedDate,
            startTime,
            endTime,
            slotDuration: slotDuration || 30
        });

        await availability.save();

        res.status(201).json({
            success: true,
            message: 'Availability added successfully',
            availability
        });
    } catch (error) {
        console.error('Add availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add availability',
            error: error.message
        });
    }
});

// @route   GET /api/doctor/availability
// @desc    Get my availability
// @access  Doctor
router.get('/availability', async (req, res) => {
    try {
        const availability = await DoctorAvailability.getDoctorAvailability(req.user._id);

        res.json({
            success: true,
            availability
        });
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get availability',
            error: error.message
        });
    }
});

// @route   DELETE /api/doctor/availability/:id
// @desc    Remove availability slot
// @access  Doctor
router.delete('/availability/:id', async (req, res) => {
    try {
        const availability = await DoctorAvailability.findOneAndDelete({
            _id: req.params.id,
            doctorId: req.user._id
        });

        if (!availability) {
            return res.status(404).json({
                success: false,
                message: 'Availability slot not found'
            });
        }

        res.json({
            success: true,
            message: 'Availability removed successfully'
        });
    } catch (error) {
        console.error('Delete availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete availability',
            error: error.message
        });
    }
});

// ========================================
// APPOINTMENT MANAGEMENT ROUTES
// ========================================

// @route   GET /api/doctor/appointments
// @desc    Get appointment requests
// @access  Doctor
router.get('/appointments', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = { doctorId: req.user._id };
        if (status) query.status = status;

        const appointments = await Appointment.find(query)
            .populate('patientId', 'profile.firstName profile.lastName email profile.phone profile.dateOfBirth')
            .sort({ date: -1, startTime: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Appointment.countDocuments(query);

        // Count by status
        const statusCounts = await Appointment.aggregate([
            { $match: { doctorId: req.user._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            appointments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get appointments',
            error: error.message
        });
    }
});

// @route   PUT /api/doctor/appointments/:id/approve
// @desc    Approve appointment with meeting link
// @access  Doctor
router.put('/appointments/:id/approve', async (req, res) => {
    try {
        const { meetingLink, notes } = req.body;

        if (!meetingLink) {
            return res.status(400).json({
                success: false,
                message: 'Meeting link is required for approval'
            });
        }

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            doctorId: req.user._id
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve appointment with status: ${appointment.status}`
            });
        }

        appointment.status = 'approved';
        appointment.meetingLink = meetingLink;
        appointment.doctorNotes = notes;
        appointment.approvedAt = new Date();

        await appointment.save();
        await appointment.populate('patientId', 'profile.firstName profile.lastName email');

        res.json({
            success: true,
            message: 'Appointment approved successfully',
            appointment
        });
    } catch (error) {
        console.error('Approve appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve appointment',
            error: error.message
        });
    }
});

// @route   PUT /api/doctor/appointments/:id/reject
// @desc    Reject appointment
// @access  Doctor
router.put('/appointments/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            doctorId: req.user._id
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject appointment with status: ${appointment.status}`
            });
        }

        appointment.status = 'rejected';
        appointment.rejectionReason = reason || 'No reason provided';

        await appointment.save();
        await appointment.populate('patientId', 'profile.firstName profile.lastName email');

        res.json({
            success: true,
            message: 'Appointment rejected',
            appointment
        });
    } catch (error) {
        console.error('Reject appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject appointment',
            error: error.message
        });
    }
});

// @route   PUT /api/doctor/appointments/:id/complete
// @desc    Mark appointment as completed
// @access  Doctor
router.put('/appointments/:id/complete', async (req, res) => {
    try {
        const { notes } = req.body;

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            doctorId: req.user._id
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (appointment.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only approved appointments can be marked as completed'
            });
        }

        appointment.status = 'completed';
        appointment.completedAt = new Date();
        if (notes) appointment.doctorNotes = notes;

        await appointment.save();

        res.json({
            success: true,
            message: 'Appointment marked as completed',
            appointment
        });
    } catch (error) {
        console.error('Complete appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete appointment',
            error: error.message
        });
    }
});

module.exports = router;
