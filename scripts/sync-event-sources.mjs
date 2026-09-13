import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.EVENTS_BASE_URL || 'https://public-eur.mkt.dynamics.com';
const orgId = process.env.EVENTS_ORG_ID;
const token = process.env.EVENTS_API_TOKEN;
const webappId = process.env.EVENTS_WEBAPP_ID || '';
const outputDir = path.join(process.cwd(), 'public', 'translations', 'events');

if (!orgId || !token) {
  throw new Error('EVENTS_ORG_ID and EVENTS_API_TOKEN are required.');
}

function apiUrl(resourcePath) {
  const url = new URL(resourcePath, baseUrl);
  url.searchParams.set('emApplicationtoken', token);
  return url;
}

async function getJson(resourcePath, label) {
  const response = await fetch(apiUrl(resourcePath), { headers: { Accept: 'application/json' } });
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

function buildSource(event, sessions, speakers) {
  const sessionMap = {};
  for (const session of sessions) {
    const key = entityKey(session, 'session');
    if (!key) continue;
    sessionMap[key] = compact({
      title: text(session.name),
      summary: text(session.sessionSummary),
      description: text(session.detailedDescription),
      objectives: text(session.sessionObjectives)
    });
  }

  const speakerMap = {};
  for (const speaker of speakers) {
    const key = entityKey(speaker, 'speaker');
    if (!key) continue;
    speakerMap[key] = compact({
      name: text(speaker.name),
      title: text(speaker.title),
      about: text(speaker.about)
    });
  }

  return compact({
    title: text(event.eventName) || text(event.name),
    description: text(event.description),
    sessions: sessionMap,
    speakers: speakerMap
  });
}

await fs.mkdir(outputDir, { recursive: true });
const publishedPath = `/api/v1.0/orgs/${encodeURIComponent(orgId)}/eventmanagement/events/published`;
const publishedUrl = apiUrl(publishedPath);
if (webappId) publishedUrl.searchParams.set('webappId', webappId);
const publishedResponse = await fetch(publishedUrl, { headers: { Accept: 'application/json' } });
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
  const source = buildSource(event, asArray(sessionsPayload, `${key} sessions`), asArray(speakersPayload, `${key} speakers`));
  await fs.writeFile(path.join(outputDir, `${key}.source.json`), `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  console.log(`Source synced: ${key}`);
}

console.log(`Event source sync complete: ${events.length} published event(s).`);
