# Marc Teyra Galiano · Island

[Visit the homepage](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/)

A monochrome personal website with a two-sided sculptural wing, a floating navigation island and separate views for studies, experience and projects. The introduction uses both sides of the screen; each inner view pairs a small interactive 3D assembly with readable content.

Two identity studies share the same layout and content: [Wing](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/?form=wing) and [Fold](https://mteyra.github.io/m.a.r.c_t.e.y.r.a/?form=fold). The default is Wing. The query stays with the visitor while navigating between sections.

## Interaction

The landing sculpture develops Marc’s existing GitHub avatar: dark hexagonal heatshield tiles over a silver wing. Turning it reveals the continuous reverse. It is complete at rest, with no assembly task, score or required interaction.

Fold is a separate geometric direction: one continuous silver ribbon bends into an open M. Turning it makes the depth of its rounded lobes visible. It combines a personal initial with ordered folds and organic curvature; it does not depict a scientific structure. Inner sections reuse folded ribbon units.

The same cells become three facets in Studies, three connected clusters in Experience and four independent units in Projects. Each corresponds to a real content group or project. Text labels select the same content as the sculpture. Biography links open the relevant study group, with a direct connection from biomedical coursework to science and care experience. Projects stay concise, with presentations or demos alongside source links.

The thin, light navigation expands upwards into profile links, the archive and motion preferences. Browser history, shareable chapter selections, keyboard navigation, reduced motion and static WebGL fallbacks are supported. Sculptures stop rendering when hidden and become idle after settling.

## Content

`puzzle/content.js` contains the shared public profile: eight named university courses, three online courses, four certificate records, ten practical experiences and four selected projects. TUM’s course appears under independent study; the CS50 professional certificate is identified as a bundle.

The current degree is B.Sc. Artificial Intelligence at FAU, since October 2025, with a biomedical direction. Current employer: Siemens Healthineers, since April 2026. No unverified job title is inferred.

The public CV in `assets/cv/` is the February 2026 derivative with its private contact header removed. It predates the current job. Original source documents and private analysis are not published.

## Source and hosting

GitHub Pages serves `main` from the repository root. `.nojekyll` keeps the site buildless. Fonts and Three.js are bundled locally; no account service or build step is required.

- `index.html` — homepage entry and route forwarding.
- `island/` — current page, styles and 3D controllers.
- `puzzle/content.js` — shared public profile content.
- `archive/` — ten preserved design iterations.
- `archive/08-island/` — the original Island.
- `archive/09-island-wide/` — the subsequent graphite navigation and wide-grid edition.
- `archive/10-island-spatial/` — the first published Island, including the M puzzle.
- `design/ISLAND.md` — current design notes.

Earlier editions preserve their original content. The `?atlas=preview#travel` handoff opens the archived GPX/KML viewer. Live travel integration remains future work.

## Credits

The spacious hero and floating navigation of [Rauno’s 2023 site](https://2023.rauno.me/) informed the direction. Marc’s GitHub avatar informed the ceramic-and-silver sculpture. The geometry, interaction, layouts and implementation were made for this site.

Three.js is MIT licensed (`assets/vendor/THREE-LICENSE.txt`). Manrope and JetBrains Mono use the SIL Open Font License (`assets/fonts/LICENSES.txt`). Earlier editions retain their own credits.
