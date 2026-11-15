# A personal study · Marc Teyra Galiano

## Direction

The new edition takes direction from Rommelweb’s spatial overview and object inspection. Three detailed objects give the page a place to explore, while plain labels and HTML chapters explain what each destination contains. Whitespace, clear separation and readable information remain the governing preferences.

The overview leads with **Marc Teyra Galiano** as its main heading, followed by his stated interests. B.Sc. Artificial Intelligence at FAU Erlangen-Nürnberg, current work at Siemens Healthineers and a dated CV link remain visible. Visitors can select Studies, Experience or Projects directly.

## The three objects

- **Studies — notebook.** Selecting a study category turns an actual curved, hinged 3D sheet, with printed front and back faces and a paper-thickness edge. The three spreads cover computation, biology and medicine, and independent study. These schematic subject notes are grounded in the coursework; they do not reproduce Marc’s personal notes or present original research.
- **Experience — microscope.** The instrument refers to supervised laboratory participation and the scientific context behind some of Marc’s practical experience. It is a symbolic illustration, not a model of his personal equipment or evidence of a clinical role, medical qualification or independent research appointment.
- **Projects — Rommelweb campus.** A miniature contains all eleven building models from the public Rommelweb project, preserving their relative placement, proportions and base-height differences at one display scale. Exterior and path geometry is baked into local assets. The façade details are photographic appearance estimates rather than surveyed openings or interiors; the thin display plinth does not claim to reproduce the terrain. The earlier Aloha palm remains in the archive and as an unused source asset.

Selecting an object focuses the view on it and opens its chapter. On a wide screen, the object occupies the left side and the readable panel the right. Smaller screens place the object above the chapter. The chapter’s content remains ordinary, selectable HTML.

## Reading structure

Studies identifies the degree and its October 2025 start date. Computation, Biology & medicine and Independent study are separate category links, with one group shown at a time and a corresponding printed notebook spread. All eight university courses, three online courses and four credential records remain present. The TUM course appears under independent study; CS50x and CS50P are also identified as the components of their professional certificate. University coursework is not labelled as completed, and the audited Python for Research course remains distinct.

Experience identifies Siemens Healthineers and the April 2026 start date without inventing a job title. Teams & prototypes, Science & care and Robotics & games preserve all ten accounts. Organisation, date where known, type and contribution are visible before opening a native disclosure for the fuller account and outcome. Supervised lab participation, clinical observation, team projects and employment remain distinct.

Projects leads with Rommelweb, clearly identified as public and in progress, then preserves Nixcare, Aloha Robotics, Marc’s NixOS setup and the autonomous Rubik’s Cube solver. Each of the five entries gives its type, a brief description and relevant source, presentation or CV link. Rommelweb’s public campus explorer does not imply that its planned private resident services are operational.

## Controls and resilience

Dragging orbits the camera around the overview or focused object. Pinch and wheel gestures zoom the 3D view; reset restores its framing. Mesh view reveals the objects’ geometry. Day and night modes update both the scene and the interface, and the selected theme is remembered locally.

Object labels and Explore use ordinary HTML links. The CV and public-profile links remain usable independently of the graphics module. Browser history, category links, links to individual entries, keyboard navigation and native disclosures support direct reading. A preview image and HTML navigation remain when WebGL is unavailable.

System reduced motion preserves direct manipulation while applying notebook spread changes immediately and skipping animated settling and transitions. Once the view and page turn settle, the renderer stops requesting animation frames. Hidden-page handling, gesture cancellation and resource disposal belong to the scene lifecycle.

## Source and boundaries

`puzzle/content.js` remains the shared public source. `study/content.js` renders its chapters and adds the current Rommelweb entry. `study/main.js` handles navigation and preferences; `study/scene.js` handles the spatial view; `study/models-learning.js` contains the notebook’s printed spreads and page-turn controller.

`study/model-campus.js` and `study/campus-mesh.js` adapt Rommelweb’s public `public/data/lod2.json` and its exterior, window, façade and path presentation. Building data attribution: **Datenquelle: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de**, [LoD2-BY](https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=lod2), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Paths: **© OpenStreetMap contributors**, [ODbL](https://www.openstreetmap.org/copyright). No room, resident or interior dataset or source photograph is bundled. Manrope and Three.js retain their local license files.

The public CV is the February 2026 derivative with its private contact header removed. It predates the current job. No portrait, hometown, invented article or live travel connection is added. Private CV sources and analysis remain outside the published repository.

## Preservation and hosting

The preceding personal study with its notebook, microscope and Aloha palm is preserved in `archive/21-personal-study/` from exact commit `44ccaf77f63142401b7eadca05d171d75f8bfb41`. The faceted compass remains in `archive/20-faceted-compass/` from `b5274c429493156dc3c13b20e2ab55972b43ce23`. All twenty-one earlier editions retain their own content and assets, with archive links adjusted to the collection.

GitHub Pages continues to serve `main` from the repository root at https://mteyra.github.io/m.a.r.c_t.e.y.r.a/. The root entry routes into `study/`. `.nojekyll` keeps the site buildless; no hosting migration or new account service is required.
