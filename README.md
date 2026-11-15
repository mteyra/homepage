# Marc Teyra Galiano

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A monochrome personal homepage presented as a spatial folio. The introduction, studies, experience and projects are persistent HTML pages: the cover rests at a slight angle, while reading pages settle flat and use the screen’s width.

## Reading and interaction

“Browse the folio” spreads the actual pages into an overview. Selecting a page brings that same surface forward for reading. The dock and text links also navigate directly; dragging a page’s outer margin turns to its neighbor. On phones, the overview presents one readable preview at a time with previous and next controls.

Studies and Experience each show one selected category. Ordinary links switch categories and preserve browser history, so all coursework, certificates and experiences remain easy to reach. The degree and current employer appear in their chapter introductions. Supporting experience accounts expand in place. Projects remain four concise entries with direct links.

The floating navigation expands into GitHub, LinkedIn, the design archive and motion preferences. Browser history, direct links into course and experience groups, keyboard navigation and reduced motion are supported. Native vertical scrolling, text selection and links remain available on the reading pages. CSS transforms provide depth; no graphics context or animation loop is needed while the pages rest.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

Current study: B.Sc. Artificial Intelligence at FAU, since October 2025, with an interest in computation, biology and medicine. Current employer: Siemens Healthineers, since April 2026. No unverified job title is inferred.

The public CV in `assets/cv/` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis are not published. There are no invented articles or claimed live travel connections.

## Source and hosting

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps the site buildless. Fonts are bundled; the current edition requires no external runtime, account service or build step.

- `index.html` — homepage entry and route forwarding.
- `island/index.html` — persistent folio pages, introduction and navigation.
- `island/folio.css` — spatial composition and reading layouts.
- `island/chapters.js` — reading views, derived from the public profile.
- `island/folio-main.js` — routing, categories, disclosures and preferences.
- `island/folio.js` — page poses, overview, transitions and margin interaction.
- `puzzle/content.js` — shared public profile content.
- `archive/` — fifteen preserved design iterations.
- `archive/15-island-object/` — the complete preceding edition with the continuous lowercase m.
- `design/ISLAND.md` — design notes.

Earlier editions preserve their own content and assets. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The real content arranged in space on [Rauno’s 2023 site](https://2023.rauno.me/) and the continuous index-to-project movement of [Times Two](https://timestwo.design/) informed the direction. The folio interaction, layouts and implementation were made for this site.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits.
