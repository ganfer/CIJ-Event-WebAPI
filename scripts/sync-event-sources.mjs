import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertAllowedEventsApiBaseUrl,
  fetchWithTimeout,
  isAllowedCachedFormUrl
} from './lib/http.mjs';

const baseUrl = assertAllowedEventsApiBaseUrl(
  process.env.EVENTS_BASE_URL || 'https://public-eur.mkt.dynamics.com'
);
const orgId = process.env.EVENTS_ORG_ID;
const token = process.env.EVENTS_API_TOKEN;
const webappId = process.env.EVENTS_WEBAPP_ID || '';
const outputDir = path.join(process.cwd(), 'public', 'translations', 'events');
const formOutputDir = path.join(process.cwd(), 'public', 'translation', 'forms');

if (!orgId || !token) {
  throw new Error('EVENTS_ORG_ID and EVENTS_API_TOKEN are required.');
}

function apiUrl(resourcePath) {
  const url = new URL(resourcePath, baseUrl);
  url.searchParams.set('emApplicationtoken', token);
  return url;
}

async function getJson(resourcePath, label) {
  const response = await fetchWithTimeout(apiUrl(resourcePath), { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response.json();
}

function asArray(payload, label) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error(`${label}: unsupported Events API response shape.`);
}

function firstId(values) {
  const value = values.find((item) => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
}

function firstText(values) {
  const value = values.find((item) => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
}

function eventKey(event) {
  return firstId([event?.readableEventId, event?.eventId, event?.id, event?.eventID]);
}

function entityKey(entity, type) {
  return type === 'session'
    ? firstId([entity?.readableSessionId, entity?.sessionId, entity?.id, entity?.sessionID])
    : firstId([entity?.speakerId, entity?.id, entity?.speakerID]);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => {
    if (value === '' || value === null || value === undefined) return false;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    return true;
  }));
}

function eventTitle(event) {
  return firstText([
    event?.eventName,
    event?.name,
    event?.title,
    event?.eventTitle
  ]);
}

function eventDescription(event) {
  return firstText([
    event?.eventDescription,
    event?.description,
    event?.eventDescriptionHtml,
    event?.descriptionHtml,
    event?.summary
  ]);
}

function buildSource(event, sessions, speakers, key) {
  const title = eventTitle(event);
  const description = eventDescription(event);

  if (!title) {
    throw new Error(`${key}: event title could not be resolved from the Events API payload.`);
  }

  const sessionMap = {};
  for (const session of sessions) {
    const sessionKey = entityKey(session, 'session');
    if (!sessionKey) continue;
    sessionMap[sessionKey] = compact({
      title: text(session.name),
      summary: text(session.sessionSummary),
      description: text(session.detailedDescription),
      objectives: text(session.sessionObjectives)
    });
  }

  const speakerMap = {};
  for (const speaker of speakers) {
    const speakerKey = entityKey(speaker, 'speaker');
    if (!speakerKey) continue;
    speakerMap[speakerKey] = compact({
      name: text(speaker.name),
      title: text(speaker.title),
      about: text(speaker.about)
    });
  }

  return compact({
    title,
    description,
    sessions: sessionMap,
    speakers: speakerMap
  });
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function plainText(markup) {
  return decodeHtml(String(markup || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseAttributes(fragment) {
  const attributes = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(fragment || '')) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function findAttribute(markup, names) {
  const escaped = names.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`\\b(?:${escaped})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = pattern.exec(markup || '');
  return match ? decodeHtml(match[1] ?? match[2] ?? match[3] ?? '').trim() : '';
}

function safeFileKey(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
}

function canonicalFieldKey(attributes) {
  const name = String(attributes.name || '').trim();
  if (name) return name.toLowerCase();
  const id = String(attributes.id || '').trim();
  if (!id) return '';
  return id
    .replace(/[-_][0-9]{6,}$/i, '')
    .replace(/[-_][0-9a-f]{8}-[0-9a-f-]{27,}$/i, '')
    .toLowerCase();
}

function extractFormKey(embedHtml, fallbackEventKey) {
  const explicit = findAttribute(embedHtml, ['data-form-id', 'data-form-block-id', 'form-id']);
  return safeFileKey(explicit || fallbackEventKey);
}

async function resolveFormHtml(embedHtml, label) {
  const cachedUrl = findAttribute(embedHtml, ['data-cached-form-url']);
  if (!cachedUrl) return embedHtml;
  if (!isAllowedCachedFormUrl(cachedUrl)) {
    console.warn(`${label}: cached form URL is outside the approved Dynamics form endpoint; using embed HTML.`);
    return embedHtml;
  }

  try {
    const response = await fetchWithTimeout(cachedUrl, { headers: { Accept: 'text/html,*/*' } });
    if (!response.ok) {
      console.warn(`${label}: cached form returned HTTP ${response.status}; using embed HTML.`);
      return embedHtml;
    }
    return await response.text();
  } catch (error) {
    console.warn(`${label}: cached form could not be loaded (${error.message}); using embed HTML.`);
    return embedHtml;
  }
}

function buildFormSource(formHtml) {
  const labelsByFor = new Map();
  for (const match of formHtml.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const attributes = parseAttributes(match[1]);
    const target = String(attributes.for || '').trim();
    const label = plainText(match[2]);
    if (target && label) labelsByFor.set(target, label);
  }

  const fields = {};
  for (const match of formHtml.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[2]);
    const type = String(attributes.type || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;

    const key = canonicalFieldKey(attributes);
    if (!key || fields[key]) continue;

    const id = String(attributes.id || '').trim();
    const label = (id && labelsByFor.get(id)) || attributes['aria-label'] || attributes['data-label'] || '';
    const placeholder = attributes.placeholder || '';
    const field = compact({ label: plainText(label), placeholder: plainText(placeholder) });
    if (Object.keys(field).length > 0) fields[key] = field;
  }

  let submit = '';
  for (const match of formHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attributes = parseAttributes(match[1]);
    const type = String(attributes.type || 'submit').toLowerCase();
    if (type === 'submit') {
      submit = plainText(match[2]);
      if (submit) break;
    }
  }

  if (!submit) {
    for (const match of formHtml.matchAll(/<input\b([^>]*)>/gi)) {
      const attributes = parseAttributes(match[1]);
      if (String(attributes.type || '').toLowerCase() === 'submit') {
        submit = plainText(attributes.value || '');
        if (submit) break;
      }
    }
  }

  return compact({ fields, buttons: compact({ submit }) });
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(formOutputDir, { recursive: true });
const publishedPath = `/api/v1.0/orgs/${encodeURIComponent(orgId)}/eventmanagement/events/published`;
const publishedUrl = apiUrl(publishedPath);
if (webappId) publishedUrl.searchParams.set('webappId', webappId);
const publishedResponse = await fetchWithTimeout(publishedUrl, { headers: { Accept: 'application/json' } });
if (!publishedResponse.ok) throw new Error(`published events: HTTP ${publishedResponse.status}`);
const events = asArray(await publishedResponse.json(), 'published events');

for (const listedEvent of events) {
  const key = eventKey(listedEvent);
  if (!key) throw new Error('Published event has no usable identifier.');
  const root = `/api/v1.0/orgs/${encodeURIComponent(orgId)}/eventmanagement/events/${encodeURIComponent(key)}`;
  const [eventPayload, sessionsPayload, speakersPayload] = await Promise.all([
    getJson(root, `${key} event`),
    getJson(`${root}/sessions`, `${key} sessions`),
    getJson(`${root}/speakers`, `${key} speakers`)
  ]);
  const event = eventPayload?.data && !Array.isArray(eventPayload.data) ? eventPayload.data : eventPayload;
  const source = buildSource(event, asArray(sessionsPayload, `${key} sessions`), asArray(speakersPayload, `${key} speakers`), key);
  await fs.writeFile(path.join(outputDir, `${key}.source.json`), `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  console.log(`Source synced: ${key}`);

  const registrationForm = firstText([event?.registrationForm, event?.eventRegistrationForm]);
  if (registrationForm) {
    const formKey = extractFormKey(registrationForm, key);
    const formHtml = await resolveFormHtml(registrationForm, `${key} registration form`);
    const formSource = buildFormSource(formHtml);
    if (formKey && Object.keys(formSource).length > 0) {
      await fs.writeFile(path.join(formOutputDir, `${formKey}.source.json`), `${JSON.stringify(formSource, null, 2)}\n`, 'utf8');
      console.log(`Form source synced: ${formKey}`);
    } else {
      console.warn(`${key}: registration form has no extractable labels, placeholders, or submit text.`);
    }
  }
}

console.log(`Event source sync complete: ${events.length} published event(s).`);
