const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    reason: {
        type: String,
        maxlength: 500
    },
    symptoms: {
        type: String,
        maxlength: 1000
    },
    meetingLink: {
        type: String,
        default: null
    },
    doctorNotes: {
        type: String,
        maxlength: 2000
    },
    rejectionReason: {
        type: String,
        maxlength: 500
    },
    approvedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Virtual for time slot display
appointmentSchema.virtual('timeSlot').get(function () {
    return `${this.startTime} - ${this.endTime}`;
});

// Static to check if slot is available
appointmentSchema.statics.isSlotAvailable = async function (doctorId, date, startTime) {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const existing = await this.findOne({
        doctorId,
        date: { $gte: dateStart, $lte: dateEnd },
        startTime,
        status: { $in: ['pending', 'approved'] }
    });

    return !existing;
};

// Static to get patient's appointments
appointmentSchema.statics.getPatientAppointments = function (patientId, status = null) {
    const query = { patientId };
    if (status) query.status = status;

    return this.find(query)
        .populate('doctorId', 'profile.firstName profile.lastName profile.specialization profile.hospital email')
        .sort({ date: -1, startTime: -1 });
};

// Static to get doctor's appointments
appointmentSchema.statics.getDoctorAppointments = function (doctorId, status = null) {
    const query = { doctorId };
    if (status) query.status = status;

    return this.find(query)
        .populate('patientId', 'profile.firstName profile.lastName profile.dateOfBirth email')
        .sort({ date: -1, startTime: -1 });
};

// Ensure serialization includes virtuals
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
