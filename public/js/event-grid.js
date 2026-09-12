/**
 * Event grid functionality.
 * Displays, filters and sorts published events returned by the Events API.
 */

const eventsContainer = document.getElementById('event-portal-events-container');
const loadingMessage = document.getElementById('event-portal-loading-message');
const searchInput = document.getElementById('event-portal-search-input');
const sortSelect = document.getElementById('event-portal-sort-select');

let allEvents = [];
let currentFilterQuery = '';
let currentSortOption = 'a-z';

/**
 * Format date range for display.
 * @param {Object} event - Event object from API.
 * @returns {string} Formatted date string.
 */
function formatEventDate(event) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return '';
    }

    const dateOptions = { month: 'long', day: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit' };
    const currentLocale = window.i18n ? i18n.currentLocale : navigator.language;

    let startDateFormatted;
    let startTimeFormatted;
    let endDateFormatted;
    let endTimeFormatted;

    if (window.i18n?.formatDate) {
        startDateFormatted = i18n.formatDate(startDate, dateOptions);
        startTimeFormatted = i18n.formatDate(startDate, timeOptions);
        endDateFormatted = i18n.formatDate(endDate, dateOptions);
        endTimeFormatted = i18n.formatDate(endDate, timeOptions);
    } else {
        startDateFormatted = startDate.toLocaleDateString(currentLocale, dateOptions);
        startTimeFormatted = startDate.toLocaleTimeString(currentLocale, timeOptions);
        endDateFormatted = endDate.toLocaleDateString(currentLocale, dateOptions);
        endTimeFormatted = endDate.toLocaleTimeString(currentLocale, timeOptions);
    }

    if (startDate.toDateString() === endDate.toDateString()) {
        if (window.__) {
            return __('singleDateFormat', {
                startDate: startDateFormatted,
                startTime: startTimeFormatted,
                endTimeF: endTimeFormatted,
                timeZoneName: event.timeZoneName || ''
            });
        }
        return `${startDateFormatted} · ${startTimeFormatted} - ${endTimeFormatted} ${event.timeZoneName || ''}`.trim();
    }

    if (window.__) {
        return __('multiDateFormat', {
            startDate: startDateFormatted,
            startTime: startTimeFormatted,
            endDate: endDateFormatted,
            endTime: endTimeFormatted,
            timeZoneName: event.timeZoneName || ''
        });
    }

    return `${startDateFormatted} · ${startTimeFormatted} - ${endDateFormatted} · ${endTimeFormatted} ${event.timeZoneName || ''}`.trim();
}

/**
 * Return a display name from either a string or API model.
 * @param {*} value - API value.
 * @param {string[]} keys - Candidate property names.
 * @returns {string} Display value.
 */
function getDisplayName(value, keys = ['name', 'title']) {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (!value || typeof value !== 'object') {
        return '';
    }

    for (const key of keys) {
        if (typeof value[key] === 'string' && value[key].trim()) {
            return value[key].trim();
        }
    }

    return '';
}

/**
 * Build a compact location label from the event response.
 * @param {Object} event - Event API object.
 * @returns {string} Event location label.
 */
function getEventLocationLabel(event) {
    const building = getDisplayName(event.building, ['name', 'buildingName', 'title']);
    const room = getDisplayName(event.room, ['name', 'roomName', 'title']);
    const direct = getDisplayName(event.location, ['name', 'title']) ||
        getDisplayName(event.eventLocation, ['name', 'title']) ||
        getDisplayName(event.locationName);

    return [...new Set([direct || building, room].filter(Boolean))].join(' · ');
}

/**
 * Convert rich event description markup to compact plain text for cards.
 * @param {string|null} value - Event description.
 * @returns {string} Plain text description.
 */
function toPlainText(value) {
    if (!value) {
        return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(String(value), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Current API version does not reliably expose a registration count, so capacity is not inferred.
 * @returns {boolean} Always false until the API provides reliable capacity data.
 */
function isEventFullyBooked() {
    return false;
}

/**
 * Create an event card.
 * @param {Object} event - Event object from API.
 * @returns {HTMLElement} Event card.
 */
function createEventElement(event) {
    const card = document.createElement('article');
    card.className = 'event-portal-event-card event-portal-event-card-modern';

    const imageUrl = typeof event.image === 'string' && /^https?:\/\//i.test(event.image) ? event.image : '';
    const media = document.createElement('div');
    media.className = 'event-portal-event-card-media';

    if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = event.eventName ? `${event.eventName} event image` : 'Event image';
        image.loading = 'lazy';
        media.appendChild(image);
    } else {
        media.classList.add('event-portal-event-card-media-placeholder');
        const initial = document.createElement('span');
        initial.textContent = (event.eventName || 'E').trim().charAt(0).toUpperCase();
        media.appendChild(initial);
    }

    const details = document.createElement('div');
    details.className = 'event-portal-event-details';

    const name = document.createElement('h2');
    name.className = 'event-portal-event-name';
    name.textContent = event.eventName || 'Event';

    const date = document.createElement('p');
    date.className = 'event-portal-event-date';
    const calendarIcon = document.createElement('span');
    calendarIcon.className = 'event-portal-calendar-icon';
    const calendarImage = document.createElement('img');
    calendarImage.src = 'assets/calendar.svg';
    calendarImage.alt = window.__ ? __('calendar') : 'Calendar';
    calendarIcon.appendChild(calendarImage);
    date.append(calendarIcon, document.createTextNode(formatEventDate(event)));

    details.append(name, date);

    const locationLabel = getEventLocationLabel(event);
    if (locationLabel) {
        const location = document.createElement('p');
        location.className = 'event-portal-event-location';
        location.textContent = locationLabel;
        details.appendChild(location);
    }

    const description = document.createElement('p');
    description.className = 'event-portal-event-description';
    description.textContent = toPlainText(event.description) ||
        (window.__ ? __('noDescriptionAvailable') : 'No description available');
    details.appendChild(description);

    const footer = document.createElement('div');
    footer.className = 'event-portal-event-footer';

    const link = document.createElement('a');
    link.href = `event-details.html?id=${encodeURIComponent(event.readableEventId || '')}`;
    link.className = 'event-portal-event-link';
    link.textContent = window.__ ? __('detailsAndRegistration') : 'Details & Registration';
    footer.appendChild(link);

    if (isEventFullyBooked(event)) {
        const fullyBooked = document.createElement('span');
        fullyBooked.className = 'event-portal-fully-booked';
        fullyBooked.textContent = window.__ ? __('fullyBooked') : 'Fully booked';
        footer.appendChild(fullyBooked);
    }

    details.appendChild(footer);
    card.append(media, details);

    return card;
}

/**
 * Sort events based on selected option.
 * @param {Array} events - Events array to sort.
 * @param {string} sortOption - Sort option.
 * @returns {Array} Sorted events.
 */
function sortEvents(events, sortOption) {
    if (!events || events.length === 0) {
        return [];
    }

    const sortedEvents = [...events];

    switch (sortOption) {
        case 'a-z':
            return sortedEvents.sort((a, b) => (a.eventName || '').localeCompare(b.eventName || ''));
        case 'z-a':
            return sortedEvents.sort((a, b) => (b.eventName || '').localeCompare(a.eventName || ''));
        case 'newest':
            return sortedEvents.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        case 'oldest':
            return sortedEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        default:
            return sortedEvents;
    }
}

/**
 * Filter events and apply the current sort.
 * @param {string} query - Search query.
 */
function filterEvents(query) {
    currentFilterQuery = query ? query.toLowerCase() : '';

    let filteredEvents = allEvents;
    if (currentFilterQuery) {
        filteredEvents = allEvents.filter(event => {
            const name = (event.eventName || '').toLowerCase();
            const description = toPlainText(event.description).toLowerCase();
            const location = getEventLocationLabel(event).toLowerCase();
            return name.includes(currentFilterQuery) ||
                description.includes(currentFilterQuery) ||
                location.includes(currentFilterQuery);
        });
    }

    displayEvents(sortEvents(filteredEvents, currentSortOption));
}

/**
 * Display events in the container.
 * @param {Array} events - Events to display.
 */
function displayEvents(events) {
    eventsContainer.replaceChildren();

    if (!events || events.length === 0) {
        const message = document.createElement('p');
        message.className = 'event-portal-error-message';
        message.textContent = window.__ ? __('noEventsMatchingSearch') : 'No events found matching your search.';
        eventsContainer.appendChild(message);
        return;
    }

    events.forEach(event => eventsContainer.appendChild(createEventElement(event)));
}

/**
 * Load and display all published events.
 */
async function loadEvents() {
    try {
        const webappId = CONFIG.WEBAPP_ID ? CONFIG.WEBAPP_ID : null;
        const events = await eventsAPI.getAllEvents(null, webappId);

        if (loadingMessage) {
            loadingMessage.remove();
        }

        if (!events || events.length === 0) {
            const message = document.createElement('p');
            message.className = 'event-portal-error-message';
            message.textContent = window.__ ? __('noEvents') : 'No events found';
            eventsContainer.replaceChildren(message);
            return;
        }

        allEvents = events;
        displayEvents(sortEvents(events, currentSortOption));

        if (sortSelect) {
            sortSelect.value = currentSortOption;
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        const message = document.createElement('p');
        message.className = 'event-portal-error-message';
        message.textContent = window.__ ? __('errorLoadingEvents') : 'Error loading events. Please try again later.';
        eventsContainer.replaceChildren(message);
    }
}

function refreshEventDisplay() {
    if (allEvents.length > 0) {
        filterEvents(currentFilterQuery);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.i18n) {
        try {
            await i18n.init();
            i18n.initializeLanguageDropdown(refreshEventDisplay);
        } catch (error) {
            console.warn('Localization initialization failed, continuing with default texts', error);
        }
    }

    loadEvents();

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            filterEvents(event.target.value.trim());
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', event => {
            currentSortOption = event.target.value;
            filterEvents(currentFilterQuery);
        });
    }
});
