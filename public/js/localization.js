/**
 * Localization Manager for the Event Portal
 * Handles loading and applying translations based on user locale
 */

class LocalizationManager {
    constructor() {
        this.translations = {};
        this.defaultLocale = 'en-US';
        this.currentLocale = this.defaultLocale;
        this.localesPath = 'locales/';
        this.translationCache = {};
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
        this.rtlLocales = ['ar-SA', 'he-IL'];
        this.languageChangeHandler = null;
    }

    async init() {
        try {
            const savedLocale = localStorage.getItem('userLocale');
            const browserLang = navigator.language || navigator.userLanguage;
            const detectedLocale = savedLocale || browserLang || this.defaultLocale;
            await this.setLocale(detectedLocale);
            return true;
        } catch (error) {
            console.error('Failed to initialize localization:', error);
            return this.setLocale(this.defaultLocale);
        }
    }

    async setLocale(locale) {
        try {
            const normalizedLocale = this.normalizeLocale(locale);
            await this.loadTranslations(normalizedLocale);
            this.currentLocale = normalizedLocale;
            localStorage.setItem('userLocale', normalizedLocale);
            this.translatePage();
            this.handleTextDirection();
            return true;
        } catch (error) {
            console.error(`Failed to set locale to ${locale}:`, error);
            if (locale !== this.defaultLocale) {
                console.warn(`Falling back to default locale: ${this.defaultLocale}`);
                return this.setLocale(this.defaultLocale);
            }
            return false;
        }
    }

    normalizeLocale(locale) {
        let normalized = locale.replace('_', '-');
        const parts = normalized.split('-');
        if (parts.length === 1) {
            const languageCode = parts[0].toLowerCase();
            const matchingLocale = this.supportedLocales.find(
                supportedLocale => supportedLocale.toLowerCase().startsWith(languageCode + '-')
            );
            return matchingLocale || this.defaultLocale;
        } else if (parts.length >= 2) {
            const formattedLocale = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
            if (this.supportedLocales.includes(formattedLocale)) return formattedLocale;
            const languageCode = parts[0].toLowerCase();
            const matchingLocale = this.supportedLocales.find(
                supportedLocale => supportedLocale.toLowerCase().startsWith(languageCode + '-')
            );
            return matchingLocale || this.defaultLocale;
        }
        return this.defaultLocale;
    }

    async loadTranslations(locale) {
        try {
            if (this.translationCache[locale]) {
                this.translations = this.translationCache[locale];
                return this.translations;
            }
            const translationUrl = `${this.localesPath}translation.${locale}.json`;
            console.log(`Attempting to load translation from: ${translationUrl}`);
            const response = await fetch(translationUrl);
            if (!response.ok) {
                const errorMsg = `Failed to load translations for ${locale}: ${response.status} ${response.statusText}`;
                console.warn(errorMsg);
                throw new Error(errorMsg);
            }
            const translations = await response.json();
            const filteredTranslations = Object.entries(translations)
                .filter(([key]) => !key.startsWith('_'))
                .reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {});
            this.translationCache[locale] = filteredTranslations;
            this.translations = filteredTranslations;
            console.log(`Successfully loaded translations for ${locale}`);
            return this.translations;
        } catch (error) {
            console.error(`Error loading translations for ${locale}:`, error);
            if (locale !== this.defaultLocale) {
                console.warn(`Falling back to default locale: ${this.defaultLocale}`);
                return this.loadTranslations(this.defaultLocale);
            }
            console.error('Failed to load default translations. Using empty translations object.');
            this.translations = {};
            return this.translations;
        }
    }

    translate(key, params = {}) {
        let text = this.translations[key] || key;
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                const placeholder = new RegExp(`{{${param}}}`, 'g');
                text = text.replace(placeholder, params[param]);
            });
        }
        return text;
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key && !(element.hasAttribute('placeholder') ||
                (element.tagName === 'IMG' && element.hasAttribute('alt')) ||
                (element.tagName === 'META' && element.hasAttribute('content')))) {
                element.textContent = this.translate(key);
            }
        });
        document.querySelectorAll('[data-i18n-attrs]').forEach(element => {
            const attributesToTranslate = element.getAttribute('data-i18n-attrs');
            if (attributesToTranslate) {
                attributesToTranslate.split(',').forEach(attr => {
                    const attrName = attr.trim();
                    const attrKey = element.getAttribute(`data-i18n-${attrName}`);
                    if (attrKey) element.setAttribute(attrName, this.translate(attrKey));
                });
            }
        });
        document.querySelectorAll('[data-i18n][placeholder], [data-i18n][alt], [data-i18n][content], [data-i18n][title]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                if (element.hasAttribute('placeholder')) element.setAttribute('placeholder', this.translate(key));
                if (element.tagName === 'IMG' && element.hasAttribute('alt')) element.setAttribute('alt', this.translate(key));
                if (element.tagName === 'META' && element.hasAttribute('content')) element.setAttribute('content', this.translate(key));
                if (element.hasAttribute('title')) element.setAttribute('title', this.translate(key));
            }
        });
        document.querySelectorAll('[data-i18n-placeholder], [data-i18n-alt], [data-i18n-title], [data-i18n-content]').forEach(element => {
            ['placeholder', 'alt', 'title', 'content'].forEach(attr => {
                const attrKey = element.getAttribute(`data-i18n-${attr}`);
                if (attrKey && !element.hasAttribute('data-i18n-attrs')) {
                    element.setAttribute(attr, this.translate(attrKey));
                }
            });
        });
    }

    handleTextDirection() {
        const isRtl = this.rtlLocales.includes(this.currentLocale);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        if (isRtl) document.body.classList.add('rtl');
        else document.body.classList.remove('rtl');
    }

    formatDate(date, options = {}) {
        return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
    }

    getSupportedLocales() {
        return this.supportedLocales.map(localeCode => {
            let displayName;
            try {
                displayName = new Intl.DisplayNames([localeCode], { type: 'language' }).of(localeCode.split('-')[0]);
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                const region = localeCode.split('-')[1];
                if (region) {
                    try {
                        const regionName = new Intl.DisplayNames([localeCode], { type: 'region' }).of(region);
                        displayName = `${displayName} (${regionName})`;
                    } catch (e) {
                        displayName = `${displayName} (${region})`;
                    }
                }
            } catch (e) {
                displayName = localeCode;
            }
            return { code: localeCode, name: displayName };
        });
    }

    initializeLanguageDropdown(onLanguageChange = null) {
        const languageSelect = document.getElementById('event-portal-language-select');
        if (!languageSelect) return;
        languageSelect.innerHTML = '';
        this.supportedLocales.forEach(locale => {
            const option = document.createElement('option');
            option.value = locale;
            option.textContent = this.translate(`lang_${locale}`) || locale;
            if (locale === this.currentLocale) option.selected = true;
            languageSelect.appendChild(option);
        });
        if (this.languageChangeHandler != null) {
            languageSelect.removeEventListener('change', this.languageChangeHandler);
        }
        this.languageChangeHandler = async (event) => {
            const selectedLocale = event.target.value;
            if (selectedLocale !== this.currentLocale) {
                const changed = await this.setLocale(selectedLocale);
                if (changed) {
                    // Event API content is localized while it is fetched. Reloading is
                    // therefore the simplest deterministic way to re-fetch and render
                    // event, session and speaker content for the newly selected locale.
                    window.location.reload();
                    return;
                }
                this.initializeLanguageDropdown(onLanguageChange);
                if (onLanguageChange && typeof onLanguageChange === 'function') onLanguageChange();
            }
        };
        languageSelect.addEventListener('change', this.languageChangeHandler);
    }
}

const i18n = new LocalizationManager();
window.__ = (key, params) => i18n.translate(key, params);
window.i18n = i18n;
