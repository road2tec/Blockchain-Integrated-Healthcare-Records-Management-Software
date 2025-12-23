// Role-based access control middleware

// Check if user has required role
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

// Specific role checks
const isAdmin = requireRole('admin');
const isDoctor = requireRole('doctor');
const isPatient = requireRole('patient');
const isDoctorOrAdmin = requireRole('doctor', 'admin');
const isPatientOrDoctor = requireRole('patient', 'doctor');

// Check if user is accessing their own resource
const isOwner = (paramName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login.'
            });
        }

        const resourceId = req.params[paramName];

        if (req.user._id.toString() !== resourceId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own resources.'
            });
        }

        next();
    };
};

// Check if doctor has consent from patient
const hasConsent = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized. Please login.'
        });
    }

    // Admins bypass consent check
    if (req.user.role === 'admin') {
        return next();
    }

    // Patients can always access their own data
    if (req.user.role === 'patient') {
        return next();
    }

    // Doctors need consent
    if (req.user.role === 'doctor') {
        const Consent = require('../models/Consent');
        const patientId = req.params.patientId || req.body.patientId;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const consent = await Consent.findOne({
            patientId,
            doctorId: req.user._id,
            status: 'granted'
        });

        if (!consent) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. No valid consent from patient.'
            });
        }

        // Check if consent has expired
        if (consent.scope.endDate && new Date(consent.scope.endDate) < new Date()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Consent has expired.'
            });
        }

        req.consent = consent;
    }

    next();
};

module.exports = {
    requireRole,
    isAdmin,
    isDoctor,
    isPatient,
    isDoctorOrAdmin,
    isPatientOrDoctor,
    isOwner,
    hasConsent
};
