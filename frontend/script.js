// Global variables
let currentSkills = [];
let uploadedFile = null;
const API_BASE ='mongodb+srv://THORISO:THORISO2@cluster0.5dcf7ib.mongodb.net/?appName=Cluster0'
// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all pages
    initHomePage();
    initGrade9Page();
    initGrade10Page();
    initGrade11_12Page();
});

// Home Page Initialization
function initHomePage() {
    // No specific initialization needed for home page
}

// Grade 9 Page Initialization
function initGrade9Page() {
    const step1Next = document.getElementById('step1Next');
    const step2Prev = document.getElementById('step2Prev');
    const step2Next = document.getElementById('step2Next');
    const step3Prev = document.getElementById('step3Prev');
    const step3Finish = document.getElementById('step3Finish');
    const resultsFile = document.getElementById('resultsFile');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const skillInput = document.getElementById('skillInput');
    const skillsList = document.getElementById('skillsList');
    
    // File upload handling
    if (resultsFile) {
        resultsFile.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFile = e.target.files[0];
                step1Next.disabled = false;
                
                // Update upload area text
                const uploadArea = document.getElementById('uploadArea');
                uploadArea.innerHTML = `
                    <p>File uploaded: ${uploadedFile.name}</p>
                    <button class="btn" id="changeFileBtn">Change File</button>
                `;
                
                document.getElementById('changeFileBtn').addEventListener('click', function() {
                    resultsFile.value = '';
                    uploadedFile = null;
                    step1Next.disabled = true;
                    initUploadArea();
                });
            }
        });
    }
    
    // Initialize upload area
    function initUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <p>Drag & drop your results file here or</p>
            <input type="file" id="resultsFile" accept=".pdf,.jpg,.jpeg,.png">
            <label for="resultsFile" class="btn">Choose File</label>
            <p class="file-info">Supported formats: PDF, JPG, PNG</p>
        `;
        
        // Re-attach event listener
        document.getElementById('resultsFile').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFile = e.target.files[0];
                step1Next.disabled = false;
                
                // Update upload area text
                const uploadArea = document.getElementById('uploadArea');
                uploadArea.innerHTML = `
                    <p>File uploaded: ${uploadedFile.name}</p>
                    <button class="btn" id="changeFileBtn">Change File</button>
                `;
                
                document.getElementById('changeFileBtn').addEventListener('click', function() {
                    resultsFile.value = '';
                    uploadedFile = null;
                    step1Next.disabled = true;
                    initUploadArea();
                });
            }
        });
    }
    
    // Step navigation
    if (step1Next) {
        step1Next.addEventListener('click', function() {
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
        });
    }
    
    if (step2Prev) {
        step2Prev.addEventListener('click', function() {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
        });
    }
    
    if (step2Next) {
        step2Next.addEventListener('click', function() {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
            generateSkillRecommendations();
        });
    }
    
    if (step3Prev) {
        step3Prev.addEventListener('click', function() {
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step2').classList.add('active');
        });
    }
    
    if (step3Finish) {
        step3Finish.addEventListener('click', function() {
            alert('Thank you for using our career guidance portal! Your recommendations have been saved.');
            // In a real application, you would save the data here
        });
    }
    
    // Skills management
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', addSkill);
    }
    
    if (skillInput) {
        skillInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addSkill();
            }
        });
    }
    
    function addSkill() {
        const skill = skillInput.value.trim();
        if (skill && !currentSkills.includes(skill.toLowerCase())) {
            currentSkills.push(skill.toLowerCase());
            renderSkillsList();
            skillInput.value = '';
        }
    }
    
    function removeSkill(skill) {
        currentSkills = currentSkills.filter(s => s !== skill);
        renderSkillsList();
    }
    
    function renderSkillsList() {
        skillsList.innerHTML = '';
        currentSkills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-tag';
            skillElement.innerHTML = `
                ${skill}
                <button type="button" onclick="removeSkill('${skill}')">×</button>
            `;
            skillsList.appendChild(skillElement);
        });
    }
    
    function generateSkillRecommendations() {
        const recommendations = document.getElementById('skillRecommendations');
        recommendations.innerHTML = '';
        
        // In a real application, this would be based on the uploaded results and current skills
        // For demo purposes, we'll use static data
        const inDemandSkills = [
            { name: "Digital Literacy", description: "Basic computer skills and understanding of digital tools" },
            { name: "Problem Solving", description: "Analytical thinking and creative solution development" },
            { name: "Communication Skills", description: "Verbal and written communication in multiple languages" },
            { name: "Critical Thinking", description: "Ability to analyze information and make reasoned judgments" },
            { name: "Teamwork", description: "Collaborating effectively with diverse groups" },
            { name: "Adaptability", description: "Flexibility in changing environments and learning new skills" }
        ];
        
        inDemandSkills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'recommendation-item';
            skillElement.innerHTML = `
                <h4>${skill.name}</h4>
                <p>${skill.description}</p>
            `;
            recommendations.appendChild(skillElement);
        });
    }
}

// Grade 10 Page Initialization
function initGrade10Page() {
    const resultsFile = document.getElementById('resultsFile');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const restartBtn = document.getElementById('restartBtn');
    
    // File upload handling
    if (resultsFile) {
        resultsFile.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFile = e.target.files[0];
                analyzeBtn.disabled = false;
                
                // Update upload area text
                const uploadArea = document.getElementById('uploadArea');
                uploadArea.innerHTML = `
                    <p>File uploaded: ${uploadedFile.name}</p>
                    <button class="btn" id="changeFileBtn">Change File</button>
                `;
                
                document.getElementById('changeFileBtn').addEventListener('click', function() {
                    resultsFile.value = '';
                    uploadedFile = null;
                    analyzeBtn.disabled = true;
                    initUploadArea();
                });
            }
        });
    }
    
    // Initialize upload area
    function initUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <p>Drag & drop your results file here or</p>
            <input type="file" id="resultsFile" accept=".pdf,.jpg,.jpeg,.png">
            <label for="resultsFile" class="btn">Choose File</label>
            <p class="file-info">Supported formats: PDF, JPG, PNG</p>
        `;
        
        // Re-attach event listener
        document.getElementById('resultsFile').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFile = e.target.files[0];
                analyzeBtn.disabled = false;
                
                // Update upload area text
                const uploadArea = document.getElementById('uploadArea');
                uploadArea.innerHTML = `
                    <p>File uploaded: ${uploadedFile.name}</p>
                    <button class="btn" id="changeFileBtn">Change File</button>
                `;
                
                document.getElementById('changeFileBtn').addEventListener('click', function() {
                    resultsFile.value = '';
                    uploadedFile = null;
                    analyzeBtn.disabled = true;
                    initUploadArea();
                });
            }
        });
    }
    
    // Analyze button
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            generateStreamRecommendations();
        });
    }
    
    // Restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', function() {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
            uploadedFile = null;
            initUploadArea();
        });
    }
    
    function generateStreamRecommendations() {
        const streamResults = document.getElementById('streamResults');
        streamResults.innerHTML = '';
        
        // In a real application, this would be based on the uploaded results
        // For demo purposes, we'll use static data
        const streams = [
            {
                name: "Science Stream",
                description: "Focus on Mathematics, Physical Sciences, and Life Sciences",
                schools: [
                    "Nelspruit High School, Nelspruit",
                    "Hoërskool Bergvlam, Nelspruit",
                    "Lowveld High School, Nelspruit",
                    "Hoërskool Rob Ferreira, Nelspruit"
                ]
            },
            {
                name: "Commerce Stream",
                description: "Focus on Accounting, Business Studies, and Economics",
                schools: [
                    "Hoërskool Ligteland, Nelspruit",
                    "Reyno Ridge College, Nelspruit",
                    "Uplands College, White River",
                    "Penryn College, Nelspruit"
                ]
            },
            {
                name: "Arts & Humanities Stream",
                description: "Focus on Languages, History, and Geography",
                schools: [
                    "Hoërskool Nelspruit, Nelspruit",
                    "Curro Nelspruit, Nelspruit",
                    "Bella Vista High School, Nelspruit",
                    "Ermelo High School, Ermelo"
                ]
            },
            {
                name: "Technical Stream",
                description: "Focus on Engineering, Technology and Design",
                schools: [
                    "Technical High School, Middelburg",
                    "Witbank High School, Witbank",
                    "Hoër Tegniese Skool Nelspruit, Nelspruit",
                    "Ehlanzeni Technical College, Nelspruit"
                ]
            }
        ];
        
        streams.forEach(stream => {
            const streamElement = document.createElement('div');
            streamElement.className = 'stream-card';
            
            let schoolsHTML = '';
            stream.schools.forEach(school => {
                schoolsHTML += `<div class="school-item">${school}</div>`;
            });
            
            streamElement.innerHTML = `
                <h3>${stream.name}</h3>
                <p>${stream.description}</p>
                <div class="school-list">
                    <h4>Available at these schools in Mpumalanga:</h4>
                    ${schoolsHTML}
                </div>
            `;
            
            streamResults.appendChild(streamElement);
        });
    }
}

// Grade 11-12 Page Initialization
function initGrade11_12Page() {
    const resultsFile = document.getElementById('resultsFile');
    const calculateBtn = document.getElementById('calculateBtn');
    const newCalculationBtn = document.getElementById('newCalculationBtn');
    
    // File upload handling
    if (resultsFile) {
        resultsFile.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFile = e.target.files[0];
                calculateBtn.disabled = false;
                
                // Update upload area text
                const uploadArea = document.getElementById('uploadArea');
                uploadArea.innerHTML = `
                    <p>File uploaded: ${uploadedFile.name}</p>
                    <button class="btn" id="changeFileBtn">Change File</button>
                `;
                
                document.getElementById('changeFileBtn').addEventListener('click', function() {
                    resultsFile.value = '';
                    uploadedFile = null;
                    calculateBtn.disabled = true;
                    initUploadArea();
                });
            }
        });
    }
    
    // Initialize upload area
    function initUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <p>Drag & drop your results file here or</p>
            <input type="file" id="resultsFile" accept=".pdf,.jpg,.jpeg,.png">
            <label for="resultsFile" class="btn">Choose File</label>
            <p class="file-info">Supported formats: PDF, JPG, PNG</p>
        `;
        
        // Re-attach event listener
        document.getElementById('resultsFile').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                uploadedFile = e.target.files[0];
                calculateBtn.disabled = false;
                
                // Update upload area text
                const uploadArea = document.getElementById('uploadArea');
                uploadArea.innerHTML = `
                    <p>File uploaded: ${uploadedFile.name}</p>
                    <button class="btn" id="changeFileBtn">Change File</button>
                `;
                
                document.getElementById('changeFileBtn').addEventListener('click', function() {
                    resultsFile.value = '';
                    uploadedFile = null;
                    calculateBtn.disabled = true;
                    initUploadArea();
                });
            }
        });
    }
    
    // Calculate button
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            calculateAPSAndRecommendations();
        });
    }
    
    // New calculation button
    if (newCalculationBtn) {
        newCalculationBtn.addEventListener('click', function() {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
            uploadedFile = null;
            initUploadArea();
        });
    }
    
    function calculateAPSAndRecommendations() {
        // In a real application, this would analyze the uploaded results
        // For demo purposes, we'll generate random APS and recommendations
        
        const apsValue = Math.floor(Math.random() * 15) + 20; // Random APS between 20-35
        document.getElementById('apsValue').textContent = apsValue;
        
        generateCourseRecommendations(apsValue);
        generateSkillRecommendations();
    }
    
    function generateCourseRecommendations(aps) {
        const courseList = document.getElementById('courseList');
        courseList.innerHTML = '';
        
        // Course recommendations based on APS score
        let courses = [];
        
        if (aps >= 30) {
            courses = [
                { name: "Medicine", description: "Bachelor of Medicine and Bachelor of Surgery" },
                { name: "Engineering", description: "BSc in various engineering disciplines" },
                { name: "Computer Science", description: "BSc in Computer Science or IT" },
                { name: "Actuarial Science", description: "BSc in Actuarial Science" },
                { name: "Law", description: "LLB degree" }
            ];
        } else if (aps >= 25) {
            courses = [
                { name: "Commerce", description: "BCom in Accounting, Finance or Economics" },
                { name: "Health Sciences", description: "BSc in Nursing, Pharmacy or Physiotherapy" },
                { name: "Education", description: "Bachelor of Education" },
                { name: "Information Technology", description: "BSc or Diploma in IT" },
                { name: "Marketing", description: "BCom in Marketing or Business Management" }
            ];
        } else if (aps >= 20) {
            courses = [
                { name: "Tourism Management", description: "Diploma in Tourism Management" },
                { name: "Hospitality", description: "Diploma in Hospitality Management" },
                { name: "Public Relations", description: "Diploma in Public Relations" },
                { name: "Early Childhood Development", description: "Diploma in ECD" },
                { name: "Technical Drawing", description: "Diploma in Technical Drawing" }
            ];
        } else {
            courses = [
                { name: "Skills Development Programs", description: "Various short courses and certificates" },
                { name: "Entrepreneurship", description: "Small business management courses" },
                { name: "Vocational Training", description: "Trade-specific training programs" },
                { name: "Digital Skills", description: "Basic computer literacy and office skills" }
            ];
        }
        
        courses.forEach(course => {
            const courseElement = document.createElement('div');
            courseElement.className = 'recommendation-item';
            courseElement.innerHTML = `
                <h4>${course.name}</h4>
                <p>${course.description}</p>
            `;
            courseList.appendChild(courseElement);
        });
    }
    
    function generateSkillRecommendations() {
        const skillList = document.getElementById('skillList');
        skillList.innerHTML = '';
        
        // In-demand skills based on current market trends
        const skills = [
            { name: "Digital Marketing", description: "SEO, social media, and online advertising skills" },
            { name: "Data Analysis", description: "Interpreting data to make business decisions" },
            { name: "Programming", description: "Coding skills in Python, JavaScript, or other languages" },
            { name: "Project Management", description: "Organizing and managing projects effectively" },
            { name: "Customer Service", description: "Excellent communication and problem-solving for clients" },
            { name: "Financial Literacy", description: "Understanding budgets, investments, and financial planning" }
        ];
        
        skills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'recommendation-item';
            skillElement.innerHTML = `
                <h4>${skill.name}</h4>
                <p>${skill.description}</p>
            `;
            skillList.appendChild(skillElement);
        });
    }
}

// Global function for removing skills (used in Grade 9 page)
function removeSkill(skill) {
    currentSkills = currentSkills.filter(s => s !== skill);
    document.getElementById('skillsList').innerHTML = '';
    currentSkills.forEach(skill => {
        const skillElement = document.createElement('div');
        skillElement.className = 'skill-tag';
        skillElement.innerHTML = `
            ${skill}
            <button type="button" onclick="removeSkill('${skill}')">×</button>
        `;
        document.getElementById('skillsList').appendChild(skillElement);
    });
}