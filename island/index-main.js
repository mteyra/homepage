import { renderChapter } from './chapters.js?v=spatial-index';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'About', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const groups = new Map();
const scroll = new Map();
let page = 'about', menuOpen = false, keyboard = false, scene, closed = false, manualPause = false, paused = reduced.matches;
try { manualPause = localStorage.getItem('marc-island-motion') === 'paused'; } catch {}
for (const element of $$('[data-content]')) element.innerHTML = renderChapter(element.dataset.content);
const view = kind => $(`[data-view="${kind}"]`);

function chooseGroup(kind, key) {
  const links = [...view(kind).querySelectorAll('.section-nav a')];
  if (!links.length) return;
  const current = links.find(link => link.dataset.group === key) || links[0];
  groups.set(kind, current.dataset.group);
  links.forEach(link => link === current ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
  for (const panel of view(kind).querySelectorAll('[data-group-panel]')) {
    if (panel.dataset.groupPanel !== current.dataset.group && panel.contains(document.activeElement)) current.focus({ preventScroll: true });
    panel.hidden = panel.dataset.groupPanel !== current.dataset.group;
  }
}
function resolveTarget(kind, key) {
  if (!key) return null;
  const prefix = { studies: 'study-', experience: 'experience-', projects: 'project-' }[kind];
  return prefix ? document.getElementById(`${prefix}${key}`) || (kind === 'experience' ? document.getElementById(key) : null) : null;
}
function applyRoute({ initial = false } = {}) {
  const [raw, key] = location.hash.slice(1).split('/');
  const next = pages.includes(raw) ? raw : 'about';
  const changed = next !== page;
  const target = resolveTarget(next, key);
  if (changed) scroll.set(page, window.scrollY);
  chooseGroup(next, target?.closest('[data-group-panel]')?.dataset.groupPanel || key);
  page = next;
  closeMenu();
  for (const kind of pages) view(kind).hidden = kind !== page;
  for (const link of $$('.index-links a')) link.dataset.page === page ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current');
  document.body.dataset.page = page;
  document.title = page === 'about' ? 'Marc Teyra Galiano' : `${titles[page]} · Marc Teyra Galiano`;
  $('.skip').href = `#${page}-title`;
  scene?.select(page, { instant: initial });
  $('#index-tooltip').textContent = titles[page];
  if (target && !target.matches('[data-group-panel]')) {
    if (target.matches('details')) target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  } else if (changed || initial) window.scrollTo({ top: initial ? 0 : scroll.get(page) || 0, behavior: 'instant' });
  if (changed && !initial) {
    $('#announcement').textContent = titles[page];
    if (keyboard) $(`#${page}-title`).focus({ preventScroll: true });
  }
}
function navigate(destination) {
  if (pages.includes(destination) && groups.has(destination)) destination = `${destination}/${groups.get(destination)}`;
  const hash = `#${destination}`;
  if (location.hash !== hash) history.pushState(null, '', hash);
  applyRoute();
}
function setMenu(open) {
  menuOpen = Boolean(open);
  $('#more-menu').hidden = !menuOpen;
  $('#more').setAttribute('aria-expanded', String(menuOpen));
  $('#more').setAttribute('aria-label', `${menuOpen ? 'Close' : 'Open'} more links and preferences`);
}
function closeMenu() { setMenu(false); }
function setPaused(value, persist = false) {
  if (persist) {
    manualPause = Boolean(value);
    try { localStorage.setItem('marc-island-motion', manualPause ? 'paused' : 'running'); } catch {}
  }
  paused = reduced.matches || Boolean(value);
  document.body.classList.toggle('motion-paused', paused);
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').setAttribute('aria-label', reduced.matches ? 'Motion reduced by system preference' : 'Reduce motion');
  $('#motion-label').textContent = reduced.matches ? 'Reduced' : paused ? 'Off' : 'On';
  $('#motion').disabled = reduced.matches;
  scene?.setPaused(paused);
}

setPaused(manualPause);
applyRoute({ initial: true });
$('#more').addEventListener('click', () => setMenu(!menuOpen));
$('#motion').addEventListener('click', () => setPaused(!paused, true));
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && !link.classList.contains('skip')) {
    const destination = link.getAttribute('href').slice(1);
    if (pages.includes(destination.split('/')[0])) { event.preventDefault(); navigate(destination); }
  }
  if (menuOpen && !$('.utility').contains(event.target)) closeMenu();
});
$('.skip').addEventListener('click', event => {
  event.preventDefault();
  $(`#${page}-title`).focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
});
document.addEventListener('pointerdown', () => { keyboard = false; }, true);
document.addEventListener('keydown', event => {
  if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) keyboard = true;
  if (event.key === 'Escape' && menuOpen) { closeMenu(); $('#more').focus(); return; }
  if (event.defaultPrevented || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key) || event.repeat) return;
  if (event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="combobox"],[role="listbox"],[role="menu"],[role="tree"]') || window.getSelection()?.toString()) return;
  event.preventDefault();
  navigate(pages[(pages.indexOf(page) + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length]);
});
document.addEventListener('focusin', event => { if (menuOpen && !$('.utility').contains(event.target)) closeMenu(); });
window.addEventListener('popstate', () => applyRoute());
window.addEventListener('hashchange', () => applyRoute());
reduced.addEventListener('change', () => setPaused(manualPause));
window.addEventListener('pagehide', event => { if (!event.persisted) { closed = true; scene?.destroy(); } });
window.indexState = () => ({ page, groups: Object.fromEntries(groups), paused, menuOpen, scene: scene?.getState() || { ready: false } });

// Reading and navigation are usable while the optional graphics module loads.
import('./index-scene.js?v=compass-tilt').then(({ createIndexScene }) => {
  if (closed) return;
  scene = createIndexScene($('#index-canvas'), {
    onSelect: navigate,
    onReady: () => $('.index-visual').classList.add('ready'),
    onUnavailable: () => $('.index-visual').classList.remove('ready'),
    onHover: kind => { $('#index-tooltip').textContent = titles[kind] || titles[page]; },
  });
  scene.setPaused(paused);
  scene.select(page, { instant: true });
}).catch(() => {
  // The SVG compass and all HTML navigation remain available without WebGL.
  $('.index-visual').classList.remove('ready');
});
