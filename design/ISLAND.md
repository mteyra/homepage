# Spatial folio · Marc Teyra Galiano

## The governing preference

Marc repeatedly asked for whitespace, clear separation and intuitive organization. The site must represent his studies, work, experiences and projects, with enough character to reward curiosity. Information must be available without being exposed all at once.

The positive references are Rauno’s simple black-and-white hero and floating dock, Orbit’s clarity and restrained, interactive 3D. Generic portfolios, cheap-looking navigation, narrow reading pages, the white-and-lime palette, fictional buildings, arbitrary M sorting and the wing motif were rejected. The segmented M resembled Gmail; changing it to a continuous lowercase m still repeated the same decorative idea.

More width does not mean more columns. More personality does not mean more widgets. The site must have one coherent interaction whose purpose visitors can understand. Simulated visitor reviews must not outweigh Marc’s direct feedback.

## The new premise

The content itself occupies space. Four persistent HTML pages form a folio: About, Studies, Experience and Projects. There is no separate sculpture above otherwise conventional content.

The cover rests at a slight angle. “Browse the folio” spreads the same pages into an overview, then a selected page moves forward and settles flat for reading. The dock also navigates directly, and the outer page margins support turning to an adjacent page. Nothing must be solved or discovered before Marc’s information is available.

The reference review found two useful principles: Rauno places real work into a spatial composition; Times Two preserves continuity between its index and a selected project. This folio applies those principles to Marc’s broader profile, rather than making projects the entire experience.

## Composition

The cover places the full name and a short factual introduction on opposite sides of a broad surface. A small browse control is the only added invitation. Fine page edges provide depth; square corners and restrained shadows keep the surfaces closer to paper than dashboard cards.

Reading pages use the available width with generous margins. The heading, one brief introduction and a clearly selected category precede the content. Neighboring sheets reveal only a narrow paper edge while reading.

- Studies identifies the degree, university and start date. Computation, Biology & medicine and Independent study are ordinary category links. One course group is visible at a time. All eight university courses, the independent courses, verified certificates and audited-course distinction remain accessible.
- Experience identifies the current employer and start date. Teams & prototypes, Science & care and Robotics & games are separate views. Short contributions are visible; supporting accounts and outcomes open in place.
- Projects is a short list with brief descriptions and direct project, source, presentation or CV links. No invented architecture or demonstration is added.

Phones retain the reading layout and use one large overview preview with previous and next controls. The CV stays in the header. GitHub, LinkedIn, the archive and motion preferences stay in the dock’s expandable menu.

## Interaction

The same DOM surfaces persist throughout navigation. Dock changes, margin dragging and overview selection share a continuous spatial transition. The content remains native HTML; there is no WebGL requirement.

Only the current reading page, or visible overview previews, participate in focus and pointer interaction. Native vertical scrolling and text selection remain available. Margin dragging is optional; the dock reaches every page directly.

Category links update the URL, selected state and visible panel without rebuilding the pages. Direct links and browser history restore the appropriate group. Switching categories keeps the chapter introduction in context. The selected panel enters with a small, brief movement; supporting experience details expand in place.

System reduced motion and manual pause make navigation immediate. Animation frames stop once a transition settles and when the page is hidden. A static no-script introduction retains links to the CV and public profiles.

## Content boundaries

Marc Teyra Galiano studies B.Sc. Artificial Intelligence at FAU Erlangen-Nürnberg, since October 2025, and works at Siemens Healthineers, since April 2026. Computation, biology and medicine are stated interests; no formal specialization or job title is inferred.

The public CV is dated February 2026 and predates the current job. There is no portrait, hometown, invented article or claimed live travel connection. Public source facts remain in `puzzle/content.js`. Private source documents are not published.

## Preservation and publication

The preceding continuous-m edition is preserved in `archive/15-island-object/`. All fifteen earlier directions retain their own content and assets.

The current site publishes to the existing GitHub Pages address: https://mteyra.github.io/m.a.r.c_t.e.y.r.a/.
