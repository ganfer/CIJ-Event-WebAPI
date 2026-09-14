# API reference

This document describes the implemented code. The application owns no JSON API and defines no `/api/*` route.

## Application-owned HTTP surface

| Method | Path | Authentication | Result |
| --- | --- | --- | --- |
| `GET`/`HEAD` | `/`, `/index.html` | None | Event-list page |
| `GET`/`HEAD` | `/event-details.html?id={id}` | None | Event detail and registration page |
| `GET`/`HEAD` | `/js/*`, `/css/*`, `/assets/*`, `/locales/*`, `/translations/*`, `/translation/*`, `/lib/*` | None | Static resources |

The local Express server returns:

- `200` for existing pages/assets and supported locale files;
- `400` for malformed locale filenames;
- `403` for unsupported locales;
- `404` for unknown non-HTML resources or unsupported methods;
- `500` with a generic message for unexpected local-server errors.

Unknown HTML `GET`/`HEAD` routes fall back to `index.html` locally. Static production hosts may behave differently.

There are no application endpoints for authentication, magic links, sessions, events, registrations, cancellation or portal data.

## External Customer Insights calls used by the browser

All paths are relative to `CONFIG.BASE_URL`. The vendored Microsoft SDK adds `emApplicationtoken` as a query parameter and fills `{organizationId}` from configuration. Microsoft enforces the configured browser origin through CORS.

### GET published events

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/published`

**Purpose:** Load public events for the list.

**Authentication/authorization:** The Customer Insights web-application token identifies the web application but does not authenticate a visitor. Returned events must therefore be considered public.

**Query parameters:**

- `businessUnitId` when supplied by a caller;
- `webappId` from optional `CONFIG.WEBAPP_ID`.

**Response fields consumed:** `readableEventId`, title/description, start/end, time zone, image and location-related values.

**Failure behavior:** The current sample-compatible wrapper catches SDK/network/non-2xx errors, renders a translated error element and returns an empty list. The page consequently shows a generic load/no-events state.

**Security:** Card strings use `textContent`; the description preview is converted to plain text. Image URLs accept HTTP or HTTPS in the current implementation.

### GET event details

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}`

**Purpose:** Load one event plus its `registrationForm` embed.

**Input:** `readableEventId` comes from the `id` query parameter and is passed to the Microsoft SDK. The current browser wrapper does not trim or length-bound it; the SDK encodes it into the path.

**Response fields consumed:** Event title, rich description, dates, time zone, image, building/room/address and `registrationForm`.

**Failure behavior:** The wrapper catches failures and returns `null`. The detail runtime displays the API error and/or event-not-found state. Browser API calls currently have no application-defined timeout.

**Security:** Rich descriptions pass through a formatting-element allowlist. Registration embed handling is described separately below.

### GET event sessions

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/sessions`

**Purpose:** Load optional agenda cards.

**Response used:** IDs, name, start/end, summary/description/objectives and speaker names.

**Failure behavior:** Returns an empty array after logging a warning. `event-details-runtime-fix.js` prevents this optional request from blocking the event or registration form.

### GET event speakers

**Path:** `/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/speakers`

**Purpose:** Load optional speaker cards.

**Response used:** ID, name, title, biography and image URL.

**Failure behavior:** Returns an empty array. Biography is rendered as text; current images accept HTTP or HTTPS.

## Microsoft FormLoader traffic

The repository does not own a registration endpoint or request body. The event response supplies a `registrationForm` HTML fragment. For compatibility with the Microsoft sample, the app:

1. parses the fragment;
2. clones its top-level non-script elements;
3. recreates external or inline script elements in the page;
4. lets FormLoader fetch, render and submit the form directly to Microsoft.

Exact FormLoader requests, response codes and attendee payloads belong to Microsoft's component and may change independently. Repository code observes `d365mkt-*` events for styling/localization but does not persist submissions.

Because the embed can execute returned scripts, only trusted Customer Insights administrators/service output may provide it. See [SECURITY.md](SECURITY.md).

## CI-only external calls

`scripts/sync-event-sources.mjs`, `scripts/sync-form-copy.mjs` and `scripts/check-event-translations.mjs` call the published list; synchronization also calls detail, sessions and speakers endpoints.

These Node-side calls:

- require `EVENTS_ORG_ID` and `EVENTS_API_TOKEN`;
- preserve the opaque token without an arbitrary length restriction;
- validate the Events API base as HTTPS on a Dynamics hostname;
- fetch cached forms only from HTTPS Dynamics `/digitalassets/forms/` URLs;
- use a 15-second timeout;
- do not write attendee submissions.

## Not implemented

- Dataverse OData queries (`$select`, `$filter`, `$expand`)
- user authentication or authorization
- cancellation, re-registration or session-registration operations
- application-owned rate limiting, CSRF handling or sessions
