import { renderContent } from './content.js?v=study-3';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'Overview', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const captions = {
  studies: ['01 / LEARNING', 'Computation, biology and medicine. An open notebook for the things I’m learning.'],
  experience: ['02 / PRACTICE', 'From supervised lab experience to team prototypes. A closer look at my contributions.'],
  projects: ['03 / MAKING', ''],
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const rememberedGroups = new Map(), scrolls = new Map();
let page = 'about', menuOpen = false, scene, mesh = false, keyboard = false, closed = false, theme = 'night';
try { theme = localStorage.getItem('marc-study-theme') === 'day' ? 'day' : 'night'; } catch {}
for (const view of $$('[data-view]')) view.innerHTML = renderContent(view.dataset.view);
const projectEntries = $$('[data-project]');
const projectNames = new Map(projectEntries.map(entry => [entry.dataset.project, entry.querySelector('h2').textContent]));
const compact = matchMedia('(max-width: 900px)');
let activeProject = 'rommelweb', projectFrame = 0, projectTimer = 0, ignoreScrollUntil = 0, lastPointer = null;

function chooseProject(id, { instant = false } = {}) {
  if (!projectNames.has(id)) return;
  activeProject = id;
  for (const entry of projectEntries) {
    const selected = entry.dataset.project === id;
    entry.toggleAttribute('data-active', selected);
    entry.querySelector('[data-project-select]').setAttribute('aria-pressed', String(selected));
  }
  if (page === 'projects') {
    $('#object-kicker').textContent = `03 / MAKING · ${String(projectEntries.findIndex(entry => entry.dataset.project === id) + 1).padStart(2, '0')} OF ${String(projectEntries.length).padStart(2, '0')}`;
    $('#object-description').textContent = projectNames.get(id);
  }
  scene?.setProject(id, { instant });
}

function projectAtReadingPosition() {
  if (page !== 'projects' || performance.now() < ignoreScrollUntil) return;
  const reading = $('#reading-scroll').getBoundingClientRect();
  const top = compact.matches ? Math.max(0, $('#scene-shell').getBoundingClientRect().bottom) : reading.top;
  const bottom = compact.matches ? innerHeight : reading.bottom;
  if (bottom <= top) return;
  const scroller = $('#reading-scroll');
  const scrollRange = compact.matches
    ? document.documentElement.scrollHeight - innerHeight
    : scroller.scrollHeight - scroller.clientHeight;
  const scrollPosition = compact.matches ? scrollY : scroller.scrollTop;
  const atEnd = compact.matches
    ? scrollY + innerHeight >= document.documentElement.scrollHeight - 3
    : scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 3;
  const last = projectEntries.at(-1);
  if (atEnd && last.getBoundingClientRect().top < bottom) { chooseProject(last.dataset.project); return; }
  // Let the reading line travel down the viewport near the end, so every
  // exhibit can be reached even when several short entries fit on screen.
  const progress = Math.min(1, Math.max(0, scrollPosition / Math.max(scrollRange, 1)));
  const line = top + (bottom - top) * (.23 + progress * .54);
  // A small dead band keeps the plate steady while a row crosses the reading line.
  const current = projectEntries.find(entry => entry.dataset.project === activeProject)?.getBoundingClientRect();
  if (current && current.top - 18 <= line && current.bottom + 18 >= line) return;
  let nearest = null, distance = Infinity;
  for (const entry of projectEntries) {
    const rect = entry.getBoundingClientRect();
    if (rect.bottom < top || rect.top > bottom) continue;
    const nextDistance = Math.max(rect.top - line, line - rect.bottom, 0);
    if (nextDistance < distance) { nearest = entry.dataset.project; distance = nextDistance; }
  }
  if (nearest) chooseProject(nearest);
}
function projectScroll() {
  clearTimeout(projectTimer);
  if (page !== 'projects' || projectFrame || performance.now() < ignoreScrollUntil) return;
  projectFrame = requestAnimationFrame(() => { projectFrame = 0; projectAtReadingPosition(); });
}
function projectPointer(event) {
  if (page !== 'projects' || event.pointerType === 'touch') return;
  const moved = !lastPointer || Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) > 2;
  lastPointer = { x: event.clientX, y: event.clientY };
  // Scrolling can move a row under a stationary cursor; it should not take over.
  if (!moved) return;
  clearTimeout(projectTimer);
  const id = event.target.closest('[data-project]')?.dataset.project;
  if (id && id !== activeProject) projectTimer = setTimeout(() => chooseProject(id), 70);
}

function setMenu(open) {
  menuOpen = Boolean(open);
  $('#menu').hidden = !menuOpen;
  $('#menu-button').setAttribute('aria-expanded', String(menuOpen));
}
function closeMenu() {
  const refocus = $('#menu').contains(document.activeElement);
  setMenu(false);
  if (refocus) $('#menu-button').focus({ preventScroll: true });
}
function setTheme(value) {
  theme = value;
  document.body.dataset.theme = theme;
  $('#theme-button').setAttribute('aria-label', `Switch to ${theme === 'night' ? 'day' : 'night'} mode`);
  $('#theme-button').setAttribute('aria-pressed', String(theme === 'day'));
  document.querySelector('meta[name="theme-color"]').content = theme === 'day' ? '#e9e9e1' : '#151715';
  scene?.setTheme(theme);
  try { localStorage.setItem('marc-study-theme', theme); } catch {}
}
function route({ initial = false } = {}) {
  clearTimeout(projectTimer);
  ignoreScrollUntil = performance.now() + 180;
  const [requested, key] = location.hash.slice(1).split('/');
  const next = pages.includes(requested) ? requested : 'about', changed = next !== page;
  if (changed) scrolls.set(page, { panel: $('#reading-scroll').scrollTop, window: scrollY });
  const view = $(`[data-view="${next}"]`);
  const target = key && view ? [...view.querySelectorAll('[id]')].find(el => [key, `study-${key}`, `experience-${key}`, `project-${key}`].includes(el.id)) : null;
  const links = view ? [...view.querySelectorAll('[data-group]')] : [];
  if (links.length) {
    const group = target?.closest('[data-group-panel]')?.dataset.groupPanel || key || rememberedGroups.get(next);
    const selected = links.find(link => link.dataset.group === group) || links[0];
    rememberedGroups.set(next, selected.dataset.group);
    for (const link of links) link === selected ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current');
    for (const panel of view.querySelectorAll('[data-group-panel]')) {
      if (panel.dataset.groupPanel !== selected.dataset.group && panel.contains(document.activeElement)) selected.focus({ preventScroll: true });
      panel.hidden = panel.dataset.groupPanel !== selected.dataset.group;
    }
  }
  page = next;
  closeMenu();
  for (const section of $$('[data-view]')) section.hidden = section.dataset.view !== page;
  $('#introduction').hidden = page !== 'about';
  $('#reading-shell').hidden = page === 'about';
  $('#object-caption').hidden = page === 'about';
  document.body.dataset.page = page;
  $('#trail-section').textContent = titles[page].toUpperCase();
  $('#chapter-number').textContent = `0${pages.indexOf(page)} / 03`;
  for (const link of $$('#menu [data-page]')) link.dataset.page === page ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current');
  if (captions[page]) {
    $('#object-kicker').textContent = captions[page][0];
    $('#object-description').textContent = captions[page][1];
  }
  document.title = page === 'about' ? 'Marc Teyra Galiano' : `${titles[page]} · Marc Teyra Galiano`;
  $('.skip').href = `#${page}-title`;
  scene?.select(page, { instant: initial });
  scene?.setStudyChapter(rememberedGroups.get('studies') || 'computation', { instant: initial || page !== 'studies' });
  scene?.setExperienceCategory(rememberedGroups.get('experience') || 'teams-prototypes', { instant: initial || page !== 'experience' });
  // The overview always introduces the campus; the list remembers its last exhibit.
  if (page === 'projects') chooseProject(target?.dataset.project || activeProject, { instant: initial || changed });
  else scene?.setProject('rommelweb', { instant: true });
  if (changed || initial) {
    $('#reading-scroll').scrollTop = initial ? 0 : scrolls.get(page)?.panel || 0;
    window.scrollTo({ top: !initial && compact.matches ? scrolls.get(page)?.window || 0 : 0, behavior: 'instant' });
    if (!initial) {
      $('#announcement').textContent = titles[page];
      if (keyboard) $(`#${page}-title`).focus({ preventScroll: true });
    }
  }
  if (target && !target.matches('[data-group-panel]')) {
    if (target.matches('details')) target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  }
}
function navigate(destination) {
  const hash = `#${destination}`;
  if (location.hash !== hash) history.pushState(null, '', hash);
  route();
}
function unavailable() {
  $('#scene-shell').classList.remove('ready');
  $('#scene-shell').classList.add('unavailable');
  $('#gesture-note').textContent = 'Choose a section to explore';
  $('#mesh-button').disabled = $('#reset-button').disabled = true;
  for (const button of $$('[data-project-select]')) button.disabled = true;
}
setTheme(theme);
route({ initial: true });
$('#menu-button').addEventListener('click', () => setMenu(!menuOpen));
$('#theme-button').addEventListener('click', () => setTheme(theme === 'night' ? 'day' : 'night'));
$('#mesh-button').addEventListener('click', () => {
  mesh = !mesh;
  $('#mesh-button').setAttribute('aria-pressed', String(mesh));
  scene?.setMesh(mesh);
});
$('#reset-button').addEventListener('click', () => scene?.reset());
$('.project-index').addEventListener('pointermove', projectPointer);
$('.project-index').addEventListener('pointerleave', () => { clearTimeout(projectTimer); lastPointer = null; });
$('.project-index').addEventListener('focusin', event => {
  const id = event.target.closest('[data-project]')?.dataset.project;
  if (id) { clearTimeout(projectTimer); ignoreScrollUntil = performance.now() + 180; chooseProject(id); }
});
$('.project-index').addEventListener('click', event => {
  const id = event.target.closest('[data-project-select]')?.dataset.projectSelect;
  if (id) { clearTimeout(projectTimer); chooseProject(id); }
});
$('#reading-scroll').addEventListener('scroll', projectScroll, { passive: true });
window.addEventListener('scroll', projectScroll, { passive: true });
document.addEventListener('pointerdown', () => { keyboard = false; }, true);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && !link.classList.contains('skip')) {
    const destination = link.getAttribute('href').slice(1);
    if (pages.includes(destination.split('/')[0])) { event.preventDefault(); navigate(destination); }
  }
  if (menuOpen && !$('.menu-wrap').contains(event.target)) closeMenu();
});
$('.skip').addEventListener('click', event => { event.preventDefault(); $(`#${page}-title`).focus(); });
document.addEventListener('focusin', event => { if (menuOpen && !$('.menu-wrap').contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => {
  if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) keyboard = true;
  if (event.key === 'Escape') {
    if (menuOpen) { closeMenu(); $('#menu-button').focus(); }
    else if (scene?.getState().dragging) scene.cancel();
    else if (page !== 'about') navigate('about');
    return;
  }
  if (event.defaultPrevented || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.target.closest('input,textarea,select,[contenteditable],summary,[role="slider"]') || window.getSelection()?.toString()) return;
  event.preventDefault();
  navigate(pages[(pages.indexOf(page) + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length]);
});
window.addEventListener('popstate', () => route());
window.addEventListener('hashchange', () => route());
reduced.addEventListener('change', () => scene?.setReduced(reduced.matches));
window.addEventListener('pagehide', event => {
  clearTimeout(projectTimer); cancelAnimationFrame(projectFrame); projectFrame = 0;
  if (!event.persisted) { closed = true; scene?.destroy(); }
});
window.studyState = () => ({ page, theme, mesh, menuOpen, project: activeProject, groups: Object.fromEntries(rememberedGroups), scene: scene?.getState() || { ready: false } });
import('./scene.js?v=study-3').then(({ createStudy }) => {
  if (closed) return;
  scene = createStudy($('#world'), {
    onSelect: navigate,
    onReady: () => {
      $('#scene-shell').classList.remove('unavailable');
      $('#scene-shell').classList.add('ready');
      $('#gesture-note').textContent = 'Drag to orbit · scroll to inspect';
      $('#mesh-button').disabled = $('#reset-button').disabled = false;
      for (const button of $$('[data-project-select]')) button.disabled = false;
    },
    onUnavailable: unavailable,
    onLabels: positions => {
      for (const [id, pos] of Object.entries(positions)) {
        const label = $(`[data-model="${id}"]`);
        label.style.left = `${pos.x}px`; label.style.top = `${pos.y}px`;
      }
    },
    onHover: id => {
      for (const link of $$('[data-model]')) {
        if (link.dataset.model === id) link.dataset.hover = '';
        else delete link.dataset.hover;
      }
    },
  });
  scene.setReduced(reduced.matches);
  scene.setTheme(theme);
  scene.select(page, { instant: true });
  scene.setStudyChapter(rememberedGroups.get('studies') || 'computation', { instant: true });
  scene.setExperienceCategory(rememberedGroups.get('experience') || 'teams-prototypes', { instant: true });
  scene.setProject(page === 'projects' ? activeProject : 'rommelweb', { instant: true });
}).catch(unavailable);
