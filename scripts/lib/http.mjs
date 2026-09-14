import security from '../../public/js/security.js';

export const DEFAULT_TIMEOUT_MS = 15000;

export function assertAllowedEventsApiBaseUrl(value) {
  if (!security.isAllowedEventsApiBaseUrl(value)) {
    throw new Error('EVENTS_BASE_URL must be an HTTPS Microsoft Dynamics endpoint.');
  }
  return value;
}

export function isAllowedCachedFormUrl(value) {
  return security.isAllowedCachedFormUrl(value);
}

export async function fetchWithTimeout(input, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImplementation = globalThis.fetch) {
  if (typeof fetchImplementation !== 'function') {
    throw new TypeError('A fetch implementation is required.');
  }

  if (options.signal) {
    return fetchImplementation(input, options);
  }

  const signal = AbortSignal.timeout(timeoutMs);
  return fetchImplementation(input, { ...options, signal });
}
