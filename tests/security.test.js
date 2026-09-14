const test = require('node:test');
const assert = require('node:assert/strict');
const security = require('../public/js/security.js');

test('accepts documented Microsoft Events API and form URLs', () => {
    assert.equal(security.isAllowedEventsApiBaseUrl('https://public-eur.mkt.dynamics.com'), true);
    assert.equal(
        security.isAllowedFormApiUrl('https://public-eur.mkt.dynamics.com/api/v1.0/orgs/org-id/eventmanagement'),
        true
    );
    assert.equal(
        security.isAllowedCachedFormUrl('https://assets-eur.mkt.dynamics.com/org-id/digitalassets/forms/form-id'),
        true
    );
    assert.equal(
        security.isAllowedFormLoaderUrl('https://formui-eur.mkt.dynamics.com/eur/FormLoader/FormLoader.bundle.js'),
        true
    );
    assert.equal(
        security.isAllowedFormLoaderUrl('https://mktdplp102cdn.azureedge.net/public/latest/js/form-loader.js?v=1'),
        true
    );
});

test('rejects non-HTTPS, credentialed and lookalike URLs', () => {
    const rejected = [
        'http://public-eur.mkt.dynamics.com',
        'https://user:password@public-eur.mkt.dynamics.com',
        'https://public-eur.mkt.dynamics.com.evil.example',
        'https://127.0.0.1/digitalassets/forms/form-id',
        'file:///etc/passwd',
        'not a URL'
    ];

    rejected.forEach(value => {
        assert.equal(security.isAllowedEventsApiBaseUrl(value), false, value);
        assert.equal(security.isAllowedCachedFormUrl(value), false, value);
    });
});

test('requires expected form resource paths', () => {
    assert.equal(security.isAllowedFormApiUrl('https://example.dynamics.com/other'), false);
    assert.equal(security.isAllowedCachedFormUrl('https://example.dynamics.com/other'), false);
    assert.equal(security.isAllowedFormLoaderUrl('https://example.dynamics.com/untrusted.js'), false);
    assert.equal(security.isAllowedFormLoaderUrl('https://evil.example/FormLoader/FormLoader.bundle.js'), false);
});

test('normalizes bounded event IDs and rejects control characters', () => {
    assert.equal(security.normalizeEventId('  Event_123  '), 'Event_123');
    assert.equal(security.normalizeEventId(''), '');
    assert.equal(security.normalizeEventId('event\nother'), '');
    assert.equal(security.normalizeEventId('x'.repeat(201)), '');
    assert.equal(security.normalizeEventId(null), '');
});
