const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const security = require('../public/js/security.js');

const source = fs.readFileSync(require.resolve('../public/js/api-wrapper.js'), 'utf8');

function loadApi(service, configuration = {
    BASE_URL: 'https://public-eur.mkt.dynamics.com',
    ORG_ID: 'org-id',
    TOKEN: 'application-token',
    WEBAPP_ID: ''
}) {
    const warnings = [];
    const sdk = {
        init() {},
        service
    };
    const context = vm.createContext({
        window: { EventPortalSecurity: security },
        CONFIG: configuration,
        d365events: sdk,
        navigator: { language: 'en-US' },
        console: { warn: (...args) => warnings.push(args) },
        AbortSignal,
        AbortController,
        setTimeout,
        clearTimeout
    });
    vm.runInContext(source, context, { filename: 'api-wrapper.js' });
    const EventsAPI = vm.runInContext('EventsAPI', context);
    return { api: new EventsAPI(configuration, sdk), warnings };
}

function response(data, status = 200) {
    return { data, response: { status } };
}

test('loads event lists and forwards only configured filters', async () => {
    let received;
    const { api } = loadApi({
        async publicApiGetEvents(options) {
            received = options;
            return response([{ readableEventId: 'one' }]);
        }
    });

    const events = await api.getAllEvents('business-unit', 'webapp');
    assert.equal(events.length, 1);
    assert.equal(JSON.stringify(received.path), JSON.stringify({ organizationId: 'org-id' }));
    assert.equal(JSON.stringify(received.query), JSON.stringify({ businessUnitId: 'business-unit', webappId: 'webapp' }));
    assert.equal(received.signal instanceof AbortSignal, true);
});

test('normalizes event IDs before calling the SDK', async () => {
    let received;
    const { api } = loadApi({
        async publicApiGetEvent(options) {
            received = options.path.readableEventId;
            return response({ readableEventId: options.path.readableEventId });
        }
    });

    const event = await api.getEventById('  Event_123  ');
    assert.equal(received, 'Event_123');
    assert.equal(event.readableEventId, 'Event_123');
});

test('rejects manipulated IDs before an API request', async () => {
    let called = false;
    const { api } = loadApi({
        async publicApiGetEvent() {
            called = true;
            return response({});
        }
    });

    await assert.rejects(api.getEventById('event\nother'), error => error.code === 'INVALID_EVENT_ID');
    assert.equal(called, false);
});

test('preserves HTTP status without retaining the token-bearing response', async () => {
    const { api } = loadApi({
        async publicApiGetEvent() {
            return response({ message: 'internal detail' }, 404);
        }
    });

    await assert.rejects(api.getEventById('missing'), error => {
        assert.equal(error.code, 'HTTP_ERROR');
        assert.equal(error.status, 404);
        assert.equal('response' in error, false);
        return true;
    });
});

test('optional endpoint failures degrade to an empty collection with safe diagnostics', async () => {
    const { api, warnings } = loadApi({
        async publicApiGetEventSessions() {
            throw new Error('https://host/path?emApplicationtoken=must-not-be-logged');
        }
    });

    const sessions = await api.getEventSessions('event');
    assert.equal(Array.isArray(sessions), true);
    assert.equal(sessions.length, 0);
    assert.equal(JSON.stringify(warnings).includes('must-not-be-logged'), false);
    assert.equal(warnings.length, 1);
});

test('invalid configuration fails closed', async () => {
    const { api } = loadApi({}, {
        BASE_URL: 'https://attacker.example',
        ORG_ID: 'org-id',
        TOKEN: 'application-token'
    });

    await assert.rejects(api.getAllEvents(), error => error.code === 'CONFIGURATION_ERROR');
});
