# Marc Teyra Galiano

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A personal homepage on a dark graphite background. Instrument Serif sets the name and chapter headings; Manrope sets the body text. About, Studies, Experience and Projects occupy stationary HTML reading views. A larger faceted 3D compass gives the introduction a diagonal oval silhouette, with its stage in document flow to keep the text and object apart. Reading views use a smaller compass.

## Reading and interaction

Explore holds the four HTML section links for direct access. The compass offers a small alignment puzzle for the same destinations: About at north, Studies at east, Experience at south and Projects at west. Horizontal dragging turns the whole instrument; vertical dragging tilts it in 3D. A sight shares the viewing tilt but stays fixed while the compass turns. Release an intentional horizontal drag with a bearing within 12 degrees of the sight to open that section. Clicking does not navigate, and a misaligned release leaves the orientation in place. A short cue below the compass names the destination when aligned.

Studies and Experience each show one selected category. Ordinary links switch categories and preserve browser history. The degree and current employer appear in their chapter introductions. Supporting experience accounts use native disclosures. Projects remain four concise entries with direct links.

GitHub and LinkedIn sit in the footer; Explore also holds the design archive and motion preference. Browser history, direct links into course and experience groups, keyboard navigation and reduced motion are supported. Text and page surfaces stay still during navigation. The compass accepts touch dragging in both axes and permits pinch zoom; the surrounding page retains normal scrolling. Reduced motion preserves direct manipulation and skips automatic animation. Reading and navigation are available before the graphics module loads. The locally bundled Three.js renderer rests when the instrument settles; an SVG compass takes its place if WebGL is unavailable.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

Current study: B.Sc. Artificial Intelligence at FAU, since October 2025, with an interest in computation, biology and medicine. Current employer: Siemens Healthineers, since April 2026. No unverified job title is inferred.

The public CV in `assets/cv/` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis are not published. There are no invented articles or claimed live travel connections.

## Source and hosting

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps the site buildless. Fonts and Three.js are bundled locally; no account service or build step is required.

- `index.html` — homepage entry and route forwarding.
- `island/index.html` — introduction, reading containers and navigation.
- `island/index.css` — typography, page layouts and responsive styles.
- `island/chapters.js` — reading views, derived from the public profile.
- `island/index-main.js` — routing, categories, keyboard controls and preferences.
- `island/index-scene.js` — compass geometry, selection, drag handling and rendering.
- `puzzle/content.js` — shared public profile content.
- `archive/` — nineteen preserved design iterations.
- `archive/19-alignment-compass/` — the preceding smaller alignment compass and horizontal section links.
- `design/ISLAND.md` — design notes.

Earlier editions preserve their own content and assets. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The reference review used [Keita Yamada’s site](https://p5aholic.me/) for restraint and stationary text, and [Rauno’s 2023 site](https://2023.rauno.me/) for its simple introduction and compact navigation. No source code or assets were copied from either reference site.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Instrument Serif is bundled under the SIL Open Font License (`assets/fonts/INSTRUMENT-SERIF-OFL.txt`). Manrope and the archived editions’ JetBrains Mono use the same license (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits.
