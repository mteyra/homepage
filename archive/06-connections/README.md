# Marc Teyra Galiano · Connections

An interactive personal homepage built around a small, tactile three-ring puzzle. Code, Life and Practice connect the academic and practical sides of Marc’s record. The current root opens `puzzle/`; previous designs remain in the archive.

## Open locally

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

- http://localhost:8874/ — the current Connections homepage.
- `puzzle/` — directly open the new version.
- `archive/` — gallery of five earlier design iterations.
- `archive/05-three-directions/` — preserved Profile, Orbit and Hello :D collection.

No build step. Fonts and Three.js are local. External source and credential links require a connection. This is a local design iteration; no publication or Git push has been made.

## The experience

Turn the rings to align their openings with the fixed marker at twelve o’clock. The three rings begin only one or two steps away from alignment and snap to twelve forgiving detents. Drag, keyboard and ordinary buttons share the same state. When a ring connects, a pulse travels towards the centre. When all three connect, the same physical assembly opens in staggered layers. Reset reverses that movement.

The puzzle does not gate information. Each ring exposes its corresponding courses or experiences immediately; the CV and full reading view are always available. Phone controls sit together above and below the instrument. Reduced motion, pause, offscreen suspension and a functional SVG fallback are supported.

## Content

`puzzle/content.js` is the structured content source, reconciled from the supplied CV versions, LinkedIn export and previously reviewed public repositories. It contains eight named university courses, three online courses, four certificate records, ten practical experiences and four concise selected projects. Course certificate bundles are identified without counting them as additional courses. Contributions to team projects, informal assistance and shadowing are explicit.

Current employer: Siemens Healthineers, since April 2026. Degree: B.Sc. Artificial Intelligence at FAU, since October 2025, with a biomedical direction. Exact employment title/team and formal specialization wording remain unresolved. Disputed Icosagen year and Hack-A-Bot month are omitted.

The new homepage omits personal origins, travel and spoken-language biography. No portrait, invented article, private contact information or live MapOut connection is introduced. Institution names remain as academic attribution.

The existing public CV at `assets/cv/marc-teyra-cv-2026-02.pdf` is the February 2026 derivative, with its private contact header removed. It predates the current job. Original source documents and private analysis stay outside this repository.

## Files and history

- `puzzle/index.html`, `style.css`, `main.js` — page and accessible interactions.
- `puzzle/world.js` — Three.js mechanism, shared puzzle state and motion lifecycle.
- `puzzle/content.js` — public profile evidence.
- `design/CONNECTIONS.md` — current design decisions.
- `design/connections-qa.json` — verification record.

Previous editions remain available unchanged in the archive. Their content reflects earlier design decisions. The legacy `?atlas=preview#travel` handoff still opens the archived In motion viewer, where the local GPX/KML importer remains available. No live travel integration is claimed.

## Credits

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits and licenses.
