/**
 * Magnet Cutting Module - Demonstrate that cutting a magnet creates two smaller magnets (dipoles)
 * Shows why magnetic monopoles don't exist
 */
import * as THREE from 'three';

export class MagnetCuttingModule {
    constructor(app) {
        this.app = app;
        this.name = 'magnetCutting';
        this.title = 'Magnet Cutting Experiment';
        this.description = 'Swipe to cut the magnet and see how new poles form - you cannot create a monopole!';

        // Magnet parts
        this.originalMagnet = null;
        this.magnetPieces = []; // Array to hold all pieces after cutting
        this.leftHalf = null;
        this.rightHalf = null;
        this.isCut = false;
        this.cutCount = 0; // 0 = whole, 1 = 2 pieces, 2 = 4 pieces

        // Domain visualization
        this.domainArrows = [];
        this.showDomains = false;

        // Laser cutter visualization
        this.laserLine = null;
        this.laserPlane = null;
        this.cutParticles = [];

        // Interaction state
        this.isDragging = false;
        this.draggedPiece = null;
        this.cutPosition = 0.5; // Normalized position (0-1) along the magnet

        // Animation state
        this.time = 0;
        this.separationAnimation = 0;
        this.repulsionActive = false;

        // Field lines for cut pieces
        this.fieldLineGroups = [];
        this.fieldLineArrows = []; // Animated arrows along field lines

        // HUD elements
        this.infoSprite = null;
        this.tooltipSprite = null;
        this.swipeGuideSprite = null;
        this.swipeArrowTime = 0;
    }

    init() {
        // Disable orbit controls for this module - we need swipe interaction
        this.app.sceneManager.controls.enabled = false;

        this.createOriginalMagnet();
        this.createLaserCutter();
        this.createDomainArrows();
        this.createHUD();
        this.createSwipeGuide();
        this.setupOptions();
        this.setupInteraction();

        // Set up camera for better frontal view
        this.app.sceneManager.camera.position.set(0, 2, 6);
        this.app.sceneManager.camera.lookAt(0, 0.5, 0);
    }

    createOriginalMagnet() {
        const magnetGroup = new THREE.Group();

        // Magnet dimensions
        const width = 3;
        const height = 0.8;
        const depth = 0.8;

        // North pole (red) - left half
        const northGeom = new THREE.BoxGeometry(width / 2, height, depth);
        const northMat = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            metalness: 0.3,
            roughness: 0.6
        });
        const northPole = new THREE.Mesh(northGeom, northMat);
        northPole.position.x = -width / 4;
        magnetGroup.add(northPole);

        // South pole (blue) - right half
        const southGeom = new THREE.BoxGeometry(width / 2, height, depth);
        const southMat = new THREE.MeshStandardMaterial({
            color: 0x3498db,
            metalness: 0.3,
            roughness: 0.6
        });
        const southPole = new THREE.Mesh(southGeom, southMat);
        southPole.position.x = width / 4;
        magnetGroup.add(southPole);

        // Pole labels using sprites
        const labelN = this.createLabelSprite('N', '#ffffff');
        labelN.position.set(-width / 4, 0, depth / 2 + 0.1);
        labelN.scale.set(0.4, 0.4, 0.4);
        magnetGroup.add(labelN);

        const labelS = this.createLabelSprite('S', '#ffffff');
        labelS.position.set(width / 4, 0, depth / 2 + 0.1);
        labelS.scale.set(0.4, 0.4, 0.4);
        magnetGroup.add(labelS);

        // Store references
        magnetGroup.userData.northPole = northPole;
        magnetGroup.userData.southPole = southPole;
        magnetGroup.userData.width = width;
        magnetGroup.userData.height = height;
        magnetGroup.userData.depth = depth;

        this.originalMagnet = magnetGroup;
        this.originalMagnet.position.set(0, 0.5, 0);
        this.app.sceneManager.add(this.originalMagnet);

        // Create field lines for original magnet
        this.createOriginalMagnetFieldLines(width, height, depth);
    }

    /**
     * Create magnetic field lines for the original (uncut) magnet
     * Shows 3 lines above and 3 lines below, from N to S
     */
    createOriginalMagnetFieldLines(magnetWidth, magnetHeight, magnetDepth) {
        this.originalFieldLinesGroup = new THREE.Group();

        // Field line material
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4aa,
            transparent: true,
            opacity: 0.7,
            linewidth: 2
        });

        // Create 3 lines above and 3 lines below
        const lineHeights = [
            // Above the magnet (positive Y offsets)
            { yOffset: 0.5, zOffset: 0 },
            { yOffset: 0.8, zOffset: 0.2 },
            { yOffset: 0.8, zOffset: -0.2 },
            // Below the magnet (negative Y offsets)
            { yOffset: -0.5, zOffset: 0 },
            { yOffset: -0.8, zOffset: 0.2 },
            { yOffset: -0.8, zOffset: -0.2 },
        ];

        for (let i = 0; i < lineHeights.length; i++) {
            const config = lineHeights[i];
            const points = this.generateMagnetFieldLinePoints(
                magnetWidth,
                magnetHeight,
                config.yOffset,
                config.zOffset,
                config.yOffset > 0 // isAbove
            );

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial.clone());
            this.originalFieldLinesGroup.add(line);

            // Add animated arrows along each line (2 arrows per line, staggered)
            this.addAnimatedFieldArrows(this.originalFieldLinesGroup, points, 2, i * 0.15);
        }

        // Position at original magnet location
        this.originalFieldLinesGroup.position.copy(this.originalMagnet.position);
        this.app.sceneManager.add(this.originalFieldLinesGroup);
    }

    /**
     * Add animated arrows that move along field lines from N to S
     */
    addAnimatedFieldArrows(parentGroup, points, numArrows, phaseOffset = 0) {
        const arrowGeometry = new THREE.ConeGeometry(0.06, 0.15, 6);
        arrowGeometry.rotateX(Math.PI / 2); // Point along +Z for lookAt

        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.9
        });

        for (let i = 0; i < numArrows; i++) {
            const arrow = new THREE.Mesh(arrowGeometry.clone(), arrowMaterial.clone());
            parentGroup.add(arrow);

            // Store arrow data for animation
            const startT = (i / numArrows) + phaseOffset;
            this.fieldLineArrows.push({
                arrow: arrow,
                points: points,
                parentGroup: parentGroup,
                t: startT % 1 // Initial position along line (0-1)
            });
        }
    }

    /**
     * Generate points for a field line going from N pole to S pole
     * @param {number} magnetWidth - Width of the magnet
     * @param {number} magnetHeight - Height of the magnet
     * @param {number} yOffset - Vertical offset from magnet center
     * @param {number} zOffset - Depth offset for 3D effect
     * @param {boolean} isAbove - Whether this line curves above or below
     */
    generateMagnetFieldLinePoints(magnetWidth, magnetHeight, yOffset, zOffset, isAbove) {
        const points = [];
        const numSegments = 40;

        // N pole is on the left (-x), S pole is on the right (+x)
        const northX = -magnetWidth / 2;
        const southX = magnetWidth / 2;

        // Maximum height of the curve
        const curveHeight = Math.abs(yOffset) + magnetHeight * 0.8;
        const direction = isAbove ? 1 : -1;

        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;

            // X goes from north pole to south pole
            const x = northX + (southX - northX) * t;

            // Y follows an arc shape
            const arcT = Math.sin(t * Math.PI); // 0 -> 1 -> 0
            const y = direction * arcT * curveHeight;

            // Z for 3D depth effect
            const z = zOffset * Math.sin(t * Math.PI);

            points.push(new THREE.Vector3(x, y, z));
        }

        return points;
    }

    createLabelSprite(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.font = 'bold 80px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        return new THREE.Sprite(material);
    }

    createLaserCutter() {
        // Create laser cutting line
        const laserGeom = new THREE.BufferGeometry();
        const laserMat = new THREE.LineBasicMaterial({
            color: 0x00ff88,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });

        const points = [
            new THREE.Vector3(0, -2, 0),
            new THREE.Vector3(0, 2, 0)
        ];
        laserGeom.setFromPoints(points);

        this.laserLine = new THREE.Line(laserGeom, laserMat);
        this.laserLine.visible = false;
        this.app.sceneManager.add(this.laserLine);

        // Laser plane (visual effect when cutting)
        const planeGeom = new THREE.PlaneGeometry(0.05, 2);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.laserPlane = new THREE.Mesh(planeGeom, planeMat);
        this.laserPlane.visible = false;
        this.app.sceneManager.add(this.laserPlane);

        // Create cut particles
        for (let i = 0; i < 20; i++) {
            const particleGeom = new THREE.SphereGeometry(0.03, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0
            });
            const particle = new THREE.Mesh(particleGeom, particleMat);
            particle.userData.velocity = new THREE.Vector3();
            particle.userData.life = 0;
            this.cutParticles.push(particle);
            this.app.sceneManager.scene.add(particle);
        }
    }

    createDomainArrows() {
        // Create thousands of tiny arrows representing magnetic domains
        const magnetWidth = 3;
        const magnetHeight = 0.8;
        const magnetDepth = 0.8;

        const arrowsPerDimension = { x: 15, y: 4, z: 4 };

        // Arrow geometry (cone)
        const arrowGeom = new THREE.ConeGeometry(0.03, 0.1, 6);
        arrowGeom.rotateZ(-Math.PI / 2); // Point in +X direction (towards North)

        const arrowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0
        });

        for (let xi = 0; xi < arrowsPerDimension.x; xi++) {
            for (let yi = 0; yi < arrowsPerDimension.y; yi++) {
                for (let zi = 0; zi < arrowsPerDimension.z; zi++) {
                    const arrow = new THREE.Mesh(arrowGeom.clone(), arrowMat.clone());

                    // Position within the magnet
                    const x = -magnetWidth / 2 + (xi + 0.5) * (magnetWidth / arrowsPerDimension.x);
                    const y = -magnetHeight / 2 + (yi + 0.5) * (magnetHeight / arrowsPerDimension.y);
                    const z = -magnetDepth / 2 + (zi + 0.5) * (magnetDepth / arrowsPerDimension.z);

                    arrow.position.set(x, y, z);
                    arrow.userData.originalX = x;
                    arrow.userData.basePosition = new THREE.Vector3(x, y, z);

                    this.domainArrows.push(arrow);
                }
            }
        }

        // Add arrows to a group
        this.domainGroup = new THREE.Group();
        this.domainArrows.forEach(arrow => this.domainGroup.add(arrow));
        this.domainGroup.position.copy(this.originalMagnet.position);
        this.app.sceneManager.add(this.domainGroup);
    }

    createHUD() {
        // Info panel
        const infoCanvas = document.createElement('canvas');
        infoCanvas.width = 500;
        infoCanvas.height = 150;
        this.infoCanvas = infoCanvas;
        this.infoTexture = new THREE.CanvasTexture(infoCanvas);

        const infoSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.infoTexture, transparent: true })
        );
        infoSprite.scale.set(3.5, 1, 1);
        infoSprite.position.set(0, 2.5, 0);
        this.infoSprite = infoSprite;
        this.app.sceneManager.add(infoSprite);

        // Educational tooltip
        const tooltipCanvas = document.createElement('canvas');
        tooltipCanvas.width = 600;
        tooltipCanvas.height = 120;
        this.tooltipCanvas = tooltipCanvas;
        this.tooltipTexture = new THREE.CanvasTexture(tooltipCanvas);

        const tooltipSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.tooltipTexture, transparent: true })
        );
        tooltipSprite.scale.set(4, 0.8, 1);
        tooltipSprite.position.set(0, -1.2, 0);
        this.tooltipSprite = tooltipSprite;
        this.app.sceneManager.add(tooltipSprite);

        this.updateHUD();
    }

    createSwipeGuide() {
        // Create animated swipe guide sprite
        const guideCanvas = document.createElement('canvas');
        guideCanvas.width = 200;
        guideCanvas.height = 400;
        this.guideCanvas = guideCanvas;
        this.guideTexture = new THREE.CanvasTexture(guideCanvas);

        const guideSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: this.guideTexture, transparent: true })
        );
        guideSprite.scale.set(1, 2, 1);
        guideSprite.position.set(2.5, 0.5, 0);
        this.swipeGuideSprite = guideSprite;
        this.app.sceneManager.add(guideSprite);

        this.updateSwipeGuide(0);
    }

    updateSwipeGuide(animProgress) {
        if (!this.guideCanvas) return;

        const ctx = this.guideCanvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 400);

        if (this.isCut) {
            // Hide guide after cut
            if (this.swipeGuideSprite) {
                this.swipeGuideSprite.visible = false;
            }
            return;
        }

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.85)';
        ctx.roundRect(10, 10, 180, 380, 15);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 180, 380, 15);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#e8f4ff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SWIPE TO CUT', 100, 45);

        // Animated arrow going down
        const arrowY = 80 + (animProgress % 1) * 200;

        // Arrow trail
        const gradient = ctx.createLinearGradient(100, arrowY - 80, 100, arrowY);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0.8)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(100, arrowY - 80);
        ctx.lineTo(100, arrowY);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(100, arrowY + 20);
        ctx.lineTo(85, arrowY);
        ctx.lineTo(115, arrowY);
        ctx.closePath();
        ctx.fill();

        // Dashed line through center (representing cut line)
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(100, 70);
        ctx.lineTo(100, 290);
        ctx.stroke();
        ctx.setLineDash([]);

        // Mini magnet representation
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(40, 300, 55, 40);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(105, 300, 55, 40);

        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('N', 67, 325);
        ctx.fillText('S', 132, 325);

        // Hint text
        ctx.fillStyle = '#a0c8e8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('Drag down through', 100, 360);
        ctx.fillText('the magnet', 100, 375);

        this.guideTexture.needsUpdate = true;
    }

    updateHUD() {
        const ctx = this.infoCanvas.getContext('2d');
        ctx.clearRect(0, 0, 500, 150);

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.95)';
        ctx.roundRect(10, 10, 480, 130, 15);
        ctx.fill();

        // Border
        ctx.strokeStyle = this.isCut ? '#00ff88' : '#4285F4';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 480, 130, 15);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#e8f4ff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';

        let title, line1, line2, line3;
        if (this.cutCount === 0) {
            title = '🧲 Original Magnet';
            line1 = 'Swipe across the magnet to cut it';
            line2 = 'Original: [North | South]';
            line3 = 'What happens to the poles when you cut?';
        } else {
            title = '✂️ Cut into 2 Pieces!';
            line1 = 'Each half is now a complete dipole!';
            line2 = '[N|S]    [N|S]';
            line3 = 'You cannot create a magnetic monopole!';
        }

        ctx.fillText(title, 250, 45);

        // Status text
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = '#a0c8e8';
        ctx.fillText(line1, 250, 70);

        ctx.fillStyle = this.cutCount === 0 ? '#ffcc00' : '#00ff88';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(line2, 250, 95);

        ctx.fillStyle = this.cutCount >= 1 ? '#ff8888' : '#a0c8e8';
        ctx.font = 'italic 14px Inter, sans-serif';
        ctx.fillText(line3, 250, 120);

        this.infoTexture.needsUpdate = true;
        this.updateTooltip();
    }

    updateTooltip() {
        const ctx = this.tooltipCanvas.getContext('2d');
        ctx.clearRect(0, 0, 600, 120);

        // Background
        ctx.fillStyle = 'rgba(26, 27, 61, 0.95)';
        ctx.roundRect(10, 10, 580, 100, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#4285F4';
        ctx.lineWidth = 2;
        ctx.roundRect(10, 10, 580, 100, 10);
        ctx.stroke();

        // Icon
        ctx.font = '20px sans-serif';
        ctx.fillText('💡', 25, 50);

        // Educational text
        ctx.fillStyle = '#e8f4ff';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'left';

        let text1, text2;
        if (!this.isCut) {
            text1 = 'Magnetic domains are tiny regions where atoms align their magnetic moments.';
            text2 = 'Enable "Show Domains" to see the internal structure, then cut the magnet!';
        } else if (this.showDomains) {
            text1 = 'Notice: The arrows (domains) did NOT change direction after cutting!';
            text2 = 'The cut face exposes existing domain alignment, creating the new pole.';
        } else {
            text1 = 'New poles appeared at the cut faces because domains were already aligned.';
            text2 = 'Try dragging the pieces - like poles repel, opposite poles attract!';
        }

        ctx.fillText(text1, 55, 45);
        ctx.fillStyle = '#a0c8e8';
        ctx.fillText(text2, 55, 75);

        this.tooltipTexture.needsUpdate = true;
    }

    setupOptions() {
        // Cut button
        const cutBtn = document.createElement('button');
        cutBtn.className = 'option-btn primary';
        cutBtn.innerHTML = '✂️ Cut Magnet';
        cutBtn.id = 'cut-magnet-btn';
        cutBtn.addEventListener('click', () => {
            if (!this.isCut) {
                this.performCut();
            }
        });
        this.app.optionsContainer.appendChild(cutBtn);

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'option-btn';
        resetBtn.textContent = '🔄 Reset';
        resetBtn.addEventListener('click', () => {
            this.reset();
        });
        this.app.optionsContainer.appendChild(resetBtn);

        // Show domains toggle
        const domainGroup = document.createElement('div');
        domainGroup.className = 'toggle-group';
        domainGroup.style.marginTop = '1rem';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-label';
        toggleLabel.innerHTML = `
            <input type="checkbox" id="show-domains-toggle">
            <span class="toggle-switch"></span>
            <span>Show Domains</span>
        `;
        domainGroup.appendChild(toggleLabel);
        this.app.optionsContainer.appendChild(domainGroup);

        const domainCheckbox = document.getElementById('show-domains-toggle');
        domainCheckbox.addEventListener('change', (e) => {
            this.showDomains = e.target.checked;
            this.updateDomainVisibility();
            this.updateTooltip();
        });
    }

    updateDomainVisibility() {
        this.domainArrows.forEach(arrow => {
            arrow.material.opacity = this.showDomains ? 0.9 : 0;
        });
    }

    setupInteraction() {
        // Swipe detection for cutting
        let swipeStart = null;

        this.app.canvas.addEventListener('mousedown', (e) => {
            if (!this.isCut) {
                swipeStart = { x: e.clientX, y: e.clientY };
                this.laserLine.visible = true;
                this.laserPlane.visible = true;
            }
        });

        this.app.canvas.addEventListener('mousemove', (e) => {
            if (swipeStart && !this.isCut) {
                // Update laser position based on mouse
                const rect = this.app.canvas.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;

                // Position laser at mouse X
                const worldX = mouseX * 3;
                this.laserLine.position.x = worldX;
                this.laserPlane.position.set(worldX, 0.5, 0);

                // Check if swiping across the magnet
                const magnetWidth = 3;
                if (Math.abs(worldX) < magnetWidth / 2) {
                    this.cutPosition = (worldX + magnetWidth / 2) / magnetWidth;
                }
            }

            // Handle dragging pieces after cut
            if (this.isDragging && this.draggedPiece) {
                const rect = this.app.canvas.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const targetX = mouseX * 4;

                this.draggedPiece.position.x = targetX;

                // Check for repulsion between pieces
                this.checkRepulsion();
            }
        });

        this.app.canvas.addEventListener('mouseup', (e) => {
            if (swipeStart && !this.isCut) {
                const swipeEnd = { x: e.clientX, y: e.clientY };
                const swipeDistance = Math.abs(swipeEnd.y - swipeStart.y);

                // If significant vertical swipe, perform cut
                if (swipeDistance > 50) {
                    this.performCut();
                }
            }

            swipeStart = null;
            this.laserLine.visible = false;
            this.laserPlane.visible = false;
            this.isDragging = false;
            this.draggedPiece = null;
        });

        // Touch support
        this.app.canvas.addEventListener('touchstart', (e) => {
            if (!this.isCut && e.touches.length === 1) {
                swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        this.app.canvas.addEventListener('touchmove', (e) => {
            if (swipeStart && !this.isCut && e.touches.length === 1) {
                const touch = e.touches[0];
                const swipeDistance = Math.abs(touch.clientY - swipeStart.y);

                if (swipeDistance > 50) {
                    this.performCut();
                    swipeStart = null;
                }
            }
        });

        this.app.canvas.addEventListener('touchend', () => {
            swipeStart = null;
        });
    }

    performCut() {
        if (this.cutCount >= 1) return; // Only allow 1 cut (2 pieces)

        this.cutCount++;
        this.isCut = true;

        // Hide original magnet and its field lines, create 2 halves
        this.originalMagnet.visible = false;
        if (this.originalFieldLinesGroup) {
            this.originalFieldLinesGroup.visible = false;
        }
        this.createCutHalves();

        // Animate cut particles
        this.spawnCutParticles();

        // Start separation animation
        this.separationAnimation = 0;

        // Update button state
        const cutBtn = document.getElementById('cut-magnet-btn');
        if (cutBtn) {
            cutBtn.disabled = true;
            cutBtn.textContent = '✅ Cut Complete!';
        }

        // Update HUD
        this.updateHUD();

        // Hide swipe guide
        if (this.swipeGuideSprite) {
            this.swipeGuideSprite.visible = false;
        }
    }

    createCutHalves() {
        const magnetWidth = 3;
        const magnetHeight = 0.8;
        const magnetDepth = 0.8;

        // Left half: Original North + New South at cut face
        const leftGroup = new THREE.Group();

        // North end (original)
        const leftNorthGeom = new THREE.BoxGeometry(magnetWidth / 4, magnetHeight, magnetDepth);
        const leftNorthMat = new THREE.MeshStandardMaterial({
            color: 0xe74c3c, // Red
            metalness: 0.3,
            roughness: 0.6
        });
        const leftNorth = new THREE.Mesh(leftNorthGeom, leftNorthMat);
        leftNorth.position.x = -magnetWidth / 8;
        leftGroup.add(leftNorth);

        // New South end at cut (lighter blue)
        const leftSouthGeom = new THREE.BoxGeometry(magnetWidth / 4, magnetHeight, magnetDepth);
        const leftSouthMat = new THREE.MeshStandardMaterial({
            color: 0x5dade2, // Lighter blue for new pole
            metalness: 0.3,
            roughness: 0.6,
            emissive: 0x3498db,
            emissiveIntensity: 0.2
        });
        const leftSouth = new THREE.Mesh(leftSouthGeom, leftSouthMat);
        leftSouth.position.x = magnetWidth / 8;
        leftGroup.add(leftSouth);

        // Labels for left half
        const leftLabelN = this.createLabelSprite('N', '#ffffff');
        leftLabelN.position.set(-magnetWidth / 8, 0, magnetDepth / 2 + 0.1);
        leftLabelN.scale.set(0.3, 0.3, 0.3);
        leftGroup.add(leftLabelN);

        const leftLabelS = this.createLabelSprite('S', '#aaddff'); // New pole (lighter)
        leftLabelS.position.set(magnetWidth / 8, 0, magnetDepth / 2 + 0.1);
        leftLabelS.scale.set(0.3, 0.3, 0.3);
        leftGroup.add(leftLabelS);

        leftGroup.position.set(-magnetWidth / 4 - 0.1, 0.5, 0);
        leftGroup.userData.isLeftHalf = true;
        leftGroup.userData.isDraggable = true;
        this.leftHalf = leftGroup;
        this.app.sceneManager.add(leftGroup);

        // Right half: New North at cut face + Original South
        const rightGroup = new THREE.Group();

        // New North end at cut (lighter red)
        const rightNorthGeom = new THREE.BoxGeometry(magnetWidth / 4, magnetHeight, magnetDepth);
        const rightNorthMat = new THREE.MeshStandardMaterial({
            color: 0xf1948a, // Lighter red for new pole
            metalness: 0.3,
            roughness: 0.6,
            emissive: 0xe74c3c,
            emissiveIntensity: 0.2
        });
        const rightNorth = new THREE.Mesh(rightNorthGeom, rightNorthMat);
        rightNorth.position.x = -magnetWidth / 8;
        rightGroup.add(rightNorth);

        // South end (original)
        const rightSouthGeom = new THREE.BoxGeometry(magnetWidth / 4, magnetHeight, magnetDepth);
        const rightSouthMat = new THREE.MeshStandardMaterial({
            color: 0x3498db, // Blue
            metalness: 0.3,
            roughness: 0.6
        });
        const rightSouth = new THREE.Mesh(rightSouthGeom, rightSouthMat);
        rightSouth.position.x = magnetWidth / 8;
        rightGroup.add(rightSouth);

        // Labels for right half
        const rightLabelN = this.createLabelSprite('N', '#ffaaaa'); // New pole (lighter)
        rightLabelN.position.set(-magnetWidth / 8, 0, magnetDepth / 2 + 0.1);
        rightLabelN.scale.set(0.3, 0.3, 0.3);
        rightGroup.add(rightLabelN);

        const rightLabelS = this.createLabelSprite('S', '#ffffff');
        rightLabelS.position.set(magnetWidth / 8, 0, magnetDepth / 2 + 0.1);
        rightLabelS.scale.set(0.3, 0.3, 0.3);
        rightGroup.add(rightLabelS);

        rightGroup.position.set(magnetWidth / 4 + 0.1, 0.5, 0);
        rightGroup.userData.isRightHalf = true;
        rightGroup.userData.isDraggable = true;
        this.rightHalf = rightGroup;
        this.app.sceneManager.add(rightGroup);
        // Make pieces draggable
        this.app.interaction.addDraggable(this.leftHalf);
        this.app.interaction.addDraggable(this.rightHalf);

        // Update domain arrows to split
        this.splitDomainArrows();

        // Create magnetic field lines for each piece
        this.createFieldLinesForPiece(this.leftHalf, magnetWidth / 2, magnetHeight, magnetDepth);
        this.createFieldLinesForPiece(this.rightHalf, magnetWidth / 2, magnetHeight, magnetDepth);
    }

    /**
     * Create magnetic field lines for a magnet piece (after cutting)
     * Shows 3 lines above and 3 lines below, from N pole to S pole
     */
    createFieldLinesForPiece(magnetPiece, pieceWidth, pieceHeight, pieceDepth) {
        const fieldGroup = new THREE.Group();

        // Field line material
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4aa,
            transparent: true,
            opacity: 0.7,
            linewidth: 2
        });

        // Create 3 lines above and 3 lines below
        const lineConfigs = [
            // Above the magnet
            { yOffset: 0.3, zOffset: 0 },
            { yOffset: 0.5, zOffset: 0.15 },
            { yOffset: 0.5, zOffset: -0.15 },
            // Below the magnet
            { yOffset: -0.3, zOffset: 0 },
            { yOffset: -0.5, zOffset: 0.15 },
            { yOffset: -0.5, zOffset: -0.15 },
        ];

        for (let i = 0; i < lineConfigs.length; i++) {
            const config = lineConfigs[i];
            const points = this.generatePieceFieldLinePoints(
                pieceWidth,
                config.yOffset,
                config.zOffset
            );

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial.clone());
            fieldGroup.add(line);

            // Add animated arrows along each line
            this.addAnimatedFieldArrows(fieldGroup, points, 2, i * 0.12);
        }

        // Position field group relative to magnet piece
        fieldGroup.position.copy(magnetPiece.position);
        this.fieldLineGroups.push({ group: fieldGroup, magnet: magnetPiece });
        this.app.sceneManager.add(fieldGroup);
    }

    /**
     * Generate points for a piece's field line from N to S
     */
    generatePieceFieldLinePoints(pieceWidth, yOffset, zOffset) {
        const points = [];
        const numSegments = 30;

        // N pole is on the left (-x), S pole is on the right (+x)
        const northX = -pieceWidth / 4;
        const southX = pieceWidth / 4;

        // Curve height based on offset
        const curveHeight = Math.abs(yOffset) + pieceWidth * 0.3;
        const direction = yOffset > 0 ? 1 : -1;

        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;

            // X goes from north pole to south pole
            const x = northX + (southX - northX) * t;

            // Y follows an arc shape
            const arcT = Math.sin(t * Math.PI);
            const y = direction * arcT * curveHeight;

            // Z for 3D depth
            const z = zOffset * Math.sin(t * Math.PI);

            points.push(new THREE.Vector3(x, y, z));
        }

        return points;
    }

    /**
     * Generate points for a single dipole field line
     */
    generateDipoleFieldLinePoints(pieceWidth, verticalAngle) {
        const points = [];
        const numSegments = 30;

        // North pole is on the left (-x), South pole is on the right (+x)
        const northX = -pieceWidth / 4;
        const southX = pieceWidth / 4;

        // Height/depth of the curve
        const curveHeight = pieceWidth * 0.6;
        const yOffset = Math.sin(verticalAngle) * curveHeight * 0.5;
        const zOffset = Math.cos(verticalAngle) * 0.3;

        // Create smooth curve from North pole around to South pole
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;

            // Parametric ellipse-like curve
            // x goes from northX to southX
            const x = northX + (southX - northX) * t;

            // y follows a sine curve (up in the middle)
            const normalizedT = (t - 0.5) * 2; // -1 to 1
            const y = Math.sqrt(1 - normalizedT * normalizedT) * curveHeight + yOffset;

            // z offset for 3D depth
            const z = zOffset * Math.sin(t * Math.PI);

            points.push(new THREE.Vector3(x, y, z));
        }

        return points;
    }

    /**
     * Add small arrow cones along a field line to indicate direction
     */
    addFieldArrows(group, points, numArrows) {
        const arrowGeometry = new THREE.ConeGeometry(0.04, 0.1, 6);
        arrowGeometry.rotateX(Math.PI / 2); // Point along +Z for lookAt

        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4aa,
            transparent: true,
            opacity: 0.9
        });

        for (let i = 0; i < numArrows; i++) {
            const t = (i + 1) / (numArrows + 1);
            const idx = Math.floor(t * (points.length - 1));

            if (idx >= points.length - 1) continue;

            const arrow = new THREE.Mesh(arrowGeometry.clone(), arrowMaterial.clone());
            arrow.position.copy(points[idx]);

            // Orient arrow along the field line direction
            const direction = new THREE.Vector3()
                .subVectors(points[idx + 1], points[idx])
                .normalize();

            if (direction.lengthSq() > 0.0001) {
                const lookTarget = arrow.position.clone().add(direction);
                arrow.lookAt(lookTarget);
            }

            group.add(arrow);
        }
    }

    createFourPieces() {
        const magnetWidth = 3;
        const magnetHeight = 0.8;
        const magnetDepth = 0.8;
        const pieceWidth = magnetWidth / 4; // Each piece is 1/4 of original

        // Colors: gradient from red (N) to blue (S)
        const colors = {
            strongN: 0xe74c3c,  // Deep red (original N)
            weakN: 0xf1948a,    // Light red (new n)
            weakS: 0x5dade2,    // Light blue (new s)
            strongS: 0x3498db   // Deep blue (original S)
        };

        // Create 4 pieces, each is a complete dipole
        // Piece 1: Far left [N|s] - original North end
        // Piece 2: Left-center [n|s]
        // Piece 3: Right-center [n|s]
        // Piece 4: Far right [n|S] - original South end

        const pieceConfigs = [
            { leftColor: colors.strongN, rightColor: colors.weakS, leftLabel: 'N', rightLabel: 'S', posX: -1.5 },
            { leftColor: colors.weakN, rightColor: colors.weakS, leftLabel: 'N', rightLabel: 'S', posX: -0.5 },
            { leftColor: colors.weakN, rightColor: colors.weakS, leftLabel: 'N', rightLabel: 'S', posX: 0.5 },
            { leftColor: colors.weakN, rightColor: colors.strongS, leftLabel: 'N', rightLabel: 'S', posX: 1.5 }
        ];

        this.magnetPieces = [];

        pieceConfigs.forEach((config, index) => {
            const pieceGroup = new THREE.Group();

            // Left half of piece (North side)
            const leftGeom = new THREE.BoxGeometry(pieceWidth / 2, magnetHeight, magnetDepth);
            const leftMat = new THREE.MeshStandardMaterial({
                color: config.leftColor,
                metalness: 0.3,
                roughness: 0.6,
                emissive: config.leftLabel === 'N' ? 0 : config.leftColor,
                emissiveIntensity: config.leftLabel === 'N' ? 0 : 0.15
            });
            const leftHalf = new THREE.Mesh(leftGeom, leftMat);
            leftHalf.position.x = -pieceWidth / 4;
            pieceGroup.add(leftHalf);

            // Right half of piece (South side)
            const rightGeom = new THREE.BoxGeometry(pieceWidth / 2, magnetHeight, magnetDepth);
            const rightMat = new THREE.MeshStandardMaterial({
                color: config.rightColor,
                metalness: 0.3,
                roughness: 0.6,
                emissive: config.rightLabel === 'S' ? 0 : config.rightColor,
                emissiveIntensity: config.rightLabel === 'S' ? 0 : 0.15
            });
            const rightHalf = new THREE.Mesh(rightGeom, rightMat);
            rightHalf.position.x = pieceWidth / 4;
            pieceGroup.add(rightHalf);

            // Labels
            const leftLabelColor = config.leftLabel === 'N' ? '#ffffff' : '#ffcccc';
            const rightLabelColor = config.rightLabel === 'S' ? '#ffffff' : '#ccddff';

            const labelLeft = this.createLabelSprite(config.leftLabel, leftLabelColor);
            labelLeft.position.set(-pieceWidth / 4, 0, magnetDepth / 2 + 0.1);
            labelLeft.scale.set(0.2, 0.2, 0.2);
            pieceGroup.add(labelLeft);

            const labelRight = this.createLabelSprite(config.rightLabel, rightLabelColor);
            labelRight.position.set(pieceWidth / 4, 0, magnetDepth / 2 + 0.1);
            labelRight.scale.set(0.2, 0.2, 0.2);
            pieceGroup.add(labelRight);

            // Position piece
            pieceGroup.position.set(config.posX, 0.5, 0);
            pieceGroup.userData.pieceIndex = index;
            pieceGroup.userData.isDraggable = true;

            this.magnetPieces.push(pieceGroup);
            this.app.sceneManager.add(pieceGroup);
            this.app.interaction.addDraggable(pieceGroup);
        });

        // For compatibility with existing code
        this.leftHalf = this.magnetPieces[0];
        this.rightHalf = this.magnetPieces[3];

        // Update domain arrows for 4 pieces
        this.splitDomainArrowsFour();
    }

    splitDomainArrowsFour() {
        // Redistribute arrows to show they're now in four pieces
        const magnetWidth = 3;
        this.domainArrows.forEach(arrow => {
            const originalX = arrow.userData.originalX;
            const normalizedX = (originalX + magnetWidth / 2) / magnetWidth; // 0 to 1

            if (normalizedX < 0.25) {
                arrow.userData.piece = 0;
            } else if (normalizedX < 0.5) {
                arrow.userData.piece = 1;
            } else if (normalizedX < 0.75) {
                arrow.userData.piece = 2;
            } else {
                arrow.userData.piece = 3;
            }
        });
    }

    splitDomainArrows() {
        // Redistribute arrows to show they're now in two pieces
        this.domainArrows.forEach(arrow => {
            const originalX = arrow.userData.originalX;

            if (originalX < 0) {
                // Left half - offset to follow left piece
                arrow.userData.piece = 'left';
            } else {
                // Right half - offset to follow right piece
                arrow.userData.piece = 'right';
            }
        });
    }

    spawnCutParticles() {
        this.cutParticles.forEach(particle => {
            particle.position.set(0, 0.5, 0);
            particle.userData.velocity.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            particle.userData.life = 1;
            particle.material.opacity = 1;
        });
    }

    checkRepulsion() {
        if (!this.leftHalf || !this.rightHalf) return;

        const distance = this.leftHalf.position.distanceTo(this.rightHalf.position);

        // When pieces are close, apply repulsion between like poles at cut faces
        // Left piece has South (s) on right, Right piece has North (n) on left
        // These should ATTRACT (opposite poles), but if user tries to join original poles, repel

        if (distance < 2) {
            // Determine orientation - check which ends are facing each other
            const leftCenter = this.leftHalf.position.x;
            const rightCenter = this.rightHalf.position.x;

            // If right piece is to the left of left piece, the user is trying to 
            // bring the wrong poles together (N-N or S-S)
            if (rightCenter < leftCenter) {
                // Repulsion! Push pieces apart
                this.repulsionActive = true;
                const repulsionForce = 0.1 / Math.max(0.5, distance);
                this.leftHalf.position.x += repulsionForce;
                this.rightHalf.position.x -= repulsionForce;
            } else {
                this.repulsionActive = false;
            }
        }
    }

    reset() {
        // Remove magnet halves
        if (this.leftHalf) {
            this.app.interaction.removeDraggable(this.leftHalf);
            this.app.sceneManager.remove(this.leftHalf);
            this.leftHalf = null;
        }
        if (this.rightHalf) {
            this.app.interaction.removeDraggable(this.rightHalf);
            this.app.sceneManager.remove(this.rightHalf);
            this.rightHalf = null;
        }

        // Remove legacy magnet pieces
        for (const piece of this.magnetPieces) {
            this.app.interaction.removeDraggable(piece);
            this.app.sceneManager.remove(piece);
        }
        this.magnetPieces = [];

        // Remove field line groups (cut pieces only)
        for (const { group } of this.fieldLineGroups) {
            this.app.sceneManager.remove(group);
        }
        this.fieldLineGroups = [];

        // Remove animated arrows from cut pieces (keep original magnet arrows)
        this.fieldLineArrows = this.fieldLineArrows.filter(arrowData => {
            if (arrowData.parentGroup === this.originalFieldLinesGroup) {
                return true; // Keep original magnet arrows
            }
            return false; // Remove cut piece arrows
        });

        // Show original magnet and its field lines
        this.originalMagnet.visible = true;
        if (this.originalFieldLinesGroup) {
            this.originalFieldLinesGroup.visible = true;
        }
        this.isCut = false;
        this.cutCount = 0;
        this.separationAnimation = 0;

        // Reset domain arrows
        this.domainArrows.forEach(arrow => {
            arrow.position.copy(arrow.userData.basePosition);
            arrow.userData.piece = null;
        });
        this.domainGroup.position.copy(this.originalMagnet.position);

        // Reset button
        const cutBtn = document.getElementById('cut-magnet-btn');
        if (cutBtn) {
            cutBtn.disabled = false;
            cutBtn.textContent = '✂️ Cut Magnet';
        }

        // Update HUD
        this.updateHUD();

        // Show swipe guide again
        if (this.swipeGuideSprite) {
            this.swipeGuideSprite.visible = true;
        }
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Animate separation after cut (2 pieces spreading apart)
        if (this.isCut && this.separationAnimation < 1) {
            this.separationAnimation += deltaTime * 0.5;

            const separation = Math.min(1, this.separationAnimation) * 0.5;

            // Animate 2 halves spreading apart
            if (this.leftHalf && this.rightHalf) {
                this.leftHalf.position.x = -0.75 - separation * 0.8;
                this.rightHalf.position.x = 0.75 + separation * 0.8;

                // Update field line positions to follow magnets
                this.fieldLineGroups.forEach(({ group, magnet }) => {
                    group.position.copy(magnet.position);
                });
            }
        }

        // Animate cut particles
        this.cutParticles.forEach(particle => {
            if (particle.userData.life > 0) {
                particle.userData.life -= deltaTime * 2;
                particle.material.opacity = particle.userData.life;

                particle.position.add(
                    particle.userData.velocity.clone().multiplyScalar(deltaTime)
                );
                particle.userData.velocity.y -= deltaTime * 5; // Gravity
            }
        });

        // Animate domain arrows position following the magnet pieces (2 pieces)
        if (this.isCut && this.showDomains && this.leftHalf && this.rightHalf) {
            const magnetWidth = 3;
            this.domainArrows.forEach(arrow => {
                const basePos = arrow.userData.basePosition;
                const piece = arrow.userData.piece;

                if (piece === 'left') {
                    arrow.position.x = basePos.x + this.leftHalf.position.x + magnetWidth / 4;
                } else if (piece === 'right') {
                    arrow.position.x = basePos.x + this.rightHalf.position.x - magnetWidth / 4;
                }
            });
        }

        // Animate field line arrows (moving from N to S)
        this.fieldLineArrows.forEach(arrowData => {
            const { arrow, points, parentGroup } = arrowData;

            // Move arrow along the line (N to S direction)
            arrowData.t += deltaTime * 0.3; // Animation speed
            if (arrowData.t > 1) arrowData.t -= 1; // Loop back

            const t = arrowData.t;
            const idx = Math.floor(t * (points.length - 1));
            const alpha = (t * (points.length - 1)) - idx;

            if (idx < points.length - 1) {
                const p1 = points[idx];
                const p2 = points[idx + 1];

                // Interpolate position
                const pos = new THREE.Vector3().lerpVectors(p1, p2, alpha);
                arrow.position.copy(pos);

                // Orient arrow along the line direction (N to S)
                const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
                if (direction.lengthSq() > 0.0001) {
                    const lookTarget = pos.clone().add(direction);
                    arrow.lookAt(lookTarget);
                }
            }
        });

        // Pulse effect on laser when visible
        if (this.laserLine.visible) {
            const pulse = Math.sin(this.time * 10) * 0.2 + 0.8;
            this.laserLine.material.opacity = pulse;
            this.laserPlane.material.opacity = pulse * 0.4;
        }

        // Animate swipe guide
        if (!this.isCut) {
            this.swipeArrowTime += deltaTime * 0.8;
            this.updateSwipeGuide(this.swipeArrowTime);
        }
    }

    cleanup() {
        // Remove original magnet
        if (this.originalMagnet) {
            this.app.sceneManager.remove(this.originalMagnet);
        }

        // Remove magnet halves
        if (this.leftHalf) {
            this.app.interaction.removeDraggable(this.leftHalf);
            this.app.sceneManager.remove(this.leftHalf);
        }
        if (this.rightHalf) {
            this.app.interaction.removeDraggable(this.rightHalf);
            this.app.sceneManager.remove(this.rightHalf);
        }

        // Remove all magnet pieces (legacy 4 pieces support)
        for (const piece of this.magnetPieces) {
            this.app.interaction.removeDraggable(piece);
            this.app.sceneManager.remove(piece);
        }
        this.magnetPieces = [];

        // Remove field line groups
        for (const { group } of this.fieldLineGroups) {
            this.app.sceneManager.remove(group);
        }
        this.fieldLineGroups = [];

        // Clear all animated field line arrows
        this.fieldLineArrows = [];

        // Remove original field lines
        if (this.originalFieldLinesGroup) {
            this.app.sceneManager.remove(this.originalFieldLinesGroup);
            this.originalFieldLinesGroup = null;
        }

        // Remove laser cutter
        if (this.laserLine) this.app.sceneManager.remove(this.laserLine);
        if (this.laserPlane) this.app.sceneManager.remove(this.laserPlane);

        // Remove particles
        this.cutParticles.forEach(p => this.app.sceneManager.scene.remove(p));
        this.cutParticles = [];

        // Remove domain arrows
        if (this.domainGroup) {
            this.app.sceneManager.remove(this.domainGroup);
        }
        this.domainArrows = [];

        // Remove HUD
        if (this.infoSprite) this.app.sceneManager.remove(this.infoSprite);
        if (this.tooltipSprite) this.app.sceneManager.remove(this.tooltipSprite);
        if (this.swipeGuideSprite) this.app.sceneManager.remove(this.swipeGuideSprite);

        // Clear options
        if (this.app.optionsContainer) {
            this.app.optionsContainer.innerHTML = '';
        }

        // Clear sliders
        this.app.sliders.clear();

        // Re-enable orbit controls for other modules
        this.app.sceneManager.controls.enabled = true;
    }
}
