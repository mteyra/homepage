# Open Sourcebook — design study 03

## The change in direction

Marc liked NOMAD's visual ambition but found its fictional architecture arbitrary. Projects, reports and evidence had become secondary to the scene. The new design makes the work itself the subject of exploration. NOMAD is preserved as a self-contained runnable archive, alongside Field Index.

The organising principle is outcome → mechanism → evidence. A first-time visitor sees plain-language project purpose and immediate access to employer, degree and CV. An interested reader can examine a mechanism, then open the full document with context, method, outcome and sources. No exploration puzzle or technical vocabulary is required to navigate.

## Visual and interaction design

An ivory, ink and chartreuse sourcebook with a persistent identity spine, large editorial type, aligned rules and original technical illustrations. Project plates are the main experience. Full reading spreads use generous prose alongside a synchronized mechanism. Content has room to be read; diagrams explain specific behavior.

- Nixcare: inspect a system, build an isolated candidate, activate explicitly.
- Aloha: device constraints, rule-based scheduling, human handover. Team attribution remains visible.
- Hack-A-Bot: gesture and voice contributions, combined interface, humanoid demonstration. No invented sensing implementation.
- NixOS: a real hinge-angle sensor, hysteresis thresholds and input behavior. The range control actually implements the documented 190° entry and 175° return thresholds; it does not read the visitor's hardware.

Aloha's actual engineering-study source gives the reading room a real report. Its illustration holds one architecture constant and compares three explicitly modeled scenarios. The common-scale chart, exact values, assumptions, run counts, methodology and source links remain together. It is labeled team material and synthetic simulation, never Marc's independently authored article or measured clinical impact.

## Responsive and accessible behavior

Desktop keeps identity and key facts visible in the spine. Mobile uses four plain-language navigation links, current affiliations/CV near the first project, and a single-column reader. Native modal behavior, restored opener focus, browser Back, direct links, arrow-key project selection, skip link and native range input support keyboard use. Manual pause disables animation rather than freezing an element at an invisible first frame.

## Evidence and remaining content questions

Content reuses the complete earlier review of all 17 CV files and the LinkedIn printout, then adds a fresh read-only audit of public GitHub source and contribution history. The full private CV comparison remains outside the repository. Public project evidence is in `project-evidence.json`.

Still open: exact Siemens title/team and role description, formal degree wording, personal copy approval, disputed historical months, selected public travel exports and a future publishing workflow. No missing detail is invented. The CV is identified as a February 2026 snapshot predating the current role. Public coursework with unfinished assignments is labeled accordingly.

## Archive

Field Index and NOMAD can run independently under their archive paths. Each carries its runtime assets; NOMAD's route importer returns to its own archived world. Original screenshots and notes are retained. These snapshots are not rewritten to match the new design.

## Delivery

Static local prototype for collaborative design review. No Git push, hosting mutation or publication. Existing GitHub Pages remains unchanged.
