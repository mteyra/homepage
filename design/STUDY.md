# A personal study · Marc Teyra Galiano

## Direction

The new edition takes direction from Rommelweb’s spatial overview and object inspection. Three detailed objects give the page a place to explore, while plain labels and HTML chapters explain what each destination contains. Whitespace, clear separation and readable information remain the governing preferences.

The overview shows Marc’s name, B.Sc. Artificial Intelligence at FAU Erlangen-Nürnberg, current work at Siemens Healthineers and a dated CV link. Visitors can select Studies, Experience or Projects directly. Reaching this information does not require solving a puzzle or understanding an object metaphor.

## The three objects

- **Studies — notebook.** An open notebook represents learning across computation, biology and medicine. It is an authored symbolic illustration grounded in the listed coursework, not a reproduction of Marc’s personal notes or a claim that a pictured diagram is original research.
- **Experience — microscope.** The instrument refers to supervised laboratory participation and the scientific context behind some of Marc’s practical experience. It is a symbolic illustration, not a model of his personal equipment or evidence of a clinical role, medical qualification or independent research appointment.
- **Projects — Aloha palm.** This adapts the actual procedural palm from `Aloha-Robotics-HH2.0/Website/site/palm.mjs`, specifically `buildExhibit`. The construction retains its pinnate fronds, folded leaflets, curved ringed trunk, crown, coconuts and indexed plinth. Local Three.js geometry replaces the original exhibit renderer. The palm refers to the Aloha project; it does not represent a travel feed.

Selecting an object focuses the view on it and opens its chapter. On a wide screen, the object occupies the left side and the readable panel the right. Smaller screens place the object above the chapter. The chapter’s content remains ordinary, selectable HTML.

## Reading structure

Studies identifies the degree and its October 2025 start date. Computation, Biology & medicine and Independent study are separate category links, with one group shown at a time. All eight university courses, three online courses and four credential records remain present. The TUM course appears under independent study; CS50x and CS50P are also identified as the components of their professional certificate. University coursework is not labelled as completed, and the audited Python for Research course remains distinct.

Experience identifies Siemens Healthineers and the April 2026 start date without inventing a job title. Teams & prototypes, Science & care and Robotics & games preserve all ten accounts. Organisation, date where known, type and contribution are visible before opening a native disclosure for the fuller account and outcome. Supervised lab participation, clinical observation, team projects and employment remain distinct.

Projects preserves the four public or completed projects: Nixcare, Aloha Robotics, Marc’s NixOS setup and the autonomous Rubik’s Cube solver. Each entry gives its type, a brief description and relevant source, presentation or CV link. Projects form one chapter alongside studies and experience.

## Controls and resilience

Dragging orbits the camera around the overview or focused object. Pinch and wheel gestures zoom the 3D view; reset restores its framing. Mesh view reveals the objects’ geometry. Day and night modes update both the scene and the interface, and the selected theme is remembered locally.

Object labels and Explore use ordinary HTML links. The CV and public-profile links remain usable independently of the graphics module. Browser history, category links, links to individual entries, keyboard navigation and native disclosures support direct reading. A preview image and HTML navigation remain when WebGL is unavailable.

System reduced motion preserves direct manipulation while skipping animated settling and transitions. Once the view settles, the renderer stops requesting animation frames. Hidden-page handling, gesture cancellation and resource disposal belong to the scene lifecycle.

## Source and boundaries

`puzzle/content.js` remains the shared public source. `study/content.js` renders its chapters; `study/main.js` handles navigation and preferences; `study/scene.js` handles the spatial view. Manrope and Three.js are bundled locally with their licenses.

The public CV is the February 2026 derivative with its private contact header removed. It predates the current job. No portrait, hometown, invented article or live travel connection is added. Private CV sources and analysis remain outside the published repository.

## Preservation and hosting

The faceted compass edition is preserved in `archive/20-faceted-compass/` from exact commit `b5274c429493156dc3c13b20e2ab55972b43ce23`. Its runtime source and dependencies are frozen; the archive entry forwards routes into that snapshot and its archive link points back to the collection. All twenty earlier editions retain their own content and assets.

GitHub Pages continues to serve `main` from the repository root at https://mteyra.github.io/m.a.r.c_t.e.y.r.a/. The root entry routes into `study/`. `.nojekyll` keeps the site buildless; no hosting migration or new account service is required.
