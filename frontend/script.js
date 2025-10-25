// Global variables
let currentSkills = [];
let uploadedFile = null;
let lastStudentId = null;
let lastStudentName = null;
let lastStudentEmail = null;
const API_BASE = window.location.origin + '/api';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initHomePage();
    if (window.location.pathname.includes('grade9.html')) initGrade9Page();
    if (window.location.pathname.includes('grade10.html')) initGrade10Page();
    if (window.location.pathname.includes('grade11-12.html')) initGrade11_12Page();
});

// Grade 9 Page Initialization
function initGrade9Page() {
    const step1Next = document.getElementById('step1Next');
    const resultsFile = document.getElementById('resultsFile');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const skillSelect = document.getElementById('skillSelect');
    const step2Next = document.getElementById('step2Next');
    
    // File upload handling
    if (resultsFile && step1Next) {
        resultsFile.addEventListener('change', function(e) {
            handleFileUpload(e, step1Next);
        });
    }
    
    // Step navigation
    if (step1Next) {
        step1Next.addEventListener('click', function() {
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
        });
    }
    
    const step2Prev = document.getElementById('step2Prev');
    if (step2Prev) {
        step2Prev.addEventListener('click', function() {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
        });
    }
    
    if (step2Next) {
        step2Next.addEventListener('click', async function() {
            if (currentSkills.length < 2) {
                alert('Please select at least 2 skills before proceeding.');
                return;
            }
            await submitGrade9Data();
        });
    }
    
    const step3Prev = document.getElementById('step3Prev');
    if (step3Prev) {
        step3Prev.addEventListener('click', function() {
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step2').classList.add('active');
        });
    }
    
    const step3Finish = document.getElementById('step3Finish');
    if (step3Finish) {
        step3Finish.addEventListener('click', function() {
            alert('Thank you for using our career guidance portal!');
            location.reload();
        });
    }
    
    // Skills management with dropdown
    if (addSkillBtn && skillSelect) {
        addSkillBtn.addEventListener('click', addSkillFromDropdown);
    }
    
    if (skillSelect) {
        skillSelect.addEventListener('change', function() {
            if (this.value) {
                addSkillFromDropdown();
            }
        });
    }
    
    function addSkillFromDropdown() {
        const skill = skillSelect.value.trim();
        if (skill && !currentSkills.includes(skill.toLowerCase())) {
            currentSkills.push(skill.toLowerCase());
            renderSkillsList();
            skillSelect.value = ''; // Reset dropdown
            updateSkillCounter();
            // Enable Next button if minimum 2 skills
            if (step2Next && currentSkills.length >= 2) {
                step2Next.disabled = false;
            }
        } else if (skill && currentSkills.includes(skill.toLowerCase())) {
            alert('This skill has already been added.');
            skillSelect.value = '';
        }
    }
    
    function updateSkillCounter() {
        const counter = document.getElementById('skillCounter');
        if (counter) {
            const count = currentSkills.length;
            const counterText = count >= 2 
                ? `<strong style="color: green;">${count}</strong> (minimum met ✓)` 
                : `<strong style="color: red;">${count}</strong> (minimum 2 required)`;
            counter.innerHTML = `Skills selected: ${counterText}`;
        }
    }
    
    function renderSkillsList() {
        const skillsList = document.getElementById('skillsList');
        if (!skillsList) return;
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
        updateSkillCounter();
    }
    
    window.removeSkill = function(skill) {
        currentSkills = currentSkills.filter(s => s !== skill);
        renderSkillsList();
        // Disable Next button if below minimum
        if (step2Next && currentSkills.length < 2) {
            step2Next.disabled = true;
        }
    };
}

async function submitGrade9Data() {
    try {
        const studentId = 'GR9-' + Date.now();
        const studentName = prompt("Please enter your full name:") || "Anonymous Student";
        const studentEmail = prompt("Please enter your email:") || "no-email@example.com";
        
        if (!uploadedFile) {
            alert('Please upload your results file first.');
            return;
        }

        // Show loading state
        const step2Next = document.getElementById('step2Next');
        step2Next.disabled = true;
        step2Next.textContent = 'Processing...';

    // Save for later (allow adding skills after analysis)
    lastStudentId = studentId;
    lastStudentName = studentName;
    lastStudentEmail = studentEmail;

    // Create form data for file upload
        const formData = new FormData();
        formData.append('resultsFile', uploadedFile);
        formData.append('studentId', studentId);
        formData.append('name', studentName);
        formData.append('email', studentEmail);
        formData.append('currentSkills', currentSkills.join(','));

        const response = await fetch(`${API_BASE}/grade9/upload-results`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
            displayGrade9Results(data);
        } else {
            throw new Error(data.error || 'Failed to process results');
        }
        
    } catch (error) {
        console.error('Error submitting grade 9 data:', error);
        alert('Error processing your results: ' + error.message + '\n\nPlease try again or contact support if the problem persists.');
    } finally {
        // Reset button
        const step2Next = document.getElementById('step2Next');
        if (step2Next) {
            step2Next.disabled = false;
            step2Next.textContent = 'Next';
        }
    }
}

function displayGrade9Results(data) {
    const recommendationsContainer = document.getElementById('skillRecommendations');
    if (!recommendationsContainer) return;

    let resultsHTML = `
        <div class="results-header">
            <h3>🎓 Grade 9 Results Analysis</h3>
            <div class="performance-summary">
                <div class="summary-card">
                    <h4>Overall Performance</h4>
                    <div class="performance-score">
                        <span class="emoji">${data.summary.performanceEmoji}</span>
                        <span class="score">${data.summary.overallAverage}%</span>
                        <span class="level">${data.summary.performanceLevel}</span>
                    </div>
                </div>
                <div class="summary-card">
                    <h4>APS Score</h4>
                    <div class="aps-score-display">
                        <span class="aps-value">${data.apsScore}</span>
                        <span class="aps-label">Points</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="key-message">
            <h4>📋 Analysis Summary</h4>
            <p>${data.summary.keyMessage}</p>
        </div>

        <div class="subjects-breakdown">
            <h4>📊 Subject Performance</h4>
            <div class="subjects-grid">
    `;

    data.subjects.forEach(subject => {
        resultsHTML += `
            <div class="subject-card">
                <div class="subject-header">
                    <span class="subject-name">${subject.name}</span>
                    <span class="subject-symbol">${getSymbol(subject.level)}</span>
                </div>
                <div class="subject-mark">${subject.mark}%</div>
                <div class="subject-level">${subject.level}</div>
            </div>
        `;
    });

    resultsHTML += `
            </div>
        </div>

        <div class="skill-recommendations">
            <h4>💡 Recommended Skills to Develop</h4>
            <div class="skills-grid">
    `;

    data.recommendations.forEach(skill => {
        resultsHTML += `
            <div class="skill-card">
                <div class="skill-header">
                    <h5>${skill.name}</h5>
                    <span class="demand-badge">${skill.demandLevel} Demand</span>
                </div>
                <p class="skill-description">${skill.description}</p>
                <div class="skill-resources">
                    <strong>Resources:</strong> ${(skill.suggestedResources || skill.resources || []).join(', ')}
                </div>
            </div>
        `;
    });

    resultsHTML += `
            </div>
        </div>
    `;

    recommendationsContainer.innerHTML = resultsHTML;
}

function getSymbol(level) {
    const symbols = {
        'Distinction': '⭐',
        'Merit': '👍',
        'Achieved': '✅',
        'Satisfactory': '➖',
        'Elementary': '⚠️',
        'Not Achieved': '📚'
    };
    return symbols[level] || '❓';
}

// Common utility functions
function handleFileUpload(e, buttonElement) {
    if (e.target.files.length > 0) {
        uploadedFile = e.target.files[0];
        buttonElement.disabled = false;
        
        // Update upload area text
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <p>File uploaded: ${uploadedFile.name}</p>
                <button class="btn" id="changeFileBtn">Change File</button>
            `;
            
            document.getElementById('changeFileBtn').addEventListener('click', function() {
                e.target.value = '';
                uploadedFile = null;
                buttonElement.disabled = true;
                initUploadArea();
            });
        }
    }
}

function initUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;
    
    uploadArea.innerHTML = `
        <p>Drag & drop your results file here or</p>
        <input type="file" id="resultsFile" accept=".pdf,.jpg,.jpeg,.png">
        <label for="resultsFile" class="btn">Choose File</label>
        <p class="file-info">Supported formats: PDF, JPG, PNG</p>
    `;
    
    // Re-attach event listener
    const resultsFile = document.getElementById('resultsFile');
    if (resultsFile) {
        let buttonElement;
        if (window.location.pathname.includes('grade9.html')) {
            buttonElement = document.getElementById('step1Next');
        } else if (window.location.pathname.includes('grade10.html')) {
            buttonElement = document.getElementById('analyzeBtn');
        } else if (window.location.pathname.includes('grade11-12.html')) {
            buttonElement = document.getElementById('calculateBtn');
        }
        
        if (buttonElement) {
            resultsFile.addEventListener('change', function(e) {
                handleFileUpload(e, buttonElement);
            });
        }
    }
}

// Initialize other pages (simplified versions)
function initHomePage() {
    // Home page initialization
}

function initGrade10Page() {
    const resultsFile = document.getElementById('resultsFile');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    if (resultsFile && analyzeBtn) {
        resultsFile.addEventListener('change', function(e) {
            handleFileUpload(e, analyzeBtn);
        });
    }
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            alert('Grade 10 analysis would be processed here');
        });
    }
}

function initGrade11_12Page() {
    const resultsFile = document.getElementById('resultsFile');
    const calculateBtn = document.getElementById('calculateBtn');
    
    if (resultsFile && calculateBtn) {
        resultsFile.addEventListener('change', function(e) {
            handleFileUpload(e, calculateBtn);
        });
    }
    
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            alert('Grade 11-12 analysis would be processed here');
        });
    }
}

// Add skill after analysis and save to backend for the current student
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'postAddSkillBtn') {
        const select = document.getElementById('postSkillSelect');
        if (!select) return;
        const skill = select.value.trim();
        if (!skill) return alert('Please select a skill from the dropdown');
        // append to currentSkills and send to backend
        if (!lastStudentId) return alert('No student session found. Please analyze your results first.');

        // Update local list and save
        if (!currentSkills.includes(skill.toLowerCase())) {
            currentSkills.push(skill.toLowerCase());
        } else {
            alert('This skill has already been added.');
            select.value = '';
            return;
        }

        // Call backend to save skills (replace=false so it appends)
        fetch(`${API_BASE}/grade9/students/${encodeURIComponent(lastStudentId)}/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skills: currentSkills })
        })
        .then(resp => resp.json())
        .then(result => {
            if (result.success) {
                // Refresh recommendations area with returned recommendations
                if (result.recommendations) {
                    displayGrade9Results({
                        summary: { performanceEmoji: ' ', overallAverage: result.overallAverage || 0, performanceLevel: '' },
                        apsScore: result.apsScore || 0,
                        subjects: result.subjects || [],
                        recommendations: result.recommendations
                    });
                } else {
                    // If backend returned skills but not full recs, fetch recommendations endpoint
                    fetch(`${API_BASE}/grade9/students/${encodeURIComponent(lastStudentId)}/recommendations`)
                        .then(r=>r.json())
                        .then(rdata => { if (rdata.success) displayGrade9Results({ summary: { performanceEmoji: ' ', overallAverage: rdata.overallAverage || 0, performanceLevel: '' }, apsScore: rdata.apsScore || 0, subjects: rdata.subjects || [], recommendations: rdata.recommendations }); })
                        .catch(err => console.error('Failed to refresh recommendations:', err));
                }

                // Reset select and show confirmation
                select.value = '';
                alert('✓ Skill added successfully! Recommendations refreshed.');
            } else {
                alert('Failed to save skills: ' + (result.error || 'unknown'));
            }
        })
        .catch(err => {
            console.error('Error saving skills:', err);
            alert('Error saving skills: ' + err.message);
        });
    }
});