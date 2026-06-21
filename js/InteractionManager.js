/**
 * Interaction Manager - Handles user input and object manipulation
 */
import * as THREE from 'three';

export class InteractionManager {
    constructor(sceneManager, camera, canvas) {
        this.sceneManager = sceneManager;
        this.camera = camera;
        this.canvas = canvas;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.draggableObjects = [];
        this.selectedObject = null;
        this.isDragging = false;
        this.dragOffset = new THREE.Vector3();

        this.onDragStart = null;
        this.onDrag = null;
        this.onDragEnd = null;
        this.onSelect = null;

        this.enabled = true;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    }

    updateMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    addDraggable(object) {
        if (!this.draggableObjects.includes(object)) {
            this.draggableObjects.push(object);
        }
    }

    removeDraggable(object) {
        const index = this.draggableObjects.indexOf(object);
        if (index > -1) {
            this.draggableObjects.splice(index, 1);
        }
    }

    clearDraggables() {
        this.draggableObjects = [];
        this.selectedObject = null;
    }

    getIntersectedObject() {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get all meshes from draggable groups
        const meshes = [];
        for (const obj of this.draggableObjects) {
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.userData.parentGroup = obj;
                    meshes.push(child);
                }
            });
        }

        const intersects = this.raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
            return intersects[0].object.userData.parentGroup || intersects[0].object;
        }

        return null;
    }

    onMouseDown(event) {
        if (!this.enabled || event.button !== 0) return;

        this.updateMouse(event);
        const intersected = this.getIntersectedObject();

        if (intersected && intersected.userData.draggable) {
            this.startDrag(intersected, event);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    onMouseMove(event) {
        if (!this.enabled) return;

        this.updateMouse(event);

        if (this.isDragging && this.selectedObject) {
            this.performDrag(event);
            event.preventDefault();
        } else {
            // Hover effect
            const intersected = this.getIntersectedObject();
            this.updateCursor(intersected);
        }
    }

    onMouseUp(event) {
        if (!this.enabled) return;

        if (this.isDragging) {
            this.endDrag();
        }
    }

    onTouchStart(event) {
        if (!this.enabled || event.touches.length !== 1) return;

        const touch = event.touches[0];
        this.updateMouse(touch);
        const intersected = this.getIntersectedObject();

        if (intersected && intersected.userData.draggable) {
            this.startDrag(intersected, touch);
            event.preventDefault();
        }
    }

    onTouchMove(event) {
        if (!this.enabled || !this.isDragging) return;

        const touch = event.touches[0];
        this.updateMouse(touch);
        this.performDrag(touch);
        event.preventDefault();
    }

    onTouchEnd(event) {
        if (!this.enabled) return;

        if (this.isDragging) {
            this.endDrag();
        }
    }

    startDrag(object, event) {
        this.isDragging = true;
        this.selectedObject = object;

        // Disable orbit controls during drag
        if (this.sceneManager.controls) {
            this.sceneManager.controls.enabled = false;
        }

        // Calculate drag offset
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

        this.dragOffset.copy(object.position).sub(intersectPoint);

        if (this.onDragStart) {
            this.onDragStart(object);
        }

        if (this.onSelect) {
            this.onSelect(object);
        }
    }

    performDrag(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

        const newPosition = intersectPoint.add(this.dragOffset);

        // Constrain to bounds if needed
        newPosition.y = Math.max(0, Math.min(newPosition.y, 3));
        newPosition.x = Math.max(-5, Math.min(newPosition.x, 5));
        newPosition.z = Math.max(-5, Math.min(newPosition.z, 5));

        this.selectedObject.position.copy(newPosition);

        if (this.onDrag) {
            this.onDrag(this.selectedObject, newPosition);
        }
    }

    endDrag() {
        this.isDragging = false;

        // Re-enable orbit controls
        if (this.sceneManager.controls) {
            this.sceneManager.controls.enabled = true;
        }

        if (this.onDragEnd && this.selectedObject) {
            this.onDragEnd(this.selectedObject);
        }

        this.selectedObject = null;
        this.canvas.style.cursor = 'default';
    }

    updateCursor(intersected) {
        if (intersected && intersected.userData.draggable) {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    setDragPlaneHeight(height) {
        this.dragPlane.constant = -height;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.endDrag();
        }
    }
}

/**
 * Slider Manager - Creates and manages parameter sliders
 */
export class SliderManager {
    constructor(container) {
        this.container = container;
        this.sliders = new Map();
    }

    createSlider(options) {
        const {
            id,
            label,
            min = 0,
            max = 100,
            value = 50,
            step = 1,
            unit = '',
            onChange
        } = options;

        const sliderGroup = document.createElement('div');
        sliderGroup.className = 'slider-group';
        sliderGroup.id = `slider-group-${id}`;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'slider-label';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'slider-value';
        valueSpan.textContent = `${value}${unit}`;

        labelDiv.appendChild(labelSpan);
        labelDiv.appendChild(valueSpan);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = id;
        input.min = min;
        input.max = max;
        input.value = value;
        input.step = step;

        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valueSpan.textContent = `${val}${unit}`;
            if (onChange) onChange(val);
        });

        sliderGroup.appendChild(labelDiv);
        sliderGroup.appendChild(input);

        this.container.appendChild(sliderGroup);
        this.sliders.set(id, { element: sliderGroup, input, valueSpan, unit });

        return input;
    }

    getValue(id) {
        const slider = this.sliders.get(id);
        return slider ? parseFloat(slider.input.value) : null;
    }

    setValue(id, value) {
        const slider = this.sliders.get(id);
        if (slider) {
            slider.input.value = value;
            slider.valueSpan.textContent = `${value}${slider.unit}`;
            slider.input.dispatchEvent(new Event('input'));
        }
    }

    removeSlider(id) {
        const slider = this.sliders.get(id);
        if (slider) {
            slider.element.remove();
            this.sliders.delete(id);
        }
    }

    clear() {
        this.sliders.forEach((slider, id) => {
            slider.element.remove();
        });
        this.sliders.clear();
    }
}
