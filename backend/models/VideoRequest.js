const mongoose = require('mongoose');

const videoRequestSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['chemistry', 'physics', 'biology', 'math', 'history', 'geography', 'literature', 'art', 'general']
    },
    topic: {
        type: String,
        required: true
    },
    requestMessage: {
        type: String,
        required: true
    },
    learningObjectives: String,
    style: {
        type: String,
        default: 'educational'
    },
    videoUrl: {
        type: String
    },
    downloadUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'generating', 'processing_visuals', 'generating_audio', 'compiling_video', 'completed', 'failed'],
        default: 'pending'
    },
    videoMetadata: {
        duration: String,
        size: String,
        format: String,
        resolution: String,
        fileName: String,
        script: String,
        scenes: Number,
        generatedAt: Date
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    isRealVideo: {
        type: Boolean,
        default: false
    },
    error: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

// Index for faster queries
videoRequestSchema.index({ studentId: 1, createdAt: -1 });
videoRequestSchema.index({ status: 1 });

module.exports = mongoose.model('VideoRequest', videoRequestSchema);