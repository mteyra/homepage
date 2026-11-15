import { profile, coursework, credentials, experiences, projects } from '../puzzle/content.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const external = 'target="_blank" rel="noopener"';
const outward = '<span class="external-arrow" aria-hidden="true">↗</span>';
const titles = { studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const dates = { '2024–25': '2024–2025', '2017–18': '2017–2018' };
const credentialById = new Map(credentials.map(entry => [entry.id, entry]));
const experienceById = new Map(experiences.map(entry => [entry.id, entry]));
const selectedProjects = [{
  id: 'rommelweb',
  title: 'Rommelweb',
  type: 'Public campus explorer · in development',
  text: 'An interactive 3D campus explorer using official building geometry, with detailed façades, floor-plan studies and community information.',
  url: 'https://mteyra.github.io/rommelweb/',
  sourceUrl: 'https://github.com/mteyra/rommelweb',
}, ...projects];
const experienceGroups = [
  {
    id: 'teams-prototypes',
    title: 'Teams & prototypes',
    items: ['hack-a-bot', 'zhaw-smart-systems', 'eelisa-entrepreneurship', 'healthcare-hackathon-2025'],
  },
  {
    id: 'science-care',
    title: 'Science & care',
    items: ['icosagen-shadowing', 'pharmaceutical-scraper', 'veterinary-shadowing', 'biological-data'],
  },
  {
    id: 'robotics-games',
    title: 'Robotics & games',
    items: ['junior-game-jam', 'first-lego-league'],
  },
];

function masthead(kind, deck, meta = '') {
  return `<header class="chapter-masthead">
    <div class="chapter-heading">
      <h1 id="${esc(kind)}-title" tabindex="-1">${esc(titles[kind])}</h1>
      <div class="chapter-context">
        <p class="chapter-deck">${esc(deck)}</p>
        ${meta ? `<p class="chapter-meta">${esc(meta)}</p>` : ''}
      </div>
    </div>
  </header>`;
}

function sectionNav(kind, groups) {
  return `<nav class="section-nav" aria-label="${kind === 'studies' ? 'Areas of study' : 'Areas of experience'}">${groups.map((group, index) =>
    `<a id="${esc(kind)}-group-${esc(group.id)}" href="#${esc(kind)}/${esc(group.id)}" data-group="${esc(group.id)}"${index === 0 ? ' aria-current="location"' : ''}>${esc(group.title)}</a>`
  ).join('')}</nav>`;
}

function universityGroup(group, index) {
  return `<section class="chapter-panel course-area" id="study-${esc(group.id)}" data-group-panel="${esc(group.id)}" aria-labelledby="studies-group-${esc(group.id)}"${index === 0 ? '' : ' hidden'}>
    <p class="group-meta">${esc(group.kind)}</p>
    <ul class="course-list">${group.items.map(item => `<li id="study-${esc(item.id)}">
      <span class="course-title">${esc(item.title)}</span>
      ${item.code ? `<span class="course-meta">${esc(item.code)}</span>` : ''}
    </li>`).join('')}</ul>
  </section>`;
}

function independentCourse(item) {
  const credential = credentialById.get(item.credentialId);
  const meta = [item.institution, item.status, item.date].filter(Boolean).join(' · ');
  const text = `<span class="course-copy">
    <span class="course-title">${esc(item.title)}</span>
    <span class="course-meta">${esc(meta)}</span>
  </span>`;
  return `<li id="study-${esc(item.id)}">${credential
    ? `<a href="${esc(credential.url)}" ${external} aria-label="${esc(`${item.title}, ${item.status}, view certificate`)}">${text}${outward}</a>`
    : text}</li>`;
}

function studies() {
  const independent = coursework.find(group => group.id === 'independent-study');
  const tum = credentialById.get('digitalisation-space');
  const bundle = credentialById.get('computer-science-python');
  return `${masthead('studies', `${profile.degree.title} at ${profile.degree.institution}.`, `Since ${profile.degree.since}`)}
    ${sectionNav('studies', coursework)}
    <div class="chapter-panels">
      ${coursework.filter(group => group.id !== 'independent-study').map(universityGroup).join('')}
      <section class="chapter-panel course-area" id="study-independent-study" data-group-panel="independent-study" aria-labelledby="studies-group-independent-study" hidden>
        <ul class="course-list">
          ${independent.items.map(independentCourse).join('')}
          <li id="study-${esc(tum.id)}"><a href="${esc(tum.url)}" ${external} aria-label="${esc(`${tum.title}, view certificate`)}">
            <span class="course-copy"><span class="course-title">${esc(tum.title)}</span>
              <span class="course-meta">${esc(`${tum.institution} · ${tum.type} · ${tum.date}`)}</span></span>${outward}
          </a></li>
        </ul>
        <p class="certificate-note">CS50x and CS50P also form the <a href="${esc(bundle.url)}" ${external}>${esc(bundle.title)} professional certificate ${outward}</a>.</p>
      </section>
    </div>`;
}

function experienceRow(id) {
  const entry = experienceById.get(id);
  const date = dates[entry.date] ?? entry.date;
  return `<details class="experience" id="${esc(entry.id)}">
    <summary>
      <span class="entry-overview">
        <strong class="entry-title">${esc(entry.title)}</strong>
        <span class="entry-meta">${esc(entry.organisation)}${date ? ` · <span class="entry-date">${esc(date)}</span>` : ''}</span>
        <span class="entry-type">${esc(entry.type)}</span>
      </span>
      <span class="entry-contribution">${esc(entry.contribution)}</span>
      <span class="disclosure-icon" aria-hidden="true"></span>
    </summary>
    <div class="experience-body"><p>${esc(entry.text)}</p><p class="outcome">${esc(entry.outcome)}</p></div>
  </details>`;
}

function experience() {
  return `${masthead('experience', profile.currentRole.text, `Since ${profile.currentRole.since}`)}
    ${sectionNav('experience', experienceGroups)}
    <div class="chapter-panels">${experienceGroups.map((group, index) => `<section class="chapter-panel experience-group" id="experience-${esc(group.id)}" data-group-panel="${esc(group.id)}" aria-labelledby="experience-group-${esc(group.id)}"${index === 0 ? '' : ' hidden'}>
      <div class="experience-list">${group.items.map(experienceRow).join('')}</div>
    </section>`).join('')}</div>`;
}

function projectPage() {
  const summaries = {
    nixcare: 'Tools that check, maintain and safely update a NixOS Linux system.',
    aloha: 'Interactive web experiences and presentations for our team’s medical-device hackathon prototype.',
    'nixos-config': 'My declarative NixOS setup, including tablet-mode input and touchscreen recovery.',
    'cube-solver': 'A LEGO Mindstorms robot that solves a 3×3 cube. Mechanical design, sensors and EV3 programming.',
  };
  return `${masthead('projects', 'Public work and completed projects.')}
    <div class="project-index">${selectedProjects.map(project => `<section class="project-entry" id="project-${esc(project.id)}" data-project="${esc(project.id)}" aria-labelledby="project-${esc(project.id)}-title">
      <div class="project-heading">
        <h2 id="project-${esc(project.id)}-title"><button class="project-select" type="button" data-project-select="${esc(project.id)}" aria-label="View ${esc(project.title)} miniature" aria-pressed="${project.id === 'rommelweb'}">${esc(project.title)}</button></h2>
        <p class="project-meta">${esc(project.type)}</p>
      </div>
      <div class="project-description">
        <p>${esc(summaries[project.id] ?? project.text)}</p>
      </div>
      <div class="project-links">
        ${project.sourceUrl && project.url !== project.sourceUrl ? `<a href="${esc(project.url)}" ${external}>${project.id === 'aloha' ? 'View presentation' : project.id === 'rommelweb' ? 'Explore campus' : 'View project'} ${outward}</a>` : ''}
        ${project.sourceUrl ? `<a href="${esc(project.sourceUrl)}" ${external}>GitHub ${outward}</a>` : `<a href="${esc(project.url)}" ${external}>In my CV ${outward}</a>`}
      </div>
      ${project.id === 'rommelweb' ? `<p class="model-credit">Miniature geometry: <a href="https://www.geodaten.bayern.de" ${external}>Bayerische Vermessungsverwaltung</a> · <a href="https://creativecommons.org/licenses/by/4.0/" ${external}>CC BY 4.0</a>. Paths <a href="https://www.openstreetmap.org/copyright" ${external}>© OpenStreetMap contributors</a>. Adapted for this model.</p>` : ''}
    </section>`).join('')}</div>
    <a class="github-link" href="${esc(profile.links.github)}" ${external}>More on GitHub ${outward}</a>`;
}

export function renderContent(kind) {
  switch (kind) {
    case 'studies': return studies();
    case 'experience': return experience();
    case 'projects': return projectPage();
    default: return '';
  }
}
