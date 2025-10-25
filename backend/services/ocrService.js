const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

class OCRService {
    constructor() {
        this.supportedSubjects = [
            'mathematics', 'math', 'maths', 'wiskunde',
            'english', 'engels',
            'afrikaans',
            'physical science', 'physics', 'physical sciences',
            'life science', 'life sciences', 'biology',
            'geography',
            'history',
            'accounting',
            'economics',
            'business studies',
            'life orientation',
            'computer science', 'it', 'information technology',
            'tourisme', 'tourism',
            'consumer studies'
        ];
    }

    async extractResults(imagePath) {
        try {
            console.log('Starting OCR processing...');
            
            const { data: { text, confidence } } = await Tesseract.recognize(
                imagePath,
                'eng',
                { 
                    logger: m => console.log(m) 
                }
            );

            console.log('OCR Confidence:', confidence);
            console.log('Extracted Text:', text);

            const results = this.parseResults(text);
            
            return {
                success: true,
                text: text,
                confidence: confidence,
                subjects: results.subjects,
                overallAverage: results.overallAverage,
                errors: results.errors
            };

        } catch (error) {
            console.error('OCR Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    parseResults(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const subjects = [];
        let totalMarks = 0;
        let subjectCount = 0;
        const errors = [];

        console.log('Parsing lines:', lines);

        for (let line of lines) {
            const subjectResult = this.parseLine(line);
            if (subjectResult) {
                subjects.push(subjectResult);
                totalMarks += subjectResult.mark;
                subjectCount++;
            }
        }

        // Calculate overall average
        const overallAverage = subjectCount > 0 ? Math.round(totalMarks / subjectCount) : 0;

        // If no subjects found, try alternative parsing
        if (subjects.length === 0) {
            const alternativeResults = this.alternativeParse(text);
            subjects.push(...alternativeResults.subjects);
            errors.push(...alternativeResults.errors);
        }

        return {
            subjects,
            overallAverage,
            errors
        };
    }

    parseLine(line) {
        // Clean the line
        const cleanLine = line.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        
        // Look for subject names
        let subjectName = '';
        for (const subject of this.supportedSubjects) {
            if (cleanLine.includes(subject)) {
                subjectName = this.formatSubjectName(subject);
                break;
            }
        }

        if (!subjectName) {
            // Try to extract subject from common patterns
            const subjectMatch = cleanLine.match(/(mathematics|english|science|geography|history|accounting|economics|business|afrikaans)/i);
            if (subjectMatch) {
                subjectName = this.formatSubjectName(subjectMatch[0]);
            }
        }

        // Extract mark - look for numbers between 0-100
        const markMatch = line.match(/\b(\d{1,3})\b/);
        if (markMatch) {
            const mark = parseInt(markMatch[1]);
            if (mark >= 0 && mark <= 100 && subjectName) {
                return {
                    name: subjectName,
                    mark: mark,
                    level: this.getLevel(mark)
                };
            }
        }

        return null;
    }

    alternativeParse(text) {
        const subjects = [];
        const errors = [];
        
        // Look for common result patterns
        const patterns = [
            /(\w+)\s*:?\s*(\d{1,3})/gi,
            /(\w+)\s+(\d{1,3})/gi,
            /(\d{1,3})\s*-\s*(\w+)/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const potentialSubject = match[1] || match[2];
                const potentialMark = match[2] || match[1];
                
                if (this.isValidSubject(potentialSubject) && this.isValidMark(potentialMark)) {
                    const mark = parseInt(potentialMark);
                    subjects.push({
                        name: this.formatSubjectName(potentialSubject),
                        mark: mark,
                        level: this.getLevel(mark)
                    });
                }
            }
        }

        return { subjects, errors };
    }

    isValidSubject(text) {
        const cleanText = text.toLowerCase();
        return this.supportedSubjects.some(subject => cleanText.includes(subject));
    }

    isValidMark(mark) {
        const num = parseInt(mark);
        return !isNaN(num) && num >= 0 && num <= 100;
    }

    formatSubjectName(subject) {
        const subjectMap = {
            'maths': 'Mathematics',
            'math': 'Mathematics',
            'wiskunde': 'Mathematics',
            'engels': 'English',
            'physical science': 'Physical Science',
            'physical sciences': 'Physical Science',
            'life science': 'Life Science',
            'life sciences': 'Life Science',
            'biology': 'Life Science',
            'it': 'Information Technology',
            'computer science': 'Information Technology',
            'consumer studies': 'Consumer Studies',
            'tourisme': 'Tourism'
        };

        const lowerSubject = subject.toLowerCase();
        return subjectMap[lowerSubject] || subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
    }

    getLevel(mark) {
        if (mark >= 80) return 'Distinction';
        if (mark >= 70) return 'Merit';
        if (mark >= 60) return 'Achieved';
        if (mark >= 50) return 'Satisfactory';
        if (mark >= 40) return 'Elementary';
        return 'Not Achieved';
    }

    calculateAPS(subjects) {
        let totalPoints = 0;
        let validSubjects = 0;

        subjects.forEach(subject => {
            const mark = subject.mark;
            let points = 0;

            if (mark >= 80) points = 7;
            else if (mark >= 70) points = 6;
            else if (mark >= 60) points = 5;
            else if (mark >= 50) points = 4;
            else if (mark >= 40) points = 3;
            else if (mark >= 30) points = 2;
            else points = 1;

            totalPoints += points;
            validSubjects++;
        });

        return {
            apsScore: totalPoints,
            totalSubjects: validSubjects,
            averagePoints: validSubjects > 0 ? (totalPoints / validSubjects).toFixed(2) : 0
        };
    }
}

module.exports = new OCRService();