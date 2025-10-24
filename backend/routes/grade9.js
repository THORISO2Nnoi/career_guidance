const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Results = require('../models/Results');
const Recommendations = require('../models/Recommendations');

// Upload results and get skill recommendations
router.post('/upload-results', async (req, res) => {
    try {
        const { studentId, name, subjects, overallAverage, currentSkills } = req.body;

        // Save or update student
        let student = await Student.findOne({ studentId });
        if (!student) {
            student = new Student({
                studentId,
                name,
                grade: '9',
                contact: { email: req.body.email }
            });
            await student.save();
        }

        // Save results
        const results = new Results({
            studentId,
            grade: '9',
            subjects,
            overallAverage,
            fileUrl: req.body.fileUrl
        });
        await results.save();

        // Generate skill recommendations based on results and current skills
        const recommendedSkills = await generateSkillRecommendations(subjects, overallAverage, currentSkills);

        // Save recommendations
        const recommendations = new Recommendations({
            studentId,
            grade: '9',
            currentSkills,
            recommendedSkills
        });
        await recommendations.save();

        res.json({
            success: true,
            recommendations: recommendedSkills
        });

    } catch (error) {
        console.error('Error in grade9 upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate skill recommendations
async function generateSkillRecommendations(subjects, average, currentSkills) {
    // This would be more sophisticated in a real implementation
    const allSkills = [
        { name: "Digital Literacy", description: "Basic computer skills and understanding of digital tools", demandLevel: "High", category: "Technical" },
        { name: "Problem Solving", description: "Analytical thinking and creative solution development", demandLevel: "High", category: "Cognitive" },
        { name: "Communication Skills", description: "Verbal and written communication in multiple languages", demandLevel: "High", category: "Social" },
        { name: "Critical Thinking", description: "Ability to analyze information and make reasoned judgments", demandLevel: "High", category: "Cognitive" },
        { name: "Teamwork", description: "Collaborating effectively with diverse groups", demandLevel: "Medium", category: "Social" },
        { name: "Adaptability", description: "Flexibility in changing environments and learning new skills", demandLevel: "High", category: "Personal" },
        { name: "Mathematics Skills", description: "Numerical reasoning and mathematical problem-solving", demandLevel: "High", category: "Technical" },
        { name: "Scientific Thinking", description: "Understanding scientific methods and principles", demandLevel: "Medium", category: "Cognitive" }
    ];

    // Filter out skills the student already has
    const filteredSkills = allSkills.filter(skill => 
        !currentSkills.includes(skill.name.toLowerCase())
    );

    return filteredSkills.slice(0, 6); // Return top 6 recommendations
}

module.exports = router;