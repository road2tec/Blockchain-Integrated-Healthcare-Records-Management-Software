require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const blockchainService = require('./services/blockchainService');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctor');
const patientRoutes = require('./routes/patient');
const publicRoutes = require('./routes/public');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (protected in real app)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/public', publicRoutes);  // Public routes (no JWT required)

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Healthcare Blockchain API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate field value'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Initialize blockchain connection
        const blockchainConnected = await blockchainService.initialize();
        if (blockchainConnected) {
            console.log('Blockchain service initialized');
        } else {
            console.log('Blockchain service not available (Ganache may not be running)');
        }

        // Create uploads directory if it doesn't exist
        const fs = require('fs');
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Seed admin if none exists
        await seedAdmin();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Seed first admin account
const seedAdmin = async () => {
    try {
        const User = require('./models/User');
        const adminExists = await User.findOne({ role: 'admin' });

        if (!adminExists && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
            const admin = new User({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'admin',
                status: 'active',
                profile: {
                    firstName: 'System',
                    lastName: 'Admin'
                }
            });

            await admin.save();
            console.log('Default admin account created');
        }
    } catch (error) {
        console.log('Admin seeding skipped:', error.message);
    }
};

startServer();

module.exports = app;
