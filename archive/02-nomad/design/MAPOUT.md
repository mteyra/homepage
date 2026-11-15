# MapOut → personal travel atlas

Research checked 14 November 2026. This is a proposed integration, not a live connection. No personal map history was accessed.

## Recommendation

Keep MapOut as the place Marc plans and records journeys. Publish a deliberately selected, cleaned copy into the homepage's own travel atlas. Start with a file import and visual preview; later reduce the upload to a named iPhone Share action.

The achievable promise is **“Share a journey, then the website updates.”** Fully unattended synchronization from the app is not supported by the documentation reviewed.

## What MapOut actually supports

The official [FAQ](https://mapout.app/faq/) says tours are stored on the device. Its `@mapout.me` account is an incoming tour mailbox, not a synchronized tour library. Cloud synchronization is described as unavailable; users can manually export a backup to Files/iCloud Drive. The FAQ also permits map screenshots on a homepage with OpenStreetMap attribution.

The official [manual](https://mapout.app/manual/) documents:

- Selected tours and waypoints shared through the iOS share sheet.
- GPX or KML export, selected under Settings → Tour Organizer → Export Format.
- Backup Tours: a ZIP containing GPX files and the existing folder hierarchy.
- Share → Copy: uploads a tour and provides a hosted “mini-page” with an image and GPX download; the manual permits embedding it. It does not document a continuously updated library feed.
- Exported author metadata defaults to the device name unless changed.

**API finding:** no documented, supported public developer API, webhook, or MapOut-specific Shortcut export action was found in the official manual, FAQ, or targeted searches. A public [“MapOut App Engine API” landing page](https://backend2.mapout.app/index.html) exists, but exposes only that heading. It is not evidence of a supported integration contract. Do not build against guessed internal endpoints.

## Viable routes

| Route | Update experience | Assessment |
| --- | --- | --- |
| Selected GPX/KML export → atlas importer | Export a finished journey, preview it, publish | Best first implementation. Works with static GitHub Pages and allows full design control. |
| MapOut → iOS Share shortcut → private upload endpoint | A few taps per selected journey; processing/publication can follow automatically after review | Best subsequent upgrade. The MapOut-to-Shortcut handoff needs one real-device test. Requires a small authenticated backend because GitHub Pages cannot receive private uploads. |
| ZIP backup → local batch importer | Occasional backfill of older trips | Useful for initial migration. Keep the full archive private and publish only an explicit selection. |
| MapOut hosted mini-page embed | Share each journey and add its link | Officially documented, but styling, availability, edit propagation and deletion behavior need testing. Also offers the exported GPX to visitors. Poor fit for the main custom atlas. |

## Current local implementation

[`atlas-studio.html`](../atlas-studio.html) now accepts a local GPX/KML file through a picker or drag-and-drop. It parses GPX tracks/routes and KML LineStrings, preserves separate segments, strips all source metadata and standalone waypoints, and previews route geometry. It offers endpoint trimming and coordinate rounding before creating an allowlisted GeoJSON `FeatureCollection`.

**Download clean GeoJSON** saves the prepared file. **Preview in NOMAD** passes only that prepared geometry through the current tab's `sessionStorage` key `nomad.previewRoutes`, then opens `./?atlas=preview#travel` on the same origin. The homepage consumes it for a local atlas preview. Nothing is uploaded or published; the source file is never stored. Clearing the Studio file also removes that preview key.

The private endpoint, iPhone Shortcut, public publishing pipeline, ZIP importer, sensitive-area exclusions and journey metadata editor remain proposed work. To publish later, add only reviewed output and a curated journey index to the site's public data; keep raw source files outside Git history.

## Later: “Send to my atlas” on iPhone

Apple documents that share-sheet Shortcuts can accept files, and that Get Contents of URL can upload a file using POST. Sources: [Shortcut input types](https://support.apple.com/guide/shortcuts/apd7644168e1/ios), [API requests from Shortcuts](https://support.apple.com/guide/shortcuts/apd58d46713f/ios).

Proposed flow:

```text
Select journey in MapOut
  → Share → Send to my atlas
  → authenticated private upload
  → validate, sanitize, deduplicate
  → preview the exact public result
  → Publish
  → versioned public GeoJSON
  → homepage atlas refreshes
```

The shortcut should accept files and filter the input to GPX/KML; MapOut may also supply an image. If the direct handoff is unreliable, Save to Files → Share to shortcut is the fallback. Test this on Marc's device before promising a one-action experience.

Use a narrowly scoped upload credential stored only on the phone, with server credentials kept on the server. Do not put a GitHub token or any upload secret in the public website or a publicly shared shortcut. The endpoint can write sanitized output through a GitHub App, or serve versioned public JSON separately. Keep the last valid atlas available if an upload fails.

A timer cannot extract fresh on-device tours merely because an old export exists in iCloud. Automation begins after an export/share reaches a location our pipeline is authorized to read.

## Publication controls

- Default to selected, finished journeys. Do not publish live position or future accommodation.
- Whitelist public metadata; discard precise timestamps, author/device names, unreviewed descriptions, source URLs and unselected waypoints.
- Offer sensitive-area exclusions and start/end trimming. Apply exclusions to geometry before publishing; hiding points visually does not remove them from a downloadable GeoJSON file.
- Keep raw exports outside Git history. Public files and previous public commits may remain recoverable.
- Preserve disconnected segments after filtering. Simplify geometry only after privacy filtering; simplification alone is not privacy protection.
- Show “Updated [date]” only after a successful publish. Never display “Live” or “Synced” for an export-based workflow.
- Provide a remove-journey path and rebuild the public index. Explain that removal cannot retract copies already downloaded.
- For a basemap or screenshot derived from OpenStreetMap, retain appropriate attribution and follow the selected tile provider's usage terms. Do not reuse MapOut's proprietary offline map tiles.

## Google My Maps is a different option

The original brief named “MyMaps”; the later correction named **MapOut**, the iPhone/iPad app. These are separate products.

Google officially supports public My Maps embeds and KML/KMZ export: [share/download/embed documentation](https://support.google.com/mymaps/answer/3109452?hl=en). A public embed displays the Google-hosted map, with Google's interface and public-sharing requirement.

My Maps accepts GPX/KML imports. Its documented Google Sheets/CSV update process uses **Reimport and merge**, initiated in the editor; this is not a guarantee of automatic spreadsheet synchronization: [import/reimport documentation](https://support.google.com/mymaps/answer/3024836?hl=en).

If Marc already maintains a public My Maps collection, embedding it is a viable separate route. It is unnecessary for a MapOut-based atlas and would introduce an extra copy to maintain.

## Next evidence needed

During the content phase, test one deliberately selected, non-sensitive GPX export from Marc's installed MapOut version. Confirm file shape, which metadata/colors survive export, and whether iOS passes it directly to a file-accepting Shortcut. Then select either manual reviewed publication or the small backend upgrade. No map credentials are needed for the initial file-based route.
