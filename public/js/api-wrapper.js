/**
 * Events Portal API Wrapper
 * Provides a simplified interface to the Dynamics 365 Events API
 * 
 * Note: Config values are loaded from config.js
 */

/**
 * EventsAPI - A wrapper around the Dynamics 365 Events API
 */
class EventsAPI {
    /**
     * Initialize the API with configuration values
     */
    constructor() {
        // Initialize d365events (PublicApi.bundle.js)
        d365events.init(CONFIG.BASE_URL, CONFIG.TOKEN, CONFIG.ORG_ID);
        this.service = d365events.service;
    }

    /**
     * Get all published events
     * @param {string} businessUnitId - Optional business unit ID to filter events
     * @param {string} webappId - Optional webapp ID parameter
     * @returns {Promise<Array>} - Promise resolving to an array of event objects
     */
    async getAllEvents(businessUnitId = null, webappId = null) {
        try {
            // Clear any existing error messages on new requests
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

            // Handle the response and check status
            this.checkResponseStatus(response);
            return response.data || [];
        } catch (error) {
            this.handleError(error, 'errorLoadingEvents');
            return [];
        }
    }

    /**
     * Get a single event by its ID
     * @param {string} eventId - The readable event ID
     * @returns {Promise<Object>} - Promise resolving to an event object
     */
    async getEventById(eventId) {
        try {
            // Clear any existing error messages on new requests
            this.clearError();

            const options = {
                path: {
                    organizationId: CONFIG.ORG_ID,
                    readableEventId: eventId
                }
            };

            const response = await this.service.publicApiGetEvent(options);

            // Handle the response and check status
            this.checkResponseStatus(response);
            return response.data;
        } catch (error) {
            this.handleError(error, 'errorLoadingEventDetails');
            return null;
        }
    }

    /**
     * Check the HTTP response status and throw errors for non-success status codes
     * @private
     * @param {Object} response - The API response object with data, request, and response properties
     * @throws {Error} - Throws error for non-success HTTP status codes
     */
    checkResponseStatus(response) {
        if (!response || !response.response) {
            throw new Error('Invalid response format');
        }

        const { status, statusText } = response.response;

        // Check for HTTP error status codes
        if (status < 200 || status >= 300) {
            const error = new Error(`HTTP ${status}: ${statusText}`);
            error.status = status;
            error.statusText = statusText;
            error.response = response.response;
            throw error;
        }
    }

    /**
     * Handle API errors
     * @private
     * @param {Error} error - The error object
     * @param {string} errorKey - Key for the error message in translations
     */
    handleError(error, errorKey) {
        console.error('API Error:', error);

        // First, clear any existing errors
        this.clearError();

        // Create the error element
        const errorElement = document.createElement('div');
        errorElement.id = 'event-portal-api-error';
        errorElement.setAttribute('role', 'alert');

        const mainElement = document.querySelector('main');
        if (mainElement) {
            // Insert at the top of the main content
            mainElement.insertBefore(errorElement, mainElement.firstChild);
        } else {
            // Fallback to body if no suitable container is found
            document.body.insertBefore(errorElement, document.body.firstChild);
        }

        // Determine error message
        let errorMessage = `${__(errorKey)}`;

        // Add HTTP status information if available
        if (error.status) {
            errorMessage += ` (HTTP ${error.status})`;
        }

        // Set the error message
        errorElement.textContent = errorMessage;
    }

    /**
     * Clear any displayed error messages
     */
    clearError() {
        const errorElement = document.getElementById('event-portal-api-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
}

// Create an instance of the API
const eventsAPI = new EventsAPI();
