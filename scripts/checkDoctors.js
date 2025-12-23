const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const User = require('../backend/models/User');

const checkDoctors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const doctors = await User.find({ role: 'doctor' });
        console.log(`Found ${doctors.length} doctors:`);
        doctors.forEach(d => {
            console.log(`- ${d.profile.firstName} ${d.profile.lastName} (${d.email}) : Status = ${d.status}`);
        });

        if (doctors.length > 0 && doctors.every(d => d.status !== 'active')) {
            console.log('\nNOTE: Doctors exist but are not active. This is why they do not appear.');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDoctors();
