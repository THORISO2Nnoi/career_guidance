const mongoose = require('mongoose');

const resultsSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    subjects: [{
        name: String,
        mark: Number,
        level: String
    }],
    overallAverage: Number,
    apsScore: Number,
    fileUrl: String,
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Results', resultsSchema);