# Marc Teyra · In motion

Design study 04. A kinetic personal workspace: a responsive 3D particle ribbon, floating previews of actual projects, live project windows, and a working command interface. The same particle surface becomes a project aperture, an open helix or a geographic globe as the visitor moves around.

## Local preview

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

Open http://localhost:8874/ . No build step or package installation. The scene, fonts and previews are local; opening an interactive project loads its public GitHub Pages site. Existing public hosting has not been changed.

- `#home`: name, degree, employer, 3D scene and floating project previews.
- `#work/aloha`, `#work/nixcare`, `#work/nixos`: real project experiences or an exact source excerpt.
- `#about`: current work and study, CV, experience and credentials.
- `#travel`: 11 countries from the historical journal, plus a local GPX/KML preview when requested.
- **Terminal** (button, `/`, or Ctrl/Cmd K): `help`, `whoami`, `projects`, `open aloha`, `open nixcare`, `open nixos`, `about`, `travel`, `cv`, `reports`, `github`, `clear`, `exit`. History and tab completion work. Commands navigate this site; they never execute a shell.
- `archive/`: runnable snapshots of Field Index, NOMAD and Open Sourcebook.

## Source

- `index.html`: semantic content, navigation, project window and modal interfaces.
- `assets/signal.css`: responsive layout, window choreography and visual system.
- `assets/signal.js`: routes, allowlisted live frames, current profile, project catalog and local route preview.
- `assets/signal-world.js`: shared-particle Three.js scene, geography, motion and lifecycle.
- `assets/terminal.js`: bounded command interpreter and keyboard behavior.
- `assets/content.js`: verified profile and completed/public project data.
- `assets/previews/`: captures of the actual public project experiences.
- `assets/nixos-source.txt`: exact lines 38–58 of the reviewed public `flake.nix`.
- `assets/cv/`: public February 2026 CV derivative with the private contact header removed.
- `atlas-studio.html`, `assets/atlas-studio.js`: local GPX/KML import, endpoint trimming, coordinate rounding and preview/export.

The homepage does not create new architecture diagrams or substitute summaries for working projects. Aloha is credited as team work; Marc's contribution is stated separately. Clinical actions are simulations. Its report link points to the team's original synthetic engineering study. No authored articles are invented.

Siemens Healthineers since April 2026 and AI study at FAU since October 2025 are verified from the supplied sources. Exact job title/team and formal degree wording remain open. The February CV predates the current job.

## Motion and access

Ordinary navigation and the terminal lead to the same content. The name, degree, employer and CV do not require waiting for an introduction. The scene responds to pointer movement, respects reduced motion and has a persistent pause control. Background rendering stops when the tab is hidden. Without WebGL, the content and project windows continue to work. Without JavaScript, the landing content and direct CV/GitHub links remain available.

Live embeds are third-party pages and require a network connection; their external links remain available in the window toolbar. Their current audience and behavior are controlled by the original projects.

## MapOut

A real MapOut cloud connection is not configured. Atlas Studio reads a selected GPX/KML export, cleans it, and passes coordinates through same-tab session storage for preview. Nothing is uploaded or published. Clearing the preview removes those stored coordinates. The globe's historical country highlights do not imply an exact recorded route. See `design/MAPOUT.md` for the existing integration research.

## Credits

- Three.js: MIT, `assets/vendor/THREE-LICENSE.txt`.
- Manrope and JetBrains Mono: SIL Open Font License, `assets/fonts/LICENSES.txt`.
- Country geometry: Natural Earth, public domain.
- Project screenshots retain their original project context. The Aloha character is shown within the team's presentation, not reused as a personal mascot.
