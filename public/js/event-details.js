/**
 * Event details page.
 * Renders event metadata, sessions, speakers and the registration form from the Events API.
 */

const pageLoading = document.getElementById('event-portal-page-loading');
const pageError = document.getElementById('event-portal-detail-error');
const eventContent = document.getElementById('event-portal-event-content');
const loadingMessage = document.getElementById('event-portal-loading-message');
const formContainer = document.getElementById('event-portal-registration-form-container');

const eventTitle = document.getElementById('event-portal-event-title');
const eventDate = document.getElementById('event-portal-event-date');
const eventLocation = document.getElementById('event-portal-event-location');
const eventDescription = document.getElementById('event-portal-event-description');
const eventImageWrapper = document.getElementById('event-portal-event-image-wrapper');
const eventImage = document.getElementById('event-portal-event-image');

const summaryDate = document.getElementById('event-portal-summary-date');
const summaryLocationRow = document.getElementById('event-portal-summary-location-row');
const summaryLocation = document.getElementById('event-portal-summary-location');
const summaryAddress = document.getElementById('event-portal-summary-address');

const sessionsSection = document.getElementById('event-portal-sessions-section');
const sessionsList = document.getElementById('event-portal-sessions-list');
const speakersSection = document.getElementById('event-portal-speakers-section');
const speakersList = document.getElementById('event-portal-speakers-list');

/**
 * Get event ID from URL parameters.
 * @returns {string|null} Event ID or null if not found.
 */
function getEventIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

/**
 * Format a date through the existing localization helper when available.
 * @param {Date} date - Date to format.
 * @param {Intl.DateTimeFormatOptions} options - Intl formatting options.
 * @returns {string} Localized date string.
 */
function formatDate(date, options) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    if (window.i18n?.formatDate) {
        return i18n.formatDate(date, options);
    }

    return date.toLocaleString(navigator.language, options);
}

/**
 * Format the event date range in a human-readable way.
 * @param {Object} event - Event API object.
 * @returns {string} Formatted date range.
 */
function formatEventDateRange(event) {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return '';
    }

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const startDate = formatDate(start, dateOptions);
    const startTime = formatDate(start, timeOptions);
    const endTime = formatDate(end, timeOptions);
    const timeZone = event.timeZoneName ? ` ${event.timeZoneName}` : '';

    if (start.toDateString() === end.toDateString()) {
        return `${startDate} · ${startTime}–${endTime}${timeZone}`;
    }

    const endDate = formatDate(end, dateOptions);
    return `${startDate} · ${startTime} – ${endDate} · ${endTime}${timeZone}`;
}

/**
 * Return the first useful text property from a value.
 * @param {*} value - String or object from the API.
 * @param {string[]} keys - Candidate object properties.
 * @returns {string} Best matching text.
 */
function pickText(value, keys = []) {
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
 * Build a friendly location from event building/room data.
 * The API shape can differ between versions, so the renderer accepts common field names.
 * @param {Object} event - Event API object.
 * @returns {{name: string, address: string}} Location details.
 */
function getEventLocation(event) {
    const building = event.building;
    const room = event.room;

    const buildingName = pickText(building, ['name', 'buildingName', 'title']);
    const roomName = pickText(room, ['name', 'roomName', 'title']);
    const directLocation = pickText(event.location, ['name', 'title']) ||
        pickText(event.eventLocation, ['name', 'title']) ||
        pickText(event.locationName);

    const nameParts = [directLocation || buildingName, roomName].filter(Boolean);
    const name = [...new Set(nameParts)].join(' · ');

    const addressSource = building && typeof building === 'object' ? building : {};
    const directAddress = pickText(addressSource.address, ['formattedAddress', 'name']) ||
        pickText(addressSource.formattedAddress) ||
        pickText(event.address, ['formattedAddress']);

    if (directAddress) {
        return { name, address: directAddress };
    }

    const addressParts = [
        pickText(addressSource.addressLine1) || pickText(addressSource.street) || pickText(addressSource.streetAddress),
        pickText(addressSource.postalCode) || pickText(addressSource.zipCode),
        pickText(addressSource.city),
        pickText(addressSource.state) || pickText(addressSource.region),
        pickText(addressSource.country)
    ].filter(Boolean);

    return {
        name,
        address: [...new Set(addressParts)].join(', ')
    };
}

/**
 * Create initials for a speaker placeholder.
 * @param {string} name - Speaker name.
 * @returns {string} One or two initials.
 */
function getInitials(name) {
    return String(name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || '?';
}

/**
 * Sanitize and render formatted event copy without executing arbitrary markup.
 * @param {HTMLElement} container - Destination element.
 * @param {string} markup - Event description from the API.
 */
function renderRichText(container, markup) {
    container.replaceChildren();

    if (!markup) {
        const fallback = document.createElement('p');
        fallback.textContent = window.__ ? __('noDescriptionAvailable') : 'No description available';
        container.appendChild(fallback);
        return;
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(markup), 'text/html');
    const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'A']);
    const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON']);
    const elements = Array.from(parsed.body.querySelectorAll('*'));

    elements.forEach(element => {
        if (blockedTags.has(element.tagName)) {
            element.remove();
            return;
        }

        if (!allowedTags.has(element.tagName)) {
            element.replaceWith(...Array.from(element.childNodes));
            return;
        }

        const href = element.tagName === 'A' ? (element.getAttribute('href') || '') : '';
        Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));

        if (element.tagName === 'A' && /^(https?:|mailto:)/i.test(href)) {
            element.setAttribute('href', href);
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
        }
    });

    Array.from(parsed.body.childNodes).forEach(node => container.appendChild(node.cloneNode(true)));
}

/**
 * Render high-level event metadata.
 * @param {Object} event - Event API object.
 */
function renderEvent(event) {
    const dateRange = formatEventDateRange(event);
    const location = getEventLocation(event);

    eventTitle.textContent = event.eventName || 'Event';
    eventDate.textContent = dateRange;
    summaryDate.textContent = dateRange;
    renderRichText(eventDescription, event.description);

    if (location.name || location.address) {
        const locationText = location.name || location.address;
        eventLocation.textContent = locationText;
        eventLocation.classList.remove('hidden');
        summaryLocation.textContent = locationText;
        summaryLocationRow.classList.remove('hidden');

        if (location.address && location.address !== locationText) {
            summaryAddress.textContent = location.address;
            summaryAddress.classList.remove('hidden');
        }
    }

    if (event.image && /^https?:\/\//i.test(event.image)) {
        eventImage.src = event.image;
        eventImage.alt = event.eventName ? `${event.eventName} event image` : 'Event image';
        eventImageWrapper.classList.remove('hidden');
    }

    document.title = `${event.eventName || 'Event'} - ${window.__ ? __('eventRegistration') : 'Event Registration'}`;
}

/**
 * Render sessions from the event API.
 * @param {Array} sessions - Event sessions.
 */
function renderSessions(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
        return;
    }

    sessionsList.replaceChildren();

    [...sessions]
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .forEach(session => {
            const card = document.createElement('article');
            card.className = 'event-portal-session-card';

            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const time = document.createElement('div');
            time.className = 'event-portal-session-time';

            if (!Number.isNaN(start.getTime())) {
                const startTime = formatDate(start, { hour: '2-digit', minute: '2-digit' });
                const endTime = !Number.isNaN(end.getTime()) ? formatDate(end, { hour: '2-digit', minute: '2-digit' }) : '';
                time.textContent = endTime ? `${startTime}–${endTime}` : startTime;
            }

            const body = document.createElement('div');
            body.className = 'event-portal-session-body';

            const name = document.createElement('h3');
            name.textContent = session.name || 'Session';
            body.appendChild(name);

            const summary = session.sessionSummary || session.detailedDescription || session.sessionObjectives;
            if (summary) {
                const copy = document.createElement('p');
                copy.textContent = String(summary).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                body.appendChild(copy);
            }

            if (Array.isArray(session.speakers) && session.speakers.length > 0) {
                const speakerNames = session.speakers.map(speaker => speaker.name).filter(Boolean);
                if (speakerNames.length > 0) {
                    const speakers = document.createElement('p');
                    speakers.className = 'event-portal-session-speakers';
                    speakers.textContent = speakerNames.join(' · ');
                    body.appendChild(speakers);
                }
            }

            card.append(time, body);
            sessionsList.appendChild(card);
        });

    sessionsSection.classList.remove('hidden');
}

/**
 * Render event speakers from the event API.
 * @param {Array} speakers - Event speakers.
 */
function renderSpeakers(speakers) {
    if (!Array.isArray(speakers) || speakers.length === 0) {
        return;
    }

    speakersList.replaceChildren();

    speakers.forEach(speaker => {
        const card = document.createElement('article');
        card.className = 'event-portal-speaker-card';

        const visual = document.createElement('div');
        visual.className = 'event-portal-speaker-visual';

        const imageUrl = speaker.imageUrl || speaker.image;
        if (typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl)) {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = speaker.name ? `${speaker.name}` : 'Speaker';
            image.loading = 'lazy';
            visual.appendChild(image);
        } else {
            visual.textContent = getInitials(speaker.name);
        }

        const content = document.createElement('div');
        content.className = 'event-portal-speaker-content';

        const name = document.createElement('h3');
        name.textContent = speaker.name || 'Speaker';
        content.appendChild(name);

        if (speaker.title) {
            const title = document.createElement('p');
            title.className = 'event-portal-speaker-title';
            title.textContent = speaker.title;
            content.appendChild(title);
        }

        if (speaker.about) {
            const about = document.createElement('p');
            about.textContent = String(speaker.about).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            content.appendChild(about);
        }

        card.append(visual, content);
        speakersList.appendChild(card);
    });

    speakersSection.classList.remove('hidden');
}

/**
 * Add the registration form returned by the event API.
 * @param {Object} event - Event object from API.
 */
function addRegistrationForm(event) {
    if (!formContainer) {
        return;
    }

    if (!event.registrationForm) {
        formContainer.innerHTML = `<p class="event-portal-form-notice">${window.__ ? __('formNotAvailable') : 'Registration form is not available for this event.'}</p>`;
        return;
    }

    const formWrapper = document.createElement('div');
    formWrapper.className = 'event-portal-registration-form-wrapper';
    formContainer.replaceChildren(formWrapper);

    try {
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(event.registrationForm, 'text/html');
        const formElements = Array.from(parsedDoc.body.children);

        formElements.forEach(element => {
            if (element.tagName.toLowerCase() === 'script') {
                const newScript = document.createElement('script');
                Array.from(element.attributes).forEach(attribute => {
                    newScript.setAttribute(attribute.name, attribute.value);
                });

                if (element.textContent) {
                    newScript.textContent = element.textContent;
                }

                document.body.appendChild(newScript);
                return;
            }

            formWrapper.appendChild(element.cloneNode(true));
        });
    } catch (error) {
        console.error('Error processing registration form:', error);
        formWrapper.textContent = window.__ ? __('formLoadError') : 'Error loading the registration form. Please try again later.';
    }
}

/**
 * Show a page-level error and hide the loading state.
 * @param {string} message - Error message.
 */
function showPageError(message) {
    if (pageLoading) {
        pageLoading.classList.add('hidden');
    }

    if (pageError) {
        pageError.textContent = message;
        pageError.classList.remove('hidden');
    }
}

/**
 * Load and render event data.
 */
async function loadEventDetails() {
    const eventId = getEventIdFromUrl();

    if (!eventId) {
        showPageError(window.__ ? __('errorNoEventId') : 'Error: No event ID specified');
        return;
    }

    try {
        const event = await eventsAPI.getEventById(eventId);
        if (!event) {
            showPageError(window.__ ? __('eventNotFound') : 'Event not found');
            return;
        }

        renderEvent(event);

        const [sessions, speakers] = await Promise.all([
            eventsAPI.getEventSessions(eventId),
            eventsAPI.getEventSpeakers(eventId)
        ]);

        renderSessions(sessions);
        renderSpeakers(speakers);
        addRegistrationForm(event);

        if (pageLoading) {
            pageLoading.classList.add('hidden');
        }
        eventContent.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load event details:', error);
        showPageError(window.__ ? __('errorLoadingEventDetails') : 'Error loading event. Please try again later.');
    }
}

/**
 * Refresh hook for localization changes.
 * Registration forms themselves are still localized by their own configuration.
 */
function refreshEventForm() {
    // Reserved for future form-specific localization/customization.
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.i18n) {
        try {
            await i18n.init();
            i18n.initializeLanguageDropdown(refreshEventForm);
        } catch (error) {
            console.warn('Failed to initialize localization:', error);
        }
    }

    await loadEventDetails();
});

document.addEventListener('d365mkt-afterformload', refreshEventForm);
