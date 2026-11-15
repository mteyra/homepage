const PAGE_ORDER = ['about', 'studies', 'experience', 'projects'];
const POSE_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'scale', 'exposure'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const copyPoses = poses => poses.map(pose => ({ ...pose }));
const ease = value => value * value * (3 - 2 * value);

export function createFolio(root, { onSelect, onOverviewChange, onReady } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sheets = PAGE_ORDER.map(page => {
    const element = root.querySelector(`.folio-page[data-page="${page}"]`);
    const scroll = element?.querySelector('.page-scroll');
    const button = element?.querySelector('button.page-preview[data-open-page]');
    if (!element || !scroll || !button) throw new Error(`Missing folio sheet: ${page}`);
    const margins = [...element.querySelectorAll('.page-margin[data-grab]')].map(margin => ({
      element: margin, cursor: margin.style.cursor, touchAction: margin.style.touchAction,
    }));
    return {
      page, element, scroll, button, margins,
      before: {
        transform: element.style.transform, visibility: element.style.visibility,
        zIndex: element.style.zIndex, pointerEvents: element.style.pointerEvents,
        willChange: element.style.willChange, inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'), scrollInert: scroll.inert,
        scrollVisibility: scroll.style.visibility, buttonHidden: button.hidden,
        scale: element.style.getPropertyValue('--folio-scale'),
        exposure: element.style.getPropertyValue('--exposure'),
      },
    };
  });
  const controls = root.querySelector('.folio-overview-controls');
  const controlButtons = controls ? [...controls.querySelectorAll('button[data-folio-step]')] : [];
  const controlsBefore = controls ? { hidden: controls.hidden, disabled: controlButtons.map(button => button.disabled) } : null;
  let index = 0, overviewIndex = 0, overview = false;
  let manualPaused = false, paused = reduced.matches, destroyed = false;
  let width = Math.max(1, root.clientWidth), height = Math.max(1, root.clientHeight);
  let animation = null, press = null, frame = 0, lastDrag = 0;
  let poses = targets();
  const mobile = () => width < 700;
  const stable = () => paused || reduced.matches || document.hidden;

  function normalPose(position, selected = index, opticalShift = 0) {
    if (position === selected) {
      return { x: opticalShift, y: 0, z: position === 0 ? -12 : 0, rx: position === 0 ? 2 : 0, ry: position === 0 ? -6 : 0, rz: 0, scale: 1, exposure: 1 };
    }
    const distance = Math.abs(position - selected), side = Math.sign(position - selected);
    return { x: opticalShift + side * (10 + distance * 2), y: distance * 1.5, z: (selected === 0 ? -12 : 0) - 8 * distance, rx: selected === 0 ? 2 : 0, ry: selected === 0 ? -6 : 0, rz: 0, scale: 1, exposure: 0 };
  }
  function targets(selected = index, shownOverview = overview, focused = overviewIndex) {
    if (!shownOverview) {
      const perspective = selected === 0 ? Number.parseFloat(getComputedStyle(root).perspective) : 0;
      const opticalShift = Number.isFinite(perspective) && perspective > 0 ? -width * width * .026 / perspective : 0;
      return sheets.map((_, position) => normalPose(position, selected, opticalShift));
    }
    if (width < 700) {
      return sheets.map((_, position) => {
        const distance = position - focused;
        return { x: distance * (width * .82 + 18), y: 0, z: -Math.abs(distance) * 12, rx: 0, ry: distance ? -Math.sign(distance) * 8 : 0, rz: 0, scale: .82, exposure: distance === 0 ? 1 : 0 };
      });
    }
    const gap = 24, scale = Math.min(.24, (width - gap * 3) / (width * 4));
    return sheets.map((_, position) => ({
      x: (position - 1.5) * (width * scale + gap), y: Math.abs(position - 1.5) * 8 - 8,
      z: 0, rx: 1, ry: (1.5 - position) * 3, rz: (position - 1.5) * .35,
      scale, exposure: 1,
    }));
  }
  function interpolate(start, end, amount) {
    return start.map((pose, position) => Object.fromEntries(POSE_KEYS.map(key => [key, pose[key] + (end[position][key] - pose[key]) * amount])));
  }
  function motionParticipants(start, end, from = null, to = null) {
    const participants = new Set();
    start.forEach((pose, position) => {
      if (pose.exposure > .001 || end[position].exposure > .001) participants.add(position);
    });
    if (from !== null) participants.add(from);
    if (to !== null) participants.add(to);
    return participants;
  }
  function peel(values, amount, from, to) {
    const arc = Math.sin(Math.PI * amount), direction = Math.sign(to - from);
    if (!direction || !arc) return values;
    values[from].x -= direction * width * .30 * arc;
    values[from].z -= 180 * arc;
    values[from].ry += direction * 22 * arc;
    values[from].rx += 1.5 * arc;
    values[from].scale -= .02 * arc;
    values[to].x += direction * width * .24 * arc;
    values[to].z -= 35 * arc;
    values[to].ry -= direction * 17 * arc;
    values[to].exposure = Math.max(values[to].exposure, clamp(amount * 3, 0, 1));
    return values;
  }
  function syncAccess() {
    const focused = document.activeElement;
    sheets.forEach((sheet, position) => {
      const interactive = overview ? !mobile() || position === overviewIndex : position === index;
      const previewVisible = overview && interactive;
      if ((!interactive && sheet.element.contains(focused)) || (overview && sheet.scroll.contains(focused)) || (!previewVisible && sheet.button.contains(focused))) focused?.blur?.();
      sheet.element.inert = !interactive;
      sheet.element.setAttribute('aria-hidden', String(!interactive));
      sheet.scroll.inert = overview || !interactive;
      sheet.button.hidden = !previewVisible;
      sheet.element.style.pointerEvents = interactive ? 'auto' : 'none';
      sheet.margins.forEach(margin => {
        margin.element.style.touchAction = 'pan-y pinch-zoom';
        margin.element.style.cursor = interactive && !paused && (!overview || mobile()) ? 'grab' : 'default';
      });
      sheet.element.classList.toggle('is-active', position === index);
      sheet.element.classList.toggle('is-overview-page', overview && interactive);
    });
    if (controls) {
      const hidden = !overview || !mobile();
      if (hidden && controls.contains(focused)) focused?.blur?.();
      controls.hidden = hidden;
    }
    controlButtons.forEach(button => {
      const step = Number(button.dataset.folioStep);
      button.disabled = step < 0 ? overviewIndex === 0 : overviewIndex === sheets.length - 1;
    });
    root.classList.toggle('is-overview', overview);
  }
  function render() {
    if (destroyed) return;
    const inMotion = Boolean(animation || press?.dragging);
    const participants = animation?.participants || (press?.dragging ? motionParticipants(press.start, poses, press.position, press.neighbor) : null);
    sheets.forEach((sheet, position) => {
      const pose = poses[position];
      const visible = participants ? participants.has(position) : (overview ? !mobile() || Math.abs(position - overviewIndex) <= 1 : Math.abs(position - index) <= 1);
      sheet.element.style.visibility = visible ? 'visible' : 'hidden';
      sheet.element.style.transform = `translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,${pose.z.toFixed(3)}px) rotateX(${pose.rx.toFixed(3)}deg) rotateY(${pose.ry.toFixed(3)}deg) rotateZ(${pose.rz.toFixed(3)}deg) scale(${pose.scale.toFixed(5)})`;
      sheet.element.style.zIndex = String(overview ? 30 - Math.abs(position - overviewIndex) : position === index ? 40 : 30 - Math.abs(position - index));
      sheet.element.style.willChange = inMotion ? 'transform' : sheet.before.willChange;
      sheet.element.style.setProperty('--folio-scale', pose.scale.toFixed(5));
      sheet.element.style.setProperty('--exposure', pose.exposure.toFixed(4));
      const exposed = pose.exposure > .001;
      sheet.element.classList.toggle('is-exposed', exposed);
      sheet.scroll.style.visibility = exposed ? 'visible' : 'hidden';
    });
    root.classList.toggle('is-turning', Boolean(animation));
    root.classList.toggle('is-dragging', Boolean(press?.dragging));
  }
  function tick(now) {
    frame = 0;
    if (destroyed || !animation) return;
    if (stable()) { poses = copyPoses(animation.end); animation = null; render(); return; }
    animation.started ??= now;
    const progress = clamp((now - animation.started) / animation.duration, 0, 1);
    const amount = ease(progress);
    poses = interpolate(animation.start, animation.end, amount);
    if (animation.peel) poses = peel(poses, amount, animation.peel.from, animation.peel.to);
    if (progress === 1) { poses = copyPoses(animation.end); animation = null; }
    render();
    if (animation) frame = requestAnimationFrame(tick);
  }
  function animateTo(end, { instant = false, duration = 660, from = null, to = null } = {}) {
    cancelAnimationFrame(frame); frame = 0;
    if (instant || stable()) {
      animation = null; poses = copyPoses(end); render(); return;
    }
    const start = copyPoses(poses);
    animation = { start, end: copyPoses(end), duration, started: null, participants: motionParticipants(start, end, from, to), peel: from !== null && to !== null ? { from, to } : null };
    render();
    frame = requestAnimationFrame(tick);
  }
  function releasePress() {
    const previous = press; press = null;
    if (previous) {
      try { previous.margin.releasePointerCapture(previous.id); } catch { /* Already released. */ }
      previous.margin.style.cursor = previous.cursor;
    }
    return previous;
  }
  function goTo(page, { instant = false } = {}) {
    if (destroyed) return false;
    const next = PAGE_ORDER.indexOf(page);
    if (next < 0) return false;
    const previous = index, wasOverview = overview;
    if (next === index && !wasOverview && !press) {
      if (instant && animation) animateTo(targets(), { instant: true });
      return true;
    }
    releasePress();
    index = overviewIndex = next; overview = false;
    syncAccess();
    animateTo(targets(), { instant, from: !wasOverview && previous !== next ? previous : null, to: !wasOverview && previous !== next ? next : null });
    if (wasOverview) onOverviewChange?.(false);
    return true;
  }
  function setOverview(value) {
    if (destroyed || overview === Boolean(value)) return;
    releasePress();
    overview = Boolean(value); overviewIndex = index;
    syncAccess();
    animateTo(targets(), { duration: 580 });
    onOverviewChange?.(overview);
  }
  function stepOverview(step) {
    if (!overview || !mobile() || destroyed) return;
    const next = clamp(overviewIndex + step, 0, sheets.length - 1);
    if (next === overviewIndex) return;
    releasePress(); overviewIndex = next;
    syncAccess(); animateTo(targets(), { duration: 380 });
  }
  function pauseChanged() {
    if (destroyed) return;
    const next = reduced.matches || manualPaused;
    if (paused === next) return;
    paused = next;
    if (paused) { releasePress(); animateTo(targets(), { instant: true }); }
    syncAccess();
  }
  function setPaused(value) { manualPaused = Boolean(value); pauseChanged(); }
  function resize() {
    if (destroyed) return;
    const nextWidth = root.clientWidth, nextHeight = root.clientHeight;
    if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return;
    releasePress(); width = nextWidth; height = nextHeight;
    syncAccess(); animateTo(targets(), { instant: true });
  }
  function down(event) {
    if (destroyed || stable() || press || event.button !== 0 || event.isPrimary === false || (overview && !mobile())) return;
    const margin = event.target.closest?.('.page-margin[data-grab]');
    if (!margin || !root.contains(margin) || event.target.closest('a, button, input, textarea, select, [contenteditable]') || window.getSelection()?.toString()) return;
    const sheet = margin.closest('.folio-page');
    const position = PAGE_ORDER.indexOf(sheet?.dataset.page);
    if (position !== (overview ? overviewIndex : index)) return;
    cancelAnimationFrame(frame); frame = 0; animation = null;
    press = { id: event.pointerId, type: event.pointerType, margin, cursor: margin.style.cursor, x: event.clientX, y: event.clientY, dx: 0, position, start: copyPoses(poses), dragging: false, neighbor: position };
    try { margin.setPointerCapture(event.pointerId); } catch { /* Optional. */ }
    if (event.pointerType !== 'touch' && event.cancelable) event.preventDefault();
  }
  function move(event) {
    if (!press || event.pointerId !== press.id || destroyed) return;
    const dx = event.clientX - press.x, dy = event.clientY - press.y;
    if (press.type === 'touch' && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.1) { cancelDrag(); return; }
    if (!press.dragging && (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(dy))) return;
    press.dragging = true; press.dx = dx;
    press.margin.style.cursor = 'grabbing';
    if (event.cancelable) event.preventDefault();
    const neighbor = clamp(press.position - Math.sign(dx), 0, sheets.length - 1);
    press.neighbor = neighbor;
    if (neighbor === press.position) {
      poses = copyPoses(press.start);
      poses[press.position].x += dx * .12;
    } else {
      const amount = clamp(Math.abs(dx) / (width * .55), 0, 1);
      const end = overview ? targets(index, true, neighbor) : targets(neighbor, false, neighbor);
      poses = interpolate(press.start, end, amount);
      if (!overview) poses = peel(poses, amount, press.position, neighbor);
    }
    render();
  }
  function up(event) {
    if (!press || event.pointerId !== press.id) return;
    const previous = releasePress();
    const commit = previous.dragging && Math.abs(previous.dx) >= width * .15 && previous.neighbor !== previous.position;
    if (previous.dragging) lastDrag = performance.now();
    if (commit) {
      if (overview) overviewIndex = previous.neighbor;
      else index = overviewIndex = previous.neighbor;
      syncAccess();
    }
    animateTo(targets(), { duration: commit ? 380 : 320 });
    if (commit && !overview) onSelect?.(PAGE_ORDER[index]);
  }
  function cancelDrag() {
    if (!press) return;
    releasePress(); animateTo(targets(), { duration: 300 });
  }
  function click(event) {
    const step = event.target.closest?.('button[data-folio-step]');
    if (step && root.contains(step)) { stepOverview(Number(step.dataset.folioStep)); return; }
    const preview = event.target.closest?.('button.page-preview[data-open-page]');
    if (!preview || !root.contains(preview) || !overview) return;
    if (performance.now() - lastDrag < 200) { event.preventDefault(); return; }
    const page = preview.dataset.openPage;
    if (goTo(page)) onSelect?.(page);
  }
  function visibilityChanged() {
    if (!document.hidden || destroyed) return;
    releasePress();
    animateTo(targets(), { instant: true });
  }
  function getState() {
    return {
      page: PAGE_ORDER[index], index, overview, overviewIndex, mobile: mobile(),
      dragging: Boolean(press?.dragging), animating: Boolean(animation), paused, destroyed,
      width, height, poses: poses.map((pose, position) => ({ page: PAGE_ORDER[position], ...pose })),
    };
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; releasePress(); cancelAnimationFrame(frame); frame = 0; animation = null;
    observer?.disconnect();
    for (const [type, handler] of listeners) root.removeEventListener(type, handler);
    window.removeEventListener('blur', cancelDrag);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibilityChanged);
    reduced.removeEventListener('change', pauseChanged);
    sheets.forEach(({ element, scroll, button, margins, before }) => {
      for (const property of ['transform', 'visibility', 'zIndex', 'pointerEvents', 'willChange']) element.style[property] = before[property];
      element.inert = before.inert;
      if (before.ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', before.ariaHidden);
      scroll.inert = before.scrollInert; scroll.style.visibility = before.scrollVisibility;
      button.hidden = before.buttonHidden;
      margins.forEach(margin => { margin.element.style.cursor = margin.cursor; margin.element.style.touchAction = margin.touchAction; });
      for (const [name, value] of [['--folio-scale', before.scale], ['--exposure', before.exposure]]) {
        if (value) element.style.setProperty(name, value); else element.style.removeProperty(name);
      }
      element.classList.remove('is-active', 'is-overview-page', 'is-exposed');
    });
    if (controls) {
      controls.hidden = controlsBefore.hidden;
      controlButtons.forEach((button, position) => { button.disabled = controlsBefore.disabled[position]; });
    }
    root.classList.remove('is-overview', 'is-turning', 'is-dragging');
  }

  const listeners = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancelDrag], ['lostpointercapture', cancelDrag], ['click', click]];
  for (const [type, handler] of listeners) root.addEventListener(type, handler);
  window.addEventListener('blur', cancelDrag);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', visibilityChanged);
  reduced.addEventListener('change', pauseChanged);
  const observer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  observer?.observe(root);
  syncAccess(); render();
  if (!stable()) {
    poses = poses.map(pose => ({ ...pose, x: pose.x - width * .01, z: pose.z - 18, rx: pose.rx + 1, ry: pose.ry - 3 }));
    animateTo(targets(), { duration: 680 });
  }
  queueMicrotask(() => { if (!destroyed) onReady?.(); });
  return { goTo, setOverview, setPaused, resize, destroy, getState };
}
