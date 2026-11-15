import { profile, coursework, credentials, experiences, projects } from '../puzzle/content.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const external = 'target="_blank" rel="noopener"';
const outward = '<span aria-hidden="true">↗</span>';
const titles = { studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const dates = { '2024–25': '2024–2025', '2017–18': '2017–2018' };
const credentialById = new Map(credentials.map(credential => [credential.id, credential]));
const experienceById = new Map(experiences.map(experience => [experience.id, experience]));

function masthead(kind, deck, meta = '') {
  return `<header class="chapter-masthead">
    <div class="chapter-heading">
      <h1 id="reading-title" tabindex="-1">${esc(titles[kind])}</h1>
      <p class="chapter-deck">${esc(deck)}</p>
      ${meta ? `<p class="chapter-meta">${esc(meta)}</p>` : ''}
    </div>
    <div class="chapter-art" id="chapter-art"></div>
  </header>`;
}

function sectionNav(kind, groups) {
  return `<nav class="section-nav" aria-label="${kind === 'studies' ? 'Areas of study' : 'Areas of experience'}">${groups.map((group, index) =>
    `<a id="${esc(kind)}-group-${esc(group.id)}" href="#${esc(kind)}/${esc(group.id)}" data-group="${esc(group.id)}"${index === 0 ? ' aria-current="location"' : ''}>${esc(group.title)}</a>`
  ).join('')}</nav>`;
}

function universityArea(group, index) {
  return `<section class="chapter-panel course-area" id="study-${esc(group.id)}" data-group-panel="${esc(group.id)}" aria-labelledby="studies-group-${esc(group.id)}"${index === 0 ? '' : ' hidden'}>
    <ul class="course-list">${group.items.map(item => `<li><span class="course-title">${esc(item.title)}</span>${item.code ? `<span class="course-meta">${esc(item.code)}</span>` : ''}</li>`).join('')}</ul>
  </section>`;
}

function independentCourse(item) {
  const credential = credentialById.get(item.credentialId);
  const meta = `${item.institution} · ${item.status}${item.date ? ` · ${item.date}` : ''}`;
  const text = `<span><span class="course-title">${esc(item.title)}</span><span class="course-meta">${esc(meta)}</span></span>`;
  return `<li>${credential
    ? `<a href="${esc(credential.url)}" ${external} aria-label="${esc(`${item.title}, ${item.status}, view certificate`)}">${text}<span class="external-arrow" aria-hidden="true">↗</span></a>`
    : text}</li>`;
}

function studies() {
  const independent = coursework.find(group => group.id === 'independent-study');
  const tum = credentialById.get('digitalisation-space');
  const bundle = credentialById.get('computer-science-python');
  return `${masthead('studies', `${profile.degree.title} at ${profile.degree.institution}.`, `Since ${profile.degree.since}`)}
    ${sectionNav('studies', coursework)}
    <div class="chapter-panels">
      ${coursework.filter(group => group.id !== 'independent-study').map(universityArea).join('')}
      <section class="chapter-panel course-area" id="study-independent-study" data-group-panel="independent-study" aria-labelledby="studies-group-independent-study" hidden>
        <ul class="course-list">
          ${independent.items.map(independentCourse).join('')}
          <li><a href="${esc(tum.url)}" ${external} aria-label="${esc(`${tum.title}, view certificate`)}"><span><span class="course-title">${esc(tum.title)}</span><span class="course-meta">${esc(`${tum.institution} · Verified certificate · ${tum.date}`)}</span></span><span class="external-arrow" aria-hidden="true">↗</span></a></li>
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
        <small class="entry-meta">${esc(`${entry.organisation}${date ? ` · ${date}` : ''}`)}</small>
      </span>
      <span class="entry-contribution">${esc(entry.contribution)}</span>
      <span class="disclosure-icon" aria-hidden="true"></span>
    </summary>
    <div class="experience-body"><p>${esc(entry.text)}</p><p class="outcome">${esc(entry.outcome)}</p></div>
  </details>`;
}

function experience() {
  const groups = [
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
  return `${masthead('experience', `At ${profile.currentRole.organisation}, alongside my degree.`, `Since ${profile.currentRole.since}`)}
    ${sectionNav('experience', groups)}
    <div class="chapter-panels">${groups.map((group, index) => `<section class="chapter-panel experience-group" id="experience-${esc(group.id)}" data-group-panel="${esc(group.id)}" aria-labelledby="experience-group-${esc(group.id)}"${index === 0 ? '' : ' hidden'}>
      <div class="experience-list">${group.items.map(experienceRow).join('')}</div>
    </section>`).join('')}</div>`;
}

function projectPage() {
  const summaries = {
    nixcare: 'I build tools that check, maintain and safely update a NixOS Linux system.',
    aloha: 'I built interactive web experiences and presentations for our team’s medical-device hackathon prototype.',
    'nixos-config': 'My declarative NixOS setup, including tablet-mode input and touchscreen recovery.',
    'cube-solver': 'A LEGO Mindstorms robot that solves a 3×3 cube. Mechanical design, sensors and EV3 programming.',
  };
  return `${masthead('projects', 'Public work and completed projects.')}
    <div class="project-index">${projects.map(project => `<section class="project-entry" id="project-${esc(project.id)}" aria-labelledby="project-${esc(project.id)}-title" data-reveal>
      <div class="project-heading"><h2 id="project-${esc(project.id)}-title">${esc(project.title)}</h2></div>
      <div class="project-description"><p>${esc(summaries[project.id] ?? project.text)}</p></div>
      <div class="project-links">
        ${project.sourceUrl && project.url !== project.sourceUrl ? `<a href="${esc(project.url)}" ${external}>${project.id === 'aloha' ? 'View presentation' : 'View project'} ${outward}</a>` : ''}
        ${project.sourceUrl ? `<a href="${esc(project.sourceUrl)}" ${external}>GitHub ${outward}</a>` : `<a href="${esc(project.url)}" ${external}>In my CV ${outward}</a>`}
      </div>
    </section>`).join('')}</div>
    <a class="github-link" href="${esc(profile.links.github)}" ${external}>More on GitHub ${outward}</a>`;
}

export function renderChapter(kind) {
  const render = { studies, experience, projects: projectPage }[kind];
  return render ? render() : '';
}
