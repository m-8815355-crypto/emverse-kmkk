/**
 * Bar Magnet Module - Explore magnetic fields with compasses
 */
import * as THREE from 'three';

export class BarMagnetModule {
    constructor(app) {
        this.app = app;
        this.name = 'barMagnet';
        this.title = 'Bar Magnet & Compass';
        this.description = 'Drag the magnet to see how compasses respond to magnetic fields';

        this.magnet = null;
        this.compasses = [];
        this.updateInterval = null;
    }

    init() {
        // Create bar magnet
        this.magnet = this.app.components.createBarMagnet({ strength: 1 });
        this.magnet.position.set(0, 0.3, 0);
        this.app.sceneManager.add(this.magnet);
        this.app.interaction.addDraggable(this.magnet);

        // Create compasses in a grid around the magnet
        const compassPositions = [
            [-2, 0.15, 0], [2, 0.15, 0],
            [0, 0.15, -2], [0, 0.15, 2],
            [-1.5, 0.15, -1.5], [1.5, 0.15, -1.5],
            [-1.5, 0.15, 1.5], [1.5, 0.15, 1.5],
            [-2.5, 0.15, -1], [2.5, 0.15, -1],
            [-2.5, 0.15, 1], [2.5, 0.15, 1],
        ];

        for (const pos of compassPositions) {
            const compass = this.app.components.createCompass();
            compass.position.set(...pos);
            this.app.sceneManager.add(compass);
            this.compasses.push(compass);
        }

        // Create sliders
        this.app.sliders.createSlider({
            id: 'magnet-strength',
            label: 'Magnet Strength',
            min: 0.1,
            max: 2,
            value: 1,
            step: 0.1,
            unit: 'x',
            onChange: (val) => {
                this.magnet.userData.strength = val;
                this.updateFieldVisualization();
            }
        });

        this.app.sliders.createSlider({
            id: 'magnet-rotation',
            label: 'Magnet Rotation',
            min: 0,
            max: 360,
            value: 0,
            step: 5,
            unit: '°',
            onChange: (val) => {
                this.magnet.rotation.y = THREE.MathUtils.degToRad(val);
                this.updateFieldVisualization();
            }
        });

        // Setup callbacks
        this.app.interaction.onDrag = () => {
            this.updateFieldVisualization();
        };

        this.app.interaction.onDragEnd = () => {
            this.updateFieldVisualization();
        };

        // Initial field visualization
        this.updateFieldVisualization();
    }

    updateFieldVisualization() {
        // Update field lines
        if (this.app.showFieldLines) {
            this.app.fieldVisualizer.generateMagnetFieldLines(this.magnet, {
                numLines: 12,
                steps: 50,
                stepSize: 0.1
            });
        } else {
            this.app.fieldVisualizer.clearFieldLines();
        }

        // Update arrow field
        if (this.app.showArrows) {
            this.app.fieldVisualizer.generateArrowField([this.magnet], {
                gridSize: 3,
                spacing: 0.7,
                yLevel: 0.15
            });
        } else {
            this.app.fieldVisualizer.clearArrows();
        }

        // Update compass orientations
        this.updateCompasses();
    }

    updateCompasses() {
        for (const compass of this.compasses) {
            const compassPos = new THREE.Vector3();
            compass.getWorldPosition(compassPos);

            // Calculate field at compass position
            const field = this.app.fieldVisualizer.calculateDipoleField(compassPos, this.magnet);

            if (field.length() > 0.001) {
                // Calculate target rotation (needle's +X axis should align with field direction)
                // The needle's red tip (north-seeking pole) points along +X in local space
                // rotation.y rotates around Y axis, so we need angle in XZ plane
                // atan2(-z, x) gives angle from +X axis, rotating around Y
                const targetAngle = Math.atan2(-field.z, field.x);
                compass.userData.targetRotation = targetAngle;
            }
        }
    }

    update(deltaTime) {
        // Smoothly rotate compass needles towards target
        for (const compass of this.compasses) {
            const needle = compass.userData.needle;
            if (!needle) continue;

            const current = needle.rotation.y;
            const target = compass.userData.targetRotation || 0;

            // Normalize angles
            let diff = target - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            // Smooth interpolation
            needle.rotation.y += diff * Math.min(deltaTime * 5, 1);
        }

        // Animate field lines
        this.app.fieldVisualizer.animateFieldLines(deltaTime * 60, 1.0);
    }

    cleanup() {
        // Remove magnet
        if (this.magnet) {
            this.app.sceneManager.remove(this.magnet);
            this.app.interaction.removeDraggable(this.magnet);
        }

        // Remove compasses
        for (const compass of this.compasses) {
            this.app.sceneManager.remove(compass);
        }
        this.compasses = [];

        // Clear field visualization
        this.app.fieldVisualizer.clearAll();

        // Clear sliders
        this.app.sliders.clear();

        // Clear callbacks
        this.app.interaction.onDrag = null;
        this.app.interaction.onDragEnd = null;
    }
}
