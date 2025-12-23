const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dayOfWeek: {
        type: Number,
        // required: true, // Removed required to allow specific dates
        min: 0,
        max: 6
    },
    date: {
        type: Date, // For specific dates
        default: null
    },
    startTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/  // HH:MM format
    },
    endTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    slotDuration: {
        type: Number,
        default: 30,  // minutes
        enum: [15, 30, 45, 60]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
doctorAvailabilitySchema.index({ doctorId: 1, dayOfWeek: 1 });

// Virtual to get day name
doctorAvailabilitySchema.virtual('dayName').get(function () {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[this.dayOfWeek];
});

// Method to generate time slots for a specific date
doctorAvailabilitySchema.methods.generateSlots = function (date) {
    const slots = [];
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;

    while (currentTime + this.slotDuration <= endTimeMinutes) {
        const slotStart = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`;
        currentTime += this.slotDuration;
        const slotEnd = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`;

        slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            date: date
        });
    }

    return slots;
};

// Static method to get all availability for a doctor
doctorAvailabilitySchema.statics.getDoctorAvailability = function (doctorId) {
    return this.find({ doctorId, isActive: true }).sort('dayOfWeek');
};

// Ensure serialization includes virtuals
doctorAvailabilitySchema.set('toJSON', { virtuals: true });
doctorAvailabilitySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
