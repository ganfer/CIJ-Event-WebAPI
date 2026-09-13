/**
 * Thin, browser-only wrapper around the Microsoft Dynamics 365 Events API SDK.
 * It validates configuration and identifiers, bounds request duration and keeps
 * API errors free of token-bearing Request/Response objects.
 */
class EventsApiError extends Error {
    constructor(message, { code = 'EVENTS_API_ERROR', status = null } = {}) {
        super(message);
        this.name = 'EventsApiError';
        this.code = code;
        this.status = status;
    }
}

class EventsAPI {
    constructor(configuration = typeof CONFIG !== 'undefined' ? CONFIG : null, sdk = typeof d365events !== 'undefined' ? d365events : null) {
        this.configuration = configuration;
        this.service = null;
        this.requestTimeoutMs = 15000;
        this.configurationError = this.validateConfiguration(configuration, sdk);

        if (!this.configurationError) {
            sdk.init(configuration.BASE_URL, configuration.TOKEN, configuration.ORG_ID);
            this.service = sdk.service;
        }
    }

    validateConfiguration(configuration, sdk) {
        if (!configuration || !sdk || typeof sdk.init !== 'function') {
            return new EventsApiError('Events API configuration is unavailable.', { code: 'CONFIGURATION_ERROR' });
        }

        if (!window.EventPortalSecurity?.isAllowedEventsApiBaseUrl(configuration.BASE_URL)) {
            return new EventsApiError('Events API base URL must be an HTTPS Microsoft Dynamics endpoint.', { code: 'CONFIGURATION_ERROR' });
        }

        const organizationId = window.EventPortalSecurity.normalizeOpaqueId(configuration.ORG_ID);
        const token = window.EventPortalSecurity.normalizeOpaqueId(configuration.TOKEN);
        if (!organizationId || !token) {
            return new EventsApiError('Events API organization ID and token are required.', { code: 'CONFIGURATION_ERROR' });
        }

        return null;
    }

    ensureReady() {
        if (this.configurationError) throw this.configurationError;
        if (!this.service) {
            throw new EventsApiError('Events API service is unavailable.', { code: 'CONFIGURATION_ERROR' });
        }
    }

    createRequestSignal() {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            return { signal: AbortSignal.timeout(this.requestTimeoutMs), cleanup: () => {} };
        }

        if (typeof AbortController !== 'undefined') {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
            return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
        }

        return { signal: undefined, cleanup: () => {} };
    }

    async request(serviceMethod, options) {
        this.ensureReady();
        const method = this.service[serviceMethod];
        if (typeof method !== 'function') {
            throw new EventsApiError('Requested Events API operation is unavailable.', { code: 'UNSUPPORTED_OPERATION' });
        }

        const { signal, cleanup } = this.createRequestSignal();
        try {
            const response = await method({ ...options, ...(signal ? { signal } : {}) });
            this.checkResponseStatus(response);
            return response;
        } catch (error) {
            if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
                throw new EventsApiError('Events API request timed out.', { code: 'TIMEOUT' });
            }
            if (error instanceof EventsApiError) throw error;
            throw new EventsApiError('Events API request failed.', { code: 'NETWORK_ERROR' });
        } finally {
            cleanup();
        }
    }

    async getAllEvents(businessUnitId = null, webappId = null) {
        const options = { path: { organizationId: this.configuration?.ORG_ID }, query: {} };
        if (businessUnitId) options.query.businessUnitId = businessUnitId;
        if (webappId) options.query.webappId = webappId;

        const response = await this.request('publicApiGetEvents', options);
        if (!Array.isArray(response.data)) {
            throw new EventsApiError('Events API returned an invalid event list.', { code: 'INVALID_RESPONSE' });
        }

        if (!window.eventTranslations) return response.data;
        return window.eventTranslations.localizeAll(
            response.data,
            window.i18n?.currentLocale || navigator.language || 'en-US'
        );
    }

    async getEventById(eventId) {
        const normalizedEventId = window.EventPortalSecurity?.normalizeEventId(eventId) || '';
        if (!normalizedEventId) {
            throw new EventsApiError('A valid event ID is required.', { code: 'INVALID_EVENT_ID', status: 400 });
        }

        const response = await this.request('publicApiGetEvent', this.buildEventOptions(normalizedEventId));
        const event = response.data && typeof response.data === 'object' && !Array.isArray(response.data)
            ? response.data
            : null;
        if (!event) {
            throw new EventsApiError('Events API returned invalid event details.', { code: 'INVALID_RESPONSE' });
        }

        if (!window.eventTranslations) return event;
        return window.eventTranslations.localize(event);
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
        const translation = await window.eventTranslations.load({ readableEventId: eventId });
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
        const normalizedEventId = window.EventPortalSecurity?.normalizeEventId(eventId) || '';
        if (!normalizedEventId) {
            throw new EventsApiError('A valid event ID is required.', { code: 'INVALID_EVENT_ID', status: 400 });
        }

        return {
            path: {
                organizationId: this.configuration?.ORG_ID,
                readableEventId: normalizedEventId
            }
        };
    }

    async getOptionalEventCollection(serviceMethod, eventId, resourceName) {
        try {
            const response = await this.request(serviceMethod, this.buildEventOptions(eventId));
            if (!Array.isArray(response.data)) {
                throw new EventsApiError(`Events API returned invalid ${resourceName}.`, { code: 'INVALID_RESPONSE' });
            }
            return response.data;
        } catch (error) {
            this.logFailure(`optional_${resourceName}`, error);
            return [];
        }
    }

    checkResponseStatus(response) {
        if (!response || !response.response) {
            throw new EventsApiError('Events API returned an invalid response.', { code: 'INVALID_RESPONSE' });
        }

        const status = Number(response.response.status);
        if (!Number.isInteger(status) || status < 200 || status >= 300) {
            throw new EventsApiError('Events API returned an error response.', {
                code: 'HTTP_ERROR',
                status: Number.isInteger(status) ? status : null
            });
        }
    }

    logFailure(operation, error) {
        const diagnostic = {
            operation,
            code: error?.code || 'EVENTS_API_ERROR',
            status: Number.isInteger(error?.status) ? error.status : undefined
        };
        console.warn('Events API operation failed.', diagnostic);
    }
}

const eventsAPI = new EventsAPI();
