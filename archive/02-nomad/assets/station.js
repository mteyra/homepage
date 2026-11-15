import { profile, completedProjects, publicArchive } from './content.js';

const $ = (query, scope = document) => scope.querySelector(query);
const $$ = (query, scope = document) => [...scope.querySelectorAll(query)];
const body = document.body;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const places = ['work', 'study', 'travel', 'about'];
const placeNames = { overview: 'The world', work: 'Projects', study: 'Study', travel: 'Travels', about: 'About Marc' };
const locations = { work: 'THE WORKSHOP', study: 'THE OBSERVATORY', travel: 'THE OUTPOST', about: 'THE COMMON GROUND' };
let active = 'overview', view = 'explore', world = null, paused = reducedMotion.matches, manuallyPaused = false;
let countryData = null, mapGeneration = 0, indexReturnFocus = null;
let previewRoutes = readPreviewRoutes();

function readPreviewRoutes() {
  if (new URLSearchParams(location.search).get('atlas') !== 'preview') return null;
  try {
    const raw = sessionStorage.getItem('nomad.previewRoutes');
    if (!raw || raw.length > 5 * 1024 * 1024) return null;
    const collection = JSON.parse(raw);
    if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length > 3000) return null;
    let total = 0;
    const features = collection.features.map(feature => {
      const coordinates = feature.geometry?.coordinates;
      if (feature.geometry?.type !== 'LineString' || !Array.isArray(coordinates) || coordinates.length < 2) throw new Error();
      total += coordinates.length;
      if (total > 60000 || !coordinates.every(p => Array.isArray(p) && p.length >= 2 && p.slice(0,2).every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) throw new Error();
      return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:coordinates.map(p => p.slice(0,2))}};
    });
    return features.length ? {type:'FeatureCollection',features} : null;
  } catch { return null; }
}

const projects = {
  nixcare: {
    category: 'PERSONAL PROJECT / OPEN SOURCE',
    title: 'Give a system<br>a little care.',
    description: 'Diagnostics that help explain what a machine is doing, paired with deliberate, declarative maintenance for NixOS. Built to make system health easier to understand.',
    evidence: ['Linux + macOS diagnostics', 'NixOS maintenance', 'Nix'],
    link: 'https://mteyra.github.io/nixcare/',
    source: 'https://github.com/mteyra/nixcare',
    label: 'Explore Nixcare',
  },
  aloha: {
    category: 'TEAM PROJECT / HEALTHCARE HACKATHON',
    title: 'A little more<br>human connection.',
    description: 'A connected-care prototype bringing care planning, a digital companion, and playful activities together. Built with Sid and Chris for the Invisible Connectivity challenge.',
    evidence: ['4th place · Erlangen 2026', 'Team prototype', 'Healthcare'],
    link: 'https://clschulzer.github.io/Aloha-Robotics-HH2.0/',
    source: 'https://github.com/clschulzer/Aloha-Robotics-HH2.0',
    label: 'Meet Aloha',
  },
  robotics: {
    category: 'TEAM PROJECT / HACK-A-BOT 2026',
    title: 'A gesture.<br>A response.',
    description: 'A humanoid-robot control concept for a cath-lab setting. I led our team, designed and built the gesture interface, and led the final pitch. My teammates developed voice control; together we took second place.',
    evidence: ['2nd place', 'Gesture interface', 'Team & pitch lead'],
    link: profile.cvPdf,
    source: profile.cvPdf,
    label: 'The project in my CV',
  },
  nixos: {
    category: 'PERSONAL PROJECT / DECLARATIVE SYSTEMS',
    title: 'A system<br>of my own.',
    description: 'A reproducible workstation shaped around how I work. A flake-based NixOS configuration with hardware integration, modular structure, and a ThinkPad at its centre.',
    evidence: ['Nix flakes', 'ThinkPad', 'Hardware integration'],
    link: 'https://github.com/mteyra/nixos-config',
    source: 'https://github.com/mteyra/nixos-config',
    label: 'Explore the configuration',
  },
};

function appendRecords(selector, records) {
  const target = $(selector);
  if (!target) return;
  for (const item of records) {
    const article = document.createElement('article');
    const type = document.createElement('span');
    type.className = 'record-label';
    type.textContent = item.type;
    const title = document.createElement('h3');
    if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `${item.title} ↗`;
      title.append(link);
    } else title.textContent = item.title;
    const text = document.createElement('p');
    text.textContent = item.text;
    article.append(type, title, text);
    target.append(article);
  }
}
function populateStudy() {
  $('#degree-title').textContent = profile.degree.title;
  $('#degree-institution').textContent = `${profile.degree.institution} · since ${profile.degree.since}`;
  $('#degree-focus').textContent = profile.degree.focus;
  for (const credential of profile.credentials) {
    const link = document.createElement('a');
    link.href = credential.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const title = document.createElement('span');
    title.textContent = `${credential.title} ↗`;
    const institution = document.createElement('small');
    institution.textContent = credential.institution;
    link.append(title, institution);
    $('#credentials').append(link);
  }
}
function closeIndex(restoreFocus = false) {
  $('#quick-index').hidden = true;
  $('#index-backdrop').hidden = true;
  $('#index-toggle').setAttribute('aria-expanded', 'false');
  if (restoreFocus && indexReturnFocus?.isConnected) indexReturnFocus.focus({ preventScroll: true });
}
function openIndex() {
  indexReturnFocus = document.activeElement;
  $('#quick-index').hidden = false;
  $('#index-backdrop').hidden = false;
  $('#index-toggle').setAttribute('aria-expanded', 'true');
  $('#quick-index [data-station]').focus({ preventScroll: true });
}
function setView(next) {
  view = next;
  body.dataset.view = next;
  $('#explore-view').setAttribute('aria-pressed', String(next === 'explore'));
  $('#plan-view').setAttribute('aria-pressed', String(next === 'plan'));
  $('#caption-text').textContent = next === 'plan' ? 'One world. Your own way through it.' : 'A few places worth getting lost in.';
  world?.focus(active === 'overview' ? next === 'plan' ? 'plan' : 'overview' : active);
  if (body.classList.contains('world-fallback')) refreshFallbackAnchors();
}
function selectProject(id, updateHash = true) {
  if (!projects[id] || !$('#project-detail')) return;
  const project = projects[id];
  $$('.project-selector [data-project]').forEach(button => {
    const chosen = button.dataset.project === id;
    button.setAttribute('aria-selected', String(chosen));
    button.tabIndex = chosen ? 0 : -1;
  });
  const panel = $('#project-detail');
  panel.setAttribute('aria-labelledby', `tab-${id}`);
  panel.innerHTML = `<span class="project-category">${project.category}</span><h3>${project.title}</h3><p>${project.description}</p><div class="project-evidence">${project.evidence.map(item => `<span>${item}</span>`).join('')}</div><div class="project-links"><a class="primary-link" href="${project.link}" target="_blank" rel="noopener noreferrer">${project.label} <span>↗</span></a>${project.source !== project.link ? `<a class="quiet-link" href="${project.source}" target="_blank" rel="noopener noreferrer">Source <span>↗</span></a>` : ''}</div>`;
  if (updateHash) history.replaceState({}, '', `#work/${id}`);
  if (!reducedMotion.matches) panel.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
}
function populateProfile() {
  const role = profile.currentRole;
  if (role && (role.title || role.organisation)) {
    const record = $('#current-role');
    const label = document.createElement('span');
    label.className = 'record-label';
    label.textContent = 'CURRENTLY';
    const heading = document.createElement('h3');
    heading.textContent = role.title || role.organisation;
    const summary = document.createElement('p');
    summary.textContent = [role.title && role.organisation, role.since && `Since ${role.since}`, role.summary].filter(Boolean).join(' · ');
    record.append(label, heading, summary);
  }
  if (typeof profile.cvPdf === 'string' && profile.cvPdf.trim()) {
    try {
      const url = new URL(profile.cvPdf, location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      const link = $('#cv-download');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      $('#cv-label').textContent = profile.cvLabel || 'Read my CV';
      link.hidden = false;
    } catch {}
  }
  appendRecords('#experience-list', profile.experience);
  for (const language of profile.languages) {
    const entry = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = language.name;
    const level = document.createElement('small');
    level.textContent = language.level;
    entry.append(name, level);
    $('#language-list').append(entry);
  }
}
function navigate(id, { updateHistory = true, focus = false, project = null } = {}) {
  if (!places.includes(id)) id = 'overview';
  closeIndex();
  active = id;
  body.dataset.place = id;
  $$('.destination-nav [data-station]').forEach(button => {
    const selected = button.dataset.station === id;
    button.classList.toggle('is-active', selected);
    selected ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
  });
  if (id === 'overview') {
    $('#dossier').hidden = true;
    if (focus) $('.home-destination').focus({preventScroll:true});
  } else {
    const content = $('#dossier-content');
    content.replaceChildren($(`#place-${id}`).content.cloneNode(true));
    $('#dossier-location').textContent = locations[id];
    $('#dossier-number').textContent = `0${places.indexOf(id) + 1} / 04`;
    $('#dossier').hidden = false;
    content.scrollTop = 0;
    if (id === 'work') {
      selectProject(projects[project] ? project : 'nixcare', false);
      appendRecords('#completed-projects', completedProjects);
      appendRecords('#public-archive', publicArchive);
    }
    if (id === 'study') populateStudy();
    if (id === 'about') populateProfile();
    if (id === 'travel') renderMap();
    if (focus) $('#dossier-title').focus({preventScroll:true});
  }
  world?.setActive(id);
  world?.focus(id === 'overview' && view === 'plan' ? 'plan' : id);
  $('#scene-announcement').textContent = id === 'overview' ? 'Overview. Choose Projects, Study, Travels or About.' : `${placeNames[id]}. ${locations[id].toLowerCase()}.`;
  if (updateHistory) {
    const hash = id === 'overview' ? '#world' : `#${id}${project ? '/' + project : ''}`;
    if (location.hash !== hash) history.pushState({}, '', hash);
  }
  document.title = id === 'overview' ? 'Marc Teyra — NOMAD' : `${placeNames[id]} — Marc Teyra`;
  if (body.classList.contains('world-fallback')) refreshFallbackAnchors();
}
async function renderMap() {
  const generation = ++mapGeneration;
  if (previewRoutes) {
    renderPreviewMap();
    return;
  }
  try {
    if (!countryData) {
      const response = await fetch(new URL('./europe.json', import.meta.url));
      if (!response.ok) throw new Error('Map geometry unavailable');
      countryData = await response.json();
    }
    if (generation !== mapGeneration || active !== 'travel') return;
    const land = $('#journey-land');
    if (!land) return;
    const countries = new Set($$('[data-country]').map(button => button.dataset.country));
    const project = ([lon, lat]) => [((lon + 12) / 49) * 500, ((64 - lat) / 30) * 340];
    const pathRing = ring => ring.map((point, i) => {
      const [x, y] = project(point);
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + 'Z';
    for (const feature of Array.isArray(countryData) ? countryData : countryData.features) {
      const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
      const name = feature.name || feature.properties?.name || feature.properties?.NAME || feature.properties?.ADMIN;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', polygons.map(polygon => polygon.map(pathRing).join(' ')).join(' '));
      path.setAttribute('class', `map-country${countries.has(name) ? ' visited' : ''}`);
      path.dataset.name = name;
      land.append(path);
    }
    $$('[data-country]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  } catch {
    const status = $('#map-selection');
    if (status) status.textContent = 'Explore the places below';
  }
}
function renderPreviewMap() {
  const content = $('#dossier-content');
  const notice = document.createElement('div');
  notice.className = 'preview-notice';
  notice.innerHTML = '<span>YOUR ROUTE · PRIVATE TAB PREVIEW</span><p>This journey is visible in your current browser tab. It has not been published.</p><button id="clear-route-preview">Return to the travel journal <span>×</span></button>';
  content.prepend(notice);
  $('.journey-heading').innerHTML = '<span>IMPORTED JOURNEY</span><span>LOCAL PREVIEW</span>';
  $('.journey-title').textContent = 'Your journey. In this world.';
  $('.journey-description').textContent = 'The cleaned route from Atlas Studio, shown here and on the globe.';
  $('.country-index').hidden = true;
  $('.source-note').textContent = 'This is a preview of the coordinates you selected. Download the cleaned file in Atlas Studio when you are ready to keep it.';
  const lines = previewRoutes.features.map(feature => feature.geometry.coordinates);
  const points = lines.flat();
  const origin = points[0][0];
  const wrapped = longitude => ((longitude - origin + 540) % 360) - 180;
  const averageLat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const cos = Math.max(.02, Math.cos(averageLat * Math.PI / 180));
  const project = point => [wrapped(point[0]) * cos, -point[1]];
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for (const point of points) {
    const [x,y] = project(point);
    xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);
  }
  const scale = Math.min(420 / Math.max(.00001,xmax-xmin), 250 / Math.max(.00001,ymax-ymin));
  const plot = point => {
    const [x,y] = project(point);
    return [250+(x-(xmin+xmax)/2)*scale,160+(y-(ymin+ymax)/2)*scale];
  };
  const land = $('#journey-land');
  for (const line of lines) {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',line.map((point,i) => `${i?'L':'M'}${plot(point).map(x=>x.toFixed(2)).join(',')}`).join(' '));
    path.setAttribute('fill','none');
    path.setAttribute('stroke','#ff805e');
    path.setAttribute('stroke-width','2.5');
    path.setAttribute('stroke-linecap','round');
    land.append(path);
  }
  $('#journey-map').setAttribute('aria-label','Your imported route, fitted to the preview.');
  $('#map-selection').textContent = `${lines.length} segment${lines.length===1?'':'s'} · browser preview`;
  $('#clear-route-preview').addEventListener('click', () => {
    sessionStorage.removeItem('nomad.previewRoutes');
    previewRoutes = null;
    world?.setRoutes?.({type:'FeatureCollection',features:[]});
    const url = new URL(location.href);
    url.searchParams.delete('atlas');
    history.replaceState({},'',url.pathname+url.search+url.hash);
    navigate('travel', {updateHistory:false});
  });
}
document.addEventListener('click', event => {
  const station = event.target.closest('[data-station]');
  if (station) navigate(station.dataset.station, { focus: true });
  const project = event.target.closest('[data-project]');
  if (project) selectProject(project.dataset.project);
  const country = event.target.closest('[data-country]');
  if (country) {
    const wasSelected = country.getAttribute('aria-pressed') === 'true';
    $$('[data-country]').forEach(button => button.setAttribute('aria-pressed', String(button === country && !wasSelected)));
    $$('.map-country').forEach(path => path.classList.toggle('selected', path.dataset.name === country.dataset.country && !wasSelected));
    $('#map-selection').textContent = wasSelected ? 'A journey through Europe' : country.dataset.country;
  }
});
$('#index-toggle').addEventListener('click', () => $('#quick-index').hidden ? openIndex() : closeIndex(true));
$('#index-close').addEventListener('click', () => closeIndex(true));
$('#index-backdrop').addEventListener('click', () => closeIndex(true));
$('#explore-view').addEventListener('click', () => { navigate('overview'); setView('explore'); });
$('#plan-view').addEventListener('click', () => { navigate('overview'); setView('plan'); });
$('#next-place').addEventListener('click', () => navigate(places[(places.indexOf(active) + 1) % places.length], {focus:true}));
function applyMotion() {
  world?.setPaused(paused);
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  $('#motion-toggle').setAttribute('aria-label', paused ? 'Resume world animation' : 'Pause world animation');
  $('#motion-icon').textContent = paused ? '▷' : 'Ⅱ';
}
$('#motion-toggle').addEventListener('click', () => { paused = !paused; manuallyPaused = true; applyMotion(); });
reducedMotion.addEventListener('change', () => {
  if (!manuallyPaused) paused = reducedMotion.matches;
  applyMotion();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!$('#quick-index').hidden) closeIndex(true);
    else if (active !== 'overview') navigate('overview', {focus:true});
    else if (view === 'plan') setView('explore');
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('#quick-index').hidden ? openIndex() : closeIndex(true);
  }
  const tab = event.target.closest('.project-selector [role=tab]');
  if (tab && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const tabs = $$('.project-selector [role=tab]');
    let index = tabs.indexOf(tab);
    index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectProject(tabs[index].dataset.project);
    tabs[index].focus();
  }
  if (!$('#quick-index').hidden && event.key === 'Tab') {
    const stops = $$('button,a[href]', $('#quick-index'));
    const first = stops[0], last = stops.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
function readHash() {
  const [id, project] = location.hash.slice(1).split('/');
  navigate(id, {updateHistory:false, project});
}
addEventListener('popstate', readHash);
readHash();
applyMotion();
function fallback() {
  body.classList.add('world-fallback');
  body.classList.remove('world-ready');
  $('#render-note').hidden = false;
  $('#world-hint').textContent = 'Choose any place to explore';
  refreshFallbackAnchors();
}
const anchors = Object.fromEntries($$('[data-anchor]').map(button => [button.dataset.anchor, button]));
const projectedAnchors = new Map();
let anchorFrame = 0;
function refreshFallbackAnchors() {
  for (const [id, button] of Object.entries(anchors)) {
    projectedAnchors.set(id, {
      x: parseFloat(button.style.getPropertyValue('--anchor-x')) * innerWidth / 100,
      y: parseFloat(button.style.getPropertyValue('--anchor-y')) * innerHeight / 100,
      visible: true,
    });
  }
  if (!anchorFrame) anchorFrame = requestAnimationFrame(layoutAnchors);
}
addEventListener('resize', () => {
  if (body.classList.contains('world-fallback')) refreshFallbackAnchors();
});
function layoutAnchors() {
  anchorFrame = 0;
  const margin = innerWidth <= 900 ? 8 : 20;
  const intro = $('.orientation');
  const obstacles = active === 'overview' && view === 'explore' ? [intro.getBoundingClientRect()] : [];
  const placements = [];
  const intersects = (a, b) => a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
  for (const [id, button] of Object.entries(anchors)) {
    const point = projectedAnchors.get(id);
    if (!point?.visible || active !== 'overview') {
      placements.push({button, visible:false});
      continue;
    }
    const width = button.offsetWidth, height = button.offsetHeight;
    const left = Math.max(margin, Math.min(innerWidth - width - margin, point.x - 14));
    const top = Math.max(145 - height, Math.min(innerHeight - 155 - height, point.y - height));
    const xs = [left], ys = [top];
    for (const obstacle of obstacles) {
      xs.push(obstacle.left - width - 8, obstacle.right + 8);
      ys.push(obstacle.top - height - 8, obstacle.bottom + 8);
    }
    let best = null, distance = Infinity;
    for (const x of xs) for (const y of ys) {
      const candidate = {left:x, right:x+width, top:y, bottom:y+height};
      if (x < margin || candidate.right > innerWidth - margin || y < 95 || candidate.bottom > innerHeight - 155 || obstacles.some(obstacle => intersects(candidate, obstacle))) continue;
      const score = (x-left)**2 + (y-top)**2;
      if (score < distance) { best = candidate; distance = score; }
    }
    placements.push({button, visible:!!best, rectangle:best});
    if (best) obstacles.push(best);
  }
  for (const {button, visible, rectangle} of placements) {
    button.style.visibility = visible ? 'visible' : 'hidden';
    if (rectangle) {
      button.style.left = `${rectangle.left + 14}px`;
      button.style.top = `${rectangle.bottom}px`;
    }
  }
}
try {
  const { createWorld } = await import('./world.js');
  world = createWorld($('#world-canvas'), {
    onSelect: id => navigate(id, {focus:true}),
    onProject: (id, x, y, visible) => {
      if (!anchors[id] || !Number.isFinite(x) || !Number.isFinite(y)) return;
      projectedAnchors.set(id, {x, y, visible});
      if (!anchorFrame) anchorFrame = requestAnimationFrame(layoutAnchors);
    },
    onReady: () => {
      body.classList.add('world-ready');
      body.classList.remove('world-fallback');
      $('#render-note').hidden = true;
    },
    onUnavailable: fallback,
  });
  if (world) {
    world.setActive(active);
    world.setPaused(paused);
    world.focus(active === 'overview' && view === 'plan' ? 'plan' : active);
    if (previewRoutes) world.setRoutes?.(previewRoutes);
  }
} catch (error) {
  console.warn('The architectural plan is available in place of 3D.', error.message);
  fallback();
}
