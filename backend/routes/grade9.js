const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const Results = require('../models/Results');
const Recommendations = require('../models/Recommendations');
const OCRService = require('../services/ocrService');
const marketService = require('../services/marketService');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
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
            error: error.message || 'An error occurred while processing your results',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    // currentSkills may come as array or comma-separated
    let owned = [];
    if (Array.isArray(currentSkills)) owned = currentSkills.map(s => s.toLowerCase());
    else if (typeof currentSkills === 'string') owned = currentSkills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    // Map student's strengths to skill categories (simple heuristic)
    const subjectSkillMap = {
        math: ['Problem Solving', 'Spreadsheets', 'Data Literacy'],
        english: ['Communication Skills', 'English Proficiency'],
        science: ['Problem Solving', 'Critical Thinking'],
        computer: ['Digital Literacy', 'Python Programming'],
        technology: ['Digital Literacy', 'Design Thinking'],
        accounting: ['Spreadsheets', 'Data Literacy']
    };

    // Collect candidate skills based on strong subjects
    const strongSubjects = subjects.filter(s => s.mark >= 70).map(s => s.name.toLowerCase());
    let candidates = [];
    strongSubjects.forEach(sub => {
        Object.keys(subjectSkillMap).forEach(key => {
            if (sub.includes(key)) {
                candidates = candidates.concat(subjectSkillMap[key]);
            }
        });
    });

    // If no candidates found, fall back to top market skills
    if (candidates.length === 0) {
        const top = marketService.getTopSkills(owned, 5).map(s => s.name);
        candidates = candidates.concat(top);
    }

    // Deduplicate and exclude already owned
    candidates = Array.from(new Set(candidates)).filter(c => !owned.includes(c.toLowerCase()));

    // Score candidates by combining market demand and simple subject-relevance boost
    const scored = candidates.map(name => {
        const demand = marketService.getDemandScore(name);
        // boost if candidate matches student's strong subjects (small boost)
        const relevanceBoost = strongSubjects.some(sub => name.toLowerCase().includes(sub)) ? 5 : 0;
        return { name, score: demand + relevanceBoost, demandLevel: demand };
    });

    // Sort by score and return top 5 with helpful metadata
    scored.sort((a, b) => b.score - a.score);

    const marketAll = marketService.getAll();

    const recommended = scored.slice(0, 5).map(s => {
        const meta = marketAll.find(m => m.name.toLowerCase() === s.name.toLowerCase()) || { description: '', category: 'General' };
        return {
            name: s.name,
            description: meta.description || 'Skill to develop',
            demandLevel: s.demandLevel >= 85 ? 'High' : s.demandLevel >= 70 ? 'Medium' : 'Low',
            category: meta.category || 'General',
            suggestedResources: meta.resources || []
        };
    });

    return recommended;
}

// Endpoint to add skills for a student (append or set)
router.post('/students/:studentId/skills', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { skills, replace } = req.body; // skills: array or comma-separated string

        if (!skills) return res.status(400).json({ success: false, error: 'No skills provided' });

        const newSkills = Array.isArray(skills) ? skills : String(skills).split(',').map(s => s.trim()).filter(Boolean);

        const student = await Student.findOne({ studentId });
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        if (replace) {
            student.skills = newSkills;
        } else {
            const existing = student.skills || [];
            const merged = Array.from(new Set(existing.concat(newSkills)));
            student.skills = merged;
        }

        await student.save();

        // Recompute recommendations
        const latestResults = await Results.findOne({ studentId }).sort({ uploadedAt: -1 });
        const subjects = latestResults ? latestResults.subjects : [];
        const overallAverage = latestResults ? latestResults.overallAverage : 0;
        const recommendations = await generateSkillRecommendations(subjects, overallAverage, student.skills);

        // Save recommendations
        await Recommendations.findOneAndUpdate(
            { studentId },
            { $set: { currentSkills: student.skills, recommendedSkills: recommendations, grade: student.grade } },
            { upsert: true }
        );

        res.json({ success: true, skills: student.skills, recommendations });

    } catch (error) {
        console.error('Error adding skills:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint to get recommendations for a student
router.get('/students/:studentId/recommendations', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findOne({ studentId });
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        const latestResults = await Results.findOne({ studentId }).sort({ uploadedAt: -1 });
        const subjects = latestResults ? latestResults.subjects : [];
        const overallAverage = latestResults ? latestResults.overallAverage : 0;

        const recommendations = await generateSkillRecommendations(subjects, overallAverage, student.skills);

        // Update stored recommendations as well
        await Recommendations.findOneAndUpdate(
            { studentId },
            { $set: { currentSkills: student.skills, recommendedSkills: recommendations, grade: student.grade } },
            { upsert: true }
        );

        res.json({ success: true, studentId, currentSkills: student.skills, recommendations });

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

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