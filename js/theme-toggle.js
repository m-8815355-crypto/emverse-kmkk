/**
 * EM-Verse Theme Toggle
 * Handles light/dark mode switching across all pages
 */

// Toggle theme function
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');

    if (html.classList.contains('light')) {
        html.classList.remove('light');
        html.classList.add('dark');
        if (themeIcon) themeIcon.textContent = 'dark_mode';
        localStorage.setItem('emverse-theme', 'dark');
    } else {
        html.classList.remove('dark');
        html.classList.add('light');
        if (themeIcon) themeIcon.textContent = 'light_mode';
        localStorage.setItem('emverse-theme', 'light');
    }
}

// Apply saved theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem('emverse-theme') || 'dark';
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');

    html.classList.remove('light', 'dark');
    html.classList.add(savedTheme);

    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? 'light_mode' : 'dark_mode';
    }
}

// Initialize theme immediately
initTheme();

// Also run on DOMContentLoaded to update icon if it wasn't ready
document.addEventListener('DOMContentLoaded', initTheme);
