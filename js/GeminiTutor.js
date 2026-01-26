/**
 * GeminiTutor - AI-powered physics tutor for Electromagnetic Induction learning
 * Integrates with Google's Gemini API to provide personalized tutoring
 */

export class GeminiTutor {
    constructor(app) {
        this.app = app;
        this.apiKey = null;
        this.isOpen = false;
        this.messages = [];
        this.isLoading = false;
        this.currentModule = null;

        // Student progress tracking
        this.studentProgress = {
            questionsAsked: 0,
            topicsExplored: [],
            weakTopics: [],
            hintsUsed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0
        };

        // Assistance level settings
        this.assistanceLevel = 1; // 1 = Hint only, 2 = Method outline, 3 = Full solution
        this.examMode = false;

        // Explanation style preference
        this.explanationStyle = 'conceptual'; // conceptual, mathematical, step-by-step, visual, simplified

        // Initialize UI
        this.createChatUI();
        this.loadApiKey();
    }

    /**
     * Load API key - use built-in key or from localStorage
     */
    loadApiKey() {
        // Built-in API key for the application
        const builtInKey = 'AIzaSyAVcUmIpvWKrbB9SF_aSwUTC_C9fki-h8M';

        // Try to get from localStorage first (user may have set custom key)
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey && storedKey !== 'PLACEHOLDER_API_KEY') {
            this.apiKey = storedKey;
        } else {
            // Use built-in key
            this.apiKey = builtInKey;
        }
    }

    /**
     * Set API key and store it
     */
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    /**
     * Create the chat UI elements
     */
    createChatUI() {
        // Create chat button
        this.chatButton = document.createElement('button');
        this.chatButton.id = 'gemini-chat-btn';
        this.chatButton.className = 'gemini-chat-btn';
        this.chatButton.innerHTML = `
            <div class="gemini-btn-content">
                <svg class="gemini-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="gemini-btn-label">EM-Vee</span>
            </div>
        `;
        this.chatButton.addEventListener('click', () => this.toggleChat());
        document.body.appendChild(this.chatButton);

        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'gemini-chat-container';
        this.chatContainer.className = 'gemini-chat-container hidden';
        this.chatContainer.innerHTML = this.getChatHTML();
        document.body.appendChild(this.chatContainer);

        // Setup event listeners
        this.setupChatListeners();

        // Add styles
        this.addStyles();
    }

    /**
     * Get the chat HTML template
     */
    getChatHTML() {
        return `
            <div class="gemini-chat-header">
                <div class="gemini-header-left">
                    <div class="gemini-avatar">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="gemini-header-info">
                        <h3>EM-Vee</h3>
                        <span class="gemini-status">Ready to help</span>
                    </div>
                </div>
                <div class="gemini-header-controls">
                    <button id="gemini-settings-btn" class="gemini-control-btn" title="Settings">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                    </button>
                    <button id="gemini-minimize-btn" class="gemini-control-btn" title="Minimize">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"/>
                        </svg>
                    </button>
                    <button id="gemini-close-btn" class="gemini-control-btn" title="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Settings Panel (collapsible, hidden by default) -->
            <div id="gemini-settings-panel" class="gemini-settings-panel hidden">
                <div class="gemini-settings-header">
                    <span>⚙️ Settings</span>
                    <button id="gemini-close-settings" class="gemini-close-settings-btn">×</button>
                </div>
                
                <div class="gemini-settings-section">
                    <h4>📚 Explanation Style</h4>
                    <div class="gemini-style-options">
                        <button class="gemini-style-btn active" data-style="conceptual">💭 Conceptual</button>
                        <button class="gemini-style-btn" data-style="mathematical">📐 Mathematical</button>
                        <button class="gemini-style-btn" data-style="step-by-step">📝 Step-by-Step</button>
                        <button class="gemini-style-btn" data-style="visual">🎨 Visual</button>
                        <button class="gemini-style-btn" data-style="simplified">🌱 Simplified</button>
                    </div>
                </div>
                
                <div class="gemini-settings-section">
                    <h4>🎯 Exam Mode</h4>
                    <label class="gemini-checkbox">
                        <input type="checkbox" id="gemini-exam-mode">
                        <span>Enable Exam Practice Mode</span>
                    </label>
                    <div class="gemini-level-options" id="gemini-exam-options" style="display: none;">
                        <label class="gemini-radio">
                            <input type="radio" name="assistance-level" value="1" checked>
                            <span>Level 1: Hints Only</span>
                        </label>
                        <label class="gemini-radio">
                            <input type="radio" name="assistance-level" value="2">
                            <span>Level 2: Method Outline</span>
                        </label>
                        <label class="gemini-radio">
                            <input type="radio" name="assistance-level" value="3">
                            <span>Level 3: Full Solution</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- Messages Area -->
            <div id="gemini-messages" class="gemini-messages">
                <div class="gemini-welcome-message">
                    <div class="gemini-welcome-icon">⚡</div>
                    <h4>Welcome to EM-Vee!</h4>
                    <p>I'm here to help you understand electromagnetic concepts. Ask me anything about:</p>
                    <div class="gemini-topic-chips">
                        <button class="gemini-chip" data-topic="Faraday's Law">Faraday's Law</button>
                        <button class="gemini-chip" data-topic="Lenz's Law">Lenz's Law</button>
                        <button class="gemini-chip" data-topic="Solenoids">Solenoids</button>
                        <button class="gemini-chip" data-topic="Transformers">Transformers</button>
                        <button class="gemini-chip" data-topic="Magnetic Flux">Magnetic Flux</button>
                        <button class="gemini-chip" data-topic="Eddy Currents">Eddy Currents</button>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="gemini-quick-actions">
                <button class="gemini-quick-btn" data-action="explain">📖 Explain Current Simulation</button>
                <button class="gemini-quick-btn" data-action="quiz">❓ Quiz Me</button>
                <button class="gemini-quick-btn" data-action="formula">📐 Show Formulas</button>
            </div>
            
            <!-- Input Area -->
            <div class="gemini-input-area">
                <div class="gemini-input-wrapper">
                    <textarea id="gemini-input" placeholder="Ask your physics question..." rows="1"></textarea>
                    <button id="gemini-send-btn" class="gemini-send-btn" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                </div>
                <div class="gemini-input-hint">
                    Press Enter to send, Shift+Enter for new line
                </div>
            </div>
        `;
    }

    /**
     * Setup chat event listeners
     */
    setupChatListeners() {
        // Close button
        document.getElementById('gemini-close-btn').addEventListener('click', () => {
            this.toggleChat();
        });

        // Minimize button
        document.getElementById('gemini-minimize-btn').addEventListener('click', () => {
            this.chatContainer.classList.toggle('minimized');
        });

        // Settings button
        document.getElementById('gemini-settings-btn').addEventListener('click', () => {
            document.getElementById('gemini-settings-panel').classList.toggle('hidden');
        });

        // Close settings button
        const closeSettingsBtn = document.getElementById('gemini-close-settings');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                document.getElementById('gemini-settings-panel').classList.add('hidden');
            });
        }

        // Explanation style buttons
        document.querySelectorAll('.gemini-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gemini-style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.explanationStyle = btn.dataset.style;
            });
        });

        // Assistance level
        document.querySelectorAll('input[name="assistance-level"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.assistanceLevel = parseInt(e.target.value);
            });
        });

        // Exam mode toggle - show/hide assistance level options
        document.getElementById('gemini-exam-mode').addEventListener('change', (e) => {
            this.examMode = e.target.checked;
            const examOptions = document.getElementById('gemini-exam-options');
            if (examOptions) {
                examOptions.style.display = e.target.checked ? 'flex' : 'none';
            }
        });

        // Topic chips
        document.querySelectorAll('.gemini-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const topic = chip.dataset.topic;
                this.askQuestion(`Explain ${topic} in the context of electromagnetic induction.`);
            });
        });

        // Quick action buttons
        document.querySelectorAll('.gemini-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleQuickAction(btn.dataset.action);
            });
        });

        // Input handling
        const input = document.getElementById('gemini-input');
        const sendBtn = document.getElementById('gemini-send-btn');

        input.addEventListener('input', () => {
            sendBtn.disabled = !input.value.trim();
            this.autoResizeTextarea(input);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.value.trim()) {
                    this.sendMessage();
                }
            }
        });

        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                this.sendMessage();
            }
        });
    }

    /**
     * Auto-resize textarea
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    /**
     * Toggle chat visibility
     */
    toggleChat() {
        this.isOpen = !this.isOpen;
        this.chatContainer.classList.toggle('hidden', !this.isOpen);
        this.chatButton.classList.toggle('active', this.isOpen);

        if (this.isOpen) {
            // Update current module context
            if (this.app && this.app.currentModule) {
                this.currentModule = this.app.currentModule.name;
            }
            // Focus input
            setTimeout(() => {
                document.getElementById('gemini-input')?.focus();
            }, 300);
        }
    }

    /**
     * Handle quick action buttons
     */
    handleQuickAction(action) {
        const moduleName = this.currentModule || 'barMagnet';

        switch (action) {
            case 'explain':
                this.askQuestion(`Explain the physics concepts demonstrated in the ${this.getModuleDisplayName(moduleName)} simulation. Focus on the key electromagnetic principles at work.`);
                break;
            case 'quiz':
                this.askQuestion(`Give me a challenging practice question about ${this.getModuleDisplayName(moduleName)}. Include the question and options if applicable.`);
                break;
            case 'formula':
                this.askQuestion(`What are the key formulas and equations related to ${this.getModuleDisplayName(moduleName)}? Present them clearly with explanations of each variable.`);
                break;
        }
    }

    /**
     * Get display name for module
     */
    getModuleDisplayName(moduleName) {
        const names = {
            barMagnet: 'Bar Magnet and Compass',
            solenoid: 'Solenoid',
            induction: 'Electromagnetic Induction',
            transformer: 'Transformer',
            lenz: "Lenz's Law",
            electromagnet: 'Electromagnet',
            magnetCutting: 'Magnet Cutting Experiment',
            assembly: 'Component Assembly'
        };
        return names[moduleName] || moduleName;
    }

    /**
     * Send a message
     */
    async sendMessage() {
        const input = document.getElementById('gemini-input');
        const message = input.value.trim();

        if (!message || this.isLoading) return;

        // Clear input
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('gemini-send-btn').disabled = true;

        // Add user message
        this.addMessage('user', message);

        // Track question
        this.studentProgress.questionsAsked++;

        // Ask the question
        await this.askQuestion(message, false);
    }

    /**
     * Ask a question to the AI
     */
    async askQuestion(question, addToChat = true) {
        if (!this.apiKey) {
            this.showSystemMessage('Please set your Gemini API key in the settings panel.');
            document.getElementById('gemini-settings-panel').classList.remove('hidden');
            return;
        }

        if (addToChat) {
            this.addMessage('user', question);
        }

        this.isLoading = true;
        this.showTypingIndicator();

        try {
            const response = await this.callGeminiAPI(question);
            this.hideTypingIndicator();
            this.addMessage('assistant', response);
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Gemini API error:', error);
            this.addMessage('assistant', `I apologize, but I encountered an error: ${error.message}. Please check your API key and try again.`);
        }

        this.isLoading = false;
    }

    /**
     * Call the Gemini API
     */
    async callGeminiAPI(userMessage) {
        const systemPrompt = this.buildSystemPrompt();

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: systemPrompt },
                            { text: userMessage }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        throw new Error('No response generated');
    }

    /**
     * Build the system prompt based on current context
     */
    buildSystemPrompt() {
        const moduleContext = this.currentModule ?
            `The student is currently viewing the "${this.getModuleDisplayName(this.currentModule)}" simulation.` :
            'The student is using an electromagnetic induction learning application.';

        const styleGuide = {
            conceptual: 'Focus on intuitive understanding and physical reasoning. Use analogies and real-world examples.',
            mathematical: 'Emphasize mathematical derivations and equations. Show all steps clearly.',
            'step-by-step': 'Break down explanations into numbered steps. Be methodical and thorough.',
            visual: 'Describe diagrams and visual representations. Use ASCII art for simple diagrams where helpful.',
            simplified: 'Use simple language suitable for beginners. Avoid jargon and complex terminology.'
        };

        let assistanceInstruction = '';
        if (this.examMode) {
            switch (this.assistanceLevel) {
                case 1:
                    assistanceInstruction = 'IMPORTANT: Provide only hints. Do not give direct answers. Guide the student with leading questions.';
                    break;
                case 2:
                    assistanceInstruction = 'IMPORTANT: Provide method outlines only. Explain the approach but do not solve completely.';
                    break;
                case 3:
                    assistanceInstruction = 'Provide full solutions when asked, but encourage understanding over memorization.';
                    break;
            }
        }

        return `You are an expert physics tutor named "Gemini" specializing in electromagnetic induction for pre-university and university freshman students. You are integrated into an interactive electromagnetic simulation application.

CONTEXT:
${moduleContext}

YOUR EXPERTISE COVERS:
- Electromagnetic Induction
- Faraday's Law of Induction: ε = -dΦ/dt
- Lenz's Law and energy conservation
- Magnetic flux: Φ = B·A·cos(θ)
- Solenoids and the right-hand grip rule
- Transformers and voltage/current relationships
- Eddy currents and their applications
- Mutual and self-inductance

EXPLANATION STYLE:
${styleGuide[this.explanationStyle]}

${assistanceInstruction}

BEHAVIOR RULES:
1. Be accurate and syllabus-aligned for pre-university and university freshman physics
2. Use proper physics terminology with clear explanations
3. Show formulas clearly using proper notation
4. Always emphasize correct SI units
5. Indicate vector directions where relevant
6. NEVER hallucinate formulas, laws, or physical constants
7. If uncertain, clearly state uncertainty and suggest verification
8. Relate explanations to the simulation the student is using
9. Encourage active learning and experimentation

FORMATTING:
- Use markdown for formatting
- Use **bold** for key terms
- Use \`code blocks\` for formulas
- Use bullet points for lists
- Keep responses concise but complete

Remember: Accuracy and educational reliability are more important than creativity. You are a trusted physics tutor.`;
    }

    /**
     * Add a message to the chat
     */
    addMessage(role, content) {
        // Remove welcome message if present
        const welcomeMsg = document.querySelector('.gemini-welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messagesContainer = document.getElementById('gemini-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `gemini-message gemini-message-${role}`;

        // Parse markdown-like content
        const formattedContent = this.formatMessage(content);

        messageDiv.innerHTML = `
            <div class="gemini-message-avatar">
                ${role === 'user' ? '👤' : '🤖'}
            </div>
            <div class="gemini-message-content">
                ${formattedContent}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store message
        this.messages.push({ role, content });
    }

    /**
     * Format message content with markdown-like styling
     */
    formatMessage(content) {
        // Convert markdown-style formatting to HTML
        let formatted = content
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre class="gemini-code">$1</pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Headers
            .replace(/^### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^## (.*$)/gm, '<h4>$1</h4>')
            .replace(/^# (.*$)/gm, '<h3>$1</h3>')
            // Line breaks
            .replace(/\n/g, '<br>');

        return formatted;
    }

    /**
     * Show system message
     */
    showSystemMessage(message) {
        const messagesContainer = document.getElementById('gemini-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'gemini-system-message';
        messageDiv.innerHTML = `<span>ℹ️ ${message}</span>`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const messagesContainer = document.getElementById('gemini-messages');
        const indicator = document.createElement('div');
        indicator.id = 'gemini-typing-indicator';
        indicator.className = 'gemini-typing-indicator';
        indicator.innerHTML = `
            <div class="gemini-message-avatar">🤖</div>
            <div class="gemini-typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('gemini-typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Add CSS styles for the chat
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Gemini Chat Button */
            .gemini-chat-btn {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                z-index: 1000;
                background: linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335);
                background-size: 300% 300%;
                animation: gradientShift 5s ease infinite;
                border: none;
                border-radius: 50px;
                padding: 0.875rem 1.5rem;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(66, 133, 244, 0.4);
                transition: all 0.3s ease;
            }
            
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            
            .gemini-chat-btn:hover {
                transform: translateY(-2px) scale(1.05);
                box-shadow: 0 6px 30px rgba(66, 133, 244, 0.6);
            }
            
            .gemini-chat-btn.active {
                transform: scale(0.95);
            }
            
            .gemini-btn-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: white;
                font-weight: 600;
                font-size: 0.9rem;
            }
            
            .gemini-icon {
                width: 24px;
                height: 24px;
            }
            
            /* Chat Container */
            .gemini-chat-container {
                position: fixed;
                bottom: 6rem;
                right: 2rem;
                width: 420px;
                max-width: calc(100vw - 2rem);
                height: 600px;
                max-height: calc(100vh - 8rem);
                background: linear-gradient(145deg, rgba(26, 27, 61, 0.98), rgba(45, 47, 94, 0.98));
                backdrop-filter: blur(20px);
                border: 1px solid rgba(66, 133, 244, 0.3);
                border-radius: 20px;
                box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(66, 133, 244, 0.2);
                display: flex;
                flex-direction: column;
                z-index: 1001;
                opacity: 1;
                transform: translateY(0);
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            .gemini-chat-container.hidden {
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
            }
            
            .gemini-chat-container.minimized {
                height: 60px;
            }
            
            .gemini-chat-container.minimized .gemini-messages,
            .gemini-chat-container.minimized .gemini-quick-actions,
            .gemini-chat-container.minimized .gemini-input-area,
            .gemini-chat-container.minimized .gemini-settings-panel {
                display: none;
            }
            
            /* Chat Header */
            .gemini-chat-header {
                padding: 1rem 1.25rem;
                background: linear-gradient(90deg, rgba(66, 133, 244, 0.1), rgba(52, 168, 83, 0.1));
                border-bottom: 1px solid rgba(66, 133, 244, 0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .gemini-header-left {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .gemini-avatar {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #4285F4, #34A853);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .gemini-avatar svg {
                width: 24px;
                height: 24px;
            }
            
            .gemini-header-info h3 {
                font-size: 1rem;
                font-weight: 600;
                color: #e8f4ff;
                margin: 0;
            }
            
            .gemini-status {
                font-size: 0.75rem;
                color: #34A853;
            }
            
            .gemini-header-controls {
                display: flex;
                gap: 0.5rem;
            }
            
            .gemini-control-btn {
                width: 32px;
                height: 32px;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #a0c8e8;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .gemini-control-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(66, 133, 244, 0.5);
                color: #4285F4;
            }
            
            .gemini-control-btn svg {
                width: 18px;
                height: 18px;
            }
            
            /* Settings Panel */
            .gemini-settings-panel {
                padding: 0;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid rgba(66, 133, 244, 0.2);
                max-height: 250px;
                overflow-y: auto;
            }
            
            .gemini-settings-panel.hidden {
                display: none;
            }
            
            .gemini-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: rgba(66, 133, 244, 0.1);
                border-bottom: 1px solid rgba(66, 133, 244, 0.2);
                font-weight: 600;
                color: #a0c8e8;
                font-size: 0.85rem;
            }
            
            .gemini-close-settings-btn {
                background: transparent;
                border: none;
                color: #a0c8e8;
                font-size: 1.25rem;
                cursor: pointer;
                padding: 0 0.25rem;
                line-height: 1;
                transition: all 0.2s ease;
            }
            
            .gemini-close-settings-btn:hover {
                color: #4285F4;
            }
            
            .gemini-settings-section {
                padding: 0.75rem 1rem;
                margin-bottom: 0;
                border-bottom: 1px solid rgba(66, 133, 244, 0.1);
            }
            
            .gemini-settings-section:last-child {
                border-bottom: none;
            }
            
            .gemini-settings-section h4 {
                font-size: 0.8rem;
                color: #a0c8e8;
                margin-bottom: 0.75rem;
                font-weight: 600;
            }
            
            .gemini-api-input-group {
                display: flex;
                gap: 0.5rem;
            }
            
            .gemini-api-input-group input {
                flex: 1;
                padding: 0.6rem 0.875rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e8f4ff;
                font-size: 0.85rem;
            }
            
            .gemini-api-input-group input:focus {
                outline: none;
                border-color: #4285F4;
            }
            
            .gemini-settings-btn {
                padding: 0.6rem 1rem;
                background: linear-gradient(135deg, #4285F4, #3374CC);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .gemini-settings-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.4);
            }
            
            .gemini-settings-note {
                font-size: 0.7rem;
                color: #6a8db0;
                margin-top: 0.5rem;
            }
            
            .gemini-settings-note a {
                color: #4285F4;
            }
            
            .gemini-style-options {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
            }
            
            .gemini-style-btn {
                padding: 0.5rem 0.75rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                color: #a0c8e8;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .gemini-style-btn:hover,
            .gemini-style-btn.active {
                background: rgba(66, 133, 244, 0.2);
                border-color: #4285F4;
                color: #4285F4;
            }
            
            .gemini-level-options {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
            }
            
            .gemini-radio,
            .gemini-checkbox {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.8rem;
                color: #a0c8e8;
                cursor: pointer;
            }
            
            .gemini-radio input,
            .gemini-checkbox input {
                accent-color: #4285F4;
            }
            
            /* Messages Area */
            .gemini-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .gemini-welcome-message {
                text-align: center;
                padding: 2rem 1rem;
            }
            
            .gemini-welcome-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .gemini-welcome-message h4 {
                color: #e8f4ff;
                font-size: 1.1rem;
                margin-bottom: 0.5rem;
            }
            
            .gemini-welcome-message p {
                color: #a0c8e8;
                font-size: 0.9rem;
                margin-bottom: 1rem;
            }
            
            .gemini-topic-chips {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .gemini-chip {
                padding: 0.4rem 0.75rem;
                background: rgba(66, 133, 244, 0.15);
                border: 1px solid rgba(66, 133, 244, 0.3);
                border-radius: 16px;
                color: #4285F4;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .gemini-chip:hover {
                background: rgba(66, 133, 244, 0.3);
                transform: translateY(-2px);
            }
            
            /* Message Styling */
            .gemini-message {
                display: flex;
                gap: 0.75rem;
                max-width: 95%;
            }
            
            .gemini-message-user {
                align-self: flex-end;
                flex-direction: row-reverse;
            }
            
            .gemini-message-avatar {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                flex-shrink: 0;
            }
            
            .gemini-message-user .gemini-message-avatar {
                background: rgba(66, 133, 244, 0.2);
            }
            
            .gemini-message-content {
                padding: 0.875rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                font-size: 0.9rem;
                color: #e8f4ff;
                line-height: 1.5;
            }
            
            .gemini-message-user .gemini-message-content {
                background: linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.2));
            }
            
            .gemini-message-content code {
                background: rgba(0, 0, 0, 0.3);
                padding: 0.1rem 0.4rem;
                border-radius: 4px;
                font-family: 'Fira Code', monospace;
                font-size: 0.85em;
            }
            
            .gemini-message-content pre.gemini-code {
                background: rgba(0, 0, 0, 0.4);
                padding: 0.75rem;
                border-radius: 8px;
                overflow-x: auto;
                font-family: 'Fira Code', monospace;
                font-size: 0.85em;
                margin: 0.5rem 0;
            }
            
            .gemini-message-content strong {
                color: #4285F4;
            }
            
            .gemini-message-content h3,
            .gemini-message-content h4,
            .gemini-message-content h5 {
                color: #34A853;
                margin: 0.75rem 0 0.5rem;
            }
            
            .gemini-system-message {
                text-align: center;
                padding: 0.5rem 1rem;
                background: rgba(251, 188, 5, 0.1);
                border: 1px solid rgba(251, 188, 5, 0.3);
                border-radius: 8px;
            }
            
            .gemini-system-message span {
                color: #FBBC05;
                font-size: 0.85rem;
            }
            
            /* Typing Indicator */
            .gemini-typing-indicator {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .gemini-typing-dots {
                display: flex;
                gap: 4px;
                padding: 0.875rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
            }
            
            .gemini-typing-dots span {
                width: 8px;
                height: 8px;
                background: #4285F4;
                border-radius: 50%;
                animation: typingBounce 1.4s infinite;
            }
            
            .gemini-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
            .gemini-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes typingBounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-6px); }
            }
            
            /* Quick Actions */
            .gemini-quick-actions {
                padding: 0.75rem 1rem;
                display: flex;
                gap: 0.5rem;
                border-top: 1px solid rgba(66, 133, 244, 0.1);
            }
            
            .gemini-quick-btn {
                flex: 1;
                padding: 0.5rem 0.5rem;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #a0c8e8;
                font-size: 0.7rem;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .gemini-quick-btn:hover {
                background: rgba(66, 133, 244, 0.1);
                border-color: rgba(66, 133, 244, 0.3);
            }
            
            /* Input Area */
            .gemini-input-area {
                padding: 1rem;
                border-top: 1px solid rgba(66, 133, 244, 0.2);
                background: rgba(0, 0, 0, 0.1);
            }
            
            .gemini-input-wrapper {
                display: flex;
                gap: 0.5rem;
                align-items: flex-end;
            }
            
            .gemini-input-wrapper textarea {
                flex: 1;
                padding: 0.75rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: #e8f4ff;
                font-size: 0.9rem;
                font-family: inherit;
                resize: none;
                min-height: 44px;
                max-height: 120px;
                line-height: 1.4;
            }
            
            .gemini-input-wrapper textarea:focus {
                outline: none;
                border-color: #4285F4;
            }
            
            .gemini-input-wrapper textarea::placeholder {
                color: #6a8db0;
            }
            
            .gemini-send-btn {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #4285F4, #34A853);
                border: none;
                border-radius: 12px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .gemini-send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .gemini-send-btn:not(:disabled):hover {
                transform: scale(1.05);
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.4);
            }
            
            .gemini-send-btn svg {
                width: 20px;
                height: 20px;
            }
            
            .gemini-input-hint {
                font-size: 0.65rem;
                color: #6a8db0;
                margin-top: 0.5rem;
                text-align: center;
            }
            
            /* Mobile Responsive */
            @media (max-width: 480px) {
                .gemini-chat-container {
                    bottom: 0;
                    right: 0;
                    width: 100%;
                    max-width: 100%;
                    height: 100%;
                    max-height: 100%;
                    border-radius: 0;
                }
                
                .gemini-chat-btn {
                    bottom: 1rem;
                    right: 1rem;
                    padding: 0.75rem 1rem;
                }
                
                .gemini-btn-label {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.chatButton) {
            this.chatButton.remove();
        }
        if (this.chatContainer) {
            this.chatContainer.remove();
        }
    }
}
