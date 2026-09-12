/**
 * Localization Manager for the Event Portal
 * Handles loading and applying translations based on user locale
 */

class LocalizationManager {
    /**
     * Initialize the localization manager
     */
    constructor() {
        // Store translations for current locale
        this.translations = {};

        // Default locale
        this.defaultLocale = 'en-US';

        // Current locale (will be set during initialization)
        this.currentLocale = this.defaultLocale;

        // Path to localization files
        this.localesPath = 'locales/';

        // Cache for loaded translations
        this.translationCache = {};

        // List of supported localizations
        this.supportedLocales = [
            'ar-SA', 'bg-BG', 'ca-ES', 'cs-CZ', 'da-DK',
            'de-DE', 'el-GR', 'en-AU', 'en-CA', 'en-GB',
            'en-US', 'es-ES', 'et-EE', 'eu-ES', 'fi-FI',
            'fr-CA', 'fr-FR', 'gl-ES', 'he-IL', 'hr-HR',
            'hu-HU', 'id-ID', 'it-IT', 'ja-JP', 'ko-KR',
            'lt-LT', 'lv-LV', 'nb-NO', 'nl-NL', 'pl-PL',
            'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sk-SK',
            'sl-SI', 'sr-Cyrl-CS', 'sr-Latn-CS', 'sv-SE',
            'th-TH', 'tr-TR', 'uk-UA', 'vi-VN', 'zh-CN',
            'zh-HK', 'zh-TW'
        ];

        // List of RTL locales that need right-to-left text direction
        this.rtlLocales = ['ar-SA', 'he-IL'];

        // Language change handler
        this.languageChangeHandler = null;
    }

    /**
     * Initialize the localization manager
     * @returns {Promise} - Promise that resolves when translations are loaded
     */
    async init() {
        try {
            // Detect browser language or get from localStorage
            const savedLocale = localStorage.getItem('userLocale');
            const browserLang = navigator.language || navigator.userLanguage;
            const detectedLocale = savedLocale || browserLang || this.defaultLocale;

            // Load translations for the detected locale
            await this.setLocale(detectedLocale);

            return true;
        } catch (error) {
            console.error('Failed to initialize localization:', error);
            // Fallback to default locale
            return this.setLocale(this.defaultLocale);
        }
    }

    /**
     * Set the current locale and load translations
     * @param {string} locale - The locale to set (e.g., 'en-US')
     * @returns {Promise} - Promise that resolves when translations are loaded
     */
    async setLocale(locale) {
        try {
            // Normalize locale to match our file naming
            const normalizedLocale = this.normalizeLocale(locale);

            // Load translations for the locale
            await this.loadTranslations(normalizedLocale);

            // Update current locale
            this.currentLocale = normalizedLocale;

            // Store user preference
            localStorage.setItem('userLocale', normalizedLocale);

            // Apply translations to the page
            this.translatePage();

            // Handle RTL languages if needed
            this.handleTextDirection();

            return true;
        } catch (error) {
            console.error(`Failed to set locale to ${locale}:`, error);

            // If the requested locale failed and it's not the default, try the default
            if (locale !== this.defaultLocale) {
                console.warn(`Falling back to default locale: ${this.defaultLocale}`);
                return this.setLocale(this.defaultLocale);
            }

            return false;
        }
    }

    /**
     * Normalize locale string to match our file naming convention
     * @param {string} locale - The locale string to normalize
     * @returns {string} - Normalized locale string
     */
    normalizeLocale(locale) {
        // Handle different formats (en-us, en_US, en)
        let normalized = locale.replace('_', '-');

        // Extract language and country/region parts
        const parts = normalized.split('-');

        if (parts.length === 1) {
            // Only language code provided (e.g., 'en')
            // Find the first supported locale that matches the language
            const languageCode = parts[0].toLowerCase();
            const matchingLocale = this.supportedLocales.find(
                supportedLocale => supportedLocale.toLowerCase().startsWith(languageCode + '-')
            );

            return matchingLocale || this.defaultLocale;
        } else if (parts.length >= 2) {
            // Both language and country/region provided
            const formattedLocale = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;

            // Check if this locale is in our supported list
            if (this.supportedLocales.includes(formattedLocale)) {
                return formattedLocale;
            }

            // If not found, try to find any locale with matching language
            const languageCode = parts[0].toLowerCase();
            const matchingLocale = this.supportedLocales.find(
                supportedLocale => supportedLocale.toLowerCase().startsWith(languageCode + '-')
            );

            return matchingLocale || this.defaultLocale;
        }

        // Fallback
        return this.defaultLocale;
    }

    /**
     * Load translations for a specific locale
     * @param {string} locale - The locale to load translations for
     * @returns {Promise} - Promise that resolves when translations are loaded
     */
    async loadTranslations(locale) {
        try {
            // Check cache first
            if (this.translationCache[locale]) {
                this.translations = this.translationCache[locale];
                return this.translations;
            }

            // Construct the URL for the translation file
            const translationUrl = `${this.localesPath}translation.${locale}.json`;
            console.log(`Attempting to load translation from: ${translationUrl}`);

            // Fetch the translation file
            const response = await fetch(translationUrl);

            if (!response.ok) {
                const errorMsg = `Failed to load translations for ${locale}: ${response.status} ${response.statusText}`;
                console.warn(errorMsg);
                throw new Error(errorMsg);
            }

            // Parse the translation file
            try {
                const translations = await response.json();

                // Filter out comment keys (those starting with '_')
                const filteredTranslations = Object.entries(translations)
                    .filter(([key]) => !key.startsWith('_'))
                    .reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {});

                // Store in cache and current translations
                this.translationCache[locale] = filteredTranslations;
                this.translations = filteredTranslations;
                console.log(`Successfully loaded translations for ${locale}`);

                return this.translations;
            } catch (parseError) {
                throw new Error(`Error parsing translation file for ${locale}: ${parseError.message}`);
            }
        } catch (error) {
            console.error(`Error loading translations for ${locale}:`, error);

            // If failed with a locale other than default, try to load default
            if (locale !== this.defaultLocale) {
                console.warn(`Falling back to default locale: ${this.defaultLocale}`);
                return this.loadTranslations(this.defaultLocale);
            }

            // If the default locale fails, use an empty object
            console.error(`Failed to load default translations. Using empty translations object.`);
            this.translations = {};
            return this.translations;
        }
    }

    /**
     * Translate a string using the current translations
     * @param {string} key - The translation key
     * @param {Object} params - Parameters to replace in the translation
     * @returns {string} - The translated string
     */
    translate(key, params = {}) {
        // Get the translation for the key, or use the key itself if not found
        let text = this.translations[key] || key;

        // Replace parameters in the text if any (format: {{paramName}})
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                const placeholder = new RegExp(`{{${param}}}`, 'g');
                text = text.replace(placeholder, params[param]);
            });
        }

        return text;
    }

    /**
     * Translate all elements with localization attributes on the page
     */
    translatePage() {
        // First handle text content translations using data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                // Set the text content only if the element doesn't have specific attribute handling
                if (!(element.hasAttribute('placeholder') ||
                    (element.tagName === 'IMG' && element.hasAttribute('alt')) ||
                    (element.tagName === 'META' && element.hasAttribute('content')))) {
                    element.textContent = this.translate(key);
                }
            }
        });

        // Handle attribute translations including elements with data-i18n-attrs
        document.querySelectorAll('[data-i18n-attrs]').forEach(element => {
            const attributesToTranslate = element.getAttribute('data-i18n-attrs');
            if (attributesToTranslate) {
                attributesToTranslate.split(',').forEach(attr => {
                    const attrName = attr.trim();
                    const attrKey = element.getAttribute(`data-i18n-${attrName}`);
                    if (attrKey) {
                        element.setAttribute(attrName, this.translate(attrKey));
                    }
                });
            }
        });

        // Find elements with specific attribute handling (without needing data-i18n-attrs)
        document.querySelectorAll('[data-i18n][placeholder], [data-i18n][alt], [data-i18n][content], [data-i18n][title]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                // Handle special cases
                if (element.hasAttribute('placeholder')) {
                    element.setAttribute('placeholder', this.translate(key));
                }
                if (element.tagName === 'IMG' && element.hasAttribute('alt')) {
                    element.setAttribute('alt', this.translate(key));
                }
                if (element.tagName === 'META' && element.hasAttribute('content')) {
                    element.setAttribute('content', this.translate(key));
                }
                if (element.hasAttribute('title')) {
                    element.setAttribute('title', this.translate(key));
                }
            }
        });

        // Handle elements that have specific data-i18n-* attributes without having data-i18n or data-i18n-attrs
        document.querySelectorAll('[data-i18n-placeholder], [data-i18n-alt], [data-i18n-title], [data-i18n-content]').forEach(element => {
            // Check for each specific data-i18n-* attribute
            const attrs = ['placeholder', 'alt', 'title', 'content'];

            attrs.forEach(attr => {
                const attrKey = element.getAttribute(`data-i18n-${attr}`);
                if (attrKey && !element.hasAttribute('data-i18n-attrs')) {
                    // Only translate if not already handled by data-i18n-attrs
                    element.setAttribute(attr, this.translate(attrKey));
                }
            });
        });
    }

    /**
     * Handle text direction for RTL languages
     */
    handleTextDirection() {
        // Check if current locale is RTL using the rtlLocales array from constructor
        const isRtl = this.rtlLocales.includes(this.currentLocale);

        // Set the dir attribute on the html element
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

        // Add/remove RTL class for additional styling
        if (isRtl) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }

    /**
     * Format a date according to the current locale
     * @param {Date} date - The date to format
     * @param {Object} options - Formatting options for Intl.DateTimeFormat
     * @returns {string} - The formatted date
     */
    formatDate(date, options = {}) {
        return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
    }

    /**
     * Get the list of supported locales with their display names
     * @returns {Array} - Array of objects with code and name properties
     */
    getSupportedLocales() {
        return this.supportedLocales.map(localeCode => {
            // Get the display name of the locale in its own language
            let displayName;
            try {
                // Try to get the name of the locale in its own language
                displayName = new Intl.DisplayNames([localeCode], { type: 'language' })
                    .of(localeCode.split('-')[0]);

                // Capitalize first letter
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                // Add the region name if available
                const region = localeCode.split('-')[1];
                if (region) {
                    try {
                        const regionName = new Intl.DisplayNames([localeCode], { type: 'region' })
                            .of(region);
                        displayName = `${displayName} (${regionName})`;
                    } catch (e) {
                        // If region display fails, just use the code
                        displayName = `${displayName} (${region})`;
                    }
                }
            } catch (e) {
                // Fallback if Intl.DisplayNames is not supported
                displayName = localeCode;
            }

            return {
                code: localeCode,
                name: displayName
            };
        });
    }

    /**
     * Initialize and populate the language dropdown
     * @param {Function} onLanguageChange - Optional callback function to call when language changes
     */
    initializeLanguageDropdown(onLanguageChange = null) {
        const languageSelect = document.getElementById('event-portal-language-select');
        if (!languageSelect) {
            return; // Language dropdown not present on this page
        }

        // Clear existing options
        languageSelect.innerHTML = '';

        // Populate with supported languages
        this.supportedLocales.forEach(locale => {
            const option = document.createElement('option');
            option.value = locale;
            option.textContent = this.translate(`lang_${locale}`) || locale;
            
            // Mark current language as selected
            if (locale === this.currentLocale) {
                option.selected = true;
            }
            
            languageSelect.appendChild(option);
        });

        // Remove any existing event listener to prevent duplicates
        if (this.languageChangeHandler != null) {
            languageSelect.removeEventListener('change', this.languageChangeHandler);
        }

        // Define the event handler
        this.languageChangeHandler = async (event) => {
            const selectedLocale = event.target.value;
            if (selectedLocale !== this.currentLocale) {
                await this.setLocale(selectedLocale);
                // Re-populate dropdown with updated translations
                this.initializeLanguageDropdown(onLanguageChange);
                
                // Call the callback function if provided
                if (onLanguageChange && typeof onLanguageChange === 'function') {
                    onLanguageChange();
                }
            }
        };

        // Add event listener for language changes
        languageSelect.addEventListener('change', this.languageChangeHandler);
    }
}

// Create a global instance of the localization manager
const i18n = new LocalizationManager();

// Export a translation function for easy access
window.__ = (key, params) => i18n.translate(key, params);

// Export the manager itself
window.i18n = i18n;
