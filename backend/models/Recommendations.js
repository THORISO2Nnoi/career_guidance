const mongoose = require('mongoose');

const recommendationsSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    currentSkills: [String],
    recommendedSkills: [{
        name: String,
        description: String,
        demandLevel: String,
        category: String
    }],
    recommendedStreams: [{
        name: String,
        description: String,
        schools: [String],
        suitability: String
    }],
    recommendedCourses: [{
        name: String,
        description: String,
        institutions: [String],
        requirements: String,
        jobProspects: String
    }],
    generatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Recommendations', recommendationsSchema);