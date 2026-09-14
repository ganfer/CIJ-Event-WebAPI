import fs from 'node:fs';
import path from 'node:path';
import { assertAllowedEventsApiBaseUrl, fetchWithTimeout } from './lib/http.mjs';

const baseUrl = assertAllowedEventsApiBaseUrl(
  process.env.EVENTS_BASE_URL || 'https://public-eur.mkt.dynamics.com'
);
const orgId = process.env.EVENTS_ORG_ID;
const token = process.env.EVENTS_API_TOKEN;
const webappId = process.env.EVENTS_WEBAPP_ID || '';
const localesDir = path.join(process.cwd(), 'public', 'locales');

function discoverPortalLocales() {
  return [...new Set(
    fs.readdirSync(localesDir)
      .map(file => file.match(/^translation\.(.+)\.json$/)?.[1])
      .filter(Boolean)
  )].sort();
}

const discoveredLocales = discoverPortalLocales();
const requiredLocales = process.env.EVENT_TRANSLATION_REQUIRED_LOCALES
  ? process.env.EVENT_TRANSLATION_REQUIRED_LOCALES.split(',').map(value => value.trim()).filter(Boolean)
  : discoveredLocales;
const translationsDir = path.join(process.cwd(), 'public', 'translations', 'events');

const unsupportedRequiredLocales = requiredLocales.filter(locale => !discoveredLocales.includes(locale));
if (unsupportedRequiredLocales.length > 0) {
  console.error(`Event translation check contains unsupported locale(s): ${unsupportedRequiredLocales.join(', ')}.`);
  process.exit(1);
}

if (!requiredLocales.includes('en-US')) {
  console.error('Event translation check requires the en-US source locale.');
  process.exit(1);
}

if (!orgId || !token) {
  console.error('Event translation check requires EVENTS_ORG_ID and EVENTS_API_TOKEN.');
  process.exit(1);
}

const url = new URL(
  `/api/v1.0/orgs/${encodeURIComponent(orgId)}/eventmanagement/events/published`,
  baseUrl
);
url.searchParams.set('emApplicationtoken', token);
if (webappId) url.searchParams.set('webappId', webappId);

const response = await fetchWithTimeout(url, {
  headers: {
    Accept: 'application/json'
  }
});

if (!response.ok) {
  console.error(`Could not load published events: HTTP ${response.status}.`);
  process.exit(1);
}

const payload = await response.json();
const events = Array.isArray(payload) ? payload :
  Array.isArray(payload?.value) ? payload.value :
  Array.isArray(payload?.data) ? payload.data : [];

if (!Array.isArray(events)) {
  console.error('Events API returned an unsupported response shape.');
  process.exit(1);
}

const failures = [];
let checked = 0;
let pendingCount = 0;

function getEventKey(event) {
  const candidates = [event?.readableEventId, event?.eventId, event?.id, event?.eventID];
  const value = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
  return value ? value.trim() : '';
}

for (const event of events) {
  const key = getEventKey(event);
  const label = event?.eventName || event?.name || key || '<unknown event>';

  if (!key) {
    failures.push(`${label}: Events API response has no usable event identifier.`);
    continue;
  }

  checked += 1;
  const file = path.join(translationsDir, `${key}.json`);

  if (!fs.existsSync(file)) {
    failures.push(`${label} (${key}): translation file missing.`);
    continue;
  }

  let translation;
  try {
    translation = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`${label} (${key}): invalid JSON (${error.message}).`);
    continue;
  }

  const pendingLocales = Array.isArray(translation?._meta?.pendingLocales)
    ? translation._meta.pendingLocales.filter(locale => typeof locale === 'string')
    : [];
  const pendingSet = new Set(pendingLocales);

  const missingLocales = requiredLocales.filter(locale =>
    !(translation?.[locale] && typeof translation[locale] === 'object')
  );
  const unexpectedMissing = missingLocales.filter(locale => !pendingSet.has(locale));
  const expectedPending = missingLocales.filter(locale => pendingSet.has(locale));

  if (unexpectedMissing.length > 0) {
    failures.push(`${label} (${key}): missing locale(s) without pending marker: ${unexpectedMissing.join(', ')}.`);
    continue;
  }

  if (expectedPending.length > 0) {
    pendingCount += expectedPending.length;
    console.warn(`⚠ ${label} (${key}) — pending locale(s): ${expectedPending.join(', ')}`);
    continue;
  }

  console.log(`✓ ${label} (${key}) — ${requiredLocales.length} portal locales`);
}

if (failures.length > 0) {
  console.error(`\nEvent translation check failed: ${failures.length} issue(s) across ${events.length} published event(s).`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

if (pendingCount > 0) {
  console.warn(`\nEvent translation check passed with ${pendingCount} pending locale(s). Pending locales will be retried on a later sync.`);
} else {
  console.log(`\nEvent translation check passed: ${checked}/${events.length} published event(s) have translation files for all ${requiredLocales.length} required locale(s).`);
}
