import { createPuzzle } from './world.js';
import { profile, coursework, credentials, experiences, projects } from './content.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const ext = 'target="_blank" rel="noopener"';
const names = ['Code', 'Life', 'Practice'];
const locations = ['Outer', 'Middle', 'Inner'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduce.matches;
let engine, selected = 0, solved = [false, false, false], complete = false, panelAnimation;
let unavailable = false, announcementTimer;

function announce(text) {
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => { $('#announcement').textContent = text; }, 100);
}

function courseList(items) {
  return `<ol class="panel-list">${items.map((item, i) => `<li><span class="list-no">${String(i + 1).padStart(2, '0')}</span><div>${escape(item.title)}${item.code ? `<small>${escape(item.code)}</small>` : ''}</div></li>`).join('')}</ol>`;
}
const miniSymbol = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/></svg>';
const panels = [
  {
    kicker: 'Computation',
    title: 'From algorithms<br>to artificial intelligence.',
    intro: 'Programming, algorithms and artificial intelligence form the computational side of my degree.',
    body: courseList(coursework[0].items),
    extra: `${miniSymbol}<p><strong>And beyond the degree:</strong> CS50x, CS50P and an audited course in Python for research.</p>`,
    foot: 'University coursework · FAU',
    more: 'All studies', hash: '#studies',
  },
  {
    kicker: 'Biology & medicine',
    title: 'What happens on<br>the other side of the code?',
    intro: 'My biomedical direction connects computation with biological systems, neuroscience and medicine.',
    body: courseList(coursework[1].items),
    extra: '',
    foot: 'University coursework · FAU',
    more: 'All studies', hash: '#studies',
  },
  {
    kicker: 'In practice',
    title: 'Learn it.<br>Try it. Make it real.',
    intro: 'A lab, a team, a working prototype. Different settings ask different things of me.',
    body: `<ol class="panel-list practices">
      <li><span class="list-no">01</span><div><strong>Inside a protein-engineering lab</strong><p>A month of guided labwork for my IB Biology Extended Essay.</p><small>ICOSAGEN · LABWORK & SHADOWING</small></div></li>
      <li><span class="list-no">02</span><div><strong>Code, a robot and a team of five</strong><p>Team leadership and a gesture-control interface. Second place at Hack-A-Bot.</p><small>BEST ERLANGEN · TEAM HACKATHON · 2026</small></div></li>
      <li><span class="list-no">03</span><div><strong>Give an idea a voice</strong><p>Prototyping and pitching with EELISA; an interactive industry pitch at ZHAW.</p><small>COLLABORATIVE PROGRAMMES · 2025</small></div></li>
    </ol>`,
    extra: '',
    foot: 'Work, teams & learning by doing',
    more: 'All experience', hash: '#experience',
  },
];

function renderPanel(index, animate = true) {
  const data = panels[index];
  const panel = $('#interest-panel');
  panelAnimation?.cancel();
  panel.innerHTML = `<p class="eyebrow">${data.kicker}</p><h3>${data.title}</h3><p class="panel-intro">${data.intro}</p>${data.body}${data.extra ? `<div class="panel-minor">${data.extra}</div>` : ''}`;
  panel.setAttribute('aria-labelledby', `tab-${names[index].toLowerCase()}`);
  $('#panel-footnote').textContent = data.foot;
  $('#panel-more').innerHTML = `${data.more} <span aria-hidden="true">↗</span>`;
  $('#panel-more').href = data.hash;
  if (animate && !paused) {
    panelAnimation = panel.animate([
      { transform: 'translateY(25px) rotateX(-7deg)', clipPath: 'inset(0 0 100% 0)', opacity: .3 },
      { transform: 'translateY(0) rotateX(0)', clipPath: 'inset(0 0 0 0)', opacity: 1 },
    ], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}

function select(index, { fromEngine = false, focus = false, animate = true } = {}) {
  index = Math.max(0, Math.min(2, index));
  const changed = index !== selected;
  selected = index;
  $$('[data-select]').forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === selected));
    tab.tabIndex = i === selected ? 0 : -1;
    if (i === selected && focus) tab.focus();
  });
  $('#ring-caption').textContent = `${String(index + 1).padStart(2, '0')} / ${names[index].toUpperCase()}`;
  $('#selection-label').textContent = `${locations[index]} ring ${solved[index] ? 'connected' : 'selected'}`;
  $('#turn-left').setAttribute('aria-label', `Turn ${names[index]} ring anticlockwise`);
  $('#turn-right').setAttribute('aria-label', `Turn ${names[index]} ring clockwise`);
  if (changed || !$('#interest-panel').children.length) renderPanel(index, animate);
  updateControls();
  if (!fromEngine) engine?.select(index);
  updateFallback();
}

function updateControls() {
  $('#turn-left').disabled = solved[selected];
  $('#turn-right').disabled = solved[selected];
  $('#align').disabled = complete;
  const next = solved.findIndex(value => !value);
  $('#align').innerHTML = solved[selected] && !complete
    ? `Next: ${names[next]} <span aria-hidden="true">→</span>`
    : 'Align this ring <span aria-hidden="true">↑</span>';
  $('.ring-controls').hidden = complete;
  $('.complete-action').hidden = !complete;
}

function progress(state) {
  const oldSolved = solved.slice(), previouslyComplete = complete;
  solved = [...state.solved];
  complete = state.complete;
  const count = solved.filter(Boolean).length;
  document.body.dataset.complete = String(complete);
  document.body.dataset.phase = complete ? 'opening' : 'playing';
  $('#progress-number').textContent = count;
  $('.progress').setAttribute('aria-label', `${count} of 3 rings connected`);
  $$('[data-select]').forEach((tab, i) => {
    tab.dataset.solved = String(solved[i]);
    tab.setAttribute('aria-label', `${names[i]}${solved[i] ? ', connected' : ''}`);
  });
  $('#puzzle-title').textContent = complete ? 'It all connects.' : 'Make the connection.';
  $('#instruction').innerHTML = complete
    ? 'Three interests. One evolving picture.<span>Keep exploring — there’s more below.</span>'
    : unavailable
      ? 'Bring each gold mark to the top.<span>Use the controls to turn each ring.</span>'
      : 'Line up each opening with the top marker.<span>Drag a ring, or use the controls.</span>';
  $('#selection-label').textContent = `${locations[selected]} ring ${solved[selected] ? 'connected' : 'selected'}`;
  $('#connection-message').hidden = !complete;
  updateControls();
  updateFallback();
  if (complete && !previouslyComplete) {
    announce('All three rings connected. Explore the full picture below, or keep browsing the interests.');
    if (!paused) $('#connection-message').animate([
      { transform: 'translateY(18px)', clipPath: 'inset(0 0 100% 0)' },
      { transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
    ], { duration: 1000, delay: 500, fill: 'backwards', easing: 'cubic-bezier(.16,1,.3,1)' });
  } else {
    const newly = solved.findIndex((value, i) => value && !oldSolved[i]);
    if (newly >= 0) announce(`${names[newly]} connected. ${count} of 3. Choose another ring to continue.`);
  }
}

function updateFallback() {
  if (!unavailable || !engine) return;
  const state = engine.getState();
  $$('.fallback-ring').forEach((ring, i) => {
    ring.style.transform = `rotate(${state.targets[i]}rad)`;
    ring.dataset.selected = String(i === selected);
    ring.dataset.solved = String(solved[i]);
  });
}

function renderRecord() {
  $('#course-groups').innerHTML = coursework.map(group => `
    <section class="course-group"><header><h4>${escape(group.title)}</h4><p>${escape(group.kind)}</p></header><ul>
    ${group.items.map(item => {
      const credential = credentials.find(c => c.id === item.credentialId);
      return `<li><div>${escape(item.title)}${item.institution ? `<p class="course-detail">${escape(item.institution)} · ${escape(item.status)}${credential ? `<a href="${escape(credential.url)}" ${ext}>Certificate ↗</a>` : ''}</p>` : ''}</div>${item.code ? `<span class="course-code">${escape(item.code)}</span>` : ''}</li>`;
    }).join('')}</ul></section>`).join('');
  $('#experience-list').innerHTML = experiences.map((item, i) => `
    <details class="experience-entry" ${i === 0 ? 'open' : ''}>
      <summary><span class="entry-date">${escape(item.date || 'During IB')}</span><div><h4>${escape(item.title)}</h4><p class="entry-org">${escape(item.organisation)} · ${escape(item.type)}</p><p class="entry-role">${escape(item.contribution)}</p></div><span class="entry-plus" aria-hidden="true">+</span></summary>
      <div class="entry-body"><p>${escape(item.text)}</p><p class="entry-outcome">${escape(item.outcome)}</p></div>
    </details>`).join('');
  $('#project-list').innerHTML = projects.map(item => `
    <article class="project-entry"><div><h4>${escape(item.title)}</h4><p class="project-role">${escape(item.type)}<span>${escape(item.contribution)}</span></p><p>${escape(item.text)}</p><div class="project-tech">${item.technologies.map(escape).join(' · ')}</div></div><a class="project-link" href="${escape(item.sourceUrl || item.url)}" ${ext} aria-label="${escape(item.title)} — ${item.sourceUrl ? 'source on GitHub' : 'in my CV'}">↗</a></article>`).join('');
  $('#credential-list').innerHTML = credentials.map(item => `
    <article class="credential"><time>${escape(item.date)}</time><div><h4>${escape(item.title)}</h4><p>${escape(item.institution)} · ${escape(item.type)}</p></div><a href="${escape(item.url)}" ${ext} aria-label="Verify ${escape(item.title)}">Verify ↗</a></article>`).join('');
}

function setPaused(value) {
  paused = value;
  document.body.classList.toggle('motion-paused', paused);
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  $('#motion').title = paused ? 'Resume motion' : 'Pause motion';
  $('#motion').innerHTML = paused
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>';
  if (paused) {
    document.getAnimations().forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
  }
  engine?.setPaused(paused);
}

renderRecord();
select(0, { animate: false });
setPaused(paused);
engine = createPuzzle($('#world'), {
  onReady() { document.body.dataset.worldReady = 'true'; },
  onUnavailable() {
    unavailable = true;
    $('#fallback').hidden = false;
    $('#world').hidden = true;
    document.body.dataset.worldReady = 'fallback';
    if (!complete) $('#instruction').innerHTML = 'Bring each gold mark to the top.<span>Use the controls to turn each ring.</span>';
    queueMicrotask(updateFallback);
  },
  onSelect(index) { select(index, { fromEngine: true }); },
  onProgress: progress,
  onSettle(state) {
    document.body.dataset.phase = state.phase;
    updateFallback();
  },
});
engine.setPaused(paused);
updateFallback();

$$('[data-select]').forEach((button, index) => {
  button.addEventListener('click', () => select(index));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (selected + 1) % 3;
    if (event.key === 'ArrowLeft') next = (selected + 2) % 3;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = 2;
    if (next !== undefined) { event.preventDefault(); select(next, { focus: true }); }
  });
});
$('#turn-left').addEventListener('click', () => { engine.rotateStep(selected, -1); updateFallback(); });
$('#turn-right').addEventListener('click', () => { engine.rotateStep(selected, 1); updateFallback(); });
$('#align').addEventListener('click', () => {
  if (solved[selected]) {
    const next = solved.findIndex(value => !value);
    if (next >= 0) select(next);
  } else engine.align(selected);
  updateFallback();
});
$('#reset').addEventListener('click', () => {
  engine.reset();
  select(0);
  announce(`Puzzle reset. ${unavailable ? 'Bring the three gold marks to the top.' : 'Align the three openings with the top marker.'}`);
});
$('#motion').addEventListener('click', () => setPaused(!paused));
reduce.addEventListener('change', event => setPaused(event.matches));

// Use the same controls beside the document on desktop and directly above the
// instrument on phones. A visitor never needs to scroll between turn/select.
const phone = matchMedia('(max-width: 680px)');
const ringTabs = $('.ring-tabs');
function placeRingTabs() {
  if (phone.matches) $('.instrument-heading').after(ringTabs);
  else $('.folio-heading').after(ringTabs);
  $('.folio-heading > .eyebrow').textContent = phone.matches ? 'Inside the selected ring' : 'Follow an interest';
}
placeRingTabs();
phone.addEventListener('change', placeRingTabs);

const visibilityObserver = new IntersectionObserver(([entry]) => engine.setActive(entry.isIntersecting && !document.hidden), { rootMargin: '120px' });
visibilityObserver.observe($('#instrument'));
document.addEventListener('visibilitychange', () => {
  const bounds = $('#instrument').getBoundingClientRect();
  engine.setActive(!document.hidden && bounds.bottom > -120 && bounds.top < innerHeight + 120);
});

const recordSections = $$('.record-section');
function setRecordActive(id) {
  $$('.record-nav > a').forEach(link => {
    const active = link.hash === `#${id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
const sectionObserver = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
  if (visible.length) setRecordActive(visible[0].target.id);
}, { rootMargin: '-10% 0px -65% 0px', threshold: 0 });
recordSections.forEach(section => sectionObserver.observe(section));

// Anchors remain normal URLs. Transfer keyboard focus to the destination so a
// visitor who skips the puzzle doesn't tab back through the entire instrument.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = $(link.hash);
  if (!target) return;
  event.preventDefault();
  history.pushState(null, '', link.hash);
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: paused ? 'instant' : 'smooth', block: 'start' });
});

if (location.hash) requestAnimationFrame(() => {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  target?.scrollIntoView({ behavior: 'instant' });
});

window.addEventListener('popstate', () => {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)) || 'page-title');
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
});

// Read-only diagnostics make state transitions inspectable during local QA.
window.connectionState = () => ({ ...engine.getState(), paused, unavailable, content: { courses: coursework.flatMap(g => g.items).length, experiences: experiences.length } });
window.addEventListener('pagehide', event => {
  if (event.persisted) { engine.setActive(false); return; }
  visibilityObserver.disconnect();
  sectionObserver.disconnect();
  engine.destroy();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    const bounds = $('#instrument').getBoundingClientRect();
    engine.setActive(!document.hidden && bounds.bottom > -120 && bounds.top < innerHeight + 120);
  }
});
