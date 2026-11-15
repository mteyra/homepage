import { profile } from '../../assets/content.js';

const names = ['now', 'study', 'experience', 'roots', 'making'];
const descriptions = [
  ['THE PRESENT', 'NOW', 'A starting point,\nnot a finished story.'],
  ['LEARNING & DIRECTION', 'STUDY', 'Learning to connect\ncomputation and biology.'],
  ['EXPERIENCE & EXPOSURE', 'EXPERIENCE', 'Knowledge, grounded\nin the physical world.'],
  ['PLACES & PERSPECTIVES', 'ROOTS', 'More than one place.\nMore than one perspective.'],
  ['IDEAS & EXPERIMENTS', 'MAKING', 'A thought, then a tool.\nSomething you can use.'],
];
const $ = s => document.querySelector(s);
const links = [...document.querySelectorAll('.chapter-navigation a')];
const chapters = [...document.querySelectorAll('.chapter')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches, active = 0, world = null, reader = false;

for (const item of profile.credentials) {
  const a = document.createElement('a');
  a.className = 'credential'; a.href = item.url; a.target = '_blank'; a.rel = 'noopener';
  a.textContent = item.title + ' ↗';
  const small = document.createElement('small'); small.textContent = item.institution; a.append(small);
  $('#credentials').append(a);
}
for (const item of profile.languages) {
  const div = document.createElement('div'); div.className = 'language';
  const strong = document.createElement('strong'); strong.textContent = item.name;
  const small = document.createElement('small'); small.textContent = item.level;
  div.append(strong, small); $('#languages').append(div);
}

function route({ focus = false } = {}) {
  const n = names.indexOf(location.hash.slice(1));
  active = Math.max(0, n);
  chapters.forEach((article, i) => {
    article.classList.toggle('is-active', i === active);
    article.setAttribute('aria-hidden', String(!reader && i !== active));
  });
  links.forEach((a, i) => i === active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  $('#instrument-index').textContent = String(active + 1).padStart(2, '0') + ' / 05';
  $('#instrument-topic').textContent = descriptions[active][0];
  $('#dial-name').textContent = descriptions[active][1];
  $('#dial-caption').replaceChildren(...descriptions[active][2].split('\n').flatMap((line, i) => i ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)]));
  document.body.dataset.chapter = names[active];
  world?.select(active);
  if (focus) {
    $('#announcer').textContent = descriptions[active][0] + '. Profile section updated.';
    if (innerWidth <= 780 && !reader) $('#chapters').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
  }
}
window.addEventListener('hashchange', () => route({ focus: true }));
// Keep route changes under our control so the browser does not jump to an
// article before its hidden state has been updated.
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a || !names.includes(a.hash.slice(1))) return;
  e.preventDefault();
  if (location.hash === a.hash) route({ focus: true });
  else { history.pushState(null, '', a.hash); route({ focus: true }); }
});
window.addEventListener('popstate', () => route());
$('.chapter-navigation').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? 4 : (active + (e.key === 'ArrowRight' ? 1 : 4)) % 5;
  links[next].click(); links[next].focus({ preventScroll: true });
});
function applyMotion() {
  document.body.classList.toggle('motion-paused', paused);
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  $('#motion-toggle').innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span> ${paused ? 'Play motion' : 'Pause motion'}`;
  world?.setPaused(paused);
}
$('#motion-toggle').addEventListener('click', () => { paused = !paused; applyMotion(); });
reduced.addEventListener('change', e => { paused = e.matches; applyMotion(); });
$('#reset-view').addEventListener('click', () => world?.reset());
$('#reader-toggle').addEventListener('click', () => {
  reader = !reader; document.documentElement.classList.toggle('reader', reader);
  $('#reader-toggle').setAttribute('aria-pressed', String(reader));
  $('#reader-toggle').innerHTML = reader ? 'Return to the orbit ↗' : 'Read everything ↗';
  world?.setActive(!reader && !document.hidden); route();
  $('#chapters').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
});
document.addEventListener('visibilitychange', () => world?.setActive(!document.hidden && !reader));
route(); applyMotion();
import('./world.js').then(({ createObservatory }) => {
  world = createObservatory($('#world'), {
    onReady: () => document.body.classList.add('world-ready'),
    onUnavailable: () => { $('#interaction-hint').textContent = 'EXPLORE WITH THE FIVE CHAPTERS BELOW'; $('#reset-view').hidden = true; $('#motion-toggle').hidden = true; },
    onSelect: i => { history.pushState(null, '', '#' + names[i]); route({ focus: true }); },
  });
  world?.select(active); world?.setPaused(paused);
}).catch(() => {
  $('#interaction-hint').textContent = 'EXPLORE WITH THE FIVE CHAPTERS BELOW';
  $('#reset-view').hidden = true; $('#motion-toggle').hidden = true;
});
