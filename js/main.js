/**
 * Electromagnetic Lab Simulator - Main Application
 */
import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { ComponentLibrary } from './ComponentLibrary.js';
import { FieldVisualizer } from './FieldVisualizer.js';
import { InteractionManager, SliderManager } from './InteractionManager.js';

// Import simulation modules
import { BarMagnetModule } from './modules/BarMagnetModule.js';
import { SolenoidModule } from './modules/SolenoidModule.js';
import { InductionModule } from './modules/InductionModule.js';
import { TransformerModule } from './modules/TransformerModule.js';
import { LenzLawModule } from './modules/LenzLawModule.js';
import { ElectromagnetModule } from './modules/ElectromagnetModule.js';


import { AssemblyModule } from './modules/AssemblyModule.js';
import { ExamPracticeModule } from './modules/ExamPracticeModule.js';
import { AITutorModule } from './modules/AITutorModule.js';
import { MagnetCuttingModule } from './modules/MagnetCuttingModule.js';
import { GeminiTutor } from './GeminiTutor.js';

class ElectromagneticLabApp {
    constructor() {
        this.canvas = document.getElementById('simulator-canvas');
        this.isPlaying = true;
        this.showFieldLines = true;
        this.showArrows = true;
        this.sidebarCollapsed = false;

        // FPS tracking
        this.fpsElement = document.getElementById('fps-counter');
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();

        // Raycaster for in-scene button clicks
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Initialize core systems
        this.init();
    }

    init() {
        try {
            // Setup scene
            this.sceneManager = new SceneManager(this.canvas);

            // Setup component library
            this.components = new ComponentLibrary();

            // Setup field visualizer
            this.fieldVisualizer = new FieldVisualizer(this.sceneManager.scene);
            console.log('FieldVisualizer initialized', this.fieldVisualizer);

            // Setup interaction
            this.interaction = new InteractionManager(
                this.sceneManager,
                this.sceneManager.camera,
                this.canvas
            );

            // Setup slider manager
            const slidersContainer = document.getElementById('sliders-container');
            this.sliders = new SliderManager(slidersContainer);

            // Setup options container for module-specific controls
            this.optionsContainer = document.getElementById('options-container');

            // Initialize modules
            this.modules = {
                barMagnet: new BarMagnetModule(this),
                solenoid: new SolenoidModule(this),
                induction: new InductionModule(this),
                transformer: new TransformerModule(this),
                lenz: new LenzLawModule(this),
                electromagnet: new ElectromagnetModule(this),
                magnetCutting: new MagnetCuttingModule(this),
                assembly: new AssemblyModule(this),
                examPractice: new ExamPracticeModule(this),
                aiTutor: new AITutorModule(this)
            };

            this.currentModule = null;

            // Initialize EM-Vee
            this.geminiTutor = new GeminiTutor(this);

            // Setup UI event listeners
            this.setupUIListeners();

            // Setup in-scene click detection
            this.setupSceneClickDetection();

            // Check URL hash or parameters for module selection
            const hashModule = window.location.hash.slice(1); // Remove '#' from hash
            const urlParams = new URLSearchParams(window.location.search);
            const moduleParam = urlParams.get('module');

            // Priority: hash > query param > default
            let targetModule = 'barMagnet';
            if (hashModule && this.modules[hashModule]) {
                targetModule = hashModule;
            } else if (moduleParam && this.modules[moduleParam]) {
                targetModule = moduleParam;
            }

            // Load the target module
            this.loadModule(targetModule);

            // Update sidebar active state to match
            const moduleItems = document.querySelectorAll('.module-item');
            moduleItems.forEach(item => {
                if (item.dataset.module === targetModule) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Listen for hash changes to allow dynamic module switching
            window.addEventListener('hashchange', () => {
                const newHash = window.location.hash.slice(1);
                if (newHash && this.modules[newHash]) {
                    this.loadModule(newHash);

                    // Update sidebar active state
                    const items = document.querySelectorAll('.module-item');
                    items.forEach(item => {
                        if (item.dataset.module === newHash) {
                            item.classList.add('active');
                        } else {
                            item.classList.remove('active');
                        }
                    });
                }
            });

        } catch (error) {
            console.error('Initialization error:', error);
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.innerHTML = `<div style="color:red; padding:2rem; text-align:center;">
                    <h2>Error Initializing</h2>
                    <p>${error.message}</p>
                </div>`;
            }
            return;
        }

        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.classList.add('hidden');
        }, 500);

        // Start animation loop
        this.animate();
    }

    setupUIListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const app = document.getElementById('app');

        sidebarToggle.addEventListener('click', () => {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
            app.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);

            // Trigger resize to update canvas
            setTimeout(() => {
                this.sceneManager.handleResize();
            }, 300);
        });

        // Module navigation
        const moduleItems = document.querySelectorAll('.module-item');
        moduleItems.forEach(item => {
            item.addEventListener('click', () => {
                const moduleName = item.dataset.module;
                this.loadModule(moduleName);

                // Update active state
                moduleItems.forEach(m => m.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Play/Pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        playPauseBtn.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            const playIcon = playPauseBtn.querySelector('.play-icon');
            const pauseIcon = playPauseBtn.querySelector('.pause-icon');

            if (this.isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline';
            } else {
                playIcon.style.display = 'inline';
                pauseIcon.style.display = 'none';
            }
        });

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', () => {
            this.resetCurrentModule();
        });

        // Reset view button
        const resetViewBtn = document.getElementById('reset-view-btn');
        resetViewBtn.addEventListener('click', () => {
            this.sceneManager.resetCamera();
        });

        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Theme Toggle
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            this.fieldVisualizer.setTheme(isLight ? 'light' : 'dark');
            this.sceneManager.setTheme(isLight ? 'light' : 'dark');

            // Re-render current module field visualization
            if (this.currentModule && this.currentModule.updateFieldVisualization) {
                this.currentModule.updateFieldVisualization();
            }

            // Update tooltip/icon if needed
            themeToggleBtn.title = isLight ? "Switch to Dark Mode" : "Switch to Light Mode";
        });

        // Panel Toggle
        const panelToggleBtn = document.getElementById('panel-toggle-btn');
        const controlPanel = document.getElementById('control-panel');
        panelToggleBtn.addEventListener('click', () => {
            controlPanel.classList.toggle('hidden');
            const isHidden = controlPanel.classList.contains('hidden');

            // Adjust panel toggle button visual state if needed
            panelToggleBtn.classList.toggle('active', isHidden);

            // Trigger resize to update canvas
            setTimeout(() => {
                this.sceneManager.handleResize();
            }, 300);
        });

        // Visualization toggles
        const showFieldLinesToggle = document.getElementById('show-field-lines');
        showFieldLinesToggle.addEventListener('change', (e) => {
            this.showFieldLines = e.target.checked;
            this.fieldVisualizer.setFieldLinesVisible(this.showFieldLines);
            if (this.currentModule && this.currentModule.updateFieldVisualization) {
                this.currentModule.updateFieldVisualization();
            }
        });

        const showArrowsToggle = document.getElementById('show-arrows');
        showArrowsToggle.addEventListener('change', (e) => {
            this.showArrows = e.target.checked;
            this.fieldVisualizer.setArrowsVisible(this.showArrows);
            if (this.currentModule && this.currentModule.updateFieldVisualization) {
                this.currentModule.updateFieldVisualization();
            }
        });

        const showGridToggle = document.getElementById('show-grid');
        showGridToggle.addEventListener('change', (e) => {
            this.sceneManager.toggleGrid(e.target.checked);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    playPauseBtn.click();
                    break;
                case 'r':
                case 'R':
                    resetBtn.click();
                    break;
                case 'g':
                case 'G':
                    showGridToggle.checked = !showGridToggle.checked;
                    showGridToggle.dispatchEvent(new Event('change'));
                    break;
                case 'm':
                case 'M':
                    sidebarToggle.click();
                    break;
            }
        });
    }

    setupSceneClickDetection() {
        // Click detection for in-scene buttons (like Lenz's Law drop button)
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

            // Find all sprites with isButton userData
            const sprites = [];
            this.sceneManager.scene.traverse((child) => {
                if (child.isSprite && child.userData.isButton) {
                    sprites.push(child);
                }
            });

            const intersects = this.raycaster.intersectObjects(sprites);
            if (intersects.length > 0) {
                const button = intersects[0].object;
                if (button.userData.onClick) {
                    button.userData.onClick();
                }
            }
        });
    }

    loadModule(moduleName) {
        // Cleanup current module
        if (this.currentModule) {
            this.currentModule.cleanup();
        }

        // Clear scene objects
        this.sceneManager.clear();
        this.fieldVisualizer.clearAll();
        this.interaction.clearDraggables();
        this.sliders.clear();

        // Clear options container
        if (this.optionsContainer) {
            this.optionsContainer.innerHTML = '';
        }

        // Reset camera for new module
        this.sceneManager.resetCamera();

        // Load new module
        const module = this.modules[moduleName];
        if (module) {
            this.currentModule = module;
            module.init();

            // Update header
            document.getElementById('current-module-title').textContent = module.title;
            document.getElementById('current-module-desc').textContent = module.description;
        }
    }

    resetCurrentModule() {
        if (this.currentModule) {
            const moduleName = this.currentModule.name;
            this.loadModule(moduleName);
        }
    }

    // Helper method for modules to create option buttons
    createOptionButton(label, isActive, onClick) {
        const btn = document.createElement('button');
        btn.className = 'option-btn' + (isActive ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => {
            onClick();
        });
        return btn;
    }

    // Helper method for modules to create button groups
    createButtonGroup(options) {
        const group = document.createElement('div');
        group.className = 'button-group';

        options.forEach(opt => {
            const btn = this.createOptionButton(opt.label, opt.isActive, () => {
                // Deactivate all buttons in group
                group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                opt.onClick();
            });
            group.appendChild(btn);
        });

        return group;
    }

    updateFPS() {
        this.frameCount++;
        const now = performance.now();

        if (now - this.lastFpsUpdate >= 1000) {
            const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
            this.fpsElement.textContent = `${fps} FPS`;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.sceneManager.getDelta();

        // Update scene controls
        this.sceneManager.update();

        // Update current module
        if (this.isPlaying && this.currentModule && this.currentModule.update) {
            this.currentModule.update(deltaTime);
        }

        // Render
        this.sceneManager.render();

        // Update FPS
        this.updateFPS();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ElectromagneticLabApp();
});
