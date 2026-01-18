import * as THREE from 'three';

/**
 * Physics-Accurate Single Magnet Field Visualization
 * 
 * Creates magnetic field lines for an individual bar magnet using
 * the magnetic dipole field equation:
 * B = (μ₀/4π) × [3(m·r̂)r̂ - m] / r³
 * 
 * Field lines:
 * - Exit from North pole
 * - Enter South pole  
 * - Form closed loops
 * - Density proportional to field strength
 */

const DIPOLE_STRENGTH = 0.0005;
const POLE_OFFSET = 0.04;  // Updated for 8cm magnet (half length = 4cm)
const FIELD_LINE_STEP = 0.003;
const MAX_STEPS = 180;

/**
 * Creates a magnetic field visualization for a single bar magnet
 */
export function createMagneticField() {
    const fieldGroup = new THREE.Group();
    fieldGroup.userData.fieldLines = [];
    fieldGroup.userData.particles = [];

    // Generate field lines starting from around the North pole
    const fieldLinesPerLayer = 6;
    const layers = 2;

    // Line material - semi-transparent orange
    const lineMat = new THREE.LineBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.3
    });

    for (let layer = 0; layer < layers; layer++) {
        const radius = 0.006 + layer * 0.005;

        for (let i = 0; i < fieldLinesPerLayer; i++) {
            const angle = (i / fieldLinesPerLayer) * Math.PI * 2;

            // Starting point near North pole
            const startY = Math.cos(angle) * radius;
            const startZ = Math.sin(angle) * radius;
            const startPoint = new THREE.Vector3(-POLE_OFFSET + 0.005, startY, startZ);

            // Trace field line
            const linePoints = traceLocalFieldLine(startPoint);

            if (linePoints.length > 10) {
                const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const line = new THREE.Line(geometry, lineMat.clone());
                fieldGroup.add(line);
                fieldGroup.userData.fieldLines.push(line);

                // Add particles for this field line
                addFieldParticles(fieldGroup, linePoints, i + layer * fieldLinesPerLayer);
            }
        }
    }

    return fieldGroup;
}

/**
 * Traces a field line for a single magnet (local coordinates)
 * Uses the dipole field approximation
 */
function traceLocalFieldLine(start) {
    const points = [start.clone()];
    let current = start.clone();

    // Dipole at origin, moment pointing in +X direction (N at -X, S at +X)
    const moment = new THREE.Vector3(1, 0, 0).multiplyScalar(DIPOLE_STRENGTH);
    const dipolePos = new THREE.Vector3(0, 0, 0);

    for (let step = 0; step < MAX_STEPS; step++) {
        const field = calculateLocalDipoleField(current, dipolePos, moment);
        const fieldMag = field.length();

        if (fieldMag < 0.000001) break;

        // Normalize and step
        const direction = field.normalize();
        current.add(direction.multiplyScalar(FIELD_LINE_STEP));

        points.push(current.clone());

        // Check if reached South pole region
        if (current.x > POLE_OFFSET - 0.005 &&
            Math.abs(current.y) < 0.01 &&
            Math.abs(current.z) < 0.01) {
            break;
        }

        // Check if too far from magnet
        const dist = current.length();
        if (dist > 0.15) break;
    }

    return points;
}

/**
 * Calculates magnetic field using dipole formula
 */
function calculateLocalDipoleField(point, dipolePos, moment) {
    const r = new THREE.Vector3().subVectors(point, dipolePos);
    const rMag = r.length();

    // Inside magnet - field points from S to N
    if (rMag < 0.01) {
        return moment.clone().normalize().multiplyScalar(DIPOLE_STRENGTH * 5);
    }

    const rHat = r.clone().normalize();
    const r3 = rMag * rMag * rMag;

    // B = (3(m·r̂)r̂ - m) / r³
    const mDotRhat = moment.dot(rHat);
    const term1 = rHat.clone().multiplyScalar(3 * mDotRhat);
    const term2 = moment.clone();

    return term1.sub(term2).divideScalar(r3);
}

/**
 * Adds animated particles along a field line
 */
function addFieldParticles(fieldGroup, points, lineIndex) {
    const particlesPerLine = 3;

    const particleMat = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.9
    });

    // Arrow geometry
    const arrowGeo = new THREE.ConeGeometry(0.002, 0.006, 4);
    arrowGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < particlesPerLine; i++) {
        const arrow = new THREE.Mesh(arrowGeo, particleMat.clone());

        arrow.userData = {
            linePoints: points,
            progress: i / particlesPerLine,
            speed: 0.15 + Math.random() * 0.05,
            lineIndex: lineIndex
        };

        fieldGroup.add(arrow);
        fieldGroup.userData.particles.push(arrow);

        // Initial position
        updateParticlePosition(arrow);
    }
}

/**
 * Updates a particle's position along its field line
 */
function updateParticlePosition(particle) {
    const points = particle.userData.linePoints;
    if (!points || points.length < 2) return;

    const progress = particle.userData.progress;
    const totalSegments = points.length - 1;
    const floatIndex = progress * totalSegments;
    const index = Math.floor(floatIndex);
    const t = floatIndex - index;

    const i0 = Math.min(index, totalSegments);
    const i1 = Math.min(index + 1, totalSegments);

    const pos = new THREE.Vector3().lerpVectors(points[i0], points[i1], t);
    particle.position.copy(pos);

    // Orient arrow in direction of travel
    if (i1 < points.length) {
        const direction = new THREE.Vector3().subVectors(points[i1], points[i0]);
        if (direction.length() > 0.0001) {
            direction.normalize();
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
            particle.quaternion.copy(quaternion);
        }
    }
}

/**
 * Animates all particles in a magnetic field group
 */
export function animateMagneticField(fieldGroup, deltaTime) {
    if (!fieldGroup.userData.particles) return;

    fieldGroup.userData.particles.forEach(particle => {
        particle.userData.progress += particle.userData.speed * deltaTime;

        // Loop back
        if (particle.userData.progress >= 1) {
            particle.userData.progress -= 1;
        }

        updateParticlePosition(particle);

        // Pulse opacity
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005 + particle.userData.lineIndex);
        particle.material.opacity = pulse;
    });
}

/**
 * Sets visibility of field lines
 */
export function setFieldLinesVisible(fieldGroup, visible) {
    if (!fieldGroup.userData.fieldLines) return;
    fieldGroup.userData.fieldLines.forEach(line => {
        line.visible = visible;
    });
}
