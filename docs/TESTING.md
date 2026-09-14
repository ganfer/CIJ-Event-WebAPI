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
| Security URL policy | Accepted Microsoft URLs; HTTP, credentialed, local and lookalike rejection; path constraints |
| Event ID validation | Trim, empty, control-character and length cases |
| API wrapper | filters, ID normalization, invalid ID, HTTP error redaction, fail-soft optional data, invalid configuration |
| Timeouts/SSRF | abort signal, stalled fetch and server destination validation |
| Local server | static page, headers, supported/unsupported locales and traversal attempt |
| Repository integrity | JS syntax, JSON parsing, locale consistency, required files and local links |
| Theme | light/dark contrast tokens and CSS behavior |
| Build | clean static copy and exclusion of local `config.js` |

## Live integration checks

`npm run check:translations` compares published events to committed translation files. Deployment also performs an Events API/CORS smoke test. Both need configured Customer Insights values and cannot run in an unconfigured local clone.

## Not covered automatically

- Real FormLoader rendering/submission against a test Dynamics environment
- Browser end-to-end behavior in all eight locales
- Microsoft API schema changes
- Visual screenshot regression comparison (CI captures previews but does not pixel-diff them)
- Accessibility testing with assistive technology
- Load/rate-limit behavior

These are remaining test-quality risks, not claims of implementation.

## Manual release smoke test

1. Open event list in light/dark/system modes.
2. Switch each supported language and reload.
3. Search and use each sort option.
4. Open an event with description, image, location, sessions and speakers.
5. Open an event without each optional field.
6. Submit a non-production registration and verify the Dynamics record/process.
7. Test an invalid/missing event ID and an API outage.
8. Inspect console/network output and confirm no true secrets or attendee payloads are logged by repository code.
