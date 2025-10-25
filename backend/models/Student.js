const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true,
        enum: ['9', '10', '11', '12']
    },
    school: String,
    contact: {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        phone: String
    },
    // Skills the student has listed or added
    skills: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

studentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Student', studentSchema);