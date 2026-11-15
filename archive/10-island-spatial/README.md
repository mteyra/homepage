# Marc Teyra Galiano · Island

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A monochrome personal website with a sculptural M, a floating navigation island and separate views for studies, experience and projects. The introduction uses both sides of the screen; each inner view pairs a small interactive 3D assembly with readable content.

## Interaction

The M is an optional three-piece puzzle. Click a piece or use “Fit the pieces”; keyboard arrows select a piece and Enter aligns it. The profile and CV are always accessible.

Studies uses three intersecting rings for computation, biology and medicine, and independent study. Experience uses three layered pieces for its groups. Text labels and keyboard controls select the same content as the sculpture. Projects stays concise: four public or completed works with direct source links, accompanied by four frames that respond to selection.

The thin, light navigation expands upwards into profile links, the archive and motion preferences. Browser history, keyboard navigation, reduced motion and static WebGL fallbacks are supported. Sculptures stop rendering when hidden and chapter objects become idle after settling.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

The current degree is B.Sc. Artificial Intelligence at FAU, since October 2025, with a biomedical direction. Current employer: Siemens Healthineers, since April 2026. No unverified job title is inferred.

The public CV in `assets/cv/` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis are not published.

## Source and hosting

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps the site buildless. Fonts and Three.js are bundled locally; no account service or build step is required.

- `index.html` — homepage entry and route forwarding.
- `island/` — current page, styles and 3D controllers.
- `puzzle/content.js` — shared public profile content.
- `archive/` — nine preserved design iterations.
- `archive/08-island/` — the original Island.
- `archive/09-island-wide/` — the subsequent graphite navigation and wide-grid edition.
- `design/ISLAND.md` — current design notes.

Earlier editions preserve their original content. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The spacious hero and floating navigation of [Rauno’s 2023 site](https://2023.rauno.me/) informed the direction. The monogram, materials, interaction, layouts and implementation are original.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits.
