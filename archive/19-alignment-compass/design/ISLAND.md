# Compass · Marc Teyra Galiano

## The governing preference

Marc repeatedly asked for whitespace, clear separation and intuitive organization. The site must represent his studies, work, experiences and projects, with enough character to reward curiosity. Information must be available without being exposed all at once.

The positive references are Rauno’s simple black-and-white hero and floating dock, Orbit’s clarity and restrained, interactive 3D. Generic portfolios, cheap-looking navigation, narrow reading pages, the white-and-lime palette, fictional buildings, arbitrary M sorting and the wing motif were rejected. Marc identified a Gmail resemblance in the segmented M and disliked its click navigation. He subsequently rejected the spatial folio’s appearance and animation.

The design keeps information available through a small number of visibly separated views. Width provides room for text and spacing. Simulated visitor reviews and design assessments remain hypotheses; Marc’s direct feedback takes precedence.

## Composition

A dark graphite field holds stationary text and a small compass near the bottom of the screen. It starts at a low angle, giving its circular dial the broad oval silhouette of Orbit, and can be turned and tilted directly. Instrument Serif sets the full name, chapter headings and project titles. Manrope sets the body text, metadata and navigation.

The introduction uses two parts of the available width: Marc’s name on the left, his stated interests and current degree and employer on the right. Reading pages place the chapter heading and category controls beside the selected content. The page surfaces stay flat and still when views change.

- Studies identifies the degree, university and start date. Computation, Biology & medicine and Independent study are ordinary category links. One course group is visible at a time. Eight university courses, the independent courses, verified certificates and the audited-course distinction remain accessible.
- Experience identifies the current employer and start date. Teams & prototypes, Science & care and Robotics & games are separate groups. Short contributions are visible; supporting accounts and outcomes open in native HTML disclosures.
- Projects contains four brief descriptions with direct project, source, presentation or CV links.

On smaller screens, the reading layout becomes a single column and category links run above their content. The CV stays in the header. GitHub and LinkedIn sit at the lower edge; More opens the archive link and motion preference. The compass becomes smaller on reading views and phones, reserving space for the content.

## Interaction

About, Studies, Experience and Projects have ordinary HTML links. These are the primary navigation and keyboard controls. Arrow keys also move between views, while form controls and text selection retain their own input behavior.

The optional compass combines direct 3D manipulation with a small alignment puzzle. Horizontal dragging turns the whole instrument, including its case, dial and needle; vertical dragging changes its tilt. A sight shares the viewing tilt but does not turn with the compass. Its cardinal marks correspond to About at north, Studies at east, Experience at south and Projects at west. A bearing within 12 degrees of the sight shows its destination in the cue below. Releasing an intentional horizontal drag while aligned opens that section; ordinary clicks, vertical inspection and cancelled gestures do not navigate. A misaligned release leaves the orientation where the user put it. The form carries no additional claims about Marc’s achievements or interests.

The compass has no idle rotation or pointer-following movement. Once a turn settles, rendering stops scheduling animation frames. System reduced motion and manual pause preserve direct manipulation while skipping automatic animation. Touch dragging works in both axes within the compact compass canvas, with pinch zoom retained and ordinary scrolling available outside it. An SVG compass remains available when WebGL cannot render; the direct HTML links continue to work.

Category links update the URL, selected state and visible panel. Browser history and direct links select the corresponding group or individual entry. Experience details use native disclosures. Text remains selectable, and navigation leaves the reading surface stationary. A no-script introduction retains links to the CV and public profiles.

## References and assets

[Keita Yamada’s site](https://p5aholic.me/) was reviewed for restraint and stationary text. [Rauno’s 2023 site](https://2023.rauno.me/) remains a reference for its simple introduction and compact navigation. The earlier Calm Orbit review also identified the separation of a readable text area from a contained 3D object. These references informed the composition; no reference-site code or assets were copied.

Instrument Serif is bundled with its SIL Open Font License in `assets/fonts/INSTRUMENT-SERIF-OFL.txt`. Manrope’s license is in `assets/fonts/LICENSES.txt`. Three.js is bundled with its MIT license in `assets/vendor/THREE-LICENSE.txt`.

## Content boundaries

Marc Teyra Galiano studies B.Sc. Artificial Intelligence at FAU Erlangen-Nürnberg, since October 2025, and works at Siemens Healthineers, since April 2026. Computation, biology and medicine are stated interests; no formal specialization or job title is inferred.

The public CV is dated February 2026 and predates the current job. There is no portrait, hometown, invented article or claimed live travel connection. Public source facts remain in `puzzle/content.js`. Private source documents are not published.

## Preservation and publication

The preceding compass with its fixed viewing angle is preserved in `archive/18-compass-dial/`. The ring edition remains in `archive/17-spatial-index/`, and the spatial folio in `archive/16-spatial-folio/`. All eighteen earlier directions retain their own content and assets.

GitHub Pages serves `main` from the repository root. The site remains buildless and publishes to the existing address: https://mteyra.github.io/m.a.r.c_t.e.y.r.a/. Fonts and Three.js load from local assets.
