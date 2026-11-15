# Marc Teyra Galiano

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A monochrome personal homepage built around a graphite and silver M. The full name and introduction share the opening with the sculpture; three factual links lead into studies, current work and public or completed projects.

## Reading and interaction

The same M moves from the opening spread into each chapter’s masthead. Its three pieces lead to Studies, Experience and Projects; the current chapter’s piece sits slightly forward. Hovering an object or a normal link previews the matching destination. Pointer movement gently changes the viewing angle, then settles. There is no sorting task or completion state.

All university coursework is visible in two aligned areas. Independent courses and certificate links follow. Experience starts with the current employer, then presents dated contributions grouped into teams and prototypes, science and care, and early robotics and games. Supporting accounts expand in place. Projects remain four concise entries with direct links.

The floating navigation expands into GitHub, LinkedIn, the design archive and motion preferences. Browser history, direct links into course and experience groups, keyboard navigation, reduced motion and WebGL fallback are supported. Text stays available throughout transitions. One WebGL context is retained between pages; rendering stops when the sculpture settles or leaves the viewport.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

Current study: B.Sc. Artificial Intelligence at FAU, since October 2025, with an interest in computation, biology and medicine. Current employer: Siemens Healthineers, since April 2026. No unverified job title is inferred.

The public CV in `assets/cv/` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis are not published. There are no invented articles or claimed live travel connections.

## Source and hosting

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps the site buildless. Fonts and Three.js are bundled; no account service or build step is required.

- `index.html` — homepage entry and route forwarding.
- `island/index.html` — introduction and persistent navigation.
- `island/chapters.js` — reading views, derived from the public profile.
- `island/main.js` — routing, shared scene movement, disclosures and preferences.
- `island/monogram.js` — the three-piece M and its interaction.
- `puzzle/content.js` — shared public profile content.
- `archive/` — twelve preserved design iterations.
- `archive/12-island-monogram/` — the complete edition preceding this revamp.
- `design/ISLAND.md` — design notes.

Earlier editions preserve their own content and assets. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The spacious hero and floating navigation of [Rauno’s 2023 site](https://2023.rauno.me/) informed the direction. The geometry, interaction, layouts and implementation were made for this site.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits.
