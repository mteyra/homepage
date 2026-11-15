import { renderChapter } from './chapters.js?v=object';
import { createMonogram } from './monogram.js?v=object';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pages = ['about', 'studies', 'experience', 'projects'];
const titles = { about: 'Marc Teyra Galiano', studies: 'Studies', experience: 'Experience', projects: 'Projects' };
const media = matchMedia('(prefers-reduced-motion: reduce)');
const stage = $('#sculpture-stage');
const accordionAnimations = new Map();
let page = 'about', sculpture, menuOpen = false, paused = media.matches, manualPause = null;
let ready = false, renderer = 'loading', menuTransition = null, sceneTransition = null, panelTransition = null;
let revealObserver = null, routeId = 0;
let activeGroup = null;
try { manualPause = localStorage.getItem('marc-island-motion'); paused = media.matches || manualPause === 'paused'; } catch { /* Optional preference. */ }
const motionAllowed = () => !paused && !media.matches;
const scrollBehavior = () => motionAllowed() ? 'smooth' : 'instant';

function syncIndicator() {
  const active = $(`.dock-rail a[data-page="${page}"]`);
  if (!active) return;
  $('.dock-indicator').style.width = `${active.offsetWidth}px`;
  $('.dock-indicator').style.transform = `translateX(${active.offsetLeft}px)`;
}

function enterText(element, delay = 0, distance = 20) {
  if (!element || !motionAllowed() || !element.animate) return;
  element.animate([{ opacity: .2, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'translateY(0)' }], {
    duration: 600, delay, easing: 'cubic-bezier(.16,1,.3,1)',
  });
}
function animatePage() {
  if (page === 'about') {
    $$('.introduction h1 > span').forEach((element, index) => enterText(element, index * 55, 26));
    enterText($('.hero-note'), 100, 16);
  } else {
    enterText($('#reading-title'), 25, 22);
    enterText($('.chapter-deck'), 75, 13);
    enterText($('.chapter-meta'), 100, 8);
    enterText($('.section-nav'), 100, 8);
    enterText($('.chapter-panel:not([hidden])'), 125, 8);
  }
  revealObserver?.disconnect();
  if (!('IntersectionObserver' in window)) return;
  // Content is visible by default, including when motion or observers are unavailable.
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      enterText(entry.target, 0, 16);
    });
  }, { threshold: 0, rootMargin: '0px 0px -25px 0px' });
  $$('#reading [data-reveal]').forEach(element => revealObserver.observe(element));
}
function moveScene(from, token) {
  const to = stage.getBoundingClientRect();
  const onScreen = from && from.bottom > 0 && from.top < innerHeight;
  if (!motionAllowed() || !ready || !onScreen || !from.width || !to.width || !stage.animate) return;
  stage.classList.add('scene-moving');
  sceneTransition = stage.animate([
    { transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})` },
    { transform: 'translate(0,0) scale(1,1)' },
  ], { duration: 680, easing: 'cubic-bezier(.22,1,.32,1)' });
  sceneTransition.finished.catch(() => {}).then(() => {
    if (token === routeId) stage.classList.remove('scene-moving');
  });
}
function deepTarget(key) {
  if (!key) return null;
  const prefix = { studies: 'study-', experience: 'experience-', projects: 'project-' }[page];
  return document.getElementById(`${prefix}${key}`);
}
function goToKey(key, { initial = false } = {}) {
  const target = deepTarget(key);
  if (!target) return;
  target.scrollIntoView({ block: 'start', behavior: initial ? 'instant' : scrollBehavior() });
  if (document.body.classList.contains('keyboard-input')) {
    const heading = target.querySelector('h2') || target;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
function activateGroup(key, { animate = true, keepContext = false } = {}) {
  if (!['studies', 'experience'].includes(page)) { activeGroup = null; return false; }
  const nav = $('#reading .section-nav');
  if (!nav) { activeGroup = null; return false; }
  const links = [...nav.querySelectorAll('a[data-group]')];
  const selectedLink = links.find(link => link.dataset.group === key) || links[0];
  const panels = $$('#reading [data-group-panel]');
  const selectedPanel = panels.find(panel => panel.dataset.groupPanel === selectedLink?.dataset.group);
  if (!selectedPanel) return false;
  const changed = activeGroup !== selectedLink.dataset.group;
  const focusWasInHiddenPanel = panels.some(panel => panel !== selectedPanel && panel.contains(document.activeElement));
  activeGroup = selectedLink.dataset.group;
  links.forEach(link => {
    if (link === selectedLink) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  panelTransition?.cancel();
  panels.forEach(panel => {
    panel.hidden = panel !== selectedPanel;
    if (!panel.hidden) return;
    accordionAnimations.forEach((transaction, entry) => {
      if (!panel.contains(entry)) return;
      entry.open = transaction.opening;
      transaction.animation.cancel();
      entry.classList.remove('is-animating');
      accordionAnimations.delete(entry);
    });
  });
  if (changed && animate && motionAllowed() && selectedPanel.animate) {
    panelTransition = selectedPanel.animate([
      { opacity: .45, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  if (focusWasInHiddenPanel && document.body.classList.contains('keyboard-input')) selectedLink.focus({ preventScroll: true });
  if (keepContext) {
    const rect = nav.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > innerHeight) nav.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }
  return true;
}
function route({ initial = false } = {}) {
  const [raw, key] = location.hash.slice(1).split('/');
  const next = pages.includes(raw) ? raw : 'about';
  if (ready && page === next && !initial) {
    closeMenu();
    if (activateGroup(key, { keepContext: Boolean(key) })) {
      if (!key) window.scrollTo({ top: 0, behavior: scrollBehavior() });
    } else if (key) goToKey(key);
    else window.scrollTo({ top: 0, behavior: scrollBehavior() });
    return;
  }
  const token = ++routeId;
  const from = stage.getBoundingClientRect();
  sceneTransition?.cancel();
  stage.classList.remove('scene-moving');
  document.getAnimations().forEach(animation => { if (animation.effect?.target?.closest?.('main')) animation.cancel(); });
  accordionAnimations.forEach(({ animation }) => animation.cancel());
  accordionAnimations.clear();
  revealObserver?.disconnect();
  // The same WebGL canvas changes its place in the composition without creating another context.
  stage.remove();
  page = next;
  activeGroup = null;
  closeMenu();
  document.body.dataset.page = page;
  document.title = page === 'about' ? titles.about : `${titles[page]} · ${titles.about}`;
  $$('.dock-rail a').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  syncIndicator();
  const isHome = page === 'about';
  $('#home').hidden = !isHome;
  $('#reading').hidden = isHome;
  if (!isHome) {
    $('#reading').innerHTML = renderChapter(page);
    $('#reading').setAttribute('aria-labelledby', 'reading-title');
  }
  (isHome ? $('#home-art') : $('#chapter-art')).append(stage);
  const hasGroups = !isHome && activateGroup(key, { animate: false });
  $('.skip').href = isHome ? '#page-title' : '#reading-title';
  sculpture?.setPage(page);
  sculpture?.setActive(true);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (!key || hasGroups) moveScene(from, token);
  if (!initial && document.body.classList.contains('keyboard-input')) {
    (isHome ? $('#page-title') : $('#reading-title')).focus({ preventScroll: true });
  }
  if (!initial) $('#announcement').textContent = `${titles[page]}.`;
  animatePage();
  if (key && !hasGroups) requestAnimationFrame(() => { if (token === routeId) goToKey(key, { initial: true }); });
  ready = true;
}

function toggleExperience(entry) {
  const previous = accordionAnimations.get(entry);
  const opening = previous ? !previous.opening : !entry.open;
  const from = entry.getBoundingClientRect().height;
  previous?.animation.cancel();
  accordionAnimations.delete(entry);
  if (!motionAllowed() || !entry.animate) {
    entry.open = opening;
    entry.classList.remove('is-animating');
    return;
  }
  entry.open = true;
  const border = parseFloat(getComputedStyle(entry).borderTopWidth) + parseFloat(getComputedStyle(entry).borderBottomWidth);
  const to = opening ? entry.getBoundingClientRect().height : entry.querySelector('summary').getBoundingClientRect().height + border;
  entry.classList.add('is-animating');
  const animation = entry.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const transaction = { animation, opening };
  accordionAnimations.set(entry, transaction);
  if (opening) enterText(entry.querySelector('.experience-body'), 0, 6);
  animation.onfinish = () => {
    if (accordionAnimations.get(entry) !== transaction) return;
    entry.open = opening;
    entry.classList.remove('is-animating');
    accordionAnimations.delete(entry);
  };
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
  if (motionAllowed() && island.animate) {
    menuTransition = island.animate([{ height: `${previousHeight}px` }, { height: `${island.offsetHeight}px` }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)' });
    if (open) enterText(panel, 0, 9);
  }
  if (open && focus) panel.querySelector('a')?.focus({ preventScroll: true });
}
function closeMenu() { setMenu(false); }
function setPaused(value, persist = false) {
  paused = media.matches || Boolean(value);
  document.body.classList.toggle('motion-paused', paused);
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').disabled = media.matches;
  $('#motion').setAttribute('aria-label', media.matches ? 'Motion reduced by system preference' : paused ? 'Resume motion' : 'Pause motion');
  $('#motion-label').textContent = media.matches ? 'Reduced' : paused ? 'Paused' : 'On';
  sculpture?.setPaused(paused);
  if (paused) document.getAnimations().forEach(animation => animation.finish());
  if (persist) {
    manualPause = paused ? 'paused' : 'on';
    try { localStorage.setItem('marc-island-motion', manualPause); } catch { /* Optional. */ }
  }
}

$('#more').addEventListener('click', event => setMenu(!menuOpen, event.detail === 0));
$('#motion').addEventListener('click', () => setPaused(!paused, true));
$('#reading').addEventListener('click', event => {
  const summary = event.target.closest('details.experience > summary');
  if (!summary || event.target.closest('a') || window.getSelection()?.toString()) return;
  event.preventDefault();
  toggleExperience(summary.parentElement);
});
$('.dock-rail').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  if (link.dataset.page === page) window.scrollTo({ top: 0, behavior: scrollBehavior() });
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
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: 'center', behavior: 'instant' });
});
document.addEventListener('click', event => { if (menuOpen && !$('#island').contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => {
  if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
    document.body.classList.add('keyboard-input');
  }
  if (event.key === 'Escape' && menuOpen) { closeMenu(); $('#more').focus(); }
  if (event.defaultPrevented || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="combobox"], [role="listbox"], [role="menu"], [role="tree"]')) return;
  if (window.getSelection()?.toString()) return;
  event.preventDefault();
  if (event.repeat) return;
  location.hash = pages[(pages.indexOf(page) + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length];
});
document.addEventListener('pointerdown', () => document.body.classList.remove('keyboard-input'), true);
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'touch' && document.body.classList.contains('keyboard-input')) {
    document.body.classList.remove('keyboard-input');
  }
}, { passive: true });
document.addEventListener('focusin', event => {
  if (menuOpen && !$('#island').contains(event.target)) closeMenu();
});
addEventListener('hashchange', () => route());
addEventListener('resize', syncIndicator, { passive: true });
media.addEventListener('change', () => setPaused(media.matches || manualPause === 'paused'));
document.fonts.ready.then(syncIndicator);

setPaused(paused);
route({ initial: true });
sculpture = createMonogram($('#sculpture'), {
  onReady: () => { renderer = 'webgl'; document.body.classList.add('world-ready'); },
  onUnavailable: () => {
    renderer = 'fallback'; document.body.classList.remove('world-ready');
    $('#sculpture').hidden = true;
  },
});
sculpture.setPaused(paused);
sculpture.setPage(page);
// A read-only state snapshot for browser checks.
window.islandState = () => ({ page, activeGroup, menuOpen, paused, renderer, identity: sculpture?.getState(), chapter: page === 'about' ? null : { kind: page, activeGroup }, sceneMoving: stage.classList.contains('scene-moving') });
