# Security model

## Scope and trust boundaries

The portal is anonymous and public. It is a static browser application, not an authenticated Dynamics portal. Its boundaries are:

- the untrusted visitor and URL query string;
- browser code and all files delivered by the static host;
- published event/form content administered in Customer Insights - Journeys;
- Microsoft's public Events API and FormLoader;
- the trusted GitHub Actions environment used for builds and translation synchronization.

## What must never reach the frontend

- Entra client secrets, private keys or certificates
- Dataverse access or refresh tokens
- Cloudflare/GitHub deployment tokens
- passwords, connection strings or unrestricted service keys
- private contact, attendee, registration or authorization data
- internal backend error details

Anything under `public/`, generated into `_site/` or assigned to browser configuration is public.

## Customer Insights web-application token

The `emApplicationtoken` is deliberately client-visible in Microsoft's static event-portal model. It identifies the configured web application; it is neither visitor authentication nor a confidential credential.

Store it in GitHub Actions only to keep environment-specific values out of Git history. The deployment writes it into `_site/js/config.js`, where every visitor can inspect it. Restrict the Customer Insights web application to intended origins, isolate environments and rotate obsolete tokens.

The token is opaque and must not be shortened, normalized or subjected to an arbitrary small length limit. A regression test protects long valid token values.

## Current browser controls

- Event cards and most metadata use DOM `textContent`.
- Card descriptions are reduced to plain text.
- Rich event descriptions use an allowlist of formatting elements, remove other attributes and retain only HTTP(S)/`mailto:` links.
- The Microsoft SDK builds and encodes request URLs.
- The detail runtime renders the core event and registration form before optional session/speaker data finishes.
- Missing session/speaker calls degrade to empty optional sections.

## Registration-form trust boundary

For compatibility with Microsoft's returned event embed, `event-details.js` clones top-level non-script elements and recreates external or inline scripts from `registrationForm`. This is the code path that currently renders the production form and is protected by a regression test.

Consequences:

- Customer Insights event/form administrators and returned embed content are trusted to supply safe markup and scripts.
- A compromise of that administrative/service boundary could execute script in the portal origin.
- The portal must never accept visitor-controlled embed markup.

A previous attempt to replace the embed with a narrower reconstruction broke event/form loading and was reverted. Future hardening must first capture real embed variants in a non-production environment and pass an end-to-end FormLoader test.

## Server-side request forgery and timeouts

GitHub Actions scripts run server-side and therefore require a stricter outbound policy than browser code. `scripts/lib/http.mjs`:

- accepts only HTTPS `*.dynamics.com` Events API bases without embedded credentials;
- permits cached form fetches only for HTTPS Dynamics hosts and `/digitalassets/forms/` paths;
- applies a 15-second abort timeout.

These rules protect the CI runner from an attacker-controlled `EVENTS_BASE_URL` or cached-form URL. They do not alter browser API or FormLoader behavior.

## CORS, CSRF and rate limiting

There is no state-changing application endpoint and no cookie session, so application-level CSRF does not apply. Microsoft owns CORS and form-submission controls. The static site has no rate limiter; Microsoft and hosting limits apply.

A future owned API must add explicit origin handling, authorization, input validation, timeouts, abuse controls and CSRF protection when cookie authentication is used.

## Sessions, cookies and local storage

No visitor authentication, server session or application cookie exists. Theme (`eventPortalTheme`) and locale (`userLocale`) preferences are stored in `localStorage`; neither identifies a user.

## Response headers and CSP

The local Express development server sends `nosniff`, frame denial, no-referrer and restrictive permissions headers and disables `X-Powered-By`. GitHub Pages cannot apply custom response headers from this repository, so production does not currently receive those controls.

A strict CSP is not committed because regional Events API, FormLoader and form asset origins vary. Put the site behind a controllable edge or another static host and test an environment-specific policy before enforcement.

## Logging

CI scripts do not print tokens or response bodies. Browser error paths in the retained sample-compatible wrapper can log SDK error objects; those objects may contain a request URL with the client-visible web-application token. Avoid copying browser-console output into public issues and sanitize this path only with a regression-tested runtime change.

## Personal data and external processors

Visitors submit attendee fields directly to Microsoft's FormLoader. Repository code does not persist those submissions. Published event/speaker content and visible form copy are stored in Git and sent through the unofficial `googletrans` client during synchronization. Confirm that this public-content processing is acceptable for the deployment's privacy and vendor-governance requirements.

## Supply chain

- npm uses a committed lockfile and CI uses `npm ci`.
- GitHub Actions are pinned to immutable commit SHAs with version comments.
- CI audits production npm dependencies.
- `PublicApi.bundle.js` is vendored; record and verify its upstream version/hash when it is replaced.
- `googletrans` is exactly version-pinned but remains an unofficial client with independent availability and supply-chain risk.

## Incident response

If a true secret enters Git history, rotate it first, remove it from current files, assess logs/artifacts/forks and then decide whether history rewriting is justified. If the client-visible web-application token is abused, rotate it and confirm the Customer Insights origin configuration.
