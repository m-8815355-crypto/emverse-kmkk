import * as THREE from 'three';
import { createBarMagnet } from './BarMagnet.js';
import { animateMagneticField } from './MagneticField.js';
import {
    createInteractionField,
    animateInteractionField,
    removeInteractionField,
    getInteractionType,
    getForceStrengthIndicator,
    startMagnetPhysics,
    updateMagnetPhysics
} from './MagnetInteraction.js';

let container;
let camera, scene, renderer;
let controller;

let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;

let magnets = [];
let xrSession = null;

// Selection and rotation state
let selectedMagnet = null;
let rotationMode = false;

// Maximum number of magnets allowed
const MAX_MAGNETS = 2;

// Clock for deltaTime calculations
const clock = new THREE.Clock();

// Raycaster for magnet selection
const raycaster = new THREE.Raycaster();

const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const promptBox = document.getElementById('interaction-prompt');
const promptText = document.getElementById('prompt-text');
const arControls = document.getElementById('ar-controls');
const resetBtn = document.getElementById('reset-btn');
const magnetCounter = document.getElementById('magnet-counter');
const magnetCountDisplay = document.getElementById('magnet-count');

init();

function init() {
    container = document.getElementById('canvas-container');

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Hemisphere light for ambient
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.2);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Directional light for better shading
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0, 5, 0);
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Reticle for placement - reduced opacity (was 0.5, now 0.25)
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Check AR Support
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (supported) {
                startBtn.disabled = false;
                startBtn.addEventListener('click', onStartAR);
            } else {
                startBtn.textContent = "AR Not Supported on this Device";
                startBtn.disabled = true;
                startBtn.style.background = "#333";
            }
        });
    } else {
        startBtn.textContent = "WebXR Not Available";
        startBtn.disabled = true;
        startBtn.style.background = "#333";
    }

    resetBtn.addEventListener('click', () => {
        magnets.forEach(m => scene.remove(m));
        magnets = [];
        selectedMagnet = null;
        rotationMode = false;
        removeInteractionField(scene);
        updateMagnetCounter();
        promptText.innerText = "All magnets removed. Tap to place.";
        promptBox.classList.remove('attract', 'repel');
    });

    window.addEventListener('resize', onWindowResize);
}

async function onStartAR() {
    if (xrSession) return;

    const sessionInit = {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: overlay }
    };

    try {
        const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
        session.addEventListener('end', onSessionEnd);

        renderer.xr.setReferenceSpaceType('local');
        renderer.xr.setSession(session);

        xrSession = session;

        // UI Updates
        startBtn.classList.add('hidden');
        document.querySelector('header').classList.add('hidden');
        promptBox.classList.remove('hidden');
        promptText.innerText = "Point camera at floor or table...";
        arControls.classList.remove('hidden');
        magnetCounter.classList.remove('hidden');
        updateMagnetCounter();

        // Controller for taps
        controller = renderer.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.add(controller);

        // Start the clock
        clock.start();

    } catch (e) {
        console.error("Failed to start session", e);
        alert("Failed to start AR session: " + e.message);
    }
}

function onSessionEnd() {
    xrSession = null;
    startBtn.classList.remove('hidden');
    document.querySelector('header').classList.remove('hidden');
    promptBox.classList.add('hidden');
    arControls.classList.add('hidden');
    magnetCounter.classList.add('hidden');

    hitTestSource = null;
    hitTestSourceRequested = false;
    reticle.visible = false;

    // Clear magnets and interaction field on session end
    magnets.forEach(m => scene.remove(m));
    magnets = [];
    selectedMagnet = null;
    rotationMode = false;
    removeInteractionField(scene);
}

function onSelect() {
    // PRIORITY 1: If we can still place magnets and reticle is visible, place a magnet
    // Only check for magnet selection AFTER max magnets are placed
    if (reticle.visible && magnets.length < MAX_MAGNETS) {
        placeNewMagnet();
        return;
    }

    // PRIORITY 2: If max magnets placed, check for magnet selection/rotation
    if (magnets.length >= MAX_MAGNETS) {
        const selectedResult = checkMagnetSelection();

        if (selectedResult) {
            // Tapped on a magnet - toggle selection for rotation
            handleMagnetSelection(selectedResult);
            return;
        }

        // If in rotation mode and tapped elsewhere, deselect
        if (rotationMode && selectedMagnet) {
            deselectMagnet();
            return;
        }

        // Tapped but not on a magnet
        if (!rotationMode) {
            promptText.innerText = "Maximum " + MAX_MAGNETS + " magnets. Tap a magnet to rotate, or Reset.";
        }
    }
}

/**
 * Checks if user tapped on a magnet using raycasting
 */
function checkMagnetSelection() {
    // Get controller position for raycasting
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    const rayDirection = new THREE.Vector3(0, 0, -1);
    rayDirection.applyMatrix4(tempMatrix);

    const rayOrigin = new THREE.Vector3();
    rayOrigin.setFromMatrixPosition(controller.matrixWorld);

    raycaster.set(rayOrigin, rayDirection);

    // Check intersection with magnets
    const intersects = raycaster.intersectObjects(magnets, true);

    if (intersects.length > 0) {
        // Find the parent magnet group
        let magnetGroup = intersects[0].object;
        while (magnetGroup.parent && !magnetGroup.userData.isBarMagnet) {
            magnetGroup = magnetGroup.parent;
        }
        if (magnetGroup.userData.isBarMagnet) {
            return magnetGroup;
        }
    }

    return null;
}

/**
 * Handles magnet selection for rotation
 */
function handleMagnetSelection(magnet) {
    if (selectedMagnet === magnet) {
        // Same magnet tapped again - rotate it 45 degrees
        magnet.rotateY(Math.PI / 4);

        // Recalculate field interaction if both magnets placed
        if (magnets.length === 2) {
            createInteractionField(scene, magnets[0], magnets[1]);
            // Start physics for attract/repel motion
            startMagnetPhysics(magnets);
            updateInteractionPrompt();
        }

        promptText.innerText = "Magnet rotated. Tap again to rotate more.";
    } else {
        // Different magnet selected
        if (selectedMagnet) {
            deselectMagnet();
        }
        selectMagnet(magnet);
    }
}

/**
 * Selects a magnet for rotation
 */
function selectMagnet(magnet) {
    selectedMagnet = magnet;
    rotationMode = true;
    magnet.userData.selected = true;

    // Visual feedback - add glow effect
    addSelectionGlow(magnet);

    promptText.innerText = "Magnet selected. Tap it to rotate 45 degrees.";
}

/**
 * Deselects the current magnet
 */
function deselectMagnet() {
    if (selectedMagnet) {
        selectedMagnet.userData.selected = false;
        removeSelectionGlow(selectedMagnet);
        selectedMagnet = null;
    }
    rotationMode = false;

    if (magnets.length === 2) {
        updateInteractionPrompt();
    } else if (magnets.length === 1) {
        promptText.innerText = "Tap to place second magnet.";
    } else {
        promptText.innerText = "Tap to place magnet.";
    }
}

/**
 * Adds a selection glow effect to a magnet
 */
function addSelectionGlow(magnet) {
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });

    const glowGeo = new THREE.BoxGeometry(0.09, 0.02, 0.035);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'selectionGlow';
    magnet.add(glow);
}

/**
 * Removes selection glow from a magnet
 */
function removeSelectionGlow(magnet) {
    const glow = magnet.getObjectByName('selectionGlow');
    if (glow) {
        magnet.remove(glow);
    }
}

/**
 * Places a new magnet at the reticle position
 */
function placeNewMagnet() {
    const magnet = createBarMagnet();

    // Set position to reticle (MAGNET STAYS FIXED HERE)
    magnet.position.setFromMatrixPosition(reticle.matrix);
    magnet.quaternion.setFromRotationMatrix(reticle.matrix);

    // Add slight rotation variety for second magnet
    if (magnets.length > 0) {
        magnet.rotateY(Math.PI * 0.5);
    }

    scene.add(magnet);
    magnets.push(magnet);

    // Update counter
    updateMagnetCounter();

    // Update UI feedback - no emoji
    if (magnets.length === 1) {
        promptText.innerText = "First magnet placed! Tap to place the second.";
    } else if (magnets.length === MAX_MAGNETS) {
        // Create the interaction field between the two magnets
        createInteractionField(scene, magnets[0], magnets[1]);
        // Start physics for attract/repel motion
        startMagnetPhysics(magnets);
        promptText.innerText = "Both magnets placed! Tap a magnet to rotate it.";
        setTimeout(updateInteractionPrompt, 1500);
    }
}

/**
 * Updates the magnet counter display
 */
function updateMagnetCounter() {
    magnetCountDisplay.innerText = magnets.length;

    if (magnets.length >= MAX_MAGNETS) {
        magnetCounter.classList.add('full');
    } else {
        magnetCounter.classList.remove('full');
    }
}

/**
 * Updates the prompt text based on magnetic field interaction - no emoji
 */
function updateInteractionPrompt() {
    if (magnets.length !== 2) return;

    const interaction = getInteractionType(magnets[0], magnets[1]);
    const strength = getForceStrengthIndicator(magnets);

    let strengthText = "weak";
    if (strength > 0.7) strengthText = "strong";
    else if (strength > 0.3) strengthText = "moderate";

    // Update visual indicator classes
    promptBox.classList.remove('attract', 'repel');

    if (interaction.type === 'attract') {
        promptBox.classList.add('attract');
        promptText.innerText = interaction.poles + " Field Attraction (" + strengthText + ")";
    } else {
        promptBox.classList.add('repel');
        promptText.innerText = interaction.poles + " Field Repulsion (" + strengthText + ")";
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Main Render Loop
renderer.setAnimationLoop((timestamp, frame) => {
    const deltaTime = clock.getDelta();

    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        // Hit test for placement reticle
        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            session.addEventListener('end', () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });
            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                // Show reticle only when can place more magnets and not in rotation mode
                reticle.visible = magnets.length < MAX_MAGNETS && !rotationMode;
                reticle.matrix.fromArray(pose.transform.matrix);

                // Update UI prompt if still searching and no magnets
                if (magnets.length === 0) {
                    promptText.innerText = "Surface detected! Tap to place first magnet.";
                }
            } else {
                reticle.visible = false;
                if (magnets.length === 0) {
                    promptText.innerText = "Move phone slowly to scan...";
                }
            }
        }
    }

    // Animate individual magnet field particles
    magnets.forEach(magnet => {
        magnet.children.forEach(child => {
            if (child.userData.particles) {
                animateMagneticField(child, deltaTime);
            }
        });
    });

    // Animate the interaction field between magnets (if 2 placed)
    if (magnets.length === 2) {
        animateInteractionField(deltaTime);
        // Update physics for attract/repel motion
        updateMagnetPhysics(magnets, deltaTime, scene);
    }

    // Animate selection glow
    if (selectedMagnet) {
        const glow = selectedMagnet.getObjectByName('selectionGlow');
        if (glow) {
            const pulse = 0.25 + 0.1 * Math.sin(Date.now() * 0.005);
            glow.material.opacity = pulse;
        }
    }

    renderer.render(scene, camera);
});
