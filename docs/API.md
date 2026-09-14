# API reference

This document describes code that actually exists. The application owns no JSON API and defines no `/api/*` route.

## Application-owned HTTP surface

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET`/`HEAD` | `/`, `/index.html` | None | Event list page |
| `GET`/`HEAD` | `/event-details.html?id={id}` | None | Event detail and registration page |
| `GET`/`HEAD` | `/js/*`, `/css/*`, `/assets/*`, `/locales/*`, `/translations/*`, `/translation/*`, `/lib/*` | None | Static resources |

On the local Express server, unknown HTML `GET` routes fall back to `index.html`; other unknown requests return 404. Static production hosts may behave differently. Unsupported locale filenames return 403 locally. These are static routes, not business APIs.

There are no application endpoints for authentication, magic links, sessions, events, registrations, cancellation or portal data.

## External Customer Insights calls used in browser code

All paths below are relative to `CONFIG.BASE_URL`. The Microsoft SDK adds `emApplicationtoken` as a query parameter and fills `{organizationId}` from configuration. CORS origin enforcement is performed by Microsoft.

### GET published events

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/published`

**Purpose:** load the event list.

**Authentication:** Customer Insights web-application token in `emApplicationtoken`; this is application identification, not visitor authentication.

**Query:** optional `businessUnitId` and `webappId`. Current UI passes only configured `WEBAPP_ID`.

**Response used:** an array containing `readableEventId`, `eventName`, `description`, dates, time zone, image and location-related properties when present.

**Failures:** non-2xx, network failure, timeout or a non-array data field produce a generic page error. Technical Request/Response objects are not logged.

**Security:** the response is untrusted. Cards use DOM `textContent`; description previews are converted to text; only HTTPS images load.

### GET event details

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}`

**Purpose:** load one event and its registration-form embed metadata.

**Input:** `readableEventId` originates in the page query string. It is trimmed, limited to 200 characters and rejected when empty or containing control characters. The SDK URL-encodes the path value.

**Response used:** event title, rich description, dates, time zone, image, building/room/address and `registrationForm`.

**Status handling:** 404 renders “Event not found”; other errors render a generic loading error. Requests time out after 15 seconds.

**Security:** rich text permits a small tag allowlist and removes all attributes except approved `https`/`mailto` link targets. Registration markup is reconstructed from an approved placeholder instead of cloned/executed wholesale.

### GET event sessions

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/sessions`

**Purpose:** optional agenda cards.

**Response used:** IDs, name, start/end, summary/description/objectives and speaker names.

**Failure behavior:** fail-soft to an empty collection; the event and form remain usable.

### GET event speakers

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/speakers`

**Purpose:** optional speaker cards.

**Response used:** ID, name, title, biography and image URL.

**Failure behavior:** fail-soft to an empty collection. Biography is rendered as text and images require HTTPS/no-referrer.

## Microsoft FormLoader traffic

The repository does not implement or directly call a registration endpoint. It loads Microsoft's `FormLoader.bundle.js` from the approved embed. FormLoader then fetches a form from the approved `data-form-api-url`/`data-cached-form-url` and submits attendee data to Microsoft.

Exact request bodies and status codes belong to the Microsoft component and may change independently; repository code does not inspect or persist them. The app observes `d365mkt-*` browser events only for styling/localization.

## CI-only external calls

`scripts/sync-event-sources.mjs` and `scripts/sync-form-copy.mjs` call the same published list and detail endpoints. The former also calls sessions and speakers. `scripts/check-event-translations.mjs` calls the published list.

CI requests:

- require `EVENTS_ORG_ID` and `EVENTS_API_TOKEN`;
- validate that the base/cached-form destinations are HTTPS Microsoft Dynamics URLs;
- use 15-second request timeouts;
- avoid logging tokens and response bodies;
- write only event/form source and translation content, never attendee submissions.

## Not applicable in the current architecture

- There is no Dataverse OData query, so `$select`, `$filter` and `$expand` cannot be added to this client.
- There is no endpoint authorization model, CSRF token, rate limiter or session middleware because there is no owned API/session.
- There is no cancellation, re-registration or session-registration API in application code.
