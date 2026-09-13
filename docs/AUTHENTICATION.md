# Authentication and sessions

## Current state

Visitors are anonymous. The repository implements no login, magic link, callback, account lookup, session, cookie, logout or role/permission check.

The `emApplicationtoken` used by the Events API identifies a Customer Insights web application and participates in Microsoft's origin/CORS model. It does **not** authenticate an individual and must not be used as proof that a visitor owns an email address, contact or registration.

There is no Entra ID/OAuth flow. No client ID, client secret, certificate, bearer token or refresh token belongs in the browser configuration.

## Consequences

- Every event returned by the public Events API is visible to anonymous visitors.
- Event IDs in URLs are selectors, not authorization checks.
- No endpoint may return user-specific data because no user identity exists.
- Registration is the Microsoft form's public submission flow, not a portal session.
- Magic-link expiry, replay protection, single use, session fixation, cookie flags and logout are not applicable to current code.

## Recommended design if authentication is added

This is a target-state recommendation only:

1. Add a server-side backend-for-frontend.
2. Generate high-entropy, short-lived, single-use magic-link tokens.
3. Store only a cryptographic token hash and consume it atomically.
4. Bind the result to a rotated session identifier.
5. Use `Secure`, `HttpOnly`, `SameSite=Lax` or stricter cookies with narrow `Path` and no broad `Domain` unless required.
6. Authorize every contact/registration access server-side; never trust a browser-supplied email, contact ID, role or registration ID.
7. Rate-limit request and consume endpoints without enabling account enumeration.
8. Keep Entra/Dataverse credentials and provider API keys server-only.

Do not add a client-only “login” or hide UI elements as a substitute for authorization.
