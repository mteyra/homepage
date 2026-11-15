# The Field Index — archived design study 01

Preserved on 14 November 2026 from `/tmp/field-index-rejected`.

Open `index.html` through a local HTTP server. The JavaScript modules, fonts, country geometry and artwork are all stored in this directory; this version does not depend on the current homepage's assets.

The source HTML, CSS, application code, instrument and design decisions are preserved. The incomplete temporary backup was supplemented with the original shared Manrope and JetBrains Mono fonts, mark and Europe geometry from the subsequent local version. Instrument Serif Italic was restored from the Google Fonts repository, with its OFL license. The Nomad artwork was restored from `mteyra/mteyra/assets/the-nomad.jpg` and converted to WebP. The initial `currentRole: null` and `cvPdf: null` configuration was restored so the first study retains its original placeholder behavior.

Original screenshots are in `design/previews/`. The complete design rationale is in `design/DECISIONS.md`.

From the repository root:

```sh
python3 -m http.server 8874
```

Then open `http://localhost:8874/archive/01-field-index/`.
