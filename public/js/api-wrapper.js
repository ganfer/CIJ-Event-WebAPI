/**
 * Events Portal API Wrapper
 * Provides a simplified interface to the Dynamics 365 Events API.
 *
 * Note: Config values are loaded from config.js.
 */

/**
 * EventsAPI - A wrapper around the Dynamics 365 Events API
 */
class EventsAPI {
    /**
     * Initialize the API with configuration values.
     */
    constructor() {
        d365events.init(CONFIG.BASE_URL, CONFIG.TOKEN, CONFIG.ORG_ID);
        this.service = d365events.service;
    }

    /**
     * Get all published events.
     * @param {string|null} businessUnitId - Optional business unit ID to filter events.
     * @param {string|null} webappId - Optional webapp ID parameter.
     * @returns {Promise<Array>} Promise resolving to an array of event objects.
     */
    async getAllEvents(businessUnitId = null, webappId = null) {
        try {
            this.clearError();

            const options = {
                path: {
                    organizationId: CONFIG.ORG_ID
                },
                query: {}
            };

            if (businessUnitId) {
                options.query.businessUnitId = businessUnitId;
            }

            if (webappId) {
                options.query.webappId = webappId;
            }

            const response = await this.service.publicApiGetEvents(options);
            this.checkResponseStatus(response);
            return response.data || [];
        } catch (error) {
            this.handleError(error, 'errorLoadingEvents');
            return [];
        }
    }

    /**
     * Get a single event by its readable event ID.
     * @param {string} eventId - The readable event ID.
     * @returns {Promise<Object|null>} Promise resolving to an event object.
     */
    async getEventById(eventId) {
        try {
            this.clearError();

            const response = await this.service.publicApiGetEvent(this.buildEventOptions(eventId));
            this.checkResponseStatus(response);
            return response.data || null;
        } catch (error) {
            this.handleError(error, 'errorLoadingEventDetails');
            return null;
        }
    }

    /**
     * Get sessions that belong to an event.
     * Optional detail resources fail silently so the core event page remains usable.
     * @param {string} eventId - The readable event ID.
     * @returns {Promise<Array>} Event sessions.
     */
    async getEventSessions(eventId) {
        return this.getOptionalEventCollection('publicApiGetEventSessions', eventId, 'sessions');
    }

    /**
     * Get speakers that belong to an event.
     * Optional detail resources fail silently so the core event page remains usable.
     * @param {string} eventId - The readable event ID.
     * @returns {Promise<Array>} Event speakers.
     */
    async getEventSpeakers(eventId) {
        return this.getOptionalEventCollection('publicApiGetEventSpeakers', eventId, 'speakers');
    }

    /**
     * Build path options shared by event-specific API calls.
     * @private
     * @param {string} eventId - The readable event ID.
     * @returns {Object} Request options.
     */
    buildEventOptions(eventId) {
        return {
            path: {
                organizationId: CONFIG.ORG_ID,
                readableEventId: eventId
            }
        };
    }

    /**
     * Load an optional collection from an event-specific endpoint.
     * @private
     * @param {string} serviceMethod - Method name exposed by PublicApi.bundle.js.
     * @param {string} eventId - The readable event ID.
     * @param {string} resourceName - Friendly resource name for diagnostics.
     * @returns {Promise<Array>} Collection returned by the endpoint.
     */
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

    /**
     * Check the HTTP response status and throw errors for non-success status codes.
     * @private
     * @param {Object} response - The API response object.
     * @throws {Error} Throws for non-success HTTP status codes.
     */
    checkResponseStatus(response) {
        if (!response || !response.response) {
            throw new Error('Invalid response format');
        }

        const { status, statusText } = response.response;

        if (status < 200 || status >= 300) {
            const error = new Error(`HTTP ${status}: ${statusText}`);
            error.status = status;
            error.statusText = statusText;
            error.response = response.response;
            throw error;
        }
    }

    /**
     * Handle API errors.
     * @private
     * @param {Error} error - The error object.
     * @param {string} errorKey - Key for the error message in translations.
     */
    handleError(error, errorKey) {
        console.error('API Error:', error);
        this.clearError();

        const errorElement = document.createElement('div');
        errorElement.id = 'event-portal-api-error';
        errorElement.setAttribute('role', 'alert');

        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.insertBefore(errorElement, mainElement.firstChild);
        } else {
            document.body.insertBefore(errorElement, document.body.firstChild);
        }

        let errorMessage = `${__(errorKey)}`;
        if (error.status) {
            errorMessage += ` (HTTP ${error.status})`;
        }

        errorElement.textContent = errorMessage;
    }

    /**
     * Clear any displayed API error message.
     */
    clearError() {
        const errorElement = document.getElementById('event-portal-api-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
}

const eventsAPI = new EventsAPI();
