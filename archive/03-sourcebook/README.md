# Marc Teyra · Open Sourcebook

Design study 03: a personal homepage built around inspectable work. Each selected project moves from a plain-language outcome to an illustrated mechanism, a full reading spread and its public evidence. The reader gives project documents and a real team engineering study the same visual attention as the landing experience.

## Local preview

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

Open http://localhost:8874/ . No build step, package install or runtime CDN. Serve over HTTP for modules and map/report JSON. The existing GitHub Pages deployment has not been pushed or changed.

- `#work/nixcare`, `#work/aloha`, `#work/robotics`, `#work/nixos`: selected project plates.
- `#read/nixcare` (and other project IDs): full reading spreads, with context, mechanism, outcomes and sources.
- `#read/aloha-study`: an attributed excerpt of the Aloha team's synthetic engineering study. Interactive assumptions, a common-scale chart, underlying table, methodology and source links.
- `#about`: current employer, degree, academic direction, experience, credentials and languages.
- `#library`: CV, project overviews and the team study.
- `#travel`: historical country journal and optional private route preview.
- `archive/`: runnable Field Index and NOMAD design snapshots with screenshots.

## Source and structure

- `index.html`: persistent identity/navigation, main document and native modal reader.
- `assets/sourcebook.js`, `sourcebook.css`: routes, keyboard behavior, responsive reading layouts, report comparison and geographic preview.
- `assets/cases.js`: homepage summaries of verified public projects and the CV-based Hack-A-Bot entry.
- `assets/diagrams.js`: original SVG mechanisms with selectable stages. Includes a working model of the real NixOS hinge-input hysteresis.
- `assets/content.js`: shared verified profile, completed projects and public repository links.
- `assets/aloha-study.json`: source-derived report values and attribution. Values are synthetic assumptions, never clinical results or portfolio impact metrics.
- `assets/cv/`: February 2026 public CV derivative; original private header removed. Original supplied documents unchanged.
- `atlas-studio.html`, `assets/atlas-studio.js`: existing local GPX/KML sanitization and preview utility.
- `design/project-evidence.json`: public GitHub audit with exact source commits, contribution attribution and limits.
- `design/DECISIONS.md`, `design/MAPOUT.md`, `design/qa-report.json`: design rationale, export integration research and browser checks.

## Content boundaries

The supplied CV versions and LinkedIn printout establish Siemens Healthineers since April 2026 and AI study at FAU with a biomedical focus. Exact job title/team and formal degree wording await Marc's confirmation. The February CV predates the job and is clearly dated.

Nixcare is a released tool. Aloha is team work: Marc's public contributions include web experiences, the phone companion, arcade and presentation development; Christian's planning-core attribution is retained. Its clinical actions and simulation data are demonstrations. Hack-A-Bot is a completed CV-documented team prototype. NixOS is a personal hardware-specific configuration. The Applied Programming repository is a clearly labeled unfinished coursework fork, separate from completed work.

There are no invented authored articles. The reading room distinguishes homepage project overviews from the real Aloha team engineering study. Source comparisons involving private CV details remain outside the public repository.

## MapOut workflow

Export a chosen journey as GPX or KML, use Atlas Studio to trim ends and round coordinates, inspect it, then choose **Preview in the atlas**. Cleaned coordinates pass through same-tab session storage only. Nothing is uploaded or published. Clearing the preview removes those coordinates and restores the historical journal. A cleaned GeoJSON download is available.

MapOut does not expose a documented live collection API in the reviewed official material. A future iPhone Share shortcut and authenticated receiving endpoint could simplify updates, but a real device/export test and a reviewed publishing step remain necessary. No live sync is claimed. See `design/MAPOUT.md`.

## Archives and accessibility

`archive/02-nomad/` contains the previous 3D world, all runtime dependencies, CV, Atlas Studio, design notes and screenshots. `archive/01-field-index/` restores the prior editorial prototype with its original artwork and dependencies. The original legacy homepage remains at `archive/original-homepage.html`.

Primary navigation and source links use semantic HTML. Project tabs support arrow keys, Home and End. Reader Escape/Back restores focus. Reduced-motion and manual pause preserve visibility. Mobile switches to a single-column reading layout. A semantic JavaScript-disabled fallback includes core profile facts, public projects and the CV.

## Credits

Manrope and JetBrains Mono: SIL Open Font License, `assets/fonts/LICENSES.txt`.
Country geometry: Natural Earth, public domain, https://www.naturalearthdata.com/about/terms-of-use/ .
Original SVG/CSS illustrations are explanatory models. The NOMAD archive includes its self-hosted Three.js dependency and MIT license.
