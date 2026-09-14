# Testing

## Full local verification

```bash
npm ci
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

## Automated coverage

| Area | Coverage |
| --- | --- |
| Runtime regression | Long opaque Customer Insights token reaches the SDK unchanged |
| Registration compatibility | Realistic Dynamics holder attributes and regional FormLoader URL are preserved |
| Script integration | Event grid/detail compatibility scripts remain in the required order |
| CI outbound security | HTTPS Dynamics URL policy, cached-form path policy and request timeout |
| Local server | Pages, security headers, supported/unsupported locales and traversal attempt |
| Repository integrity | JavaScript syntax, JSON parsing, locale consistency, required files and local documentation/assets |
| Theme | Light/dark contrast tokens and CSS behavior |
| Build | Static copy and exclusion of local `config.js` |

The runtime regression tests intentionally exercise the existing sample-compatible event/form path without changing production browser files.

## Live integration checks

`npm run check:translations` compares published events with committed translation files. The deployment workflow also checks the Events API status, response JSON and CORS origin. Both require configured Customer Insights values and cannot run in an unconfigured clone.

## Not covered automatically

- Full FormLoader rendering/submission against a dedicated Dynamics test environment
- Browser end-to-end behavior in all eight locales
- Visual pixel regression (CI captures previews but does not compare them)
- Microsoft API/schema changes
- Accessibility with assistive technology
- Load and rate-limit behavior

## Manual release smoke test

1. Open the event list and confirm at least one event card appears.
2. Search and use every sort option.
3. Open a real event detail page.
4. Confirm the Microsoft form renders its expected fields and submit button.
5. Test light, dark and system themes.
6. Switch every supported language.
7. Submit only a non-production registration and verify its Dynamics result.
8. Check an invalid/missing event ID and an API outage.
9. Ensure shared logs/screenshots contain no true secret or attendee payload.

The event-card and form-render checks are mandatory whenever `api-wrapper.js`, `event-details*.js`, `event-grid*.js`, the HTML script order, the Microsoft SDK bundle or deployment configuration changes.
