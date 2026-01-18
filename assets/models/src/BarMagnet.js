import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createMagneticField } from './MagneticField.js';

export function createBarMagnet() {
    const magnetGroup = new THREE.Group();

    // Dimensions - increased length moderately (was 0.05, now 0.08)
    const width = 0.08;  // 8cm total length (x-axis)
    const height = 0.012; // 1.2cm height
    const depth = 0.025;  // 2.5cm depth
    const radius = 0.003;
    const segments = 4;

    // --- Materials ---
    const redMat = new THREE.MeshPhysicalMaterial({
        color: 0xdc2626, metalness: 0.1, roughness: 0.2, clearcoat: 1.0
    });
    const blueMat = new THREE.MeshPhysicalMaterial({
        color: 0x2563eb, metalness: 0.1, roughness: 0.2, clearcoat: 1.0
    });
    // Black outline instead of white
    const outlineMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide
    });

    // --- Geometries ---
    // Half-width for each pole
    const poleWidth = width / 2;

    // North Pole (Red) - Left Side
    const northGeo = new RoundedBoxGeometry(poleWidth, height, depth, segments, radius);
    const northMesh = new THREE.Mesh(northGeo, redMat);
    northMesh.position.x = -poleWidth / 2;
    northMesh.name = 'northPole';

    // South Pole (Blue) - Right Side
    const southGeo = new RoundedBoxGeometry(poleWidth, height, depth, segments, radius);
    const southMesh = new THREE.Mesh(southGeo, blueMat);
    southMesh.position.x = poleWidth / 2;
    southMesh.name = 'southPole';

    // --- Outline (Inverted Hull) ---
    const outlineGeo = new RoundedBoxGeometry(width + 0.003, height + 0.003, depth + 0.003, segments, radius);
    const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
    magnetGroup.add(outlineMesh);

    // --- Labels (N / S) ---
    const nLabel = createTextLabel('N');
    nLabel.position.set(-poleWidth / 2, height / 2 + 0.0015, 0);
    nLabel.rotation.x = -Math.PI / 2;
    nLabel.rotation.z = Math.PI / 2;

    const sLabel = createTextLabel('S');
    sLabel.position.set(poleWidth / 2, height / 2 + 0.0015, 0);
    sLabel.rotation.x = -Math.PI / 2;
    sLabel.rotation.z = Math.PI / 2;

    magnetGroup.add(northMesh);
    magnetGroup.add(southMesh);
    magnetGroup.add(nLabel);
    magnetGroup.add(sLabel);

    // --- Magnetic Field ---
    const field = createMagneticField();
    magnetGroup.add(field);

    northMesh.castShadow = true;
    southMesh.castShadow = true;

    // Mark as selectable for rotation
    magnetGroup.userData.isBarMagnet = true;
    magnetGroup.userData.selected = false;

    return magnetGroup;
}

function createTextLabel(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 64;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });

    // Slightly larger plane for bigger magnet
    const planeSize = 0.018;
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}
