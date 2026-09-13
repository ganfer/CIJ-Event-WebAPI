# Event Portal Web

A lightweight web application that displays and lets users search events from the Dynamics 365 Customer Insights - Journeys Events API. Built with plain JavaScript, HTML, and CSS.

## Features

- Display live events for a configured web application in a responsive grid layout
- Search events by name or description
- View detailed information about each event
- Embed the Dynamics 365 event registration form
- Internationalization (i18n) with multiple language options
- Right-to-left (RTL) language support
- Responsive design for mobile and desktop
- Simple local development server
- Static deployment to GitHub Pages

## Project Structure

The repository is intentionally minimal. The actual web application lives in `public/`; `server.js` is only a local development server.

### File Structure

```text
/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # npm checks, tests, build and audit
│       ├── deploy-pages.yml        # GitHub Pages deployment
│       └── theme-quality.yml       # Theme/contrast and screenshot checks
├── public/                         # Static application source
│   ├── assets/                     # Images and icons
│   ├── css/
│   ├── js/
│   │   ├── api-wrapper.js
│   │   ├── config.example.js      # Safe configuration template
│   │   ├── event-details.js
│   │   ├── event-grid.js
│   │   └── localization.js
│   ├── lib/
│   │   └── PublicApi.bundle.js    # Dynamics 365 Events API library
│   ├── locales/                   # Translation JSON files
│   ├── index.html
│   └── event-details.html
├── scripts/
│   ├── build.mjs                  # Creates the static _site/ artifact
│   ├── check-project.mjs          # General source/integrity checks
│   └── check-theme.mjs            # Theme and contrast checks
├── .gitignore
├── server.js                       # Express development server only
├── package.json
├── LICENSE
└── README.md
```

`public/js/config.js` is intentionally **not tracked by Git**. For local development it is created from `config.example.js`; for GitHub Pages it is generated during deployment from GitHub Actions secrets.

## Getting Started

### Prerequisites

- A web application record in **Customer Insights - Journeys > Settings > Web applications**
- The hosting origin added to that web application so Events API CORS requests are allowed
- The hosting domain allowed for **External form hosting** if embedded event registration forms are used
- Node.js v22 or higher for local development, checks and builds

## Customer Insights - Journeys configuration

### 1. Register the web application origin

The portal calls the public Events API directly from the browser. The browser origin therefore has to match a web application record in Customer Insights - Journeys.

For local development use:

```text
http://localhost:3000
```

For the default GitHub Pages URL of this repository use:

```text
https://ganfer.github.io
```

The browser `Origin` header contains only scheme and host, not the repository path. Therefore the origin is `https://ganfer.github.io`, even though the site itself is normally available below `/CIJ-Event-WebAPI/`.

### 2. Allow the domain for external form hosting

Embedded Customer Insights - Journeys forms are only rendered and accepted from domains that are allowed for external form hosting.

For GitHub Pages, add the domain used by the site, for example `ganfer.github.io`. If you configure a custom GitHub Pages domain later, add that custom domain instead.

See: [Authenticate your domains](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/domain-authentication)

## Local Development

### 1. Install dependencies

For a clean install that exactly follows `package-lock.json`:

```bash
npm ci
```

Use `npm install` when intentionally changing dependencies.

### 2. Create the local configuration

macOS/Linux:

```bash
cp public/js/config.example.js public/js/config.js
```

PowerShell:

```powershell
Copy-Item public/js/config.example.js public/js/config.js
```

Then edit `public/js/config.js`:

```javascript
const CONFIG = {
    BASE_URL: "https://public-eur.mkt.dynamics.com",
    ORG_ID: "your-organization-id",
    TOKEN: "your-web-application-token",
    WEBAPP_ID: "" // optional
};
```

`public/js/config.js` is ignored by Git. Do not force-add it to the repository.

### 3. Start the local server

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Quality checks and build

The repository exposes the same npm commands used by GitHub Actions:

```bash
npm run check
npm test
npm run build
```

- `npm run check` validates authored JavaScript syntax, JSON files, required project files and local HTML asset references.
- `npm test` runs the general project checks and the theme/contrast test suite.
- `npm run build` creates the deployable static site under `_site/`.

The build deliberately excludes a local `public/js/config.js`. Production configuration is added only by the deployment workflow from GitHub Actions secrets.

The general CI workflow also runs:

```bash
npm audit --omit=dev --audit-level=high
```

Pull requests to `main` must therefore survive dependency installation, tests, the static build and the production-dependency audit before they are considered clean.

## Deploy with GitHub Pages

The repository contains `.github/workflows/deploy-pages.yml`. The workflow runs `npm ci`, `npm test` and `npm run build`, then creates the production `config.js` inside the `_site/` deployment artifact.

The current workflow deploys automatically on pushes to the `main` branch and can also be started manually from the **Actions** tab.

### 1. Add repository secrets

Open:

**Repository > Settings > Secrets and variables > Actions > New repository secret**

Add these secrets:

| Secret | Required | Description |
| --- | --- | --- |
| `EVENTS_ORG_ID` | Yes | Dynamics 365 organization ID from the web application configuration |
| `EVENTS_API_TOKEN` | Yes | Token from the Customer Insights - Journeys web application record |
| `EVENTS_BASE_URL` | No | Events API base URL; defaults to `https://public-eur.mkt.dynamics.com` |
| `EVENTS_WEBAPP_ID` | No | Optional web application ID used to filter the event list |

The workflow stops with a clear error if `EVENTS_ORG_ID` or `EVENTS_API_TOKEN` is missing.

### 2. Enable GitHub Pages

Open:

**Repository > Settings > Pages**

Under **Build and deployment**, select **GitHub Actions** as the source.

### 3. Deploy

Push a commit to `main`, or open **Actions > Deploy GitHub Pages > Run workflow**.

For the repository `ganfer/CIJ-Event-WebAPI`, the default project-site URL is expected to be:

```text
https://ganfer.github.io/CIJ-Event-WebAPI/
```

### How configuration is handled during deployment

The deployment follows this flow:

```text
public/
   |
   | npm run build
   v
_site/
   |
   | generate _site/js/config.js from GitHub Actions secrets
   v
GitHub Pages artifact
   |
   v
GitHub Pages
```

The real Dynamics configuration therefore does not need to exist in the Git repository or Git history.

> **Important:** This is a browser-based application. The generated `config.js`, including the Events API token, is delivered to the browser and can therefore be inspected by visitors. GitHub Secrets protect the values from being committed to the repository; they do not turn client-side configuration into a server-side secret. This matches the architecture of the static Customer Insights - Journeys event web application. Access is additionally constrained by the configured web application origin.

## Production on other static hosts

GitHub Pages is optional. The application can be hosted on any static host.

For a different static host:

1. Copy `public/js/config.example.js` to `public/js/config.js`.
2. Set the correct environment values.
3. Deploy the **contents of `public/`**.
4. Register the production origin in Customer Insights - Journeys.
5. Allow the production domain for external form hosting when using embedded forms.

Do not run `server.js` as the production application. It exists only to provide a convenient local development server.

## Publishing Events to the Web Application

To make an event appear in the portal:

1. Open or create the event in Customer Insights - Journeys.
2. Edit the event.
3. Depending on the solution version, open **General > Publishing** or **Website and form**.
4. Select the web application as the place where attendees register.
5. Choose the desired web application.
6. Publish / Go live.

Only events returned by the configured Events API/web application are shown by the portal.

## Registration Form Integration

The application uses the registration form information returned for the event and embeds the Customer Insights - Journeys form on the event details page.

The integration follows the general structure:

```html
<div
  data-form-id="[FORM_ID]"
  data-form-api-url="[FORM_API_URL]"
  data-cached-form-url="[CACHED_FORM_URL]"
  data-readable-event-id="[EVENT_ID]">
</div>
<script src="[CDN_ENDPOINT]/FormLoader/FormLoader.bundle.js"></script>
```

Form submission is handled by the Microsoft FormLoader script.

## Localization Support

The application includes built-in internationalization support:

- Multiple translation files under `public/locales/`
- Browser-language detection
- Manual language selection
- Persistence of the selected language in `localStorage` under `userLocale`
- RTL text direction for supported RTL locales
- Localized date and time formatting
- Translation of text, placeholders, tooltips, alt text, and error messages

### Adding a New Language

1. Create `public/locales/translation.[locale].json`.
2. Copy the structure of an existing translation file such as `translation.en-US.json`.
3. Translate the values while keeping the keys unchanged.
4. Add the locale to `supportedLocales` in `public/js/localization.js`.
5. For an RTL language, also add the locale to `rtlLocales`.

### Form Localization

Form localization is not implemented by this reference application. See `event-details.js` for the integration point if custom behavior is needed.

Resources:

- [Create an event portal using the web application](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/developer/event-portal-web-application)
- [Extend Customer Insights - Journeys marketing forms using code](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/developer/realtime-marketing-form-client-side-extensibility)
- [Authenticate your domains](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/domain-authentication)

## Troubleshooting

### API calls fail with 401, 403, 404, or CORS errors

Check:

- `BASE_URL`, `ORG_ID`, and `TOKEN`
- The web application origin in Customer Insights - Journeys
- That the production site and API use HTTPS
- The browser Network tab for the exact failed request and response

For GitHub Pages the web application origin is normally:

```text
https://username.github.io
```

not the full repository URL.

### GitHub Pages workflow fails because configuration is missing

If the Actions log reports missing secrets, add:

```text
EVENTS_ORG_ID
EVENTS_API_TOKEN
```

under **Settings > Secrets and variables > Actions**.

### GitHub Pages workflow cannot configure or deploy Pages

Make sure GitHub Pages is enabled under **Settings > Pages** and the source is set to **GitHub Actions**.

GitHub Pages is available for public repositories on GitHub Free. Private-repository availability depends on the GitHub plan.

### Events API works but no events are shown

Check that:

- At least one event is live/published.
- The event is assigned to the intended web application.
- `EVENTS_WEBAPP_ID` / `WEBAPP_ID` is either correct or left empty.

### Registration form is not rendered

Make sure the site's domain is allowed for **External form hosting** in Customer Insights - Journeys. If a custom GitHub Pages domain is used, allow that custom domain.

## Security Notes

- Do not commit real environment values to `public/js/config.js`.
- Do not commit copies of downloaded production configuration files.
- Use GitHub Actions secrets for GitHub Pages deployment.
- Remember that values used by browser JavaScript are visible to the browser at runtime.
- Keep the Customer Insights - Journeys web application origin restricted to the intended site.
