# Event content translations

This folder contains **optional, event-specific content translations**. It is deliberately separate from `public/locales/`.

- `public/locales/translation.<locale>.json` is the Microsoft-style i18n layer for reusable portal UI text such as buttons, labels and messages.
- `public/translations/events/<event-key>.json` contains content belonging to one concrete Dynamics 365 Customer Insights - Journeys event, such as its public title and description.

## File name

Use the event's `readableEventId` as the file name because that is the identifier used by this portal's event detail URL and Events API calls:

`public/translations/events/<readableEventId>.json`

The loader also understands `eventId`/`id` when those properties are present in an API response.

## Format

```json
{
  "de-DE": {
    "title": "Deutscher Eventtitel",
    "description": "<p>Deutsche Beschreibung.</p>"
  },
  "en-US": {
    "title": "English event title",
    "description": "<p>English description.</p>"
  },
  "fr-FR": {
    "title": "Titre français",
    "description": "<p>Description française.</p>"
  }
}
```

`description` may contain the same limited rich-text markup that the event details renderer already accepts. Event cards convert it to plain text.

## Fallback behavior

At runtime, translation files remain optional so that a missing file never breaks an event page. For each event the portal uses:

1. the selected exact locale, for example `fr-FR`;
2. the selected language key, for example `fr`;
3. `en-US` / `en` when present;
4. the original value returned by the Microsoft Events API.

Individual fields are optional too. If a translated title exists but the description is missing, only the title is overridden.

## CI validation

The CI pipeline is intentionally stricter than the runtime fallback. `npm run check:translations` loads the currently published events from the configured Microsoft Events API and verifies that every returned event has a matching JSON file in this directory.

By default the check requires `de-DE`, `en-US`, and `fr-FR` (language-only keys such as `de`, `en`, and `fr` are accepted as equivalents). The required list can be changed with `EVENT_TRANSLATION_REQUIRED_LOCALES`.

The check uses the same GitHub Actions secrets as the deployment:

- `EVENTS_BASE_URL`
- `EVENTS_ORG_ID`
- `EVENTS_API_TOKEN`
- `EVENTS_WEBAPP_ID` (optional)

A missing file, invalid JSON, missing required locale, Events API authentication problem, or failed API request makes the CI job fail. This catches newly published events that have not yet received their translation file.

## Power Automate / Dynamics workflow

A Power Automate flow can maintain these files from custom columns on the Dynamics event record. The flow only needs to create or update `<readableEventId>.json` in this folder. The public website itself does not need Dataverse credentials or direct Dataverse Web API access.

The repository contains `_example.json` as a copyable template. Rename a copy to the real `readableEventId` before using it.
