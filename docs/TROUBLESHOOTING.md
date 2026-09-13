# Troubleshooting

## Page loads but JavaScript fails

Confirm `public/js/config.js` exists locally and contains all required values. Run `npm run check` for syntax/reference errors. `BASE_URL` must be HTTPS and end in `dynamics.com`.

## 401 or 403 from Events API

- Check organization ID and web-application token.
- Ensure the exact scheme/hostname origin is registered.
- Do not include a path in the configured origin.
- Confirm the token belongs to the same Customer Insights environment.

## CORS failure

Compare the browser `Origin` header with Customer Insights web application configuration. GitHub project Pages uses `https://{owner}.github.io`, not `/repository-name`.

## No events

- Confirm at least one event is live.
- Publish it to the web-application portal destination.
- Remove or correct `WEBAPP_ID`.
- Inspect the published-events response without copying its token into an issue/log.

## Event details error

Check that `id` is present and is the event's readable ID. Control characters and values longer than 200 characters are rejected. A Microsoft 404 displays “Event not found”; timeouts and other failures show a generic message.

## Registration form rejected or absent

- Confirm the event has a published form.
- Regenerate the embed with current Customer Insights endpoints.
- Form API and cached form URLs must be HTTPS `*.dynamics.com` paths.
- FormLoader must be the Microsoft `FormLoader.bundle.js` or legacy `form-loader.js` path on an approved Microsoft/Azure CDN host.
- Allow the final site domain for external form hosting.

The app intentionally rejects arbitrary inline scripts and non-Microsoft embeds.

## Form styling/translation incomplete

Use browser tools after `d365mkt-afterformload`. Verify the form source file key matches its form ID and the selected locale exists. Dynamic Shadow DOM/forms may appear after retries.

## Translation workflow fails

- Confirm all `EVENTS_*` settings.
- Run `python scripts/diagnose-googletrans.py` in a disposable environment if translation connectivity is suspected.
- Inspect pending locales/source changes.
- Google may throttle or change the unofficial endpoint; do not weaken validation or print source credentials while diagnosing.

## CI fails on dependency audit

Run `npm ci && npm audit --omit=dev`. Update deliberately, review changelogs and tests, and commit both `package.json` and lockfile. Do not use `--force` blindly.

## Build contains no `config.js`

Expected. `npm run build` excludes local configuration. The deployment workflow creates `_site/js/config.js` afterward.

## `_headers` appears ineffective

GitHub Pages ignores the file. Cloudflare Pages and some other static hosts apply it. Verify production response headers with browser network tools or `curl -I`.
