import { renderContent } from './content.js?v=study-1';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'Overview', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const captions = {
  studies: ['01 / LEARNING', 'Computation, biology and medicine. An open notebook for the things I’m learning.'],
  experience: ['02 / PRACTICE', 'From supervised lab experience to team prototypes. A closer look at my contributions.'],
  projects: ['03 / MAKING', 'The palm from Aloha’s website, brought into this study. Public software and completed projects.'],
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const rememberedGroups = new Map(), scrolls = new Map();
let page = 'about', menuOpen = false, scene, mesh = false, keyboard = false, closed = false, theme = 'night';
try { theme = localStorage.getItem('marc-study-theme') === 'day' ? 'day' : 'night'; } catch {}
for (const view of $$('[data-view]')) view.innerHTML = renderContent(view.dataset.view);

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
  const [requested, key] = location.hash.slice(1).split('/');
  const next = pages.includes(requested) ? requested : 'about', changed = next !== page;
  if (changed) scrolls.set(page, $('#reading-scroll').scrollTop);
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
  if (changed || initial) {
    $('#reading-scroll').scrollTop = initial ? 0 : scrolls.get(page) || 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
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
window.addEventListener('pagehide', event => { if (!event.persisted) { closed = true; scene?.destroy(); } });
window.studyState = () => ({ page, theme, mesh, menuOpen, groups: Object.fromEntries(rememberedGroups), scene: scene?.getState() || { ready: false } });
import('./scene.js?v=study-1').then(({ createStudy }) => {
  if (closed) return;
  scene = createStudy($('#world'), {
    onSelect: navigate,
    onReady: () => {
      $('#scene-shell').classList.remove('unavailable');
      $('#scene-shell').classList.add('ready');
      $('#gesture-note').textContent = 'Drag to orbit · scroll to inspect';
      $('#mesh-button').disabled = $('#reset-button').disabled = false;
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
}).catch(unavailable);
