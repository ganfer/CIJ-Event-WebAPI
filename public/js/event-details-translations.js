/**
 * Integrates optional event-content translations with the existing details page
 * without changing the Events API wrapper or registration behavior.
 */
(() => {
    if (typeof eventsAPI === 'undefined' || !window.eventTranslations) return;

    const originalGetEventById = eventsAPI.getEventById.bind(eventsAPI);
    let sourceEvent = null;

    eventsAPI.getEventById = async eventId => {
        sourceEvent = await originalGetEventById(eventId);
        if (!sourceEvent) return sourceEvent;
        return eventTranslations.localize(sourceEvent, window.i18n?.currentLocale);
    };

    if (window.i18n?.initializeLanguageDropdown) {
        const originalInitialize = i18n.initializeLanguageDropdown.bind(i18n);
        i18n.initializeLanguageDropdown = onLanguageChange => {
            originalInitialize(async () => {
                if (typeof onLanguageChange === 'function') await onLanguageChange();
                if (!sourceEvent || typeof window.renderEvent !== 'function') return;
                const localizedEvent = await eventTranslations.localize(sourceEvent, i18n.currentLocale);
                window.renderEvent(localizedEvent);
            });
        };
    }
})();
