export const DEFAULT_TIMEOUT_MS = 15000;

const DYNAMICS_HOST_SUFFIX = '.dynamics.com';

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
  } catch {
    return null;
  }
}

export function assertAllowedEventsApiBaseUrl(value) {
  const parsed = parseHttpsUrl(value);
  if (!parsed || !hasHostnameSuffix(parsed.hostname, DYNAMICS_HOST_SUFFIX)) {
    throw new Error('EVENTS_BASE_URL must be an HTTPS Microsoft Dynamics endpoint.');
  }
  return value.trim();
}

export function isAllowedCachedFormUrl(value) {
  const parsed = parseHttpsUrl(value);
  return Boolean(
    parsed &&
    hasHostnameSuffix(parsed.hostname, DYNAMICS_HOST_SUFFIX) &&
    /\/digitalassets\/forms\//i.test(parsed.pathname)
  );
}

export async function fetchWithTimeout(
  input,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImplementation = globalThis.fetch
) {
  if (typeof fetchImplementation !== 'function') {
    throw new TypeError('A fetch implementation is required.');
  }

  if (options.signal) {
    return fetchImplementation(input, options);
  }

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetchImplementation(input, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImplementation(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
