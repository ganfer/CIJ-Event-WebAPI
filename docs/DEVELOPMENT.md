# Development

## Setup

```bash
npm ci
cp public/js/config.example.js public/js/config.js
npm start
```

Node 22+ is required. The Express server serves only `public/`, adds baseline development headers and returns the event list for unknown HTML navigation requests. Do not deploy it as the production app without a separate production review.

## Change guidelines

- Treat URL parameters and Microsoft responses as untrusted.
- Prefer `textContent`, DOM construction and explicit attribute allowlists.
- Validate identifiers at trust boundaries, but never normalize or truncate opaque credentials.
- Add request timeouts to every new external call.
- Do not log full errors when they may hold a Request/Response URL containing `emApplicationtoken`.
- Keep optional event enhancements fail-soft.
- Add a regression test with every bug/security fix.
- Do not copy architecture or business logic from unrelated repositories.

## Add a portal locale

1. Add `public/locales/translation.{locale}.json` with the exact English key set.
2. Add the locale to `supportedLocales` in `public/js/localization.js`.
3. Add it to `allowedLocales` in `server.js` and workflow validation.
4. Update translation scripts and documentation.
5. Run `npm test`.

## Add event/form translation content

Run the `Event Translation Sync` workflow or invoke the sync/translation scripts with environment variables. English `.source.json` files are source-of-truth snapshots; locale JSON is generated and may contain pending markers.

## Add browser behavior

Put page-specific code in the corresponding page module and shared policy in a small shared helper. The current event grid/detail translation and resilience scripts are compatibility layers with tested load order. Consolidate them only after equivalent real Event API and FormLoader behavior is proven.

## Add a backend function

There is no backend framework to extend. First write a small architecture decision describing runtime, route contract, authentication, authorization, data minimization, CORS/CSRF, rate limiting, secrets, logs and deployment. Then add platform adapters around independently testable business logic.

## Pull requests

Create a branch from current `main`, make focused commits, run the full verification suite and describe behavior/security implications. Do not commit `public/js/config.js`, `_site/`, credentials or production response dumps.
