document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatContainer = document.getElementById('chatContainer');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const subjectBtns = document.querySelectorAll('.subject-btn');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const videoInfo = document.getElementById('videoInfo');
    const videoContainer = document.getElementById('videoContainer');
    const videosGenerated = document.getElementById('videosGenerated');
    const totalDownloads = document.getElementById('totalDownloads');
    
    // State variables
    let currentSubject = '';
    let currentTopic = '';
    let currentRequestId = null;
    let isGeneratingVideo = false;
    let generatedVideoUrl = null;
    let stats = {
        videosGenerated: 0,
        totalDownloads: 0
    };

    // API Base URL
    const API_BASE = window.location.origin + '/api';

    // Initialize
    loadStats();
    updateStatsDisplay();

    // Add message to chat
    function addMessage(message, isUser, subject = '') {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        
        if (!isUser) {
            const messageHeader = document.createElement('div');
            messageHeader.className = 'message-header';
            messageHeader.innerHTML = `
                <i class="fas fa-robot"></i>
                <span>AI Learning Assistant</span>
            `;
            messageDiv.appendChild(messageHeader);
        }
        
        const messageText = document.createElement('p');
        messageText.textContent = message;
        
        messageDiv.appendChild(messageText);
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Update current topic if this is a user message with a subject
        if (isUser && subject) {
            currentTopic = message;
        }
    }

    // Handle subject button clicks
    subjectBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const subject = this.getAttribute('data-subject');
            currentSubject = subject;
            
            // Update user input with example
            const examples = {
                chemistry: "Explain chemical reactions with practical examples",
                physics: "Demonstrate Newton's laws of motion", 
                biology: "Explain cellular respiration process",
                math: "Show geometric proofs step by step",
                history: "Explain ancient civilizations",
                geography: "Demonstrate weather patterns",
                literature: "Analyze Shakespearean sonnets", 
                art: "Demonstrate perspective drawing"
            };
            
            userInput.value = examples[subject] || `Explain ${subject} concepts`;
            
            // Add message to chat
            addMessage(`I want to learn about ${subject}: ${userInput.value}`, true, subject);
            
            // Show bot response after a short delay
            setTimeout(() => {
                addMessage(`I'll create a custom educational video about ${subject} specifically for you! I'll generate original content with animations, explanations, and practical examples.`, false);
                updateVideoInfo(subject, userInput.value);
                generateBtn.disabled = false;
                downloadBtn.disabled = true;
            }, 1000);
        });
    });

    // Handle send button click
    sendBtn.addEventListener('click', function() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            
            // Determine subject from message
            let detectedSubject = 'general';
            for (const subject in subjectResponses) {
                if (message.toLowerCase().includes(subject)) {
                    detectedSubject = subject;
                    break;
                }
            }
            
            currentSubject = detectedSubject;
            currentTopic = message;
            
            // Show bot response after a short delay
            setTimeout(() => {
                const response = `I'll create a custom educational video about "${message}" just for you! I'll generate original animations, clear explanations, and practical examples to help you understand this topic thoroughly.`;
                addMessage(response, false);
                
                updateVideoInfo(detectedSubject, message);
                generateBtn.disabled = false;
                downloadBtn.disabled = true;
            }, 1000);
        }
    });

    // Handle Enter key in input
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });

    // Update video information display
    function updateVideoInfo(subject, customTopic = '') {
        videoInfo.innerHTML = `
            <div class="video-details">
                <h4>Custom Video Generation</h4>
                <p><strong>Topic:</strong> ${customTopic}</p>
                <p><strong>Subject:</strong> ${subject.charAt(0).toUpperCase() + subject.slice(1)}</p>
                <p><strong>Features:</strong></p>
                <ul>
                    <li>AI-generated educational script</li>
                    <li>Custom animations and visuals</li>
                    <li>Professional voiceover narration</li>
                    <li>Real-world examples</li>
                    <li>Downloadable HD quality</li>
                </ul>
                <p><em>This will generate a completely original video tailored to your learning needs!</em></p>
            </div>
        `;
    }

    // Handle generate video button (REAL GENERATION)
    generateBtn.addEventListener('click', async function() {
        if (!currentSubject || !currentTopic) {
            alert("Please select a subject or ask a question first.");
            return;
        }
        
        if (isGeneratingVideo) return;
        
        isGeneratingVideo = true;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="loading"></div> Generating Custom Video...';
        
        // Show detailed loading state
        videoContainer.innerHTML = `
            <div class="video-generating">
                <div class="video-placeholder">
                    <div class="loading" style="width: 60px; height: 60px; border-width: 4px; margin-bottom: 1rem;"></div>
                    <h4>Creating Your Custom Educational Video</h4>
                    <p>This may take 2-3 minutes as we generate original content...</p>
                    <div class="generation-steps">
                        <div class="step active">
                            <i class="fas fa-pen"></i>
                            <span>Writing educational script</span>
                        </div>
                        <div class="step">
                            <i class="fas fa-palette"></i>
                            <span>Creating visuals & animations</span>
                        </div>
                        <div class="step">
                            <i class="fas fa-microphone"></i>
                            <span>Generating voiceover</span>
                        </div>
                        <div class="step">
                            <i class="fas fa-film"></i>
                            <span>Compiling final video</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        try {
            // Call the REAL video generation API
            const response = await fetch(`${API_BASE}/learning/generate-custom-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId: `student-${Date.now()}`,
                    subject: currentSubject,
                    topic: currentTopic,
                    learningObjectives: `Explain ${currentTopic} clearly with practical examples and real-world applications`,
                    style: 'educational'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentRequestId = data.requestId;
                
                // Start polling for video status
                pollVideoStatus(data.requestId);
                
            } else {
                throw new Error(data.message || 'Failed to start video generation');
            }
            
        } catch (error) {
            console.error('Error starting video generation:', error);
            alert('Error starting video generation: ' + error.message);
            resetGenerateButton();
        }
    });

    // Poll for video generation status
    async function pollVideoStatus(requestId) {
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        
        const poll = async () => {
            try {
                const response = await fetch(`${API_BASE}/learning/video-status/${requestId}`);
                const data = await response.json();
                
                if (data.success) {
                    updateGenerationProgress(data.status);
                    
                    if (data.status === 'completed') {
                        // Video generation completed
                        showGeneratedVideo(data.videoUrl, data.metadata);
                        generatedVideoUrl = data.downloadUrl;
                        downloadBtn.disabled = false;
                        isGeneratingVideo = false;
                        
                        // Update stats
                        stats.videosGenerated++;
                        updateStatsDisplay();
                        saveStats();
                        
                        // Add success message to chat
                        addMessage(`Your custom educational video about "${currentTopic}" has been generated successfully! It includes original animations, clear explanations, and is ready for download.`, false);
                        
                    } else if (data.status === 'failed') {
                        // Video generation failed
                        showGenerationError(data.error);
                        resetGenerateButton();
                    } else {
                        // Still generating, continue polling
                        attempts++;
                        if (attempts < maxAttempts) {
                            setTimeout(poll, 5000); // Poll every 5 seconds
                        } else {
                            showGenerationError('Video generation timed out');
                            resetGenerateButton();
                        }
                    }
                }
            } catch (error) {
                console.error('Error polling video status:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                } else {
                    showGenerationError('Failed to check video generation status');
                    resetGenerateButton();
                }
            }
        };
        
        poll();
    }

    // Update generation progress UI
    function updateGenerationProgress(status) {
        const steps = document.querySelectorAll('.generation-steps .step');
        
        if (status === 'generating') {
            steps[0].classList.add('completed');
            steps[1].classList.add('active');
        } else if (status === 'processing_visuals') {
            steps[1].classList.add('completed');
            steps[2].classList.add('active');
        } else if (status === 'generating_audio') {
            steps[2].classList.add('completed');
            steps[3].classList.add('active');
        }
    }

    // Show generated video
    function showGeneratedVideo(videoUrl, metadata) {
        videoContainer.innerHTML = `
            <div class="video-success">
                <video class="video-player" controls autoplay>
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-meta">
                    <p><strong>Duration:</strong> ${metadata.duration} | <strong>Size:</strong> ${metadata.size}</p>
                    <p><strong>Quality:</strong> ${metadata.resolution}</p>
                </div>
            </div>
        `;
        videoContainer.classList.add('has-video');
        
        videoInfo.innerHTML = `
            <div class="video-details">
                <h4>Custom Video Generated Successfully! 🎉</h4>
                <p><strong>Topic:</strong> ${currentTopic}</p>
                <p><strong>Features Included:</strong></p>
                <ul>
                    <li>AI-generated educational script</li>
                    <li>${metadata.scenes} custom visual scenes</li>
                    <li>Professional voiceover narration</li>
                    <li>Real-world applications</li>
                    <li>HD ${metadata.resolution} quality</li>
                </ul>
                <p><em>Your custom educational video is ready! Download it for offline learning.</em></p>
            </div>
        `;
        
        generateBtn.innerHTML = '<i class="fas fa-play-circle"></i> Generate Another Video';
        generateBtn.disabled = false;
    }

    // Show generation error
    function showGenerationError(error) {
        videoContainer.innerHTML = `
            <div class="video-error">
                <div class="video-placeholder">
                    <i class="fas fa-exclamation-triangle fa-3x" style="color: #e53e3e; margin-bottom: 1rem;"></i>
                    <h4>Video Generation Failed</h4>
                    <p>We encountered an error while generating your video:</p>
                    <p style="color: #e53e3e; font-size: 0.9rem;">${error}</p>
                    <button class="btn-primary" onclick="retryVideoGeneration()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }

    // Reset generate button
    function resetGenerateButton() {
        generateBtn.innerHTML = '<i class="fas fa-play-circle"></i> Generate Video';
        generateBtn.disabled = false;
        isGeneratingVideo = false;
    }

    // Handle download button
    downloadBtn.addEventListener('click', async function() {
        if (!currentRequestId) {
            alert("No video available for download. Please generate a video first.");
            return;
        }
        
        // Show downloading state
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<div class="loading"></div> Downloading...';
        downloadBtn.disabled = true;
        
        try {
            // Download the custom video
            const response = await fetch(`${API_BASE}/learning/download-custom-video/${currentRequestId}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${currentSubject}_${currentTopic.replace(/[^a-z0-9]/gi, '_')}.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                // Update stats
                stats.totalDownloads++;
                updateStatsDisplay();
                saveStats();
                
                downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
                downloadBtn.classList.add('download-success');
                
                // Add download confirmation to chat
                addMessage(`I've downloaded my custom "${currentTopic}" video for offline learning! The file has been saved to my device.`, true);
                
                setTimeout(() => {
                    addMessage("Excellent! You can now watch your custom educational video anytime without internet. The video includes original animations and explanations specifically created for your learning needs.", false);
                }, 1000);
                
                // Reset download button after 2 seconds
                setTimeout(() => {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.classList.remove('download-success');
                    downloadBtn.disabled = false;
                }, 2000);
                
            } else {
                throw new Error('Download failed');
            }
            
        } catch (error) {
            console.error('Error downloading video:', error);
            alert('Error downloading video: ' + error.message);
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }
    });

    // Stats management
    function loadStats() {
        const savedStats = localStorage.getItem('learningChatboardStats');
        if (savedStats) {
            stats = JSON.parse(savedStats);
        }
    }

    function saveStats() {
        localStorage.setItem('learningChatboardStats', JSON.stringify(stats));
    }

    function updateStatsDisplay() {
        videosGenerated.textContent = stats.videosGenerated;
        totalDownloads.textContent = stats.totalDownloads;
    }

    // Global function for retry
    window.retryVideoGeneration = function() {
        generateBtn.click();
    };

    // Initialize button states
    generateBtn.disabled = true;
    downloadBtn.disabled = true;
});