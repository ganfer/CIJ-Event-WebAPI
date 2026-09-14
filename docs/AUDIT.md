# Repository audit

Audit date: 2026-09-14. Current source of truth: `main` after the revert in PR #35. This follow-up deliberately leaves the working browser Event API/FormLoader path unchanged.

## Executive summary

The project is a small static Customer Insights - Journeys event portal. It has no Astro runtime, production Node backend, Cloudflare Worker, Entra login, session or direct Dataverse Web API client.

A previous broad hardening change replaced the event/form runtime and caused events and registration forms not to load. PR #35 restored the working Microsoft-compatible path. The current remediation therefore isolates changes to dependencies, local-server behavior, CI-side outbound requests, supply-chain pinning, tests and documentation.

No real production configuration is committed. The deployed Customer Insights web-application token remains client-visible by design.

## Scores after this focused remediation

| Area | Score | Rationale |
| --- | ---: | --- |
| Security | 6/10 | CI SSRF controls, pinned Actions, patched npm tree and rich-text sanitization; returned form scripts, public client token, raw browser SDK errors and missing production CSP remain |
| Robustness | 7/10 | Core event/form rendering is isolated from optional calls and CI requests time out; browser API requests still have no application timeout |
| Code quality | 7/10 | Small static codebase and checks; classic globals and compatibility override scripts remain |
| Architecture | 8/10 | Static design is appropriate for anonymous public events and accurately documented |
| Test quality | 7/10 | Runtime regression, CI network, server, integrity and theme tests; no full live FormLoader E2E submission suite |
| Documentation | 9/10 | README and task-oriented docs describe the implemented current state and separate recommendations |

## Prioritized findings

### Critical

None confirmed.

### High — remediated

| Problem | Files | Risk | Resolution |
| --- | --- | --- | --- |
| CI fetched configurable/cached form URLs without destination validation | `scripts/sync-event-sources.mjs`, `scripts/sync-form-copy.mjs` | SSRF from a privileged GitHub runner | Allow only HTTPS Dynamics API/form destinations and add regression tests |

### High — remaining

| Problem | Files/scope | Risk | Recommendation |
| --- | --- | --- | --- |
| Returned `registrationForm` nodes and scripts are cloned/executed | `public/js/event-details.js` | A compromised trusted Customer Insights/form boundary could execute script in the portal origin | Keep administrative access narrow; capture real embed variants and introduce a tested sanitizer/loader policy only with full FormLoader E2E coverage |
| Public web-application token | deployed `js/config.js`, Events API query | Inspectable and reusable; origin restriction is not visitor authorization | Keep events public, isolate/rotate tokens and add a backend only for confidential/user-specific data |

### Medium — remediated

| Problem | Files | Risk | Resolution |
| --- | --- | --- | --- |
| Express 4 dependency carried `qs` advisories | package/lock/server | Local tooling dependency exposure | Upgrade to Express 5 and adapt routes; verify audit |
| GitHub Actions used mutable version tags | workflows | Supply-chain tag movement | Pin Actions to immutable commit SHAs with version comments |
| Node synchronization requests had no timeout | scripts | Hanging jobs and weak failure isolation | Apply 15-second abort signals |
| Generated `_site/` was not ignored | `.gitignore` | Accidental build/config commits | Ignore the build directory |

### Medium — remaining

| Problem | Files/scope | Risk | Recommendation |
| --- | --- | --- | --- |
| Browser SDK errors can include token-bearing Request objects in console | `public/js/api-wrapper.js` | Client-visible token copied into logs/issues | Replace with redacted structured diagnostics in a dedicated, regression-tested runtime PR |
| Browser Events API requests have no application timeout | `public/js/api-wrapper.js` | Loading can hang during network/service degradation | Add an SDK-compatible timeout only after production-like tests |
| No enforceable security headers/CSP on GitHub Pages | production responses | Less defense in depth | Use a controllable edge/static host and test exact Microsoft origins |
| Unofficial Google translation client | translation workflow | Availability, terms, content-processing and supply-chain risk | Review vendor/privacy acceptance or move to a supported translation API |

### Low/optional

| Problem | Scope | Recommendation |
| --- | --- | --- |
| Vendored SDK has no recorded upstream version/hash | `PublicApi.bundle.js` | Record provenance and compare replacements |
| No full browser E2E/live form suite | UI/FormLoader | Add a dedicated non-production Dynamics environment and safe test registration |
| No automated accessibility scan | UI | Add axe/Lighthouse plus manual keyboard/screen-reader testing |
| Locale list is repeated | localization/server/workflows | Centralize only if it does not complicate the static runtime |
| Translation workflow writes directly to `main` | workflow | Optionally produce reviewable bot PRs |

## Regression lesson

Opaque web-application tokens must be passed unchanged; tests now cover tokens longer than 200 characters. The Microsoft form holder, regional FormLoader URL and compatibility script order are also locked by behavior tests. Future browser hardening must be incremental and must prove that an event card, detail page and real form still render before merge.

## Dependency review

- Production npm dependency: Express 5 for the local-only server.
- No frontend npm framework is shipped.
- CI uses the committed lockfile and audits production dependencies.
- Vendored browser SDK and Python dependencies remain outside npm audit coverage.

## Dead links and routing

`npm run check` verifies local HTML assets and Markdown links. The app owns no obsolete `/api/*` routes. Unknown HTML navigation falls back to the list page only on the local Express server.

## Files intentionally retained

The following compatibility files remain because the currently working page depends on their order and behavior:

- `public/js/event-grid-translations.js`
- `public/js/event-details-translations.js`
- `public/js/event-details-runtime-fix.js`

No production browser Event API, grid, detail, form or HTML file is changed by this focused remediation.
