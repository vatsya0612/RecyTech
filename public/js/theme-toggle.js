// Theme Toggle - Light and Dark Mode
const ThemeToggle = (() => {
    const THEME_KEY = 'recytech-theme';
    const DARK_MODE_CLASS = 'dark-mode';

    // Get saved theme or default to light
    const getSavedTheme = () => {
        return localStorage.getItem(THEME_KEY) || 'light';
    };

    // Apply theme to document
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add(DARK_MODE_CLASS);
        } else {
            document.body.classList.remove(DARK_MODE_CLASS);
        }
        updateToggleIcon(theme);
    };

    // Update toggle button icon
    const updateToggleIcon = (theme) => {
        const toggleBtn = document.querySelector('[data-theme-toggle]');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    };

    // Toggle between light and dark
    const toggle = () => {
        const currentTheme = getSavedTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    };

    // Initialize theme on page load
    const init = () => {
        const savedTheme = getSavedTheme();
        applyTheme(savedTheme);

        // Attach event listener to toggle button
        const toggleBtn = document.querySelector('[data-theme-toggle]');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggle);
        }
    };

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        toggle,
        init
    };
})();
