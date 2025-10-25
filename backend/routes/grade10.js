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

        const studentId = 'GR10-' + Date.now();

        console.log('Processing Grade 10 uploaded file:', req.file.filename);
        console.log('Student ID:', studentId);

        // Process the uploaded file with OCR
        const ocrResult = await OCRService.extractResults(req.file.path);
        
        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process results file: ' + ocrResult.error
            });
        }

        console.log('Grade 10 OCR Results:', {
            subjectsFound: ocrResult.subjects.length,
            confidence: ocrResult.confidence,
            errors: ocrResult.errors
        });

        // Calculate APS from extracted subjects
        const apsResult = calculateAPSBreakdown(ocrResult.subjects);

        // Generate stream recommendations
        const recommendedStreams = await generateStreamRecommendations(ocrResult.subjects, ocrResult.overallAverage);

        // Calculate performance and suitability analysis
        const streamAnalysis = analyzeStreamSuitability(ocrResult.subjects, recommendedStreams);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 10 results processed successfully!',
            studentId: studentId,
            ocrResult: {
                text: ocrResult.text,
                confidence: ocrResult.confidence,
                errors: ocrResult.errors
            },
            apsScore: apsResult.totalPoints,
            apsBreakdown: apsResult,
            performanceAnalysis: analyzeGrade10Performance(ocrResult.subjects, ocrResult.overallAverage),
            streamAnalysis,
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            streams: recommendedStreams,
            summary: generateGrade10Summary(ocrResult.subjects, ocrResult.overallAverage, apsResult.totalPoints, recommendedStreams)
        };

        // Save to database in the background
        saveToDatabase(studentId, ocrResult, apsResult, recommendedStreams, req.file.path);

        res.json(response);

    } catch (error) {
        console.error('Error in grade10 upload:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Manual results submission (fallback)
router.post('/manual-results', async (req, res) => {
    try {
        const { subjects } = req.body;

        console.log('Grade 10 manual results submission:', { 
            subjectsCount: subjects.length
        });

        // Validate subjects
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No subjects provided'
            });
        }

        const studentId = 'GR10-' + Date.now();
        const overallAverage = calculateAverage(subjects);
        
        // Calculate APS
        const apsScore = calculateAPS(subjects);
        const apsBreakdown = calculateAPSBreakdown(subjects);

        // Generate stream recommendations
        const recommendedStreams = await generateStreamRecommendations(subjects, overallAverage);

        // Calculate performance and suitability analysis
        const streamAnalysis = analyzeStreamSuitability(subjects, recommendedStreams);

        // Prepare response
        const response = {
            success: true,
            message: 'Grade 10 manual results processed successfully!',
            studentId: studentId,
            apsScore: apsScore,
            apsBreakdown: apsBreakdown,
            performanceAnalysis: analyzeGrade10Performance(subjects, overallAverage),
            streamAnalysis,
            subjects,
            overallAverage,
            streams: recommendedStreams,
            summary: generateGrade10Summary(subjects, overallAverage, apsScore, recommendedStreams)
        };

        // Save to database in the background
        saveToDatabase(studentId, { subjects, overallAverage }, { totalPoints: apsScore, breakdown: apsBreakdown }, recommendedStreams, 'manual_upload');

        res.json(response);

    } catch (error) {
        console.error('Error in grade10 manual results submission:', error);
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
        const recommendedStreams = await generateStreamRecommendations(subjects, overallAverage);
        const streamAnalysis = analyzeStreamSuitability(subjects, recommendedStreams);

        res.json({
            success: true,
            message: 'APS calculated successfully!',
            apsScore,
            overallAverage,
            apsBreakdown,
            subjects,
            streams: recommendedStreams,
            streamAnalysis,
            summary: generateGrade10Summary(subjects, overallAverage, apsScore, recommendedStreams)
        });

    } catch (error) {
        console.error('Error calculating APS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get detailed analysis
router.post('/analyze-results', upload.single('resultsFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const ocrResult = await OCRService.extractResults(req.file.path);
        
        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process results file'
            });
        }

        const apsResult = calculateAPSBreakdown(ocrResult.subjects);
        const analysis = analyzeGrade10Performance(ocrResult.subjects, ocrResult.overallAverage);

        res.json({
            success: true,
            message: 'Results analyzed successfully!',
            analysis,
            apsScore: apsResult.totalPoints,
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            confidence: ocrResult.confidence
        });

    } catch (error) {
        console.error('Error analyzing results:', error);
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
        breakdown: breakdown,
        performance: getPerformanceLevel(totalPoints, subjects.length)
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

function getPerformanceLevel(totalPoints, subjectCount) {
    const average = totalPoints / subjectCount;
    if (average >= 6) return 'Outstanding';
    if (average >= 5) return 'Excellent';
    if (average >= 4) return 'Good';
    if (average >= 3) return 'Average';
    return 'Needs Improvement';
}

// Calculate average
function calculateAverage(subjects) {
    const total = subjects.reduce((sum, subject) => sum + subject.mark, 0);
    return subjects.length > 0 ? Math.round(total / subjects.length) : 0;
}

// Analyze Grade 10 performance
function analyzeGrade10Performance(subjects, overallAverage) {
    const strongSubjects = subjects.filter(s => s.mark >= 70);
    const averageSubjects = subjects.filter(s => s.mark >= 50 && s.mark < 70);
    const weakSubjects = subjects.filter(s => s.mark < 50);

    const coreSubjects = {
        mathematics: subjects.find(s => s.name.toLowerCase().includes('math')),
        english: subjects.find(s => s.name.toLowerCase().includes('english')),
        science: subjects.find(s => s.name.toLowerCase().includes('science'))
    };

    const electiveSubjects = subjects.filter(s => 
        !s.name.toLowerCase().includes('math') && 
        !s.name.toLowerCase().includes('english') && 
        !s.name.toLowerCase().includes('science')
    );

    return {
        strengths: {
            subjects: strongSubjects,
            count: strongSubjects.length,
            message: strongSubjects.length > 0 ? 
                `Your strongest subjects are: ${strongSubjects.map(s => s.name).join(', ')}` :
                'No subjects with distinction or merit levels'
        },
        weaknesses: {
            subjects: weakSubjects,
            count: weakSubjects.length,
            message: weakSubjects.length > 0 ? 
                `Focus on improving: ${weakSubjects.map(s => s.name).join(', ')}` :
                'No subjects requiring immediate attention'
        },
        improvements: {
            subjects: averageSubjects,
            count: averageSubjects.length,
            message: averageSubjects.length > 0 ? 
                `Good performance in: ${averageSubjects.map(s => s.name).join(', ')} - consider enhancing these` :
                'All subjects are either strong or need improvement'
        },
        coreSubjects: {
            mathematics: coreSubjects.mathematics ? {
                mark: coreSubjects.mathematics.mark,
                level: getLevel(coreSubjects.mathematics.mark),
                suitability: getCoreSubjectSuitability(coreSubjects.mathematics.mark, 'mathematics')
            } : null,
            english: coreSubjects.english ? {
                mark: coreSubjects.english.mark,
                level: getLevel(coreSubjects.english.mark),
                suitability: getCoreSubjectSuitability(coreSubjects.english.mark, 'english')
            } : null,
            science: coreSubjects.science ? {
                mark: coreSubjects.science.mark,
                level: getLevel(coreSubjects.science.mark),
                suitability: getCoreSubjectSuitability(coreSubjects.science.mark, 'science')
            } : null
        },
        electiveSubjects: {
            list: electiveSubjects,
            count: electiveSubjects.length,
            average: calculateAverage(electiveSubjects),
            strengths: electiveSubjects.filter(s => s.mark >= 70).map(s => s.name)
        },
        overallAssessment: getGrade10PerformanceLevel(overallAverage)
    };
}

function getCoreSubjectSuitability(mark, subject) {
    if (mark >= 70) return 'Excellent';
    if (mark >= 60) return 'Good';
    if (mark >= 50) return 'Adequate';
    return 'Needs Improvement';
}

function getGrade10PerformanceLevel(average) {
    if (average >= 75) return {
        level: 'Outstanding',
        message: 'Exceptional academic performance! You have excellent prospects for all streams.',
        color: 'green'
    };
    if (average >= 65) return {
        level: 'Excellent',
        message: 'Strong academic performance with very good stream options.',
        color: 'blue'
    };
    if (average >= 55) return {
        level: 'Good',
        message: 'Solid performance with various stream options available.',
        color: 'teal'
    };
    if (average >= 45) return {
        level: 'Satisfactory',
        message: 'Adequate performance. Focus on streams that match your strengths.',
        color: 'orange'
    };
    return {
        level: 'Needs Focus',
        message: 'Focus on core subjects and consider technical streams.',
        color: 'red'
    };
}

// Analyze stream suitability
function analyzeStreamSuitability(subjects, streams) {
    const suitabilityScores = {};

    streams.forEach(stream => {
        let score = 0;
        let matchingSubjects = 0;
        let recommendations = [];

        // Science stream analysis
        if (stream.name.toLowerCase().includes('science')) {
            const math = subjects.find(s => s.name.toLowerCase().includes('math'));
            const science = subjects.find(s => s.name.toLowerCase().includes('science'));
            
            if (math && math.mark >= 60) {
                score += math.mark;
                matchingSubjects++;
                recommendations.push(`Strong Mathematics (${math.mark}%)`);
            }
            if (science && science.mark >= 60) {
                score += science.mark;
                matchingSubjects++;
                recommendations.push(`Good Science performance (${science.mark}%)`);
            }
        }

        // Commerce stream analysis
        if (stream.name.toLowerCase().includes('commerce')) {
            const math = subjects.find(s => s.name.toLowerCase().includes('math'));
            const english = subjects.find(s => s.name.toLowerCase().includes('english'));
            
            if (math && math.mark >= 50) {
                score += math.mark;
                matchingSubjects++;
                recommendations.push(`Adequate Mathematics (${math.mark}%)`);
            }
            if (english && english.mark >= 60) {
                score += english.mark;
                matchingSubjects++;
                recommendations.push(`Strong English (${english.mark}%)`);
            }
        }

        // Arts stream analysis
        if (stream.name.toLowerCase().includes('arts') || stream.name.toLowerCase().includes('humanities')) {
            const languages = subjects.filter(s => 
                s.name.toLowerCase().includes('english') || 
                s.name.toLowerCase().includes('afrikaans')
            );
            const humanities = subjects.filter(s => 
                s.name.toLowerCase().includes('history') || 
                s.name.toLowerCase().includes('geography')
            );

            languages.forEach(lang => {
                if (lang.mark >= 60) {
                    score += lang.mark;
                    matchingSubjects++;
                    recommendations.push(`Strong ${lang.name} (${lang.mark}%)`);
                }
            });

            humanities.forEach(subject => {
                if (subject.mark >= 60) {
                    score += subject.mark;
                    matchingSubjects++;
                    recommendations.push(`Good ${subject.name} (${subject.mark}%)`);
                }
            });
        }

        // Technical stream analysis
        if (stream.name.toLowerCase().includes('technical')) {
            const math = subjects.find(s => s.name.toLowerCase().includes('math'));
            const science = subjects.find(s => s.name.toLowerCase().includes('science'));
            const technology = subjects.find(s => s.name.toLowerCase().includes('technology'));
            
            if (math && math.mark >= 50) {
                score += math.mark;
                matchingSubjects++;
                recommendations.push(`Adequate Mathematics (${math.mark}%)`);
            }
            if (science && science.mark >= 50) {
                score += science.mark;
                matchingSubjects++;
                recommendations.push(`Adequate Science (${science.mark}%)`);
            }
            if (technology && technology.mark >= 60) {
                score += technology.mark * 1.5; // Weight technology higher
                matchingSubjects++;
                recommendations.push(`Strong Technology (${technology.mark}%)`);
            }
        }

        const averageScore = matchingSubjects > 0 ? score / matchingSubjects : 0;
        
        suitabilityScores[stream.name] = {
            score: Math.round(averageScore),
            suitability: getSuitabilityLevel(averageScore),
            matchingSubjects: matchingSubjects,
            recommendations: recommendations.length > 0 ? recommendations : ['Consider foundational subjects improvement'],
            priority: getPriorityLevel(averageScore)
        };
    });

    return suitabilityScores;
}

function getSuitabilityLevel(score) {
    if (score >= 70) return 'Highly Suitable';
    if (score >= 60) return 'Very Suitable';
    if (score >= 50) return 'Suitable';
    if (score >= 40) return 'Moderately Suitable';
    return 'Less Suitable';
}

function getPriorityLevel(score) {
    if (score >= 70) return 'High Priority';
    if (score >= 60) return 'Recommended';
    if (score >= 50) return 'Consider';
    return 'Explore Options';
}

// Generate stream recommendations for Mpumalanga
async function generateStreamRecommendations(subjects, average) {
    const streams = [
        {
            name: "Science Stream",
            description: "Focus on Mathematics, Physical Sciences, and Life Sciences. Prepares for careers in medicine, engineering, research, and technology.",
            coreSubjects: ["Mathematics", "Physical Science", "Life Science"],
            electiveOptions: ["Geography", "Computer Science", "Additional Mathematics"],
            careerPaths: ["Doctor", "Engineer", "Scientist", "IT Specialist", "Researcher"],
            schools: [
                "Nelspruit High School, Nelspruit",
                "Hoërskool Bergvlam, Nelspruit",
                "Lowveld High School, Nelspruit",
                "Hoërskool Rob Ferreira, Nelspruit",
                "Penryn College, Nelspruit",
                "Uplands College, White River"
            ],
            requirements: "Strong Mathematics and Science marks (60%+)",
            advantages: "Wide range of university options, high earning potential",
            challenges: "Demanding workload, competitive entry requirements",
            apsRange: "28-42 points"
        },
        {
            name: "Commerce Stream",
            description: "Focus on Accounting, Business Studies, and Economics. Prepares for careers in business, finance, and management.",
            coreSubjects: ["Accounting", "Business Studies", "Economics"],
            electiveOptions: ["Mathematics", "Consumer Studies", "Tourism"],
            careerPaths: ["Accountant", "Business Manager", "Banker", "Entrepreneur", "Financial Analyst"],
            schools: [
                "Hoërskool Ligteland, Nelspruit",
                "Reyno Ridge College, Nelspruit",
                "Uplands College, White River",
                "Curro Nelspruit, Nelspruit",
                "Ermelo High School, Ermelo",
                "Witbank High School, Witbank"
            ],
            requirements: "Good Mathematics and English marks (50%+)",
            advantages: "Diverse career opportunities, stable employment prospects",
            challenges: "Requires strong numerical and analytical skills",
            apsRange: "24-35 points"
        },
        {
            name: "Arts & Humanities Stream",
            description: "Focus on Languages, History, and Geography. Prepares for careers in education, law, social sciences, and creative fields.",
            coreSubjects: ["History", "Geography", "Additional Language"],
            electiveOptions: ["Dramatic Arts", "Visual Arts", "Music", "Tourism"],
            careerPaths: ["Teacher", "Lawyer", "Journalist", "Social Worker", "Tourism Officer"],
            schools: [
                "Hoërskool Nelspruit, Nelspruit",
                "Bella Vista High School, Nelspruit",
                "Witbank High School, Witbank",
                "Middelburg High School, Middelburg",
                "Barberton High School, Barberton",
                "Ermelo High School, Ermelo"
            ],
            requirements: "Strong language and social science marks (60%+)",
            advantages: "Develops critical thinking and communication skills",
            challenges: "May require further studies for specialized careers",
            apsRange: "22-32 points"
        },
        {
            name: "Technical Stream",
            description: "Focus on Engineering, Technology and Design. Prepares for careers in trades, engineering, and technical fields.",
            coreSubjects: ["Engineering Graphics & Design", "Mechanical Technology", "Civil Technology"],
            electiveOptions: ["Mathematics", "Physical Science", "Information Technology"],
            careerPaths: ["Engineer", "Technician", "Artisan", "Draughtsman", "IT Support"],
            schools: [
                "Technical High School, Middelburg",
                "Witbank High School, Witbank",
                "Hoër Tegniese Skool Nelspruit, Nelspruit",
                "Ehlanzeni Technical College, Nelspruit",
                "Gert Sibande TVET College, Various campuses",
                "Middelburg Technical College, Middelburg"
            ],
            requirements: "Good Mathematics and Science marks (50%+), practical aptitude",
            advantages: "Hands-on learning, good employment opportunities, entrepreneurship potential",
            challenges: "Requires practical skills and technical aptitude",
            apsRange: "20-30 points"
        }
    ];

    return streams;
}

// Generate Grade 10 summary
function generateGrade10Summary(subjects, overallAverage, apsScore, streams) {
    const performance = getGrade10PerformanceLevel(overallAverage);
    const coreSubjects = subjects.filter(s => 
        s.name.toLowerCase().includes('math') || 
        s.name.toLowerCase().includes('english') || 
        s.name.toLowerCase().includes('science')
    );

    return {
        apsScore,
        overallAverage,
        performanceLevel: performance.level,
        coreSubjectAverage: calculateAverage(coreSubjects),
        availableStreams: streams.length,
        keyMessage: getGrade10KeyMessage(overallAverage, apsScore),
        selectionGuidance: getStreamSelectionGuidance(apsScore),
        nextSteps: getGrade10NextSteps(streams, apsScore)
    };
}

function getGrade10KeyMessage(average, apsScore) {
    if (apsScore >= 35) {
        return `Excellent APS of ${apsScore}! You have outstanding university prospects across all streams.`;
    } else if (apsScore >= 28) {
        return `Very good APS of ${apsScore}! You qualify for most university programs and streams.`;
    } else if (apsScore >= 24) {
        return `Good APS of ${apsScore}! You have solid options for diploma and degree programs.`;
    } else if (apsScore >= 20) {
        return `Adequate APS of ${apsScore}. Focus on streams that match your subject strengths.`;
    } else {
        return `APS of ${apsScore}. Consider technical streams and skills development programs.`;
    }
}

function getStreamSelectionGuidance(apsScore) {
    if (apsScore >= 35) {
        return "You qualify for highly competitive programs including Medicine, Engineering, and Computer Science.";
    } else if (apsScore >= 28) {
        return "You qualify for most university programs including Commerce, Health Sciences, and Education.";
    } else if (apsScore >= 24) {
        return "You qualify for diploma programs and some university degrees. Consider TVET colleges.";
    } else if (apsScore >= 20) {
        return "Focus on technical streams and skills development programs with good employment prospects.";
    } else {
        return "Consider vocational training and skills development to build your career foundation.";
    }
}

function getGrade10NextSteps(streams, apsScore) {
    const steps = [
        `Your APS Score: ${apsScore} points - This determines your tertiary education options`,
        "Review the stream recommendations below based on your subject performance",
        "Research career opportunities for each recommended stream",
        "Visit schools in Mpumalanga that offer your preferred streams",
        "Focus on improving core subjects if needed for your chosen stream"
    ];

    if (apsScore < 24) {
        steps.push("Consider skills development programs and vocational training as alternative pathways");
        steps.push("Focus on improving Mathematics and English marks for better opportunities");
    }

    if (apsScore >= 28) {
        steps.push("Explore university entrance requirements for your preferred fields");
        steps.push("Consider applying for bursaries and scholarships");
    }

    return steps;
}

// Get achievement level
function getLevel(mark) {
    if (mark >= 80) return 'Distinction';
    if (mark >= 70) return 'Merit';
    if (mark >= 60) return 'Achieved';
    if (mark >= 50) return 'Satisfactory';
    if (mark >= 40) return 'Elementary';
    return 'Not Achieved';
}

// Database saving function
async function saveToDatabase(studentId, ocrResult, apsResult, recommendedStreams, filePath) {
    try {
        // Save student
        const student = new Student({
            studentId,
            name: 'Grade 10 Student',
            grade: '10',
            contact: { email: 'student@example.com' }
        });
        await student.save();

        // Save results
        const results = new Results({
            studentId,
            grade: '10',
            subjects: ocrResult.subjects,
            overallAverage: ocrResult.overallAverage,
            apsScore: apsResult.totalPoints,
            fileUrl: filePath
        });
        await results.save();

        // Save recommendations
        const recommendations = new Recommendations({
            studentId,
            grade: '10',
            recommendedStreams
        });
        await recommendations.save();

        console.log('Grade 10 data saved successfully for student:', studentId);
    } catch (error) {
        console.error('Error saving Grade 10 data to database:', error);
    }
}

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Grade 10 API is running',
        timestamp: new Date().toISOString(),
        endpoints: [
            'POST /upload-results - Upload and scan Grade 10 results with OCR',
            'POST /manual-results - Submit Grade 10 results manually',
            'POST /calculate-aps - Quick APS calculation',
            'POST /analyze-results - Detailed results analysis'
        ]
    });
});

module.exports = router;