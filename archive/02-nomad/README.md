# Marc Teyra · NOMAD

An explorable architectural world for Marc's personal homepage. The active prototype replaces the earlier Field Index design entirely.

## Preview

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

Open http://localhost:8874/ . No build or installation is needed. Serve over HTTP so modules and map geometry can load. Use the destination dock or in-world labels. Drag the overview to look around, use Plan for an overhead view, and Escape to return. Ctrl/Command K opens the quick index.

## Structure

- `index.html` — semantic navigation and content templates; no portrait or articles section.
- `assets/station.css` — responsive world interface, desktop reading panels and mobile sheets.
- `assets/station.js` — destinations, project tabs, deep links, keyboard navigation, map and local route preview.
- `assets/world.js` — real Three.js architecture, camera travel, mechanical reveals, plan view, globe route rendering and motion controls.
- `assets/vendor/` — self-hosted Three.js r180 and MIT license. No runtime CDN dependency.
- `assets/content.js` — current company, degree, languages, credentials, research experience and project archive. Missing fields create no empty public sections.
- `assets/cv/` — a dated public CV snapshot with its private contact header removed.
- `assets/europe.json` — Natural Earth country geometry used with the historical 2024 journal.
- `atlas-studio.html` and `assets/atlas-studio.js` — local GPX/KML preview, endpoint trimming, coordinate rounding, GeoJSON download and temporary preview inside NOMAD.
- `design/MAPOUT.md` — researched MapOut capabilities and the next automation options.

## Route workflow

Export a selected MapOut journey as GPX/KML, open Atlas Studio, review the geometry and settings, then choose **Preview in NOMAD**. Only cleaned coordinates pass into same-tab session storage. Nothing is uploaded or published. The homepage preview can clear the imported route and return to the historical journal. Downloaded GeoJSON can later become reviewed public data.

MapOut's documentation describes exports and hosted per-tour shares, not a supported live collection API. A future iPhone Share shortcut and authenticated upload endpoint can reduce publication to a few taps. That integration requires a real export/device test and is not connected yet. Static GitHub Pages alone cannot accept private uploads.

## Content and hosting

This is the second local design study, prepared for collaborative review. Content now combines public GitHub material, all 17 supplied CV files and the November 2026 LinkedIn printout. The newest complete CV is the 12 February 2026 “2026 _ 2.0” version; it predates the current Siemens Healthineers role shown on LinkedIn. The downloadable derivative preserves that dated body and removes the private contact header. Originals remain untouched.

The exact Siemens role/team and formal degree wording await clarification. The page currently shows the confirmed employer and start date, and B.Sc. artificial-intelligence study at FAU with a biomedical focus. Conflicting Icosagen placement year, IB start date and Hack-A-Bot month are omitted rather than silently resolved. Coursework forks, team projects, independent assistance and shadowing are explicitly distinguished. There are no authored-article claims.

The existing repository publishes the root of `main` through GitHub Pages. This prototype has not been pushed or published. Paths work under the existing `/m.a.r.c_t.e.y.r.a/` prefix. The original homepage is retained in `archive/`.

The renderer respects reduced motion and has a pause control. A static architectural plan keeps navigation usable when WebGL is unavailable; semantic text is also provided for JavaScript-disabled browsers. Labels avoid the introduction and each other. The UI and camera switch to the mobile reading sheet together at 900px. Browser checks cover desktop, tablet, narrow mobile, keyboard navigation, malformed route files and forced WebGL failure; see `design/qa-report.json`.

## Credits

Manrope and JetBrains Mono: SIL Open Font License, `assets/fonts/LICENSES.txt`.
Three.js: MIT License, `assets/vendor/THREE-LICENSE.txt`.
Country geometry: Natural Earth, public domain, https://www.naturalearthdata.com/about/terms-of-use/ .
All architecture and interface graphics are procedural geometry or original SVG/CSS.
