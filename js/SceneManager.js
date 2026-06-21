/**
 * Scene Manager - Handles 3D scene setup and rendering
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.objects = [];
        this.clock = new THREE.Clock();

        this.setupRenderer();
        this.setupCamera();
        this.setupControls();
        this.setupLighting();
        this.setupGrid();
        this.setupBackground();

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    setupCamera() {
        const width = this.canvas.clientWidth || window.innerWidth || 800;
        const height = this.canvas.clientHeight || window.innerHeight || 600;
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(5, 4, 5);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI * 0.85;
        this.controls.target.set(0, 0, 0);
    }

    setupLighting() {
        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x4a7c6f, 0.6);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x00d4aa, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);

        // Rim light for dramatic effect
        const rimLight = new THREE.DirectionalLight(0x00ffcc, 0.2);
        rimLight.position.set(0, -5, 0);
        this.scene.add(rimLight);
    }

    setupGrid() {
        // Grid helper: accent (0x2f2fe4) and primary (0x162e93)
        this.gridHelper = new THREE.GridHelper(20, 40, 0x2f2fe4, 0x162e93);
        this.gridHelper.material.opacity = 0.3;
        this.gridHelper.material.transparent = true;
        this.gridHelper.visible = true; // Make grid visible by default
        this.currentGridVisible = true;
        this.scene.add(this.gridHelper);

        // Ground plane (invisible but for shadows)
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.01;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    setupBackground() {
        // Gradient background using a large sphere
        const bgGeometry = new THREE.SphereGeometry(100, 32, 32);
        this.bgMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x1a1953) },
                bottomColor: { value: new THREE.Color(0x080616) }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const bgSphere = new THREE.Mesh(bgGeometry, this.bgMaterial);
        this.scene.add(bgSphere);
    }

    setTheme(theme) {
        if (theme === 'light') {
            // Light mode: Soft Blue/Pink
            this.bgMaterial.uniforms.topColor.value.setHex(0xe8ebf5);
            this.bgMaterial.uniforms.bottomColor.value.setHex(0xfce7f3);

            // Grid: Blue with pink hint
            this.scene.remove(this.gridHelper);
            this.gridHelper = new THREE.GridHelper(20, 40, 0x3374FF, 0xF43F5E);
            this.gridHelper.material.opacity = 0.3;
            this.gridHelper.material.transparent = true;
            this.gridHelper.visible = this.currentGridVisible !== undefined ? this.currentGridVisible : false;
            this.scene.add(this.gridHelper);

            // Ground shadow opacity
            this.ground.material.opacity = 0.08;

        } else {
            // Dark mode: Color Hunt Palette
            this.bgMaterial.uniforms.topColor.value.setHex(0x1a1953);
            this.bgMaterial.uniforms.bottomColor.value.setHex(0x080616);

            // Grid: Bright blue to dark blue
            this.scene.remove(this.gridHelper);
            this.gridHelper = new THREE.GridHelper(20, 40, 0x2f2fe4, 0x162e93);
            this.gridHelper.material.opacity = 0.25;
            this.gridHelper.material.transparent = true;
            this.gridHelper.visible = this.currentGridVisible !== undefined ? this.currentGridVisible : false;
            this.scene.add(this.gridHelper);

            // Ground shadow opacity
            this.ground.material.opacity = 0.3;
        }
    }

    handleResize() {
        const width = this.canvas.clientWidth || window.innerWidth || 800;
        const height = this.canvas.clientHeight || window.innerHeight || 600;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height, false);
    }

    add(object) {
        this.scene.add(object);
        this.objects.push(object);
    }

    remove(object) {
        this.scene.remove(object);
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    clear() {
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.objects = [];
    }

    toggleGrid(visible) {
        this.currentGridVisible = visible;
        this.gridHelper.visible = visible;
    }

    resetCamera() {
        this.camera.position.set(5, 4, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    update() {
        this.controls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getDelta() {
        return this.clock.getDelta();
    }

    getElapsedTime() {
        return this.clock.getElapsedTime();
    }
}
