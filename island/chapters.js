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

function masthead(kind, number, deck) {
  return `<header class="chapter-masthead">
    <div class="chapter-heading">
      <p class="chapter-number" aria-hidden="true">${esc(number)}</p>
      <h1 id="reading-title" tabindex="-1">${esc(titles[kind])}</h1>
      <p class="chapter-deck">${esc(deck)}</p>
    </div>
    <div class="chapter-art" id="chapter-art"></div>
  </header>`;
}

function footer(next) {
  const title = next === 'about' ? profile.name : titles[next];
  return `<footer class="chapter-footer" data-reveal>
    <a class="chapter-next" href="#${esc(next)}"><span>${next === 'about' ? 'Back to' : 'Next'}</span><strong>${esc(title)}</strong><span aria-hidden="true">→</span></a>
    <a class="chapter-cv" href="${esc(profile.cv.url)}" ${external}><span>${esc(profile.cv.label)}</span><small>${esc(profile.cv.date)}</small>${outward}</a>
  </footer>`;
}

function universityArea(group) {
  return `<section class="course-area" id="study-${esc(group.id)}" aria-labelledby="study-${esc(group.id)}-title" data-reveal>
    <h2 id="study-${esc(group.id)}-title">${esc(group.title)}</h2>
    <p class="course-area-meta">${esc(group.kind)}</p>
    <ul class="course-list">${group.items.map(item => `<li><span class="course-title">${esc(item.title)}</span>${item.code ? `<span class="course-meta">${esc(item.code)}</span>` : ''}</li>`).join('')}</ul>
    ${group.id === 'biology-medicine' ? '<a class="related-link" href="#experience/science-care"><span>Related experience</span><strong>Science &amp; care</strong><span aria-hidden="true">→</span></a>' : ''}
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
  return `${masthead('studies', '01', 'Computation, biology and medicine.')}
    <div class="degree-line" data-reveal>
      <strong>${esc(profile.degree.title)}</strong>
      <span>${esc(profile.degree.institution)}</span>
      <span>Since ${esc(profile.degree.since)}</span>
    </div>
    <div class="academic-grid">${coursework.filter(group => group.id !== 'independent-study').map(universityArea).join('')}</div>
    <section class="document-section" id="study-independent-study" aria-labelledby="independent-study-title" data-reveal>
      <div class="section-label"><h2 id="independent-study-title">${esc(independent.title)}</h2><p>Courses &amp; certificates</p></div>
      <div class="section-content">
        <ul class="course-list">
          ${independent.items.map(independentCourse).join('')}
          <li><a href="${esc(tum.url)}" ${external} aria-label="${esc(`${tum.title}, view certificate`)}"><span><span class="course-title">${esc(tum.title)}</span><span class="course-meta">${esc(`${tum.institution} · Verified certificate · ${tum.date}`)}</span></span><span class="external-arrow" aria-hidden="true">↗</span></a></li>
        </ul>
        <p class="certificate-note">CS50x and CS50P also form the <a href="${esc(bundle.url)}" ${external}>${esc(bundle.title)} professional certificate ${outward}</a>.</p>
      </div>
    </section>
    ${footer('experience')}`;
}

function experienceRow(id) {
  const entry = experienceById.get(id);
  const date = dates[entry.date] ?? entry.date;
  const visibleAward = id === 'hack-a-bot' || id === 'eelisa-entrepreneurship';
  return `<details class="experience" id="${esc(entry.id)}">
    <summary>
      <span class="entry-date">${esc(date)}</span>
      <span class="entry-overview">
        <strong class="entry-title">${esc(entry.title)}</strong>
        <span class="entry-meta">${esc(`${entry.organisation} · ${entry.type}`)}</span>
        <span class="entry-contribution">${esc(entry.contribution)}</span>
        ${visibleAward ? `<span class="entry-award">${esc(entry.outcome)}</span>` : ''}
      </span>
      <span class="disclosure-icon" aria-hidden="true"></span>
    </summary>
    <div class="experience-body"><p>${esc(entry.text)}</p>${visibleAward ? '' : `<p class="outcome">${esc(entry.outcome)}</p>`}</div>
  </details>`;
}

function experience() {
  const groups = [
    {
      id: 'teams-prototypes',
      title: 'Teams & prototypes',
      category: 'Hackathons & programmes',
      items: ['hack-a-bot', 'zhaw-smart-systems', 'eelisa-entrepreneurship', 'healthcare-hackathon-2025'],
    },
    {
      id: 'science-care',
      title: 'Science & care',
      category: 'Labwork, shadowing & programming',
      items: ['icosagen-shadowing', 'pharmaceutical-scraper', 'veterinary-shadowing', 'biological-data'],
    },
    {
      id: 'robotics-games',
      title: 'Robotics & games',
      category: 'Early explorations',
      items: ['junior-game-jam', 'first-lego-league'],
    },
  ];
  return `${masthead('experience', '02', 'Work, collaboration and practical experience.')}
    <section class="current-role" aria-labelledby="current-role-title" data-reveal>
      <span class="role-date">Since ${esc(profile.currentRole.since)}</span>
      <div><h2 id="current-role-title">${esc(profile.currentRole.organisation)}</h2><p>Alongside my degree.</p></div>
    </section>
    ${groups.map(group => `<section class="document-section" id="experience-${esc(group.id)}" aria-labelledby="experience-${esc(group.id)}-title" data-reveal>
      <div class="section-label"><h2 id="experience-${esc(group.id)}-title">${esc(group.title)}</h2><p>${esc(group.category)}</p></div>
      <div class="section-content"><div class="experience-list">${group.items.map(experienceRow).join('')}</div></div>
    </section>`).join('')}
    ${footer('projects')}`;
}

function projectPage() {
  const summaries = {
    nixcare: 'I build tools that check, maintain and safely update a NixOS Linux system.',
    aloha: 'I built interactive web experiences and presentations for our team’s medical-device hackathon prototype.',
    'nixos-config': 'My declarative NixOS setup, including tablet-mode input and touchscreen recovery.',
    'cube-solver': 'A LEGO Mindstorms robot that solves a 3×3 cube. Mechanical design, sensors and EV3 programming.',
  };
  return `${masthead('projects', '03', 'Public work and completed projects.')}
    <div class="project-index">${projects.map(project => `<section class="project-entry" id="project-${esc(project.id)}" aria-labelledby="project-${esc(project.id)}-title" data-reveal>
      <div class="project-heading"><p class="project-type">${esc(project.type)}</p><h2 id="project-${esc(project.id)}-title">${esc(project.title)}</h2></div>
      <div class="project-description"><p>${esc(summaries[project.id] ?? project.text)}</p></div>
      <div class="project-links">
        ${project.sourceUrl && project.url !== project.sourceUrl ? `<a href="${esc(project.url)}" ${external}>${project.id === 'aloha' ? 'View presentation' : 'View project'} ${outward}</a>` : ''}
        ${project.sourceUrl ? `<a href="${esc(project.sourceUrl)}" ${external}>GitHub ${outward}</a>` : `<a href="${esc(project.url)}" ${external}>In my CV ${outward}</a>`}
      </div>
    </section>`).join('')}</div>
    <a class="github-link" href="${esc(profile.links.github)}" ${external}>More on GitHub ${outward}</a>
    ${footer('about')}`;
}

export function renderChapter(kind) {
  const render = { studies, experience, projects: projectPage }[kind];
  return render ? render() : '';
}
