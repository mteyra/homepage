import { createInk } from './ink.js';

const scenes = ['hello', 'now', 'path', 'curious', 'elsewhere', 'made'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let current = 'hello';
let busy = false;
let queued = null;
let paused = reduced.matches;
const curtain = document.querySelector('#curtain');
const index = document.querySelector('#question-index');
const ink = createInk(document.querySelector('#ink'));
const pauseButton = document.querySelector('#pause');

function select(id, focus = false) {
  current = id;
  document.body.dataset.scene = id;
  for (const scene of document.querySelectorAll('.scene')) {
    const active = scene.dataset.id === id;
    scene.hidden = !active;
    scene.classList.toggle('active', active);
    scene.classList.remove('entering');
    if (active && !reduced.matches && !paused) {
      requestAnimationFrame(() => scene.classList.add('entering'));
    }
  }
  for (const button of document.querySelectorAll('.scene-progress button')) {
    const active = button.dataset.go === id;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
  document.querySelector('#scene-position').textContent = `0${scenes.indexOf(id)} / 05`;
  document.title = `Marc Teyra Galiano — ${id === 'hello' ? 'Hello :D' : ({ now: 'Right now', path: 'The path here', curious: 'Curiosity', elsewhere: 'Beyond the screen', made: 'Selected work' })[id]}`;
  ink.setScene(id);
  if (focus) document.querySelector('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navigate(id, { history = true, focus = true } = {}) {
  if (!scenes.includes(id)) return;
  if (index.open) index.close();
  if (busy) { queued = { id, history, focus }; return; }
  if (current === id) return;
  if (history) window.history.pushState({ scene: id }, '', `#${id}`);
  if (reduced.matches || paused) { select(id, focus); return; }
  busy = true;
  curtain.classList.add('running');
  window.setTimeout(() => select(id, focus), 440);
  window.setTimeout(() => {
    curtain.classList.remove('running');
    busy = false;
    if (queued) { const next = queued; queued = null; navigate(next.id, next); }
  }, 1010);
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-go]');
  if (!target) return;
  event.preventDefault();
  navigate(target.dataset.go);
});
document.querySelector('#index-toggle').addEventListener('click', () => index.showModal());
document.querySelector('#close-index').addEventListener('click', () => index.close());
index.addEventListener('click', event => {
  if (event.target !== index) return;
  const box = index.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) index.close();
});
window.addEventListener('popstate', () => navigate(location.hash.slice(1) || 'hello', { history: false }));
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1) || 'hello';
  if (scenes.includes(id) && id !== current) navigate(id, { history: false });
});
document.addEventListener('keydown', event => {
  if (index.open || event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input,textarea,select,[contenteditable=true]')) return;
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!step) return;
  event.preventDefault();
  navigate(scenes[(scenes.indexOf(current) + step + scenes.length) % scenes.length]);
});

function updatePause() {
  document.body.classList.toggle('paused', paused);
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.setAttribute('aria-label', paused ? 'Resume ambient motion' : 'Pause ambient motion');
  pauseButton.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
  ink.setPaused(paused);
}
pauseButton.addEventListener('click', () => {
  // A navigation wipe must finish before ambient animation can be paused.
  if (busy) return;
  paused = !paused; updatePause();
});
reduced.addEventListener('change', () => { paused = reduced.matches; updatePause(); });
document.addEventListener('visibilitychange', () => ink.setActive(!document.hidden));
updatePause();

const topics = {
  computation: 'Algorithms, Programming and Data Representation · Applied Programming',
  biology: 'Introduction to Molecular Biology · Practical Skills in Computational Biology',
  medicine: 'Applied Data Science in Medicine & Psychology · Neuroanatomy and Neurophysiology',
};
function markChoice(selector, chosen, className) {
  document.querySelectorAll(selector).forEach(button => {
    const selected = button === chosen;
    button.classList.toggle(className, selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
document.querySelectorAll('[data-topic]').forEach((button, n) => button.addEventListener('click', () => {
  markChoice('[data-topic]', button, 'active');
  replace(document.querySelector('#course-text'), topics[button.dataset.topic]);
  document.querySelector('.dial-marker').style.transform = `rotate(${n * 80}deg)`;
  ink.setDetail(n);
}));

const eras = [
  { word: 'robots.', number: '17', second: '/18', label: 'TORONTO / ROBOTICS', title: 'A Rubik’s Cube. A LEGO robot.', copy: 'An autonomous Rubik’s Cube solver led into FIRST LEGO League. Our team reached the Ontario Provincial Championships and earned a Presentation Award.', aside: 'An early combination of building something and explaining it to other people.' },
  { word: 'data.', number: '20', second: '', label: 'PYTHON / BIOLOGICAL DATA', title: 'Code meets a real research question.', copy: 'I wrote Python scripts to help a University of Toronto researcher filter and analyse biological datasets. It brought pandas, regular expressions and Matplotlib out of coursework and into a practical problem.', aside: 'A first chance to connect programming with questions from biology.' },
  { word: 'trying.', number: '22', second: '/24', label: 'TARTU / EXPERIMENTS & LEARNING', title: 'Different ways to learn by doing.', copy: 'A 48-hour junior game jam at the University of Tartu: Unity, C#, Blender and a playable 3D shooter with a team. Alongside that, I worked towards the IB Diploma at Miina Härma Gümnaasium, completed in 2024.', aside: 'The game-jam team finished eighth. The wider lesson: making something together, under a real deadline.' },
  { word: 'connecting.', number: '25', second: '/26', label: 'FAU / TEAMS & NEW DIRECTIONS', title: 'More fields. More people to build with.', copy: 'AI studies at FAU, work at Siemens Healthineers, and interdisciplinary teams. EELISA brought entrepreneurship and a second-place team pitch; Hack-A-Bot brought a gesture interface, team leadership and another second place.', aside: 'My contributions increasingly include the explanation and presentation, as well as the code.' },
];
function changeEra(n) {
  const era = eras[n];
  document.querySelector('#era-range').value = n;
  document.querySelector('#era-range').setAttribute('aria-valuetext', ['2017 to 2018, robots', '2020, biological data', '2022 to 2024, experiments', '2025 to 2026, new directions'][n]);
  markChoice('[data-era]', document.querySelector(`[data-era="${n}"]`), 'selected');
  replace(document.querySelector('#era-word'), era.word);
  document.querySelector('#era-lead').textContent = ['It started', 'Then came', 'Room for', 'Now, it’s'][n];
  document.querySelector('#era-connector').textContent = n === 0 ? 'with ' : '';
  const number = document.querySelector('#era-number');
  number.replaceChildren(document.createTextNode(era.number));
  if (era.second) { const second = document.createElement('span'); second.textContent = era.second; number.append(second); }
  for (const field of ['label', 'title', 'copy', 'aside']) replace(document.querySelector(`#era-${field}`), era[field]);
  ink.setDetail(n);
}
document.querySelectorAll('[data-era]').forEach(button => button.addEventListener('click', () => changeEra(Number(button.dataset.era))));
document.querySelector('#era-range').addEventListener('input', event => changeEra(Number(event.target.value)));

const interests = {
  biology: { label: 'BIOLOGY / FIRST-HAND EXPOSURE', title: 'The context behind the data.', copy: 'Labwork and shadowing at Icosagen introduced me to antibody discovery. Veterinary shadowing in Estonia brought surgery, radiology and oncology into view. Both sit behind my interest in biomedical applications of AI.', detail: 'The Icosagen experience formed part of my IB Biology Extended Essay.', link: 'The fuller background in my CV ↗', url: '../../assets/cv/marc-teyra-cv-2026-02.pdf' },
  machines: { label: 'ROBOTICS / SYSTEMS / CODE', title: 'What is happening underneath?', copy: 'From LEGO robots to my own NixOS configuration, I keep coming back to how a system works from the ground up. Building and adjusting the pieces is part of the attraction.', detail: 'Linux configuration is one place where that interest is still very hands-on.', link: 'My system configuration on GitHub ↗', url: 'https://github.com/mteyra/nixos-config' },
  space: { label: 'SPACE / A LONG-STANDING INTEREST', title: 'A little further out.', copy: 'Space and physics have long been interests of mine, alongside AI and robotics. I followed that curiosity into TUM’s Digitalisation in Space Research course, completed in March 2025.', detail: 'Part of a wider period of self-directed study in computer science and space research.', link: 'View the course certificate ↗', url: 'https://coursera.org/share/86e99f9a072acd3909dc2b5da9a4ab8d' },
  people: { label: 'TEAMS / EXPLAINING / PRESENTING', title: 'An idea has to reach someone.', copy: 'I like the part where a technical idea becomes something other people can understand. That has meant interactive hackathon presentations, leading a pitch at ZHAW, and developing a startup concept with an EELISA team.', detail: 'The EELISA team earned second place in the Best Pitch Award. Building and communicating often happen together.', link: 'See our interactive Aloha presentation ↗', url: 'https://clschulzer.github.io/Aloha-Robotics-HH2.0/Presentation/hackathon/?s=3' },
};
document.querySelectorAll('[data-interest]').forEach((button, n) => button.addEventListener('click', () => {
  markChoice('[data-interest]', button, 'selected');
  const interest = interests[button.dataset.interest];
  for (const field of ['label', 'title', 'copy', 'detail']) replace(document.querySelector(`#interest-${field}`), interest[field]);
  const link = document.querySelector('#interest-link'); link.textContent = interest.link; link.href = interest.url;
  ink.setDetail(n);
}));

const languages = {
  english: ['Hello :D', 'ENGLISH / NATIVE OR BILINGUAL', 'en'],
  catalan: ['Hola :D', 'CATALAN / NATIVE OR BILINGUAL', 'ca'],
  spanish: ['Hola :D', 'SPANISH / PROFESSIONAL WORKING', 'es'],
  german: ['Hallo :D', 'GERMAN / PROFESSIONAL WORKING', 'de'],
  french: ['Salut :D', 'FRENCH / ELEMENTARY', 'fr'],
};
document.querySelectorAll('[data-language]').forEach((button, n) => button.addEventListener('click', () => {
  markChoice('[data-language]', button, 'selected');
  const [greeting, level, lang] = languages[button.dataset.language];
  replace(document.querySelector('#greeting-word'), greeting);
  document.querySelector('#greeting-word').lang = lang;
  document.querySelector('#language-level').textContent = level;
  ink.setDetail(n);
}));

function replace(element, text) {
  element.textContent = text;
  if (reduced.matches || paused) return;
  element.classList.remove('copy-change');
  void element.offsetWidth;
  element.classList.add('copy-change');
}

const face = document.querySelector('.hello-face');
let pointerX = 0, pointerY = 0, faceX = 0, faceY = 0, faceFrame = 0;
let pullStart = null, pullMoved = false, pullScene = 'now';
const pullQuestions = [
  ['now', 'What are you doing now?'],
  ['path', 'How did you get here?'],
  ['curious', 'What keeps you curious?'],
  ['elsewhere', 'And beyond the screen?'],
  ['made', 'What have you made?'],
];
face.addEventListener('pointerdown', event => {
  if (event.button !== 0 || busy) return;
  pullStart = { x: event.clientX, y: event.clientY };
  pullMoved = false;
  face.setPointerCapture(event.pointerId);
});
face.addEventListener('pointermove', event => {
  if (!pullStart) return;
  const dx = event.clientX - pullStart.x, dy = event.clientY - pullStart.y;
  if (Math.abs(dx) > 12) pullMoved = true;
  if (!pullMoved) return;
  document.body.classList.add('pulling');
  const distance = Math.abs(dx);
  const n = Math.min(4, Math.floor(distance / (innerWidth < 701 ? 27 : 55)));
  const [id, question] = pullQuestions[n];
  pullScene = id;
  document.querySelector('#pull-question').textContent = question;
  document.querySelector('#pull-caption').textContent = 'Release to follow it.';
  document.body.style.setProperty('--pull-x', `${dx * .1}px`);
  document.body.style.setProperty('--pull-skew', `${dx * .006}deg`);
  face.style.transform = `translate(${dx * .3}px,${dy * .12}px) rotate(${-8 + dx * .045}deg)`;
  ink.setDetail(n);
});
function finishPull(event, cancelled = false) {
  if (!pullStart) return;
  pullStart = null;
  if (face.hasPointerCapture(event.pointerId)) face.releasePointerCapture(event.pointerId);
  document.body.classList.remove('pulling');
  document.body.style.removeProperty('--pull-x');
  document.body.style.removeProperty('--pull-skew');
  document.querySelector('#pull-caption').textContent = 'Pull the smile sideways.';
  face.style.transform = 'rotate(-8deg)';
  if (cancelled) return;
  if (pullMoved) navigate(pullScene);
  else index.showModal();
}
face.addEventListener('pointerup', event => finishPull(event));
face.addEventListener('pointercancel', event => finishPull(event, true));
face.addEventListener('click', event => {
  // Keyboard activation offers the same destinations without a drag gesture.
  if (event.detail === 0 && !index.open) index.showModal();
});
document.addEventListener('pointermove', event => {
  pointerX = (event.clientX / innerWidth - .5) * 2;
  pointerY = (event.clientY / innerHeight - .5) * 2;
  ink.setPointer(pointerX, pointerY);
  if (!faceFrame && !paused && current === 'hello' && !pullStart) faceFrame = requestAnimationFrame(faceTick);
});
function faceTick() {
  faceFrame = 0;
  if (paused || current !== 'hello' || document.hidden || pullStart) return;
  faceX += (pointerX - faceX) * .08; faceY += (pointerY - faceY) * .08;
  face.style.transform = `rotate(${-8 + faceX * 7}deg) translate(${faceX * 11}px,${faceY * 8}px)`;
  if (Math.abs(pointerX - faceX) + Math.abs(pointerY - faceY) > .005) faceFrame = requestAnimationFrame(faceTick);
}
const initial = location.hash.slice(1);
select(scenes.includes(initial) ? initial : 'hello');
for (const [selector, className] of [['[data-topic]', 'active'], ['[data-era]', 'selected'], ['[data-interest]', 'selected'], ['[data-language]', 'selected']]) {
  markChoice(selector, document.querySelector(`${selector}.${className}`), className);
}
document.querySelector('#era-range').setAttribute('aria-valuetext', '2017 to 2018, robots');
