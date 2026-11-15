import { renderChapter } from './chapters.js?v=folio';
import { createFolio } from './folio.js?v=folio';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'Marc Teyra Galiano', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const groupByPage = new Map();
const detailsAnimations = new Map();
let page = 'about', menuOpen = false, keyboard = false, manualPause = false, paused = reduced.matches;
let folio, menuAnimation;
try { manualPause = localStorage.getItem('marc-island-motion') === 'paused'; } catch { /* Optional preference. */ }
paused = reduced.matches || manualPause;
const motionAllowed = () => !paused && !reduced.matches;

for (const element of $$('[data-content]')) element.innerHTML = renderChapter(element.dataset.content);
const sheet = kind => $(`.folio-page[data-page="${kind}"]`);
function selectGroup(kind, key, { animate = false } = {}) {
  const currentSheet = sheet(kind);
  const links = [...currentSheet.querySelectorAll('.section-nav a[data-group]')];
  if (!links.length) return null;
  const requested = links.find(link => link.dataset.group === key);
  const link = requested || links[0];
  const changed = groupByPage.get(kind) !== link.dataset.group;
  groupByPage.set(kind, link.dataset.group);
  for (const item of links) {
    if (item === link) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  }
  for (const panel of currentSheet.querySelectorAll('[data-group-panel]')) {
    const selected = panel.dataset.groupPanel === link.dataset.group;
    if (!selected && panel.contains(document.activeElement)) link.focus({ preventScroll: true });
    panel.getAnimations().forEach(animation => animation.cancel());
    panel.hidden = !selected;
    if (selected && changed && animate && motionAllowed()) {
      panel.animate([{ opacity: .45, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
  if (changed && animate) {
    const scroller = currentSheet.querySelector('.page-scroll');
    const nav = currentSheet.querySelector('.section-nav');
    if (nav.offsetTop < scroller.scrollTop) scroller.scrollTo({ top: Math.max(0, nav.offsetTop - 25), behavior: motionAllowed() ? 'smooth' : 'instant' });
  }
  return link.dataset.group;
}
for (const kind of ['studies', 'experience']) selectGroup(kind);

function deepTarget(kind, key) {
  if (!key) return null;
  const prefix = { studies: 'study-', experience: 'experience-', projects: 'project-' }[kind];
  return prefix ? document.getElementById(`${prefix}${key}`) || (kind === 'experience' ? document.getElementById(key) : null) : null;
}
function applyRoute({ initial = false } = {}) {
  const [raw, key] = location.hash.slice(1).split('/');
  const next = pages.includes(raw) ? raw : 'about';
  const changed = page !== next;
  const target = deepTarget(next, key);
  const groupKey = target?.closest('[data-group-panel]')?.dataset.groupPanel || key;
  selectGroup(next, groupKey, { animate: !initial && !changed });
  page = next;
  closeMenu();
  document.body.dataset.page = next;
  document.title = next === 'about' ? titles.about : `${titles[next]} · ${titles.about}`;
  for (const link of $$('.dock-rail a')) {
    if (link.dataset.page === next) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('.skip').href = `#${next}-title`;
  folio?.goTo(next, { instant: initial && next !== 'about' });
  if (target && !target.matches('[data-group-panel]')) {
    if (target.matches('details')) target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  if (!initial && changed) {
    $('#announcement').textContent = `${titles[next]}.`;
    if (keyboard) requestAnimationFrame(() => $(`#${next}-title`)?.focus({ preventScroll: true }));
  }
}
function navigate(destination) {
  if (pages.includes(destination) && groupByPage.has(destination)) destination = `${destination}/${groupByPage.get(destination)}`;
  const hash = `#${destination}`;
  if (location.hash !== hash) history.pushState(null, '', hash);
  applyRoute();
}
function setMenu(value) {
  if (menuOpen === Boolean(value)) return;
  menuOpen = Boolean(value);
  const island = $('#island');
  const oldHeight = island.getBoundingClientRect().height;
  menuAnimation?.cancel();
  $('#island-menu').hidden = !menuOpen;
  $('#more').setAttribute('aria-expanded', String(menuOpen));
  $('#more').setAttribute('aria-label', menuOpen ? 'Close links and preferences' : 'Open links and preferences');
  if (motionAllowed()) menuAnimation = island.animate([{ height: `${oldHeight}px` }, { height: `${island.offsetHeight}px` }], { duration: 330, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
function closeMenu() { setMenu(false); }
function setPaused(value, persist = false) {
  if (persist) {
    manualPause = Boolean(value);
    try { localStorage.setItem('marc-island-motion', manualPause ? 'paused' : 'running'); } catch { /* Optional preference. */ }
  }
  paused = reduced.matches || Boolean(value);
  document.body.classList.toggle('motion-paused', paused);
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').setAttribute('aria-label', reduced.matches ? 'Motion reduced by system preference' : paused ? 'Resume motion' : 'Pause motion');
  $('#motion').disabled = reduced.matches;
  $('#motion-label').textContent = reduced.matches ? 'Reduced' : paused ? 'Paused' : 'On';
  folio?.setPaused(paused);
  if (paused) {
    menuAnimation?.cancel();
    for (const [entry, transaction] of detailsAnimations) {
      transaction.animation.cancel(); entry.open = transaction.opening; entry.classList.remove('is-animating');
    }
    detailsAnimations.clear();
    for (const panel of $$('.chapter-panel')) panel.getAnimations().forEach(animation => animation.cancel());
  }
}
function toggleExperience(entry) {
  const previous = detailsAnimations.get(entry);
  const opening = previous ? !previous.opening : !entry.open;
  const from = entry.getBoundingClientRect().height;
  previous?.animation.cancel();
  detailsAnimations.delete(entry);
  if (!motionAllowed()) { entry.open = opening; entry.classList.remove('is-animating'); return; }
  entry.open = true;
  const to = opening ? entry.getBoundingClientRect().height : entry.querySelector('summary').getBoundingClientRect().height + 1;
  entry.classList.add('is-animating');
  const animation = entry.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 370, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const transaction = { opening, animation };
  detailsAnimations.set(entry, transaction);
  animation.onfinish = () => {
    if (detailsAnimations.get(entry) !== transaction) return;
    entry.open = opening; entry.classList.remove('is-animating'); detailsAnimations.delete(entry);
  };
}

folio = createFolio($('#folio'), {
  onSelect: selected => {
    navigate(selected);
    if (keyboard) requestAnimationFrame(() => $(`#${selected}-title`)?.focus({ preventScroll: true }));
  },
  onOverviewChange: open => {
    $('#browse-folio').setAttribute('aria-expanded', String(open));
    if (open) {
      closeMenu();
      $('#announcement').textContent = 'Folio overview. Choose a page.';
      if (keyboard) requestAnimationFrame(() => $('.is-overview-page .page-preview')?.focus({ preventScroll: true }));
    }
  },
});
setPaused(paused);
applyRoute({ initial: true });

$('#browse-folio').setAttribute('aria-expanded', 'false');
$('#browse-folio').addEventListener('click', () => folio.setOverview(true));
$('#more').addEventListener('click', () => setMenu(!menuOpen));
$('#motion').addEventListener('click', () => setPaused(!paused, true));
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && !link.classList.contains('skip')) {
    const destination = link.getAttribute('href').slice(1);
    if (pages.includes(destination.split('/')[0])) { event.preventDefault(); navigate(destination); }
  }
  const summary = event.target.closest('.experience > summary');
  if (summary && !event.target.closest('a, button')) { event.preventDefault(); toggleExperience(summary.parentElement); }
  if (menuOpen && !$('#island').contains(event.target)) closeMenu();
});
$('.skip').addEventListener('click', event => {
  event.preventDefault();
  folio.goTo(page);
  $(`#${page}-title`)?.focus({ preventScroll: true });
  sheet(page).querySelector('.page-scroll').scrollTo({ top: 0, behavior: 'instant' });
});
document.addEventListener('pointerdown', () => { keyboard = false; }, true);
document.addEventListener('keydown', event => {
  if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) keyboard = true;
  if (event.key === 'Escape') {
    if (menuOpen) { closeMenu(); $('#more').focus(); return; }
    if (folio.getState().overview) { folio.setOverview(false); $(`#${page}-title`)?.focus({ preventScroll: true }); }
  }
  if (event.defaultPrevented || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="combobox"], [role="listbox"], [role="menu"], [role="tree"]')) return;
  if (window.getSelection()?.toString()) return;
  event.preventDefault();
  if (event.repeat) return;
  const delta = event.key === 'ArrowRight' ? 1 : -1;
  if (folio.getState().overview && folio.getState().mobile) {
    const step = $(`[data-folio-step="${delta}"]`);
    if (step && !step.disabled) {
      step.click();
      requestAnimationFrame(() => $('.is-overview-page .page-preview')?.focus({ preventScroll: true }));
    }
  } else navigate(pages[(pages.indexOf(page) + delta + pages.length) % pages.length]);
});
document.addEventListener('focusin', event => { if (menuOpen && !$('#island').contains(event.target)) closeMenu(); });
window.addEventListener('popstate', () => applyRoute());
window.addEventListener('hashchange', () => applyRoute());
reduced.addEventListener('change', () => setPaused(manualPause));
window.addEventListener('pagehide', event => { if (!event.persisted) folio.destroy(); });
window.folioState = () => ({ page, menuOpen, paused, groups: Object.fromEntries(groupByPage), scene: folio.getState(), scroll: Object.fromEntries(pages.map(kind => [kind, sheet(kind).querySelector('.page-scroll').scrollTop])) });
