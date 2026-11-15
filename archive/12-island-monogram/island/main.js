import { profile, coursework, credentials, experiences, projects } from '../puzzle/content.js';
import { createChapterWorld } from './chapter-world.js?v=monogram';
import { createMonogram } from './monogram.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const outward = '<span aria-hidden="true">↗</span>';
const external = 'target="_blank" rel="noopener"';
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'Marc Teyra', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const monogramPages = ['studies', 'experience', 'projects'];
const media = matchMedia('(prefers-reduced-motion: reduce)');
let page = 'about', sculpture, menuOpen = false, paused = media.matches, manualPause = null;
let ready = false, renderer = 'loading', transition = null, menuTransition = null;
let chapterWorld = null, panelTransition = null;
let objectPreview = null, linkPreview = null, focusPreview = null, preview = null;
const selections = { studies: 0, experience: 0, projects: 0 };
const chapterKeys = {
  studies: coursework.map(group => group.id),
  experience: ['teams-prototypes', 'science-care', 'robotics-games'],
  projects: projects.map(project => project.id),
};
try { manualPause = localStorage.getItem('marc-island-motion'); if (manualPause !== null) paused = manualPause === 'paused'; } catch { /* Storage is optional. */ }

const universityCourses = group => group.items.map(item => `<li><span class="course-title">${esc(item.title)}</span>${item.code ? `<span class="course-meta">${esc(item.code)}</span>` : ''}</li>`).join('');
const chapterFallback = kind => `<svg class="chapter-fallback" viewBox="0 0 500 360" aria-hidden="true"><defs><linearGradient id="chapter-metal" x2="1" y2="1"><stop stop-color="#a3a7a2"/><stop offset=".48" stop-color="#ebeeea"/><stop offset="1" stop-color="#656a65"/></linearGradient><filter id="chapter-shadow"><feGaussianBlur stdDeviation="10"/></filter></defs><ellipse cx="250" cy="290" rx="110" ry="12" fill="#30362d" opacity=".1" filter="url(#chapter-shadow)"/>${kind === 'studies' ? '<g fill="none" stroke="url(#chapter-metal)" stroke-width="9"><ellipse cx="250" cy="160" rx="112" ry="54" transform="rotate(-32 250 160)"/><ellipse cx="250" cy="160" rx="112" ry="54" transform="rotate(32 250 160)"/><ellipse cx="250" cy="160" rx="112" ry="54" transform="rotate(90 250 160)"/></g>' : kind === 'experience' ? '<g fill="url(#chapter-metal)" stroke="#fafbf9" stroke-width="1"><path d="m137 205 140-63 100 50-140 65z"/><path d="m120 155 140-63 100 50-140 65z"/><path d="m147 105 140-63 100 50-140 65z"/></g>' : '<g fill="none" stroke="url(#chapter-metal)" stroke-width="10" transform="translate(250 150) rotate(-18) skewY(14)"><rect x="-105" y="-62" width="120" height="120" rx="6"/><rect x="-65" y="-82" width="120" height="120" rx="6"/><rect x="-25" y="-102" width="120" height="120" rx="6"/><rect x="15" y="-122" width="120" height="120" rx="6"/></g>'}</svg>`;
const selectors = (kind, groups) => `<div class="chapter-selectors" role="tablist" aria-orientation="vertical" aria-label="${kind === 'studies' ? 'Areas of study' : 'Areas of experience'}">${groups.map((group, index) => `<button class="chapter-choice" type="button" role="tab" id="${kind}-choice-${index}" aria-controls="${kind}-panel-${index}" aria-selected="${index === selections[kind]}" tabindex="${index === selections[kind] ? 0 : -1}" data-choice="${index}"><span class="choice-mark" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${group.title}</span></button>`).join('')}</div>`;
const panel = (kind, index, title, meta, body) => `<section class="chapter-panel" id="${kind}-panel-${index}" role="tabpanel" aria-labelledby="${kind}-choice-${index}" tabindex="0" ${index !== selections[kind] ? 'hidden' : ''}><header class="panel-heading"><span class="panel-kicker">${meta}</span><h2>${title}</h2></header>${body}</section>`;
function chapter(kind, intro, meta, body, groups = []) {
  return `<div class="chapter-composition"><div class="chapter-aside"><header class="chapter-header"><h1 id="reading-title" tabindex="-1">${titles[kind]}<span class="title-period">.</span></h1><p class="chapter-intro">${intro}</p>${meta ? `<p class="chapter-meta">${meta}</p>` : ''}</header><div class="chapter-visual">${chapterFallback(kind)}<canvas id="chapter-canvas" aria-hidden="true" tabindex="-1"></canvas></div>${groups.length ? selectors(kind, groups) : `<a class="github-link" href="${esc(profile.links.github)}" ${external}>More on GitHub ${outward}</a>`}</div><div class="chapter-content">${body}</div></div>`;
}

function studies() {
  const independent = coursework[2].items.map(item => {
    const credential = credentials.find(entry => entry.id === item.credentialId);
    const text = `<span><span class="course-title">${esc(item.title)}</span><span class="course-meta">${esc(item.institution)} · ${esc(item.status)}${item.date ? ` ${esc(item.date)}` : ''}</span></span>`;
    return `<li>${credential ? `<a href="${esc(credential.url)}" ${external} aria-label="${esc(item.title)}, ${esc(item.status)}, view certificate">${text}<span class="external-arrow" aria-hidden="true">↗</span></a>` : text}</li>`;
  }).join('');
  const tum = credentials.find(item => item.id === 'digitalisation-space');
  const bundle = credentials.find(item => item.id === 'computer-science-python');
  return chapter('studies', `<strong>${esc(profile.degree.title)}</strong><br>${esc(profile.degree.institution)}`, `Since ${esc(profile.degree.since)} · A biomedical direction`,
    panel('studies', 0, 'Computation', 'University coursework', `<ul class="course-list">${universityCourses(coursework[0])}</ul>`) +
    panel('studies', 1, 'Biology & medicine', 'University coursework', `<ul class="course-list">${universityCourses(coursework[1])}</ul><a class="related-link" href="#experience/science-care"><span>Related experience</span>Science & care <span aria-hidden="true">→</span></a>`) +
    panel('studies', 2, 'Independent study', 'Courses & certificates', `<ul class="course-list">${independent}<li><a href="${esc(tum.url)}" ${external}><span><span class="course-title">${esc(tum.title)}</span><span class="course-meta">${esc(tum.institution)} · Verified certificate, ${esc(tum.date)}</span></span><span class="external-arrow" aria-hidden="true">↗</span></a></li></ul><p class="certificate-note">CS50x and CS50P also form the <a href="${esc(bundle.url)}" ${external}>Computer Science for Python Programming professional certificate ${outward}</a>.</p>`),
    coursework);
}

function experienceRow(id) {
  const entry = experiences.find(item => item.id === id);
  return `<details class="experience" name="experiences" id="${esc(entry.id)}"><summary><span><strong class="entry-title">${esc(entry.title)}</strong><span class="entry-meta">${esc(entry.organisation)}${entry.date ? ` · ${esc(entry.date)}` : ''}</span><span class="entry-contribution">${esc(entry.contribution)}</span></span><span class="disclosure-icon" aria-hidden="true"></span></summary><div class="experience-body"><p>${esc(entry.text)}</p><p class="outcome">${esc(entry.outcome)}</p></div></details>`;
}

function experience() {
  const groups = [{ title: 'Teams & prototypes' }, { title: 'Science & care' }, { title: 'Robotics & games' }];
  return chapter('experience', `Currently at <strong>${esc(profile.currentRole.organisation)}</strong><br>alongside my degree.`, `Since ${esc(profile.currentRole.since)}`,
    panel('experience', 0, groups[0].title, 'Hackathons & programmes', `<div class="experience-list">${['hack-a-bot','zhaw-smart-systems','eelisa-entrepreneurship','healthcare-hackathon-2025'].map(experienceRow).join('')}</div>`) +
    panel('experience', 1, groups[1].title, 'Labwork, shadowing & programming', `<div class="experience-list">${['icosagen-shadowing','veterinary-shadowing','pharmaceutical-scraper','biological-data'].map(experienceRow).join('')}</div>`) +
    panel('experience', 2, groups[2].title, 'Early explorations', `<div class="experience-list">${['junior-game-jam','first-lego-league'].map(experienceRow).join('')}</div>`), groups);
}

function projectPage() {
  const summaries = {
    nixcare: 'I build tools that check, maintain and safely update a NixOS Linux system.',
    aloha: 'I built the interactive web experiences and presentations for our team’s medical-device hackathon prototype.',
    'nixos-config': 'My declarative NixOS setup, including tablet-mode input and touchscreen recovery.',
    'cube-solver': 'A LEGO Mindstorms robot that solves a 3×3 cube. Mechanical design, sensors and EV3 programming.',
  };
  return chapter('projects', 'A few things I’ve made.<br>Public work and completed projects.', '', `<div class="project-index">${projects.map((project, index) => `<section class="project-entry" data-project="${index}" data-current="${index === selections.projects}" id="project-${project.id}"><span class="project-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="project-info"><p class="project-type">${esc(project.type)}</p><h2>${project.sourceUrl ? `<a href="${esc(project.url)}" ${external}>${esc(project.title)}</a>` : esc(project.title)}</h2><p class="project-copy">${esc(summaries[project.id])}</p><div class="project-links">${project.sourceUrl && project.url !== project.sourceUrl ? `<a href="${esc(project.url)}" ${external}>${project.id === 'aloha' ? 'View presentation' : 'View project'} ${outward}</a>` : ''}${project.sourceUrl ? `<a href="${esc(project.sourceUrl)}" ${external}>GitHub ${outward}</a>` : `<a href="${esc(project.url)}" ${external}>In my CV ${outward}</a>`}</div></div></section>`).join('')}</div>`);
}

function selectChapter(index, { focus = false, fromObject = false, updateUrl = true } = {}) {
  const count = page === 'projects' ? projects.length : 3;
  if (!Number.isInteger(index) || index < 0 || index >= count || page === 'about') return;
  const changed = selections[page] !== index;
  selections[page] = index;
  chapterWorld?.setSelection(index);
  if (page === 'projects') {
    $$('.project-entry').forEach((entry, item) => entry.dataset.current = String(index === item));
    if (fromObject) $(`.project-entry[data-project="${index}"]`)?.scrollIntoView({ block: 'center', behavior: paused ? 'instant' : 'smooth' });
    return;
  }
  if (updateUrl) history.replaceState(null, '', `#${page}/${chapterKeys[page][index]}`);
  $$('.chapter-choice').forEach((button, item) => {
    button.setAttribute('aria-selected', String(item === index));
    button.tabIndex = item === index ? 0 : -1;
    if (focus && item === index) button.focus({ preventScroll: true });
  });
  $$('.chapter-panel').forEach((entry, item) => entry.hidden = item !== index);
  panelTransition?.cancel();
  const current = $(`#${page}-panel-${index}`);
  if (changed && !paused && !media.matches && current.animate) {
    panelTransition = current.animate([{ opacity: .35, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}

function mountChapter() {
  const kind = page;
  chapterWorld = createChapterWorld($('#chapter-canvas'), {
    kind,
    onSelect: index => selectChapter(index, { fromObject: true }),
    onReady: () => $('.chapter-visual')?.classList.add('is-ready'),
    onUnavailable: () => $('.chapter-visual')?.classList.remove('is-ready'),
  });
  chapterWorld.setPaused(paused);
  chapterWorld.setSelection(selections[kind]);
}

function syncPreview() {
  const candidate = document.body.classList.contains('keyboard-input') ? focusPreview : objectPreview ?? linkPreview;
  preview = page === 'about' && !menuOpen ? candidate : null;
  sculpture?.setPreview(preview);
  const destination = monogramPages[preview];
  const caption = $('#sculpture-destination');
  caption.textContent = destination ? `${titles[destination]} →` : '';
  caption.dataset.visible = String(Boolean(destination) && renderer === 'webgl');
  $$('.dock-rail a').forEach(link => {
    link.classList.toggle('is-previewed', link.dataset.page === destination);
  });
}

function clearPreview() {
  objectPreview = linkPreview = focusPreview = null;
  syncPreview();
}

function linkedPiece(target) {
  const link = target?.closest?.('.dock-rail a, .introduction a');
  const destination = link?.getAttribute('href')?.slice(1).split('/')[0];
  const index = monogramPages.indexOf(destination);
  return index >= 0 ? index : null;
}

function animateIn(element, kind = 'reading') {
  transition?.cancel();
  if (paused || media.matches || !element.animate) return;
  // Never hide the readable baseline: interruption or background RAF suspension
  // must not leave the page transparent.
  transition = element.animate(
    kind === 'home'
      ? [{ transform: 'translateY(16px) scale(.985)' }, { transform: 'translateY(0) scale(1)' }]
      : [{ transform: 'translateY(26px)' }, { transform: 'translateY(0)' }],
    { duration: kind === 'home' ? 850 : 650, easing: 'cubic-bezier(.16,1,.3,1)' }
  );
}

function syncIndicator() {
  const active = $(`.dock-rail a[data-page="${page}"]`);
  if (!active) return;
  $('.dock-indicator').style.width = `${active.offsetWidth}px`;
  $('.dock-indicator').style.transform = `translateX(${active.offsetLeft}px)`;
}

function route({ initial = false } = {}) {
  const [raw, key] = location.hash.slice(1).split('/');
  const next = pages.includes(raw) ? raw : 'about';
  const requestedIndex = chapterKeys[next]?.indexOf(key) ?? -1;
  if (ready && page === next && !initial) {
    closeMenu();
    if (requestedIndex >= 0) selectChapter(requestedIndex, { updateUrl: false });
    return;
  }
  page = next;
  clearPreview();
  if (requestedIndex >= 0) selections[page] = requestedIndex;
  closeMenu();
  document.body.dataset.page = page;
  document.title = page === 'about' ? 'Marc Teyra · A few things about me' : `${titles[page]} · Marc Teyra`;
  $$('.dock-rail a').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  syncIndicator();
  const isHome = page === 'about';
  panelTransition?.cancel();
  chapterWorld?.destroy();
  chapterWorld = null;
  $('#home').hidden = !isHome;
  $('#reading').hidden = isHome;
  if (!isHome) {
    $('#reading').innerHTML = ({ studies, experience, projects: projectPage })[page]();
    $('#reading').setAttribute('aria-labelledby', 'reading-title');
    mountChapter();
  }
  $('.skip').href = isHome ? '#page-title' : '#reading-title';
  sculpture?.setActive(isHome);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (ready && !initial) {
    animateIn(isHome ? $('.introduction') : $('#reading'), isHome ? 'home' : 'reading');
    // Preserve pointer focus on the island; moving keyboard focus into the
    // chapter makes its heading and content immediately reachable.
    if (document.body.classList.contains('keyboard-input')) {
      (isHome ? $('#page-title') : $('#reading-title')).focus({ preventScroll: true });
    }
    $('#announcement').textContent = `${titles[page]}.`;
  }
  ready = true;
}

function setMenu(open, focus = false) {
  if (menuOpen === open) return;
  menuOpen = open;
  syncPreview();
  const panel = $('#island-menu'), island = $('#island');
  island.scrollTop = 0;
  const previousHeight = island.getBoundingClientRect().height;
  menuTransition?.cancel();
  panel.hidden = !open;
  island.classList.toggle('menu-open', open);
  $('#more').setAttribute('aria-expanded', String(open));
  $('#more').setAttribute('aria-label', open ? 'Close links and preferences' : 'Open links and preferences');
  if (!paused && !media.matches && island.animate) {
    // Grow the shell upwards with the navigation anchored to its bottom.
    const height = island.offsetHeight;
    menuTransition = island.animate([{ height: `${previousHeight}px` }, { height: `${height}px` }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
    if (open) panel.animate([{ transform: 'translateY(12px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  if (open && focus) panel.querySelector('a')?.focus({ preventScroll: true });
  island.scrollTop = 0;
}
function closeMenu() { setMenu(false); }

function setPaused(value, persist = false) {
  paused = Boolean(value);
  document.body.classList.toggle('motion-paused', paused);
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  $('#motion-label').textContent = paused ? 'Paused' : 'On';
  sculpture?.setPaused(paused);
  chapterWorld?.setPaused(paused);
  if (paused) {
    transition?.cancel();
    document.getAnimations().forEach(animation => animation.finish());
  }
  if (persist) {
    manualPause = paused ? 'paused' : 'on';
    try { localStorage.setItem('marc-island-motion', manualPause); } catch { /* Optional. */ }
  }
}

$('#more').addEventListener('click', event => setMenu(!menuOpen, event.detail === 0));
$('#motion').addEventListener('click', () => setPaused(!paused, true));
$('#reading').addEventListener('click', event => {
  const button = event.target.closest('[data-choice]');
  if (button) selectChapter(Number(button.dataset.choice));
});
$('#reading').addEventListener('keydown', event => {
  const button = event.target.closest('[data-choice]');
  if (!button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  if (event.repeat) return;
  const index = Number(button.dataset.choice);
  selectChapter(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowDown' ? 1 : 2)) % 3, { focus: true });
});
for (const type of ['pointerover', 'focusin']) {
  $('#reading').addEventListener(type, event => {
    const entry = event.target.closest('[data-project]');
    if (entry && page === 'projects') selectChapter(Number(entry.dataset.project));
  });
}
$('.dock-rail').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  if (link.dataset.page === page) window.scrollTo({ top: 0, behavior: paused || media.matches ? 'instant' : 'smooth' });
});
$('.dock-rail').addEventListener('keydown', event => {
  const links = $$('.dock-rail a'), current = links.indexOf(document.activeElement);
  if (current < 0 || menuOpen || window.getSelection()?.toString() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  if (event.repeat) return;
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
  links[index].focus();
  location.hash = links[index].getAttribute('href');
});
$('.skip').addEventListener('click', event => {
  event.preventDefault();
  const heading = page === 'about' ? $('#page-title') : $('#reading-title');
  heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'center', behavior: 'instant' });
});
document.addEventListener('click', event => { if (menuOpen && !$('#island').contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => {
  if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
    document.body.classList.add('keyboard-input');
    syncPreview();
  }
  if (event.key === 'Escape' && menuOpen) { closeMenu(); $('#more').focus(); }
  if (event.defaultPrevented || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="combobox"], [role="listbox"], [role="menu"], [role="tree"]')) return;
  if (window.getSelection()?.toString()) return;
  event.preventDefault();
  if (event.repeat) return;
  const index = (pages.indexOf(page) + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length;
  location.hash = pages[index];
});
document.addEventListener('pointerdown', () => {
  document.body.classList.remove('keyboard-input');
  syncPreview();
}, true);
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'touch' && document.body.classList.contains('keyboard-input')) {
    document.body.classList.remove('keyboard-input');
    syncPreview();
  }
}, { passive: true });
document.addEventListener('pointerover', event => {
  if (event.pointerType === 'touch' || page !== 'about') return;
  linkPreview = linkedPiece(event.target);
  syncPreview();
});
document.addEventListener('pointerout', event => {
  if (event.pointerType === 'touch' || page !== 'about') return;
  linkPreview = linkedPiece(event.relatedTarget);
  syncPreview();
});
document.addEventListener('focusin', event => {
  if (menuOpen && !$('#island').contains(event.target)) closeMenu();
  focusPreview = linkedPiece(event.target);
  syncPreview();
});
document.addEventListener('focusout', event => {
  focusPreview = linkedPiece(event.relatedTarget);
  syncPreview();
});
window.addEventListener('blur', clearPreview);
addEventListener('hashchange', () => route());
addEventListener('resize', syncIndicator, { passive: true });
media.addEventListener('change', () => { if (manualPause === null) setPaused(media.matches); });
document.fonts.ready.then(syncIndicator);

setPaused(paused);
route({ initial: true });
sculpture = createMonogram($('#sculpture'), {
  onPreview: index => { objectPreview = index; syncPreview(); },
  onNavigate: index => { location.hash = monogramPages[index]; },
  onReady: () => { renderer = 'webgl'; document.body.classList.add('world-ready'); },
  onUnavailable: () => {
    renderer = 'fallback';
    document.body.classList.remove('world-ready');
    $('#sculpture').hidden = true;
    $('#sculpture').tabIndex = -1;
    clearPreview();
  },
});
sculpture.setPaused(paused);
sculpture.setActive(page === 'about');

// Small, read-only view for interaction QA.
window.islandState = () => ({ page, menuOpen, paused, renderer, preview, identity: sculpture?.getState(), chapter: chapterWorld?.getState(), selections: { ...selections } });
