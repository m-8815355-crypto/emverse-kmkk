/**
 * Global Page Transition Loader for EM-Verse
 * Handles smooth page transitions with loading animation
 */

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        minimumLoadTime: 500,  // Minimum time to show loader (ms)
        fadeOutDelay: 400,      // Delay before navigating to new page (ms)
        loadedClass: 'loaded'
    };

    let pageLoadTime = Date.now();

    /**
     * Hide the loader with a smooth fade-out
     * Ensures particle rotation completes a full circle first
     */
    function hideLoader() {
        const loader = document.getElementById('page-loader');
        if (!loader) return;

        const elapsed = Date.now() - pageLoadTime;

        // Particle rotation takes 4000ms for full circle
        // Calculate time to next complete circle
        const rotationCycle = 4000;
        const currentCycleProgress = elapsed % rotationCycle;
        const timeToCompleteCircle = rotationCycle - currentCycleProgress;

        // Ensure minimum display time and wait for complete circle
        const minimumWait = Math.max(0, CONFIG.minimumLoadTime - elapsed);
        const totalWait = Math.max(minimumWait, timeToCompleteCircle);

        setTimeout(() => {
            document.body.classList.add(CONFIG.loadedClass);
        }, totalWait);
    }

    /**
     * Show the loader (for page transitions)
     */
    function showLoader() {
        document.body.classList.remove(CONFIG.loadedClass);
    }

    /**
     * Check if a link is internal
     */
    function isInternalLink(link) {
        // Skip if no href or it's an anchor
        if (!link.href || link.href.startsWith('#')) return false;

        // Skip external links
        if (link.hostname !== window.location.hostname) return false;

        // Skip mailto, tel, etc.
        if (link.protocol !== 'http:' && link.protocol !== 'https:') return false;

        // Skip if target is _blank, _top, etc.
        if (link.target && link.target !== '_self') return false;

        return true;
    }

    /**
     * Handle link clicks for smooth page transitions
     */
    function setupLinkTransitions() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');

            if (!link || !isInternalLink(link)) return;

            // Prevent default navigation
            e.preventDefault();

            const url = link.href;

            // Show loader
            showLoader();

            // Navigate after animation
            setTimeout(() => {
                window.location.href = url;
            }, CONFIG.fadeOutDelay);
        });
    }

    /**
     * Force hide loader on back/forward navigation (Safari bfcache fix)
     */
    function handleBackButton() {
        window.addEventListener('pageshow', (event) => {
            // If page is loaded from cache (back button)
            if (event.persisted) {
                document.body.classList.add(CONFIG.loadedClass);
            }
        });
    }

    /**
     * Initialize the loader system
     */
    function init() {
        // Wait for full page load
        if (document.readyState === 'complete') {
            hideLoader();
        } else {
            window.addEventListener('load', hideLoader);
        }

        // Setup link transition handlers
        setupLinkTransitions();

        // Handle browser back button
        handleBackButton();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
