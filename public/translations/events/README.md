# Event content translations

This folder contains **optional, event-specific content translations**. It is deliberately separate from `public/locales/`.

- `public/locales/translation.<locale>.json` is the Microsoft-style i18n layer for reusable portal UI text such as buttons, labels and messages.
- `public/translations/events/<event-key>.json` contains content belonging to one concrete Dynamics 365 Customer Insights - Journeys event.

## File name

Use the event's `readableEventId` as the file name:

`public/translations/events/<readableEventId>.json`

## Supported translatable content

The translation layer follows the content that the portal actually renders from the Events API. It can override:

- Event: `title`, `description`
- Session: `title`, `summary`, `description`, `objectives`
- Speaker: `name`, `title`, `about` (or `bio` as an alias)

Dates, times, IDs, capacities, image URLs and other structural values remain authoritative Events API data and are not duplicated in translation files. Location/address data also remains API data for now because it is primarily structural venue information.

Sessions and speakers are keyed by their API identifier. Missing entities or individual fields simply fall back to the Events API value.

## Format

See `_example.json` for a DE/EN/FR example including sessions and speakers. The portal supports `en-US`, `de-DE`, `it-IT`, `fr-FR`, `es-ES`, `pt-PT`, `pl-PL` and `cs-CZ`.

```json
{
  "de-DE": {
    "title": "Deutscher Eventtitel",
    "description": "<p>Deutsche Beschreibung.</p>",
    "sessions": {
      "<session-id>": {
        "title": "Sessiontitel",
        "summary": "Zusammenfassung",
        "description": "Beschreibung",
        "objectives": "Ziele"
      }
    },
    "speakers": {
      "<speaker-id>": {
        "name": "Name",
        "title": "Rolle / Titel",
        "about": "Biografie"
      }
    }
  }
}
```

## Fallback behavior

For each event the portal uses:

1. the selected exact locale, for example `fr-FR`;
2. the selected language key, for example `fr`;
3. `en-US` / `en` when present;
4. the original value returned by the Microsoft Events API.

Fallback applies per entity and per field, so partial translations are safe.

## CI validation

`npm run check:translations` loads the currently published events from the configured Events API and requires one valid translation file per published event. By default it discovers the eight supported locales from `public/locales/`. CI explicitly validates `en-US,de-DE,it-IT,fr-FR,es-ES,pt-PT,pl-PL,cs-CZ`; the list can be overridden with `EVENT_TRANSLATION_REQUIRED_LOCALES`.

The runtime remains intentionally more tolerant than CI: missing translation content never prevents the portal from rendering the original Events API content.

## Power Automate / Dynamics workflow

A Power Automate flow can maintain these files from Dynamics event, session and speaker records. The public website itself does not need Dataverse credentials or direct Dataverse Web API access. A flow can build the locale sections and key related session/speaker translations by their API IDs, then create or update `<readableEventId>.json` in this folder.
