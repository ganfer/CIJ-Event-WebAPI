const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

async function availablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(error => error ? reject(error) : resolve(port));
        });
    });
}

async function waitUntilReady(url, child) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        if (child.exitCode !== null) throw new Error(`Development server exited with ${child.exitCode}.`);
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch (_) {
            // Server startup can take a few short polling intervals.
        }
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('Development server did not become ready.');
}

test('development server serves files with security headers and blocks traversal', async t => {
    const port = await availablePort();
    const child = spawn(process.execPath, ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: String(port) },
        stdio: 'ignore'
    });
    t.after(() => child.kill('SIGTERM'));

    const baseUrl = `http://127.0.0.1:${port}`;
    await waitUntilReady(baseUrl, child);

    const page = await fetch(baseUrl);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    assert.equal(page.headers.get('referrer-policy'), 'no-referrer');

    const locale = await fetch(`${baseUrl}/locales/translation.de-DE.json`);
    assert.equal(locale.status, 200);

    const unsupportedLocale = await fetch(`${baseUrl}/locales/translation.xx-XX.json`);
    assert.equal(unsupportedLocale.status, 403);

    const traversal = await fetch(`${baseUrl}/locales/%2e%2e%2f%2e%2e%2fpackage.json`);
    assert.notEqual(traversal.status, 200);
    assert.equal((await traversal.text()).includes('cij-event-webapi'), false);
});
