(() => {
    'use strict';

    const manager = window.i18n;
    if (!manager) return;

    const fallbackLocale = manager.defaultLocale || 'en-US';
    let fallbackTranslations = {};
    let observer = null;
    let applyTimer = null;

    const originalTranslate = manager.translate.bind(manager);
    const originalSetLocale = manager.setLocale.bind(manager);
    const originalInit = manager.init.bind(manager);

    function applyParams(text, params = {}) {
        let result = String(text);
        Object.entries(params || {}).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
        });
        return result;
    }

    async function loadFallbackTranslations() {
        if (Object.keys(fallbackTranslations).length > 0) return fallbackTranslations;

        try {
            const response = await fetch(`locales/translation.${encodeURIComponent(fallbackLocale)}.json`, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const source = await response.json();
            fallbackTranslations = Object.fromEntries(
                Object.entries(source || {}).filter(([key, value]) => !key.startsWith('_') && typeof value === 'string')
            );
        } catch (error) {
            console.warn(`Could not load fallback locale ${fallbackLocale}:`, error);
            fallbackTranslations = {};
        }

        return fallbackTranslations;
    }

    manager.translate = function translateWithStandardFallback(key, params = {}) {
        const translated = originalTranslate(key, params);
        if (translated !== key) return translated;

        const fallback = fallbackTranslations[key];
        if (typeof fallback === 'string') return applyParams(fallback, params);
        return translated;
    };
    window.__ = (key, params) => manager.translate(key, params);

    function themeKey(preference) {
        if (preference === 'light') return 'themeLight';
        if (preference === 'dark') return 'themeDark';
        return 'themeSystem';
    }

    function updateThemeCopy() {
        const group = document.querySelector('.event-portal-theme-switcher');
        if (group) group.setAttribute('aria-label', manager.translate('colorTheme'));

        document.querySelectorAll('[data-theme-choice]').forEach(button => {
            const preference = button.dataset.themeChoice || 'system';
            const label = button.querySelector('.event-portal-theme-option-label');
            if (label) label.textContent = manager.translate(themeKey(preference));

            const titleKey = preference === 'light'
                ? 'useLightTheme'
                : preference === 'dark'
                    ? 'useDarkTheme'
                    : 'useSystemTheme';
            button.setAttribute('title', manager.translate(titleKey));
        });

        const root = document.documentElement;
        const preference = root.dataset.themePreference || 'system';
        const resolved = root.dataset.theme || 'light';
        const resolvedLabel = manager.translate(themeKey(resolved));
        const preferenceLabel = manager.translate(themeKey(preference));

        document.querySelectorAll('[data-theme-status]').forEach(status => {
            status.textContent = preference === 'system'
                ? manager.translate('themeStatusSystem', { resolved: resolvedLabel })
                : manager.translate('themeStatus', { theme: preferenceLabel });
        });
    }

    function updateDynamicFallbacks() {
        const replacements = [
            ['.event-portal-session-card h3', 'Session', 'sessionFallback'],
            ['.event-portal-speaker-card h3', 'Speaker', 'speakerFallback'],
            ['#event-portal-event-title', 'Event', 'eventFallback']
        ];

        replacements.forEach(([selector, originalText, key]) => {
            document.querySelectorAll(selector).forEach(element => {
                if (element.dataset.portalI18nKey === key || element.textContent.trim() === originalText) {
                    element.dataset.portalI18nKey = key;
                    element.textContent = manager.translate(key);
                }
            });
        });

        document.querySelectorAll('img[alt]').forEach(image => {
            if (image.dataset.portalI18nAltKey === 'genericEventImageAlt') {
                image.alt = manager.translate('genericEventImageAlt');
                return;
            }

            if (image.dataset.portalI18nAltKey === 'eventImageAlt') {
                image.alt = manager.translate('eventImageAlt', { eventName: image.dataset.portalEventName || '' });
                return;
            }

            const alt = String(image.alt || '').trim();
            if (alt === 'Event image') {
                image.dataset.portalI18nAltKey = 'genericEventImageAlt';
                image.alt = manager.translate('genericEventImageAlt');
                return;
            }

            if (/ event image$/i.test(alt)) {
                const eventName = alt.replace(/ event image$/i, '').trim();
                image.dataset.portalI18nAltKey = 'eventImageAlt';
                image.dataset.portalEventName = eventName;
                image.alt = manager.translate('eventImageAlt', { eventName });
            }
        });
    }

    function applyRuntimeCopy() {
        updateThemeCopy();
        updateDynamicFallbacks();
    }

    function scheduleApply() {
        clearTimeout(applyTimer);
        applyTimer = setTimeout(applyRuntimeCopy, 20);
    }

    manager.setLocale = async function setLocaleWithStandardFallback(locale) {
        await loadFallbackTranslations();
        const result = await originalSetLocale(locale);
        applyRuntimeCopy();
        window.dispatchEvent(new CustomEvent('eventportal:localechange', {
            detail: { locale: manager.currentLocale }
        }));
        return result;
    };

    manager.init = async function initWithStandardFallback() {
        await loadFallbackTranslations();
        return originalInit();
    };

    window.addEventListener('eventportal:themechange', scheduleApply);
    window.addEventListener('eventportal:localechange', scheduleApply);

    document.addEventListener('DOMContentLoaded', () => {
        applyRuntimeCopy();
        if (observer) observer.disconnect();
        observer = new MutationObserver(scheduleApply);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['alt', 'data-theme', 'data-theme-preference']
        });
    });
})();
