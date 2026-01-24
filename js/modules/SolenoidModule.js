/**
 * Solenoid Module - Right-hand rule demonstration
 * Shows current direction on coil wires with toggle for current/electron flow
 */
import * as THREE from 'three';

export class SolenoidModule {
    constructor(app) {
        this.app = app;
        this.name = 'solenoid';
        this.title = 'Solenoid';
        this.description = 'Visualize current flow and magnetic field. Use right-hand rule: fingers=current, thumb=North pole';

        this.solenoid = null;
        this.currentParticles = [];
        this.handIndicator = null;
        this.isPlaying = true;

        // Display mode: 'current', 'electron', 'both'
        this.displayMode = 'current';
    }

    init() {
        // Create solenoid
        this.solenoid = this.app.components.createSolenoid({
            turns: 12,
            radius: 0.5,
            length: 2.5
        });
        this.solenoid.position.set(0, 0.5, 0);
        this.solenoid.userData.current = 1;
        this.solenoid.userData.currentDirection = -1;
        this.app.sceneManager.add(this.solenoid);

        // Create current flow particles on the wire
        this.createCurrentParticles();

        // Hand indicator removed per user request

        // Create pole labels
        this.createPoleLabels();
        this.updatePoleLabels(); // Ensure correct initial position

        // Create sliders
        this.app.sliders.createSlider({
            id: 'solenoid-current',
            label: 'Current',
            min: 0,
            max: 2,
            value: 1,
            step: 0.1,
            unit: ' A',
            onChange: (val) => {
                this.solenoid.userData.current = val;
                this.updateVisualization();
            }
        });

        // Create display mode options panel
        this.createDisplayModePanel();

        // Initial visualization
        this.updateVisualization();
    }

    createDisplayModePanel() {
        const optionsContainer = this.app.optionsContainer;
        if (!optionsContainer) return;

        // Create label
        const label = document.createElement('div');
        label.className = 'option-label';
        label.textContent = 'Show Flow:';
        label.style.cssText = 'font-size: 0.75rem; color: #a0c4bc; margin-bottom: 0.5rem;';
        optionsContainer.appendChild(label);

        // Create button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.style.cssText = 'display: flex; gap: 0.5rem;';

        const modes = [
            { id: 'current', label: 'Current (I)', color: '#f39c12' },
            { id: 'electron', label: 'Electrons (e⁻)', color: '#3498db' },
            { id: 'both', label: 'Both', color: '#00d4aa' }
        ];

        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.className = 'option-btn' + (this.displayMode === mode.id ? ' active' : '');
            btn.textContent = mode.label;
            btn.style.cssText = `
                padding: 0.5rem 0.75rem;
                background: ${this.displayMode === mode.id ? 'var(--primary)' : 'var(--surface-light)'};
                border: 1px solid ${this.displayMode === mode.id ? 'var(--secondary)' : 'var(--border)'};
                border-radius: 6px;
                color: var(--text-primary);
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            btn.addEventListener('click', () => {
                this.displayMode = mode.id;
                // Update button states
                buttonGroup.querySelectorAll('.option-btn').forEach(b => {
                    b.style.background = 'var(--surface-light)';
                    b.style.borderColor = 'var(--border)';
                    b.classList.remove('active');
                });
                btn.style.background = 'var(--primary)';
                btn.style.borderColor = 'var(--secondary)';
                btn.classList.add('active');

                this.updateVisualization();
            });

            buttonGroup.appendChild(btn);
        });

        optionsContainer.appendChild(buttonGroup);
    }

    createCurrentParticles() {
        // Create particles that flow along the coil wire
        const turns = this.solenoid.userData.turns;
        const radius = this.solenoid.userData.radius;
        const length = this.solenoid.userData.length;
        const particlesPerTurn = 4;
        const totalParticles = turns * particlesPerTurn;

        for (let i = 0; i < totalParticles; i++) {
            // Current particles (orange/yellow)
            const currentParticle = this.createParticle(0xf39c12, 0.04);
            currentParticle.userData.type = 'current';
            currentParticle.userData.phase = i / totalParticles;
            this.currentParticles.push(currentParticle);
            this.app.sceneManager.scene.add(currentParticle);

            // Electron particles (blue)
            const electronParticle = this.createParticle(0x3498db, 0.035);
            electronParticle.userData.type = 'electron';
            electronParticle.userData.phase = i / totalParticles;
            this.currentParticles.push(electronParticle);
            this.app.sceneManager.scene.add(electronParticle);
        }
    }

    createParticle(color, size) {
        const group = new THREE.Group();

        // Sphere body
        const sphereGeom = new THREE.SphereGeometry(size, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMaterial);
        group.add(sphere);

        // Arrow head to show direction
        const arrowGeom = new THREE.ConeGeometry(size * 0.8, size * 1.5, 6);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const arrow = new THREE.Mesh(arrowGeom, arrowMaterial);
        arrow.position.y = size * 1.2;
        group.add(arrow);

        group.userData.material = sphereMaterial;
        group.userData.arrowMaterial = arrowMaterial;

        return group;
    }

    updateParticlePositions(time) {
        const current = this.solenoid.userData.current;
        const direction = this.solenoid.userData.currentDirection;
        const turns = this.solenoid.userData.turns;
        const radius = this.solenoid.userData.radius;
        const length = this.solenoid.userData.length;

        const showCurrent = this.displayMode === 'current' || this.displayMode === 'both';
        const showElectron = this.displayMode === 'electron' || this.displayMode === 'both';

        for (const particle of this.currentParticles) {
            const isCurrent = particle.userData.type === 'current';
            const isElectron = particle.userData.type === 'electron';

            // Show/hide based on display mode
            if (isCurrent) {
                particle.visible = showCurrent && current > 0.1;
            } else {
                particle.visible = showElectron && current > 0.1;
            }

            if (!particle.visible) continue;

            // Calculate position along helix
            // Current flows in direction, electrons flow opposite
            const flowDirection = isCurrent ? direction : -direction;
            const speed = current * 0.15; // Slower, comfortable animation speed
            const phase = (particle.userData.phase + time * speed * flowDirection) % 1;
            const actualPhase = phase < 0 ? phase + 1 : phase;

            const angle = actualPhase * turns * Math.PI * 2;
            const x = (actualPhase - 0.5) * length;
            const y = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;

            // Position relative to solenoid
            const solenoidPos = this.solenoid.position;
            particle.position.set(
                solenoidPos.x + x,
                solenoidPos.y + y,
                solenoidPos.z + z
            );

            // Orient arrow in direction of motion (tangent to helix)
            const tangentAngle = angle + (flowDirection > 0 ? Math.PI / 2 : -Math.PI / 2);
            particle.rotation.x = Math.PI / 2;
            particle.rotation.z = -tangentAngle;
        }
    }



    createPoleLabels() {
        // Right-hand grip rule: wrap right hand with fingers following current direction,
        // thumb points to North pole.
        // With currentDirection = -1 (initial), conventional current flows such that
        // North pole is on the RIGHT side (+x) when looking at the solenoid.

        // North pole label (right side with initial current direction per right-hand rule)
        this.northLabel = this.createPoleSprite('N', 0xe74c3c);
        this.northLabel.position.set(1.5, 0.5, 0);
        this.northLabel.scale.set(0.4, 0.4, 1);
        this.app.sceneManager.scene.add(this.northLabel);

        // South pole label (left side with initial current direction)
        this.southLabel = this.createPoleSprite('S', 0x3498db);
        this.southLabel.position.set(-1.5, 0.5, 0);
        this.southLabel.scale.set(0.4, 0.4, 1);
        this.app.sceneManager.scene.add(this.southLabel);
    }

    createPoleSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Circle background
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.beginPath();
        ctx.arc(64, 64, 50, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        return new THREE.Sprite(material);
    }

    updatePoleLabels() {
        const direction = this.solenoid.userData.currentDirection;
        // Right-hand grip rule: fingers follow current, thumb points to North
        // With direction < 0 (initial state): North is on RIGHT (+x)
        // With direction > 0: North is on LEFT (-x)
        if (direction > 0) {
            // Current flows opposite way, so poles swap
            this.northLabel.position.x = -1.5;
            this.southLabel.position.x = 1.5;
        } else {
            // Initial direction: North on right per right-hand rule
            this.northLabel.position.x = 1.5;
            this.southLabel.position.x = -1.5;
        }
    }

    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        return new THREE.Sprite(material);
    }

    updateVisualization() {
        const current = this.solenoid.userData.current;

        // Update field visualization
        if (current > 0.1) {
            this.app.fieldVisualizer.generateSolenoidField(this.solenoid);
        } else {
            this.app.fieldVisualizer.clearAll();
        }



        // Update pole labels visibility
        if (this.northLabel) this.northLabel.visible = current > 0.1;
        if (this.southLabel) this.southLabel.visible = current > 0.1;
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        const current = this.solenoid.userData.current;
        if (current < 0.1) return;

        // Update particle positions
        const time = this.app.sceneManager.getElapsedTime();
        this.updateParticlePositions(time);

        // Animate field lines (arrows moving along the lines)
        this.app.fieldVisualizer.animateFieldLines(deltaTime * 60, 1.0);
    }

    cleanup() {
        // Remove solenoid
        if (this.solenoid) {
            this.app.sceneManager.remove(this.solenoid);
        }

        // Remove current particles
        for (const particle of this.currentParticles) {
            this.app.sceneManager.scene.remove(particle);
            particle.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.currentParticles = [];



        // Remove pole labels
        if (this.northLabel) {
            this.app.sceneManager.scene.remove(this.northLabel);
            this.northLabel.material.map.dispose();
            this.northLabel.material.dispose();
        }
        if (this.southLabel) {
            this.app.sceneManager.scene.remove(this.southLabel);
            this.southLabel.material.map.dispose();
            this.southLabel.material.dispose();
        }

        // Clear visualizations
        this.app.fieldVisualizer.clearAll();
        this.app.sliders.clear();

        // Clear options
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }
    }
}
