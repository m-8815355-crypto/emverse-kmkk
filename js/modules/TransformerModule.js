/**
 * Transformer Module - AC voltage transfer demonstration
 * Shows step-up/step-down with voltage selection and visible iron core
 */
import * as THREE from 'three';

export class TransformerModule {
    constructor(app) {
        this.app = app;
        this.name = 'transformer';
        this.title = 'Transformer';
        this.description = 'See how changing magnetic flux transfers energy between coils';

        this.transformer = null;
        this.primaryArrows = [];
        this.secondaryArrows = [];
        this.acFrequency = 1;
        this.isPlaying = true;

        // Voltage settings
        this.primaryVoltage = 200;
        this.voltageOptions = [100, 200, 400, 800, 1200];
    }

    init() {
        // Create transformer with visible iron core
        this.createTransformer();

        // Create AC source indicator
        this.createACSource();

        // Create output indicators
        this.createOutputIndicator();

        // Create labels
        this.createLabels();

        // Create sliders
        this.app.sliders.createSlider({
            id: 'primary-turns',
            label: 'Primary Turns',
            min: 5,
            max: 30,
            value: 10,
            step: 1,
            unit: '',
            onChange: (val) => {
                this.transformer.userData.primaryTurns = val;
                this.updateTurnsRatio();
            }
        });

        this.app.sliders.createSlider({
            id: 'secondary-turns',
            label: 'Secondary Turns',
            min: 5,
            max: 50,
            value: 20,
            step: 1,
            unit: '',
            onChange: (val) => {
                this.transformer.userData.secondaryTurns = val;
                this.updateTurnsRatio();
            }
        });

        this.app.sliders.createSlider({
            id: 'ac-frequency',
            label: 'AC Frequency',
            min: 0.5,
            max: 3,
            value: 1,
            step: 0.1,
            unit: ' Hz',
            onChange: (val) => {
                this.acFrequency = val;
            }
        });

        // Create voltage selection panel
        this.createVoltagePanel();

        // Create flux lines
        this.app.fieldVisualizer.createFluxLines(this.transformer);

        // Initial setup
        this.updateTurnsRatio();
    }

    createTransformer() {
        const primaryTurns = 10;
        const secondaryTurns = 20;
        const coreWidth = 2.5;
        const coreHeight = 2;

        const group = new THREE.Group();
        group.userData = {
            type: 'transformer',
            primaryTurns,
            secondaryTurns,
            turnsRatio: secondaryTurns / primaryTurns,
            draggable: false
        };

        // Iron core - bright "Galvanized Steel" for high contrast against dark background
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0xD3D3D3, // Galvanized Steel - bright gray for visibility
            metalness: 1.0,  // Full metalness to react to scene lights
            roughness: 0.3,  // Smooth, slightly reflective surface
            emissive: 0x111111, // Subtle self-emissive glow to prevent complete blackness in shadows
            emissiveIntensity: 0.3
        });

        // Core dimensions
        const coreWidth2 = coreWidth / 3;
        const coreDepth = 0.6;

        // Left vertical core piece
        const leftCoreGeom = new THREE.BoxGeometry(coreWidth2, coreHeight, coreDepth);
        const leftCore = new THREE.Mesh(leftCoreGeom, coreMaterial);
        leftCore.position.x = -coreWidth / 3;
        leftCore.castShadow = true;
        group.add(leftCore);

        // Right vertical core piece
        const rightCore = new THREE.Mesh(leftCoreGeom.clone(), coreMaterial);
        rightCore.position.x = coreWidth / 3;
        rightCore.castShadow = true;
        group.add(rightCore);

        // Top horizontal core piece
        const topCoreGeom = new THREE.BoxGeometry(coreWidth, coreWidth2, coreDepth);
        const topCore = new THREE.Mesh(topCoreGeom, coreMaterial);
        topCore.position.y = coreHeight / 2 - coreWidth2 / 2;
        topCore.castShadow = true;
        group.add(topCore);

        // Bottom horizontal core piece
        const bottomCore = new THREE.Mesh(topCoreGeom.clone(), coreMaterial);
        bottomCore.position.y = -coreHeight / 2 + coreWidth2 / 2;
        bottomCore.castShadow = true;
        group.add(bottomCore);

        // Add "IRON CORE" label on the core
        const coreLabel = this.createCoreLabelSprite();
        coreLabel.position.set(0, 0, coreDepth / 2 + 0.1);
        coreLabel.scale.set(0.8, 0.3, 1);
        group.add(coreLabel);

        // Primary coil (left side) - rich copper wire
        const primaryCoil = this.createCoilWinding(-coreWidth / 3, primaryTurns, 0.4, coreHeight * 0.6, 0xB87333, true);
        primaryCoil.userData.isPrimary = true;
        group.add(primaryCoil);
        group.userData.primaryCoil = primaryCoil;

        // Secondary coil (right side) - bright gold wire for visual distinction
        const secondaryCoil = this.createCoilWinding(coreWidth / 3, secondaryTurns, 0.35, coreHeight * 0.6, 0xFFD700, false);
        secondaryCoil.userData.isSecondary = true;
        group.add(secondaryCoil);
        group.userData.secondaryCoil = secondaryCoil;

        // Add rim lights near iron core corners for better 3D definition
        this.addRimLights(group, coreWidth, coreHeight);

        group.position.set(0, 0.5, 0);
        this.transformer = group;
        this.app.sceneManager.add(group);
    }

    createCoreLabelSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        // Dark background for contrast against bright galvanized steel
        ctx.fillStyle = 'rgba(40, 45, 50, 0.95)';
        ctx.roundRect(10, 10, 236, 76, 8);
        ctx.fill();

        // Bright border matching galvanized steel
        ctx.strokeStyle = '#D3D3D3';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 236, 76, 8);
        ctx.stroke();

        // Bright text for readability
        ctx.fillStyle = '#E8E8E8';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('IRON CORE', 128, 48);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
    }

    /**
     * Add rim lights near the iron core corners for enhanced 3D definition
     * These act as subtle edge lights to define the core shape against dark backgrounds
     */
    addRimLights(group, coreWidth, coreHeight) {
        const rimLightColor = 0xE0FFFF; // Cool white / faint cyan
        const rimLightIntensity = 0.4;
        const rimLightDistance = 3;

        // Front-left rim light
        const rimLight1 = new THREE.PointLight(rimLightColor, rimLightIntensity, rimLightDistance);
        rimLight1.position.set(-coreWidth / 2.5, coreHeight / 3, 1.2);
        group.add(rimLight1);

        // Front-right rim light
        const rimLight2 = new THREE.PointLight(rimLightColor, rimLightIntensity, rimLightDistance);
        rimLight2.position.set(coreWidth / 2.5, coreHeight / 3, 1.2);
        group.add(rimLight2);

        // Store references for potential cleanup
        this.rimLights = [rimLight1, rimLight2];
    }

    createCoilWinding(xPos, turns, radius, height, color, isPrimary = true) {
        const group = new THREE.Group();
        const wireRadius = 0.025;

        const coilMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 1.0, // Full metalness for realistic metallic wire appearance
            roughness: 0.25, // Smooth, shiny wire surface
            emissive: color,
            emissiveIntensity: 0
        });

        const points = [];
        const segments = turns * 32;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * turns * Math.PI * 2;
            const x = Math.sin(angle) * radius;
            const y = (t - 0.5) * height;
            const z = Math.cos(angle) * radius;
            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        // Increased radial segments from 8 to 16 for smoother, more "wire-like" rounded appearance
        const geom = new THREE.TubeGeometry(curve, segments * 2, wireRadius, 16, false);
        const mesh = new THREE.Mesh(geom, coilMaterial);
        mesh.castShadow = true;
        group.add(mesh);

        group.position.x = xPos;
        group.userData.material = coilMaterial;
        group.userData.isPrimaryCoil = isPrimary; // Track coil type for animation
        return group;
    }

    createVoltagePanel() {
        const optionsContainer = this.app.optionsContainer;
        if (!optionsContainer) return;

        // Create label
        const label = document.createElement('div');
        label.className = 'option-label';
        label.textContent = 'Primary Voltage:';
        label.style.cssText = 'font-size: 0.75rem; color: #a0c4bc; margin-bottom: 0.5rem;';
        optionsContainer.appendChild(label);

        // Create button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.style.cssText = 'display: flex; gap: 0.4rem; flex-wrap: wrap;';

        this.voltageOptions.forEach(voltage => {
            const btn = document.createElement('button');
            btn.className = 'option-btn' + (this.primaryVoltage === voltage ? ' active' : '');
            btn.textContent = `${voltage}V`;
            btn.style.cssText = `
                padding: 0.4rem 0.6rem;
                background: ${this.primaryVoltage === voltage ? 'var(--primary)' : 'var(--surface-light)'};
                border: 1px solid ${this.primaryVoltage === voltage ? 'var(--secondary)' : 'var(--border)'};
                border-radius: 6px;
                color: var(--text-primary);
                font-size: 0.7rem;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            btn.addEventListener('click', () => {
                this.primaryVoltage = voltage;
                // Update button states
                buttonGroup.querySelectorAll('.option-btn').forEach(b => {
                    b.style.background = 'var(--surface-light)';
                    b.style.borderColor = 'var(--border)';
                    b.classList.remove('active');
                });
                btn.style.background = 'var(--primary)';
                btn.style.borderColor = 'var(--secondary)';
                btn.classList.add('active');

                this.updateTurnsRatio();
            });

            buttonGroup.appendChild(btn);
        });

        optionsContainer.appendChild(buttonGroup);
    }

    createACSource() {
        const group = new THREE.Group();

        // AC symbol
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Draw AC wave
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = 10; x < 118; x++) {
            const y = 64 + Math.sin((x - 10) / 108 * Math.PI * 2) * 30;
            if (x === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Circle border
        ctx.strokeStyle = '#1e6b5c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(64, 64, 55, 0, Math.PI * 2);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.8, 0.8, 1);
        group.add(sprite);

        group.position.set(-2, 0.5, 0);
        this.acSource = group;
        this.app.sceneManager.scene.add(group);

        // Wire to primary coil
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
        const path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.6, 0.5, 0),
            new THREE.Vector3(-1.2, 0.5, 0.2),
            new THREE.Vector3(-0.9, 0.3, 0)
        ]);
        const wireGeom = new THREE.TubeGeometry(path, 10, 0.02, 8, false);
        const wire = new THREE.Mesh(wireGeom, wireMaterial);
        this.app.sceneManager.scene.add(wire);
        this.acWire = wire;
    }

    createOutputIndicator() {
        // Output voltage indicator (lightbulb representation)
        const group = new THREE.Group();

        // Bulb shape
        const bulbGeom = new THREE.SphereGeometry(0.2, 16, 16);
        this.bulbMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0,
            transparent: true,
            opacity: 0.9
        });
        const bulb = new THREE.Mesh(bulbGeom, this.bulbMaterial);
        group.add(bulb);

        // Bulb base
        const baseGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });
        const base = new THREE.Mesh(baseGeom, baseMaterial);
        base.position.y = -0.25;
        group.add(base);

        group.position.set(2, 0.5, 0);
        this.outputIndicator = group;
        this.app.sceneManager.scene.add(group);

        // Wire from secondary coil
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
        const path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.9, 0.3, 0),
            new THREE.Vector3(1.2, 0.5, 0.2),
            new THREE.Vector3(1.6, 0.5, 0)
        ]);
        const wireGeom = new THREE.TubeGeometry(path, 10, 0.02, 8, false);
        const wire = new THREE.Mesh(wireGeom, wireMaterial);
        this.app.sceneManager.scene.add(wire);
        this.outputWire = wire;
    }

    createLabels() {
        // Primary coil label
        this.primaryLabel = this.createTextSprite('Primary\n(Input)', 0x00d4aa);
        this.primaryLabel.position.set(-0.85, 1.3, 0);
        this.primaryLabel.scale.set(0.8, 0.4, 1);
        this.app.sceneManager.scene.add(this.primaryLabel);

        // Secondary coil label
        this.secondaryLabel = this.createTextSprite('Secondary\n(Output)', 0x00d4aa);
        this.secondaryLabel.position.set(0.85, 1.3, 0);
        this.secondaryLabel.scale.set(0.8, 0.4, 1);
        this.app.sceneManager.scene.add(this.secondaryLabel);

        // Turns ratio label
        this.ratioLabel = this.createRatioSprite(10, 20);
        this.ratioLabel.position.set(0, -1.0, 0);
        this.ratioLabel.scale.set(2.0, 0.7, 1);
        this.app.sceneManager.scene.add(this.ratioLabel);
    }

    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 128, 50 + i * 35);
        });

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
    }

    createRatioSprite(primary, secondary) {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(20, 50, 45, 0.95)';
        ctx.roundRect(10, 10, 580, 160, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 580, 160, 12);
        ctx.stroke();

        const ratio = secondary / primary;
        const voltageType = ratio > 1 ? 'STEP-UP' : ratio < 1 ? 'STEP-DOWN' : 'EQUAL';
        const secondaryVoltage = Math.round(this.primaryVoltage * ratio);

        // Formula
        ctx.fillStyle = '#a0c4bc';
        ctx.font = '18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Vₚ/Vₛ = Nₚ/Nₛ', 300, 35);

        // Turns ratio
        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(`Turns Ratio: ${primary}:${secondary} = 1:${ratio.toFixed(1)}`, 300, 70);

        // Voltage calculation
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.fillStyle = '#f39c12';
        ctx.fillText(`${this.primaryVoltage}V → ${secondaryVoltage}V`, 300, 110);

        // Step type
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = ratio > 1 ? '#00ff88' : ratio < 1 ? '#ffaa00' : '#ffffff';
        ctx.fillText(`${voltageType} TRANSFORMER`, 300, 150);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
    }

    updateTurnsRatio() {
        const primary = this.transformer.userData.primaryTurns;
        const secondary = this.transformer.userData.secondaryTurns;
        const coreWidth = 2.5;
        const coreHeight = 2;

        // Reconstruct Primary Coil if changed
        if (this.transformer.userData.primaryCoil) {
            this.transformer.remove(this.transformer.userData.primaryCoil);
            this.transformer.userData.primaryCoil.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        }

        const primaryCoil = this.createCoilWinding(-coreWidth / 3, primary, 0.4, coreHeight * 0.6, 0xB87333, true);
        primaryCoil.userData.isPrimary = true;
        this.transformer.add(primaryCoil);
        this.transformer.userData.primaryCoil = primaryCoil;

        // Reconstruct Secondary Coil if changed
        if (this.transformer.userData.secondaryCoil) {
            this.transformer.remove(this.transformer.userData.secondaryCoil);
            this.transformer.userData.secondaryCoil.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        }

        const secondaryCoil = this.createCoilWinding(coreWidth / 3, secondary, 0.35, coreHeight * 0.6, 0xFFD700, false);
        secondaryCoil.userData.isSecondary = true;
        this.transformer.add(secondaryCoil);
        this.transformer.userData.secondaryCoil = secondaryCoil;

        // Update ratio label
        if (this.ratioLabel) {
            this.app.sceneManager.scene.remove(this.ratioLabel);
            if (this.ratioLabel.material.map) this.ratioLabel.material.map.dispose();
            this.ratioLabel.material.dispose();
        }

        this.ratioLabel = this.createRatioSprite(primary, secondary);
        this.ratioLabel.position.set(0, -1.0, 0);
        this.ratioLabel.scale.set(2.0, 0.7, 1);
        this.app.sceneManager.scene.add(this.ratioLabel);

        this.transformer.userData.turnsRatio = secondary / primary;
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        const time = this.app.sceneManager.getElapsedTime();

        // Animate AC current in primary (sine wave)
        const acPhase = Math.sin(time * this.acFrequency * Math.PI * 2);

        // Animate flux lines
        this.app.fieldVisualizer.animateFluxLines(time, this.acFrequency);

        // Animate primary coil color
        if (this.transformer.userData.primaryCoil) {
            const primaryCoil = this.transformer.userData.primaryCoil;
            if (primaryCoil.userData.material) {
                const intensity = (acPhase + 1) / 2 * 0.4;
                primaryCoil.userData.material.emissiveIntensity = intensity;
            }
        }

        // Animate secondary coil (induced current, 90° phase shift)
        const secondaryPhase = Math.sin(time * this.acFrequency * Math.PI * 2 - Math.PI / 2);
        if (this.transformer.userData.secondaryCoil) {
            const secondaryCoil = this.transformer.userData.secondaryCoil;
            if (secondaryCoil.userData.material) {
                const ratio = this.transformer.userData.turnsRatio;
                const intensity = (secondaryPhase + 1) / 2 * 0.4 * Math.min(ratio, 2);
                secondaryCoil.userData.material.emissive = new THREE.Color(0x00d4aa);
                secondaryCoil.userData.material.emissiveIntensity = intensity;
            }
        }

        // Animate output bulb
        if (this.bulbMaterial) {
            const ratio = this.transformer.userData.turnsRatio;
            const brightness = (Math.abs(secondaryPhase) * 0.4 + 0.2) * Math.min(ratio / 2, 1);
            this.bulbMaterial.emissiveIntensity = brightness;
        }

        // Pulse AC source
        if (this.acSource) {
            const pulse = 1 + Math.abs(acPhase) * 0.1;
            this.acSource.scale.setScalar(pulse);
        }
    }

    cleanup() {
        // Remove transformer
        if (this.transformer) this.app.sceneManager.remove(this.transformer);

        // Remove AC source and wire
        if (this.acSource) {
            this.app.sceneManager.scene.remove(this.acSource);
            this.acSource.traverse(child => {
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
        if (this.acWire) {
            this.app.sceneManager.scene.remove(this.acWire);
            this.acWire.geometry.dispose();
            this.acWire.material.dispose();
        }

        // Remove output indicator and wire
        if (this.outputIndicator) {
            this.app.sceneManager.scene.remove(this.outputIndicator);
            this.outputIndicator.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        if (this.outputWire) {
            this.app.sceneManager.scene.remove(this.outputWire);
            this.outputWire.geometry.dispose();
            this.outputWire.material.dispose();
        }

        // Remove labels
        [this.primaryLabel, this.secondaryLabel, this.ratioLabel].forEach(label => {
            if (label) {
                this.app.sceneManager.scene.remove(label);
                if (label.material.map) label.material.map.dispose();
                label.material.dispose();
            }
        });

        // Clear flux lines
        this.app.fieldVisualizer.clearAll();
        this.app.sliders.clear();

        // Clear options
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }
    }
}
