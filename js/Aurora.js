/**
 * Aurora WebGL Background Effect
 * Creates an animated aurora effect using OGL library
 * Reacts dynamically to Light Mode and Dark Mode
 * 
 * Dependencies: OGL (https://oframe.github.io/ogl/)
 * npm install ogl (or use CDN)
 */

// Color Palettes
const AURORA_COLORS = {
    dark: ["#7cff67", "#B19EEF", "#5227FF"],   // Green -> Purple -> Blue
    light: ["#1E52F1", "#EA8AAB", "#F3702F"]   // Lovable Blue -> Pink -> Flamingo
};

// Vertex Shader
const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Fragment Shader
const FRAG = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
out vec4 fragColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop { vec3 color; float position; };
#define COLOR_RAMP(colors, factor, finalColor) { \
  int index = 0; \
  for (int i = 0; i < 2; i++) { \
     ColorStop currentColor = colors[i]; \
     bool isInBetween = currentColor.position <= factor; \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  } \
  ColorStop currentColor = colors[index]; \
  ColorStop nextColor = colors[index + 1]; \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  vec3 auroraColor = intensity * rampColor;
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

/**
 * Aurora Background Class
 * Creates and manages the WebGL aurora effect
 */
class AuroraBackground {
    constructor(options = {}) {
        this.options = {
            amplitude: options.amplitude ?? 1.0,
            blend: options.blend ?? 0.5,
            speed: options.speed ?? 1.0,
            container: options.container ?? null, // If null, creates its own container
            ...options
        };

        this.container = null;
        this.renderer = null;
        this.program = null;
        this.mesh = null;
        this.animateId = null;
        this.isInitialized = false;

        // Bind methods
        this.resize = this.resize.bind(this);
        this.update = this.update.bind(this);
        this.handleThemeChange = this.handleThemeChange.bind(this);
    }

    /**
     * Convert hex color to RGB array [r, g, b] normalized to 0-1
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return [
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            ];
        }
        return [0, 0, 0];
    }

    /**
     * Get current color stops based on theme
     */
    getCurrentColorStops() {
        const isLight = document.documentElement.classList.contains('light');
        const colors = isLight ? AURORA_COLORS.light : AURORA_COLORS.dark;
        return colors.map(hex => this.hexToRgb(hex));
    }

    /**
     * Initialize the Aurora background
     */
    async init() {
        // Dynamically import OGL
        const { Renderer, Program, Mesh, Triangle } = await import('https://cdn.jsdelivr.net/npm/ogl@1.0.3/+esm');

        // Create container element
        if (this.options.container) {
            this.container = typeof this.options.container === 'string'
                ? document.querySelector(this.options.container)
                : this.options.container;
        } else {
            this.container = document.createElement('div');
            this.container.id = 'aurora-background';
            document.body.insertBefore(this.container, document.body.firstChild);
        }

        // Apply container styles
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '-1',
            pointerEvents: 'none',
            overflow: 'hidden'
        });

        // Initialize WebGL renderer
        this.renderer = new Renderer({
            alpha: true,
            premultipliedAlpha: true,
            antialias: true
        });

        const gl = this.renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        Object.assign(gl.canvas.style, {
            backgroundColor: 'transparent',
            width: '100%',
            height: '100%'
        });

        // Create geometry (fullscreen triangle)
        const geometry = new Triangle(gl);
        if (geometry.attributes.uv) delete geometry.attributes.uv;

        // Get initial color stops based on current theme
        const colorStopsArray = this.getCurrentColorStops();

        // Create shader program
        this.program = new Program(gl, {
            vertex: VERT,
            fragment: FRAG,
            uniforms: {
                uTime: { value: 0 },
                uAmplitude: { value: this.options.amplitude },
                uColorStops: { value: colorStopsArray },
                uResolution: { value: [this.container.offsetWidth, this.container.offsetHeight] },
                uBlend: { value: this.options.blend }
            }
        });

        // Create mesh
        this.mesh = new Mesh(gl, { geometry, program: this.program });

        // Append canvas to container
        this.container.appendChild(gl.canvas);

        // Setup resize listener
        window.addEventListener('resize', this.resize);

        // Initial resize
        this.resize();

        // Start animation loop
        this.animateId = requestAnimationFrame(this.update);

        // Setup theme change observer
        this.setupThemeObserver();

        this.isInitialized = true;
        console.log('✨ Aurora WebGL Background initialized');
    }

    /**
     * Handle window resize
     */
    resize() {
        if (!this.container || !this.renderer) return;

        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;

        this.renderer.setSize(width, height);

        if (this.program) {
            this.program.uniforms.uResolution.value = [width, height];
        }
    }

    /**
     * Animation loop
     */
    update(t) {
        this.animateId = requestAnimationFrame(this.update);

        if (!this.program) return;

        // Update time uniform
        this.program.uniforms.uTime.value = t * 0.01 * this.options.speed * 0.1;

        // Update other uniforms
        this.program.uniforms.uAmplitude.value = this.options.amplitude;
        this.program.uniforms.uBlend.value = this.options.blend;

        // Render
        this.renderer.render({ scene: this.mesh });
    }

    /**
     * Setup MutationObserver to watch for theme changes on <html> element
     */
    setupThemeObserver() {
        const html = document.documentElement;

        // Create observer to watch for class changes
        this.themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    this.handleThemeChange();
                }
            });
        });

        // Start observing
        this.themeObserver.observe(html, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    /**
     * Handle theme change and update colors
     */
    handleThemeChange() {
        if (!this.program) return;

        const colorStopsArray = this.getCurrentColorStops();
        this.program.uniforms.uColorStops.value = colorStopsArray;

        const isLight = document.documentElement.classList.contains('light');
        console.log(`🎨 Aurora theme updated: ${isLight ? 'Light Mode' : 'Dark Mode'}`);
    }

    /**
     * Update options dynamically
     */
    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Cleanup and destroy the aurora background
     */
    destroy() {
        if (this.animateId) {
            cancelAnimationFrame(this.animateId);
            this.animateId = null;
        }

        window.removeEventListener('resize', this.resize);

        if (this.themeObserver) {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }

        if (this.renderer) {
            const gl = this.renderer.gl;
            if (this.container && gl.canvas.parentNode === this.container) {
                this.container.removeChild(gl.canvas);
            }
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            this.renderer = null;
        }

        // Remove container if we created it
        if (this.container && this.container.id === 'aurora-background') {
            this.container.remove();
        }

        this.isInitialized = false;
        console.log('Aurora WebGL Background destroyed');
    }
}

// Export for module usage
export { AuroraBackground, AURORA_COLORS };

// Auto-initialize if script is loaded directly or as a module in a browser environment
if (typeof window !== 'undefined') {
    window.AuroraBackground = AuroraBackground;
    window.AURORA_COLORS = AURORA_COLORS;

    // Auto-init logic
    const autoInit = () => {
        // Check if we are already initialized
        if (window.auroraBackground) return;

        // Check if we should ignore (e.g. on pages that manually init)
        const scriptTag = document.querySelector('script[src*="Aurora.js"]');
        if (scriptTag && scriptTag.hasAttribute('data-manual-init')) return;

        // Create and init
        const aurora = new AuroraBackground({
            amplitude: 1.0,
            blend: 0.5,
            speed: 1.0
        });
        aurora.init().catch(err => console.warn('Aurora initialization failed:', err));
        window.auroraBackground = aurora;
    };

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}
