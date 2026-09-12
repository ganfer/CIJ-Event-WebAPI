/**
 * Runtime resilience for the event details page.
 *
 * The core event and registration form must never wait for optional
 * sessions/speakers requests. This override is loaded after event-details.js
 * and replaces loadEventDetails before DOMContentLoaded fires.
 */

loadEventDetails = async function loadEventDetailsResilient() {
    const eventId = getEventIdFromUrl();

    if (!eventId) {
        showPageError(window.__ ? __('errorNoEventId') : 'Error: No event ID specified');
        return;
    }

    let event;

    try {
        event = await eventsAPI.getEventById(eventId);
    } catch (error) {
        console.error('Failed to load core event details:', error);
        showPageError(window.__ ? __('errorLoadingEventDetails') : 'Error loading event. Please try again later.');
        return;
    }

    if (!event) {
        showPageError(window.__ ? __('eventNotFound') : 'Event not found');
        return;
    }

    // Render the core page first. Optional resources must not block visibility.
    try {
        renderEvent(event);
    } catch (error) {
        console.error('Failed to render event details:', error);
        showPageError(window.__ ? __('errorLoadingEventDetails') : 'Error loading event. Please try again later.');
        return;
    }

    if (pageLoading) {
        pageLoading.classList.add('hidden');
    }

    if (eventContent) {
        eventContent.classList.remove('hidden');
    }

    // Registration is part of the core event experience, but a form rendering
    // problem should not hide the event page itself.
    try {
        addRegistrationForm(event);
    } catch (error) {
        console.error('Failed to render registration form:', error);
        if (formContainer) {
            formContainer.textContent = window.__ ? __('formLoadError') : 'Error loading the registration form. Please try again later.';
        }
    }

    // Agenda and speakers are enhancements. Load them independently after the
    // page is already usable so a slow or unavailable endpoint cannot leave the
    // visitor stuck on the loading screen.
    Promise.resolve()
        .then(async () => {
            const [sessionsResult, speakersResult] = await Promise.allSettled([
                eventsAPI.getEventSessions(eventId),
                eventsAPI.getEventSpeakers(eventId)
            ]);

            if (sessionsResult.status === 'fulfilled') {
                try {
                    renderSessions(sessionsResult.value);
                } catch (error) {
                    console.warn('Could not render event sessions:', error);
                }
            } else {
                console.warn('Could not load event sessions:', sessionsResult.reason);
            }

            if (speakersResult.status === 'fulfilled') {
                try {
                    renderSpeakers(speakersResult.value);
                } catch (error) {
                    console.warn('Could not render event speakers:', error);
                }
            } else {
                console.warn('Could not load event speakers:', speakersResult.reason);
            }
        })
        .catch(error => {
            console.warn('Optional event details failed:', error);
        });
};
