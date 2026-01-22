/**
 * EM-Verse Dock Navigation
 * macOS-style magnifying dock navigation for vanilla JavaScript
 * 
 * Features:
 * - Smooth magnification on hover using CSS transforms
 * - Spring-like animations via CSS transitions
 * - Glassmorphism styling
 * - Fixed top positioning
 */

class EMDock {
    constructor(options = {}) {
        this.options = {
            container: options.container || 'body',
            items: options.items || [],
            magnification: options.magnification ?? 60,  // Size when magnified
            baseSize: options.baseSize ?? 40,            // Base icon size
            distance: options.distance ?? 140,           // Distance for effect
            ...options
        };

        this.dock = null;
        this.dockItems = [];
        this.mouseX = null;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
    }

    /**
     * Initialize the dock
     */
    init() {
        this.createDock();
        this.attachEventListeners();
        console.log('🚀 EM-Verse Dock initialized');
    }

    /**
     * Create the dock HTML structure
     */
    createDock() {
        // Create dock container
        this.dock = document.createElement('nav');
        this.dock.className = 'em-dock';
        this.dock.innerHTML = `
            <div class="dock-panel">
                ${this.options.items.map((item, index) => `
                    <div class="dock-item" data-index="${index}" data-tooltip="${item.label}">
                        <div class="dock-icon-wrapper">
                            ${item.icon}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Get container and insert dock
        const container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (container) {
            container.insertBefore(this.dock, container.firstChild);
        } else {
            document.body.insertBefore(this.dock, document.body.firstChild);
        }

        // Store references to dock items
        this.dockItems = Array.from(this.dock.querySelectorAll('.dock-item'));

        // Attach click handlers
        this.dockItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const itemData = this.options.items[index];
                if (itemData.onClick) {
                    itemData.onClick();
                }
            });
        });
    }

    /**
     * Attach mouse event listeners for magnification
     */
    attachEventListeners() {
        const panel = this.dock.querySelector('.dock-panel');

        panel.addEventListener('mousemove', this.handleMouseMove);
        panel.addEventListener('mouseleave', this.handleMouseLeave);
    }

    /**
     * Handle mouse movement for magnification effect
     */
    handleMouseMove(e) {
        const panel = this.dock.querySelector('.dock-panel');
        const panelRect = panel.getBoundingClientRect();
        this.mouseX = e.clientX - panelRect.left;

        this.updateMagnification();
    }

    /**
     * Handle mouse leave - reset all items
     */
    handleMouseLeave() {
        this.mouseX = null;
        this.dockItems.forEach(item => {
            item.style.transform = 'scale(1)';
            item.style.width = `${this.options.baseSize}px`;
            item.style.height = `${this.options.baseSize}px`;
        });
    }

    /**
     * Update magnification based on mouse position
     */
    updateMagnification() {
        if (this.mouseX === null) return;

        this.dockItems.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            const panel = this.dock.querySelector('.dock-panel');
            const panelRect = panel.getBoundingClientRect();

            // Calculate item center relative to panel
            const itemCenter = (itemRect.left - panelRect.left) + (itemRect.width / 2);

            // Calculate distance from mouse
            const distance = Math.abs(this.mouseX - itemCenter);

            // Calculate scale based on distance
            let scale = 1;
            if (distance < this.options.distance) {
                // Use cosine for smooth falloff
                const ratio = distance / this.options.distance;
                const magnificationRatio = (this.options.magnification - this.options.baseSize) / this.options.baseSize;
                scale = 1 + magnificationRatio * Math.cos((ratio * Math.PI) / 2);
            }

            // Apply scale with spring-like transition
            item.style.transform = `scale(${scale})`;
        });
    }

    /**
     * Destroy the dock
     */
    destroy() {
        if (this.dock) {
            const panel = this.dock.querySelector('.dock-panel');
            panel.removeEventListener('mousemove', this.handleMouseMove);
            panel.removeEventListener('mouseleave', this.handleMouseLeave);
            this.dock.remove();
            this.dock = null;
        }
    }
}

// Material Symbol Icons for the dock (matching previous navigation)
const DockIcons = {
    home: `<span class="material-symbols-outlined">home</span>`,

    history: `<span class="material-symbols-outlined">history_edu</span>`,

    book: `<span class="material-symbols-outlined">menu_book</span>`,

    rocket: `<span class="material-symbols-outlined">explore</span>`,

    ar: `<span class="material-symbols-outlined">view_in_ar</span>`,

    theme: `<span class="material-symbols-outlined">dark_mode</span>`,

    simulate: `<span class="material-symbols-outlined">grid_view</span>`
};

// Scroll helper function
function smoothScrollTo(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Export for module usage
export { EMDock, DockIcons, smoothScrollTo };

// Global access
if (typeof window !== 'undefined') {
    window.EMDock = EMDock;
    window.DockIcons = DockIcons;
    window.smoothScrollTo = smoothScrollTo;
}
