(() => {
    'use strict';

    const container = document.getElementById('event-portal-registration-form-container');
    if (!container || !window.eventTranslations) return;

    let translationPromise = null;
    let observer = null;
    let timer = null;

    function eventId() {
        return new URLSearchParams(window.location.search).get('id') || '';
    }

    function normalizeText(value) {
        return String(value || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function htmlToText(value) {
        if (!value) return '';
        try {
            const parsed = new DOMParser().parseFromString(String(value), 'text/html');
            return normalizeText(parsed.body.textContent || '');
        } catch (_) {
            return normalizeText(value);
        }
    }

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

    async function translationData() {
        if (!translationPromise) {
            const id = eventId();
            if (!id) return null;
            translationPromise = window.eventTranslations.load({ readableEventId: id });
        }

        const translation = await translationPromise;
        if (!translation) return null;

        const source = window.eventTranslations.getLocalizedContent(translation, 'en-US');
        const locale = window.i18n?.currentLocale || navigator.language || 'en-US';
        const target = window.eventTranslations.getLocalizedContent(translation, locale);

        if (!source || !target) return null;

        return { source, target, locale };
    }

    function replaceExactVisibleText(root, sourceText, targetText) {
        if (!sourceText || !targetText || sourceText === targetText) return 0;

        let count = 0;
        const selector = 'h1, h2, h3, h4, h5, h6, p, span, strong, em, div';
        const candidates = Array.from(root.querySelectorAll?.(selector) || [])
            .filter(element => normalizeText(element.textContent) === sourceText)
            .sort((a, b) => {
                const aDepth = a.querySelectorAll?.('*').length || 0;
                const bDepth = b.querySelectorAll?.('*').length || 0;
                return aDepth - bDepth;
            });

        for (const element of candidates) {
            const nestedMatch = Array.from(element.querySelectorAll?.(selector) || [])
                .some(child => normalizeText(child.textContent) === sourceText);
            if (nestedMatch) continue;

            element.textContent = targetText;
            count += 1;
        }

        return count;
    }

    function replaceExactTextNodes(root, sourceText, targetText) {
        if (!sourceText || !targetText || sourceText === targetText) return 0;
        if (!root.ownerDocument && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return 0;

        const documentRef = root.ownerDocument || document;
        const walker = documentRef.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const matches = [];
        let node;

        while ((node = walker.nextNode())) {
            if (normalizeText(node.textContent) === sourceText) matches.push(node);
        }

        matches.forEach(match => {
            const leading = /^\s/.test(match.textContent || '') ? ' ' : '';
            const trailing = /\s$/.test(match.textContent || '') ? ' ' : '';
            match.textContent = `${leading}${targetText}${trailing}`;
        });

        return matches.length;
    }

    async function apply() {
        const data = await translationData();
        if (!data) return 0;

        const sourceTitle = normalizeText(data.source.title || data.source.eventName);
        const targetTitle = normalizeText(data.target.title || data.target.eventName);
        const sourceDescription = htmlToText(data.source.description);
        const targetDescription = htmlToText(data.target.description);

        let applied = 0;
        roots().forEach(root => {
            applied += replaceExactTextNodes(root, sourceTitle, targetTitle);
            applied += replaceExactTextNodes(root, sourceDescription, targetDescription);
            applied += replaceExactVisibleText(root, sourceTitle, targetTitle);
            applied += replaceExactVisibleText(root, sourceDescription, targetDescription);
        });

        if (applied > 0) {
            container.dataset.eventFormTranslationLocale = data.locale;
            container.dataset.eventFormTranslationApplied = String(applied);
        }

        return applied;
    }

    function schedule(delay = 40) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            apply().catch(error => console.warn('Could not localize event content inside registration form:', error));
        }, delay);
    }

    function retries() {
        [0, 100, 300, 700, 1500, 3000, 5000].forEach(delay => {
            setTimeout(() => {
                apply().catch(error => console.warn('Could not localize event content inside registration form:', error));
            }, delay);
        });
    }

    document.addEventListener('d365mkt-afterformload', retries);
    window.addEventListener('eventportal:localechange', () => {
        translationPromise = null;
        retries();
    });

    document.addEventListener('DOMContentLoaded', () => {
        observer?.disconnect();
        observer = new MutationObserver(() => schedule());
        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true
        });
        retries();
    });
})();
