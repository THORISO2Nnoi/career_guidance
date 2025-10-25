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

        const { studentId, name, email, grade } = req.body;

        console.log('Processing Grade 11-12 uploaded file:', req.file.filename);

        // Process the uploaded file with OCR
        const ocrResult = await OCRService.extractResults(req.file.path);
        
        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process results file: ' + ocrResult.error
            });
        }

        console.log('Grade 11-12 OCR Results:', {
            subjectsFound: ocrResult.subjects.length,
            confidence: ocrResult.confidence
        });

        // Calculate APS from extracted subjects
        const apsResult = calculateAPSBreakdown(ocrResult.subjects);
        
        // Generate recommendations based on APS and subjects
        const { courses, skills } = await generateRecommendations(apsResult.totalPoints, ocrResult.subjects);

        // Prepare the response with detailed APS breakdown
        const response = {
            success: true,
            message: 'Grade 11-12 results processed successfully!',
            apsScore: apsResult.totalPoints,
            apsBreakdown: apsResult,
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            courses,
            skills,
            summary: generateSummary(apsResult.totalPoints, ocrResult.subjects, ocrResult.overallAverage)
        };

        // Save to database
        await saveToDatabase(studentId, name, email, grade, ocrResult, apsResult, courses, skills, req.file.path);

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
        const { studentId, name, email, grade, subjects } = req.body;

        console.log('Grade 11-12 manual results submission:', { 
            studentId, name, grade, 
            subjectsCount: subjects.length 
        });

        // Validate subjects
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No subjects provided'
            });
        }

        // Calculate APS
        const apsScore = calculateAPS(subjects);
        const overallAverage = calculateAverage(subjects);
        const apsBreakdown = calculateAPSBreakdown(subjects);

        // Generate recommendations
        const { courses, skills } = await generateRecommendations(apsScore, subjects);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 11-12 manual results processed successfully!',
            apsScore,
            apsBreakdown,
            subjects,
            overallAverage,
            courses,
            skills,
            summary: generateSummary(apsScore, subjects, overallAverage)
        };

        // Save to database
        await saveToDatabase(studentId, name, email, grade, 
            { subjects, overallAverage }, 
            { totalPoints: apsScore, breakdown: apsBreakdown }, 
            courses, skills, 'manual_upload'
        );

        res.json(response);

    } catch (error) {
        console.error('Error in grade11-12 manual results submission:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Quick APS calculation endpoint
router.post('/calculate-aps', async (req, res) => {
    try {
        const { subjects } = req.body;

        if (!subjects || !Array.isArray(subjects)) {
            return res.status(400).json({
                success: false,
                error: 'Subjects array is required'
            });
        }

        const apsScore = calculateAPS(subjects);
        const overallAverage = calculateAverage(subjects);
        const apsBreakdown = calculateAPSBreakdown(subjects);
        const { courses, skills } = await generateRecommendations(apsScore, subjects);

        res.json({
            success: true,
            message: 'APS calculated successfully!',
            apsScore,
            overallAverage,
            apsBreakdown,
            subjects,
            courses,
            skills,
            summary: generateSummary(apsScore, subjects, overallAverage)
        });

    } catch (error) {
        console.error('Error calculating APS:', error);
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
    let distinctionCount = 0;
    let meritCount = 0;
    let achievedCount = 0;

    subjects.forEach(subject => {
        const mark = subject.mark;
        let points = 0;
        let level = '';

        if (mark >= 80) {
            points = 7;
            level = 'Distinction';
            distinctionCount++;
        } else if (mark >= 70) {
            points = 6;
            level = 'Merit';
            meritCount++;
        } else if (mark >= 60) {
            points = 5;
            level = 'Achieved';
            achievedCount++;
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
        distinctionCount,
        meritCount,
        achievedCount,
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

// Generate summary
function generateSummary(apsScore, subjects, overallAverage) {
    const performance = getPerformanceLevel(apsScore, subjects.length);
    
    let universityProspects = '';
    if (apsScore >= 35) {
        universityProspects = 'Excellent - You qualify for most competitive university programs including Medicine, Engineering, and Computer Science.';
    } else if (apsScore >= 28) {
        universityProspects = 'Very Good - You qualify for many university programs including Commerce, Health Sciences, and Education.';
    } else if (apsScore >= 20) {
        universityProspects = 'Good - You qualify for diploma programs and some university courses. Consider TVET colleges and bridging programs.';
    } else {
        universityProspects = 'Fair - Focus on skills development programs, vocational training, or consider rewriting subjects to improve your marks.';
    }

    return {
        apsScore,
        overallAverage,
        performanceLevel: performance.level,
        universityProspects,
        totalSubjects: subjects.length,
        recommendation: getRecommendation(apsScore)
    };
}

function getPerformanceLevel(apsScore, subjectCount) {
    const averageAPS = apsScore / subjectCount;
    
    if (averageAPS >= 6) {
        return {
            level: 'Outstanding',
            message: 'Exceptional academic performance! You have excellent prospects for competitive programs.'
        };
    } else if (averageAPS >= 5) {
        return {
            level: 'Excellent',
            message: 'Strong academic performance with good university prospects.'
        };
    } else if (averageAPS >= 4) {
        return {
            level: 'Good',
            message: 'Solid performance with various tertiary education options available.'
        };
    } else if (averageAPS >= 3) {
        return {
            level: 'Average',
            message: 'Adequate performance. Consider diploma programs and skills development.'
        };
    } else {
        return {
            level: 'Needs Improvement',
            message: 'Focus on skills development and consider rewriting key subjects.'
        };
    }
}

function getRecommendation(apsScore) {
    if (apsScore >= 35) return 'You have excellent prospects for competitive university programs. Focus on maintaining your high standards.';
    if (apsScore >= 28) return 'You have good university prospects. Consider applying to multiple institutions and have backup options.';
    if (apsScore >= 20) return 'You qualify for diploma programs and some degrees. Consider TVET colleges and skills development programs.';
    return 'Focus on skills development and vocational training. Consider rewriting key subjects to improve your options.';
}

// Generate course and skill recommendations
async function generateRecommendations(apsScore, subjects) {
    let courses = [];
    let skills = [];

    // Course recommendations based on APS score
    if (apsScore >= 35) {
        courses = [
            {
                name: "Medicine & Surgery",
                description: "Bachelor of Medicine and Bachelor of Surgery (MBChB)",
                institutions: ["Wits University", "University of Pretoria", "Stellenbosch University", "University of Cape Town"],
                requirements: "APS 40+, Physical Science & Life Science > 80%, Mathematics > 70%",
                jobProspects: "Excellent - Critical shortage of doctors in South Africa",
                duration: "6 years",
                salaryRange: "R600,000 - R1,200,000+",
                category: "Highly Competitive"
            },
            {
                name: "Engineering (Various disciplines)",
                description: "BSc in Civil, Electrical, Mechanical, or Chemical Engineering",
                institutions: ["University of Johannesburg", "TUT", "UCT", "Wits", "NWU"],
                requirements: "APS 35+, Mathematics & Physical Science > 70%",
                jobProspects: "Very Good - High demand for infrastructure development",
                duration: "4 years",
                salaryRange: "R400,000 - R800,000",
                category: "Highly Competitive"
            },
            {
                name: "Computer Science & IT",
                description: "BSc in Computer Science or Information Technology",
                institutions: ["University of Pretoria", "Stellenbosch", "UJ", "UNISA"],
                requirements: "APS 32+, Mathematics > 60%",
                jobProspects: "Excellent - Rapid growth in tech sector",
                duration: "3-4 years",
                salaryRange: "R350,000 - R700,000",
                category: "High Demand"
            }
        ];
    } else if (apsScore >= 28) {
        courses = [
            {
                name: "Commerce & Business",
                description: "BCom in Accounting, Finance, Economics or Business Management",
                institutions: ["UNISA", "University of Pretoria", "NWU", "UJ"],
                requirements: "APS 28+, Mathematics > 50%",
                jobProspects: "Good - Stable demand for business professionals",
                duration: "3 years",
                salaryRange: "R250,000 - R500,000",
                category: "Stable Career"
            },
            {
                name: "Health Sciences",
                description: "BSc in Nursing, Pharmacy, Physiotherapy or Medical Technology",
                institutions: ["University of Pretoria", "Wits", "Stellenbosch", "UJ"],
                requirements: "APS 30+, Life Science & Physical Science > 60%",
                jobProspects: "Very Good - Growing healthcare sector",
                duration: "4 years",
                salaryRange: "R300,000 - R600,000",
                category: "High Demand"
            },
            {
                name: "Education",
                description: "Bachelor of Education (BEd) in various specializations",
                institutions: ["UNISA", "University of Pretoria", "UJ", "NWU"],
                requirements: "APS 26+, Good academic record",
                jobProspects: "Good - Teacher shortages in key subjects",
                duration: "4 years",
                salaryRange: "R200,000 - R400,000",
                category: "Public Service"
            }
        ];
    } else if (apsScore >= 20) {
        courses = [
            {
                name: "Diploma in IT",
                description: "National Diploma in Information Technology",
                institutions: ["TUT", "VUT", "CUT", "DUT"],
                requirements: "APS 20+, Mathematics > 40%",
                jobProspects: "Good - Entry-level IT positions",
                duration: "3 years",
                salaryRange: "R180,000 - R350,000",
                category: "Technical"
            },
            {
                name: "Tourism Management",
                description: "Diploma in Tourism Management",
                institutions: ["TUT", "CUT", "Various TVET Colleges"],
                requirements: "APS 18+",
                jobProspects: "Fair - Growing tourism industry",
                duration: "3 years",
                salaryRange: "R150,000 - R300,000",
                category: "Hospitality"
            },
            {
                name: "Marketing & PR",
                description: "Diploma in Marketing or Public Relations",
                institutions: ["VUT", "TUT", "DUT"],
                requirements: "APS 20+",
                jobProspects: "Fair - Competitive but growing field",
                duration: "3 years",
                salaryRange: "R180,000 - R350,000",
                category: "Business"
            }
        ];
    } else {
        courses = [
            {
                name: "Skills Development Programs",
                description: "Various short courses and certificates in high-demand fields",
                institutions: ["TVET Colleges", "Private Colleges", "Online Platforms"],
                requirements: "Grade 12 Certificate",
                jobProspects: "Entry-level positions with growth potential",
                duration: "6 months - 1 year",
                salaryRange: "R120,000 - R250,000",
                category: "Entry Level"
            },
            {
                name: "Entrepreneurship Training",
                description: "Small business management and entrepreneurship courses",
                institutions: ["SEDA", "NYDA", "TVET Colleges"],
                requirements: "Grade 12 Certificate",
                jobProspects: "Self-employment opportunities",
                duration: "6-12 months",
                salaryRange: "Varies based on business success",
                category: "Entrepreneurship"
            },
            {
                name: "Vocational Training",
                description: "Trade-specific training programs (electrician, plumber, etc.)",
                institutions: ["TVET Colleges", "Trade Schools"],
                requirements: "Grade 12 Certificate",
                jobProspects: "Good - Skilled trades in high demand",
                duration: "1-2 years",
                salaryRange: "R200,000 - R400,000",
                category: "Technical Trades"
            }
        ];
    }

    // Skill recommendations
    const strongInMath = subjects.some(s => s.name.toLowerCase().includes('math') && s.mark >= 60);
    const strongInScience = subjects.some(s => (s.name.toLowerCase().includes('science') || s.name.toLowerCase().includes('physics') || s.name.toLowerCase().includes('biology')) && s.mark >= 60);
    const strongInLanguages = subjects.some(s => (s.name.toLowerCase().includes('english') || s.name.toLowerCase().includes('afrikaans')) && s.mark >= 70);

    skills = [
        {
            name: "Digital Literacy",
            description: "Basic computer skills, Microsoft Office, and internet proficiency",
            demandLevel: "High",
            category: "Technical",
            priority: "Essential"
        },
        {
            name: "Communication Skills",
            description: "Verbal and written communication in multiple languages",
            demandLevel: "High",
            category: "Soft Skills",
            priority: "Essential"
        },
        {
            name: "Problem Solving",
            description: "Analytical thinking and creative solution development",
            demandLevel: "High",
            category: "Cognitive",
            priority: "Essential"
        }
    ];

    // Add technical skills for math/science strong students
    if (strongInMath || strongInScience) {
        skills.push(
            {
                name: "Data Analysis",
                description: "Excel, basic statistics, and data interpretation skills",
                demandLevel: "High",
                category: "Technical",
                priority: "Recommended"
            },
            {
                name: "Programming Basics",
                description: "Introduction to Python or JavaScript programming",
                demandLevel: "High",
                category: "Technical",
                priority: "Recommended"
            }
        );
    }

    // Add business skills for commerce-oriented students
    if (strongInLanguages) {
        skills.push(
            {
                name: "Customer Service",
                description: "Handling customer inquiries and resolving issues",
                demandLevel: "Medium",
                category: "Business",
                priority: "Useful"
            },
            {
                name: "Digital Marketing",
                description: "Social media management and basic online marketing",
                demandLevel: "High",
                category: "Business",
                priority: "Recommended"
            }
        );
    }

    return { courses, skills };
}

// Database saving function
async function saveToDatabase(studentId, name, email, grade, ocrResult, apsResult, courses, skills, filePath) {
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
            recommendedCourses: courses,
            recommendedSkills: skills
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