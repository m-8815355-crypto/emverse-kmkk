/**
 * Lenz's Law Module - Falling magnet through copper tube
 * Demonstrates magnetic braking effect (Feel Flux concept)
 */
import * as THREE from 'three';

export class LenzLawModule {
    constructor(app) {
        this.app = app;
        this.name = 'lenz';
        this.title = "Lenz's Law";
        this.description = 'Watch a magnet fall slowly through a copper tube due to opposing magnetic fields';

        this.tube = null;
        this.magnet = null;
        this.opposingArrows = [];
        this.eddyCurrentRings = [];
        this.isDropping = false;
        this.velocity = 0;
        this.gravity = 0.5;
        this.damping = 0.85; // Lenz's law damping effect
    }

    init() {
        // Create copper tube (scaled to 3/4 original size)
        this.tube = this.app.components.createCopperTube({
            height: 3.75,        // 5 * 0.75
            outerRadius: 0.375,  // 0.5 * 0.75
            innerRadius: 0.315   // 0.42 * 0.75
        });
        this.tube.position.set(0, 1.875, 0); // Adjusted Y position for smaller tube

        // Make tube transparent as requested (50-70%)
        this.tube.traverse(child => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = 0.4; // 60% transparent
                child.material.side = THREE.DoubleSide;
                // Reduce metalness/roughness for better transparency look
                child.material.metalness = 0.3;
                child.material.roughness = 0.1;
                child.material.needsUpdate = true;
            }
        });

        this.app.sceneManager.add(this.tube);

        // Create Spherical Magnet
        this.magnet = this.createSphericalMagnet(0.25);
        this.magnet.position.set(0, 5.5, 0);
        this.app.sceneManager.add(this.magnet);

        // Create comparison non-magnetic object
        this.createComparisonObject();

        // Create reset platform
        this.createPlatform();

        // Create sliders
        this.app.sliders.createSlider({
            id: 'tube-conductivity',
            label: 'Tube Conductivity',
            min: 0,
            max: 1,
            value: 0.85,
            step: 0.05,
            unit: '',
            onChange: (val) => {
                this.damping = val;
            }
        });

        // Create instructions and labels
        this.createLabels();

        // Create drop button in HTML (more reliable click detection)
        this.createDropButtonHTML();

        // Auto-start the demonstration after a delay
        setTimeout(() => this.startDrop(), 1500);
    }

    createSphericalMagnet(radius) {
        const group = new THREE.Group();
        group.userData = { type: 'barMagnet', strength: 1.5, northPole: new THREE.Vector3(0, radius, 0), southPole: new THREE.Vector3(0, -radius, 0) };

        // North pole (top half - red)
        const northGeom = new THREE.SphereGeometry(radius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const northMesh = new THREE.Mesh(northGeom, new THREE.MeshStandardMaterial({
            color: 0xe74c3c, metalness: 0.3, roughness: 0.4
        }));
        northMesh.castShadow = true;
        group.add(northMesh);

        // South pole (bottom half - blue)
        const southGeom = new THREE.SphereGeometry(radius, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const southMesh = new THREE.Mesh(southGeom, new THREE.MeshStandardMaterial({
            color: 0x3498db, metalness: 0.3, roughness: 0.4
        }));
        southMesh.castShadow = true;
        group.add(southMesh);

        // Add "N" and "S" labels
        const addLabel = (text, height) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 32, 32);
            const texture = new THREE.CanvasTexture(canvas);
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
            sprite.scale.set(0.15, 0.15, 1);
            sprite.position.y = height;
            sprite.position.z = radius + 0.02;
            group.add(sprite);
        };

        addLabel('N', radius * 0.5);
        addLabel('S', -radius * 0.5);

        return group;
    }

    createComparisonObject() {
        // Non-magnetic sphere to compare fall speeds
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.1,
            roughness: 0.8
        });
        this.comparisonSphere = new THREE.Mesh(geometry, material);
        this.comparisonSphere.position.set(1.5, 5.5, 0);
        this.comparisonSphere.castShadow = true;
        this.app.sceneManager.scene.add(this.comparisonSphere);

        // Label for comparison object
        const label = this.createTextSprite('Non-magnetic\nobject', 0xa0c4bc);
        label.position.set(1.5, 6.2, 0);
        label.scale.set(0.8, 0.4, 1);
        this.comparisonLabel = label;
        this.app.sceneManager.scene.add(label);

        this.comparisonVelocity = 0;
    }

    createPlatform() {
        // Ground platform
        const platformGeom = new THREE.BoxGeometry(4, 0.1, 2);
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.3,
            roughness: 0.7
        });
        const platform = new THREE.Mesh(platformGeom, platformMaterial);
        platform.position.set(0.75, -0.05, 0);
        platform.receiveShadow = true;
        this.platform = platform;
        this.app.sceneManager.scene.add(platform);
    }

    createLabels() {
        // Magnet label
        this.magnetLabel = this.createTextSprite('Bar Magnet\n(Neodymium)', 0x00d4aa);
        this.magnetLabel.position.set(0, 6.2, 0);
        this.magnetLabel.scale.set(0.7, 0.35, 1);
        this.app.sceneManager.scene.add(this.magnetLabel);

        // Tube label
        const tubeLabel = this.createTextSprite('Copper Tube', 0xd4a574);
        tubeLabel.position.set(0, 5.5, 0.8);
        tubeLabel.scale.set(0.6, 0.3, 1);
        this.tubeLabel = tubeLabel;
        this.app.sceneManager.scene.add(tubeLabel);

        // Explanation
        this.explanationSprite = this.createExplanationSprite();
        this.explanationSprite.position.set(0, -1.5, 0);
        this.explanationSprite.scale.set(4.5, 1.4, 1);
        this.app.sceneManager.scene.add(this.explanationSprite);

        // 3D Drop button sprite (backup - also using HTML button)
        this.dropButton = this.createButtonSprite('▼ DROP MAGNET');
        this.dropButton.position.set(0, 6.8, 0);
        this.dropButton.scale.set(1.4, 0.6, 1);
        this.app.sceneManager.scene.add(this.dropButton);
    }

    createDropButtonHTML() {
        // Create an HTML button for reliable click detection
        const optionsContainer = this.app.optionsContainer;
        if (!optionsContainer) return;

        const btn = document.createElement('button');
        btn.id = 'drop-magnet-btn';
        btn.textContent = '▼ Drop Magnet';
        btn.style.cssText = `
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #2a9d8f, #1e6b5c);
            border: 2px solid #00ffcc;
            border-radius: 8px;
            color: #ffffff;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(0, 255, 204, 0.3);
        `;

        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'linear-gradient(135deg, #3aada0, #2a8a75)';
            btn.style.boxShadow = '0 6px 20px rgba(0, 255, 204, 0.5)';
            btn.style.transform = 'translateY(-2px)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'linear-gradient(135deg, #2a9d8f, #1e6b5c)';
            btn.style.boxShadow = '0 4px 15px rgba(0, 255, 204, 0.3)';
            btn.style.transform = 'translateY(0)';
        });

        btn.addEventListener('click', () => {
            this.startDrop();
        });

        optionsContainer.appendChild(btn);
        this.dropButtonHTML = btn;
    }

    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Higher resolution for sharper text
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.font = 'bold 52px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 256, 100 + i * 64);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
    }

    createButtonSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Higher resolution
        canvas.height = 160;
        const ctx = canvas.getContext('2d');

        // Button background - darker for better contrast
        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, '#1a3a35');
        gradient.addColorStop(1, '#0d1f1c');
        ctx.fillStyle = gradient;
        ctx.roundRect(16, 16, 480, 128, 20);
        ctx.fill();

        // Bright cyan border
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 4;
        ctx.roundRect(16, 16, 480, 128, 20);
        ctx.stroke();

        // Text - bright cyan for maximum contrast on dark bg
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 80);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.userData.isButton = true;
        sprite.userData.onClick = () => this.startDrop();
        return sprite;
    }

    createExplanationSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; // Higher resolution for sharper text
        canvas.height = 340;
        const ctx = canvas.getContext('2d');

        // Background with good contrast
        ctx.fillStyle = 'rgba(20, 50, 45, 0.95)';
        ctx.roundRect(16, 16, 992, 308, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 212, 170, 0.4)';
        ctx.lineWidth = 3;
        ctx.roundRect(16, 16, 992, 308, 20);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Lenz's Law: Magnetic Braking Effect", 512, 70);

        // Explanation lines
        ctx.fillStyle = '#c0d4cc';
        ctx.font = '30px Inter, sans-serif';
        ctx.fillText('🧲 The falling magnet creates a changing magnetic flux', 512, 130);
        ctx.fillText('⚡ Eddy currents are induced in the copper tube', 512, 180);
        ctx.fillText('🔄 These currents create an opposing magnetic field', 512, 230);
        ctx.fillText('🐢 The opposing force slows the magnet\'s descent', 512, 280);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        return new THREE.Sprite(material);
    }

    startDrop() {
        if (this.isDropping) return;

        // Reset positions
        this.magnet.position.set(0, 5.5, 0);
        this.comparisonSphere.position.set(1.5, 5.5, 0);

        this.velocity = 0;
        this.comparisonVelocity = 0;
        this.isDropping = true;

        // Clear any existing opposing arrows
        this.clearOpposingArrows();
    }

    updateOpposingField() {
        this.clearOpposingArrows();

        if (!this.isDropping || Math.abs(this.velocity) < 0.005) return;

        const magnetY = this.magnet.position.y;
        const tubeY = this.tube.position.y;
        const tubeHeight = this.tube.userData.height;

        // Check if magnet is inside or near tube
        const relY = magnetY - tubeY;
        if (Math.abs(relY) > tubeHeight / 2 + 0.5) return;

        // Create opposing field arrows (pointing up when magnet falls)
        const numArrows = 6;
        const radius = 0.35;
        // Opposing field direction is opposite to velocity
        const opposingDirection = this.velocity < 0 ? 1 : -1;

        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: Math.min(Math.abs(this.velocity) * 4, 0.85)
        });

        for (let i = 0; i < numArrows; i++) {
            const angle = (i / numArrows) * Math.PI * 2;

            const arrowGroup = new THREE.Group();

            // Arrow body
            const bodyGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.25, 6);
            const body = new THREE.Mesh(bodyGeom, arrowMaterial.clone());
            arrowGroup.add(body);

            // Arrow head (pointing in opposing direction)
            const headGeom = new THREE.ConeGeometry(0.04, 0.12, 6);
            const head = new THREE.Mesh(headGeom, arrowMaterial.clone());
            head.position.y = opposingDirection * 0.18;
            head.rotation.x = opposingDirection < 0 ? Math.PI : 0;
            arrowGroup.add(head);

            arrowGroup.position.set(
                Math.cos(angle) * radius,
                magnetY,
                Math.sin(angle) * radius
            );

            this.app.sceneManager.scene.add(arrowGroup);
            this.opposingArrows.push(arrowGroup);
        }

        // Add eddy current rings around tube wall
        this.createEddyCurrentRing(magnetY);
    }

    createEddyCurrentRing(y) {
        const ringRadius = 0.48;
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xf39c12,
            transparent: true,
            opacity: Math.min(Math.abs(this.velocity) * 3, 0.7)
        });

        // Create a torus to represent the eddy current
        const torusGeom = new THREE.TorusGeometry(ringRadius, 0.02, 8, 32);
        const torus = new THREE.Mesh(torusGeom, ringMaterial);
        torus.position.set(0, y, 0);
        torus.rotation.x = Math.PI / 2;

        this.app.sceneManager.scene.add(torus);
        this.opposingArrows.push(torus);

        // Add small arrows on the ring to show current direction
        const numArrows = 8;
        const direction = this.velocity < 0 ? 1 : -1; // Current direction based on Lenz's law

        for (let i = 0; i < numArrows; i++) {
            const angle = (i / numArrows) * Math.PI * 2;

            const arrowGroup = new THREE.Group();

            const bodyGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4);
            const body = new THREE.Mesh(bodyGeom, ringMaterial.clone());
            arrowGroup.add(body);

            const headGeom = new THREE.ConeGeometry(0.025, 0.06, 4);
            const head = new THREE.Mesh(headGeom, ringMaterial.clone());
            head.position.y = 0.08;
            arrowGroup.add(head);

            arrowGroup.position.set(
                Math.cos(angle) * ringRadius,
                y,
                Math.sin(angle) * ringRadius
            );

            // Orient tangent to ring
            arrowGroup.rotation.z = Math.PI / 2;
            arrowGroup.rotation.y = -angle + Math.PI / 2;
            if (direction < 0) {
                arrowGroup.rotation.y += Math.PI;
            }

            this.app.sceneManager.scene.add(arrowGroup);
            this.opposingArrows.push(arrowGroup);
        }
    }

    clearOpposingArrows() {
        for (const arrow of this.opposingArrows) {
            this.app.sceneManager.scene.remove(arrow);
            arrow.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.opposingArrows = [];
    }

    update(deltaTime) {
        if (!this.isDropping) return;

        const tubeBottom = this.tube.position.y - this.tube.userData.height / 2;
        const groundY = 0.15;

        // Update magnet (with Lenz's law damping inside tube)
        const magnetY = this.magnet.position.y;
        const tubeY = this.tube.position.y;
        const tubeHeight = this.tube.userData.height;

        // Check if inside tube
        const isInsideTube = Math.abs(magnetY - tubeY) < tubeHeight / 2;

        // Apply gravity
        this.velocity -= this.gravity * deltaTime;

        // Apply Lenz's law damping when inside tube
        if (isInsideTube) {
            // Terminal velocity is much lower inside tube due to eddy current braking
            const terminalVelocity = 0.25 * (1 - this.damping);
            if (Math.abs(this.velocity) > terminalVelocity) {
                this.velocity *= this.damping;
            }
        }

        // Update position
        this.magnet.position.y += this.velocity;

        // Check ground collision
        if (this.magnet.position.y <= groundY) {
            this.magnet.position.y = groundY;
            this.velocity = 0;
        }

        // Update comparison sphere (no damping - falls freely)
        this.comparisonVelocity -= this.gravity * deltaTime;
        this.comparisonSphere.position.y += this.comparisonVelocity;

        if (this.comparisonSphere.position.y <= groundY) {
            this.comparisonSphere.position.y = groundY;
            this.comparisonVelocity = 0;
        }

        // Update labels to follow objects
        this.magnetLabel.position.y = this.magnet.position.y + 0.7;

        // Update opposing field visualization
        this.updateOpposingField();

        // Check if both objects have stopped
        if (this.magnet.position.y <= groundY && this.comparisonSphere.position.y <= groundY) {
            setTimeout(() => {
                this.isDropping = false;
            }, 500);
        }
    }

    cleanup() {
        // Remove tube
        if (this.tube) this.app.sceneManager.remove(this.tube);

        // Remove magnet
        if (this.magnet) this.app.sceneManager.remove(this.magnet);

        // Remove comparison sphere
        if (this.comparisonSphere) {
            this.app.sceneManager.scene.remove(this.comparisonSphere);
            this.comparisonSphere.geometry.dispose();
            this.comparisonSphere.material.dispose();
        }

        // Remove platform
        if (this.platform) {
            this.app.sceneManager.scene.remove(this.platform);
            this.platform.geometry.dispose();
            this.platform.material.dispose();
        }

        // Remove labels
        [this.magnetLabel, this.tubeLabel, this.comparisonLabel,
        this.explanationSprite, this.dropButton].forEach(sprite => {
            if (sprite) {
                this.app.sceneManager.scene.remove(sprite);
                if (sprite.material.map) sprite.material.map.dispose();
                sprite.material.dispose();
            }
        });

        // Clear arrows
        this.clearOpposingArrows();

        this.app.sliders.clear();

        // Clear options (including HTML button)
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }

        this.isDropping = false;
    }
}
