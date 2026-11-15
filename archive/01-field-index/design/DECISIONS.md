# The Field Index — design study 01

The intended experience is a personal observatory: ordinary, useful navigation around one memorable interactive instrument. A visitor should understand Marc's direction immediately, then choose how deeply to explore.

## Design decisions

- Deep green-black, warm paper, and amber. Manrope for reading, Instrument Serif for a human editorial accent, JetBrains Mono for indexing.
- Work, About, Writing, Atlas are visible navigation. About & CV remains available in a sticky header. Contact is a dedicated final section and searchable through navigation.
- Ctrl/Command K is a convenience, not a requirement. Search supports projects and ordinary terms such as CV, research, and travel.
- The 3D wireframe has systems, intelligence, and exploration forms. It stays separate from the reading column, pauses offscreen and in hidden tabs, respects reduced motion, and has an explicit pause control.
- Content is serverless, progressively enhanced HTML. The page remains readable without decorative rendering.
- Public projects are curated. Ownership or a profile claim does not prove a feature is complete.

## Evidence used

- https://github.com/mteyra/mteyra — name, degree wording, interests, roots, Nomad artwork, LinkedIn destination.
- https://github.com/mteyra/nixcare — diagnostic and maintenance scope; project documentation.
- https://github.com/mteyra/nixos-config — public workstation configuration, flake architecture, hardware integration.
- https://github.com/clschulzer/Aloha-Robotics-HH2.0 — public team work; README credits Marc, Sid, and Chris and fourth place at the 2026 healthcare hackathon. Contribution API confirms `mteyra` contributed. Exact personal responsibilities still need Marc's wording.
- https://mteyra.github.io/m.a.r.c_t.e.y.r.a/ — historical 2024 Baltics/Balkans route countries. Croatia occurred twice in the route; the atlas highlights each country once. No precise locations are invented.
- LinkedIn direct retrieval returned 999. The available browser connector exposed no browser. Only public search fragments were accessible, so they were not used to invent work/education history.

The old homepage returns HTTP 200 but references a missing stylesheet and uses nonfunctional `#` navigation. The first design is prepared locally without changing that deployment.

## Content to complete together

1. Preferred portrait from LinkedIn or an original photo.
2. Current job title, organisation, dates, responsibilities, and public-safe description.
3. Degree institution, dates, and any confirmed research focus.
4. CV file, plus a clear public download name.
5. The problem, Marc's contribution, and outcome for each featured project.
6. Authored articles/reports: title, date, type, summary, and a PDF or canonical URL. The current writing rows are explicitly project/team documentation.
7. Public contact preference and language preference (current draft: English).
8. Selected Google My Maps source and permission to display those travel entries.

## My Maps options

**Native embed:** simplest live view; changes to a shared My Map appear in Google's own map. Little control over the visual design. Load on user interaction if external requests should be deferred.

**Custom atlas:** verify the chosen map offers an exportable public KML feed, then fetch and validate it during a scheduled GitHub Actions build. Convert selected geometry into the site's small JSON format, record a real sync timestamp, and retain the last known good dataset after failures. This avoids exposing credentials or relying on client-side CORS. A map ID alone does not establish that automated export works; verify the selected feed first.

Do not use private repositories, precise travel history, or confidential employment material simply because an authenticated account can access them.
