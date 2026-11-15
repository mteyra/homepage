import { profile, coursework, credentials, experiences, projects } from '../puzzle/content.js';
import { createSculpture } from './world.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const outward = '<span aria-hidden="true">↗</span>';
const external = 'target="_blank" rel="noopener"';
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'Marc Teyra', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const media = matchMedia('(prefers-reduced-motion: reduce)');
let page = 'about', sculpture, puzzleState, menuOpen = false, paused = media.matches, manualPause = null;
let ready = false, renderer = 'loading', transition = null, menuTransition = null;
try { manualPause = localStorage.getItem('marc-island-motion'); if (manualPause !== null) paused = manualPause === 'paused'; } catch { /* Storage is optional. */ }

const universityCourses = group => group.items.map(item => `<li><span class="course-title">${esc(item.title)}</span>${item.code ? `<span class="course-meta">${esc(item.code)}</span>` : ''}</li>`).join('');
const section = (title, meta, body, className = '') => `<section class="document-section ${className}"><div class="section-label"><h2>${title}</h2>${meta ? `<p>${meta}</p>` : ''}</div><div class="section-body">${body}</div></section>`;
const header = (eyebrow, title, intro, meta = '') => `<header class="chapter-header"><span class="eyebrow">${eyebrow}</span><h1 id="reading-title" tabindex="-1">${title}</h1><p class="chapter-intro">${intro}</p>${meta ? `<p class="chapter-meta">${meta}</p>` : ''}</header>`;

function studies() {
  const independent = coursework[2].items.map(item => {
    const credential = credentials.find(entry => entry.id === item.credentialId);
    const text = `<span><span class="course-title">${esc(item.title)}</span><span class="course-meta">${esc(item.institution)} · ${esc(item.status)}${item.date ? ` ${esc(item.date)}` : ''}</span></span>`;
    return `<li>${credential ? `<a href="${esc(credential.url)}" ${external} aria-label="${esc(item.title)}, ${esc(item.status)}, view certificate">${text}<span class="external-arrow" aria-hidden="true">↗</span></a>` : text}</li>`;
  }).join('');
  const tum = credentials.find(item => item.id === 'digitalisation-space');
  const bundle = credentials.find(item => item.id === 'computer-science-python');
  return header('Studies', 'Curiosity, with direction.', `<strong>${esc(profile.degree.title)}</strong><br>${esc(profile.degree.institution)}. My coursework connects computation with biology and medicine.`, `Since ${esc(profile.degree.since)}`) +
    section('Computation', 'University coursework', `<ul class="course-list">${universityCourses(coursework[0])}</ul>`) +
    section('Biology & medicine', 'University coursework', `<ul class="course-list">${universityCourses(coursework[1])}</ul>`) +
    section('Independent study', 'Online courses', `<ul class="course-list">${independent}<li><a href="${esc(tum.url)}" ${external}><span><span class="course-title">${esc(tum.title)}</span><span class="course-meta">${esc(tum.institution)} · Verified certificate, ${esc(tum.date)}</span></span><span class="external-arrow" aria-hidden="true">↗</span></a></li></ul><p class="certificate-note">CS50x and CS50P also form the <a href="${esc(bundle.url)}" ${external}>Computer Science for Python Programming professional certificate ${outward}</a>.</p>`);
}

function experienceRow(id) {
  const entry = experiences.find(item => item.id === id);
  return `<details class="experience" name="experiences" id="${esc(entry.id)}"><summary><span><strong class="entry-title">${esc(entry.title)}</strong><span class="entry-meta">${esc(entry.organisation)}${entry.date ? ` · ${esc(entry.date)}` : ''}</span><span class="entry-contribution">${esc(entry.contribution)}</span></span><span class="disclosure-icon" aria-hidden="true"></span></summary><div class="experience-body"><p>${esc(entry.text)}</p><p class="outcome">${esc(entry.outcome)}</p></div></details>`;
}

function experience() {
  return header('Experience', 'Learning by doing.', 'In labs, in code, and alongside a team.<br>A few of the experiences that have shaped how I work.') +
    section('Currently', 'Since April 2026', `<div class="current-job"><h3>${esc(profile.currentRole.organisation)}</h3><p>${esc(profile.currentRole.text)}</p></div>`) +
    section('Teams & prototypes', 'Hackathons and programmes', `<div class="experience-list">${['hack-a-bot','zhaw-smart-systems','eelisa-entrepreneurship','healthcare-hackathon-2025'].map(experienceRow).join('')}</div>`) +
    section('Science & care', 'Labwork, shadowing and programming', `<div class="experience-list">${['icosagen-shadowing','veterinary-shadowing','pharmaceutical-scraper','biological-data'].map(experienceRow).join('')}</div>`) +
    section('Robotics & games', 'Where building started', `<div class="experience-list">${['junior-game-jam','first-lego-league'].map(experienceRow).join('')}</div>`);
}

function projectPage() {
  return header('Projects', 'Things I’ve made.', 'A small selection of public work and completed projects. More lives on GitHub.') +
    projects.map(project => section(esc(project.type), '', `<div class="project-heading"><a href="${esc(project.sourceUrl || project.url)}" ${external}><h2>${esc(project.title)}</h2></a></div><p class="project-copy">${esc(project.text)}</p><p class="project-role">${esc(project.contribution)}</p><div class="project-links">${project.sourceUrl ? `<a href="${esc(project.sourceUrl)}" ${external}>Source ${outward}</a>` : `<a href="${esc(project.url)}" ${external}>In my CV ${outward}</a>`}${project.sourceUrl && project.url !== project.sourceUrl ? `<a href="${esc(project.url)}" ${external}>${project.id === 'aloha' ? 'Presentation' : 'Website'} ${outward}</a>` : ''}</div>`, 'project-section')).join('') +
    `<a class="github-link" href="${esc(profile.links.github)}" ${external}>More on GitHub ${outward}</a>`;
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
  const raw = location.hash.slice(1).split('/')[0];
  const next = pages.includes(raw) ? raw : 'about';
  if (ready && page === next && !initial) { closeMenu(); return; }
  page = next;
  closeMenu();
  document.body.dataset.page = page;
  document.title = page === 'about' ? 'Marc Teyra · A few things about me' : `${titles[page]} · Marc Teyra`;
  $$('.dock-rail a').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  syncIndicator();
  const isHome = page === 'about';
  $('#home').hidden = !isHome;
  $('#reading').hidden = isHome;
  if (!isHome) {
    $('#reading').innerHTML = ({ studies, experience, projects: projectPage })[page]();
    $('#reading').setAttribute('aria-labelledby', 'reading-title');
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
  if (paused) {
    transition?.cancel();
    document.getAnimations().forEach(animation => animation.finish());
  }
  if (persist) {
    manualPause = paused ? 'paused' : 'on';
    try { localStorage.setItem('marc-island-motion', manualPause); } catch { /* Optional. */ }
  }
}

function updatePuzzle(state) {
  puzzleState = state;
  const count = state.solved.filter(Boolean).length;
  const align = $('#align');
  const busy = ['aligning', 'settling', 'resetting'].includes(state.phase);
  align.innerHTML = state.complete ? 'Everything fits.' : count ? 'Fit the next piece <span aria-hidden="true">↗</span>' : 'Fit the pieces <span aria-hidden="true">↗</span>';
  // Keep keyboard focus through an alignment instead of disabling its button.
  align.setAttribute('aria-disabled', String(busy || state.complete));
  align.setAttribute('aria-label', state.complete ? 'Sculpture complete. All three pieces aligned.' : `Align piece ${state.selected + 1}. ${count} of 3 pieces aligned.`);
  $('#reset').hidden = count === 0 && state.phase !== 'aligning';
  $$('.puzzle-dots i').forEach((dot, index) => dot.dataset.solved = state.solved[index]);
  $$('.fallback-piece').forEach((part, index) => part.dataset.solved = state.solved[index]);
  if (count) $('#announcement').textContent = state.complete ? 'All three pieces fit. Sculpture complete.' : `${count} of 3 pieces fit.`;
}

$('#align').addEventListener('click', () => {
  if ($('#align').getAttribute('aria-disabled') !== 'true') sculpture?.align();
});
$('#reset').addEventListener('click', () => {
  $('#align').focus({ preventScroll: true });
  sculpture?.reset();
});
$('#more').addEventListener('click', event => setMenu(!menuOpen, event.detail === 0));
$('#motion').addEventListener('click', () => setPaused(!paused, true));
$('.dock-rail').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  if (link.dataset.page === page) window.scrollTo({ top: 0, behavior: paused || media.matches ? 'instant' : 'smooth' });
});
$('.dock-rail').addEventListener('keydown', event => {
  const links = $$('.dock-rail a'), current = links.indexOf(document.activeElement);
  if (current < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
  links[index].focus();
});
$('.skip').addEventListener('click', event => {
  event.preventDefault();
  const heading = page === 'about' ? $('#page-title') : $('#reading-title');
  heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'center', behavior: 'instant' });
});
document.addEventListener('click', event => { if (menuOpen && !$('#island').contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => {
  if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) document.body.classList.add('keyboard-input');
  if (event.key === 'Escape' && menuOpen) { closeMenu(); $('#more').focus(); }
});
document.addEventListener('pointerdown', () => document.body.classList.remove('keyboard-input'), true);
document.addEventListener('focusin', event => {
  if (menuOpen && !$('#island').contains(event.target)) closeMenu();
});
addEventListener('hashchange', () => route());
addEventListener('resize', syncIndicator, { passive: true });
media.addEventListener('change', () => { if (manualPause === null) setPaused(media.matches); });
document.fonts.ready.then(syncIndicator);

setPaused(paused);
route({ initial: true });
sculpture = createSculpture($('#sculpture'), {
  onReady: () => { renderer = 'webgl'; document.body.classList.add('world-ready'); },
  onUnavailable: () => {
    renderer = 'fallback';
    document.body.classList.remove('world-ready');
    $('#sculpture').hidden = true;
    $('#sculpture').tabIndex = -1;
  },
  onProgress: updatePuzzle,
});
sculpture.setPaused(paused);
sculpture.setActive(page === 'about');

// Small, read-only view for local interaction QA.
window.islandState = () => ({ page, menuOpen, paused, renderer, puzzle: sculpture.getState() });
