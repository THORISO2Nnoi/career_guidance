const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Results = require('../models/Results');
const Recommendations = require('../models/Recommendations');

// Upload results and calculate APS with recommendations
router.post('/upload-results', async (req, res) => {
    try {
        const { studentId, name, subjects } = req.body;

        // Save or update student
        let student = await Student.findOne({ studentId });
        if (!student) {
            student = new Student({
                studentId,
                name,
                grade: req.body.grade,
                contact: { email: req.body.email }
            });
            await student.save();
        }

        // Calculate APS
        const apsScore = calculateAPS(subjects);
        const overallAverage = calculateAverage(subjects);

        // Save results
        const results = new Results({
            studentId,
            grade: req.body.grade,
            subjects,
            overallAverage,
            apsScore,
            fileUrl: req.body.fileUrl
        });
        await results.save();

        // Generate recommendations
        const { courses, skills } = await generateRecommendations(apsScore, subjects);

        // Save recommendations
        const recommendations = new Recommendations({
            studentId,
            grade: req.body.grade,
            recommendedCourses: courses,
            recommendedSkills: skills
        });
        await recommendations.save();

        res.json({
            success: true,
            apsScore,
            courses,
            skills
        });

    } catch (error) {
        console.error('Error in grade11-12 upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calculate APS (Admission Point Score)
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

// Calculate average
function calculateAverage(subjects) {
    const total = subjects.reduce((sum, subject) => sum + subject.mark, 0);
    return total / subjects.length;
}

// Generate course and skill recommendations
async function generateRecommendations(apsScore, subjects) {
    let courses = [];
    let skills = [];

    // Course recommendations based on APS
    if (apsScore >= 30) {
        courses = [
            {
                name: "Medicine",
                description: "Bachelor of Medicine and Bachelor of Surgery",
                institutions: ["Wits University", "University of Pretoria", "Stellenbosch University"],
                requirements: "APS 40+, Physical Science & Life Science > 80%",
                jobProspects: "Excellent - High demand for doctors"
            },
            {
                name: "Engineering",
                description: "BSc in various engineering disciplines",
                institutions: ["University of Johannesburg", "TUT", "UCT"],
                requirements: "APS 35+, Mathematics & Physical Science > 70%",
                jobProspects: "Very Good - Growing infrastructure projects"
            }
        ];
    } else if (apsScore >= 25) {
        courses = [
            {
                name: "Commerce",
                description: "BCom in Accounting, Finance or Economics",
                institutions: ["UNISA", "University of Pretoria", "NWU"],
                requirements: "APS 28+, Mathematics > 60%",
                jobProspects: "Good - Always demand for finance professionals"
            }
        ];
    }

    // Skill recommendations based on market demand
    skills = [
        {
            name: "Digital Marketing",
            description: "SEO, social media, and online advertising skills",
            demandLevel: "High",
            category: "Business"
        },
        {
            name: "Data Analysis",
            description: "Interpreting data to make business decisions",
            demandLevel: "High",
            category: "Technical"
        }
    ];

    return { courses, skills };
}

module.exports = router;