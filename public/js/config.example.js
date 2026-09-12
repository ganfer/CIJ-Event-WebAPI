/**
 * Local configuration template for the Dynamics 365 Events API.
 *
 * Local development:
 *   1. Copy this file to `config.js`.
 *   2. Fill in the values from Customer Insights - Journeys > Settings > Web applications.
 *
 * `config.js` is intentionally ignored by Git so real environment values are not committed.
 * GitHub Pages generates its own `config.js` during deployment from GitHub Actions secrets.
 */
const CONFIG = {
    // Base URL for the Dynamics 365 Events API
    BASE_URL: "https://public-eur.mkt.dynamics.com",

    // Organization ID for Dynamics 365
    ORG_ID: "",

    // Token from the Customer Insights - Journeys web application record
    TOKEN: "",

    // Optional: filter events by a specific web application
    WEBAPP_ID: ""
};
