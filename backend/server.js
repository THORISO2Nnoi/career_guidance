const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration for Render
app.use(cors({
    origin: [
        'https://career-guidance1.onrender.com',
        'http://localhost:3000', // For local development
        'http://localhost:5000'  // For local development
    ],
    credentials: true
}));

app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://THORISO:THORISO2@cluster0.5dcf7ib.mongodb.net/career_guidance?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import and use routes
const grade9Routes = require('./routes/grade9');
const grade10Routes = require('./routes/grade10');
const grade11_12Routes = require('./routes/grade11-12');
const learningRoutes = require('./routes/learning');

app.use('/api/grade9', grade9Routes);
app.use('/api/grade10', grade10Routes);
app.use('/api/grade11-12', grade11_12Routes);
app.use('/api/learning', learningRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Access your app at: https://career-guidance1.onrender.com`);
    console.log(`📊 MongoDB Connected: ${MONGODB_URI.includes('@cluster0') ? 'Yes' : 'No'}`);
});