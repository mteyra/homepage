# Marc Teyra Galiano

**Live:** https://mteyra.github.io/m.a.r.c_t.e.y.r.a/

My personal homepage, arranged as a 3D study. A notebook opens my **Studies**, a microscope my **Experience**, and a miniature of the Rommelweb campus my **Projects**. Selecting an object brings it into focus beside a readable chapter. Navigation, chapters and the CV also work without WebGL.

## Structure

```
index.html            page structure, labels and navigation
css/style.css         typography, day/night themes, responsive layout
js/main.js            routing, categories, keyboard controls, preferences
js/scene.js           3D overview, object focus, camera and rendering
js/content.js         chapter HTML built from data/profile.js
js/models-learning.js notebook spreads and microscope objectives
js/project-display.js the flipping plate that shows one project exhibit at a time
js/models-projects.js nixcare, workstation and cube-solver exhibits
js/model-campus.js    Rommelweb campus miniature (geometry in js/campus-mesh.js)
js/model-palm.js      Aloha Robotics palm exhibit
data/profile.js       all profile text: courses, credentials, experience, projects
assets/               Three.js, Manrope font, CV, icon, no-WebGL preview image
docs/DESIGN.md        design notes
health-sync/          page and privacy policy for my health-sync tool (needed by Google sign-in)
```

## Editing

All text lives in `data/profile.js`; `js/content.js` turns it into the chapters. To change the CV, replace the file in `assets/cv/` and update its name in `index.html` and `data/profile.js`.

## Run locally

The scripts are ES modules, so open the site through a local server rather than as a file:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publishing

GitHub Pages serves `main` from the repository root. There is no build step; `.nojekyll` keeps Pages from processing the files.

## Earlier designs

The 22 earlier versions of this site are kept on the [`archive` branch](https://github.com/mteyra/m.a.r.c_t.e.y.r.a/tree/archive/archive), unchanged.

## Credits

- Campus geometry: **Datenquelle: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de**, [LoD2-BY](https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=lod2), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Paths: **© OpenStreetMap contributors**, [ODbL](https://www.openstreetmap.org/copyright).
- The palm exhibit adapts [Aloha Robotics](https://github.com/clschulzer/Aloha-Robotics-HH2.0) (`Website/site/palm.mjs`).
- [Three.js](https://threejs.org), MIT License (`assets/vendor/THREE-LICENSE.txt`).
- Manrope, SIL Open Font License 1.1 (`assets/fonts/LICENSES.txt`).

The notebook, microscope and hardware exhibits are symbolic illustrations, not replicas of real notes or equipment.
