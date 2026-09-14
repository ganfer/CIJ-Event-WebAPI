/**
 * Optional localized content overrides for individual events.
 *
 * UI translations continue to live in /locales/translation.<locale>.json.
 * Event-specific content lives in /translations/events/<event-key>.json.
 * Missing files, locales, entities, or fields always fall back to the Events API.
 */
class EventTranslationManager {
    constructor() {
        this.basePath = 'translations/events/';
        this.cache = new Map();
        this.localeInitialized = false;
    }

    getEventKey(event) {
        const candidates = [event?.readableEventId, event?.eventId, event?.id, event?.eventID];
        const value = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
        return value ? value.trim() : '';
    }

    getEntityKey(entity, type) {
        const candidates = type === 'session'
            ? [entity?.readableSessionId, entity?.sessionId, entity?.id, entity?.sessionID]
            : [entity?.speakerId, entity?.id, entity?.speakerID];
        const value = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
        return value ? value.trim() : '';
    }

    getLocaleCandidates(locale) {
        const normalized = String(locale || 'en-US').replace('_', '-');
        const language = normalized.split('-')[0].toLowerCase();
        return [...new Set([normalized, language, 'en-US', 'en'])];
    }

    async load(event) {
        const key = this.getEventKey(event);
        if (!key) return null;
        if (this.cache.has(key)) return this.cache.get(key);

        const request = fetch(`${this.basePath}${encodeURIComponent(key)}.json`, { cache: 'no-cache' })
            .then(async response => {
                if (response.status === 404) return null;
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .catch(error => {
                console.warn(`Could not load event translation for ${key}:`, error);
                return null;
            });

        this.cache.set(key, request);
        return request;
    }

    getLocalizedContent(translation, locale) {
        if (!translation) return null;
        for (const candidate of this.getLocaleCandidates(locale)) {
            if (translation[candidate] && typeof translation[candidate] === 'object') {
                return translation[candidate];
            }
        }
        return null;
    }

    async localize(event, locale = window.i18n?.currentLocale || navigator.language || 'en-US') {
        const translation = await this.load(event);
        const localized = this.getLocalizedContent(translation, locale);
        if (!localized) return { ...event };

        return {
            ...event,
            eventName: localized.title || localized.eventName || event.eventName,
            description: localized.description || event.description,
            websiteContent: {
                ...(event.websiteContent || {}),
                ...(localized.websiteContent || {})
            }
        };
    }

    localizeCollection(items, translations, type) {
        if (!Array.isArray(items) || !translations || typeof translations !== 'object') return items || [];
        return items.map(item => {
            const key = this.getEntityKey(item, type);
            const override = key ? translations[key] : null;
            if (!override || typeof override !== 'object') return { ...item };

            if (type === 'session') {
                return {
                    ...item,
                    name: override.title || override.name || item.name,
                    sessionSummary: override.summary || override.sessionSummary || item.sessionSummary,
                    detailedDescription: override.description || override.detailedDescription || item.detailedDescription,
                    sessionObjectives: override.objectives || override.sessionObjectives || item.sessionObjectives
                };
            }

            return {
                ...item,
                name: override.name || item.name,
                title: override.title || item.title,
                about: override.about || override.bio || item.about
            };
        });
    }

    async localizeDetails(event, sessions = [], speakers = [], locale = window.i18n?.currentLocale || navigator.language || 'en-US') {
        const translation = await this.load(event);
        const localized = this.getLocalizedContent(translation, locale);
        const localizedEvent = await this.localize(event, locale);

        return {
            event: localizedEvent,
            sessions: this.localizeCollection(sessions, localized?.sessions, 'session'),
            speakers: this.localizeCollection(speakers, localized?.speakers, 'speaker')
        };
    }

    async localizeAll(events, locale) {
        if (!Array.isArray(events)) return [];
        return Promise.all(events.map(event => this.localize(event, locale)));
    }

    /**
     * The existing pages keep API results in memory. Reload after an explicit locale
     * change so the API wrapper can rehydrate the page with the newly selected event
     * content. The first setLocale call is initialization and must not reload.
     */
    wrapLocaleChanges() {
        if (!window.i18n?.setLocale || window.i18n.__eventTranslationLocaleWrapped) return;

        const originalSetLocale = window.i18n.setLocale.bind(window.i18n);
        window.i18n.setLocale = async (...args) => {
            const result = await originalSetLocale(...args);
            if (this.localeInitialized && result) {
                window.location.reload();
            }
            this.localeInitialized = true;
            return result;
        };
        window.i18n.__eventTranslationLocaleWrapped = true;
    }

    initRuntimeIntegration() {
        this.wrapLocaleChanges();
    }
}

window.eventTranslations = new EventTranslationManager();

// The API wrapper localizes responses directly. This hook only wires locale changes.
document.addEventListener('DOMContentLoaded', () => {
    window.eventTranslations.initRuntimeIntegration();
});
