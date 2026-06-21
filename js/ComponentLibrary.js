/**
 * Component Library - 3D electromagnetic component factories
 */
import * as THREE from 'three';

export class ComponentLibrary {
    constructor() {
        this.materials = this.createMaterials();
    }

    createMaterials() {
        return {
            redPole: new THREE.MeshStandardMaterial({
                color: 0xe74c3c,
                metalness: 0.3,
                roughness: 0.4,
                emissive: 0xe74c3c,
                emissiveIntensity: 0.1
            }),
            bluePole: new THREE.MeshStandardMaterial({
                color: 0x3498db,
                metalness: 0.3,
                roughness: 0.4,
                emissive: 0x3498db,
                emissiveIntensity: 0.1
            }),
            metal: new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.8,
                roughness: 0.2
            }),
            copper: new THREE.MeshStandardMaterial({
                color: 0xd4a574,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0xd4a574,
                emissiveIntensity: 0.05
            }),
            glass: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0,
                roughness: 0.1,
                transparent: true,
                opacity: 0.3
            }),
            compassNeedle: new THREE.MeshStandardMaterial({
                color: 0xe74c3c,
                metalness: 0.5,
                roughness: 0.3
            }),
            compassBase: new THREE.MeshStandardMaterial({
                color: 0x2c3e50,
                metalness: 0.2,
                roughness: 0.6
            }),
            wire: new THREE.MeshStandardMaterial({
                color: 0xf39c12,
                metalness: 0.4,
                roughness: 0.5
            }),
            battery: new THREE.MeshStandardMaterial({
                color: 0x2c3e50,
                metalness: 0.3,
                roughness: 0.5
            }),
            batteryTerminal: new THREE.MeshStandardMaterial({
                color: 0xf1c40f,
                metalness: 0.7,
                roughness: 0.2
            }),
            copperTube: new THREE.MeshStandardMaterial({
                color: 0xda8a47, // Brighter copper for visibility
                metalness: 0.75,
                roughness: 0.2,
                emissive: 0xcd7f32,
                emissiveIntensity: 0.15,
                side: THREE.DoubleSide
            }),
            galvanometer: new THREE.MeshStandardMaterial({
                color: 0x34495e,
                metalness: 0.3,
                roughness: 0.4
            })
        };
    }

    /**
     * Create a bar magnet with N/S poles
     */
    createBarMagnet(options = {}) {
        const { length = 2, width = 0.5, height = 0.4, strength = 1 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'barMagnet', strength, draggable: true };

        // North pole (red)
        const northGeom = new THREE.BoxGeometry(length / 2, height, width);
        const northMesh = new THREE.Mesh(northGeom, this.materials.redPole);
        northMesh.position.x = length / 4;
        northMesh.castShadow = true;
        northMesh.receiveShadow = true;
        group.add(northMesh);

        // South pole (blue)
        const southGeom = new THREE.BoxGeometry(length / 2, height, width);
        const southMesh = new THREE.Mesh(southGeom, this.materials.bluePole);
        southMesh.position.x = -length / 4;
        southMesh.castShadow = true;
        southMesh.receiveShadow = true;
        group.add(southMesh);

        // Labels
        const createLabel = (text, color, posX) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(posX, height / 2 + 0.2, 0);
            sprite.scale.set(0.3, 0.3, 1);
            return sprite;
        };

        group.add(createLabel('N', '#ffffff', length / 4));
        group.add(createLabel('S', '#ffffff', -length / 4));

        // Store dimensions for physics calculations
        group.userData.dimensions = { length, width, height };
        group.userData.northPole = new THREE.Vector3(length / 2, 0, 0);
        group.userData.southPole = new THREE.Vector3(-length / 2, 0, 0);

        return group;
    }

    /**
     * Create a compass with auto-orienting needle
     */
    createCompass(options = {}) {
        const { radius = 0.3, height = 0.1 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'compass', draggable: true };

        // Base
        const baseGeom = new THREE.CylinderGeometry(radius, radius, height, 32);
        const baseMesh = new THREE.Mesh(baseGeom, this.materials.compassBase);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        // Glass top
        const glassGeom = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.02, 32);
        const glassMesh = new THREE.Mesh(glassGeom, this.materials.glass);
        glassMesh.position.y = height / 2 + 0.01;
        group.add(glassMesh);

        // Needle
        const needleGroup = new THREE.Group();
        needleGroup.position.y = height / 2 + 0.03;

        // North part (red arrow)
        const northNeedleGeom = new THREE.ConeGeometry(0.05, radius * 0.8, 4);
        northNeedleGeom.rotateZ(-Math.PI / 2);
        const northNeedleMesh = new THREE.Mesh(northNeedleGeom, this.materials.compassNeedle);
        northNeedleMesh.position.x = radius * 0.4;
        needleGroup.add(northNeedleMesh);

        // South part (white)
        const southNeedleGeom = new THREE.ConeGeometry(0.05, radius * 0.8, 4);
        southNeedleGeom.rotateZ(Math.PI / 2);
        const southNeedleMesh = new THREE.Mesh(southNeedleGeom, this.materials.metal);
        southNeedleMesh.position.x = -radius * 0.4;
        needleGroup.add(southNeedleMesh);

        // Center pin
        const pinGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 16);
        const pinMesh = new THREE.Mesh(pinGeom, this.materials.metal);
        needleGroup.add(pinMesh);

        group.add(needleGroup);
        group.userData.needle = needleGroup;
        group.userData.targetRotation = 0;

        return group;
    }

    /**
     * Create a solenoid/coil
     */
    createSolenoid(options = {}) {
        const { turns = 10, radius = 0.4, length = 2, wireRadius = 0.03 } = options;

        const group = new THREE.Group();
        group.userData = {
            type: 'solenoid',
            turns,
            radius,
            length,
            current: 0,
            currentDirection: 1,
            draggable: true
        };

        // Create coil using tube geometry along helix path
        const coilPoints = [];
        const segments = turns * 32;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * turns * Math.PI * 2;
            const x = (t - 0.5) * length;
            const y = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            coilPoints.push(new THREE.Vector3(x, y, z));
        }

        const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
        const coilGeom = new THREE.TubeGeometry(coilCurve, segments * 2, wireRadius, 8, false);
        const coilMesh = new THREE.Mesh(coilGeom, this.materials.copper);
        coilMesh.castShadow = true;
        group.add(coilMesh);

        // Core (optional, visual only)
        const coreGeom = new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, length * 1.1, 16);
        coreGeom.rotateZ(Math.PI / 2);
        const coreMesh = new THREE.Mesh(coreGeom, this.materials.glass);
        group.add(coreMesh);

        // End connectors
        const connectorGeom = new THREE.CylinderGeometry(wireRadius * 2, wireRadius * 2, 0.3, 8);
        const leftConnector = new THREE.Mesh(connectorGeom, this.materials.copper);
        leftConnector.position.set(-length / 2 - 0.15, -radius, 0);
        group.add(leftConnector);

        const rightConnector = new THREE.Mesh(connectorGeom.clone(), this.materials.copper);
        rightConnector.position.set(length / 2 + 0.15, -radius, 0);
        group.add(rightConnector);

        return group;
    }

    /**
     * Create a straight wire
     */
    createWire(options = {}) {
        const { length = 3, radius = 0.04 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'wire', length, current: 0, currentDirection: 1, draggable: true };

        const wireGeom = new THREE.CylinderGeometry(radius, radius, length, 16);
        wireGeom.rotateZ(Math.PI / 2);
        const wireMesh = new THREE.Mesh(wireGeom, this.materials.wire);
        wireMesh.castShadow = true;
        group.add(wireMesh);

        // End caps
        const capGeom = new THREE.SphereGeometry(radius * 1.5, 16, 16);
        const leftCap = new THREE.Mesh(capGeom, this.materials.copper);
        leftCap.position.x = -length / 2;
        group.add(leftCap);

        const rightCap = new THREE.Mesh(capGeom.clone(), this.materials.copper);
        rightCap.position.x = length / 2;
        group.add(rightCap);

        return group;
    }

    /**
     * Create a battery/power source
     */
    createBattery(options = {}) {
        const { length = 0.8, radius = 0.25 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'battery', voltage: 1.5, draggable: true };

        // Main body
        const bodyGeom = new THREE.CylinderGeometry(radius, radius, length, 32);
        bodyGeom.rotateZ(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.battery);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Positive terminal
        const posGeom = new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, 0.1, 16);
        posGeom.rotateZ(Math.PI / 2);
        const posMesh = new THREE.Mesh(posGeom, this.materials.batteryTerminal);
        posMesh.position.x = length / 2 + 0.05;
        group.add(posMesh);

        // Negative terminal
        const negGeom = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.05, 16);
        negGeom.rotateZ(Math.PI / 2);
        const negMesh = new THREE.Mesh(negGeom, this.materials.metal);
        negMesh.position.x = -length / 2 - 0.025;
        group.add(negMesh);

        // Labels
        const createLabel = (text, posX) => {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 16, 16);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(posX, radius + 0.15, 0);
            sprite.scale.set(0.15, 0.15, 1);
            return sprite;
        };

        group.add(createLabel('+', length / 2));
        group.add(createLabel('−', -length / 2));

        return group;
    }

    /**
     * Create a transformer with primary and secondary coils
     */
    createTransformer(options = {}) {
        const {
            primaryTurns = 10,
            secondaryTurns = 20,
            coreWidth = 2,
            coreHeight = 1.5
        } = options;

        const group = new THREE.Group();
        group.userData = {
            type: 'transformer',
            primaryTurns,
            secondaryTurns,
            turnsRatio: secondaryTurns / primaryTurns,
            draggable: true
        };

        // Iron core (E-I shape simplified to rectangular)
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            metalness: 0.6,
            roughness: 0.4
        });

        // Core pieces
        const coreWidth2 = coreWidth / 3;
        const coreDepth = 0.6;

        // Left vertical
        const leftCoreGeom = new THREE.BoxGeometry(coreWidth2, coreHeight, coreDepth);
        const leftCore = new THREE.Mesh(leftCoreGeom, coreMaterial);
        leftCore.position.x = -coreWidth / 3;
        leftCore.castShadow = true;
        group.add(leftCore);

        // Right vertical
        const rightCore = new THREE.Mesh(leftCoreGeom.clone(), coreMaterial);
        rightCore.position.x = coreWidth / 3;
        rightCore.castShadow = true;
        group.add(rightCore);

        // Top horizontal
        const topCoreGeom = new THREE.BoxGeometry(coreWidth, coreWidth2, coreDepth);
        const topCore = new THREE.Mesh(topCoreGeom, coreMaterial);
        topCore.position.y = coreHeight / 2 - coreWidth2 / 2;
        topCore.castShadow = true;
        group.add(topCore);

        // Bottom horizontal
        const bottomCore = new THREE.Mesh(topCoreGeom.clone(), coreMaterial);
        bottomCore.position.y = -coreHeight / 2 + coreWidth2 / 2;
        bottomCore.castShadow = true;
        group.add(bottomCore);

        // Primary coil (left side)
        const primaryCoil = this.createCoilWinding(-coreWidth / 3, primaryTurns, 0.4, coreHeight * 0.6);
        primaryCoil.userData.isPrimary = true;
        group.add(primaryCoil);
        group.userData.primaryCoil = primaryCoil;

        // Secondary coil (right side)
        const secondaryCoil = this.createCoilWinding(coreWidth / 3, secondaryTurns, 0.35, coreHeight * 0.6);
        secondaryCoil.userData.isSecondary = true;
        group.add(secondaryCoil);
        group.userData.secondaryCoil = secondaryCoil;

        return group;
    }

    createCoilWinding(xPos, turns, radius, height) {
        const group = new THREE.Group();
        const wireRadius = 0.025;

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
        const geom = new THREE.TubeGeometry(curve, segments * 2, wireRadius, 8, false);
        const mesh = new THREE.Mesh(geom, this.materials.copper);
        mesh.castShadow = true;
        group.add(mesh);

        group.position.x = xPos;
        return group;
    }

    /**
     * Create a copper tube for Lenz's law demo
     */
    createCopperTube(options = {}) {
        const { height = 4, outerRadius = 0.5, innerRadius = 0.45 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'copperTube', height };

        // Outer cylinder
        const outerGeom = new THREE.CylinderGeometry(outerRadius, outerRadius, height, 32, 1, true);
        const outerMesh = new THREE.Mesh(outerGeom, this.materials.copperTube);
        outerMesh.castShadow = true;
        group.add(outerMesh);

        // Inner cylinder (for hollow effect)
        const innerMaterial = this.materials.copperTube.clone();
        innerMaterial.side = THREE.BackSide;
        const innerGeom = new THREE.CylinderGeometry(innerRadius, innerRadius, height, 32, 1, true);
        const innerMesh = new THREE.Mesh(innerGeom, innerMaterial);
        group.add(innerMesh);

        // Top ring
        const ringGeom = new THREE.RingGeometry(innerRadius, outerRadius, 32);
        ringGeom.rotateX(-Math.PI / 2);
        const topRing = new THREE.Mesh(ringGeom, this.materials.copperTube);
        topRing.position.y = height / 2;
        group.add(topRing);

        // Bottom ring
        const bottomRing = new THREE.Mesh(ringGeom.clone(), this.materials.copperTube);
        bottomRing.position.y = -height / 2;
        bottomRing.rotation.x = Math.PI / 2;
        group.add(bottomRing);

        return group;
    }

    /**
     * Create a galvanometer (current meter)
     */
    createGalvanometer(options = {}) {
        const { size = 0.6 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'galvanometer', currentValue: 0 };

        // Body
        const bodyGeom = new THREE.BoxGeometry(size, size * 0.8, size * 0.4);
        const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.galvanometer);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Display face
        const faceGeom = new THREE.PlaneGeometry(size * 0.8, size * 0.5);
        const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5dc });
        const faceMesh = new THREE.Mesh(faceGeom, faceMaterial);
        faceMesh.position.z = size * 0.21;
        group.add(faceMesh);

        // Needle
        const needleGroup = new THREE.Group();
        const needleGeom = new THREE.BoxGeometry(size * 0.5, 0.02, 0.01);
        const needleMesh = new THREE.Mesh(needleGeom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
        needleMesh.position.x = size * 0.15;
        needleGroup.add(needleMesh);
        needleGroup.position.set(0, -size * 0.1, size * 0.22);
        group.add(needleGroup);
        group.userData.needle = needleGroup;

        // Scale markings
        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = 128;
        scaleCanvas.height = 64;
        const ctx = scaleCanvas.getContext('2d');
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(64, 70, 50, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        // Tick marks
        for (let i = -3; i <= 3; i++) {
            const angle = Math.PI * 1.5 + (i / 5) * Math.PI * 0.3;
            const x1 = 64 + Math.cos(angle) * 40;
            const y1 = 70 + Math.sin(angle) * 40;
            const x2 = 64 + Math.cos(angle) * 50;
            const y2 = 70 + Math.sin(angle) * 50;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        const scaleTexture = new THREE.CanvasTexture(scaleCanvas);
        const scaleGeom = new THREE.PlaneGeometry(size * 0.7, size * 0.35);
        const scaleMesh = new THREE.Mesh(scaleGeom, new THREE.MeshBasicMaterial({
            map: scaleTexture,
            transparent: true
        }));
        scaleMesh.position.set(0, size * 0.1, size * 0.22);
        group.add(scaleMesh);

        // Terminals
        const terminalGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
        const leftTerminal = new THREE.Mesh(terminalGeom, this.materials.metal);
        leftTerminal.position.set(-size * 0.3, -size * 0.5, 0);
        group.add(leftTerminal);

        const rightTerminal = new THREE.Mesh(terminalGeom.clone(), this.materials.metal);
        rightTerminal.position.set(size * 0.3, -size * 0.5, 0);
        group.add(rightTerminal);

        return group;
    }

    /**
     * Create current flow arrows for visualization
     */
    createCurrentArrow(options = {}) {
        const { length = 0.3, color = 0xf39c12 } = options;

        const group = new THREE.Group();
        group.userData = { type: 'currentArrow' };

        // Arrow body
        const bodyGeom = new THREE.CylinderGeometry(0.02, 0.02, length * 0.7, 8);
        bodyGeom.rotateZ(-Math.PI / 2);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color });
        const bodyMesh = new THREE.Mesh(bodyGeom, bodyMaterial);
        bodyMesh.position.x = -length * 0.15;
        group.add(bodyMesh);

        // Arrow head
        const headGeom = new THREE.ConeGeometry(0.05, length * 0.3, 8);
        headGeom.rotateZ(-Math.PI / 2);
        const headMesh = new THREE.Mesh(headGeom, bodyMaterial);
        headMesh.position.x = length * 0.35;
        group.add(headMesh);

        return group;
    }
}
