/**
 * Optional localized content overrides for individual events.
 *
 * UI translations continue to live in /locales/translation.<locale>.json.
 * Event-specific content lives in /translations/events/<event-key>.json.
 * Missing files, locales, or fields always fall back to the Events API.
 */
class EventTranslationManager {
    constructor() {
        this.basePath = 'translations/events/';
        this.cache = new Map();
    }

    getEventKey(event) {
        const candidates = [
            event?.readableEventId,
            event?.eventId,
            event?.id,
            event?.eventID
        ];
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

    async localize(event, locale = window.i18n?.currentLocale || navigator.language || 'en-US') {
        const translation = await this.load(event);
        if (!translation) return { ...event };

        let localized = null;
        for (const candidate of this.getLocaleCandidates(locale)) {
            if (translation[candidate] && typeof translation[candidate] === 'object') {
                localized = translation[candidate];
                break;
            }
        }

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

    async localizeAll(events, locale) {
        if (!Array.isArray(events)) return [];
        return Promise.all(events.map(event => this.localize(event, locale)));
    }
}

window.eventTranslations = new EventTranslationManager();
