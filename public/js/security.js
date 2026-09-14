/**
 * Shared trust-boundary helpers for browser code and Node.js tooling.
 *
 * The application intentionally consumes Microsoft-hosted event and form data.
 * These helpers keep untrusted URLs and identifiers from silently widening that
 * boundary to arbitrary hosts, protocols, or control characters.
 */
(function exposeSecurityHelpers(root, factory) {
    const helpers = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = helpers;
    }

    if (root) {
        root.EventPortalSecurity = helpers;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createSecurityHelpers() {
    'use strict';

    const DYNAMICS_HOST_SUFFIX = '.dynamics.com';
    const FORM_LOADER_HOST_SUFFIXES = [DYNAMICS_HOST_SUFFIX, '.azureedge.net'];
    const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

    function hasHostnameSuffix(hostname, suffix) {
        const normalizedHostname = String(hostname || '').toLowerCase();
        const normalizedSuffix = String(suffix || '').toLowerCase();
        const exactHostname = normalizedSuffix.startsWith('.') ? normalizedSuffix.slice(1) : normalizedSuffix;
        return normalizedHostname === exactHostname || normalizedHostname.endsWith(normalizedSuffix);
    }

    function parseHttpsUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return null;

        try {
            const parsed = new URL(value.trim());
            if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
            return parsed;
        } catch (_) {
            return null;
        }
    }

    function isAllowedEventsApiBaseUrl(value) {
        const parsed = parseHttpsUrl(value);
        return Boolean(parsed && hasHostnameSuffix(parsed.hostname, DYNAMICS_HOST_SUFFIX));
    }

    function isAllowedFormApiUrl(value) {
        const parsed = parseHttpsUrl(value);
        if (!parsed || !hasHostnameSuffix(parsed.hostname, DYNAMICS_HOST_SUFFIX)) return false;
        return /^\/api\/v1\.0\/orgs\/[^/]+\/(?:eventmanagement|landingpageforms)(?:\/|$)/i.test(parsed.pathname);
    }

    function isAllowedCachedFormUrl(value) {
        const parsed = parseHttpsUrl(value);
        if (!parsed || !hasHostnameSuffix(parsed.hostname, DYNAMICS_HOST_SUFFIX)) return false;
        return /\/digitalassets\/forms\//i.test(parsed.pathname);
    }

    function isAllowedFormLoaderUrl(value) {
        const parsed = parseHttpsUrl(value);
        if (!parsed || !FORM_LOADER_HOST_SUFFIXES.some(suffix => hasHostnameSuffix(parsed.hostname, suffix))) {
            return false;
        }

        return /\/(?:FormLoader\/FormLoader\.bundle\.js|public\/latest\/js\/form-loader\.js)$/i.test(parsed.pathname);
    }

    function normalizeEventId(value) {
        if (typeof value !== 'string') return '';
        const normalized = value.trim();
        if (!normalized || normalized.length > 200 || CONTROL_CHARACTERS.test(normalized)) return '';
        return normalized;
    }

    function normalizeOpaqueId(value) {
        if (typeof value !== 'string') return '';
        const normalized = value.trim();
        if (!normalized || normalized.length > 200 || CONTROL_CHARACTERS.test(normalized)) return '';
        return normalized;
    }

    return Object.freeze({
        hasHostnameSuffix,
        isAllowedCachedFormUrl,
        isAllowedEventsApiBaseUrl,
        isAllowedFormApiUrl,
        isAllowedFormLoaderUrl,
        normalizeEventId,
        normalizeOpaqueId,
        parseHttpsUrl
    });
});
