# Marc Teyra Galiano

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A personal homepage arranged as a 3D study. A notebook, microscope and Aloha palm introduce Studies, Experience and Projects. Selecting an object brings it into focus beside a readable HTML chapter. Marc’s name, current degree, employer and CV remain available through the ordinary page interface.

## Reading and interaction

The overview presents three labelled objects. Click an object or its HTML label to open the corresponding chapter; Explore also provides direct links. Drag to orbit the view, pinch or use the wheel to zoom, and reset to restore its framing. Mesh view exposes the geometry. Day and night modes change the scene and interface together.

Studies and Experience each show one selected category. Ordinary links switch categories and preserve browser history. The degree and current employer appear in their chapter introductions. Experience types, dates and contributions remain distinct; supporting accounts use native disclosures. Projects contain four descriptions with direct source, presentation or CV links.

On wide screens, the focused object and reading panel share the screen. On smaller screens, the object sits above the chapter and the page scrolls. HTML navigation and the CV work independently of WebGL. A preview image provides the scene fallback. Browser history, links to individual entries and keyboard navigation are supported. Reduced motion keeps direct manipulation and skips animated settling. The renderer stops requesting frames once the view settles.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

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
- `study/models-learning.js` — notebook and microscope illustrations.
- `study/model-palm.js` — adaptation of Aloha’s procedural palm.
- `study/preview.webp` — scene fallback when WebGL is unavailable.
- `puzzle/content.js` — shared public profile content.
- `archive/` — twenty preserved design iterations.
- `archive/20-faceted-compass/` — the preceding compass, frozen from `b5274c429493156dc3c13b20e2ab55972b43ce23`.
- `design/STUDY.md` — design notes for the current edition.

Earlier editions preserve their own content and assets. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The spatial overview and object inspection take direction from Rommelweb. The notebook and microscope are symbolic illustrations grounded in Marc’s coursework and supervised laboratory experience; they do not depict his personal equipment or assert medical qualifications.

The palm adapts the actual procedural exhibit in [Aloha Robotics](https://github.com/clschulzer/Aloha-Robotics-HH2.0), `Website/site/palm.mjs` (`buildExhibit`). Its fronds, folded leaflets, curved trunk and plinth are rebuilt as local Three.js geometry; the Aloha renderer and runtime are not required.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope uses the SIL Open Font License (`assets/fonts/LICENSES.txt`). The archived editions retain their own assets and credits, including Instrument Serif’s license in `assets/fonts/INSTRUMENT-SERIF-OFL.txt`.
