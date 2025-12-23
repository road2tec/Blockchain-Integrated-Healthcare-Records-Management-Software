const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Consent = require('../models/Consent');
const MedicalRecord = require('../models/MedicalRecord');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const blockchainService = require('../services/blockchainService');

// Apply admin role check to all routes
router.use(protect, isAdmin);

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/stats', async (req, res) => {
    try {
        const [
            totalDoctors,
            pendingDoctors,
            totalPatients,
            activePatients,
            suspendedPatients,
            totalRecords,
            totalConsents
        ] = await Promise.all([
            User.countDocuments({ role: 'doctor' }),
            User.countDocuments({ role: 'doctor', status: 'pending' }),
            User.countDocuments({ role: 'patient' }),
            User.countDocuments({ role: 'patient', status: 'active' }),
            User.countDocuments({ role: 'patient', status: 'suspended' }),
            MedicalRecord.countDocuments(),
            Consent.countDocuments({ status: 'granted' })
        ]);

        res.json({
            success: true,
            stats: {
                doctors: {
                    total: totalDoctors,
                    pending: pendingDoctors,
                    active: totalDoctors - pendingDoctors
                },
                patients: {
                    total: totalPatients,
                    active: activePatients,
                    suspended: suspendedPatients
                },
                records: {
                    total: totalRecords
                },
                consents: {
                    active: totalConsents
                }
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics',
            error: error.message
        });
    }
});

// @route   GET /api/admin/doctors
// @desc    Get all doctors
// @access  Admin
router.get('/doctors', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        let query = { role: 'doctor' };
        if (status) {
            query.status = status;
        }

        const doctors = await User.find(query)
            .select('-password -refreshTokens')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            doctors: doctors.map(d => d.getPublicProfile()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get doctors',
            error: error.message
        });
    }
});

// @route   PUT /api/admin/doctors/:id/approve
// @desc    Approve a doctor registration
// @access  Admin
router.put('/doctors/:id/approve', async (req, res) => {
    try {
        const doctor = await User.findOne({
            _id: req.params.id,
            role: 'doctor',
            status: 'pending'
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found or already approved'
            });
        }

        doctor.status = 'active';
        await doctor.save();

        // Log action on blockchain if possible
        try {
            if (process.env.ADMIN_PRIVATE_KEY) {
                await blockchainService.logAccess(
                    req.user.ethereumAddress || '0x0',
                    doctor.ethereumAddress || '0x0',
                    'DOCTOR_APPROVED',
                    doctor._id.toString(),
                    process.env.ADMIN_PRIVATE_KEY
                );
            }
        } catch (bcError) {
            console.log('Blockchain logging skipped:', bcError.message);
        }

        res.json({
            success: true,
            message: 'Doctor approved successfully',
            doctor: doctor.getPublicProfile()
        });
    } catch (error) {
        console.error('Approve doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve doctor',
            error: error.message
        });
    }
});

// @route   PUT /api/admin/doctors/:id/reject
// @desc    Reject a doctor registration
// @access  Admin
router.put('/doctors/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;

        const doctor = await User.findOne({
            _id: req.params.id,
            role: 'doctor',
            status: 'pending'
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found or not in pending status'
            });
        }

        // Option: Delete or mark as rejected
        doctor.status = 'suspended';
        await doctor.save();

        res.json({
            success: true,
            message: 'Doctor registration rejected',
            reason
        });
    } catch (error) {
        console.error('Reject doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject doctor',
            error: error.message
        });
    }
});

// @route   GET /api/admin/patients
// @desc    Get all patients
// @access  Admin
router.get('/patients', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        let query = { role: 'patient' };
        if (status) {
            query.status = status;
        }

        const patients = await User.find(query)
            .select('-password -refreshTokens')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            patients: patients.map(p => p.getPublicProfile()),
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

// @route   PUT /api/admin/patients/:id/status
// @desc    Update patient account status
// @access  Admin
router.put('/patients/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active or suspended'
            });
        }

        const patient = await User.findOne({
            _id: req.params.id,
            role: 'patient'
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        patient.status = status;
        await patient.save();

        // Log status change on blockchain
        try {
            if (process.env.ADMIN_PRIVATE_KEY) {
                await blockchainService.logAccess(
                    req.user.ethereumAddress || '0x0',
                    patient.ethereumAddress || '0x0',
                    `PATIENT_STATUS_${status.toUpperCase()}`,
                    patient._id.toString(),
                    process.env.ADMIN_PRIVATE_KEY
                );
            }
        } catch (bcError) {
            console.log('Blockchain logging skipped:', bcError.message);
        }

        res.json({
            success: true,
            message: `Patient account ${status}`,
            patient: patient.getPublicProfile()
        });
    } catch (error) {
        console.error('Update patient status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update patient status',
            error: error.message
        });
    }
});

// @route   GET /api/admin/audit-logs
// @desc    Get blockchain audit logs
// @access  Admin
router.get('/audit-logs', async (req, res) => {
    try {
        const { userAddress, limit = 50 } = req.query;

        let logs = [];

        if (userAddress) {
            logs = await blockchainService.getAuditLogs(userAddress, parseInt(limit));
        } else {
            // TODO: Get all logs from blockchain
            // This would require iterating through events
            logs = [];
        }

        res.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get audit logs',
            error: error.message
        });
    }
});

// @route   GET /api/admin/users/:id
// @desc    Get user details
// @access  Admin
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -refreshTokens');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get additional stats
        let stats = {};

        if (user.role === 'patient') {
            stats.recordCount = await MedicalRecord.countDocuments({ patientId: user._id });
            stats.activeConsents = await Consent.countDocuments({ patientId: user._id, status: 'granted' });
        } else if (user.role === 'doctor') {
            stats.patientCount = await Consent.countDocuments({ doctorId: user._id, status: 'granted' });
            stats.recordCount = await MedicalRecord.countDocuments({ doctorId: user._id });
        }

        res.json({
            success: true,
            user: user.getPublicProfile(),
            stats
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user',
            error: error.message
        });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user account
// @access  Admin
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent self-deletion
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

module.exports = router;
