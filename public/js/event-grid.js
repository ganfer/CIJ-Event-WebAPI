/**
 * Event Grid functionality
 * Handles displaying and filtering events in the grid layout
 */

// Config is loaded from config.js
// Localization is handled by localization.js

// DOM elements
const eventsContainer = document.getElementById('event-portal-events-container');
const loadingMessage = document.getElementById('event-portal-loading-message');
const searchInput = document.getElementById('event-portal-search-input');
const sortSelect = document.getElementById('event-portal-sort-select');

// Store all events for filtering and sorting
let allEvents = [];
let currentFilterQuery = '';
let currentSortOption = 'a-z'; // Default sort option

/**
 * Format date range for display
 * @param {Object} event - Event object from API
 * @returns {string} Formatted date string
 */
function formatEventDate(event) {
    // Parse dates
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    // Format options for date
    const dateOptions = {
        month: 'long',
        day: 'numeric'
    };

    // Format options for time
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit'
    };

    // Get current locale from i18n if available, otherwise use browser locale
    const currentLocale = window.i18n ? i18n.currentLocale : navigator.language;

    // Format start date and time using locale
    let startDateFormatted, startTimeFormatted, endDateFormatted, endTimeFormatted;

    if (window.i18n?.formatDate) {
        // Use i18n's formatDate method if available
        startDateFormatted = i18n.formatDate(startDate, dateOptions);
        startTimeFormatted = i18n.formatDate(startDate, timeOptions);
        endDateFormatted = i18n.formatDate(endDate, dateOptions);
        endTimeFormatted = i18n.formatDate(endDate, timeOptions);
    } else {
        // Fallback to browser's locale formatting
        startDateFormatted = startDate.toLocaleDateString(currentLocale, dateOptions);
        startTimeFormatted = startDate.toLocaleTimeString(currentLocale, timeOptions);
        endDateFormatted = endDate.toLocaleDateString(currentLocale, dateOptions);
        endTimeFormatted = endDate.toLocaleTimeString(currentLocale, timeOptions);
    }

    // Check if it's a single-day event
    if (startDate.toDateString() === endDate.toDateString()) {
        if (window.__) {
            return __('singleDateFormat', {
                startDate: startDateFormatted,
                startTime: startTimeFormatted,
                endTimeF: endTimeFormatted,
                timeZoneName: event.timeZoneName
            });
        }
        return `${startDateFormatted} · ${startTimeFormatted} - ${endTimeFormatted} ${event.timeZoneName}`;
    } else {
        // Multi-day event
        if (window.__) {
            return __('multiDateFormat', {
                startDate: startDateFormatted,
                startTime: startTimeFormatted,
                endDate: endDateFormatted,
                endTime: endTimeFormatted,
                timeZoneName: event.timeZoneName
            });
        }
        return `${startDateFormatted} · ${startTimeFormatted} - ${endDateFormatted} · ${endTimeFormatted} ${event.timeZoneName}`;
    }
}

/**
 * Check if an event is fully booked
 * @param {Object} event - Event object from API
 * @returns {boolean} True if event is fully booked
 */
function isEventFullyBooked(event) {
    //return event.isCapacityRestricted && event.registrationCount >= event.maxCapacity;
    return false; // This does not work in the current version of the API, so we will not check it for now
}

/**
 * Create an event element to display in the DOM
 * @param {Object} event - Event object from API
 * @returns {HTMLElement} Event element
 */
function createEventElement(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'event-portal-event-card';

    // Format date for display like "October 26 · 10am - October 27 · 5pm CEST"
    const dateDisplay = formatEventDate(event);

    // Check if fully booked
    const fullyBooked = isEventFullyBooked(event);

    // Get localized strings using the translation function if available
    const noDescriptionText = window.__ ? __('noDescriptionAvailable') : 'No description available';
    const detailsText = window.__ ? __('detailsAndRegistration') : 'Details & Registration';
    const fullyBookedText = window.__ ? __('fullyBooked') : 'Fully booked';
    const calendarAlt = window.__ ? __('calendar') : 'Calendar';

    // Create content for the event with the calendar icon for date
    eventElement.innerHTML = `
        <div class="event-portal-event-details">
            <h2 class="event-portal-event-name">${event.eventName}</h2>
            <p class="event-portal-event-date">
                <span class="event-portal-calendar-icon">
                    <img src="assets/calendar.svg" alt="${calendarAlt}">
                </span>
                ${dateDisplay}
            </p>
            <p class="event-portal-event-description">${event.description || noDescriptionText}</p>
            <div class="event-portal-event-footer">
                <a href="event-details.html?id=${event.readableEventId}" class="event-portal-event-link">
                    ${detailsText}
                </a>
                ${fullyBooked ? `<span class="event-portal-fully-booked">${fullyBookedText}</span>` : ''}
            </div>
        </div>
    `;

    return eventElement;
}

/**
 * Sort events based on selected sort option
 * @param {Array} events - Events array to sort
 * @param {string} sortOption - Sort option (a-z, z-a, newest, oldest)
 * @returns {Array} - Sorted events array
 */
function sortEvents(events, sortOption) {
    if (!events || events.length === 0) return [];

    const sortedEvents = [...events]; // Create a copy to avoid mutating original array

    switch (sortOption) {
        case 'a-z':
            return sortedEvents.sort((a, b) => a.eventName.localeCompare(b.eventName));
        case 'z-a':
            return sortedEvents.sort((a, b) => b.eventName.localeCompare(a.eventName));
        case 'newest':
            return sortedEvents.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        case 'oldest':
            return sortedEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        default:
            return sortedEvents;
    }
}

/**
 * Filter events based on search input and apply current sort
 * @param {string} query - Search query
 */
function filterEvents(query) {
    // Store current filter query
    currentFilterQuery = query ? query.toLowerCase() : '';

    // Filter events by name or description
    let filteredEvents = allEvents;

    if (currentFilterQuery) {
        filteredEvents = allEvents.filter(event => {
            return event.eventName.toLowerCase().includes(currentFilterQuery) ||
                (event.description && event.description.toLowerCase().includes(currentFilterQuery));
        });
    }

    // Apply current sort to the filtered results
    const sortedEvents = sortEvents(filteredEvents, currentSortOption);

    // Display the filtered and sorted events
    displayEvents(sortedEvents);
}

/**
 * Display events in the container
 * @param {Array} events - Events to display
 */
function displayEvents(events) {
    // Clear current events
    eventsContainer.innerHTML = '';

    if (!events || events.length === 0) {
        const noMatchMsg = window.__ ? __('noEventsMatchingSearch') : 'No events found matching your search.';
        eventsContainer.innerHTML = `<p class="event-portal-error-message">${noMatchMsg}</p>`;
        return;
    }

    // Display events
    events.forEach(event => {
        eventsContainer.appendChild(createEventElement(event));
    });
}

/**
 * Load and display all events
 */
async function loadEvents() {
    try {
        // Fetch events from API with optional webapp ID
        const webappId = CONFIG.WEBAPP_ID ? CONFIG.WEBAPP_ID : null;
        const events = await eventsAPI.getAllEvents(null, webappId);

        // Remove loading message
        if (loadingMessage) {
            loadingMessage.remove();
        }

        // Check if we have events
        if (!events || events.length === 0) {
            const noEventsMsg = window.__ ? __('noEvents') : 'No events found';
            eventsContainer.innerHTML = `<p class="event-portal-error-message">${noEventsMsg}</p>`;
            return;
        }

        // Store all events for filtering
        allEvents = events;

        // Apply the default sort
        const sortedEvents = sortEvents(events, currentSortOption);

        // Display events
        displayEvents(sortedEvents);

        // Set the default sort option in the dropdown
        if (sortSelect) {
            sortSelect.value = currentSortOption;
        }
    } catch (error) {
        // Handle any errors during event loading
        console.error('Failed to load events:', error);
        const errorMsg = window.__ ? __('errorLoadingEvents') : 'Error loading events. Please try again later.';
        eventsContainer.innerHTML = `<p class="event-portal-error-message">${errorMsg}</p>`;
    }
}

/**
 * Refresh the event display with current filters and sorting
 * Used when language changes to update JavaScript-generated content
 */
function refreshEventDisplay() {
    if (allEvents.length > 0) {
        // Re-apply current filter and sort
        filterEvents(currentFilterQuery);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for localization to initialize if it exists
    if (window.i18n) {
        try {
            await i18n.init();
            // Initialize language dropdown after localization is ready, pass refresh callback
            i18n.initializeLanguageDropdown(refreshEventDisplay);
        } catch (error) {
            // Continue with loading events even if localization fails
            console.warn('Localization initialization failed, continuing with default texts', error);
        }
    }

    // Load all events
    loadEvents();

    // Set up search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterEvents(e.target.value.trim());
        });
    }

    // Set up sort functionality
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            // Store the selected sort option
            currentSortOption = e.target.value;

            // Re-apply the current filter with the new sort option
            filterEvents(currentFilterQuery);
        });
    }
});

