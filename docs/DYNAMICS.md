# Customer Insights, Dynamics 365 and Dataverse

## Integration used by this project

The application integrates through two public Customer Insights - Journeys surfaces:

1. The public Events API, using the vendored `PublicApi.bundle.js` client.
2. The Microsoft marketing-form FormLoader.

It does not query the Dataverse Web API directly. Entity logical names, OData metadata, Entra service principals and Dataverse security roles are therefore absent from repository code.

## Data read

- Published event list
- One event's display fields and registration embed
- Sessions for that event
- Speakers for that event
- Microsoft-hosted form definition through FormLoader

Only fields used by the UI are rendered. The public Events API response itself may contain additional properties in browser memory because this API client does not expose an OData `$select` option.

## Data written

The app has no custom write call. When a visitor submits the embedded form, FormLoader sends the entered fields to Customer Insights - Journeys. The repository neither receives nor stores that submission payload.

## Event publishing setup

1. Create a web application in Customer Insights - Journeys settings.
2. Set the exact origin, for example `https://ganfer.github.io` or `http://localhost:3000`.
3. Configure the hosting domain for external form hosting.
4. On the event, choose the web-application event portal as registration destination.
5. Select the intended web application and publish/go live.

Only returned published events appear. `WEBAPP_ID` can additionally restrict the list.

## Translations

English is the source locale. The scheduled workflow copies public event text, session/speaker copy and visible form labels into source JSON and sends it to Google Translate through `googletrans`. Generated locales are committed only after checks pass. This automation does not process attendee submissions.

Machine translations require content-owner review. `_meta.pendingLocales` records incomplete translation output and the validation job retries it on later runs.

## If direct Dataverse access is added

Use a backend and Entra OAuth; never expose its credential or bearer token to the browser. Select only required columns, filter server-side, authorize every object access and document exact logical table/column names. This is not implemented today.
