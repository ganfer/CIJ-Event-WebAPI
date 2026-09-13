# Security model

## Scope and trust boundaries

The portal is anonymous and public. Security controls protect a static browser app, CI automation and the boundary to Microsoft; they do not provide user authentication or confidential event authorization.

Untrusted inputs include query strings, API responses, event rich text, image URLs, form embed markup, translation output and all visitor form input.

## What must never reach the frontend

- Entra client secrets, private keys or certificates
- Dataverse access/refresh tokens
- Cloudflare/GitHub deployment tokens
- passwords and connection strings
- unrestricted service API keys
- private contact, attendee, registration or authorization data
- internal error stacks or server response bodies

Anything under `public/`, generated into `_site/` or assigned to a browser build variable is public.

## Web-application token

The Customer Insights `emApplicationtoken` is client-visible by Microsoft's static portal design. It is not user authentication and cannot protect confidential data. Restrict the related web application to intended origins, isolate environments and rotate/remove obsolete tokens. Moving it from Git into a GitHub secret prevents source-history disclosure but not runtime inspection.

## Input and output controls

- Event IDs are trimmed, length-bounded and reject control characters before SDK use.
- The SDK URL-encodes path/query values.
- API list/detail response shapes are checked before rendering.
- Text uses `textContent`.
- Rich event HTML uses a tag allowlist and strips attributes; links permit only HTTP(S)/mailto and get `noopener noreferrer`.
- Images require HTTPS and send no referrer.
- Registration markup is rebuilt from four approved attributes; arbitrary nodes, inline scripts and event handlers are discarded.
- Form API/cached URL hosts and paths and FormLoader hosts/paths are allowlisted.

## SSRF

Browser requests are constrained to configured Microsoft endpoints. CI source synchronization validates `EVENTS_BASE_URL` and every cached form URL before server-side fetches. HTTP, credentialed, private/local and lookalike hosts are rejected. All Node fetches time out after 15 seconds.

## XSS and content security policy

The primary XSS controls are DOM construction, sanitization and rejecting arbitrary form scripts. A strict CSP is not committed because Microsoft form endpoints/assets differ by environment and GitHub Pages cannot set custom headers directly. Configure and test an environment-specific CSP at Cloudflare or another controllable edge. Avoid `unsafe-inline` and broad wildcard sources where possible.

## CSRF, CORS and rate limiting

There is no state-changing application endpoint or cookie session, so application-level CSRF is not applicable. Microsoft owns CORS and submission controls for the Events API/FormLoader. The static app has no rate limiter; Microsoft/hosting controls apply. A future owned API must add explicit origin policy, CSRF protection where cookies are used, and per-operation rate limits.

## Sessions and cookies

No cookies or sessions exist. Only theme (`eventPortalTheme`) and locale (`userLocale`) preferences are stored in `localStorage`; neither contains identity or personal data.

## Security headers

The local server and `public/_headers` set `nosniff`, frame denial, no-referrer and restrictive camera/microphone/geolocation permissions. `_headers` works on compatible static hosts such as Cloudflare Pages but not GitHub Pages.

## Logging

Browser API diagnostics contain only operation, error category and numeric HTTP status. Raw SDK errors are avoided because Request/Response objects can include the token-bearing URL. CI logs use event identifiers/public titles where required for translation diagnostics but do not print tokens, response bodies or attendee data.

## Personal data and external processors

Visitors submit form fields directly to Microsoft. The portal does not persist or log them. Event/speaker content and visible form copy are stored in the repository and sent to Google Translate through `googletrans` during automation. Confirm that this public content flow is acceptable for the deployment's privacy policy and vendor governance.

## Supply chain

- npm uses a committed lockfile and CI uses `npm ci`.
- GitHub Actions are pinned to immutable commit SHAs with version comments.
- Production dependencies are audited in CI.
- `PublicApi.bundle.js` is vendored; its upstream version/hash is not documented and should be verified when Microsoft publishes an update.
- `googletrans` is exactly version-pinned but is an unofficial translation client with transitive dependencies; a supported translation API is a future hardening option.

## Incident response

If a true secret enters Git history, rotate it first, remove it from current files, assess logs/artifacts/forks and then decide whether history rewriting is justified. If the public web-application token is abused, rotate the Customer Insights web application token and confirm origin restrictions.
