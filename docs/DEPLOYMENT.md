# Deployment

## Current: GitHub Pages

`.github/workflows/deploy-pages.yml` runs on `main` and manually. It:

1. installs with `npm ci`;
2. runs tests;
3. builds `_site/`;
4. validates/injects browser configuration;
5. smoke-tests the published Events API and CORS origin;
6. uploads and deploys the Pages artifact.

Enable Pages with GitHub Actions as its source and configure the four `EVENTS_*` settings described in [CONFIGURATION.md](CONFIGURATION.md).

GitHub Pages does not apply rules from `public/_headers`. Configure response headers at a proxy/CDN if stronger production headers are required.

## Static hosting elsewhere

Run `npm run build`, create `_site/js/config.js` from environment configuration without logging values, and deploy `_site/`. Register the final browser origin and external form-hosting domain in Customer Insights.

## Cloudflare Pages

Current code needs no Worker. Configure a static Pages project with:

- build command: `npm ci && npm test && npm run build`;
- output directory: `_site`;
- Node version: 22 or newer;
- a controlled step/function to create `_site/js/config.js` from `EVENTS_*` settings.

Cloudflare Pages applies the generated `_headers` file, including `no-store` for `js/config.js`. The file intentionally does not define a Content Security Policy because the exact regional Events API, FormLoader, cached form and form asset origins are environment-specific. Add a tested CSP for the concrete production environment rather than a broad policy that silently breaks registration.

## Cloudflare Worker option

No Worker exists today. A Worker becomes useful only for server-held credentials, user-specific APIs, authorization, rate limiting, caching or response shaping. Adding one changes the threat model and requires Wrangler/bindings/routes plus tests. Static form submission may still go directly from FormLoader to Microsoft.

## Other backend targets

For Node/Docker, Azure Functions, Azure App Service or another serverless platform, keep rendering/static files and port only new server adapters. Environment access, HTTP routing, session/replay storage, logging and rate limiting are platform-specific; core validation and authorization should remain platform-neutral.

## Rollback

GitHub Pages deploys an immutable artifact per workflow run. Revert the responsible commit on a new branch/PR and deploy the corrected `main`; do not rewrite shared history or restore an artifact containing obsolete credentials.
