# Configuration

## Browser configuration

`public/js/config.example.js` is the committed template. Copy it to ignored `public/js/config.js` for local development.

| Property | Required | Validation and use |
| --- | --- | --- |
| `BASE_URL` | Yes | Events API origin supplied by Customer Insights; CI/deployment requires HTTPS under `dynamics.com` |
| `ORG_ID` | Yes | Customer Insights organization ID passed to the SDK |
| `TOKEN` | Yes | Opaque Customer Insights web-application token; preserve it unchanged and do not impose an arbitrary length limit |
| `WEBAPP_ID` | No | Passed as published-event filter |

All four properties are public when used in a deployed static site. Do not extend this object with server secrets.

## GitHub Actions settings

| Setting | Kind | Required | Maps to |
| --- | --- | --- | --- |
| `EVENTS_BASE_URL` | Secret today | No | `BASE_URL` |
| `EVENTS_ORG_ID` | Secret | Yes | `ORG_ID` |
| `EVENTS_API_TOKEN` | Secret | Yes | `TOKEN` |
| `EVENTS_WEBAPP_ID` | Secret today | No | `WEBAPP_ID` |

Actions secrets prevent accidental repository/history exposure and log interpolation. They do not keep values confidential after the workflow deliberately writes them into the public Pages artifact.

## Environment separation

Use a separate Customer Insights web application per local, test and production origin. Restrict allowed origins, do not reuse true server credentials and remove obsolete web application records/tokens.

## Supported locales

`en-US`, `de-DE`, `it-IT`, `fr-FR`, `es-ES`, `pt-PT`, `pl-PL`, `cs-CZ`.

The canonical set currently appears in `localization.js`, `server.js`, workflow configuration and checks. `npm run check` detects mismatches. Switcher labels contain language names only, without flags/countries.

## Generated and ignored files

- `public/js/config.js`: local environment configuration; ignored.
- `_site/`: generated static build; ignored.
- `_site/js/config.js`: generated only by deployment.
- `public/translations/events/*.source.json`: generated public event content.
- `public/translations/forms/*.source.json`: generated visible form copy.

Review generated translation content before publishing if event copy is not intended to be public.
