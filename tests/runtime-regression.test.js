const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('the browser API accepts long opaque Dynamics web application tokens unchanged', async () => {
    const source = fs.readFileSync(path.join(root, 'public/js/api-wrapper.js'), 'utf8');
    const token = 'opaque-token-'.repeat(256);
    let initializedWith;

    const context = vm.createContext({
        CONFIG: {
            BASE_URL: 'https://public-eur.mkt.dynamics.com',
            ORG_ID: 'organization-id',
            TOKEN: token,
            WEBAPP_ID: ''
        },
        d365events: {
            init(baseUrl, receivedToken, organizationId) {
                initializedWith = { baseUrl, receivedToken, organizationId };
            },
            service: {
                async publicApiGetEvents() {
                    return {
                        data: [{ readableEventId: 'event-one', eventName: 'Event one' }],
                        response: { status: 200, statusText: 'OK' }
                    };
                }
            }
        },
        document: {
            getElementById() {
                return null;
            }
        },
        navigator: { language: 'en-US' },
        window: {}
    });

    vm.runInContext(source, context, { filename: 'api-wrapper.js' });
    const api = vm.runInContext('eventsAPI', context);
    const events = await api.getAllEvents();

    assert.equal(initializedWith.baseUrl, 'https://public-eur.mkt.dynamics.com');
    assert.equal(initializedWith.organizationId, 'organization-id');
    assert.equal(initializedWith.receivedToken, token);
    assert.equal(events.length, 1);
});

class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.children = [];
        this._attributes = new Map();
        this.className = '';
        this.textContent = '';
    }

    get attributes() {
        return [...this._attributes].map(([name, value]) => ({ name, value }));
    }

    setAttribute(name, value) {
        this._attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this._attributes.get(name) ?? null;
    }

    appendChild(element) {
        this.children.push(element);
        return element;
    }

    replaceChildren(...elements) {
        this.children = [...elements];
    }

    cloneNode(deep = false) {
        const clone = new FakeElement(this.tagName);
        clone.className = this.className;
        clone.textContent = this.textContent;
        for (const [name, value] of this._attributes) clone.setAttribute(name, value);
        if (deep) clone.children = this.children.map(child => child.cloneNode(true));
        return clone;
    }
}

test('the current registration renderer preserves the Microsoft form holder and loader', () => {
    const source = fs.readFileSync(path.join(root, 'public/js/event-details.js'), 'utf8');
    const elements = new Map();
    const body = new FakeElement('body');
    const formContainer = new FakeElement('section');
    elements.set('event-portal-registration-form-container', formContainer);

    const holder = new FakeElement('div');
    holder.setAttribute('data-form-id', '432e0451-b7fa-4f34-bdbe-bd16d6a34eab');
    holder.setAttribute(
        'data-form-api-url',
        'https://public-eur.mkt.dynamics.com/api/v1.0/orgs/example/landingpageforms'
    );
    holder.setAttribute(
        'data-cached-form-url',
        'https://assets-eur.mkt.dynamics.com/example/digitalassets/forms/example'
    );
    holder.setAttribute('data-readable-event-id', 'event-one');

    const loader = new FakeElement('script');
    loader.setAttribute(
        'src',
        'https://formui-usa1.mkt.dynamics.com/eur/FormLoader/FormLoader.bundle.js'
    );

    const document = {
        body,
        title: '',
        addEventListener() {},
        createElement(tagName) {
            return new FakeElement(tagName);
        },
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new FakeElement('div'));
            return elements.get(id);
        }
    };

    class FakeDOMParser {
        parseFromString() {
            return { body: { children: [holder, loader] } };
        }
    }

    const context = vm.createContext({
        DOMParser: FakeDOMParser,
        URLSearchParams,
        console,
        document,
        eventsAPI: {},
        navigator: { language: 'en-US' },
        window: { location: { search: '?id=event-one' } }
    });

    vm.runInContext(source, context, { filename: 'event-details.js' });
    const addRegistrationForm = vm.runInContext('addRegistrationForm', context);
    addRegistrationForm({
        registrationForm: [
            '<div data-form-id="432e0451-b7fa-4f34-bdbe-bd16d6a34eab"></div>',
            '<script src="https://formui-usa1.mkt.dynamics.com/eur/FormLoader/FormLoader.bundle.js"></script>'
        ].join('')
    });

    assert.equal(formContainer.children.length, 1);
    const wrapper = formContainer.children[0];
    assert.equal(wrapper.children.length, 1);
    assert.equal(
        wrapper.children[0].getAttribute('data-form-api-url'),
        'https://public-eur.mkt.dynamics.com/api/v1.0/orgs/example/landingpageforms'
    );
    assert.equal(body.children.length, 1);
    assert.equal(
        body.children[0].getAttribute('src'),
        'https://formui-usa1.mkt.dynamics.com/eur/FormLoader/FormLoader.bundle.js'
    );
});

test('event pages retain the compatibility scripts and their load order', () => {
    const indexHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    const detailsHtml = fs.readFileSync(path.join(root, 'public/event-details.html'), 'utf8');

    const gridTranslations = indexHtml.indexOf('js/event-grid-translations.js');
    const gridRuntime = indexHtml.indexOf('js/event-grid.js');
    assert.notEqual(gridTranslations, -1);
    assert.ok(gridTranslations < gridRuntime);

    const detailsTranslations = detailsHtml.indexOf('js/event-details-translations.js');
    const detailsRuntime = detailsHtml.indexOf('js/event-details.js');
    const resilienceRuntime = detailsHtml.indexOf('js/event-details-runtime-fix.js');
    assert.notEqual(detailsTranslations, -1);
    assert.notEqual(resilienceRuntime, -1);
    assert.ok(detailsTranslations < detailsRuntime);
    assert.ok(detailsRuntime < resilienceRuntime);
});
