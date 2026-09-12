# CIJ Event Web API

Eine kleine, frameworkfreie Eventübersicht für **Dynamics 365 Customer Insights - Journeys**. Die Seite lädt live geschaltete und veröffentlichte Events über die offizielle Event API und stellt sie als responsive, durchsuchbare Karten dar.

> Dieses Repository enthält eine eigene Minimalimplementierung und keinen offiziellen Microsoft-Quellcode.

## Funktionen

- Abruf veröffentlichter Events aus Customer Insights - Journeys
- Responsive Darstellung für Desktop, Tablet und Smartphone
- Suche nach Eventname, Beschreibung und Ort
- Sortierung nach Startdatum
- Vergangene Events werden standardmäßig ausgeblendet
- Verlinkung auf die in Customer Insights hinterlegte öffentliche Event-URL
- Sicheres Text-Rendering ohne Ausführung von HTML aus API-Inhalten
- Vorschaumodus mit Beispieldaten, solange keine API-Konfiguration eingetragen ist
- Keine Abhängigkeiten, kein Build-Prozess und keine eigene Datenbank

## Projektstruktur

```text
.
├── index.html   # Anwendung, Design und Konfiguration
└── README.md    # Einrichtung und technische Hinweise
```

## Voraussetzungen

1. Eine Dynamics-365-Umgebung mit Customer Insights - Journeys.
2. Eine Web Application unter **Settings > Event management > Web Applications**.
3. Die exakte Origin des Webspaces muss dort eingetragen sein, beispielsweise `https://events.example.de`.
4. Mindestens ein live geschaltetes Event mit der Publishing Destination **Custom solution using event API**.

Die Origin besteht aus Protokoll, Hostname und gegebenenfalls Port. `https://example.de`, `https://www.example.de` und `http://localhost:3000` sind unterschiedliche Origins.

## Konfiguration

Am Ende der [`index.html`](index.html) befindet sich der Block `CONFIG`:

```js
const CONFIG = Object.freeze({
  API_BASE_URL: "https://public-eur.mkt.dynamics.com",
  ORG_ID: "HIER-ORGANISATIONS-ID-EINTRAGEN",
  APPLICATION_TOKEN: "HIER-WEB-APPLICATION-TOKEN-EINTRAGEN",
  WEBAPP_ID: "",
  BRAND_NAME: "Your Company",
  LOCALE: "de-DE",
  TIME_ZONE: "Europe/Berlin",
  SHOW_PAST_EVENTS: false,
  USE_DEMO_DATA_WHEN_UNCONFIGURED: true,
});
```

| Einstellung | Beschreibung |
| --- | --- |
| `API_BASE_URL` | Regionale Basis-URL ohne nachfolgenden API-Pfad, zum Beispiel `https://public-eur.mkt.dynamics.com` |
| `ORG_ID` | Organisations-ID aus dem bereitgestellten Event-API-Endpunkt |
| `APPLICATION_TOKEN` | Token des Web-Application-Datensatzes; **kein** Dataverse Client Secret |
| `WEBAPP_ID` | Optionale GUID der Web Application zur zusätzlichen Filterung |
| `BRAND_NAME` | Name im Header, Seitentitel und Footer |
| `LOCALE` | Sprache und Datumsformat, zum Beispiel `de-DE` oder `en-GB` |
| `TIME_ZONE` | IANA-Zeitzone für die Anzeige, zum Beispiel `Europe/Berlin` |
| `SHOW_PAST_EVENTS` | Zeigt bei `true` auch bereits beendete Events |
| `USE_DEMO_DATA_WHEN_UNCONFIGURED` | Zeigt bei fehlender Konfiguration Beispieldaten |

Basis-URL, Organisations-ID und Token stehen im Web-Application-Datensatz. Der Link **Endpoint documentation (Preview)** enthält zusätzlich den OpenAPI-Vertrag der jeweiligen Umgebung.

## Verwendeter Endpunkt

```http
GET https://public-{region}.mkt.dynamics.com/
    api/v1.0/orgs/{organizationId}/eventmanagement/events/published
    ?emApplicationtoken={webApplicationToken}
    &webappId={optionalWebApplicationId}
```

Die Antwort ist eine JSON-Liste veröffentlichter Events, unter anderem mit Name, Beschreibung, Start und Ende, Bild, Ort sowie öffentlicher Event-URL.

## Lokal starten

Die Seite sollte über HTTP und nicht direkt per `file://` geöffnet werden:

```bash
python3 -m http.server 3000
```

Anschließend `http://localhost:3000` öffnen. Für einen echten API-Test muss eine Web Application mit exakt dieser Origin registriert sein.

Alternativ mit Node.js:

```bash
npx serve .
```

## Deployment

Die `index.html` kann direkt in das Stammverzeichnis eines statischen Webspaces kopiert werden. Geeignet sind beispielsweise klassischer Webspace, GitHub Pages, Azure Static Web Apps oder Cloudflare Pages.

Es gibt keinen Build-Schritt. Nach dem Eintragen der Konfiguration genügt der Upload der Datei.

## Registrierung

Diese Minimalimplementierung zeigt Events an und verlinkt auf `publicEventUrl`. Sie implementiert selbst kein Registrierungsformular.

Für ein vollständiges Portal mit Eventdetailseiten, Mehrsprachigkeit und eingebetteten Customer-Insights-Registrierungsformularen bietet Microsoft eine eigene statische Web Application an:

1. **Settings > Event management > Web Applications** öffnen.
2. Web Application anlegen oder auswählen.
3. **Download Zip File** auswählen.
4. Für die Produktion den Inhalt des enthaltenen Ordners `public` bereitstellen.

Diese Microsoft-Webanwendung ist nicht Power Pages und benötigt für das Produktionshosting keinen Node-Server. Node.js 22 oder höher wird nur für die optionale lokale Entwicklung des heruntergeladenen Pakets benötigt.

## Sicherheit und Datenschutz

Der Web-Application-Token wird vom offiziellen OpenAPI-Vertrag als API-Key im Query-Parameter `emApplicationtoken` definiert. In einer rein statischen Browseranwendung ist er deshalb im Quelltext und in der Netzwerkanzeige des Browsers sichtbar. Das ist für diesen origin-gebundenen öffentlichen Eventzugang vorgesehen.

- Ausschließlich den **Web-Application-Token** verwenden.
- Niemals Entra Client Secrets, Dataverse-Zugriffstoken oder Benutzerkennwörter in der HTML-Datei speichern.
- Die zulässige Origin so eng wie möglich konfigurieren.
- API-Query-Strings nicht unnötig in eigenen Proxy- oder Analytics-Logs speichern.
- Den Token bei Verdacht auf Missbrauch austauschen.
- Für eingebettete Registrierungsformulare die Domain zusätzlich für externes Form-Hosting authentifizieren beziehungsweise freigeben.

Der Eventlisten-Endpunkt stellt nicht automatisch Kontakte, Teilnehmerdaten oder andere Dataverse-Tabellen bereit.

## Fehlerdiagnose

| Symptom | Wahrscheinliche Ursache |
| --- | --- |
| CORS-Fehler oder `Failed to fetch` | Aufgerufene Origin stimmt nicht exakt mit der Web-Application-Konfiguration überein |
| HTTP 401 oder 403 | Token ungültig oder Web Application nicht passend konfiguriert |
| HTTP 404 | Falsche Region, Basis-URL oder Organisations-ID |
| Beispieldaten werden angezeigt | `ORG_ID` oder `APPLICATION_TOKEN` enthalten noch Platzhalter |
| Eventliste bleibt leer | Kein passendes Event live/veröffentlicht, falsche Publishing Destination oder alle Events liegen in der Vergangenheit |

## Offizielle Dokumentation

- [Event API in Real-time Journeys verwenden](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/developer/using-rtm-event-api)
- [Event-Portal mit der statischen Web Application erstellen](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/developer/event-portal-web-application)
- [Event-Registrierungserlebnis auswählen](https://learn.microsoft.com/en-us/dynamics365/customer-insights/journeys/event-registration-experience)

