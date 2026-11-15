import { profile, coursework, credentials, experiences, projects } from '../puzzle/content.js';
import { createObservatory } from './world.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ext = 'target="_blank" rel="noopener"';
const chapters = ['about', 'studies', 'experience', 'projects'];
const studyGroups = ['computation', 'biology', 'independent'];
const studyLabels = ['Computation', 'Biology', 'Independent'];
const experienceGroups = ['science', 'teams', 'robotics'];
const experienceLabels = ['Science & care', 'Teams', 'Robotics & games'];
const experienceIds = [
  ['icosagen-shadowing', 'veterinary-shadowing', 'pharmaceutical-scraper', 'biological-data'],
  ['hack-a-bot', 'zhaw-smart-systems', 'eelisa-entrepreneurship', 'healthcare-hackathon-2025'],
  ['first-lego-league', 'junior-game-jam'],
];
const summaries = {
  'icosagen-shadowing':'A month of guided labwork in antibody discovery and protein engineering.',
  'veterinary-shadowing':'Observed surgery, radiology, oncology and the use of digital imaging.',
  'pharmaceutical-scraper':'Built a Python scraper for pharmaceutical data as my CS50P final project.',
  'biological-data':'Wrote Python scripts to help a researcher filter and analyse biological datasets.',
  'hack-a-bot':'Led a team of five and built its gesture-control interface. Second place as a team.',
  'zhaw-smart-systems':'Helped prototype a sensor-based app and led its interactive industry pitch.',
  'eelisa-entrepreneurship':'Developed and pitched a startup concept with a team. Second place in Best Pitch.',
  'healthcare-hackathon-2025':'Helped develop a concept for secure, offline medical-device access.',
  'first-lego-league':'Robot programming, mechanical refinement and a team research presentation.',
  'junior-game-jam':'Built a playable 3D game with a team in 48 hours, using Unity, C# and Blender.',
};
const projectDescriptions = {
  nixcare:'A tool I build and maintain for NixOS diagnostics and system maintenance.',
  aloha:'A team prototype. I developed web experiences, companion interfaces and the presentation.',
  'nixos-config':'My declarative Linux environment, including tablet input and touchscreen recovery.',
  'cube-solver':'A LEGO Mindstorms robot I built to solve a 3×3 cube.',
};
const about = $('#reading').innerHTML;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionPreference.matches, active = 'about', currentGroup = 0, world, gameWorld;
let lastStudy = 0, lastExperience = 0, gameLoading, gameUnavailable = false, worldUnavailable = false;
let panelAnimation, groupAnimation, detailOpener, messageTimer;

function announce(text) {
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { $('#announcement').textContent = text; }, 80);
}
function animate(element, group = false) {
  if (group) groupAnimation?.cancel(); else panelAnimation?.cancel();
  if (paused) return;
  const animation = element.animate([
    { transform:`translateY(${group ? 6 : 12}px)` },
    { transform:'translateY(0)' },
  ], { duration:group ? 300 : 480, easing:'cubic-bezier(.16,1,.3,1)' });
  if (group) groupAnimation = animation; else panelAnimation = animation;
}
function groupNav(ids, labels, index) {
  return `<div class="group-nav" role="tablist" aria-label="${active === 'studies' ? 'Study groups' : 'Experience groups'}">${ids.map((id,i) =>
    `<button type="button" role="tab" id="group-${id}" data-group="${i}" aria-controls="group-content" aria-selected="${i === index}" tabindex="${i === index ? '0':'-1'}">${labels[i]}</button>`).join('')}</div><div class="group-content" id="group-content" role="tabpanel" aria-labelledby="group-${ids[index]}" tabindex="0"></div>`;
}
function studyContent(index) {
  const group = coursework[index];
  let rows = group.items.map(item => {
    const cert = credentials.find(c => c.id === item.credentialId);
    return `<li><div${item.code ? ` title="Course code: ${esc(item.code)}"` : ''}>${esc(item.title)}${item.institution ? `<small class="course-meta">${esc(item.institution)} · ${esc(item.status)}</small>` : ''}</div>${cert ? `<a href="${esc(cert.url)}" ${ext} aria-label="Certificate for ${esc(item.title)}">↗</a>` : ''}</li>`;
  }).join('');
  if (index === 2) {
    const tum = credentials.find(c => c.id === 'digitalisation-space');
    rows += `<li><div>${esc(tum.title)}<small class="course-meta">${esc(tum.institution)} · Course certificate</small></div><a href="${esc(tum.url)}" ${ext} aria-label="Certificate for ${esc(tum.title)}">↗</a></li>`;
  }
  const professional = credentials.find(c => c.id === 'computer-science-python');
  return `<ul class="course-list">${rows}</ul>${index === 2
    ? `<p class="study-note">CS50x and CS50P also form the <a href="${esc(professional.url)}" ${ext}>Computer Science for Python Programming certificate ↗</a>.</p>`
    : `<p class="study-note">${index === 0 ? 'University coursework in computation and artificial intelligence.' : 'University coursework in biology, medicine and neuroscience.'}</p>`}`;
}
function experienceContent(index) {
  return `<ul class="experience-list">${experienceIds[index].map(id => {
    const item = experiences.find(e => e.id === id);
    return `<li><button type="button" class="experience-item" data-detail="${id}" aria-haspopup="dialog"><span><strong>${esc(item.title)}</strong><span class="entry-copy">${esc(summaries[id])}</span><small>${esc(item.organisation)}${item.date ? ` · ${esc(item.date)}` : ''}</small></span><span aria-hidden="true">↗</span></button></li>`;
  }).join('')}</ul><p class="experience-note">Choose an experience to read its full account.</p>`;
}
function renderGroup(index, shouldAnimate = true) {
  const ids = active === 'studies' ? studyGroups : experienceGroups;
  currentGroup = index;
  if (active === 'studies') lastStudy = index; else lastExperience = index;
  $$('.group-nav button').forEach((button,i) => {
    button.setAttribute('aria-selected', String(i === index));
    button.tabIndex = i === index ? 0 : -1;
  });
  $('#group-content').setAttribute('aria-labelledby', `group-${ids[index]}`);
  $('#group-content').innerHTML = active === 'studies' ? studyContent(index) : experienceContent(index);
  if (shouldAnimate) animate($('#group-content'), true);
}
function renderChapter(chapter, group, changed) {
  const reading = $('#reading');
  if (changed) {
    if (chapter === 'about') reading.innerHTML = about;
    if (chapter === 'studies') reading.innerHTML = `
      <div class="chapter-heading"><h2 tabindex="-1">Studies</h2><p>B.Sc. Artificial Intelligence<br>FAU Erlangen-Nürnberg</p><p class="chapter-meta">Since October 2025 · A biomedical direction</p></div>
      ${groupNav(studyGroups, studyLabels, group)}`;
    if (chapter === 'experience') reading.innerHTML = `
      <div class="chapter-heading"><h2 tabindex="-1">Experience</h2><p>Working at Siemens Healthineers<br>alongside my degree.</p><p class="chapter-meta">Since April 2026</p></div>
      ${groupNav(experienceGroups, experienceLabels, group)}`;
    if (chapter === 'projects') reading.innerHTML = `
      <div class="chapter-heading"><h2 tabindex="-1">Projects</h2><p>A few things I’ve made.</p></div>
      <ul class="project-list">${projects.map(item => `<li><a class="project" href="${esc(item.sourceUrl || item.url)}" ${ext}><div><h3>${esc(item.title)}</h3><p>${esc(projectDescriptions[item.id])}</p><small>${esc(item.type)}</small></div><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
      <a class="github-more" href="${profile.links.github}" ${ext}>More on GitHub <span aria-hidden="true">↗</span></a>`;
    animate(reading);
  }
  if (chapter === 'studies' || chapter === 'experience') renderGroup(group, !changed);
  reading.setAttribute('aria-label', chapter === 'about' ? 'About Marc' : chapter[0].toUpperCase() + chapter.slice(1));
}

function route({focus = false, groupFocus = false} = {}) {
  if ($('#detail').open) { detailOpener = null; $('#detail').close(); }
  const parts = location.hash.slice(1).split('/');
  if (parts[0] === 'puzzle') {
    active = 'puzzle';
    document.body.dataset.view = 'puzzle';
    $('#profile').hidden = true; $('#game').hidden = false;
    $('.main-nav').hidden = true; $('.back-link').hidden = false;
    $('.skip').href = '#game-content'; $('.skip').textContent = 'Skip to the puzzle';
    world?.setActive(false);
    ensureGame().then(() => gameWorld?.setActive(!document.hidden && active === 'puzzle'));
    if (focus) $('#game-title').focus({preventScroll:true});
    return;
  }
  const chapter = chapters.includes(parts[0]) ? parts[0] : 'about';
  const changed = chapter !== active || !$('#reading').children.length;
  active = chapter;
  document.body.dataset.view = 'profile'; document.body.dataset.chapter = chapter;
  $('#profile').hidden = false; $('#game').hidden = true;
  $('.main-nav').hidden = false; $('.back-link').hidden = true;
  $('.skip').href = '#reading'; $('.skip').textContent = 'Skip to content';
  let group = 0;
  if (chapter === 'studies') group = Math.max(0, parts[1] ? studyGroups.indexOf(parts[1]) : lastStudy);
  if (chapter === 'experience') group = Math.max(0, parts[1] ? experienceGroups.indexOf(parts[1]) : lastExperience);
  renderChapter(chapter, group, changed);
  $$('.main-nav a').forEach((link,i) => {
    if (chapters[i] === active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  world?.select(chapters.indexOf(active));
  world?.setActive(!document.hidden);
  gameWorld?.setActive(false);
  if (groupFocus) $(`.group-nav button[data-group="${group}"]`)?.focus({preventScroll:true});
  else if (focus) {
    const heading = $('#reading h1, #reading h2'); heading?.setAttribute('tabindex','-1'); heading?.focus({preventScroll:true});
    if (innerWidth <= 700) window.scrollTo({top:0,behavior:paused ? 'instant':'smooth'});
  }
  if (focus || groupFocus) announce(`${chapter === 'about' ? 'About Marc' : chapter[0].toUpperCase()+chapter.slice(1)}${groupFocus ? ': '+(chapter === 'studies' ? studyLabels : experienceLabels)[group] : ''}.`);
}
function navigate(hash, options = {}) {
  if (location.hash !== hash) history.pushState(null,'',hash);
  route(options);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link) {
    event.preventDefault();
    if (link.hash === '#reading') { $('#reading').focus({preventScroll:true}); $('#reading').scrollIntoView({behavior:paused ? 'instant':'smooth'}); return; }
    if (link.hash === '#game-content') { $('#game-title').focus({preventScroll:true}); $('#game-title').scrollIntoView({behavior:paused ? 'instant':'smooth'}); return; }
    navigate(link.hash,{focus:true}); return;
  }
  const group = event.target.closest('[data-group]');
  if (group) {
    const ids = active === 'studies' ? studyGroups : experienceGroups;
    navigate(`#${active}/${ids[Number(group.dataset.group)]}`,{groupFocus:true}); return;
  }
  const detail = event.target.closest('[data-detail]');
  if (detail) openDetail(detail.dataset.detail, detail);
});
document.addEventListener('keydown', event => {
  const group = event.target.closest('.group-nav button');
  const nav = event.target.closest('.main-nav a');
  if (!group && !nav) return;
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const count = group ? 3 : 4, current = group ? currentGroup : chapters.indexOf(active);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (current + (event.key === 'ArrowRight' ? 1 : count-1)) % count;
  if (group) {
    const ids = active === 'studies' ? studyGroups : experienceGroups;
    navigate(`#${active}/${ids[next]}`,{groupFocus:true});
  } else {
    navigate(`#${chapters[next]}`);
    $$('.main-nav a')[next].focus({preventScroll:true});
  }
});
window.addEventListener('popstate', () => route({focus:true}));
window.addEventListener('hashchange', () => route({focus:true}));

function openDetail(id, opener) {
  const item = experiences.find(e => e.id === id);
  if (!item) return;
  detailOpener = opener;
  $('#detail-meta').textContent = `${item.type}${item.date ? ' · '+item.date : ''}`;
  $('#detail-title').textContent = item.title;
  $('#detail-org').textContent = item.organisation;
  $('#detail-role').textContent = item.contribution;
  $('#detail-copy').textContent = item.text;
  $('#detail-outcome').textContent = item.outcome;
  $('#detail').showModal();
  world?.setActive(false);
}
$('#close-detail').addEventListener('click', () => $('#detail').close());
$('#detail').addEventListener('click', event => {
  if (event.target !== $('#detail')) return;
  const r = $('#detail').getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('#detail').close();
});
$('#detail').addEventListener('close', () => {
  if (detailOpener?.isConnected) detailOpener.focus({preventScroll:true});
  world?.setActive(!document.hidden && active !== 'puzzle');
});

function applyMotion() {
  document.body.classList.toggle('motion-paused', paused);
  $('#motion').textContent = paused ? 'Resume motion' : 'Pause motion';
  $('#motion').setAttribute('aria-pressed',String(paused));
  if (paused) document.getAnimations().forEach(a => {try{a.finish();}catch{a.cancel();}});
  world?.setPaused(paused); gameWorld?.setPaused(paused);
}
$('#motion').addEventListener('click', () => {paused = !paused; applyMotion();});
motionPreference.addEventListener('change', event => {paused = event.matches; applyMotion();});

function updateGame(state) {
  if (!state) return;
  const controlsFocused = $('.turn-controls').contains(document.activeElement);
  const number = state.solved.filter(Boolean).length;
  $('#game-status').textContent = `${number} of 3 connected`;
  $('#game-title').textContent = state.complete ? 'Connected.' : 'One small puzzle.';
  $('#game-instruction').textContent = state.complete ? 'All three parts, aligned.' : gameUnavailable ? 'Bring each gold mark to the top.' : 'Line up the three openings with the top marker.';
  $('.turn-controls').hidden = state.complete; $('#game-finish').hidden = !state.complete;
  if (state.complete && controlsFocused) $('#game-finish').focus({preventScroll:true});
  $('#ring-choice').value = String(state.selected);
  $('#turn-left').disabled = state.solved[state.selected]; $('#turn-right').disabled = state.solved[state.selected];
  $$('#ring-choice option').forEach((option,i) => { option.textContent = `${['Outer','Middle','Inner'][i]} ring${state.solved[i] ? ' ✓':''}`; });
  $$('.fallback-ring').forEach((ring,i) => {
    ring.style.transform = `rotate(${state.targets[i]}rad)`;
    ring.dataset.selected = String(i === state.selected); ring.dataset.solved = String(state.solved[i]);
  });
}
async function ensureGame() {
  if (gameWorld) return;
  if (gameLoading) return gameLoading;
  gameLoading = import('../puzzle/world.js').then(({createPuzzle}) => {
    gameWorld = createPuzzle($('#puzzle-world'), {
      onUnavailable() {
        gameUnavailable = true; $('#game-fallback').hidden = false; $('#puzzle-world').hidden = true;
        queueMicrotask(() => updateGame(gameWorld?.getState()));
      },
      onSelect() { updateGame(gameWorld?.getState()); },
      onProgress() { queueMicrotask(() => {
        const state = gameWorld?.getState(); updateGame(state);
        if (state?.complete) announce('Puzzle complete. The orbit is open.');
        else if (state?.solved.some(Boolean)) announce(`${state.solved.filter(Boolean).length} of 3 rings connected. Choose another ring to continue.`);
      }); },
      onSettle: updateGame,
    });
    gameWorld.setPaused(paused); updateGame(gameWorld.getState());
  }).catch(() => {
    $('#game-instruction').textContent = 'The puzzle couldn’t load. Your profile is still available.';
    $('.turn-controls').hidden = true; $('#game-finish').hidden = false;
  });
  return gameLoading;
}
$('#ring-choice').addEventListener('change', event => { gameWorld?.select(Number(event.target.value)); updateGame(gameWorld?.getState()); });
$('#turn-left').addEventListener('click', () => {const s=gameWorld?.getState(); if(s)gameWorld.rotateStep(s.selected,-1); updateGame(gameWorld?.getState());});
$('#turn-right').addEventListener('click', () => {const s=gameWorld?.getState(); if(s)gameWorld.rotateStep(s.selected,1); updateGame(gameWorld?.getState());});
$('#game-reset').addEventListener('click', () => {gameWorld?.reset();updateGame(gameWorld?.getState());announce('Puzzle reset.');});

route(); applyMotion();
world = createObservatory($('#world'), {
  onReady() {document.body.classList.add('world-ready');},
  onUnavailable() {worldUnavailable = true; $('#world').hidden = true;},
  onSelect(index) {navigate(`#${chapters[index]}`);announce(`${chapters[index]} selected.`);},
});
world.select(Math.max(0,chapters.indexOf(active))); world.setPaused(paused); world.setActive(active !== 'puzzle');
document.addEventListener('visibilitychange', () => {
  world?.setActive(!document.hidden && active !== 'puzzle' && !$('#detail').open);
  gameWorld?.setActive(!document.hidden && active === 'puzzle');
});
window.addEventListener('pagehide', event => {
  if (event.persisted) {world?.setActive(false);gameWorld?.setActive(false);return;}
  world?.destroy();gameWorld?.destroy();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) {world?.setActive(!document.hidden && active !== 'puzzle');gameWorld?.setActive(!document.hidden && active === 'puzzle');}
});
window.orbitState = () => ({chapter:active, group:currentGroup, paused, worldUnavailable, gameUnavailable, puzzle:gameWorld?.getState() ?? null});
