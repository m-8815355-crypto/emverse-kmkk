/**
 * Field Visualizer - Magnetic field visualization engine
 */
import * as THREE from 'three';

export class FieldVisualizer {
    constructor(scene) {
        this.scene = scene;
        this.fieldLines = [];
        this.arrows = [];
        this.gridArrows = [];
        this.particles = [];
        this.fluxLines = [];
        this.showFieldLines = true;
        this.showArrows = true;

        // Theme colors
        this.colors = {
            fieldLine: 0x00d4aa,
            arrow: 0x00ffcc,
            opposingArrow: 0xff6b6b,
            fluxLine: 0x00d4aa
        };
    }

    setTheme(theme) {
        if (theme === 'light') {
            this.colors = {
                fieldLine: 0x00d4aa, // Keep mint green
                arrow: 0x00ffcc,     // Keep mint green
                opposingArrow: 0xd93636,
                fluxLine: 0x006655
            };
        } else {
            this.colors = {
                fieldLine: 0x00d4aa,
                arrow: 0x00ffcc,
                opposingArrow: 0xff6b6b,
                fluxLine: 0x00d4aa
            };
        }
        // Force update of existing visuals if needed
        this.updateMaterials();
    }

    updateMaterials() {
        this.fieldLines.forEach(l => l.material.color.setHex(this.colors.fieldLine));
        this.arrows.forEach(a => {
            if (a.material) a.material.color.setHex(this.colors.arrow);
        });
        this.fluxLines.forEach(l => l.line.material.color.setHex(this.colors.fluxLine));

        if (this.gridArrows) {
            this.gridArrows.forEach(a => {
                if (a.material) a.material.color.setHex(this.colors.arrow);
            });
        }
    }

    /**
     * Calculate total magnetic field at a point from all sources
     */
    calculateTotalField(point, sources) {
        const totalField = new THREE.Vector3();

        for (const source of sources) {
            let field = new THREE.Vector3();
            if (this.isInsideSource(point, source)) {
                field = this.calculateInsideField(point, source);
            } else {
                if (source.userData.type === 'barMagnet') {
                    field = this.calculateDipoleField(point, source);
                } else if (source.userData.type === 'solenoid') {
                    field = this.calculateSolenoidField(point, source);
                }
            }
            totalField.add(field);
        }
        return totalField;
    }

    isInsideSource(point, source) {
        const worldPos = new THREE.Vector3();
        source.getWorldPosition(worldPos);
        const rotation = new THREE.Quaternion();
        source.getWorldQuaternion(rotation);

        const localPoint = point.clone().sub(worldPos).applyQuaternion(rotation.clone().invert());

        if (source.userData.type === 'barMagnet') {
            const { length = 2, width = 0.5, height = 0.4 } = source.userData.dimensions || {};
            return Math.abs(localPoint.x) < length / 2 &&
                Math.abs(localPoint.y) < height / 2 &&
                Math.abs(localPoint.z) < width / 2;
        } else if (source.userData.type === 'solenoid') {
            const { length, radius } = source.userData;
            return Math.abs(localPoint.x) < length / 2 &&
                Math.sqrt(localPoint.y ** 2 + localPoint.z ** 2) < radius;
        }
        return false;
    }

    calculateInsideField(point, source) {
        const rotation = new THREE.Quaternion();
        source.getWorldQuaternion(rotation);

        if (source.userData.type === 'barMagnet') {
            // Inside magnet, field goes S -> N (approximate uniform for viz)
            const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation);
            return direction.multiplyScalar(source.userData.strength * 2);
        } else if (source.userData.type === 'solenoid') {
            const { current, turns, currentDirection } = source.userData;
            const direction = new THREE.Vector3(currentDirection * Math.sign(current), 0, 0).applyQuaternion(rotation);
            return direction.multiplyScalar(Math.abs(current) * turns * 0.1);
        }
        return new THREE.Vector3();
    }

    /**
     * Calculate magnetic field direction at a point from a bar magnet (Dipole Model)
     * Using Superposition of Two Monopoles:
     * - North Pole: Field points OUTWARD (repulsive)
     * - South Pole: Field points INWARD (attractive)
     */
    calculateDipoleField(point, magnet) {
        const worldPos = new THREE.Vector3();
        magnet.getWorldPosition(worldPos);

        const magnetRotation = new THREE.Quaternion();
        magnet.getWorldQuaternion(magnetRotation);

        let northPole = magnet.userData.northPole;
        let southPole = magnet.userData.southPole;

        // Fallback if user data is missing
        if (!northPole || !southPole) {
            const len = (magnet.userData.dimensions && magnet.userData.dimensions.length) || 2;
            northPole = new THREE.Vector3(len / 2, 0, 0);
            southPole = new THREE.Vector3(-len / 2, 0, 0);
        }

        // Get world positions of both poles
        const northWorld = northPole.clone().applyQuaternion(magnetRotation).add(worldPos);
        const southWorld = southPole.clone().applyQuaternion(magnetRotation).add(worldPos);

        // Vector FROM North pole TO compass point (outward direction)
        const vecFromNorth = new THREE.Vector3().subVectors(point, northWorld);

        // Vector FROM compass point TO South pole (inward direction)
        const vecToSouth = new THREE.Vector3().subVectors(southWorld, point);

        // Calculate distances with minimum threshold to avoid singularities
        const distNorth = Math.max(vecFromNorth.length(), 0.1);
        const distSouth = Math.max(vecToSouth.length(), 0.1);

        const strength = magnet.userData.strength || 1;

        // Field from North pole: Points AWAY from North (repulsive)
        // Force = k / r^3 * direction_vector
        const fieldFromNorth = vecFromNorth.normalize().multiplyScalar(strength / (distNorth * distNorth));

        // Field from South pole: Points TOWARDS South (attractive)
        // Force = k / r^3 * direction_vector
        const fieldFromSouth = vecToSouth.normalize().multiplyScalar(strength / (distSouth * distSouth));

        // Superposition: Total field is the sum of both contributions
        return fieldFromNorth.add(fieldFromSouth);
    }

    /**
     * Calculate field from a solenoid
     */
    calculateSolenoidField(point, solenoid) {
        const worldPos = new THREE.Vector3();
        solenoid.getWorldPosition(worldPos);
        const rotation = new THREE.Quaternion();
        solenoid.getWorldQuaternion(rotation);

        const { current, turns, length, radius, currentDirection } = solenoid.userData;
        const effectiveCurrent = current * (currentDirection || 1);

        if (Math.abs(effectiveCurrent) < 0.01) return new THREE.Vector3();

        const localPoint = point.clone().sub(worldPos).applyQuaternion(rotation.clone().invert());

        const leftEnd = new THREE.Vector3(-length / 2, 0, 0);
        const rightEnd = new THREE.Vector3(length / 2, 0, 0);

        const toLeft = localPoint.clone().sub(leftEnd);
        const toRight = localPoint.clone().sub(rightEnd);

        const distLeft = Math.max(toLeft.length(), 0.1);
        const distRight = Math.max(toRight.length(), 0.1);

        const strength = effectiveCurrent * turns * 0.02;

        const fieldFromRight = toRight.normalize().multiplyScalar(-strength / (distRight * distRight)); // North (Away)
        const fieldFromLeft = toLeft.normalize().multiplyScalar(strength / (distLeft * distLeft)); // South (Towards)

        const totalLocal = fieldFromRight.add(fieldFromLeft);
        return totalLocal.applyQuaternion(rotation);
    }

    /**
     * Generate continuous closed-loop field lines for multiple sources
     */
    generateFieldLines(sources, options = {}) {
        const { numLines = 12, steps = 200, stepSize = 0.1 } = options;

        this.clearFieldLines();
        this.clearArrows(); // Clear old isolated arrows if any

        if (!sources || sources.length === 0) return;

        // Iterate through all sources to seed field lines
        for (const source of sources) {
            if (!source.visible) continue;

            const worldPos = new THREE.Vector3();
            source.getWorldPosition(worldPos);
            const rotation = new THREE.Quaternion();
            source.getWorldQuaternion(rotation);

            let seedCenter, seedRadius;

            if (source.userData.type === 'barMagnet') {
                let northPole = source.userData.northPole;
                if (!northPole) {
                    const len = (source.userData.dimensions && source.userData.dimensions.length) || 2;
                    northPole = new THREE.Vector3(len / 2, 0, 0);
                }
                seedCenter = northPole.clone().applyQuaternion(rotation).add(worldPos);
                seedRadius = 0.15;
            } else if (source.userData.type === 'solenoid') {
                const { length, radius, currentDirection } = source.userData;
                // Right-hand grip rule: with fingers following current, thumb points to North
                // Field lines emanate from North pole
                // When currentDirection = -1, North is at -length/2 (left side)
                // When currentDirection = +1, North is at +length/2 (right side)
                const dir = (currentDirection || 1);
                // Seed from North pole: negative direction means North is on negative x
                const xOffset = -(length / 2) * dir;
                seedCenter = new THREE.Vector3(xOffset, 0, 0).applyQuaternion(rotation).add(worldPos);
                seedRadius = radius * 0.5;
                if (source.userData.current < 0.1) continue;
            } else {
                continue;
            }

            for (let i = 0; i < numLines; i++) {
                const angle = (i / numLines) * Math.PI * 2;
                const perp1 = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
                const perp2 = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation);

                const offset = perp1.multiplyScalar(Math.sin(angle) * seedRadius)
                    .add(perp2.multiplyScalar(Math.cos(angle) * seedRadius));

                const startPoint = seedCenter.clone().add(offset);

                const linePoints = this.traceFieldLine(startPoint, sources, steps, stepSize);

                if (linePoints.length > 5) {
                    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
                        color: this.colors.fieldLine,
                        linewidth: 2,
                        transparent: true,
                        opacity: 0.7
                    }));
                    this.scene.add(line);
                    this.fieldLines.push(line);

                    // Store line points for arrow animation
                    line.userData.points = linePoints;

                    if (this.showArrows) {
                        this.addArrowsToLine(line, 5);
                    }
                }
            }
        }
    }

    traceFieldLine(startPoint, sources, steps, stepSize) {
        const points = [startPoint.clone()];
        let currentPoint = startPoint.clone();

        for (let i = 0; i < steps; i++) {
            const field = this.calculateTotalField(currentPoint, sources);

            if (field.length() < 0.0001) break;

            const step = field.normalize().multiplyScalar(stepSize);
            currentPoint.add(step);

            if (i > 10 && currentPoint.distanceTo(startPoint) < stepSize * 2) {
                points.push(startPoint.clone());
                break;
            }

            if (currentPoint.length() > 20) break;

            points.push(currentPoint.clone());
        }
        return points;
    }

    addArrowsToLine(line, count) {
        const points = line.userData.points;
        if (!points || points.length < 2) return;

        const totalLen = points.length;
        const interval = Math.floor(totalLen / count);

        const arrowGeometry = this.createArrowGeometry(0.2);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: this.colors.arrow });

        // Phase offset for each line to create varied flow
        const phaseOffset = Math.random();

        for (let i = 0; i < count; i++) {
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());
            arrow.userData.t = i / count + phaseOffset; // Parameter along line (0-1)
            arrow.userData.line = line;

            this.scene.add(arrow);
            this.arrows.push(arrow);

            // Initial position
            this.updateArrowPosition(arrow);
        }
    }

    updateArrowPosition(arrow) {
        const line = arrow.userData.line;
        if (!line || !line.userData.points) return;

        const points = line.userData.points;
        const t = (arrow.userData.t % 1 + 1) % 1; // Wrap 0-1

        // Find index in points array
        const totalIdx = (points.length - 1) * t;
        const idx = Math.floor(totalIdx);
        const alpha = totalIdx - idx;

        if (idx >= points.length - 1) return;

        const p1 = points[idx];
        const p2 = points[idx + 1];

        // Interpolate position
        const pos = new THREE.Vector3().lerpVectors(p1, p2, alpha);
        arrow.position.copy(pos);

        // Orient
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();

        // If direction is NaN (zero length segment), skip orientation update
        if (dir.lengthSq() > 0.0001) {
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
            arrow.quaternion.copy(quaternion);
        }
    }

    animateFieldLines(time, speed = 0.5) {
        if (!this.showArrows) return;

        this.arrows.forEach(arrow => {
            if (arrow.userData.line) {
                arrow.userData.t += 0.005 * speed; // Move along line
                this.updateArrowPosition(arrow);
            }
        });
    }

    generateMagnetFieldLines(magnet, options) {
        this.generateFieldLines([magnet], options);
    }

    generateSolenoidField(solenoid, options = {}) {
        const { numLines = 12, numInnerLines = 4 } = options;

        this.clearFieldLines();
        this.clearArrows();

        if (!solenoid || !solenoid.visible) return;
        if (solenoid.userData.current < 0.1) return;

        const worldPos = new THREE.Vector3();
        solenoid.getWorldPosition(worldPos);
        const rotation = new THREE.Quaternion();
        solenoid.getWorldQuaternion(rotation);

        const { length, radius, currentDirection } = solenoid.userData;
        const dir = currentDirection || 1;

        // North pole is on the positive x side when dir = -1
        // South pole is on the negative x side when dir = -1
        const northX = (length / 2) * (-dir);
        const southX = -(length / 2) * (-dir);

        // Create closed-loop field lines around the solenoid
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2;
            const linePoints = this.createSolenoidFieldLoop(
                worldPos, rotation, length, radius, northX, southX, angle
            );

            if (linePoints.length > 5) {
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
                    color: this.colors.fieldLine,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.7
                }));
                this.scene.add(line);
                this.fieldLines.push(line);

                // Store line points for arrow animation
                line.userData.points = linePoints;

                if (this.showArrows) {
                    this.addArrowsToLine(line, 6);
                }
            }
        }

        // Create straight inner field lines through the center
        for (let i = 0; i < numInnerLines; i++) {
            const innerAngle = (i / numInnerLines) * Math.PI * 2;
            const innerRadius = radius * 0.3;
            const offsetY = Math.sin(innerAngle) * innerRadius;
            const offsetZ = Math.cos(innerAngle) * innerRadius;

            const innerPoints = [];
            const numSegments = 20;

            for (let j = 0; j <= numSegments; j++) {
                const t = j / numSegments;
                // Field flows from South to North inside the solenoid
                const x = southX + (northX - southX) * t;
                const localPoint = new THREE.Vector3(x, offsetY, offsetZ);
                const worldPoint = localPoint.applyQuaternion(rotation).add(worldPos);
                innerPoints.push(worldPoint);
            }

            if (innerPoints.length > 5) {
                const geometry = new THREE.BufferGeometry().setFromPoints(innerPoints);
                const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
                    color: this.colors.fieldLine,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.8
                }));
                this.scene.add(line);
                this.fieldLines.push(line);

                line.userData.points = innerPoints;

                if (this.showArrows) {
                    this.addArrowsToLine(line, 3);
                }
            }
        }
    }

    /**
     * Create a single closed-loop field line for solenoid visualization
     */
    createSolenoidFieldLoop(worldPos, rotation, length, radius, northX, southX, angle) {
        const points = [];
        const numSegments = 60;

        // Outer loop parameters - how far the field extends outside
        const outerExtent = length * 0.8; // How far beyond the poles
        const outerHeight = radius * 2.5; // How high/wide the loop goes

        // Calculate perpendicular offset for this loop
        const offsetY = Math.sin(angle);
        const offsetZ = Math.cos(angle);

        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            let x, y, z;

            if (t < 0.25) {
                // Segment 1: Exit from North pole, curve outward
                const s = t / 0.25;
                x = northX + outerExtent * this.easeOutQuad(s);
                const expansion = this.easeOutQuad(s);
                y = offsetY * (radius * 0.5 + outerHeight * expansion);
                z = offsetZ * (radius * 0.5 + outerHeight * expansion);
            } else if (t < 0.5) {
                // Segment 2: Curve from North side to middle (top of loop)
                const s = (t - 0.25) / 0.25;
                x = northX + outerExtent - (northX + outerExtent) * s;
                y = offsetY * (radius * 0.5 + outerHeight);
                z = offsetZ * (radius * 0.5 + outerHeight);
            } else if (t < 0.75) {
                // Segment 3: Curve from middle to South side
                const s = (t - 0.5) / 0.25;
                x = -(southX + outerExtent) * s + southX + outerExtent;
                x = southX - outerExtent * (1 - s);
                y = offsetY * (radius * 0.5 + outerHeight);
                z = offsetZ * (radius * 0.5 + outerHeight);
            } else {
                // Segment 4: Enter South pole, curve inward
                const s = (t - 0.75) / 0.25;
                x = southX - outerExtent * (1 - this.easeOutQuad(s));
                const contraction = 1 - this.easeOutQuad(s);
                y = offsetY * (radius * 0.5 + outerHeight * contraction);
                z = offsetZ * (radius * 0.5 + outerHeight * contraction);
            }

            const localPoint = new THREE.Vector3(x, y, z);
            const worldPoint = localPoint.clone().applyQuaternion(rotation).add(worldPos);
            points.push(worldPoint);
        }

        return points;
    }

    /**
     * Easing function for smooth curves
     */
    easeOutQuad(t) {
        return t * (2 - t);
    }

    /**
     * Generate a vector field of arrows on a grid
     */
    generateArrowField(sources, options = {}) {
        const { gridSize = 5, spacing = 1.0, yLevel = 0 } = options;

        this.clearGridArrows();
        if (!this.gridArrows) this.gridArrows = [];

        if (!sources || sources.length === 0) return;

        const arrowGeometry = this.createArrowGeometry(0.15); // Smaller scale for grid
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: this.colors.arrow });

        const start = -(gridSize - 1) * spacing / 2;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = start + i * spacing;
                const z = start + j * spacing;

                // Skip if too close to any source
                let tooClose = false;
                for (const source of sources) {
                    const worldPos = new THREE.Vector3();
                    source.getWorldPosition(worldPos);
                    const dist = Math.sqrt(Math.pow(x - worldPos.x, 2) + Math.pow(z - worldPos.z, 2));
                    if (dist < 0.6) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                const pos = new THREE.Vector3(x, yLevel, z);
                const field = this.calculateTotalField(pos, sources);

                if (field.length() > 0.01) {
                    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial.clone());
                    arrow.position.copy(pos);

                    const dir = field.normalize();
                    const quaternion = new THREE.Quaternion();
                    quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
                    arrow.quaternion.copy(quaternion);

                    this.scene.add(arrow);
                    this.gridArrows.push(arrow);
                }
            }
        }
    }

    createArrowGeometry(scale) {
        const shape = new THREE.Shape();
        // Arrow pointing in +X direction (forward along field line flow)
        shape.moveTo(0, 0);
        shape.lineTo(0.6 * scale, 0.15 * scale);
        shape.lineTo(0.4 * scale, 0);
        shape.lineTo(0.6 * scale, -0.15 * scale);
        shape.lineTo(0, 0);

        const extrudeSettings = { depth: 0.02, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateY(Math.PI / 2);
        geometry.translate(-scale * 0.3, 0, 0);

        return geometry;
    }

    createFluxLines(transformer, options = {}) {
        this.clearFluxLines();

        const worldPos = new THREE.Vector3();
        transformer.getWorldPosition(worldPos);

        const numLines = 6;
        const lineMaterial = new THREE.LineBasicMaterial({
            color: this.colors.fluxLine,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2 + 0.5) * 0.08;
            const points = [];

            const w = 0.8;
            const h = 0.5;
            const segments = 40;

            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                let x, y;

                if (t < 0.25) {
                    x = -w + (t / 0.25) * 2 * w;
                    y = h;
                } else if (t < 0.5) {
                    x = w;
                    y = h - ((t - 0.25) / 0.25) * 2 * h;
                } else if (t < 0.75) {
                    x = w - ((t - 0.5) / 0.25) * 2 * w;
                    y = -h;
                } else {
                    x = -w;
                    y = -h + ((t - 0.75) / 0.25) * 2 * h;
                }

                points.push(new THREE.Vector3(x, y, offset).add(worldPos));
            }

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.scene.add(line);
            this.fluxLines.push({ line, phase: i / numLines * Math.PI * 2 });
        }
    }

    animateFluxLines(time, frequency = 1) {
        for (const flux of this.fluxLines) {
            const intensity = Math.sin(time * frequency * Math.PI * 2 + flux.phase);
            flux.line.material.opacity = 0.2 + Math.abs(intensity) * 0.5;
            flux.line.scale.setScalar(0.8 + Math.abs(intensity) * 0.3);
        }
    }

    createOpposingField(fallingMagnet, tube, velocity) {
        const arrows = [];
        const speed = Math.abs(velocity);

        if (speed < 0.01) return arrows;

        const magnetPos = new THREE.Vector3();
        fallingMagnet.getWorldPosition(magnetPos);

        const tubePos = new THREE.Vector3();
        tube.getWorldPosition(tubePos);

        const relY = magnetPos.y - tubePos.y;
        const tubeHeight = tube.userData.height;

        if (Math.abs(relY) > tubeHeight / 2 + 0.5) return arrows;

        const numArrows = 6;
        const opposingDirection = velocity > 0 ? 1 : -1;

        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.opposingArrow,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < numArrows; i++) {
            const angle = (i / numArrows) * Math.PI * 2;
            const radius = 0.35;

            const arrowGroup = new THREE.Group();

            const bodyGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6);
            const headGeom = new THREE.ConeGeometry(0.04, 0.1, 6);

            const body = new THREE.Mesh(bodyGeom, arrowMaterial);
            const head = new THREE.Mesh(headGeom, arrowMaterial);

            body.position.y = opposingDirection * 0.1;
            head.position.y = opposingDirection * 0.25;
            head.rotation.x = opposingDirection > 0 ? 0 : Math.PI;

            arrowGroup.add(body);
            arrowGroup.add(head);

            arrowGroup.position.set(
                magnetPos.x + Math.cos(angle) * radius,
                magnetPos.y,
                magnetPos.z + Math.sin(angle) * radius
            );

            const scale = 0.5 + speed * 2;
            arrowGroup.scale.setScalar(Math.min(scale, 1.5));

            this.scene.add(arrowGroup);
            arrows.push(arrowGroup);
        }

        return arrows;
    }

    setFieldLinesVisible(visible) {
        this.showFieldLines = visible;
        this.fieldLines.forEach(line => line.visible = visible);
        this.fluxLines.forEach(flux => flux.line.visible = visible);
    }

    setArrowsVisible(visible) {
        this.showArrows = visible;
        this.arrows.forEach(arrow => arrow.visible = visible);
        if (this.gridArrows) {
            this.gridArrows.forEach(arrow => arrow.visible = visible);
        }
    }

    clearFieldLines() {
        this.fieldLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.fieldLines = [];
    }

    clearArrows() {
        this.arrows.forEach(arrow => {
            this.scene.remove(arrow);
            if (arrow.geometry) arrow.geometry.dispose();
            if (arrow.material) arrow.material.dispose();
        });
        this.arrows = [];
        this.clearGridArrows();
    }

    clearGridArrows() {
        if (!this.gridArrows) return;

        this.gridArrows.forEach(arrow => {
            this.scene.remove(arrow);
            if (arrow.geometry) arrow.geometry.dispose();
            if (arrow.material) arrow.material.dispose();
        });
        this.gridArrows = [];
    }

    clearFluxLines() {
        this.fluxLines.forEach(flux => {
            this.scene.remove(flux.line);
            flux.line.geometry.dispose();
            flux.line.material.dispose();
        });
        this.fluxLines = [];
    }

    clearAll() {
        this.clearFieldLines();
        this.clearArrows();
        this.clearFluxLines();
    }
}
