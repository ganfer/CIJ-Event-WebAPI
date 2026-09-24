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
const outputDir = path.join(process.cwd(), 'public', 'translations', 'forms');

if (!orgId || !token) {
  throw new Error('EVENTS_ORG_ID and EVENTS_API_TOKEN are required.');
}

function apiUrl(resourcePath) {
  const url = new URL(resourcePath, baseUrl);
  url.searchParams.set('emApplicationtoken', token);
  return url;
}

function asArray(payload, label) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error(`${label}: unsupported Events API response shape.`);
}

function firstText(values) {
  const value = values.find(item => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
}

function eventKey(event) {
  return firstText([event?.readableEventId, event?.eventId, event?.id, event?.eventID]);
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

function normalizeFieldKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\{+|\}+$/g, '')
    .replace(/[-_][0-9]{6,}$/i, '')
    .replace(/[-_][0-9a-f]{8}-[0-9a-f-]{27,}$/i, '');
}

function canonicalFieldKey(attributes) {
  return normalizeFieldKey(
    attributes.name ||
    attributes['data-targetproperty'] ||
    attributes['data-logical-name'] ||
    attributes['data-field-name'] ||
    attributes.id
  );
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => {
    if (value === '' || value === null || value === undefined) return false;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    return true;
  }));
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

function buildLabels(formHtml) {
  const labelsByFor = new Map();
  const unmatched = [];
  for (const match of formHtml.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const attributes = parseAttributes(match[1]);
    const label = plainText(match[2]);
    if (!label) continue;
    const target = String(attributes.for || '').trim();
    if (target) labelsByFor.set(target, label);
    else unmatched.push(label);
  }
  return { labelsByFor, unmatched };
}

function fieldCopy(attributes, labelsByFor) {
  const id = String(attributes.id || '').trim();
  return compact({
    label: plainText((id && labelsByFor.get(id)) || attributes['aria-label'] || attributes['data-label'] || ''),
    placeholder: plainText(attributes.placeholder || ''),
    hint: plainText(attributes.title || attributes['aria-description'] || '')
  });
}

function buildFormSource(formHtml) {
  const { labelsByFor, unmatched } = buildLabels(formHtml);
  const fields = {};
  const captured = new Set();

  for (const match of formHtml.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const attributes = parseAttributes(match[1]);
    const key = canonicalFieldKey(attributes);
    if (!key) continue;

    const field = fieldCopy(attributes, labelsByFor);
    const options = {};
    let optionIndex = 0;
    for (const optionMatch of match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) {
      const optionAttributes = parseAttributes(optionMatch[1]);
      const optionText = plainText(optionMatch[2]);
      if (!optionText) continue;
      optionIndex += 1;
      const optionKey = safeFileKey(optionAttributes.value || `option_${String(optionIndex).padStart(3, '0')}`) || `option_${String(optionIndex).padStart(3, '0')}`;
      options[optionKey] = optionText;
      captured.add(optionText);
    }
    fields[key] = compact({ ...field, options });
  }

  for (const match of formHtml.matchAll(/<(input|textarea)\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[2]);
    const type = String(attributes.type || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;

    const key = canonicalFieldKey(attributes);
    if (!key) continue;

    const field = fieldCopy(attributes, labelsByFor);
    const id = String(attributes.id || '').trim();
    const label = id ? labelsByFor.get(id) : '';

    if ((type === 'checkbox' || type === 'radio') && label) {
      const choiceKey = safeFileKey(attributes.value || id || `${type}_${Object.keys(fields[key]?.options || {}).length + 1}`);
      const previous = fields[key] || {};
      fields[key] = compact({
        ...previous,
        ...field,
        options: { ...(previous.options || {}), [choiceKey]: label }
      });
      captured.add(label);
    } else if (!fields[key]) {
      fields[key] = field;
    }
  }

  Object.values(fields).forEach(field => {
    if (!field || typeof field !== 'object') return;
    ['label', 'placeholder', 'hint'].forEach(key => {
      if (field[key]) captured.add(field[key]);
    });
  });

  const buttons = {};
  let buttonIndex = 0;
  for (const match of formHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attributes = parseAttributes(match[1]);
    const copy = plainText(match[2]);
    if (!copy) continue;
    const type = String(attributes.type || 'submit').toLowerCase();
    const key = type === 'submit' && !buttons.submit ? 'submit' : `button_${String(++buttonIndex).padStart(3, '0')}`;
    buttons[key] = copy;
    captured.add(copy);
  }

  for (const match of formHtml.matchAll(/<input\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1]);
    const type = String(attributes.type || '').toLowerCase();
    if (!['submit', 'button', 'reset'].includes(type)) continue;
    const copy = plainText(attributes.value || '');
    if (!copy) continue;
    const key = type === 'submit' && !buttons.submit ? 'submit' : `button_${String(++buttonIndex).padStart(3, '0')}`;
    buttons[key] = copy;
    captured.add(copy);
  }

  const texts = {};
  let textIndex = 0;
  const addText = (value) => {
    const copy = plainText(value);
    if (!copy || captured.has(copy) || copy.length < 2) return;
    captured.add(copy);
    textIndex += 1;
    texts[`text_${String(textIndex).padStart(3, '0')}`] = copy;
  };

  unmatched.forEach(addText);
  for (const match of formHtml.matchAll(/<(p|legend|small|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    addText(match[2]);
  }

  const messages = {};
  let messageIndex = 0;
  for (const match of formHtml.matchAll(/<[\w:-]+\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1]);
    for (const [name, value] of Object.entries(attributes)) {
      if (!/(?:message|error|validation|required)/i.test(name)) continue;
      const copy = plainText(value);
      if (!copy || captured.has(copy) || copy.length < 2) continue;
      captured.add(copy);
      messageIndex += 1;
      messages[`message_${String(messageIndex).padStart(3, '0')}`] = copy;
    }
  }

  return compact({ fields, buttons, texts, messages });
}

await fs.mkdir(outputDir, { recursive: true });
const publishedPath = `/api/v1.0/orgs/${encodeURIComponent(orgId)}/eventmanagement/events/published`;
const publishedUrl = apiUrl(publishedPath);
if (webappId) publishedUrl.searchParams.set('webappId', webappId);
const publishedResponse = await fetchWithTimeout(publishedUrl, { headers: { Accept: 'application/json' } });
if (!publishedResponse.ok) throw new Error(`published events: HTTP ${publishedResponse.status}`);
const events = asArray(await publishedResponse.json(), 'published events');

let synced = 0;
for (const listedEvent of events) {
  const key = eventKey(listedEvent);
  if (!key) continue;

  const root = `/api/v1.0/orgs/${encodeURIComponent(orgId)}/eventmanagement/events/${encodeURIComponent(key)}`;
  const response = await fetchWithTimeout(apiUrl(root), { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    console.warn(`${key}: event detail returned HTTP ${response.status}; skipping extended form copy.`);
    continue;
  }

  const payload = await response.json();
  const event = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const registrationForm = firstText([event?.registrationForm, event?.eventRegistrationForm]);
  if (!registrationForm) continue;

  const formKey = extractFormKey(registrationForm, key);
  const formHtml = await resolveFormHtml(registrationForm, `${key} registration form`);
  const source = buildFormSource(formHtml);
  if (!formKey || Object.keys(source).length === 0) {
    console.warn(`${key}: registration form has no extractable visible copy.`);
    continue;
  }

  await fs.writeFile(path.join(outputDir, `${formKey}.source.json`), `${JSON.stringify(source, null, 2)}\n`, 'utf8');
  console.log(`Extended form source synced: ${formKey}`);
  synced += 1;
}

console.log(`Extended form copy sync complete: ${synced} form(s).`);
