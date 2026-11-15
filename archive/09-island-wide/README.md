# Marc Teyra Galiano · Island

A quiet monochrome homepage with one three-dimensional monogram and a floating navigation island. The three sculptural pieces fit together through a short, optional interaction. Studies, experience and projects open as separate reading views.

## Open locally

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

- http://localhost:8874/ — the current homepage.
- `island/` — direct entry.
- `island/#studies`, `#experience`, `#projects` — individual reading views.
- `archive/` — eight preserved design iterations.
- `archive/08-island/` — the first Island version before the navigation and layout refinement.
- `archive/07-calm-orbit/` — the preceding Calm Orbit version.

No build step. Three.js and fonts are local. This iteration is for local review; it has not been pushed or published.

## Interaction

Four labelled links stay in a satin graphite island. A fine underline follows the selected view; the plus button expands the same shell to reveal GitHub, LinkedIn, the design archive and a motion preference. The navigation stays in place during expansion.

Click a sculptural piece to align it, or use the small “Fit the pieces” button. On the focused sculpture, left and right arrows select a piece and Enter or Space aligns it. Reset separates the pieces again. Every reading view and the CV are accessible immediately.

Studies lists coursework under three plain subject headings. Experience expands accounts inline. Projects have short descriptions, clear individual contributions and source links. There are no nested tabs or required game progression.

Desktop reading views use the viewport width: course and experience groups occupy three aligned columns, while projects occupy two. The header and current employer align to the same grid. Tablets use two columns; phones stack the groups. Navigation labels remain visible, and the last document entry clears the island. Browser history and keyboard navigation work across views. Motion can be paused and respects the initial system preference. Hidden pages stop rendering; a static SVG and the same accessible controls are available without WebGL.

## Content

`puzzle/content.js` is the shared public content source, reconciled from the supplied CVs, LinkedIn export and previously reviewed public repositories. It contains eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course is displayed with independent study; the CS50 professional certificate is identified as a bundle.

Current employer: Siemens Healthineers, since April 2026. Degree: B.Sc. Artificial Intelligence at FAU, since October 2025, with a biomedical direction. Exact employment title/team and formal specialization wording remain unresolved. The disputed Icosagen year and Hack-A-Bot month remain omitted.

The public CV at `assets/cv/marc-teyra-cv-2026-02.pdf` is the February 2026 derivative with its private contact header removed. It predates the current job. Original documents and private analysis stay outside this repository.

## Files

- `island/index.html`, `style.css`, `main.js` — current layout, content views and navigation.
- `island/layout.css` — full-width chapter layouts and responsive grids.
- `island/navigation.css` — graphite navigation and matching menu.
- `island/world.js` — local Three.js sculpture and alignment controller.
- `puzzle/content.js` — shared public profile evidence.
- `design/ISLAND.md` — design decisions and local review notes.
- `design/island-refinement-root-qa.json` — current desktop width and browser verification.
- `design/island-root-qa.json` — original interaction and fallback verification.

Previous editions retain their original content and design decisions. The `?atlas=preview#travel` handoff opens the archived In motion viewer, where the local GPX/KML importer remains available. Live travel integration is still future work.

## Credits

Visual reference: the spacious hero and floating navigation of [Rauno’s 2023 site](https://2023.rauno.me/). The monogram, materials, alignment interaction, layouts and implementation here are original.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits.
