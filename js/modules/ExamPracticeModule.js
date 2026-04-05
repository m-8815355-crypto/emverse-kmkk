/**
 * Exam Practice Module - Physics exam questions with AI tutoring
 * Based on Topic 5: Electromagnetic Induction
 */

export class ExamPracticeModule {
    constructor(app) {
        this.app = app;
        this.name = 'examPractice';
        this.title = 'Exam Practice';
        this.description = 'Practice real physics exam questions with AI assistance';

        this.currentQuestion = 0;
        this.showingAnswer = false;
        this.score = { correct: 0, total: 5 };

        // Question bank from Topic 5: Electromagnetic Induction
        this.questions = [
            {
                id: 1,
                title: "Generator Coil EMF",
                scenario: "A generator coil rotates through one-fourth of a revolution (θ=0° to θ=90°) in 15 ms.",
                data: [
                    "Turns (N) = 200",
                    "Radius (r) = 5.00 cm = 0.05 m",
                    "Magnetic Field (B) = 1.25 T",
                    "Time (Δt) = 15 ms = 15 × 10⁻³ s"
                ],
                question: "Calculate the induced EMF.",
                hint: "Use Faraday's Law: ε = -N(dΦ/dt). Remember that flux Φ = BA·cos(θ).",
                solution: {
                    formula: "ε = -N × dΦ/dt = -NBA × d(cos θ)/dt",
                    steps: [
                        "Area A = πr² = π × (0.05)² = 7.85 × 10⁻³ m²",
                        "Change in cos θ: cos(90°) - cos(0°) = 0 - 1 = -1",
                        "ε = -200 × 1.25 × 7.85×10⁻³ × (-1)/(15×10⁻³)",
                        "ε = -200 × 1.25 × 7.85×10⁻³ × (-66.67)"
                    ],
                    answer: "131 V",
                    explanation: "The EMF is induced because the magnetic flux through the coil changes as it rotates."
                },
                difficulty: "Medium"
            },
            {
                id: 2,
                title: "Self-Inductance Circuit",
                scenario: "A coil is connected in series with a switch to a battery.",
                data: [
                    "Self-inductance (L) = 5.0 H",
                    "Voltage (V) = 12 V",
                    "Total Resistance (R) = 6.0 Ω"
                ],
                question: "Calculate: (a) Rate of current growth when switch is closed, (b) Final current value, (c) Energy stored when current is maximum.",
                hint: "At t=0, all voltage appears across the inductor. Final current is when inductor acts as wire.",
                solution: {
                    formula: "Back EMF: ε = -L(dI/dt), Energy: E = ½LI²",
                    steps: [
                        "(a) At t=0, I=0, so back EMF = -V = -12V",
                        "    -L(dI/dt) = -12, so dI/dt = 12/5 = 2.4 A/s",
                        "(b) Final current: I = V/R = 12/6 = 2.0 A",
                        "(c) Energy: E = ½ × 5 × (2)² = 10 J"
                    ],
                    answer: "(a) 2.4 A/s, (b) 2.0 A, (c) 10 J",
                    explanation: "The inductor opposes change in current. Initially all voltage appears across it, but finally it acts as a wire."
                },
                difficulty: "Hard"
            },
            {
                id: 3,
                title: "Coil Near Bar Magnet",
                scenario: "A small coil is positioned along the axis of a large bar magnet. A graph shows B vs distance.",
                data: [
                    "Coil Area (A) = 0.40 cm² = 0.4 × 10⁻⁴ m²",
                    "Turns (N) = 150",
                    "At x = 5.0 cm: B = 50 mT",
                    "At x = 15.0 cm: B = 8 mT",
                    "Time to move from 5cm to 15cm: Δt = 0.30 s"
                ],
                question: "Calculate the average induced EMF when the coil moves from 5cm to 15cm.",
                hint: "Find the change in flux linkage, then divide by time. Flux linkage = NBA.",
                solution: {
                    formula: "ε = ΔΦ/Δt, where Φ = NBA",
                    steps: [
                        "Initial flux linkage: Φ₁ = 150 × 50×10⁻³ × 0.4×10⁻⁴ = 3×10⁻⁴ Wb",
                        "Final flux linkage: Φ₂ = 150 × 8×10⁻³ × 0.4×10⁻⁴ = 4.8×10⁻⁵ Wb",
                        "Change: ΔΦ = |Φ₂ - Φ₁| = 2.52×10⁻⁴ Wb",
                        "EMF: ε = 2.52×10⁻⁴ / 0.30 = 8.4×10⁻⁴ V"
                    ],
                    answer: "8.4 × 10⁻⁴ V (0.84 mV)",
                    explanation: "Faraday's Law: The magnitude of induced EMF equals the rate of change of magnetic flux linkage."
                },
                difficulty: "Medium"
            },
            {
                id: 4,
                title: "Lenz's Law Application",
                scenario: "A bar magnet (North pole facing solenoid) is moved away from a solenoid connected to a galvanometer.",
                data: [
                    "The magnet is pulled away from the solenoid",
                    "North pole faces the solenoid"
                ],
                question: "Describe and explain the galvanometer observation. Which way does current flow?",
                hint: "Lenz's Law: The induced current opposes the change. If flux is decreasing, the induced current will try to maintain it.",
                solution: {
                    formula: "Lenz's Law: Induced current opposes the change in flux",
                    steps: [
                        "1. When magnet moves away, magnetic flux through solenoid decreases",
                        "2. By Faraday's Law, changing flux induces an EMF and current",
                        "3. By Lenz's Law, the induced current opposes the change",
                        "4. To attract the retreating North pole, the solenoid end becomes a South pole",
                        "5. Looking from magnet's side: current flows CLOCKWISE"
                    ],
                    answer: "Galvanometer deflects. Current flows to create a South pole facing the retreating magnet.",
                    explanation: "Lenz's Law ensures energy conservation - work must be done to move the magnet."
                },
                difficulty: "Easy"
            },
            {
                id: 5,
                title: "Pacemaker Induction",
                scenario: "A pacemaker setup with a small coil (inside chest) and large coil (outside chest).",
                data: [
                    "Small Coil: N=150, Area=1.0 cm² (10⁻⁴ m²)",
                    "Large Coil: N=500, Radius=10 cm (0.1 m), R=10 Ω",
                    "Battery: EMF=60 V, Internal Resistance r=10 Ω",
                    "Time for current to drop to zero = 10⁻⁴ s"
                ],
                question: "Estimate the instantaneous PD across the small coil when the external circuit is opened.",
                hint: "Calculate the B-field at center of large coil, then find flux linkage in small coil. Use rapid change in time.",
                solution: {
                    formula: "B = μ₀NI/(2r), Φ = NBA, ε = ΔΦ/Δt",
                    steps: [
                        "Step 1: Current in large coil: I = 60/(10+10) = 3 A",
                        "Step 2: B-field at center: B = (4π×10⁻⁷)(500)(3)/(2×0.1) = 3π×10⁻³ T",
                        "Step 3: Flux linkage in small coil: Φ = 150 × 3π×10⁻³ × 10⁻⁴ = 1.41×10⁻⁴ Wb",
                        "Step 4: Induced EMF: ε = 1.41×10⁻⁴ / 10⁻⁴ = 1.41 V"
                    ],
                    answer: "1.41 V",
                    explanation: "The very rapid change when switching OFF (short Δt) produces a much larger EMF than switching ON."
                },
                difficulty: "Hard"
            }
        ];
    }

    init() {
        // Hide 3D canvas since this is a 2D page
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = 'none';
        }

        // Hide control panel
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.classList.add('hidden');
        }

        // Create exam practice UI
        this.createExamUI();
        this.showQuestion(0);
    }

    createExamUI() {
        // Check if exam UI already exists
        let examUI = document.getElementById('exam-practice-ui');
        if (!examUI) {
            examUI = document.createElement('div');
            examUI.id = 'exam-practice-ui';
            document.getElementById('main-content').appendChild(examUI);
        }

        examUI.innerHTML = `
            <div class="exam-container">
                <div class="exam-header">
                    <div class="exam-title-section">
                        <h1 class="exam-main-title">Electromagnetic Induction</h1>
                        <h2 class="exam-subtitle">Topic 5 Practice Questions</h2>
                    </div>
                    <div class="exam-progress">
                        <div class="progress-text">Question <span id="current-q-num">1</span> of <span id="total-q-num">5</span></div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill" style="width: 20%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="exam-content">
                    <div class="question-card" id="question-card">
                        <!-- Question content will be injected here -->
                    </div>
                    
                    <div class="answer-card hidden" id="answer-card">
                        <!-- Answer content will be injected here -->
                    </div>
                </div>
                
                <div class="exam-controls">
                    <button class="exam-btn secondary" id="hint-btn">
                        <span class="btn-icon">💡</span>
                        Get Hint
                    </button>
                    <button class="exam-btn primary" id="show-answer-btn">
                        <span class="btn-icon">✓</span>
                        Show Answer
                    </button>
                    <button class="exam-btn primary hidden" id="next-btn">
                        <span class="btn-icon">→</span>
                        Next Question
                    </button>
                </div>
            </div>
        `;

        this.addExamStyles();
        this.setupExamListeners();
    }

    showQuestion(index) {
        if (index < 0 || index >= this.questions.length) return;

        this.currentQuestion = index;
        this.showingAnswer = false;
        const q = this.questions[index];

        // Update progress
        document.getElementById('current-q-num').textContent = index + 1;
        document.getElementById('total-q-num').textContent = this.questions.length;
        document.getElementById('progress-fill').style.width = `${((index + 1) / this.questions.length) * 100}%`;

        // Show question card
        const questionCard = document.getElementById('question-card');
        questionCard.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <span class="difficulty-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span>
            </div>
            <h3 class="question-title">${q.title}</h3>
            <div class="scenario">
                <p>${q.scenario}</p>
            </div>
            <div class="data-section">
                <h4>Given Data:</h4>
                <ul>
                    ${q.data.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
            <div class="question-text">
                <h4>Question:</h4>
                <p>${q.question}</p>
            </div>
        `;
        questionCard.classList.remove('hidden');

        // Hide answer card
        document.getElementById('answer-card').classList.add('hidden');

        // Update buttons
        document.getElementById('show-answer-btn').classList.remove('hidden');
        document.getElementById('next-btn').classList.add('hidden');
    }

    showAnswer() {
        const q = this.questions[this.currentQuestion];
        const answerCard = document.getElementById('answer-card');

        answerCard.innerHTML = `
            <div class="answer-header">
                <h3>📝 Solution</h3>
            </div>
            <div class="formula-section">
                <h4>Key Formula:</h4>
                <div class="formula">${q.solution.formula}</div>
            </div>
            <div class="steps-section">
                <h4>Step-by-Step Solution:</h4>
                <ol>
                    ${q.solution.steps.map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
            <div class="final-answer">
                <h4>Final Answer:</h4>
                <div class="answer-box">${q.solution.answer}</div>
            </div>
            <div class="explanation">
                <h4>Key Concept:</h4>
                <p>${q.solution.explanation}</p>
            </div>
        `;

        answerCard.classList.remove('hidden');
        this.showingAnswer = true;

        // Update buttons
        document.getElementById('show-answer-btn').classList.add('hidden');
        if (this.currentQuestion < this.questions.length - 1) {
            document.getElementById('next-btn').classList.remove('hidden');
        } else {
            document.getElementById('next-btn').textContent = '🎉 Complete!';
            document.getElementById('next-btn').classList.remove('hidden');
        }
    }

    showHint() {
        const q = this.questions[this.currentQuestion];

        // Create hint popup
        const hint = document.createElement('div');
        hint.className = 'hint-popup';
        hint.innerHTML = `
            <div class="hint-content">
                <div class="hint-header">
                    <span>💡 Hint</span>
                    <button class="hint-close">×</button>
                </div>
                <p>${q.hint}</p>
            </div>
        `;

        document.getElementById('exam-practice-ui').appendChild(hint);

        // Auto-remove after 5 seconds or on click
        hint.querySelector('.hint-close').onclick = () => hint.remove();
        setTimeout(() => hint.remove(), 8000);
    }

    setupExamListeners() {
        document.getElementById('show-answer-btn').addEventListener('click', () => {
            this.showAnswer();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            if (this.currentQuestion < this.questions.length - 1) {
                this.showQuestion(this.currentQuestion + 1);
            } else {
                // Show completion message
                this.showCompletion();
            }
        });

        document.getElementById('hint-btn').addEventListener('click', () => {
            this.showHint();
        });
    }

    showCompletion() {
        const examUI = document.getElementById('exam-practice-ui');
        examUI.innerHTML = `
            <div class="exam-container completion">
                <div class="completion-content">
                    <div class="completion-icon">🎉</div>
                    <h2>Congratulations!</h2>
                    <p>You've completed all 5 practice questions on Electromagnetic Induction.</p>
                    <div class="completion-stats">
                        <div class="stat">
                            <span class="stat-value">5</span>
                            <span class="stat-label">Questions Reviewed</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">✓</span>
                            <span class="stat-label">Topic Complete</span>
                        </div>
                    </div>
                    <div class="completion-actions">
                        <button class="exam-btn primary" id="restart-btn">
                            <span class="btn-icon">↺</span>
                            Practice Again
                        </button>
                        <button class="exam-btn secondary" id="back-to-sim-btn">
                            <span class="btn-icon">⚡</span>
                            Back to Simulations
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.createExamUI();
            this.showQuestion(0);
        });

        document.getElementById('back-to-sim-btn').addEventListener('click', () => {
            this.app.loadModule('barMagnet');
        });
    }

    addExamStyles() {
        if (document.getElementById('exam-practice-styles')) return;

        const style = document.createElement('style');
        style.id = 'exam-practice-styles';
        style.textContent = `
            #exam-practice-ui {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
                overflow-y: auto;
                padding: 2rem;
                z-index: 10;
            }
            
            .exam-container {
                max-width: 900px;
                margin: 0 auto;
            }
            
            .exam-header {
                margin-bottom: 2rem;
            }
            
            .exam-title-section {
                margin-bottom: 1.5rem;
            }
            
            .exam-main-title {
                font-size: 2.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, #e74c3c, #3498db);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0 0 0.5rem 0;
                line-height: 1.2;
            }
            
            .exam-subtitle {
                font-size: 1.2rem;
                color: var(--text-secondary);
                font-weight: 400;
                margin: 0;
            }
            
            .exam-progress {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--border-radius);
                padding: 1rem 1.5rem;
            }
            
            .progress-text {
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }
            
            .progress-bar {
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #e74c3c, #3498db);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .question-card, .answer-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--border-radius);
                padding: 2rem;
                margin-bottom: 1.5rem;
            }
            
            .question-card.hidden, .answer-card.hidden {
                display: none;
            }
            
            .question-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .question-number {
                font-size: 0.85rem;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .difficulty-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .difficulty-badge.easy { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
            .difficulty-badge.medium { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
            .difficulty-badge.hard { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
            
            .question-title {
                font-size: 1.5rem;
                color: var(--text-primary);
                margin: 0 0 1.5rem 0;
                background: linear-gradient(135deg, #e74c3c, #3498db);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .scenario {
                background: rgba(0, 212, 170, 0.1);
                border-left: 4px solid var(--accent);
                padding: 1rem 1.5rem;
                border-radius: 0 var(--border-radius) var(--border-radius) 0;
                margin-bottom: 1.5rem;
            }
            
            .scenario p {
                margin: 0;
                color: var(--text-primary);
                line-height: 1.6;
            }
            
            .data-section, .question-text {
                margin-bottom: 1.5rem;
            }
            
            .data-section h4, .question-text h4 {
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin: 0 0 0.75rem 0;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .data-section ul {
                margin: 0;
                padding-left: 1.5rem;
            }
            
            .data-section li {
                color: var(--text-primary);
                margin-bottom: 0.5rem;
                font-family: 'Fira Code', monospace;
            }
            
            .question-text p {
                margin: 0;
                color: var(--text-primary);
                font-size: 1.1rem;
                font-weight: 500;
            }
            
            /* Answer Card Styles */
            .answer-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--border);
            }
            
            .answer-header h3 {
                margin: 0;
                font-size: 1.3rem;
                color: var(--accent);
            }
            
            .formula-section, .steps-section, .final-answer, .explanation {
                margin-bottom: 1.5rem;
            }
            
            .formula-section h4, .steps-section h4, .final-answer h4, .explanation h4 {
                font-size: 0.85rem;
                color: var(--text-secondary);
                margin: 0 0 0.75rem 0;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .formula {
                background: rgba(0, 0, 0, 0.3);
                padding: 1rem 1.5rem;
                border-radius: var(--border-radius);
                font-family: 'Fira Code', monospace;
                color: #00d4aa;
                font-size: 1rem;
            }
            
            .steps-section ol {
                margin: 0;
                padding-left: 1.5rem;
            }
            
            .steps-section li {
                color: var(--text-primary);
                margin-bottom: 0.75rem;
                line-height: 1.6;
            }
            
            .answer-box {
                background: linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(52, 152, 219, 0.2));
                border: 2px solid var(--accent);
                padding: 1rem 1.5rem;
                border-radius: var(--border-radius);
                font-size: 1.3rem;
                font-weight: 700;
                color: var(--text-primary);
                text-align: center;
            }
            
            .explanation p {
                margin: 0;
                color: var(--text-secondary);
                line-height: 1.6;
                font-style: italic;
            }
            
            /* Controls */
            .exam-controls {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .exam-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.875rem 1.5rem;
                border-radius: var(--border-radius);
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }
            
            .exam-btn.primary {
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                color: white;
            }
            
            .exam-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
            }
            
            .exam-btn.secondary {
                background: var(--surface);
                border: 1px solid var(--border);
                color: var(--text-primary);
            }
            
            .exam-btn.secondary:hover {
                background: rgba(255, 255, 255, 0.05);
                border-color: var(--accent);
            }
            
            .exam-btn.hidden {
                display: none;
            }
            
            .btn-icon {
                font-size: 1.1rem;
            }
            
            /* Hint Popup */
            .hint-popup {
                position: fixed;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                animation: slideUp 0.3s ease;
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            .hint-content {
                background: linear-gradient(135deg, rgba(241, 196, 15, 0.95), rgba(243, 156, 18, 0.95));
                border-radius: var(--border-radius);
                padding: 1rem 1.5rem;
                max-width: 500px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            }
            
            .hint-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
                font-weight: 700;
                color: #2c3e50;
            }
            
            .hint-close {
                background: transparent;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #2c3e50;
                line-height: 1;
            }
            
            .hint-content p {
                margin: 0;
                color: #2c3e50;
                line-height: 1.5;
            }
            
            /* Completion */
            .completion {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: calc(100vh - 12rem);
            }
            
            .completion-content {
                text-align: center;
                padding: 3rem;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--border-radius);
            }
            
            .completion-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .completion-content h2 {
                font-size: 2rem;
                background: linear-gradient(135deg, #e74c3c, #3498db);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0 0 1rem 0;
            }
            
            .completion-content p {
                color: var(--text-secondary);
                margin: 0 0 2rem 0;
            }
            
            .completion-stats {
                display: flex;
                justify-content: center;
                gap: 3rem;
                margin-bottom: 2rem;
            }
            
            .stat {
                text-align: center;
            }
            
            .stat-value {
                display: block;
                font-size: 2.5rem;
                font-weight: 700;
                color: var(--accent);
            }
            
            .stat-label {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }
            
            .completion-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                #exam-practice-ui {
                    padding: 1rem;
                }
                
                .exam-main-title {
                    font-size: 1.8rem;
                }
                
                .question-card, .answer-card {
                    padding: 1.5rem;
                }
                
                .exam-controls {
                    flex-direction: column;
                }
                
                .exam-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    cleanup() {
        // Remove exam UI
        const examUI = document.getElementById('exam-practice-ui');
        if (examUI) {
            examUI.remove();
        }

        // Show canvas again
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = '';
        }

        // Show control panel
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.classList.remove('hidden');
        }
    }
}
