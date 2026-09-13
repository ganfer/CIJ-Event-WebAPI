(function () {
    'use strict';

    class FormTranslationManager {
        constructor() {
            this.basePath = 'translation/forms/';
            this.formKey = '';
            this.eventKey = '';
            this.translation = null;
            this.container = null;
            this.observer = null;
            this.applyTimer = null;
            this.retryTimers = [];
        }

        safeFileKey(value) {
            return String(value || '')
                .trim()
                .replace(/[^A-Za-z0-9._-]+/g, '_')
                .replace(/^_+|_+$/g, '');
        }

        extractFormKey(markup, fallbackEventKey) {
            if (!markup) return this.safeFileKey(fallbackEventKey);

            try {
                const parsed = new DOMParser().parseFromString(String(markup), 'text/html');
                const holder = parsed.querySelector('[data-form-id], [data-form-block-id], [form-id]');
                const explicit = holder?.getAttribute('data-form-id') ||
                    holder?.getAttribute('data-form-block-id') ||
                    holder?.getAttribute('form-id') || '';
                return this.safeFileKey(explicit || fallbackEventKey);
            } catch (error) {
                console.warn('Could not resolve registration form ID:', error);
                return this.safeFileKey(fallbackEventKey);
            }
        }

        normalizeFieldKey(value) {
            return String(value || '')
                .trim()
                .toLowerCase()
                .replace(/^\{+|\}+$/g, '')
                .replace(/[-_][0-9]{6,}$/i, '')
                .replace(/[-_][0-9a-f]{8}-[0-9a-f-]{27,}$/i, '');
        }

        fieldKeys(field) {
            const values = [
                field?.getAttribute?.('name'),
                field?.id,
                field?.getAttribute?.('data-targetproperty'),
                field?.getAttribute?.('data-logical-name'),
                field?.getAttribute?.('data-field-name'),
                field?.closest?.('[data-targetproperty]')?.getAttribute?.('data-targetproperty'),
                field?.closest?.('[data-logical-name]')?.getAttribute?.('data-logical-name'),
                field?.closest?.('[data-field-name]')?.getAttribute?.('data-field-name')
            ];

            return [...new Set(values.map(value => this.normalizeFieldKey(value)).filter(Boolean))];
        }

        getLocaleCandidates(locale) {
            const normalized = String(locale || 'en-US').replace('_', '-');
            const primary = normalized.split('-')[0].toLowerCase();

            if (primary === 'en') {
                return [...new Set([normalized, 'en-US', 'en'])];
            }

            return [...new Set([normalized, primary])];
        }

        async load() {
            if (!this.formKey) {
                this.translation = null;
                return null;
            }

            try {
                const response = await fetch(`${this.basePath}${encodeURIComponent(this.formKey)}.json`, { cache: 'no-cache' });
                if (!response.ok) {
                    if (response.status !== 404) {
                        console.warn(`Could not load form translations for ${this.formKey}: HTTP ${response.status}`);
                    }
                    this.translation = null;
                    return null;
                }
                this.translation = await response.json();
                return this.translation;
            } catch (error) {
                console.warn(`Could not load form translations for ${this.formKey}:`, error);
                this.translation = null;
                return null;
            }
        }

        localizedContent(locale) {
            if (!this.translation) return null;
            for (const candidate of this.getLocaleCandidates(locale)) {
                const value = this.translation[candidate];
                if (value && typeof value === 'object') return value;
            }
            return null;
        }

        findLabels(field) {
            const labels = [];
            const add = (candidate) => {
                if (candidate && !labels.includes(candidate)) labels.push(candidate);
            };
            const id = String(field.id || '').trim();

            if (id) {
                try {
                    add(this.container?.querySelector(`label[for="${CSS.escape(id)}"]`));
                } catch (_) {
                    // Ignore malformed IDs and continue with structural lookup.
                }
            }

            const labelledBy = String(field.getAttribute?.('aria-labelledby') || '')
                .split(/\s+/)
                .filter(Boolean);
            labelledBy.forEach(labelId => {
                try {
                    add(this.container?.querySelector(`#${CSS.escape(labelId)}`));
                } catch (_) {
                    // Ignore malformed IDs.
                }
            });

            add(field.closest?.('label'));

            const wrapper = field.closest?.([
                '.lp-form-field',
                '.marketing-field',
                '.field',
                '.fieldWrapper',
                '.field-wrapper',
                '[class*="FormFieldBlock"]',
                '[class*="formFieldBlock"]',
                '[data-editorblocktype="Field"]',
                '[data-editorblocktype^="Field-"]',
                '[data-editorblocktype="Consent"]',
                '[data-targetproperty]',
                '[data-logical-name]',
                '[data-field-name]'
            ].join(', '));

            add(wrapper?.querySelector?.('label'));
            add(wrapper?.querySelector?.('[data-field-label], [class*="labelText"], [class*="label-text"]'));

            return labels;
        }

        replaceLabelText(label, value) {
            if (!label || !value) return;

            const textNode = Array.from(label.childNodes).find(node =>
                node.nodeType === Node.TEXT_NODE && node.textContent.trim()
            );

            if (textNode) {
                const leading = /^\s/.test(textNode.textContent) ? ' ' : '';
                const trailing = /\s$/.test(textNode.textContent) ? ' ' : '';
                textNode.textContent = `${leading}${value}${trailing}`;
                return;
            }

            const textContainer = label.querySelector?.('span:not([aria-hidden="true"]), .text, .label-text, [class*="labelText"]');
            if (textContainer && textContainer.children.length === 0) {
                textContainer.textContent = value;
                return;
            }

            if (label.children?.length === 0) {
                label.textContent = value;
                return;
            }

            label.prepend(document.createTextNode(`${value} `));
        }

        applyFields(content) {
            const fields = content?.fields;
            if (!fields || !this.container) return 0;

            let applied = 0;
            const controls = this.container.querySelectorAll('input[name], select[name], textarea[name], input[id], select[id], textarea[id]');
            controls.forEach(field => {
                const type = String(field.getAttribute('type') || '').toLowerCase();
                if (['hidden', 'submit', 'button', 'reset'].includes(type)) return;

                const keys = this.fieldKeys(field);
                const matchedKey = keys.find(key => fields[key] && typeof fields[key] === 'object');
                if (!matchedKey) return;

                const fieldTranslation = fields[matchedKey];

                if (fieldTranslation.placeholder && 'placeholder' in field) {
                    field.setAttribute('placeholder', fieldTranslation.placeholder);
                    applied += 1;
                }

                if (fieldTranslation.label) {
                    const labels = this.findLabels(field);
                    labels.forEach(label => this.replaceLabelText(label, fieldTranslation.label));
                    if (labels.length > 0) applied += labels.length;
                }
            });

            return applied;
        }

        applyButtons(content) {
            const submit = content?.buttons?.submit;
            if (!submit || !this.container) return 0;

            let applied = 0;
            this.container.querySelectorAll('button[type="submit"], button:not([type])').forEach(button => {
                button.textContent = submit;
                applied += 1;
            });

            this.container.querySelectorAll('input[type="submit"]').forEach(button => {
                button.value = submit;
                applied += 1;
            });

            return applied;
        }

        applyCurrent() {
            if (!this.container || !this.translation) return 0;
            const locale = window.i18n?.currentLocale || navigator.language || 'en-US';
            const content = this.localizedContent(locale);
            if (!content) return 0;

            const applied = this.applyFields(content) + this.applyButtons(content);
            if (applied > 0) {
                this.container.dataset.formTranslationLocale = locale;
            }
            return applied;
        }

        scheduleApply(delay = 25) {
            clearTimeout(this.applyTimer);
            this.applyTimer = setTimeout(() => this.applyCurrent(), delay);
        }

        scheduleRetries() {
            this.retryTimers.forEach(timer => clearTimeout(timer));
            this.retryTimers = [50, 200, 500, 1000, 2000].map(delay =>
                setTimeout(() => this.applyCurrent(), delay)
            );
        }

        observe(container) {
            if (!container) return;
            this.container = container;

            if (this.observer) this.observer.disconnect();
            this.observer = new MutationObserver(() => this.scheduleApply());
            this.observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['name', 'id', 'aria-labelledby', 'data-targetproperty', 'data-logical-name', 'data-field-name']
            });
            this.scheduleApply();
        }

        async prepare(registrationForm, eventKey, container) {
            this.formKey = this.extractFormKey(registrationForm, eventKey);
            this.eventKey = eventKey || '';
            this.observe(container);
            await this.load();
            this.scheduleApply(0);
            this.scheduleRetries();
        }
    }

    const manager = new FormTranslationManager();
    window.formTranslations = manager;

    if (typeof addRegistrationForm === 'function') {
        const originalAddRegistrationForm = addRegistrationForm;
        addRegistrationForm = function addTranslatedRegistrationForm(event) {
            const eventKey = typeof getEventIdFromUrl === 'function' ? getEventIdFromUrl() : '';
            manager.prepare(event?.registrationForm || '', eventKey, formContainer).catch(error => {
                console.warn('Could not initialize form translations:', error);
            });
            return originalAddRegistrationForm(event);
        };
    }

    if (typeof refreshEventForm === 'function') {
        const originalRefreshEventForm = refreshEventForm;
        refreshEventForm = function refreshTranslatedEventForm(...args) {
            const result = originalRefreshEventForm.apply(this, args);
            manager.scheduleApply(0);
            manager.scheduleRetries();
            return result;
        };
    }

    // event-details.js registered the original no-op refresh callback before this
    // runtime layer was loaded. Register our own handler so the real Dynamics
    // after-form-load event always reapplies the visitor's selected locale.
    document.addEventListener('d365mkt-afterformload', () => {
        manager.scheduleApply(0);
        manager.scheduleRetries();
    });
})();
