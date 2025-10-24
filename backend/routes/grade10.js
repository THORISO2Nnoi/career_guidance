const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Results = require('../models/Results');
const Recommendations = require('../models/Recommendations');

// Upload results and get stream recommendations
router.post('/upload-results', async (req, res) => {
    try {
        const { studentId, name, subjects, overallAverage } = req.body;

        // Save or update student
        let student = await Student.findOne({ studentId });
        if (!student) {
            student = new Student({
                studentId,
                name,
                grade: '10',
                contact: { email: req.body.email }
            });
            await student.save();
        }

        // Save results
        const results = new Results({
            studentId,
            grade: '10',
            subjects,
            overallAverage,
            fileUrl: req.body.fileUrl
        });
        await results.save();

        // Generate stream recommendations
        const recommendedStreams = await generateStreamRecommendations(subjects, overallAverage);

        // Save recommendations
        const recommendations = new Recommendations({
            studentId,
            grade: '10',
            recommendedStreams
        });
        await recommendations.save();

        res.json({
            success: true,
            streams: recommendedStreams
        });

    } catch (error) {
        console.error('Error in grade10 upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate stream recommendations for Mpumalanga
async function generateStreamRecommendations(subjects, average) {
    const streams = [
        {
            name: "Science Stream",
            description: "Focus on Mathematics, Physical Sciences, and Life Sciences",
            schools: [
                "Nelspruit High School, Nelspruit",
                "Hoërskool Bergvlam, Nelspruit",
                "Lowveld High School, Nelspruit",
                "Hoërskool Rob Ferreira, Nelspruit",
                "Penryn College, Nelspruit"
            ],
            suitability: "Excellent for students strong in Mathematics and Sciences"
        },
        {
            name: "Commerce Stream",
            description: "Focus on Accounting, Business Studies, and Economics",
            schools: [
                "Hoërskool Ligteland, Nelspruit",
                "Reyno Ridge College, Nelspruit",
                "Uplands College, White River",
                "Curro Nelspruit, Nelspruit",
                "Ermelo High School, Ermelo"
            ],
            suitability: "Ideal for students interested in business and finance"
        },
        {
            name: "Arts & Humanities Stream",
            description: "Focus on Languages, History, and Geography",
            schools: [
                "Hoërskool Nelspruit, Nelspruit",
                "Bella Vista High School, Nelspruit",
                "Witbank High School, Witbank",
                "Middelburg High School, Middelburg",
                "Barberton High School, Barberton"
            ],
            suitability: "Perfect for students with strong language and social science skills"
        },
        {
            name: "Technical Stream",
            description: "Focus on Engineering, Technology and Design",
            schools: [
                "Technical High School, Middelburg",
                "Witbank High School, Witbank",
                "Hoër Tegniese Skool Nelspruit, Nelspruit",
                "Ehlanzeni Technical College, Nelspruit",
                "Gert Sibande TVET College, Various campuses"
            ],
            suitability: "Great for students interested in practical and technical subjects"
        }
    ];

    // In a real implementation, this would be based on subject performance
    return streams;
}

module.exports = router;