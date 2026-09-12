(() => {
    const STORAGE_KEY = 'eventPortalTheme';
    const VALID_PREFERENCES = new Set(['system', 'light', 'dark']);
    const root = document.documentElement;
    const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)');

    function readPreference() {
        const current = root.dataset.themePreference;
        if (VALID_PREFERENCES.has(current)) {
            return current;
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (VALID_PREFERENCES.has(stored)) {
                return stored;
            }
        } catch (error) {
            // Ignore storage access errors and fall back to system.
        }

        return 'system';
    }

    function resolveTheme(preference) {
        if (preference === 'dark' || preference === 'light') {
            return preference;
        }
        return systemTheme?.matches ? 'dark' : 'light';
    }

    function updateControls(preference, resolvedTheme) {
        document.querySelectorAll('[data-theme-choice]').forEach(button => {
            const isActive = button.dataset.themeChoice === preference;
            button.setAttribute('aria-pressed', String(isActive));
            button.classList.toggle('is-active', isActive);
        });

        document.querySelectorAll('[data-theme-status]').forEach(status => {
            const preferenceLabel = preference.charAt(0).toUpperCase() + preference.slice(1);
            const resolvedLabel = resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1);
            status.textContent = preference === 'system'
                ? `Theme: System (${resolvedLabel})`
                : `Theme: ${preferenceLabel}`;
        });
    }

    function applyPreference(preference, { persist = true } = {}) {
        const normalizedPreference = VALID_PREFERENCES.has(preference) ? preference : 'system';
        const resolvedTheme = resolveTheme(normalizedPreference);

        root.dataset.themePreference = normalizedPreference;
        root.dataset.theme = resolvedTheme;
        root.style.colorScheme = resolvedTheme;

        if (persist) {
            try {
                localStorage.setItem(STORAGE_KEY, normalizedPreference);
            } catch (error) {
                // Theme still works for this page even if persistence is unavailable.
            }
        }

        updateControls(normalizedPreference, resolvedTheme);
        window.dispatchEvent(new CustomEvent('eventportal:themechange', {
            detail: {
                preference: normalizedPreference,
                theme: resolvedTheme
            }
        }));
    }

    function handleSystemThemeChange() {
        if (readPreference() === 'system') {
            applyPreference('system', { persist: false });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const preference = readPreference();
        updateControls(preference, resolveTheme(preference));

        document.querySelectorAll('[data-theme-choice]').forEach(button => {
            button.addEventListener('click', () => {
                applyPreference(button.dataset.themeChoice);
            });
        });

        if (systemTheme) {
            if (typeof systemTheme.addEventListener === 'function') {
                systemTheme.addEventListener('change', handleSystemThemeChange);
            } else if (typeof systemTheme.addListener === 'function') {
                systemTheme.addListener(handleSystemThemeChange);
            }
        }
    });
})();
