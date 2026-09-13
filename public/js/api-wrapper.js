/**
 * Events Portal API Wrapper
 * Provides a simplified interface to the Dynamics 365 Events API.
 *
 * Note: Config values are loaded from config.js.
 */
class EventsAPI {
    constructor() {
        d365events.init(CONFIG.BASE_URL, CONFIG.TOKEN, CONFIG.ORG_ID);
        this.service = d365events.service;
    }

    async getAllEvents(businessUnitId = null, webappId = null) {
        try {
            this.clearError();
            const options = { path: { organizationId: CONFIG.ORG_ID }, query: {} };
            if (businessUnitId) options.query.businessUnitId = businessUnitId;
            if (webappId) options.query.webappId = webappId;
            const response = await this.service.publicApiGetEvents(options);
            this.checkResponseStatus(response);
            return response.data || [];
        } catch (error) {
            this.handleError(error, 'errorLoadingEvents');
            return [];
        }
    }

    async getEventById(eventId) {
        try {
            this.clearError();
            const response = await this.service.publicApiGetEvent(this.buildEventOptions(eventId));
            this.checkResponseStatus(response);
            const event = response.data || null;
            if (!event || !window.eventTranslations) return event;
            return window.eventTranslations.localize(event);
        } catch (error) {
            this.handleError(error, 'errorLoadingEventDetails');
            return null;
        }
    }

    async getEventSessions(eventId) {
        const sessions = await this.getOptionalEventCollection('publicApiGetEventSessions', eventId, 'sessions');
        return this.localizeEventCollection(eventId, sessions, 'session');
    }

    async getEventSpeakers(eventId) {
        const speakers = await this.getOptionalEventCollection('publicApiGetEventSpeakers', eventId, 'speakers');
        return this.localizeEventCollection(eventId, speakers, 'speaker');
    }

    async localizeEventCollection(eventId, items, type) {
        if (!window.eventTranslations) return items;
        const eventRef = { readableEventId: eventId };
        const translation = await window.eventTranslations.load(eventRef);
        const localized = window.eventTranslations.getLocalizedContent(
            translation,
            window.i18n?.currentLocale || navigator.language || 'en-US'
        );
        return window.eventTranslations.localizeCollection(
            items,
            type === 'session' ? localized?.sessions : localized?.speakers,
            type
        );
    }

    buildEventOptions(eventId) {
        return {
            path: {
                organizationId: CONFIG.ORG_ID,
                readableEventId: eventId
            }
        };
    }

    async getOptionalEventCollection(serviceMethod, eventId, resourceName) {
        try {
            const method = this.service[serviceMethod];
            if (typeof method !== 'function') {
                console.warn(`Events API method ${serviceMethod} is not available.`);
                return [];
            }
            const response = await method(this.buildEventOptions(eventId));
            this.checkResponseStatus(response);
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.warn(`Could not load event ${resourceName}:`, error);
            return [];
        }
    }

    checkResponseStatus(response) {
        if (!response || !response.response) throw new Error('Invalid response format');
        const { status, statusText } = response.response;
        if (status < 200 || status >= 300) {
            const error = new Error(`HTTP ${status}: ${statusText}`);
            error.status = status;
            error.statusText = statusText;
            error.response = response.response;
            throw error;
        }
    }

    handleError(error, errorKey) {
        console.error('API Error:', error);
        this.clearError();
        const errorElement = document.createElement('div');
        errorElement.id = 'event-portal-api-error';
        errorElement.setAttribute('role', 'alert');
        const mainElement = document.querySelector('main');
        if (mainElement) mainElement.insertBefore(errorElement, mainElement.firstChild);
        else document.body.insertBefore(errorElement, document.body.firstChild);
        let errorMessage = `${__(errorKey)}`;
        if (error.status) errorMessage += ` (HTTP ${error.status})`;
        errorElement.textContent = errorMessage;
    }

    clearError() {
        const errorElement = document.getElementById('event-portal-api-error');
        if (errorElement) errorElement.remove();
    }
}

const eventsAPI = new EventsAPI();
