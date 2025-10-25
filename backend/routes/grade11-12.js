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
    limits: { fileSize: 5000000 } // 5MB limit
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

        const { studentId, name, email, grade, interests = [] } = req.body;

        console.log('Processing Grade 11-12 uploaded file:', req.file.filename);

        // Process the uploaded file with OCR
        const ocrResult = await OCRService.extractResults(req.file.path);
        
        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process results file: ' + ocrResult.error
            });
        }

        // Calculate APS
        const apsResult = calculateAPSBreakdown(ocrResult.subjects);
        
        // Generate course recommendations
        const recommendedCourses = await generateCourseRecommendations(apsResult.totalPoints, ocrResult.subjects, interests);
        
        // Generate skill recommendations
        const recommendedSkills = await generateSkillRecommendations(apsResult.totalPoints, ocrResult.subjects);

        // Calculate performance analysis
        const performanceAnalysis = analyzeGrade11_12Performance(ocrResult.subjects, ocrResult.overallAverage);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 11-12 results processed successfully!',
            apsScore: apsResult.totalPoints,
            apsBreakdown: apsResult,
            performanceAnalysis,
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            courses: recommendedCourses,
            skills: recommendedSkills,
            summary: generateGrade11_12Summary(ocrResult.subjects, ocrResult.overallAverage, apsResult.totalPoints, recommendedCourses)
        };

        // Save to database
        await saveToDatabase(studentId, name, email, grade, ocrResult, apsResult, recommendedCourses, recommendedSkills, req.file.path);

        res.json(response);

    } catch (error) {
        console.error('Error in grade11-12 upload:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Manual results submission
router.post('/manual-results', async (req, res) => {
    try {
        const { studentId, name, email, grade, subjects, overallAverage, interests = [] } = req.body;

        console.log('Grade 11-12 manual results submission');

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

        // Generate course recommendations
        const recommendedCourses = await generateCourseRecommendations(apsScore, subjects, interests);
        
        // Generate skill recommendations
        const recommendedSkills = await generateSkillRecommendations(apsScore, subjects);

        // Calculate performance analysis
        const performanceAnalysis = analyzeGrade11_12Performance(subjects, overallAverage || calculatedAverage);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 11-12 manual results processed successfully!',
            apsScore,
            apsBreakdown,
            performanceAnalysis,
            subjects,
            overallAverage: overallAverage || calculatedAverage,
            courses: recommendedCourses,
            skills: recommendedSkills,
            summary: generateGrade11_12Summary(subjects, overallAverage || calculatedAverage, apsScore, recommendedCourses)
        };

        // Save to database
        await saveToDatabase(studentId, name, email, grade, 
            { subjects, overallAverage: overallAverage || calculatedAverage }, 
            { totalPoints: apsScore, breakdown: apsBreakdown }, 
            recommendedCourses, 
            recommendedSkills, 
            'manual_upload'
        );

        res.json(response);

    } catch (error) {
        console.error('Error in grade11-12 manual results submission:', error);
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

// Analyze Grade 11-12 performance
function analyzeGrade11_12Performance(subjects, overallAverage) {
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
        },
        universityProspects: getUniversityProspects(overallAverage)
    };
}

function getUniversityProspects(average) {
    if (average >= 80) return 'Excellent - All universities accessible';
    if (average >= 70) return 'Very Good - Most universities accessible';
    if (average >= 60) return 'Good - Universities of Technology accessible';
    if (average >= 50) return 'Fair - TVET colleges and some diplomas';
    return 'Needs Improvement - Focus on skills development';
}

// Generate course recommendations
async function generateCourseRecommendations(apsScore, subjects, interests = []) {
    let courses = [];

    // Based on APS score and interests
    if (apsScore >= 35) {
        courses = [
            {
                name: "Medicine & Surgery",
                category: "Health Sciences",
                description: "Become a medical doctor with specialization options in various fields.",
                institutions: ["University of Cape Town", "Wits University", "Stellenbosch University"],
                requirements: "Maths & Physical Science (80%+), Life Sciences (75%+)",
                jobProspects: "Excellent",
                duration: "6 years"
            },
            {
                name: "Computer Science & Engineering",
                category: "Engineering & IT",
                description: "Combine software development with hardware engineering principles.",
                institutions: ["University of Pretoria", "UCT", "Wits"],
                requirements: "Maths & Physical Science (75%+)",
                jobProspects: "Excellent",
                duration: "4 years"
            }
        ];
    } else if (apsScore >= 28) {
        courses = [
            {
                name: "BCom Accounting",
                category: "Commerce",
                description: "Professional accounting qualification with CA(SA) potential.",
                institutions: ["University of Johannesburg", "Nelson Mandela University", "Rhodes University"],
                requirements: "Maths (60%+)",
                jobProspects: "Very Good",
                duration: "3-4 years"
            },
            {
                name: "BSc Information Technology",
                category: "IT",
                description: "Software development, networking, and IT management.",
                institutions: ["TUT", "DUT", "Varsity College"],
                requirements: "Maths (60%+)",
                jobProspects: "Very Good",
                duration: "3 years"
            }
        ];
    } else if (apsScore >= 24) {
        courses = [
            {
                name: "Diploma in Marketing",
                category: "Business",
                description: "Digital marketing, brand management, and sales.",
                institutions: ["Vega School", "Boston City Campus", "Damelin"],
                requirements: "English (50%+)",
                jobProspects: "Good",
                duration: "3 years"
            },
            {
                name: "Diploma in Tourism",
                category: "Tourism",
                description: "Tour operations, hospitality, and travel management.",
                institutions: ["CATHSSETA", "Tourism College", "Various FET Colleges"],
                requirements: "English (50%+)",
                jobProspects: "Good",
                duration: "3 years"
            }
        ];
    } else {
        courses = [
            {
                name: "Vocational Skills Program",
                category: "Skills Development",
                description: "Hands-on training in trades like plumbing, electrical, or automotive.",
                institutions: ["TVET Colleges", "SETAs", "Private Colleges"],
                requirements: "NSC Pass",
                jobProspects: "Stable",
                duration: "1-2 years"
            },
            {
                name: "Entrepreneurship Program",
                category: "Business",
                description: "Start your own business with government support programs.",
                institutions: ["SEDA", "NYDA", "Business Incubators"],
                requirements: "NSC Pass",
                jobProspects: "Variable",
                duration: "6-12 months"
            }
        ];
    }

    // Filter by interests if provided
    if (interests.length > 0) {
        courses = courses.filter(course => 
            interests.some(interest => 
                course.category.toLowerCase().includes(interest.toLowerCase()) ||
                course.name.toLowerCase().includes(interest.toLowerCase())
            )
        );
    }

    return courses;
}

// Generate skill recommendations
async function generateSkillRecommendations(apsScore, subjects) {
    let skills = [];

    if (apsScore >= 30) {
        skills = [
            {
                name: "Critical Thinking",
                description: "Analytical problem-solving and decision-making abilities.",
                category: "Cognitive",
                demandLevel: "Very High"
            },
            {
                name: "Data Analysis",
                description: "Interpreting data and making evidence-based decisions.",
                category: "Technical",
                demandLevel: "High"
            },
            {
                name: "Project Management",
                description: "Organizing tasks and managing timelines effectively.",
                category: "Management",
                demandLevel: "High"
            }
        ];
    } else if (apsScore >= 25) {
        skills = [
            {
                name: "Communication Skills",
                description: "Verbal and written communication for professional environments.",
                category: "Soft Skills",
                demandLevel: "High"
            },
            {
                name: "Digital Literacy",
                description: "Essential computer skills including MS Office and basic software.",
                category: "Technical",
                demandLevel: "High"
            },
            {
                name: "Customer Service",
                description: "Professional client interaction and relationship building.",
                category: "Soft Skills",
                demandLevel: "Medium"
            }
        ];
    } else {
        skills = [
            {
                name: "Time Management",
                description: "Prioritizing tasks and meeting deadlines consistently.",
                category: "Soft Skills",
                demandLevel: "Medium"
            },
            {
                name: "Basic Financial Literacy",
                description: "Budgeting, saving, and understanding personal finance.",
                category: "Life Skills",
                demandLevel: "Medium"
            },
            {
                name: "Teamwork",
                description: "Collaborating effectively with others in group settings.",
                category: "Soft Skills",
                demandLevel: "Medium"
            }
        ];
    }

    return skills;
}

// Generate Grade 11-12 summary
function generateGrade11_12Summary(subjects, overallAverage, apsScore, courses) {
    const performanceLevel = getGrade11_12PerformanceLevel(overallAverage);
    const totalSubjects = subjects.length;
    const strongCount = subjects.filter(s => s.mark >= 70).length;

    return {
        apsScore,
        overallAverage,
        performanceLevel: performanceLevel.level,
        performanceEmoji: performanceLevel.emoji,
        totalSubjects,
        strongSubjects: strongCount,
        availableCourses: courses.length,
        keyMessage: `Your APS score is ${apsScore}. ${performanceLevel.message}`,
        nextSteps: [
            "Research recommended courses",
            "Check university application deadlines",
            "Prepare required documents",
            "Consider backup options"
        ]
    };
}

function getGrade11_12PerformanceLevel(average) {
    if (average >= 80) return {
        level: 'Outstanding',
        emoji: '⭐',
        message: 'Exceptional performance! Excellent university prospects.'
    };
    if (average >= 70) return {
        level: 'Excellent',
        emoji: '👍',
        message: 'Great work! Very good university options available.'
    };
    if (average >= 60) return {
        level: 'Good',
        emoji: '✅',
        message: 'Good performance! Solid diploma and degree options.'
    };
    if (average >= 50) return {
        level: 'Satisfactory',
        emoji: '➖',
        message: 'Satisfactory performance. Consider various pathways.'
    };
    return {
        level: 'Needs Improvement',
        emoji: '📚',
        message: 'Focus on improvement and skills development.'
    };
}

// Database saving function
async function saveToDatabase(studentId, name, email, grade, ocrResult, apsResult, recommendedCourses, recommendedSkills, filePath) {
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
            recommendedCourses,
            recommendedSkills
        });
        await recommendations.save();

        console.log('✅ Grade 11-12 data saved successfully for student:', studentId);
    } catch (error) {
        console.error('❌ Error saving Grade 11-12 data to database:', error);
    }
}

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Grade 11-12 API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;