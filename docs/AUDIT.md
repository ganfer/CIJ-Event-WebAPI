# Repository audit

Audit date: 2026-09-13. Source of truth: `main` at `e6db52f`, audited on branch `audit/repository-hardening-docs`.

## Executive summary

The project is a small static Microsoft event portal, not the multi-tier Astro/Worker/Entra/Dataverse portal described as a possible audit target. Its limited runtime surface is a strength, but the initial code trusted form embed markup and server-fetched form URLs too broadly, lacked bounded API requests and had little behavior-level testing. The changes in this branch harden those boundaries without adding a backend or changing the public-event model.

No committed real token was found in the current tree or reachable `config.js` history; the historical configuration token was empty. Generated deployment configuration remains public by design.

## Scores after remediation

| Area | Score | Rationale |
| --- | ---: | --- |
| Security | 8/10 | XSS/SSRF boundaries, URL/ID validation, safe logs, headers, pinned Actions and clean npm audit; public client token and no production CSP remain architectural risks |
| Robustness | 8/10 | 15-second timeouts, shape checks, controlled errors and fail-soft optional data; live Microsoft schema/FormLoader behavior is not fully testable offline |
| Code quality | 8/10 | Redundant API-localization and detail-runtime monkey patches removed; modules remain classic global scripts and form localization is necessarily DOM-heavy |
| Architecture | 8/10 | Appropriately simple for public events and now accurately documented; server-side requirements would require a new BFF boundary |
| Test quality | 7/10 | 14 security/API/server tests plus integrity/theme/build checks; no real-browser E2E or Dynamics test environment |
| Documentation | 9/10 | README plus task-oriented architecture, API, auth, Dynamics, security, testing and operations docs match code; vendored SDK provenance remains incomplete |

## Prioritized findings

### Critical

None confirmed.

### High — remediated

| Problem | Files | Risk | Resolution |
| --- | --- | --- | --- |
| Arbitrary API-supplied form nodes and scripts were cloned/executed | `public/js/event-details.js` | Stored XSS if event/embed content is compromised | Rebuild minimal placeholder, strip arbitrary DOM/inline code and allow only approved HTTPS Microsoft form/loader URLs |
| CI fetched `data-cached-form-url` without destination validation | `scripts/sync-event-sources.mjs`, `scripts/sync-form-copy.mjs` | SSRF from GitHub runner to attacker/internal services | Validate Microsoft HTTPS host/path before fetch; regression tests added |

### Medium — remediated

| Problem | Files | Risk | Resolution |
| --- | --- | --- | --- |
| External requests had no consistent timeout | API wrapper and sync scripts | Hanging page/job and poor failure isolation | 15-second abort signals |
| Raw SDK errors were logged | API wrapper/pages | Token-bearing Request URL disclosure in console | Structured operation/code/status diagnostics only |
| All detail content waited for optional sessions/speakers | detail runtime | Slow optional API blocked usable event/form | Render core/form first; load optional sections independently |
| Error wrapper converted outages to empty/not-found data | API wrapper | Misleading status and hidden operational failures | Typed safe errors; 404 differentiated from general failure |
| Express 4 dependency had known `qs` advisories | package/lock/server | Local tooling dependency exposure | Express 5 plus patched dependency tree; audit now clean |
| GitHub Actions used mutable major-version tags | workflows | Supply-chain tag movement | Pin actions to immutable commit SHAs with version comments |

### Low — remediated

| Problem | Files | Risk | Resolution |
| --- | --- | --- | --- |
| Generated `_site/` was not ignored | `.gitignore` | Accidental artifacts/config commits | Ignore `_site/` |
| Event translation and resilience behavior used layered global monkey patches | three runtime files | Duplicate work and fragile load order | Keep one localization path; merge resilient loader; delete obsolete patch files |
| Local/static compatible hosts lacked baseline headers | `server.js`, `public/_headers` | MIME sniffing, framing/referrer exposure | Add portable baseline headers and no-store configuration response |
| README implied more/less than actual architecture in places | README/docs | Incorrect maintenance/security assumptions | Replace with implementation-derived documentation |

### Remaining medium risks

| Problem | Files/scope | Risk | Recommendation |
| --- | --- | --- | --- |
| Public web-application token | deployed `js/config.js`, Events API query | Inspectable/reusable outside intended browser; origin restriction is not user authorization | Keep events public, isolate/rotate tokens; introduce a BFF only for confidential/user-specific data |
| No enforceable CSP on GitHub Pages | production responses | Reduced defense in depth against future XSS | Put site behind a controllable edge or Cloudflare and deploy an environment-specific tested CSP |
| Broad Azure CDN vendor boundary for legacy FormLoader | `security.js` | Another Azure CDN tenant plus compromised event content could satisfy suffix/path policy | Prefer current `*.dynamics.com` FormLoader; later add an exact configured loader-origin allowlist |
| Unofficial Google translation client | translation workflow | Availability, terms, supply-chain and public content processor risk | Review vendor/privacy acceptance; move to a supported API if required |

### Remaining low/optional risks

| Problem | Scope | Recommendation |
| --- | --- | --- |
| Vendored Microsoft SDK has no recorded upstream version/hash | `PublicApi.bundle.js` | Record download date/version/SHA-256 and review diffs on replacement |
| No browser E2E/live form regression suite | UI/FormLoader | Add Playwright against a dedicated non-production Customer Insights environment |
| No automated accessibility scan | UI | Add axe/Lighthouse and manual keyboard/screen-reader testing |
| Locale list is repeated in several files | localization/server/workflow | Centralize only if build tooling can consume one source without complicating static runtime |
| Translation workflow writes directly to `main` | workflow | Optionally create bot PRs for human review of machine-translated content |

## Dependency review

- Runtime/local server dependency: Express 5.
- No frontend npm framework or browser dependency is bundled from npm.
- `npm audit --omit=dev`: zero known vulnerabilities after lockfile update.
- The vendored SDK and Python transitive dependencies are outside npm audit coverage.

## Dead links and routing

Local HTML references are verified by `npm run check`. No obsolete application API route was found because the app owns no API. Documentation now avoids previously assumed magic-link/portal endpoints. External Microsoft documentation URLs were checked during the audit.

## Files removed as obsolete

- `public/js/event-grid-translations.js`
- `public/js/event-details-translations.js`
- `public/js/event-details-runtime-fix.js`

Their behavior duplicated localization already performed by `api-wrapper.js` or overrode the main loader after definition. Equivalent behavior now exists once in the primary code path.
