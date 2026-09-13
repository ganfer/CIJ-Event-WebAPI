const test = require('node:test');
const assert = require('node:assert/strict');

test('fetchWithTimeout supplies an abort signal and returns the response', async () => {
    const { fetchWithTimeout } = await import('../scripts/lib/http.mjs');
    const expected = { ok: true };
    const result = await fetchWithTimeout('https://example.test', {}, 100, async (_input, options) => {
        assert.equal(options.signal instanceof AbortSignal, true);
        return expected;
    });
    assert.equal(result, expected);
});

test('fetchWithTimeout aborts a stalled request', async () => {
    const { fetchWithTimeout } = await import('../scripts/lib/http.mjs');
    const stalledFetch = (_input, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    });

    await assert.rejects(
        fetchWithTimeout('https://example.test', {}, 5, stalledFetch),
        error => error?.name === 'TimeoutError'
    );
});

test('API base validation rejects SSRF destinations', async () => {
    const { assertAllowedEventsApiBaseUrl, isAllowedCachedFormUrl } = await import('../scripts/lib/http.mjs');
    assert.throws(() => assertAllowedEventsApiBaseUrl('http://169.254.169.254/latest/meta-data'));
    assert.equal(isAllowedCachedFormUrl('https://localhost/digitalassets/forms/test'), false);
});
