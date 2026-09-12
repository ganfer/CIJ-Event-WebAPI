/**
 * Code for the event registration form page
 */

// Config is loaded from config.js
// Localization is handled by localization.js

// DOM elements
const loadingMessage = document.getElementById('event-portal-loading-message');
const formContainer = document.getElementById('event-portal-registration-form-container');

/**
 * Get event ID from URL parameters
 * @returns {string|null} Event ID or null if not found
 */
function getEventIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Add registration form to the page
 * @param {Object} event - Event object from API
 */
function addRegistrationForm(event) {
    if (formContainer && event.registrationForm) {
        // Create a container for the form
        const formWrapper = document.createElement('div');
        formWrapper.className = 'event-portal-registration-form-wrapper';
        formContainer.appendChild(formWrapper);

        try {
            // Extract form data from the registration form HTML string
            const parser = new DOMParser();
            const parsedDoc = parser.parseFromString(event.registrationForm, 'text/html');

            // Find all elements (including div and script tags)
            const formElements = parsedDoc.body.children;

            // Process each element in the form HTML
            for (let i = 0; i < formElements.length; i++) {
                const element = formElements[i];

                if (element.tagName.toLowerCase() === 'script') {
                    // Handle script elements
                    const newScript = document.createElement('script');

                    // Copy all attributes from the original script
                    Array.from(element.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });

                    // Handle inline scripts if present
                    if (element.textContent) {
                        newScript.textContent = element.textContent;
                    }

                    // Append to document to execute
                    document.body.appendChild(newScript);
                } else {
                    // For all other elements, simply clone and append
                    formWrapper.appendChild(element.cloneNode(true));
                }
            }
        } catch (error) {
            // Handle any errors that occur during form processing
            console.error("Error processing registration form:", error);
            formWrapper.innerHTML = `<p>${__('formLoadError')}</p>`;
        }
    } else if (formContainer) {
        // Handle missing form
        formContainer.innerHTML = `<p>${__('formNotAvailable')}</p>`;
    }
}

/**
 * Load event and display registration form
 */
async function loadEventDetails() {
    const eventId = getEventIdFromUrl();

    if (!eventId) {
        // No event ID in URL
        formContainer.innerHTML = `<p class="event-portal-error-message">${__('errorNoEventId')}</p>`;
        loadingMessage.remove();
        return;
    }

    try {
        // Fetch event details from API
        const event = await eventsAPI.getEventById(eventId);

        // Remove loading message
        if (loadingMessage) {
            loadingMessage.remove();
        }

        // Check if we have an event
        if (!event) {
            formContainer.innerHTML = `<p class="event-portal-error-message">${__('eventNotFound')}</p>`;
            return;
        }

        // Update page title - combine event name with localized registration text
        document.title = `${event.eventName} - ${__('eventRegistration')}`;

        // Check if the event is fully booked
        // This is commented out as it doesn't work with current API version
        /*const fullyBooked = event.isCapacityRestricted && event.registrationCount >= event.maxCapacity;

        if (fullyBooked) {
            formContainer.innerHTML = `<p class="event-portal-error-message">${__('eventFullyBooked')}</p>`;
            return;
        }*/

        // Add the registration form from the event data
        addRegistrationForm(event);
    } catch (error) {
        // Handle any errors that occur during API call
        console.error('Failed to load event details:', error);
        formContainer.innerHTML = `<p class="event-portal-error-message">${__('formLoadError')}</p>`;
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
}

/**
 * Refresh the event registration form
 * Can be used to update the form when language changes
 */
function refreshEventForm() {
    // Handle any necessary updates to the event form
    // This can be used to process the form to reflect the current language, currently the forms do not support localization out of the box
    // Here are some resources that might help:
    // https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/developer/realtime-marketing-form-client-side-extensibility
    // https://community.dynamics.com/blogs/post/?postid=cdcd1dbf-2b7f-ef11-ac20-7c1e521a63a7
}

// Load event details when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Make sure localization is initialized before loading event details
    if (window.i18n) {
        try {
            await i18n.init();
            // Initialize language dropdown after localization is ready, pass refresh callback
            // The dropdown is for now hidden by CSS rule, because form localization is not supported out of the box
            i18n.initializeLanguageDropdown(refreshEventForm);
        } catch (error) {
            // Continue with loading event details even if localization fails
            console.error('Failed to initialize localization:', error);
        }
    }

    // Load event details
    loadEventDetails();
});

// Listen for the form load event
document.addEventListener("d365mkt-afterformload", async () => {
    // Refresh the event form after the form is loaded
    refreshEventForm();
});
