/**
 * Makes the existing event grid consume localized event copies while keeping
 * the Microsoft Events API response as the fallback source of truth.
 */
(() => {
    if (typeof eventsAPI === 'undefined' || !window.eventTranslations) return;

    const originalGetAllEvents = eventsAPI.getAllEvents.bind(eventsAPI);
    eventsAPI.getAllEvents = async (...args) => {
        const events = await originalGetAllEvents(...args);
        return eventTranslations.localizeAll(events, window.i18n?.currentLocale);
    };
})();
