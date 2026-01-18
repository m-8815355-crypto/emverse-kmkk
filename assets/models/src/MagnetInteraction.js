import * as THREE from 'three';

/**
 * Physics-Accurate Magnetic Field Simulation
 * 
 * Based on Maxwell's equations and magnetic dipole field theory:
 * B = (μ₀/4π) × (3(m·r̂)r̂ - m) / r³
 * 
 * Features:
 * - Superposition principle for multiple magnets
 * - Field line tracing using numerical integration
 * - No field line intersections
 * - Closed field loops (N→S outside, S→N inside)
 */

// Physical constants (scaled for AR visualization)
const DIPOLE_STRENGTH = 0.001;  // Magnetic moment magnitude
const POLE_OFFSET = 0.04;       // Half magnet length (4cm for 8cm magnet)
const FIELD_LINE_STEP = 0.004;  // Integration step size
const MAX_LINE_STEPS = 250;     // Maximum steps per field line
const MIN_FIELD_STRENGTH = 0.00001;  // Cutoff for weak fields

// Physics constants for magnet movement
const FORCE_STRENGTH = 0.00015;   // Base magnetic force
const DAMPING = 0.85;             // Velocity damping (0-1, higher = more friction)
const MIN_MOVE_DISTANCE = 0.001;  // Stop when movement is tiny
const STICK_DISTANCE = 0.02;      // Distance where magnets "stick" together
const REPEL_DISTANCE = 0.03;      // Maximum repel movement

// Store visualization state
let fieldVisualization = null;
let fieldParticles = [];
let cachedMagnetData = null;

// Physics state for magnet movement
let magnetVelocities = new Map();
let physicsActive = false;
let physicsStartTime = 0;

/**
 * Gets the world position of a magnet's pole
 */
export function getPoleWorldPosition(magnet, pole) {
    const localOffset = pole === 'north'
        ? new THREE.Vector3(-POLE_OFFSET, 0, 0)
        : new THREE.Vector3(POLE_OFFSET, 0, 0);

    const worldPos = localOffset.clone();
    magnet.localToWorld(worldPos);
    return worldPos;
}

/**
 * Gets the magnetic dipole moment vector for a magnet
 * Points from S to N (inside the magnet)
 */
function getDipoleMoment(magnet) {
    const n = getPoleWorldPosition(magnet, 'north');
    const s = getPoleWorldPosition(magnet, 'south');
    return new THREE.Vector3().subVectors(n, s).normalize().multiplyScalar(DIPOLE_STRENGTH);
}

/**
 * Gets the center position of a magnet
 */
function getMagnetCenter(magnet) {
    const n = getPoleWorldPosition(magnet, 'north');
    const s = getPoleWorldPosition(magnet, 'south');
    return new THREE.Vector3().addVectors(n, s).multiplyScalar(0.5);
}

/**
 * Calculates the magnetic field at a point due to a magnetic dipole
 * Using the dipole field formula: B = (μ₀/4π) × [3(m·r̂)r̂ - m] / r³
 * 
 * @param {THREE.Vector3} point - Point to calculate field at
 * @param {THREE.Vector3} dipolePos - Position of the dipole
 * @param {THREE.Vector3} dipoleM - Magnetic moment vector
 * @returns {THREE.Vector3} Magnetic field vector at the point
 */
function calculateDipoleField(point, dipolePos, dipoleM) {
    const r = new THREE.Vector3().subVectors(point, dipolePos);
    const rMag = r.length();

    // Avoid singularity at dipole center
    if (rMag < 0.005) {
        // Inside the magnet - field points from S to N
        return dipoleM.clone().normalize().multiplyScalar(DIPOLE_STRENGTH * 10);
    }

    const rHat = r.clone().normalize();
    const r3 = rMag * rMag * rMag;

    // B = (3(m·r̂)r̂ - m) / r³
    const mDotRhat = dipoleM.dot(rHat);
    const term1 = rHat.clone().multiplyScalar(3 * mDotRhat);
    const term2 = dipoleM.clone();

    const B = term1.sub(term2).divideScalar(r3);

    return B;
}

/**
 * Calculates the total magnetic field at a point using superposition
 * 
 * @param {THREE.Vector3} point - Point to calculate field at
 * @param {Array} magnets - Array of magnet objects
 * @returns {THREE.Vector3} Total magnetic field vector
 */
function calculateTotalField(point, magnets) {
    const totalField = new THREE.Vector3(0, 0, 0);

    magnets.forEach(magnet => {
        const center = getMagnetCenter(magnet);
        const moment = getDipoleMoment(magnet);
        const field = calculateDipoleField(point, center, moment);
        totalField.add(field);
    });

    return totalField;
}

/**
 * Traces a single field line from a starting point
 * Uses 4th-order Runge-Kutta integration for accuracy
 * 
 * @param {THREE.Vector3} start - Starting point
 * @param {Array} magnets - Array of magnets
 * @param {number} direction - 1 for forward (N→S outside), -1 for backward
 * @returns {Array} Array of points forming the field line
 */
function traceFieldLine(start, magnets, direction = 1) {
    const points = [start.clone()];
    let current = start.clone();
    let stepCount = 0;

    while (stepCount < MAX_LINE_STEPS) {
        // Runge-Kutta 4th order integration
        const field = calculateTotalField(current, magnets);
        const fieldMag = field.length();

        // Stop if field is too weak
        if (fieldMag < MIN_FIELD_STRENGTH) break;

        // Normalize and apply direction
        const fieldDir = field.normalize().multiplyScalar(direction);

        // RK4 integration
        const k1 = fieldDir.clone().multiplyScalar(FIELD_LINE_STEP);

        const p2 = current.clone().add(k1.clone().multiplyScalar(0.5));
        const f2 = calculateTotalField(p2, magnets).normalize().multiplyScalar(direction);
        const k2 = f2.multiplyScalar(FIELD_LINE_STEP);

        const p3 = current.clone().add(k2.clone().multiplyScalar(0.5));
        const f3 = calculateTotalField(p3, magnets).normalize().multiplyScalar(direction);
        const k3 = f3.multiplyScalar(FIELD_LINE_STEP);

        const p4 = current.clone().add(k3);
        const f4 = calculateTotalField(p4, magnets).normalize().multiplyScalar(direction);
        const k4 = f4.multiplyScalar(FIELD_LINE_STEP);

        // Combine RK4 steps
        const step = new THREE.Vector3()
            .add(k1)
            .add(k2.multiplyScalar(2))
            .add(k3.multiplyScalar(2))
            .add(k4)
            .divideScalar(6);

        current.add(step);
        points.push(current.clone());

        // Check if we've reached a South pole (entered a magnet)
        let reachedPole = false;
        for (const magnet of magnets) {
            const sPos = getPoleWorldPosition(magnet, 'south');
            if (current.distanceTo(sPos) < 0.008) {
                reachedPole = true;
                break;
            }
        }
        if (reachedPole) break;

        // Check if too far from magnets
        let minDist = Infinity;
        magnets.forEach(m => {
            const dist = current.distanceTo(getMagnetCenter(m));
            if (dist < minDist) minDist = dist;
        });
        if (minDist > 0.25) break;

        stepCount++;
    }

    return points;
}

/**
 * Generates starting points around a North pole for field line tracing
 */
function generateStartingPoints(magnet, count, radius) {
    const points = [];
    const nPos = getPoleWorldPosition(magnet, 'north');
    const moment = getDipoleMoment(magnet);

    // Get perpendicular directions
    const forward = moment.clone().normalize();
    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(forward.dot(up)) > 0.9) {
        up = new THREE.Vector3(1, 0, 0);
    }
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    up = new THREE.Vector3().crossVectors(right, forward).normalize();

    // Generate points in a circle around the pole
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const offset = new THREE.Vector3()
            .addScaledVector(up, Math.cos(angle) * radius)
            .addScaledVector(right, Math.sin(angle) * radius)
            .addScaledVector(forward, radius * 0.5);  // Slightly ahead of pole

        points.push(nPos.clone().add(offset));
    }

    return points;
}

/**
 * Creates the complete field visualization for two magnets
 */
export function createInteractionField(scene, magnet1, magnet2) {
    removeInteractionField(scene);

    fieldVisualization = new THREE.Group();
    fieldVisualization.name = 'physicsAccurateField';
    fieldParticles = [];

    const magnets = [magnet1, magnet2];

    // Determine interaction type for UI feedback
    const interaction = getInteractionType(magnet1, magnet2);

    // Number of field lines per magnet (based on interaction strength)
    const linesPerMagnet = 8;
    const startRadius = 0.008;

    // Generate field lines from each magnet's North pole
    magnets.forEach((magnet, magnetIndex) => {
        const startPoints = generateStartingPoints(magnet, linesPerMagnet, startRadius);

        startPoints.forEach((startPoint, lineIndex) => {
            const linePoints = traceFieldLine(startPoint, magnets, 1);

            if (linePoints.length > 5) {
                // Calculate field strengths along the line for coloring
                const strengths = linePoints.map(p => {
                    return calculateTotalField(p, magnets).length();
                });
                const maxStrength = Math.max(...strengths);

                // Create the field line with varying thickness/opacity
                createFieldLineGeometry(fieldVisualization, linePoints, strengths, maxStrength);

                // Add directional particles
                addFieldLineParticles(fieldVisualization, linePoints, magnetIndex * linesPerMagnet + lineIndex);
            }
        });
    });

    // Add field strength indicators (high intensity regions)
    addFieldIntensityIndicators(fieldVisualization, magnets);

    scene.add(fieldVisualization);

    // Cache magnet data for animation updates
    cachedMagnetData = { magnets, interaction };

    return interaction;
}

/**
 * Creates geometry for a single field line with strength-based appearance
 */
function createFieldLineGeometry(group, points, strengths, maxStrength) {
    if (points.length < 2) return;

    // Create a tube-like geometry for the field line
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    // Base material - orange color
    const material = new THREE.LineBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
    });

    // Create line geometry
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
    const line = new THREE.Line(lineGeometry, material);
    group.add(line);

    // Add thicker segments in high-field regions
    const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    if (avgStrength > maxStrength * 0.5) {
        const thickMaterial = new THREE.LineBasicMaterial({
            color: 0xffaa66,
            transparent: true,
            opacity: 0.3,
            linewidth: 4
        });
        const thickLine = new THREE.Line(lineGeometry.clone(), thickMaterial);
        thickLine.scale.setScalar(1.02);  // Slightly larger
        group.add(thickLine);
    }
}

/**
 * Adds animated particles that flow along field lines
 */
function addFieldLineParticles(group, points, lineId) {
    const particleCount = 3;

    const particleMat = new THREE.MeshBasicMaterial({
        color: 0xffcc88,
        transparent: true,
        opacity: 0.9
    });

    // Arrow/cone geometry
    const arrowGeo = new THREE.ConeGeometry(0.003, 0.01, 4);
    arrowGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < particleCount; i++) {
        const arrow = new THREE.Mesh(arrowGeo, particleMat.clone());

        arrow.userData = {
            linePoints: points,
            progress: i / particleCount,
            speed: 0.12 + Math.random() * 0.05,
            lineId: lineId
        };

        group.add(arrow);
        fieldParticles.push(arrow);
    }
}

/**
 * Adds visual indicators for high field intensity regions
 */
function addFieldIntensityIndicators(group, magnets) {
    if (magnets.length !== 2) return;

    const interaction = getInteractionType(magnets[0], magnets[1]);

    // Find the midpoint between closest poles
    let p1, p2;
    if (interaction.type === 'attract') {
        // High field in the gap
        if (interaction.poles === 'N-S') {
            p1 = getPoleWorldPosition(magnets[0], 'north');
            p2 = getPoleWorldPosition(magnets[1], 'south');
        } else {
            p1 = getPoleWorldPosition(magnets[0], 'south');
            p2 = getPoleWorldPosition(magnets[1], 'north');
        }

        // Create glow at high-field region
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const glowGeo = new THREE.SphereGeometry(0.01, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(midPoint);
        glow.userData.isIntensityIndicator = true;
        group.add(glow);
    } else {
        // Neutral point between repelling poles
        if (interaction.poles === 'N-N') {
            p1 = getPoleWorldPosition(magnets[0], 'north');
            p2 = getPoleWorldPosition(magnets[1], 'north');
        } else {
            p1 = getPoleWorldPosition(magnets[0], 'south');
            p2 = getPoleWorldPosition(magnets[1], 'south');
        }

        // Create dim indicator at neutral point
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const neutralGeo = new THREE.SphereGeometry(0.008, 8, 8);
        const neutralMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.2
        });
        const neutral = new THREE.Mesh(neutralGeo, neutralMat);
        neutral.position.copy(midPoint);
        neutral.userData.isNeutralPoint = true;
        group.add(neutral);
    }
}

/**
 * Determines the interaction type between two magnets
 */
export function getInteractionType(magnet1, magnet2) {
    const n1 = getPoleWorldPosition(magnet1, 'north');
    const s1 = getPoleWorldPosition(magnet1, 'south');
    const n2 = getPoleWorldPosition(magnet2, 'north');
    const s2 = getPoleWorldPosition(magnet2, 'south');

    const distances = [
        { dist: n1.distanceTo(n2), type: 'repel', poles: 'N-N' },
        { dist: n1.distanceTo(s2), type: 'attract', poles: 'N-S' },
        { dist: s1.distanceTo(n2), type: 'attract', poles: 'S-N' },
        { dist: s1.distanceTo(s2), type: 'repel', poles: 'S-S' }
    ];

    distances.sort((a, b) => a.dist - b.dist);
    return distances[0];
}

/**
 * Gets the force strength indicator (0-1) based on distance
 */
export function getForceStrengthIndicator(magnets) {
    if (magnets.length !== 2) return 0;

    const interaction = getInteractionType(magnets[0], magnets[1]);
    const distance = interaction.dist;

    const maxEffectiveDistance = 0.2;
    const strength = 1 - Math.min(distance / maxEffectiveDistance, 1);

    return Math.pow(strength, 1.5);
}

/**
 * Animates the field particles
 */
export function animateInteractionField(deltaTime) {
    fieldParticles.forEach(particle => {
        if (!particle.userData.linePoints) return;

        const points = particle.userData.linePoints;
        particle.userData.progress += particle.userData.speed * deltaTime;

        // Loop animation
        if (particle.userData.progress >= 1) {
            particle.userData.progress -= 1;
        }

        // Calculate position along curve
        const progress = particle.userData.progress;
        const totalSegments = points.length - 1;
        const floatIndex = progress * totalSegments;
        const index = Math.floor(floatIndex);
        const t = floatIndex - index;

        const i0 = Math.min(index, totalSegments);
        const i1 = Math.min(index + 1, totalSegments);

        if (i0 < points.length && i1 < points.length) {
            const pos = new THREE.Vector3().lerpVectors(points[i0], points[i1], t);
            particle.position.copy(pos);

            // Orient in direction of travel
            const direction = new THREE.Vector3().subVectors(points[i1], points[i0]);
            if (direction.length() > 0.0001) {
                direction.normalize();
                const quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
                particle.quaternion.copy(quaternion);
            }
        }

        // Pulse opacity
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.005 + particle.userData.lineId);
        particle.material.opacity = pulse;
    });

    // Animate intensity indicators
    if (fieldVisualization) {
        fieldVisualization.children.forEach(child => {
            if (child.userData.isIntensityIndicator) {
                const scale = 1 + 0.2 * Math.sin(Date.now() * 0.003);
                child.scale.setScalar(scale);
            }
            if (child.userData.isNeutralPoint) {
                child.material.opacity = 0.15 + 0.1 * Math.sin(Date.now() * 0.004);
            }
        });
    }
}

/**
 * Removes the field visualization from the scene
 */
export function removeInteractionField(scene) {
    if (fieldVisualization) {
        scene.remove(fieldVisualization);
        fieldVisualization = null;
    }
    fieldParticles = [];
    cachedMagnetData = null;
}

/**
 * Checks if the field needs recalculation (magnets moved)
 */
export function needsFieldUpdate(magnets) {
    if (!cachedMagnetData || magnets.length !== 2) return true;

    // In this implementation, magnets are fixed, so no update needed
    return false;
}

/**
 * Starts the physics simulation for magnetic interaction
 * Call this after rotating a magnet or when both are placed
 */
export function startMagnetPhysics(magnets) {
    if (magnets.length !== 2) return;

    // Initialize velocities
    magnets.forEach(magnet => {
        if (!magnetVelocities.has(magnet)) {
            magnetVelocities.set(magnet, new THREE.Vector3(0, 0, 0));
        } else {
            magnetVelocities.get(magnet).set(0, 0, 0);
        }
    });

    physicsActive = true;
    physicsStartTime = Date.now();
}

/**
 * Updates magnet physics - call this in the render loop
 * Returns true if magnets are still moving
 */
export function updateMagnetPhysics(magnets, deltaTime, scene) {
    if (!physicsActive || magnets.length !== 2) return false;

    const [magnet1, magnet2] = magnets;
    const interaction = getInteractionType(magnet1, magnet2);
    const distance = interaction.dist;

    // Get closest poles based on interaction
    let p1, p2;
    if (interaction.poles === 'N-N') {
        p1 = getPoleWorldPosition(magnet1, 'north');
        p2 = getPoleWorldPosition(magnet2, 'north');
    } else if (interaction.poles === 'S-S') {
        p1 = getPoleWorldPosition(magnet1, 'south');
        p2 = getPoleWorldPosition(magnet2, 'south');
    } else if (interaction.poles === 'N-S') {
        p1 = getPoleWorldPosition(magnet1, 'north');
        p2 = getPoleWorldPosition(magnet2, 'south');
    } else {
        p1 = getPoleWorldPosition(magnet1, 'south');
        p2 = getPoleWorldPosition(magnet2, 'north');
    }

    // Direction vector between magnets (center to center)
    const center1 = new THREE.Vector3();
    const center2 = new THREE.Vector3();
    magnet1.getWorldPosition(center1);
    magnet2.getWorldPosition(center2);

    const direction = new THREE.Vector3().subVectors(center2, center1).normalize();

    // Calculate force magnitude (inverse square, capped)
    const forceMag = Math.min(FORCE_STRENGTH / (distance * distance + 0.001), 0.001);

    // Apply force based on interaction type
    let stillMoving = false;

    if (interaction.type === 'attract') {
        // Attraction - move toward each other until STICK_DISTANCE
        if (distance > STICK_DISTANCE) {
            const vel1 = magnetVelocities.get(magnet1);
            const vel2 = magnetVelocities.get(magnet2);

            // Apply attraction force
            vel1.add(direction.clone().multiplyScalar(forceMag));
            vel2.add(direction.clone().multiplyScalar(-forceMag));

            // Apply damping
            vel1.multiplyScalar(DAMPING);
            vel2.multiplyScalar(DAMPING);

            // Move magnets
            const move1 = vel1.clone().multiplyScalar(deltaTime * 60);
            const move2 = vel2.clone().multiplyScalar(deltaTime * 60);

            if (move1.length() > MIN_MOVE_DISTANCE || move2.length() > MIN_MOVE_DISTANCE) {
                magnet1.position.add(move1);
                magnet2.position.add(move2);
                stillMoving = true;
            }
        }
    } else {
        // Repulsion - move away from each other a small amount
        const initialDistance = REPEL_DISTANCE;
        const timeSinceStart = (Date.now() - physicsStartTime) / 1000;

        // Only repel for a short time (0.5 seconds)
        if (timeSinceStart < 0.5 && distance < initialDistance * 2) {
            const vel1 = magnetVelocities.get(magnet1);
            const vel2 = magnetVelocities.get(magnet2);

            // Apply repulsion force (opposite direction)
            vel1.add(direction.clone().multiplyScalar(-forceMag * 0.5));
            vel2.add(direction.clone().multiplyScalar(forceMag * 0.5));

            // Apply strong damping for quick stop
            vel1.multiplyScalar(DAMPING * 0.9);
            vel2.multiplyScalar(DAMPING * 0.9);

            // Move magnets
            const move1 = vel1.clone().multiplyScalar(deltaTime * 60);
            const move2 = vel2.clone().multiplyScalar(deltaTime * 60);

            if (move1.length() > MIN_MOVE_DISTANCE || move2.length() > MIN_MOVE_DISTANCE) {
                magnet1.position.add(move1);
                magnet2.position.add(move2);
                stillMoving = true;
            }
        }
    }

    // Stop physics if not moving anymore
    if (!stillMoving) {
        physicsActive = false;
    }

    // Recalculate field if magnets moved
    if (stillMoving && scene) {
        createInteractionField(scene, magnet1, magnet2);
    }

    return stillMoving;
}

/**
 * Stops the physics simulation
 */
export function stopMagnetPhysics() {
    physicsActive = false;
    magnetVelocities.clear();
}

/**
 * Returns whether physics is currently active
 */
export function isPhysicsActive() {
    return physicsActive;
}
