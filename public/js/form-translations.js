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

        canonicalFieldKey(field) {
            const name = String(field?.getAttribute?.('name') || '').trim();
            if (name) return name.toLowerCase();

            const id = String(field?.id || '').trim();
            if (!id) return '';
            return id
                .replace(/[-_][0-9]{6,}$/i, '')
                .replace(/[-_][0-9a-f]{8}-[0-9a-f-]{27,}$/i, '')
                .toLowerCase();
        }

        getLocaleCandidates(locale) {
            const normalized = String(locale || 'en-US').replace('_', '-');
            const primary = normalized.split('-')[0];
            return [...new Set([normalized, primary, 'en-US', 'en'])];
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
            const id = String(field.id || '').trim();

            if (id) {
                try {
                    const direct = this.container?.querySelector(`label[for="${CSS.escape(id)}"]`);
                    if (direct) labels.push(direct);
                } catch (_) {
                    // Ignore malformed IDs and continue with structural lookup.
                }
            }

            const wrapper = field.closest?.('.lp-form-field, .marketing-field, .field, [data-editorblocktype="Field"], [data-editorblocktype="Consent"]');
            const structural = wrapper?.querySelector?.('label');
            if (structural && !labels.includes(structural)) labels.push(structural);

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

            const textContainer = label.querySelector('span:not([aria-hidden="true"]), .text, .label-text');
            if (textContainer && textContainer.children.length === 0) {
                textContainer.textContent = value;
                return;
            }

            label.prepend(document.createTextNode(`${value} `));
        }

        applyFields(content) {
            const fields = content?.fields;
            if (!fields || !this.container) return;

            const controls = this.container.querySelectorAll('input[name], select[name], textarea[name], input[id], select[id], textarea[id]');
            controls.forEach(field => {
                const type = String(field.getAttribute('type') || '').toLowerCase();
                if (['hidden', 'submit', 'button', 'reset'].includes(type)) return;

                const key = this.canonicalFieldKey(field);
                if (!key) return;

                const fieldTranslation = fields[key] || fields[key.toLowerCase()];
                if (!fieldTranslation || typeof fieldTranslation !== 'object') return;

                if (fieldTranslation.placeholder && 'placeholder' in field) {
                    field.setAttribute('placeholder', fieldTranslation.placeholder);
                }

                if (fieldTranslation.label) {
                    this.findLabels(field).forEach(label => this.replaceLabelText(label, fieldTranslation.label));
                }
            });
        }

        applyButtons(content) {
            const submit = content?.buttons?.submit;
            if (!submit || !this.container) return;

            this.container.querySelectorAll('button[type="submit"], button:not([type])').forEach(button => {
                button.textContent = submit;
            });

            this.container.querySelectorAll('input[type="submit"]').forEach(button => {
                button.value = submit;
            });
        }

        applyCurrent() {
            if (!this.container || !this.translation) return;
            const locale = window.i18n?.currentLocale || navigator.language || 'en-US';
            const content = this.localizedContent(locale);
            if (!content) return;
            this.applyFields(content);
            this.applyButtons(content);
        }

        scheduleApply() {
            clearTimeout(this.applyTimer);
            this.applyTimer = setTimeout(() => this.applyCurrent(), 25);
        }

        observe(container) {
            if (!container) return;
            this.container = container;

            if (this.observer) this.observer.disconnect();
            this.observer = new MutationObserver(() => this.scheduleApply());
            this.observer.observe(container, { childList: true, subtree: true });
            this.scheduleApply();
        }

        async prepare(registrationForm, eventKey, container) {
            this.formKey = this.extractFormKey(registrationForm, eventKey);
            this.eventKey = eventKey || '';
            this.observe(container);
            await this.load();
            this.scheduleApply();
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
            manager.scheduleApply();
            return result;
        };
    }
})();
