# Marc Teyra Galiano · Three directions

Three independent, fully working homepage designs for local review. The root is a comparison page; none has been selected as the published homepage.

## Open locally

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

- http://localhost:8874/ — compare the three directions.
- `editions/01-profile/` — **Profile**. Static, editorial, person-first. No JavaScript required. A complete reading experience with current work and study, background, credentials, concise projects and human context.
- `editions/02-orbit/` — **Orbit**. A physical 3D personal instrument. Drag and select its five chapters: Now, Study, Experience, Roots and Making. Ordinary controls and a reading view expose the same information.
- `editions/03-conversation/` — **Hello :D**. A nonlinear, animated introduction. Drag the smile to choose a question, or use the question index and arrow keys. Six scenes contain current direction, a timeline, interests, languages/places and a small project selection.
- `archive/` — four preserved earlier versions, including the immediately preceding **In motion** version at `archive/04-in-motion/`.

No build step. Fonts, Three.js and the new visual assets are local. Public project and certificate links require a connection. No hosting changes, publication or Git push were made.

## Design and content

The person is the organizing subject. Projects are supporting evidence, with short descriptions and source links. No fictional architecture, authored articles, personal portrait or invented employment title is introduced. The same verified profile facts underpin all three approaches, while the interface and visual language deliberately differ.

Current employer: Siemens Healthineers, since April 2026. Degree: B.Sc. Artificial Intelligence at FAU, since October 2025, with a biomedical direction. Exact job title/team and formal specialization wording remain unresolved. Labwork, clinical shadowing, course certificates and collaborative prototypes are described as such. The conflicting Icosagen year is omitted.

The public CV at `assets/cv/marc-teyra-cv-2026-02.pdf` is the existing February 2026 derivative; it predates the current job and has its private contact header removed. Raw CV variants and LinkedIn exports remain outside this repository.

The new static and spatial editions each own their files in `editions/`. The experimental edition has `index.html`, `conversation.css`, `conversation.js` and `ink.js`; the canvas is expressive drawing rather than a data visualization. Motion can be paused and reduced-motion preferences are respected.

## Travel and archives

The original 2024 travel journal remains available. No live MapOut connection is claimed or created. The existing GPX/KML importer and route preview remain available in the archived In motion edition. The root comparison page preserves the prior `?atlas=preview#travel` handoff by forwarding it to that archived viewer on the same origin.

Archived versions keep their original files and content. Their claims, dates and design reflect the point at which they were archived. The gallery gains a new entry; the new snapshot’s gallery link is rebased so navigation still works. Earlier snapshots are unchanged.

## Credits

- Three.js, MIT: `assets/vendor/THREE-LICENSE.txt`.
- Manrope and JetBrains Mono, SIL Open Font License: `assets/fonts/LICENSES.txt`.
- Newsreader used by Profile: license in `editions/01-profile/`.
- Existing country geometry: Natural Earth, public domain.

See `design/THREE-DIRECTIONS.md` for the rationale and `design/three-directions-qa.json` for verification.
