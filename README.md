# Marc Teyra Galiano

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A personal homepage arranged as a 3D study, with Marc Teyra Galiano as its main heading. A notebook, microscope and miniature Rommelweb campus introduce Studies, Experience and Projects. Selecting an object brings it into focus beside a readable HTML chapter. The current degree, employer and CV remain available through the ordinary page interface.

## Reading and interaction

The overview presents three labelled objects. Click an object or its HTML label to open the corresponding chapter; Explore also provides direct links. Drag to orbit the view, pinch or use the wheel to zoom, and reset to restore its framing. Mesh view exposes the geometry. Day and night modes change the scene and interface together.

Studies and Experience each show one selected category. Selecting a study category turns a physical 3D sheet to a printed spread about computation, biology and medicine, or independent study. The topic notes are symbolic illustrations. Ordinary category links preserve browser history, and the degree and current employer appear in their chapter introductions. Experience types, dates and contributions remain distinct; supporting accounts use native disclosures. Projects contains five brief entries with direct links, beginning with the public, in-progress Rommelweb project.

On wide screens, the focused object and reading panel share the screen. On smaller screens, the object sits above the chapter and the page scrolls. HTML navigation and the CV work independently of WebGL. A preview image provides the scene fallback. Browser history, links to individual entries and keyboard navigation are supported. Reduced motion changes notebook spreads immediately and skips animated settling while keeping direct manipulation. The renderer stops requesting frames once the view and page turn settle.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and the four existing selected projects. `study/content.js` adds Rommelweb as the first of five project entries. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

Current study: B.Sc. Artificial Intelligence at FAU, since October 2025, with an interest in computation, biology and medicine. Current employer: Siemens Healthineers, since April 2026. No unverified job title is inferred.

The public CV in `assets/cv/` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis are not published. There are no invented articles or claimed live travel connections.

## Source and hosting

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps the site buildless. Fonts and Three.js are bundled locally; no account service or build step is required.

- `index.html` — homepage entry and route forwarding.
- `study/index.html` — introduction, scene labels, reading containers and navigation.
- `study/style.css` — typography, reading panels, themes and responsive layout.
- `study/content.js` — chapter HTML derived from the public profile.
- `study/main.js` — routing, categories, keyboard controls and preferences.
- `study/scene.js` — overview, object focus, camera controls and rendering.
- `study/models-learning.js` — printed notebook spreads, 3D page turns and microscope illustration.
- `study/model-campus.js` and `study/campus-mesh.js` — the eleven-building Rommelweb miniature.
- `study/model-palm.js` — retained Aloha palm asset, unused by the current scene.
- `study/preview.webp` — scene fallback when WebGL is unavailable.
- `puzzle/content.js` — shared public profile content.
- `archive/` — twenty-one preserved design iterations.
- `archive/21-personal-study/` — the preceding notebook, microscope and Aloha palm edition, frozen from `44ccaf77f63142401b7eadca05d171d75f8bfb41`.
- `archive/20-faceted-compass/` — the earlier compass, frozen from `b5274c429493156dc3c13b20e2ab55972b43ce23`.
- `design/STUDY.md` — design notes for the current edition.

Earlier editions preserve their own content and assets. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The spatial overview and object inspection take direction from [Rommelweb](https://github.com/mteyra/rommelweb). Its public exterior and path geometry supplies the campus miniature, including all eleven buildings. The notebook and microscope are symbolic illustrations grounded in Marc’s coursework and supervised laboratory experience; they do not reproduce his personal notes or equipment or assert medical qualifications.

Campus data: **Datenquelle: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de**, [LoD2-BY](https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=lod2), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Paths: **© OpenStreetMap contributors**, [ODbL](https://www.openstreetmap.org/copyright). Rommelweb’s façade details are photographic appearance estimates, not surveyed openings or interiors. The miniature adapts the geometry to a common display scale; its plinth is not surveyed terrain.

The preceding edition’s palm adapts [Aloha Robotics](https://github.com/clschulzer/Aloha-Robotics-HH2.0), `Website/site/palm.mjs` (`buildExhibit`). It remains preserved in the archive and as an unused source asset.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope uses the SIL Open Font License (`assets/fonts/LICENSES.txt`). The archived editions retain their own assets and credits, including Instrument Serif’s license in `assets/fonts/INSTRUMENT-SERIF-OFL.txt`.
