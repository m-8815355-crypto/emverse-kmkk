/**
 * Electromagnetic Induction Module - Moving magnet through coil
 * Demonstrates Faraday's Law and Lenz's Law with proper physics
 */
import * as THREE from 'three';

export class InductionModule {
    constructor(app) {
        this.app = app;
        this.name = 'induction';
        this.title = 'Electromagnetic Induction';
        this.description = 'Drag the magnet through the coil to induce current';

        this.coil = null;
        this.magnet = null;
        this.galvanometer = null;
        this.inducedArrows = [];
        this.lastMagnetPos = new THREE.Vector3();
        this.velocity = 0;
        this.smoothedVelocity = 0; // For smoother galvanometer response
    }

    init() {
        // Create stationary coil (oriented vertically)
        this.coil = this.app.components.createSolenoid({
            turns: 15,
            radius: 0.6,
            length: 1.5
        });
        this.coil.position.set(0, 0.5, 0);
        this.coil.rotation.z = Math.PI / 2; // Vertical orientation
        this.coil.userData.draggable = false;
        this.app.sceneManager.add(this.coil);

        // Create movable bar magnet
        this.magnet = this.app.components.createBarMagnet({
            strength: 1,
            length: 1.5,
            width: 0.4,
            height: 0.3
        });
        this.magnet.position.set(0, 2.5, 0);
        this.magnet.rotation.z = Math.PI / 2; // Align with coil axis (N pole on top)
        this.app.sceneManager.add(this.magnet);
        this.app.interaction.addDraggable(this.magnet);

        // Set drag plane to vertical
        this.app.interaction.dragPlane.set(new THREE.Vector3(0, 0, 1), 0);

        // Create improved galvanometer
        this.createGalvanometer();

        // Create connecting wires (visual only)
        this.createWires();

        // Create sliders
        this.app.sliders.createSlider({
            id: 'coil-turns',
            label: 'Coil Turns',
            min: 5,
            max: 30,
            value: 15,
            step: 1,
            unit: '',
            onChange: (val) => {
                this.coil.userData.turns = val;
            }
        });

        // Track magnet movement for velocity calculation
        this.lastMagnetPos.copy(this.magnet.position);

        // Create magnetic field lines around the magnet
        this.createMagnetFieldLines();

        // Setup drag callbacks
        this.app.interaction.onDrag = (obj, pos) => {
            if (obj === this.magnet) {
                // Constrain magnet to vertical movement
                this.magnet.position.x = 0;
                this.magnet.position.z = 0;
                this.updateInduction();

                // Update field lines position with magnet
                if (this.magnetFieldLinesGroup) {
                    this.magnetFieldLinesGroup.position.copy(this.magnet.position);
                }
            }
        };

        // Create instruction label
        this.createInstructionLabel();
    }

    /**
     * Create magnetic field lines around the bar magnet
     * Shows magnetic flux that will cut through the coil
     */
    createMagnetFieldLines() {
        this.magnetFieldLinesGroup = new THREE.Group();
        this.magnetFieldArrows = []; // For animation

        // Field line material
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4aa,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });

        // Create field lines radiating from N pole (top) to S pole (bottom)
        // Since magnet is rotated 90° on Z, N is at +Y and S is at -Y
        const magnetLength = 1.5;
        const numLines = 6; // 6 field lines around the magnet

        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2;
            const points = this.generateInductionFieldLinePoints(magnetLength, angle);

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial.clone());
            this.magnetFieldLinesGroup.add(line);

            // Add animated arrows (2 per line)
            this.addInductionFieldArrows(points, 2, i * 0.1);
        }

        // Position at magnet location
        this.magnetFieldLinesGroup.position.copy(this.magnet.position);
        this.app.sceneManager.add(this.magnetFieldLinesGroup);
    }

    /**
     * Generate points for a field line going from N pole (top) to S pole (bottom)
     */
    generateInductionFieldLinePoints(magnetLength, angle) {
        const points = [];
        const numSegments = 40;

        // N pole is at top (+y), S pole is at bottom (-y) due to rotation
        const northY = magnetLength / 2;
        const southY = -magnetLength / 2;

        // Curve radius based on angle (how far the line extends outward)
        const curveRadius = 0.8;
        const xOffset = Math.cos(angle) * curveRadius;
        const zOffset = Math.sin(angle) * curveRadius;

        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;

            // Y goes from north pole to south pole
            const y = northY + (southY - northY) * t;

            // X and Z follow a bulging curve (max at middle)
            const bulge = Math.sin(t * Math.PI);
            const x = xOffset * bulge;
            const z = zOffset * bulge;

            points.push(new THREE.Vector3(x, y, z));
        }

        return points;
    }

    /**
     * Add animated arrows along induction field lines
     */
    addInductionFieldArrows(points, numArrows, phaseOffset = 0) {
        const arrowGeometry = new THREE.ConeGeometry(0.05, 0.12, 6);
        arrowGeometry.rotateX(Math.PI / 2); // Point along +Z for lookAt

        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0.9
        });

        for (let i = 0; i < numArrows; i++) {
            const arrow = new THREE.Mesh(arrowGeometry.clone(), arrowMaterial.clone());
            this.magnetFieldLinesGroup.add(arrow);

            // Store arrow data for animation
            const startT = (i / numArrows) + phaseOffset;
            this.magnetFieldArrows.push({
                arrow: arrow,
                points: points,
                t: startT % 1
            });
        }
    }

    createGalvanometer() {
        // Create a more detailed galvanometer with clear scale
        const group = new THREE.Group();
        group.userData = { type: 'galvanometer', currentValue: 0 };

        // Body - larger and more visible
        const bodyGeom = new THREE.BoxGeometry(1.0, 0.9, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.3,
            roughness: 0.4
        });
        const bodyMesh = new THREE.Mesh(bodyGeom, bodyMaterial);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Display face - cream colored
        const faceGeom = new THREE.PlaneGeometry(0.85, 0.7);
        const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xfffef0 });
        const faceMesh = new THREE.Mesh(faceGeom, faceMaterial);
        faceMesh.position.z = 0.26;
        group.add(faceMesh);

        // Create scale with canvas
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = 256;
        scaleCanvas.height = 200;
        const ctx = scaleCanvas.getContext('2d');

        // Draw scale arc
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // Main arc
        ctx.beginPath();
        ctx.arc(128, 180, 100, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        // Tick marks and labels
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        const labels = ['-3', '-2', '-1', '0', '+1', '+2', '+3'];
        for (let i = 0; i <= 6; i++) {
            const angle = Math.PI * 1.15 + (i / 6) * Math.PI * 0.7;
            const x1 = 128 + Math.cos(angle) * 85;
            const y1 = 180 + Math.sin(angle) * 85;
            const x2 = 128 + Math.cos(angle) * 100;
            const y2 = 180 + Math.sin(angle) * 100;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Labels
            const labelX = 128 + Math.cos(angle) * 70;
            const labelY = 180 + Math.sin(angle) * 70;
            ctx.fillText(labels[i], labelX, labelY);
        }

        // Small ticks
        for (let i = 0; i < 30; i++) {
            if (i % 5 === 0) continue;
            const angle = Math.PI * 1.15 + (i / 30) * Math.PI * 0.7;
            const x1 = 128 + Math.cos(angle) * 92;
            const y1 = 180 + Math.sin(angle) * 92;
            const x2 = 128 + Math.cos(angle) * 100;
            const y2 = 180 + Math.sin(angle) * 100;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Center label
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#1e6b5c';
        ctx.fillText('GALVANOMETER', 128, 50);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('mA', 128, 70);

        const scaleTexture = new THREE.CanvasTexture(scaleCanvas);
        const scaleGeom = new THREE.PlaneGeometry(0.80, 0.62);
        const scaleMesh = new THREE.Mesh(scaleGeom, new THREE.MeshBasicMaterial({
            map: scaleTexture,
            transparent: true
        }));
        scaleMesh.position.set(0, 0.05, 0.27);
        group.add(scaleMesh);

        // Needle - pivots from bottom center
        const needleGroup = new THREE.Group();

        // Needle body
        const needleGeom = new THREE.BoxGeometry(0.4, 0.02, 0.01);
        const needleMesh = new THREE.Mesh(needleGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
        needleMesh.position.x = 0.15; // Offset so pivot is at left end
        needleGroup.add(needleMesh);

        // Needle tip (triangle)
        const tipGeom = new THREE.ConeGeometry(0.025, 0.06, 3);
        tipGeom.rotateZ(-Math.PI / 2);
        const tipMesh = new THREE.Mesh(tipGeom, new THREE.MeshBasicMaterial({ color: 0xe74c3c }));
        tipMesh.position.x = 0.38;
        needleGroup.add(tipMesh);

        // Pivot point
        const pivotGeom = new THREE.SphereGeometry(0.025, 8, 8);
        const pivotMesh = new THREE.Mesh(pivotGeom, new THREE.MeshBasicMaterial({ color: 0x333333 }));
        needleGroup.add(pivotMesh);

        needleGroup.position.set(0, -0.15, 0.28);
        needleGroup.rotation.z = Math.PI / 2; // Start pointing up (center/zero)
        group.add(needleGroup);
        group.userData.needle = needleGroup;

        // Terminals
        const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7 });
        const terminalGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);

        const leftTerminal = new THREE.Mesh(terminalGeom, terminalMaterial);
        leftTerminal.position.set(-0.35, -0.55, 0);
        group.add(leftTerminal);

        const rightTerminal = new THREE.Mesh(terminalGeom.clone(), terminalMaterial);
        rightTerminal.position.set(0.35, -0.55, 0);
        group.add(rightTerminal);

        group.position.set(2.2, 0.5, 0);
        group.rotation.y = -Math.PI / 4;

        this.galvanometer = group;
        this.app.sceneManager.add(group);
    }

    createWires() {
        // Simple wire connection between coil and galvanometer
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
        const wireRadius = 0.02;

        // Create curved wire path
        const path1 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.75, 1.2, 0),
            new THREE.Vector3(-1, 1.2, 0.5),
            new THREE.Vector3(0.5, 0.8, 0.8),
            new THREE.Vector3(1.6, 0.4, 0.3)
        ]);

        const wire1Geom = new THREE.TubeGeometry(path1, 20, wireRadius, 8, false);
        const wire1 = new THREE.Mesh(wire1Geom, wireMaterial);
        this.app.sceneManager.scene.add(wire1);
        this.wires = [wire1];

        const path2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.75, 1.2, 0),
            new THREE.Vector3(1, 1.2, -0.5),
            new THREE.Vector3(1.5, 0.8, -0.3),
            new THREE.Vector3(2.6, 0.4, -0.3)
        ]);

        const wire2Geom = new THREE.TubeGeometry(path2, 20, wireRadius, 8, false);
        const wire2 = new THREE.Mesh(wire2Geom, wireMaterial);
        this.app.sceneManager.scene.add(wire2);
        this.wires.push(wire2);
    }

    createInstructionLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; // Higher resolution for sharper text
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(20, 50, 45, 0.85)';
        ctx.roundRect(0, 0, 1024, 256, 32);
        ctx.fill();

        ctx.fillStyle = '#00d4aa';
        ctx.font = 'bold 56px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↕ Drag magnet up/down through coil', 512, 100);
        ctx.font = '44px Inter, sans-serif';
        ctx.fillStyle = '#a0c4bc';
        ctx.fillText('Faster movement = stronger induced current', 512, 180);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.instructionSprite = new THREE.Sprite(material);
        this.instructionSprite.position.set(0, 4, 0);
        this.instructionSprite.scale.set(4, 1, 1);
        this.app.sceneManager.scene.add(this.instructionSprite);
    }

    updateInduction() {
        // Calculate velocity (rate of change of position)
        const currentPos = this.magnet.position.clone();
        this.velocity = (currentPos.y - this.lastMagnetPos.y);
        this.lastMagnetPos.copy(currentPos);

        // Check if magnet is near/inside coil
        const coilPos = this.coil.position;
        const coilLength = this.coil.userData.length;

        const distFromCoilCenter = Math.abs(currentPos.y - coilPos.y);
        const isNearCoil = distFromCoilCenter < coilLength + 0.5;

        // Calculate induced EMF (proportional to velocity and proximity)
        let inducedStrength = 0;
        if (isNearCoil && Math.abs(this.velocity) > 0.001) {
            const proximityFactor = 1 - Math.min(distFromCoilCenter / (coilLength + 0.5), 1);
            inducedStrength = this.velocity * proximityFactor * this.coil.userData.turns * 0.5;
        }

        // Update galvanometer needle
        this.updateGalvanometer(inducedStrength);

        // Update induced current arrows with Lenz's Law
        this.updateInducedCurrentArrows(inducedStrength);
    }

    updateGalvanometer(current) {
        if (!this.galvanometer || !this.galvanometer.userData.needle) return;

        const needle = this.galvanometer.userData.needle;

        // Smooth the velocity for smoother needle movement
        this.smoothedVelocity = this.smoothedVelocity * 0.7 + current * 0.3;

        // Needle deflection proportional to induced current
        // At rest (zero current), needle points up (Math.PI / 2)
        // Deflection ranges from about 35 degrees left to 35 degrees right
        const maxAngle = Math.PI / 5; // About 36 degrees
        const targetAngle = Math.max(-maxAngle, Math.min(maxAngle, this.smoothedVelocity * 15));

        // Needle rotation: PI/2 is center (pointing up)
        needle.rotation.z = Math.PI / 2 + targetAngle;
        this.galvanometer.userData.currentValue = current;
    }

    updateInducedCurrentArrows(current) {
        // Clear existing arrows
        for (const arrow of this.inducedArrows) {
            this.app.sceneManager.scene.remove(arrow);
            arrow.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.inducedArrows = [];

        // Only show arrows if there's significant motion
        if (Math.abs(current) < 0.02) return;

        // Create arrows showing induced current direction (Lenz's law)
        // When magnet moves DOWN (N-pole entering from top):
        //   - Flux through coil increases (more N-pole flux)
        //   - Induced current creates OPPOSING field (N-pole at top of coil)
        //   - By right-hand rule: current flows COUNTER-CLOCKWISE when viewed from above
        // When magnet moves UP:
        //   - Flux decreases, induced field tries to maintain it
        //   - Current flows CLOCKWISE when viewed from above

        const numArrows = 8;
        const coilRadius = this.coil.userData.radius + 0.1;

        // Direction based on Lenz's law:
        // current > 0 means magnet moving UP (flux decreasing) → clockwise current (viewed from top)
        // current < 0 means magnet moving DOWN (flux increasing) → counter-clockwise current
        const direction = current > 0 ? -1 : 1;

        const arrowColor = current > 0 ? 0x00d4aa : 0xff6b6b;
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: arrowColor,
            transparent: true,
            opacity: Math.min(Math.abs(current) * 3, 0.9)
        });

        for (let i = 0; i < numArrows; i++) {
            const angle = (i / numArrows) * Math.PI * 2;

            const arrowGroup = new THREE.Group();

            // Arrow body (arc segment)
            const bodyGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6);
            const body = new THREE.Mesh(bodyGeom, arrowMaterial);
            arrowGroup.add(body);

            // Arrow head
            const headGeom = new THREE.ConeGeometry(0.04, 0.1, 6);
            const head = new THREE.Mesh(headGeom, arrowMaterial);
            head.position.y = 0.14;
            arrowGroup.add(head);

            // Position around coil
            const x = Math.cos(angle) * coilRadius;
            const z = Math.sin(angle) * coilRadius;
            arrowGroup.position.set(x, this.coil.position.y, z);

            // Rotate to be tangent to coil (showing current direction)
            // For counter-clockwise: tangent points in +angle direction
            // For clockwise: tangent points in -angle direction
            arrowGroup.rotation.z = Math.PI / 2;
            arrowGroup.rotation.y = -angle + Math.PI / 2;
            if (direction < 0) {
                arrowGroup.rotation.y += Math.PI;
            }

            this.app.sceneManager.scene.add(arrowGroup);
            this.inducedArrows.push(arrowGroup);
        }
    }

    update(deltaTime) {
        // Gradually reduce velocity when not dragging
        if (!this.app.interaction.isDragging) {
            this.velocity *= 0.85;
            this.smoothedVelocity *= 0.92;

            // Update galvanometer with decaying current
            this.updateGalvanometer(this.velocity * 10);
            this.updateInducedCurrentArrows(this.velocity * 10);
        }

        // Animate induced current arrows
        const time = this.app.sceneManager.getElapsedTime();
        for (let i = 0; i < this.inducedArrows.length; i++) {
            const arrow = this.inducedArrows[i];
            const pulse = 0.8 + Math.sin(time * 5 + i) * 0.2;
            arrow.scale.setScalar(pulse);
        }

        // Animate magnetic field arrows (moving from N to S)
        if (this.magnetFieldArrows) {
            for (const arrowData of this.magnetFieldArrows) {
                const { arrow, points } = arrowData;

                // Move arrow along the line (N to S direction)
                arrowData.t += deltaTime * 0.4; // Animation speed
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
            }
        }
    }

    cleanup() {
        // Reset drag plane
        this.app.interaction.dragPlane.set(new THREE.Vector3(0, 1, 0), 0);

        // Remove objects
        if (this.coil) this.app.sceneManager.remove(this.coil);
        if (this.magnet) {
            this.app.sceneManager.remove(this.magnet);
            this.app.interaction.removeDraggable(this.magnet);
        }
        if (this.galvanometer) this.app.sceneManager.remove(this.galvanometer);

        // Remove magnetic field lines
        if (this.magnetFieldLinesGroup) {
            this.app.sceneManager.remove(this.magnetFieldLinesGroup);
            this.magnetFieldLinesGroup = null;
        }
        this.magnetFieldArrows = [];

        // Remove wires
        if (this.wires) {
            for (const wire of this.wires) {
                this.app.sceneManager.scene.remove(wire);
                wire.geometry.dispose();
                wire.material.dispose();
            }
        }

        // Remove arrows
        for (const arrow of this.inducedArrows) {
            this.app.sceneManager.scene.remove(arrow);
        }
        this.inducedArrows = [];

        // Remove instruction sprite
        if (this.instructionSprite) {
            this.app.sceneManager.scene.remove(this.instructionSprite);
            this.instructionSprite.material.map.dispose();
            this.instructionSprite.material.dispose();
        }

        this.app.sliders.clear();
        this.app.interaction.onDrag = null;
    }
}
