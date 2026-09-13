(() => {
    'use strict';

    const container = document.getElementById('event-portal-registration-form-container');
    if (!container) return;

    let observer = null;
    let timer = null;

    function roots() {
        const result = [container];
        const seen = new Set(result);
        for (let index = 0; index < result.length; index += 1) {
            result[index].querySelectorAll?.('*').forEach(element => {
                if (element.shadowRoot && !seen.has(element.shadowRoot)) {
                    seen.add(element.shadowRoot);
                    result.push(element.shadowRoot);
                }
            });
        }
        return result;
    }

    function flattenStrings(source, target, sourcePath = [], pairs = []) {
        if (typeof source === 'string' && typeof target === 'string' && source.trim()) {
            pairs.push({ source: source.trim(), target: target.trim(), path: sourcePath.join('.') });
            return pairs;
        }

        if (!source || !target || typeof source !== 'object' || typeof target !== 'object') return pairs;
        Object.keys(source).forEach(key => {
            if (key === '_meta') return;
            flattenStrings(source[key], target[key], [...sourcePath, key], pairs);
        });
        return pairs;
    }

    function currentPairs() {
        const manager = window.formTranslations;
        const translation = manager?.translation;
        if (!translation) return [];

        const locale = window.i18n?.currentLocale || navigator.language || 'en-US';
        const target = manager.localizedContent?.(locale);
        const source = translation['en-US'] || translation.en;
        if (!source || !target) return [];

        return flattenStrings(source, target)
            .filter(pair => pair.target && pair.source !== pair.target)
            .sort((a, b) => b.source.length - a.source.length);
    }

    function replaceExactText(root, pair) {
        let count = 0;
        root.querySelectorAll?.('label, legend, option, p, span, small, strong, em, h1, h2, h3, h4, h5, h6, button, div').forEach(element => {
            if (element.children.length > 0) return;
            if (String(element.textContent || '').trim() !== pair.source) return;
            element.textContent = pair.target;
            count += 1;
        });
        return count;
    }

    function replaceAttributes(root, pair) {
        let count = 0;
        root.querySelectorAll?.('[placeholder], [aria-label], [title], [data-validation-message], [data-error-message], input[type="submit"], input[type="button"]').forEach(element => {
            ['placeholder', 'aria-label', 'title', 'data-validation-message', 'data-error-message'].forEach(attribute => {
                if (String(element.getAttribute(attribute) || '').trim() === pair.source) {
                    element.setAttribute(attribute, pair.target);
                    count += 1;
                }
            });

            if ((element.matches('input[type="submit"]') || element.matches('input[type="button"]')) && String(element.value || '').trim() === pair.source) {
                element.value = pair.target;
                count += 1;
            }
        });
        return count;
    }

    function apply() {
        const pairs = currentPairs();
        if (pairs.length === 0) return;

        let applied = 0;
        roots().forEach(root => {
            pairs.forEach(pair => {
                applied += replaceExactText(root, pair);
                applied += replaceAttributes(root, pair);
            });
        });

        if (applied > 0) {
            container.dataset.extendedFormTranslationLocale = window.i18n?.currentLocale || 'en-US';
            container.dataset.extendedFormTranslationApplied = String(applied);
        }
    }

    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(apply, 30);
    }

    function retries() {
        [0, 100, 300, 700, 1500, 3000, 5000].forEach(delay => setTimeout(apply, delay));
    }

    document.addEventListener('d365mkt-afterformload', retries);
    window.addEventListener('eventportal:localechange', retries);
    document.addEventListener('DOMContentLoaded', () => {
        if (observer) observer.disconnect();
        observer = new MutationObserver(schedule);
        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['placeholder', 'aria-label', 'title', 'data-validation-message', 'data-error-message', 'value']
        });
        retries();
    });
})();
