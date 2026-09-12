# Event Portal Web

A lightweight web application that displays and lets users search events from the Dynamics 365 Events API. Built with plain JavaScript, HTML, and CSS.

## Features

- Display live events for a configured web application in a responsive grid layout
- Search events by name or description
- View detailed information about each event
- Embed the Dynamics 365 Marketing registration form
- Internationalization (i18n) with multiple language options
- Right-to-left (RTL) language support
- Responsive design for mobile and desktop
- Simple local development server

## Project Structure

The repository is intentionally minimal and supports three common usage modes:

1. Development / Customization: Run the Express server locally while you tweak HTML/CSS/JS. Hot-reload via a simple static serve (restart if needed). All editable source lives under `public/`.
2. Production Deployment: Only deploy the contents of `public/` (everything else is tooling). Any static web host (Azure Storage, GitHub Pages behind auth proxy, CDN, traditional IIS/Apache/Nginx) works.
3. Reference Implementation: The `public/` folder contains a reference implementation that can be used in production for a simple event portal, or as a starting point for developing a more advanced solution (e.g., add authentication, filtering UI, pagination, advanced search, theming).

Recommended extension points:
- Add new UI components under `public/js/`
- Add or modify locales in `public/locales/`
- Swap styling by replacing or augmenting `public/css/styles.css`
- Wrap additional APIs in new modules similar to `api-wrapper.js`

### File Structure
```
/
├── public/                     # Deployable files (static assets for production)
│   ├── assets/                 # Images and other assets (SVG icons etc.)
│   │   ├── calendar.svg        # Calendar icon
│   │   ├── home.svg            # Home icon
│   │   └── search.svg          # Search icon
│   ├── css/
│   │   └── styles.css          # Styles for the event portal
│   ├── js/
│   │   ├── api-wrapper.js      # Thin wrapper around PublicApi.bundle.js
│   │   ├── config.js           # API / org configuration values
│   │   ├── event-details.js    # Event details page logic
│   │   ├── event-grid.js       # Events grid listing logic
│   │   └── localization.js     # Internationalization (i18n) system
│   ├── lib/
│   │   └── PublicApi.bundle.js # Dynamics 365 Events API library (provided)
│   ├── locales/                # Translation JSON files (one per locale)
│   ├── index.html              # Events listing page
│   └── event-details.html      # Event details page (loads registration form)
├── server.js                   # Express dev server (not for production)
├── package.json                # NPM scripts & dependencies
├── LICENSE                     # Project license
└── README.md                   # Documentation
```

## Getting Started

This section explains how to configure the web application in your Dynamics 365 organization and how to develop and deploy the event portal.

## Prerequisites
- Set up a web application record for your domain in *Customer Insights – Journeys > Settings > Web applications* (required to allow the portal to call the public API)
- Authenticate your domains in *Customer Insights – Journeys > Settings > Domains* (required for embedded event registration forms)
- Node.js v22 or higher (optional; only needed if you use the provided development server)

### Set up a web application for your domain
The portal requires a web application record with its origin set to the domain where the portal is hosted so that CORS requests succeed.

For the locally hosted development server (described below), do the following:
1. In your Dynamics 365 organization, go to *Customer Insights – Journeys > Settings > Web applications*.
2. Create a new web application record.
3. Set the origin to `http://localhost:3000` (the default address of the development server).
4. Save the record.

For production, create a web application record the same way, but set the origin to the production domain where you will host the portal.

We recommend configuring the localhost origin only in non-production environments.

### Authenticate your domains
To serve embedded event registration forms, your domain must be authenticated in *Customer Insights – Journeys > Settings > Domains*.
See: [Authenticate your domains](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/domain-authentication).

For the locally hosted development server, do the following:
1. In your Dynamics 365 organization, go to *Customer Insights – Journeys > Settings > Domains*.
2. Create a new domain record.
3. Use `localhost` as the domain name.
4. Select only **External form hosting**.
5. Save the record.

## Deployment to Production

To deploy this application to production:

1. Update the credentials in `public/js/config.js` with your production values

```javascript
const CONFIG = {
  BASE_URL: "your-dynamics-api-url",
  ORG_ID: "your-organization-id",
  TOKEN: "your-api-token",
  WEBAPP_ID: "your-webapp-id"  // Optional: filter events by webapp ID
};
```
 **Note**: If this project was downloaded as a zip from *Customer Insights - Journeys -> Settings -> Web applications*, the configuration values will already be set correctly and you can skip this step.

2. Copy the entire contents of the `public` directory to your web server

## Local Development

The included Express server (server.js) is for local development and customization purposes:
- It serves static files from the project directory
- Use this for making modifications and testing changes
- It is NOT intended for production use

For production deployment, use the files in the `/public` directory on your web server of choice.

### Run local server
1. Unpack the zip file
2. Open the extracted folder in terminal (where `package.json` is)
3. Install dependencies:

```bash
npm install
```

4. Update the API credentials in `public/js/config.js`, you can find these values in *Customer Insights - Journeys -> Settings -> Web applications*:

5. Start the development server:

```bash
npm start
```

6. Open your browser and navigate to http://localhost:3000

7. You should see all live events that are assigned to this web application.
  - To assign an event to a web application, open (or create) the event.
  - Edit the event.
  - Depending on your solution version, go to *General > Publishing* or *Website and form*.
  - Select **Web App Website** in *Where do you want attendees to register for this event?*.
  - Choose the desired web application in the dropdown.
  - Publish (Go live). Only live events are loaded and shown on the portal.

## Registration Form Integration

The application integrates with Dynamics 365 Marketing forms to enable event registration functionality:

1. When viewing event details, the application automatically loads the registration form associated with the event
2. The form is embedded directly from the event data received from the API
3. The form appears in a dedicated section
4. Form submission is handled by the Dynamics 365 Marketing FormLoader script

### Form Integration Structure

The form is integrated using the following structure:

```html
<div
  data-form-id='[FORM_ID]'
  data-form-api-url='[FORM_API_URL]'
  data-cached-form-url='[CACHED_FORM_URL]'
  data-readable-event-id='[EVENT_ID]'>
<script src='[CDN_ENDPOINT]/FormLoader/FormLoader.bundle.js'></script>
```

## Localization Support

The application includes built-in internationalization (i18n) support:

### Supported Features

- Multi-language support with translation files
- Language selection UI
- Selected language is persisted in browser local storage under the key `userLocale`
- Right-to-left (RTL) text direction for languages like Arabic and Hebrew
- Date and time localization
- Translation of UI elements, including:
  - Text content
  - Placeholders
  - Tool tips
  - Alt text
  - Error messages

### Adding a New Language

To add support for a new language:

1. Create a new translation file in `public/locales/` named `translation.[locale].json`
2. Copy the structure from an existing translation file like `translation.en-US.json`
3. Translate all values while keeping the keys unchanged
4. Add the new locale to the `supportedLocales` in `public/js/localization.js`

### Using Translation Keys

The localization system uses data attributes to mark elements for translation:

```html
<!-- Basic text translation -->
<h1 data-i18n="allEvents">All Events</h1>

<!-- Attribute translation -->
<input placeholder="Search..." data-i18n-attrs="placeholder" data-i18n-placeholder="searchPlaceholder">
```

### RTL Language Support

Right-to-left language support is automatically enabled for specific locales. To add a new RTL locale:

1. Open `public/js/localization.js`
2. Add the locale code to the `rtlLocales` array in the constructor


### Form Localization

Form localization is not supported out of the box. See `event-details.js` for the location where a custom solution could be added.

Resources:
- [Extend Customer Insights - Journeys marketing forms using code](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/developer/realtime-marketing-form-client-side-extensibility)
- [Customizable error messages for form field validation](https://community.dynamics.com/blogs/post/?postid=cdcd1dbf-2b7f-ef11-ac20-7c1e521a63a7)

## Troubleshooting

Below are common issues and how to diagnose and fix them.

### 1. Calls to the public API are failing
**Symptoms:** Network tab shows 401 / 403 / 404 / CORS errors. Console may show: "CORS policy: No 'Access-Control-Allow-Origin' header" or 401 Unauthorized.

**Likely causes & fixes:**
- Incorrect `BASE_URL` in `public/js/config.js`  → Verify it matches the root of the Dynamics 365 Events API endpoint (no extra path or trailing slash issues).
- Invalid configuration in `config.js`. Check on the web application record.
- Missing or incorrect Web Application origin in *Web applications* → Create web application with the correct origin (e.g., `http://localhost:3000` while developing or your production HTTPS domain).
- Mixed HTTP/HTTPS usage → If the site is served over HTTPS, the API must also be HTTPS.

**Debug tips:**
- Open DevTools > Network, filter by `events` or the failing call; inspect Request Headers (Origin) and Response Headers.
- Reproduce in an incognito/private window to eliminate cached or extension interference.

### 2. API requests succeed but no events are displayed
**Symptoms:** Empty grid with "no events" message.

**Likely causes & fixes:**
- The web application has no events assigned → Assign events to the web application (see assignment steps above) and publish (Go live).
- Events exist but none are Live/Published → Only live events are returned; publish at least one event.
- Filtering by `WEBAPP_ID` in `config.js` excludes all events → Temporarily remove or correct `WEBAPP_ID`.

**Debug tips:**
- Inspect the raw JSON response in DevTools (Network > event list call) to confirm the payload truly has zero results vs a rendering issue.

### 3. Event details page does not load the registration form (domain error)
**Symptoms:** Form area stays blank or shows an error referencing domain validation / unauthorized domain.

**Likely causes & fixes:**
- Domain not authenticated in *Customer Insights – Journeys > Settings > Domains* → Add and authenticate the domain (or `localhost` for local dev) with **External form hosting** enabled.
