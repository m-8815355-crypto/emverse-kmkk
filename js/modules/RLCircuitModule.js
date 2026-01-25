/**
 * RL Circuit Module - Inductor Energy Storage and Release Demonstration
 * Demonstrates energy storage in an inductor's magnetic field and release during discharge
 * Features SPDT switch for charge/discharge phases with visual magnetic field effects
 */
import * as THREE from 'three';

export class RLCircuitModule {
    constructor(app) {
        this.app = app;
        this.name = 'rlCircuit';
        this.title = 'RL Circuit - Energy Storage';
        this.description = 'Toggle switch to see energy storage and release in an inductor';

        // Circuit components
        this.battery = null;
        this.inductor = null;
        this.resistor = null;
        this.led = null;
        this.switchGroup = null;
        this.wires = [];

        // Magnetic field visualization
        this.magneticFieldGroup = null;
        this.fieldArrows = [];

        // Circuit state
        this.phase = 'idle'; // 'idle', 'charging', 'discharging'
        this.current = 0;
        this.maxCurrent = 2.0; // Amps
        this.inductance = 5.0; // Henries
        this.resistance = 6.0; // Ohms
        this.voltage = 12.0; // Volts
        this.timeConstant = this.inductance / this.resistance;
        this.phaseTime = 0;

        // Graph data
        this.graphCanvas = null;
        this.graphCtx = null;
        this.graphData = [];
        this.graphSprite = null;
        this.maxGraphPoints = 200;
    }

    init() {
        // Create circuit components
        this.createBattery();
        this.createInductor();
        this.createResistor();
        this.createLED();
        this.createSwitch();
        this.createWires();

        // Create magnetic field visualization (initially hidden)
        this.createMagneticField();

        // Create current graph
        this.createGraph();

        // Create instruction label
        this.createInstructionLabel();

        // Create control buttons
        this.createControls();

        // Initialize in idle state
        this.setPhase('idle');
    }

    createBattery() {
        const group = new THREE.Group();
        group.userData = { type: 'battery' };

        // Battery body
        const bodyGeom = new THREE.BoxGeometry(0.6, 1.2, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.3,
            roughness: 0.6
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        group.add(body);

        // Positive terminal (red, longer)
        const posTermGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12);
        const posTermMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.7 });
        const posTerm = new THREE.Mesh(posTermGeom, posTermMat);
        posTerm.position.set(0, 0.75, 0);
        group.add(posTerm);

        // Negative terminal (black, shorter)
        const negTermGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
        const negTermMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
        const negTerm = new THREE.Mesh(negTermGeom, negTermMat);
        negTerm.position.set(0, -0.68, 0);
        group.add(negTerm);

        // Label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('12V DC', 64, 42);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.position.set(0, 0, 0.25);
        label.scale.set(0.6, 0.3, 1);
        group.add(label);

        group.position.set(-3, 0, 0);
        this.battery = group;
        this.app.sceneManager.add(group);
    }

    createInductor() {
        const group = new THREE.Group();
        group.userData = { type: 'inductor', inductance: this.inductance };

        // Iron core
        const coreGeom = new THREE.CylinderGeometry(0.15, 0.15, 2.0, 16);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.8,
            roughness: 0.3
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.rotation.z = Math.PI / 2;
        group.add(core);

        // Coil windings
        const coilColor = 0xd4af37; // Gold/copper color
        const coilMat = new THREE.MeshStandardMaterial({
            color: coilColor,
            metalness: 0.9,
            roughness: 0.2
        });

        const numTurns = 20;
        const coilRadius = 0.3;
        const coilLength = 1.8;

        for (let i = 0; i < numTurns; i++) {
            const x = -coilLength / 2 + (i / (numTurns - 1)) * coilLength;
            const torusGeom = new THREE.TorusGeometry(coilRadius, 0.03, 8, 24);
            const torus = new THREE.Mesh(torusGeom, coilMat);
            torus.position.x = x;
            torus.rotation.y = Math.PI / 2;
            group.add(torus);
        }

        // Inductor label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 96;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('INDUCTOR', 128, 40);
        ctx.font = '24px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText('L = 5.0 H', 128, 75);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.position.set(0, 0.8, 0);
        label.scale.set(1.5, 0.6, 1);
        group.add(label);

        group.position.set(0, 0, 0);
        this.inductor = group;
        this.app.sceneManager.add(group);
    }

    createResistor() {
        const group = new THREE.Group();
        group.userData = { type: 'resistor', resistance: this.resistance };

        // Resistor body (ceramic)
        const bodyGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xd4c4a8,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Color bands
        const bandColors = [0x8B4513, 0x000000, 0xff0000, 0xd4af37]; // 6Ω resistor bands
        const bandWidth = 0.08;
        for (let i = 0; i < bandColors.length; i++) {
            const bandGeom = new THREE.CylinderGeometry(0.16, 0.16, bandWidth, 16);
            const bandMat = new THREE.MeshBasicMaterial({ color: bandColors[i] });
            const band = new THREE.Mesh(bandGeom, bandMat);
            band.rotation.z = Math.PI / 2;
            band.position.x = -0.25 + i * 0.15;
            group.add(band);
        }

        // Leads
        const leadGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const leadMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

        const leftLead = new THREE.Mesh(leadGeom, leadMat);
        leftLead.rotation.z = Math.PI / 2;
        leftLead.position.x = -0.55;
        group.add(leftLead);

        const rightLead = new THREE.Mesh(leadGeom, leadMat);
        rightLead.rotation.z = Math.PI / 2;
        rightLead.position.x = 0.55;
        group.add(rightLead);

        // Label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('R = 6Ω', 64, 42);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.position.set(0, 0.5, 0);
        label.scale.set(0.8, 0.4, 1);
        group.add(label);

        group.position.set(3, 0, 0);
        this.resistor = group;
        this.app.sceneManager.add(group);
    }

    createLED() {
        const group = new THREE.Group();
        group.userData = { type: 'led', isOn: false };

        // LED dome
        const domeGeom = new THREE.SphereGeometry(0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        this.ledMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            emissive: 0x000000,
            emissiveIntensity: 0,
            transparent: true,
            opacity: 0.9
        });
        const dome = new THREE.Mesh(domeGeom, this.ledMaterial);
        dome.rotation.x = Math.PI;
        group.add(dome);

        // LED base
        const baseGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.y = 0.08;
        group.add(base);

        // LED legs
        const legGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

        const leftLeg = new THREE.Mesh(legGeom, legMat);
        leftLeg.position.set(-0.08, 0.35, 0);
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeom, legMat);
        rightLeg.position.set(0.08, 0.35, 0);
        group.add(rightLeg);

        // Point light for glow effect
        this.ledLight = new THREE.PointLight(0x00ff00, 0, 2);
        this.ledLight.position.set(0, -0.1, 0);
        group.add(this.ledLight);

        // Label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#27ae60';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LOAD', 64, 42);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.position.set(0, 0.6, 0);
        label.scale.set(0.6, 0.3, 1);
        group.add(label);

        group.position.set(3, -2, 0);
        group.rotation.x = Math.PI;
        this.led = group;
        this.app.sceneManager.add(group);
    }

    createSwitch() {
        const group = new THREE.Group();
        group.userData = { type: 'switch', position: 'center' }; // 'charge', 'discharge', 'center'

        // Switch base platform
        const baseGeom = new THREE.BoxGeometry(1.2, 0.3, 0.8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x34495e,
            roughness: 0.5
        });
        const base = new THREE.Mesh(baseGeom, baseMat);
        group.add(base);

        // Contact posts
        const postGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const postMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

        // Left post (charging circuit)
        const leftPost = new THREE.Mesh(postGeom, postMat);
        leftPost.position.set(-0.4, 0.35, 0);
        group.add(leftPost);
        group.userData.leftPost = leftPost;

        // Right post (discharge circuit)
        const rightPost = new THREE.Mesh(postGeom.clone(), postMat);
        rightPost.position.set(0.4, 0.35, 0);
        group.add(rightPost);
        group.userData.rightPost = rightPost;

        // Center pivot post
        const centerPost = new THREE.Mesh(postGeom.clone(), postMat);
        centerPost.position.set(0, 0.3, 0);
        group.add(centerPost);

        // Switch arm (lever)
        const armGroup = new THREE.Group();

        const armGeom = new THREE.BoxGeometry(0.7, 0.08, 0.15);
        const armMat = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            metalness: 0.6
        });
        const arm = new THREE.Mesh(armGeom, armMat);
        arm.position.x = 0.25; // Offset from pivot
        armGroup.add(arm);

        // Handle knob
        const knobGeom = new THREE.SphereGeometry(0.1, 12, 12);
        const knobMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.3
        });
        const knob = new THREE.Mesh(knobGeom, knobMat);
        knob.position.x = 0.55;
        armGroup.add(knob);

        armGroup.position.set(0, 0.45, 0);
        group.add(armGroup);
        group.userData.arm = armGroup;

        // Labels
        const chargeLabelCanvas = document.createElement('canvas');
        chargeLabelCanvas.width = 128;
        chargeLabelCanvas.height = 48;
        let ctx = chargeLabelCanvas.getContext('2d');
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CHARGE', 64, 32);

        const chargeLabelTexture = new THREE.CanvasTexture(chargeLabelCanvas);
        const chargeLabelMat = new THREE.SpriteMaterial({ map: chargeLabelTexture, transparent: true });
        const chargeLabel = new THREE.Sprite(chargeLabelMat);
        chargeLabel.position.set(-0.4, 0.8, 0);
        chargeLabel.scale.set(0.6, 0.25, 1);
        group.add(chargeLabel);

        const dischargeLabelCanvas = document.createElement('canvas');
        dischargeLabelCanvas.width = 128;
        dischargeLabelCanvas.height = 48;
        ctx = dischargeLabelCanvas.getContext('2d');
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DISCHARGE', 64, 32);

        const dischargeLabelTexture = new THREE.CanvasTexture(dischargeLabelCanvas);
        const dischargeLabelMat = new THREE.SpriteMaterial({ map: dischargeLabelTexture, transparent: true });
        const dischargeLabel = new THREE.Sprite(dischargeLabelMat);
        dischargeLabel.position.set(0.4, 0.8, 0);
        dischargeLabel.scale.set(0.6, 0.25, 1);
        group.add(dischargeLabel);

        group.position.set(-3, 2, 0);
        this.switchGroup = group;
        this.app.sceneManager.add(group);
    }

    createWires() {
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
        const wireRadius = 0.025;

        // Wire from battery+ to switch
        const path1 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-3, 0.9, 0),
            new THREE.Vector3(-3, 1.5, 0),
            new THREE.Vector3(-3, 1.85, 0)
        ]);
        this.addWire(path1, wireRadius, wireMaterial);

        // Wire from switch to inductor (charging path)
        const path2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-3.4, 2.35, 0),
            new THREE.Vector3(-3.4, 3, 0),
            new THREE.Vector3(-1, 3, 0),
            new THREE.Vector3(-1, 0, 0)
        ]);
        this.addWire(path2, wireRadius, wireMaterial);

        // Wire from inductor to resistor
        const path3 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(2.3, 0, 0)
        ]);
        this.addWire(path3, wireRadius, wireMaterial);

        // Wire from resistor to LED
        const path4 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(3.7, 0, 0),
            new THREE.Vector3(4.5, 0, 0),
            new THREE.Vector3(4.5, -2, 0),
            new THREE.Vector3(3.3, -2, 0)
        ]);
        this.addWire(path4, wireRadius, wireMaterial);

        // Wire from LED back to battery- (through discharge path)
        const path5 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(2.7, -2, 0),
            new THREE.Vector3(-3, -2, 0),
            new THREE.Vector3(-3, -0.75, 0)
        ]);
        this.addWire(path5, wireRadius, wireMaterial);

        // Discharge path wire (from switch right to inductor)
        const path6 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-2.6, 2.35, 0),
            new THREE.Vector3(-2.6, 2.8, 0),
            new THREE.Vector3(-1.5, 2.8, 0),
            new THREE.Vector3(-1.5, 0, 0),
            new THREE.Vector3(-1, 0, 0)
        ]);
        const dischargePath = this.addWire(path6, wireRadius, new THREE.MeshBasicMaterial({ color: 0xe74c3c }));
        dischargePath.visible = false;
        this.dischargeWire = dischargePath;
    }

    addWire(path, radius, material) {
        const geom = new THREE.TubeGeometry(path, 20, radius, 8, false);
        const wire = new THREE.Mesh(geom, material);
        this.wires.push(wire);
        this.app.sceneManager.add(wire);
        return wire;
    }

    createMagneticField() {
        this.magneticFieldGroup = new THREE.Group();
        this.fieldArrows = [];

        // Create concentric field rings around the inductor
        const numRings = 5;
        const ringColors = [0x00ff88, 0x00dd77, 0x00bb66, 0x009955, 0x007744];

        for (let i = 0; i < numRings; i++) {
            const radius = 0.5 + i * 0.2;
            const ringGeom = new THREE.TorusGeometry(radius, 0.02, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: ringColors[i],
                transparent: true,
                opacity: 0
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.userData = { baseRadius: radius, ringIndex: i };
            this.magneticFieldGroup.add(ring);
        }

        // Create field direction arrows
        const arrowGeom = new THREE.ConeGeometry(0.06, 0.15, 6);
        arrowGeom.rotateX(Math.PI / 2);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.8;

            const arrowMat = new THREE.MeshBasicMaterial({
                color: 0x00ffaa,
                transparent: true,
                opacity: 0
            });
            const arrow = new THREE.Mesh(arrowGeom.clone(), arrowMat);

            arrow.position.x = Math.cos(angle) * radius;
            arrow.position.z = Math.sin(angle) * radius;
            arrow.rotation.y = angle + Math.PI / 2;

            arrow.userData = { angle: angle, baseRadius: radius };
            this.fieldArrows.push(arrow);
            this.magneticFieldGroup.add(arrow);
        }

        this.magneticFieldGroup.position.copy(this.inductor.position);
        this.magneticFieldGroup.rotation.z = Math.PI / 2;
        this.app.sceneManager.add(this.magneticFieldGroup);
    }

    createGraph() {
        // Create canvas for current vs time graph
        this.graphCanvas = document.createElement('canvas');
        this.graphCanvas.width = 512;
        this.graphCanvas.height = 256;
        this.graphCtx = this.graphCanvas.getContext('2d');

        this.graphData = [];
        this.drawGraph();

        // Create sprite from canvas
        const texture = new THREE.CanvasTexture(this.graphCanvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.graphSprite = new THREE.Sprite(material);
        this.graphSprite.position.set(0, -3.5, 0);
        this.graphSprite.scale.set(5, 2.5, 1);
        this.app.sceneManager.add(this.graphSprite);
    }

    drawGraph() {
        const ctx = this.graphCtx;
        const w = this.graphCanvas.width;
        const h = this.graphCanvas.height;

        // Clear and draw background
        ctx.fillStyle = 'rgba(20, 30, 40, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Draw border
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 20, w - 70, h - 60);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const y = 20 + (h - 60) * i / 5;
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(w - 20, y);
            ctx.stroke();
        }
        for (let i = 1; i < 8; i++) {
            const x = 50 + (w - 70) * i / 8;
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, h - 40);
            ctx.stroke();
        }

        // Draw labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CURRENT vs TIME', w / 2, 15);

        ctx.font = '12px Arial';
        ctx.fillText('Time (s)', w / 2, h - 5);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Current (A)', 0, 0);
        ctx.restore();

        // Draw Y-axis labels
        ctx.textAlign = 'right';
        ctx.fillText('0', 45, h - 40);
        ctx.fillText(this.maxCurrent.toFixed(1), 45, 25);
        ctx.fillText((this.maxCurrent / 2).toFixed(1), 45, (h - 40 + 25) / 2);

        // Draw current data
        if (this.graphData.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = this.phase === 'charging' ? '#3498db' :
                this.phase === 'discharging' ? '#e74c3c' : '#00d4aa';
            ctx.lineWidth = 3;

            const startX = 50;
            const graphWidth = w - 70;
            const graphHeight = h - 60;

            for (let i = 0; i < this.graphData.length; i++) {
                const x = startX + (i / this.maxGraphPoints) * graphWidth;
                const y = h - 40 - (this.graphData[i] / this.maxCurrent) * graphHeight;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Draw current value
        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`I = ${this.current.toFixed(3)} A`, w - 30, 50);

        // Draw phase indicator
        ctx.font = 'bold 14px Arial';
        if (this.phase === 'charging') {
            ctx.fillStyle = '#3498db';
            ctx.fillText('⚡ CHARGING', w - 30, 75);
        } else if (this.phase === 'discharging') {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('🔋 DISCHARGING', w - 30, 75);
        } else {
            ctx.fillStyle = '#888888';
            ctx.fillText('⏸ IDLE', w - 30, 75);
        }

        // Update texture
        if (this.graphSprite) {
            this.graphSprite.material.map.needsUpdate = true;
        }
    }

    createInstructionLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(20, 50, 45, 0.85)';
        ctx.roundRect(0, 0, 1024, 200, 24);
        ctx.fill();

        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 42px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RL Circuit: Inductor Energy Storage & Release', 512, 70);

        ctx.font = '32px Inter, sans-serif';
        ctx.fillStyle = '#a0c4bc';
        ctx.fillText('Click CHARGE to store energy → Click DISCHARGE to release it', 512, 130);
        ctx.font = '24px Inter, sans-serif';
        ctx.fillText('Watch the magnetic field grow and collapse!', 512, 170);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.instructionSprite = new THREE.Sprite(material);
        this.instructionSprite.position.set(0, 4.5, 0);
        this.instructionSprite.scale.set(6, 1.2, 1);
        this.app.sceneManager.add(this.instructionSprite);
    }

    createControls() {
        // Add phase control buttons to the options container
        if (this.app.optionsContainer) {
            // Charge button
            const chargeBtn = document.createElement('button');
            chargeBtn.className = 'option-btn';
            chargeBtn.innerHTML = '⚡ CHARGE';
            chargeBtn.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
            chargeBtn.style.color = 'white';
            chargeBtn.style.padding = '12px 24px';
            chargeBtn.style.margin = '5px';
            chargeBtn.style.border = 'none';
            chargeBtn.style.borderRadius = '8px';
            chargeBtn.style.cursor = 'pointer';
            chargeBtn.style.fontWeight = 'bold';
            chargeBtn.addEventListener('click', () => this.setPhase('charging'));
            this.app.optionsContainer.appendChild(chargeBtn);
            this.chargeBtn = chargeBtn;

            // Discharge button
            const dischargeBtn = document.createElement('button');
            dischargeBtn.className = 'option-btn';
            dischargeBtn.innerHTML = '🔋 DISCHARGE';
            dischargeBtn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            dischargeBtn.style.color = 'white';
            dischargeBtn.style.padding = '12px 24px';
            dischargeBtn.style.margin = '5px';
            dischargeBtn.style.border = 'none';
            dischargeBtn.style.borderRadius = '8px';
            dischargeBtn.style.cursor = 'pointer';
            dischargeBtn.style.fontWeight = 'bold';
            dischargeBtn.addEventListener('click', () => this.setPhase('discharging'));
            this.app.optionsContainer.appendChild(dischargeBtn);
            this.dischargeBtn = dischargeBtn;

            // Reset button
            const resetBtn = document.createElement('button');
            resetBtn.className = 'option-btn';
            resetBtn.innerHTML = '🔄 RESET';
            resetBtn.style.background = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
            resetBtn.style.color = 'white';
            resetBtn.style.padding = '12px 24px';
            resetBtn.style.margin = '5px';
            resetBtn.style.border = 'none';
            resetBtn.style.borderRadius = '8px';
            resetBtn.style.cursor = 'pointer';
            resetBtn.style.fontWeight = 'bold';
            resetBtn.addEventListener('click', () => this.resetCircuit());
            this.app.optionsContainer.appendChild(resetBtn);

            // Energy display
            const energyDisplay = document.createElement('div');
            energyDisplay.style.color = '#00d4aa';
            energyDisplay.style.padding = '10px';
            energyDisplay.style.marginTop = '10px';
            energyDisplay.style.fontFamily = 'monospace';
            energyDisplay.style.fontSize = '14px';
            energyDisplay.innerHTML = 'Energy Stored: U = ½LI² = 0.00 J';
            this.app.optionsContainer.appendChild(energyDisplay);
            this.energyDisplay = energyDisplay;
        }

        // Create sliders
        this.app.sliders.createSlider({
            id: 'inductance',
            label: 'Inductance (L)',
            min: 1,
            max: 10,
            value: this.inductance,
            step: 0.5,
            unit: 'H',
            onChange: (val) => {
                this.inductance = val;
                this.timeConstant = this.inductance / this.resistance;
            }
        });

        this.app.sliders.createSlider({
            id: 'resistance',
            label: 'Resistance (R)',
            min: 1,
            max: 20,
            value: this.resistance,
            step: 1,
            unit: 'Ω',
            onChange: (val) => {
                this.resistance = val;
                this.timeConstant = this.inductance / this.resistance;
                this.maxCurrent = this.voltage / this.resistance;
            }
        });

        this.app.sliders.createSlider({
            id: 'voltage',
            label: 'Supply Voltage',
            min: 6,
            max: 24,
            value: this.voltage,
            step: 1,
            unit: 'V',
            onChange: (val) => {
                this.voltage = val;
                this.maxCurrent = this.voltage / this.resistance;
            }
        });
    }

    setPhase(newPhase) {
        if (this.phase === newPhase) return;

        this.phase = newPhase;
        this.phaseTime = 0;

        // Update switch arm position
        if (this.switchGroup && this.switchGroup.userData.arm) {
            const arm = this.switchGroup.userData.arm;
            if (newPhase === 'charging') {
                arm.rotation.z = -0.5; // Tilt left
            } else if (newPhase === 'discharging') {
                arm.rotation.z = 0.5; // Tilt right
            } else {
                arm.rotation.z = 0; // Center
            }
        }

        // Update button states
        if (this.chargeBtn) {
            this.chargeBtn.style.opacity = newPhase === 'charging' ? '0.6' : '1';
        }
        if (this.dischargeBtn) {
            this.dischargeBtn.style.opacity = newPhase === 'discharging' ? '0.6' : '1';
        }

        // Show/hide discharge wire
        if (this.dischargeWire) {
            this.dischargeWire.visible = (newPhase === 'discharging');
        }
    }

    resetCircuit() {
        this.current = 0;
        this.phaseTime = 0;
        this.graphData = [];
        this.setPhase('idle');
        this.updateMagneticField(0);
        this.updateLED(0);
        this.drawGraph();
    }

    updateMagneticField(intensity) {
        // Update magnetic field ring visibility and size
        this.magneticFieldGroup.children.forEach((child, i) => {
            if (child.userData.baseRadius !== undefined) {
                // It's a ring
                const targetOpacity = intensity * 0.8 * (1 - i * 0.15);
                child.material.opacity = THREE.MathUtils.lerp(child.material.opacity, targetOpacity, 0.1);

                // Expand rings when charging, contract when discharging
                const scaleMultiplier = this.phase === 'charging' ?
                    1 + intensity * 0.3 :
                    1 + intensity * 0.1;
                child.scale.setScalar(scaleMultiplier);
            }
        });

        // Update field arrows
        this.fieldArrows.forEach((arrow) => {
            arrow.material.opacity = intensity * 0.9;
        });
    }

    updateLED(currentLevel) {
        // LED brightness based on current
        const brightness = Math.min(currentLevel / this.maxCurrent, 1);

        if (this.ledMaterial) {
            if (brightness > 0.05) {
                this.ledMaterial.color.setHex(0x00ff00);
                this.ledMaterial.emissive.setHex(0x00ff00);
                this.ledMaterial.emissiveIntensity = brightness * 2;
            } else {
                this.ledMaterial.color.setHex(0x333333);
                this.ledMaterial.emissive.setHex(0x000000);
                this.ledMaterial.emissiveIntensity = 0;
            }
        }

        if (this.ledLight) {
            this.ledLight.intensity = brightness * 3;
        }
    }

    update(deltaTime) {
        if (this.phase === 'idle') return;

        this.phaseTime += deltaTime;

        // Calculate current based on RL circuit equations
        if (this.phase === 'charging') {
            // I(t) = (V/R) * (1 - e^(-t*R/L))
            // Exponential rise to steady state
            const steadyStateCurrent = this.voltage / this.resistance;
            this.current = steadyStateCurrent * (1 - Math.exp(-this.phaseTime / this.timeConstant));

        } else if (this.phase === 'discharging') {
            // I(t) = I_0 * e^(-t*R/L)
            // Exponential decay from current value
            const initialCurrent = this.current > 0 ? this.current : this.voltage / this.resistance;
            this.current = initialCurrent * Math.exp(-this.phaseTime / this.timeConstant);

            // Stop when current is negligible
            if (this.current < 0.001) {
                this.current = 0;
                this.setPhase('idle');
            }
        }

        // Update graph data
        this.graphData.push(this.current);
        if (this.graphData.length > this.maxGraphPoints) {
            this.graphData.shift();
        }

        // Calculate stored energy: U = ½LI²
        const energy = 0.5 * this.inductance * this.current * this.current;
        if (this.energyDisplay) {
            this.energyDisplay.innerHTML = `Energy Stored: U = ½LI² = ${energy.toFixed(3)} J`;
        }

        // Update visualizations
        const fieldIntensity = this.current / this.maxCurrent;
        this.updateMagneticField(fieldIntensity);
        this.updateLED(this.current);
        this.drawGraph();

        // Animate field arrows rotation
        const time = this.app.sceneManager.getElapsedTime();
        this.fieldArrows.forEach((arrow, i) => {
            const baseAngle = arrow.userData.angle;
            const rotationSpeed = this.current * 0.5;
            arrow.rotation.y = baseAngle + Math.PI / 2 + time * rotationSpeed;
        });
    }

    cleanup() {
        // Remove all created objects
        if (this.battery) this.app.sceneManager.remove(this.battery);
        if (this.inductor) this.app.sceneManager.remove(this.inductor);
        if (this.resistor) this.app.sceneManager.remove(this.resistor);
        if (this.led) this.app.sceneManager.remove(this.led);
        if (this.switchGroup) this.app.sceneManager.remove(this.switchGroup);
        if (this.magneticFieldGroup) this.app.sceneManager.remove(this.magneticFieldGroup);
        if (this.graphSprite) this.app.sceneManager.remove(this.graphSprite);
        if (this.instructionSprite) this.app.sceneManager.remove(this.instructionSprite);

        // Remove wires
        for (const wire of this.wires) {
            this.app.sceneManager.remove(wire);
            if (wire.geometry) wire.geometry.dispose();
            if (wire.material) wire.material.dispose();
        }
        this.wires = [];

        // Clear sliders and options
        this.app.sliders.clear();
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }

        // Reset state
        this.current = 0;
        this.phaseTime = 0;
        this.graphData = [];
        this.fieldArrows = [];
    }
}
