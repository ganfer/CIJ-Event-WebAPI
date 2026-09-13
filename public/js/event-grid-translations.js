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

    // The stock grid keeps its loaded events in module-level state. Reloading after
    // a locale change is the least invasive way to rebuild search/sort data using
    // the newly selected event translation. The selected locale survives in localStorage.
    if (window.i18n?.initializeLanguageDropdown) {
        const originalInitialize = i18n.initializeLanguageDropdown.bind(i18n);
        i18n.initializeLanguageDropdown = onLanguageChange => {
            originalInitialize(async () => {
                if (typeof onLanguageChange === 'function') await onLanguageChange();
                window.location.reload();
            });
        };
    }
})();
