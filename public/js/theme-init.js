(() => {
    const STORAGE_KEY = 'eventPortalTheme';
    const VALID_PREFERENCES = new Set(['system', 'light', 'dark']);
    const root = document.documentElement;

    let preference = 'system';
    try {
        const storedPreference = localStorage.getItem(STORAGE_KEY);
        if (VALID_PREFERENCES.has(storedPreference)) {
            preference = storedPreference;
        }
    } catch (error) {
        // localStorage can be unavailable in restricted browsing modes.
    }

    const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const resolvedTheme = preference === 'system'
        ? (systemPrefersDark ? 'dark' : 'light')
        : preference;

    root.dataset.themePreference = preference;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
})();
