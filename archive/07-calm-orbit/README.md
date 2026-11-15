# Marc Teyra Galiano · Orbit

A personal homepage with four clear subjects: About, Studies, Experience and Projects. One reading surface sits beside a tactile, selectable orbit. Subject groups replace the content in place; the small alignment puzzle has its own optional view.

## Open locally

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

- http://localhost:8874/ — the current Orbit homepage.
- `orbit/` — direct entry.
- `orbit/#studies/biology` — a particular course group.
- `orbit/#puzzle` — the optional puzzle.
- `archive/` — six preserved design iterations.
- `archive/06-connections/` — the previous Connections version.
- `archive/05-three-directions/` — the original Orbit, Profile and Hello collection.

No build step. Fonts and Three.js are local; external source and certificate links require a connection. This iteration is for local review. It has not been pushed or published.

## Interaction

Click a chapter on the orbit, drag it around, or use the four ordinary navigation links. Arrow keys work on the navigation and the focused orbit. Studies and Experience have three small, labelled groups. Experience rows open a full account in a dialog; Escape and browser Back restore the reading view.

The puzzle is separate from the profile. Its drag, keyboard and button controls share the same ring state. Profile information and the CV are available without solving it. Reduced motion, manual pause, hidden-page suspension and an SVG fallback are supported.

On phones the orbit sits above the reading surface and becomes smaller within chapters. Desktop chapter headings and tabs keep their position as groups change. Content remains visible throughout transitions.

## Content

`puzzle/content.js` is the shared public content source, reconciled from the supplied CV versions, LinkedIn export and previously reviewed public repositories. It contains eight named university courses, three online courses, four certificate records, ten practical experiences and four concise selected projects. Certificate bundles are identified without counting them as additional courses. Team contributions, informal assistance and shadowing are explicit.

Current employer: Siemens Healthineers, since April 2026. Degree: B.Sc. Artificial Intelligence at FAU, since October 2025, with a biomedical direction. Exact employment title/team and formal specialization wording remain unresolved. The disputed Icosagen year and Hack-A-Bot month remain omitted.

The public CV at `assets/cv/marc-teyra-cv-2026-02.pdf` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis stay outside this repository.

## Files

- `orbit/index.html`, `style.css`, `main.js` — current page, layout and navigation.
- `orbit/world.js` — four-subject Three.js orbit.
- `puzzle/world.js` — the shared alignment mechanism, loaded only when requested.
- `puzzle/content.js` — public profile evidence.
- `design/CALM-ORBIT.md` — current design decisions.
- `design/calm-orbit-qa.json` — verification record.

Previous editions retain their original content and design decisions. The `?atlas=preview#travel` handoff continues to open the archived In motion viewer, where the local GPX/KML importer remains available. Live travel integration is still future work.

## Credits

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits and licenses.
