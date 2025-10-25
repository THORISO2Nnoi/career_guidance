const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Student = require('../models/Student');
const Results = require('../models/Results');
const Recommendations = require('../models/Recommendations');
const OCRService = require('../services/ocrService');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const fileTypes = /jpeg|jpg|png|pdf/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed'));
        }
    },
    limits: { fileSize: 5000000 }
});

// Upload results and calculate APS with OCR
router.post('/upload-results', upload.single('resultsFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const { studentId, name, email, currentSkills } = req.body;

        console.log('Processing Grade 9 uploaded file:', req.file.filename);

        // Process the uploaded file with OCR
        const ocrResult = await OCRService.extractResults(req.file.path);
        
        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process results file: ' + ocrResult.error
            });
        }

        console.log('Grade 9 OCR Results:', {
            subjectsFound: ocrResult.subjects.length,
            confidence: ocrResult.confidence
        });

        // Calculate APS from extracted subjects
        const apsResult = calculateAPSBreakdown(ocrResult.subjects);
        
        // Generate skill recommendations
        const recommendedSkills = await generateSkillRecommendations(
            ocrResult.subjects, 
            ocrResult.overallAverage, 
            currentSkills ? currentSkills.split(',') : []
        );

        // Calculate performance analysis
        const performanceAnalysis = analyzeGrade9Performance(ocrResult.subjects, ocrResult.overallAverage);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 9 results processed successfully!',
            apsScore: apsResult.totalPoints,
            apsBreakdown: apsResult,
            performanceAnalysis,
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            recommendations: recommendedSkills,
            summary: generateGrade9Summary(ocrResult.subjects, ocrResult.overallAverage, apsResult.totalPoints, recommendedSkills)
        };

        // Save to database
        await saveToDatabase(studentId, name, email, '9', ocrResult, apsResult, recommendedSkills, currentSkills, req.file.path);

        res.json(response);

    } catch (error) {
        console.error('Error in grade9 upload:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Manual results submission
router.post('/manual-results', async (req, res) => {
    try {
        const { studentId, name, email, subjects, overallAverage, currentSkills } = req.body;

        console.log('Grade 9 manual results submission');

        // Validate subjects
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No subjects provided'
            });
        }

        // Calculate APS
        const apsScore = calculateAPS(subjects);
        const calculatedAverage = calculateAverage(subjects);
        const apsBreakdown = calculateAPSBreakdown(subjects);

        // Generate skill recommendations
        const recommendedSkills = await generateSkillRecommendations(
            subjects, 
            overallAverage || calculatedAverage, 
            currentSkills || []
        );

        // Calculate performance analysis
        const performanceAnalysis = analyzeGrade9Performance(subjects, overallAverage || calculatedAverage);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 9 manual results processed successfully!',
            apsScore,
            apsBreakdown,
            performanceAnalysis,
            subjects,
            overallAverage: overallAverage || calculatedAverage,
            recommendations: recommendedSkills,
            summary: generateGrade9Summary(subjects, overallAverage || calculatedAverage, apsScore, recommendedSkills)
        };

        // Save to database
        await saveToDatabase(studentId, name, email, '9', 
            { subjects, overallAverage: overallAverage || calculatedAverage }, 
            { totalPoints: apsScore, breakdown: apsBreakdown }, 
            recommendedSkills, 
            currentSkills, 
            'manual_upload'
        );

        res.json(response);

    } catch (error) {
        console.error('Error in grade9 manual results submission:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// APS calculation function
function calculateAPS(subjects) {
    let totalPoints = 0;
    subjects.forEach(subject => {
        const mark = subject.mark;
        if (mark >= 80) totalPoints += 7;
        else if (mark >= 70) totalPoints += 6;
        else if (mark >= 60) totalPoints += 5;
        else if (mark >= 50) totalPoints += 4;
        else if (mark >= 40) totalPoints += 3;
        else if (mark >= 30) totalPoints += 2;
        else totalPoints += 1;
    });
    return totalPoints;
}

// Calculate APS with detailed breakdown
function calculateAPSBreakdown(subjects) {
    let totalPoints = 0;
    const breakdown = [];

    subjects.forEach(subject => {
        const mark = subject.mark;
        let points = 0;
        let level = '';

        if (mark >= 80) {
            points = 7;
            level = 'Distinction';
        } else if (mark >= 70) {
            points = 6;
            level = 'Merit';
        } else if (mark >= 60) {
            points = 5;
            level = 'Achieved';
        } else if (mark >= 50) {
            points = 4;
            level = 'Satisfactory';
        } else if (mark >= 40) {
            points = 3;
            level = 'Elementary';
        } else if (mark >= 30) {
            points = 2;
            level = 'Not Achieved';
        } else {
            points = 1;
            level = 'Fail';
        }

        totalPoints += points;

        breakdown.push({
            subject: subject.name,
            mark: mark,
            level: level,
            points: points,
            symbol: getSymbol(level)
        });
    });

    return {
        totalPoints: totalPoints,
        averagePoints: subjects.length > 0 ? (totalPoints / subjects.length).toFixed(2) : 0,
        subjectCount: subjects.length,
        breakdown: breakdown
    };
}

function getSymbol(level) {
    const symbols = {
        'Distinction': '⭐',
        'Merit': '✅',
        'Achieved': '👍',
        'Satisfactory': '➖',
        'Elementary': '⚠️',
        'Not Achieved': '❌',
        'Fail': '💀'
    };
    return symbols[level] || '❓';
}

// Calculate average
function calculateAverage(subjects) {
    const total = subjects.reduce((sum, subject) => sum + subject.mark, 0);
    return subjects.length > 0 ? Math.round(total / subjects.length) : 0;
}

// Analyze student performance
function analyzeGrade9Performance(subjects, overallAverage) {
    const strongSubjects = subjects.filter(s => s.mark >= 70);
    const averageSubjects = subjects.filter(s => s.mark >= 50 && s.mark < 70);
    const weakSubjects = subjects.filter(s => s.mark < 50);

    return {
        strongSubjects: {
            list: strongSubjects,
            count: strongSubjects.length
        },
        averageSubjects: {
            list: averageSubjects,
            count: averageSubjects.length
        },
        weakSubjects: {
            list: weakSubjects,
            count: weakSubjects.length
        }
    };
}

// Generate skill recommendations
async function generateSkillRecommendations(subjects, average, currentSkills) {
    const allSkills = [
        { 
            name: "Digital Literacy", 
            description: "Basic computer skills and understanding of digital tools", 
            demandLevel: "High", 
            category: "Technical",
            priority: "Essential",
            resources: ["Basic computer courses", "Online tutorials", "School computer lab"]
        },
        { 
            name: "Problem Solving", 
            description: "Analytical thinking and creative solution development", 
            demandLevel: "High", 
            category: "Cognitive",
            priority: "Essential",
            resources: ["Math puzzles", "Logic games", "Science projects"]
        },
        { 
            name: "Communication Skills", 
            description: "Verbal and written communication in multiple languages", 
            demandLevel: "High", 
            category: "Social",
            priority: "Essential",
            resources: ["Debate club", "Writing exercises", "Reading books"]
        }
    ];

    // Filter out skills the student already has
    let filteredSkills = allSkills.filter(skill => 
        !currentSkills.includes(skill.name.toLowerCase())
    );

    return filteredSkills.slice(0, 3);
}

// Generate Grade 9 summary
function generateGrade9Summary(subjects, overallAverage, apsScore, recommendations) {
    const performanceLevel = getGrade9PerformanceLevel(overallAverage);
    const totalSubjects = subjects.length;
    const strongCount = subjects.filter(s => s.mark >= 70).length;
    const improvementCount = subjects.filter(s => s.mark < 50).length;

    return {
        apsScore,
        overallAverage,
        performanceLevel: performanceLevel.level,
        performanceEmoji: performanceLevel.emoji,
        totalSubjects,
        strongSubjects: strongCount,
        needsImprovement: improvementCount,
        keyMessage: `Your APS score is ${apsScore}. ${performanceLevel.message}`,
        nextSteps: [
            "Develop recommended skills",
            "Focus on core subjects",
            "Explore career options"
        ]
    };
}

function getGrade9PerformanceLevel(average) {
    if (average >= 80) return {
        level: 'Outstanding',
        emoji: '⭐',
        message: 'Exceptional performance!'
    };
    if (average >= 70) return {
        level: 'Excellent',
        emoji: '👍',
        message: 'Great work!'
    };
    if (average >= 60) return {
        level: 'Good',
        emoji: '✅',
        message: 'Good performance!'
    };
    if (average >= 50) return {
        level: 'Average',
        emoji: '➖',
        message: 'Average performance.'
    };
    return {
        level: 'Needs Improvement',
        emoji: '📚',
        message: 'Focus on improvement.'
    };
}

// Database saving function
async function saveToDatabase(studentId, name, email, grade, ocrResult, apsResult, recommendedSkills, currentSkills, filePath) {
    try {
        // Save or update student
        let student = await Student.findOne({ studentId });
        if (!student) {
            student = new Student({
                studentId,
                name,
                grade: grade,
                contact: { email }
            });
            await student.save();
        }

        // Save results
        const results = new Results({
            studentId,
            grade: grade,
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            apsScore: apsResult.totalPoints,
            fileUrl: filePath
        });
        await results.save();

        // Save recommendations
        const recommendations = new Recommendations({
            studentId,
            grade: grade,
            currentSkills: currentSkills ? (Array.isArray(currentSkills) ? currentSkills : currentSkills.split(',')) : [],
            recommendedSkills
        });
        await recommendations.save();

        console.log('✅ Grade 9 data saved successfully for student:', studentId);
    } catch (error) {
        console.error('❌ Error saving Grade 9 data to database:', error);
    }
}

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Grade 9 API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;