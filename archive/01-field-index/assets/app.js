import { profile } from './content.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const svgNS = 'http://www.w3.org/2000/svg';

// Every external destination remains an ordinary link, including without JavaScript.
$$('a[target="_blank"]').forEach(link => {
  link.relList.add('noopener', 'noreferrer');
});

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function applyProfile() {
  const role = profile.currentRole;
  if (role && typeof role.title === 'string' && role.title.trim()) {
    const organisation = role.organisation || role.organization;
    const roleLabel = $('#role-label');
    const roleSummary = $('#role-summary');
    if (roleLabel) roleLabel.textContent = '03 / WORKING';
    if (roleSummary) {
      roleSummary.replaceChildren(document.createTextNode(role.title));
      if (organisation) {
        roleSummary.append(document.createElement('br'), document.createTextNode(organisation));
      }
    }
    const record = $('#cv-role');
    if (record) {
      record.replaceChildren(
        makeElement('span', 'meta-label', 'CURRENT EXPERIENCE'),
        makeElement('h3', '', role.title),
      );
      if (organisation) record.append(makeElement('p', '', organisation));
      if (role.summary) record.append(makeElement('p', '', role.summary));
    }
  }

  if (typeof profile.cvPdf === 'string' && profile.cvPdf.trim()) {
    try {
      const url = new URL(profile.cvPdf, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      const container = $('#cv-download');
      if (!container) return;
      const link = makeElement('a', 'button button-primary', 'Download CV ');
      link.href = url.href;
      const arrow = makeElement('span', '', '↓');
      arrow.setAttribute('aria-hidden', 'true');
      link.append(arrow);
      if (url.origin === location.origin) link.download = '';
      else {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      container.className = 'cv-download-ready';
      container.replaceChildren(link);
    } catch {
      // An incomplete config value leaves the existing truthful preview intact.
    }
  }
}

applyProfile();

// Native dialogs supply modal semantics, Escape handling, and focus containment.
const commandDialog = $('#command-dialog');
const cvDialog = $('#cv-dialog');
const modalState = new WeakMap();
let bodyOverflow = null;

function syncScrollLock() {
  const isOpen = Boolean($('dialog[open]'));
  if (isOpen && bodyOverflow === null) {
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (!isOpen && bodyOverflow !== null) {
    document.body.style.overflow = bodyOverflow;
    bodyOverflow = null;
  }
}

function openDialog(dialog, opener = document.activeElement) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal !== 'function') {
    location.hash = dialog === cvDialog ? '#about' : '#work';
    return;
  }
  const previousDialog = opener?.closest?.('dialog[open]');
  if (previousDialog && previousDialog !== dialog) {
    opener = modalState.get(previousDialog)?.opener || $('.header-cv');
  }
  $$('dialog[open]').forEach(other => {
    const previous = modalState.get(other);
    if (previous) previous.restore = false;
    other.close();
  });
  modalState.set(dialog, { opener, restore: true, backdropDown: false });
  dialog.showModal();
  syncScrollLock();
}

function closeDialog(dialog, restore = true) {
  if (!dialog?.open) return;
  const state = modalState.get(dialog);
  if (state) state.restore = restore;
  dialog.close();
}

$$('dialog').forEach(dialog => {
  $$('[data-close]', dialog).forEach(button => {
    button.addEventListener('click', () => closeDialog(dialog));
  });
  dialog.addEventListener('pointerdown', event => {
    const bounds = dialog.getBoundingClientRect();
    const state = modalState.get(dialog);
    if (state) state.backdropDown = event.target === dialog && (
      event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom
    );
  });
  dialog.addEventListener('click', event => {
    const state = modalState.get(dialog);
    if (!state?.backdropDown || event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      closeDialog(dialog);
    }
  });
  dialog.addEventListener('close', () => {
    syncScrollLock();
    const state = modalState.get(dialog);
    if (state?.restore && state.opener?.isConnected && !$('dialog[open]')) {
      state.opener.focus({ preventScroll: true });
    }
  });
});

$$('[data-cv]').forEach(button => {
  button.addEventListener('click', () => openDialog(cvDialog, button));
});

const navigation = [
  { code: '00', label: 'Overview', type: 'Section', href: '#home', keywords: 'home marc profile introduction' },
  { code: '01', label: 'Selected work', type: 'Section', href: '#work', keywords: 'projects portfolio building' },
  { code: '02', label: 'About Marc', type: 'Section', href: '#about', keywords: 'person background education degree' },
  { code: 'CV', label: 'Background & CV', type: 'Profile', action: 'cv', keywords: 'resume curriculum vitae job employment experience degree' },
  { code: '03', label: 'Writing & documentation', type: 'Section', href: '#writing', keywords: 'articles reports research technical guide notes' },
  { code: '04', label: 'Field atlas', type: 'Section', href: '#atlas', keywords: 'travel trips countries maps journal europe' },
  { code: '05', label: 'Start a conversation', type: 'Section', href: '#contact', keywords: 'contact connect linkedin' },
  { code: '↗', label: 'Aloha Robotics', type: 'Project', href: 'https://clschulzer.github.io/Aloha-Robotics-HH2.0/', keywords: 'healthcare hackathon care companion collaboration' },
  { code: '↗', label: 'Nixcare', type: 'Project', href: 'https://github.com/mteyra/nixcare', keywords: 'nix diagnostics maintenance systems' },
  { code: '↗', label: 'NixOS Config', type: 'Project', href: 'https://github.com/mteyra/nixos-config', keywords: 'linux flake workstation thinkpad reproducible architecture' },
  { code: '↗', label: 'GitHub', type: 'Elsewhere', href: 'https://github.com/mteyra', keywords: 'repositories source code open source' },
];
const commandInput = $('#command-input');
const commandResults = $('#command-results');
let filteredNavigation = navigation;
let selectedResult = 0;

function selectResult(index, scroll = true) {
  const links = $$('.command-result', commandResults);
  if (!links.length) {
    commandInput?.removeAttribute('aria-activedescendant');
    return;
  }
  selectedResult = (index + links.length) % links.length;
  links.forEach((link, position) => {
    const selected = position === selectedResult;
    link.classList.toggle('is-selected', selected);
    link.setAttribute('aria-selected', String(selected));
  });
  const active = links[selectedResult];
  commandInput?.setAttribute('aria-activedescendant', active.id);
  if (scroll) active.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}

function normalize(value) {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function focusSection(href) {
  const section = $(href);
  if (!section) return;
  const hadTabIndex = section.hasAttribute('tabindex');
  if (!hadTabIndex) {
    section.setAttribute('tabindex', '-1');
    section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
  }
  section.focus({ preventScroll: true });
}

function renderResults() {
  if (!commandInput || !commandResults) return;
  const terms = normalize(commandInput.value).trim().split(/\s+/).filter(Boolean);
  filteredNavigation = navigation.filter(item =>
    terms.every(term => normalize(`${item.label} ${item.type} ${item.keywords}`).includes(term)),
  );
  commandResults.replaceChildren();
  selectedResult = 0;
  if (!filteredNavigation.length) {
    const empty = makeElement('p', 'command-empty', 'Nothing here yet. Try “work”, “CV”, or “atlas”.');
    empty.setAttribute('role', 'status');
    commandResults.append(empty);
    commandInput.removeAttribute('aria-activedescendant');
    return;
  }
  filteredNavigation.forEach((item, index) => {
    const result = makeElement('a', 'command-result');
    result.href = item.href || '#about';
    result.id = `command-option-${index}`;
    result.setAttribute('role', 'option');
    result.setAttribute('aria-selected', String(index === 0));
    result.tabIndex = -1;
    result.append(
      makeElement('span', 'result-code', item.code),
      makeElement('span', 'result-label', item.label),
      makeElement('span', 'result-type', item.type),
    );
    if (item.href?.startsWith('https://')) {
      result.target = '_blank';
      result.rel = 'noopener noreferrer';
    }
    result.addEventListener('pointermove', () => selectResult(index, false));
    result.addEventListener('click', event => {
      if (item.action === 'cv') {
        event.preventDefault();
        const opener = modalState.get(commandDialog)?.opener;
        closeDialog(commandDialog, false);
        openDialog(cvDialog, opener);
      } else if (item.href?.startsWith('#')) {
        closeDialog(commandDialog, false);
        focusSection(item.href);
      } else {
        closeDialog(commandDialog);
      }
    });
    commandResults.append(result);
  });
  selectResult(0, false);
}

function openCommand(opener) {
  if (!commandDialog || !commandInput) return;
  commandInput.value = '';
  renderResults();
  openDialog(commandDialog, opener);
  commandInput.focus({ preventScroll: true });
  commandResults.scrollTop = 0;
}

if (commandInput && commandResults) {
  commandInput.setAttribute('role', 'combobox');
  commandInput.setAttribute('aria-autocomplete', 'list');
  commandInput.setAttribute('aria-expanded', 'true');
  commandInput.setAttribute('aria-controls', 'command-results');
  commandResults.setAttribute('role', 'listbox');
  commandResults.setAttribute('aria-label', 'Sections and projects');
  commandInput.addEventListener('input', renderResults);
  commandInput.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectResult(selectedResult + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      $$('.command-result', commandResults)[selectedResult]?.click();
    }
  });
}

$$('[data-command]').forEach(button => {
  button.addEventListener('click', () => openCommand(button));
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (commandDialog?.open) closeDialog(commandDialog);
    else openCommand(document.activeElement);
  }
});
const shortcutHint = $('.command-trigger kbd');
if (shortcutHint && !/Mac|iPhone|iPad/.test(navigator.platform)) shortcutHint.textContent = 'Ctrl K';

// Decorative 3D is isolated: a rendering failure never disables navigation.
async function startInstrument() {
  const canvas = $('#field-instrument');
  if (!canvas) return;
  const motionButton = $('#motion-toggle');
  const modeButtons = $$('[data-mode]');
  let paused = reducedMotion.matches;
  let manuallyChanged = false;
  const updateMotionButton = () => {
    if (!motionButton) return;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Resume sculpture animation' : 'Pause sculpture animation');
    const icon = $('span', motionButton);
    if (icon) icon.textContent = paused ? '▷' : 'Ⅱ';
  };
  updateMotionButton();
  try {
    const { FieldInstrument } = await import('./instrument.js');
    const instrument = new FieldInstrument(canvas, { mode: 'systems', paused });
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        instrument.setMode(button.dataset.mode);
        modeButtons.forEach(item => {
          const selected = item === button;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
      });
    });
    motionButton?.addEventListener('click', () => {
      manuallyChanged = true;
      paused = !paused;
      instrument.setPaused(paused);
      updateMotionButton();
    });
    reducedMotion.addEventListener('change', () => {
      if (manuallyChanged) return;
      paused = reducedMotion.matches;
      instrument.setPaused(paused);
      updateMotionButton();
    });
  } catch {
    modeButtons.forEach(button => { button.disabled = true; });
    if (motionButton) {
      motionButton.disabled = true;
      motionButton.setAttribute('aria-label', 'Sculpture animation unavailable');
    }
  }
}

startInstrument();

// The atlas uses public country outlines, never implied GPS tracks.
function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  return element;
}

const mapBounds = { west: -16, east: 41, south: 34, north: 67, width: 760, height: 570 };
function projectMap([longitude, latitude]) {
  return [
    (longitude - mapBounds.west) / (mapBounds.east - mapBounds.west) * mapBounds.width,
    (mapBounds.north - latitude) / (mapBounds.north - mapBounds.south) * mapBounds.height,
  ];
}

function geometryPolygons(geometry) {
  if (geometry?.type === 'Polygon') return [geometry.coordinates];
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function geometryPath(geometry) {
  return geometryPolygons(geometry).map(polygon =>
    polygon.map(ring => ring.map((coordinate, index) => {
      const [x, y] = projectMap(coordinate);
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + 'Z').join(' '),
  ).join(' ');
}

function geometryCentre(geometry) {
  const rings = geometryPolygons(geometry).map(polygon => polygon[0]);
  let largest = null;
  let largestArea = 0;
  rings.forEach(ring => {
    let area = 0, xSum = 0, ySum = 0;
    for (let index = 0; index < ring.length - 1; index += 1) {
      const [x1, y1] = ring[index];
      const [x2, y2] = ring[index + 1];
      const part = x1 * y2 - x2 * y1;
      area += part;
      xSum += (x1 + x2) * part;
      ySum += (y1 + y2) * part;
    }
    if (Math.abs(area) > largestArea) {
      largestArea = Math.abs(area);
      largest = [xSum / (3 * area), ySum / (3 * area)];
    }
  });
  return largest ? projectMap(largest) : [380, 285];
}

async function startMap() {
  const land = $('#map-land');
  const grid = $('#map-grid');
  const labels = $('#map-labels');
  const buttons = $$('[data-country]');
  const selection = $('#map-selection');
  if (!land || !grid || !labels) return;
  const visited = new Set(buttons.map(button => button.dataset.country));
  const paths = new Map();
  const centres = new Map();
  let selectedName = null;

  for (let longitude = -10; longitude <= 40; longitude += 10) {
    const [x] = projectMap([longitude, 34]);
    grid.append(svgElement('path', { d: `M${x},0V570`, class: 'map-grid-line' }));
  }
  for (let latitude = 35; latitude <= 65; latitude += 5) {
    const [, y] = projectMap([-16, latitude]);
    grid.append(svgElement('path', { d: `M0,${y}H760`, class: 'map-grid-line' }));
  }

  function selectCountry(name) {
    selectedName = name === selectedName ? null : name;
    buttons.forEach(button => {
      const active = button.dataset.country === selectedName;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    paths.forEach((path, country) => {
      path.classList.toggle('is-selected', country === selectedName);
      path.classList.toggle('selected', country === selectedName);
    });
    labels.replaceChildren();
    if (selectedName && centres.has(selectedName)) {
      const [x, y] = centres.get(selectedName);
      const marker = svgElement('circle', {
        cx: x, cy: y, r: 3.5, class: 'map-selection-point',
        fill: '#d8b47d', stroke: '#121715', 'stroke-width': 1.5,
      });
      const text = svgElement('text', {
        x: Math.min(650, Math.max(15, x + 11)), y: Math.max(20, y - 8),
        class: 'map-country-label', fill: '#d8b47d',
        'font-family': 'monospace', 'font-size': 11, 'letter-spacing': 1.4,
      });
      text.textContent = selectedName.toUpperCase();
      labels.append(marker, text);
      const selectedPath = paths.get(selectedName);
      if (selectedPath) land.append(selectedPath);
    }
    if (selection) selection.textContent = selectedName
      ? `${selectedName} — part of the 2024 travel journal.`
      : 'Select a place to find it on the map.';
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => selectCountry(button.dataset.country));
  });

  try {
    const response = await fetch(new URL('./europe.json', import.meta.url));
    if (!response.ok) throw new Error('Map unavailable');
    const countries = await response.json();
    if (!Array.isArray(countries)) throw new Error('Map data invalid');
    const fragment = document.createDocumentFragment();
    for (const country of countries) {
      if (!country?.name || !country.geometry) continue;
      const d = geometryPath(country.geometry);
      if (!d) continue;
      const path = svgElement('path', {
        d,
        class: `map-country${visited.has(country.name) ? ' is-visited visited' : ''}`,
        'data-name': country.name,
        'fill-rule': 'evenodd',
        'vector-effect': 'non-scaling-stroke',
      });
      const title = svgElement('title');
      title.textContent = country.name;
      path.append(title);
      fragment.append(path);
      paths.set(country.name, path);
      centres.set(country.name, geometryCentre(country.geometry));
    }
    land.replaceChildren(fragment);
    // Preserve a quick selection made before the small dataset finished loading.
    if (selectedName) {
      const name = selectedName;
      selectedName = null;
      selectCountry(name);
    }
  } catch {
    const error = $('.map-error');
    if (error) error.hidden = false;
    if (selection) selection.textContent = 'The map is unavailable; the country list remains available.';
  }
}

startMap();

// Keep the conventional navigation in step with the reading position.
const navLinks = $$('.main-nav a[href^="#"]');
const observedSections = navLinks.map(link => $(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window && observedSections.length) {
  const visibleSections = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => visibleSections.set(entry.target.id, entry));
    const candidates = [...visibleSections.values()].filter(entry => entry.isIntersecting);
    const active = candidates.sort((a, b) =>
      Math.abs(a.boundingClientRect.top - window.innerHeight * 0.2)
      - Math.abs(b.boundingClientRect.top - window.innerHeight * 0.2),
    )[0];
    navLinks.forEach(link => {
      const isActive = active && link.hash === `#${active.target.id}`;
      link.classList.toggle('is-active', Boolean(isActive));
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-10% 0px -55% 0px', threshold: [0, 0.1, 0.5] });
  observedSections.forEach(section => observer.observe(section));
}

// Brief, native scroll entrances; the document is always visible without JS.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const entranceObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entranceObserver.unobserve(entry.target);
      if (!reducedMotion.matches) entry.target.animate(
        [{ opacity: 0.45, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' },
      );
    });
  }, { threshold: 0.08 });
  $$('.feature-project, .compact-project, .about-copy, .writing-list, .atlas-layout').forEach(element => entranceObserver.observe(element));
}
