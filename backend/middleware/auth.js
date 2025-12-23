const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

// Middleware to protect routes - requires valid JWT
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. No token provided.'
            });
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Invalid or expired token.'
            });
        }

        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. User not found.'
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `Account is ${user.status}. Please contact administrator.`
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional auth - attaches user if token present, but doesn't require it
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            const decoded = verifyAccessToken(token);
            if (decoded) {
                const user = await User.findById(decoded.userId).select('-password');
                if (user && user.status === 'active') {
                    req.user = user;
                }
            }
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = { protect, optionalAuth };
