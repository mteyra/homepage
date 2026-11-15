import * as THREE from '../assets/vendor/three.module.js';

// A small physical puzzle, with one authoritative state for WebGL and the
// accompanying HTML controls. Angles are clockwise-positive, in radians.
const TAU = Math.PI * 2;
const STEP = TAU / 12;
const START = [1, -2, 1];
const NAMES = ['Code', 'Life', 'Practice'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const magnetic = t => 1 + 1.65 * Math.pow(t - 1, 3) + .65 * Math.pow(t - 1, 2);
const northAngle = a => Math.round(a / TAU) * TAU;
const aligned = a => Math.abs(a - northAngle(a)) < .0001;

export function createPuzzle(canvas, {
  onReady, onUnavailable, onSelect, onProgress, onSettle,
} = {}) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const rings = START.map(step => ({
    angle: step * STEP, target: step * STEP, solved: false,
    tween: null, pulse: -Infinity,
  }));
  let selected = 0, complete = false, phase = 'playing';
  let paused = reduced?.matches ?? false, active = true, destroyed = false;
  let expansion = 0, opening = null, raf = 0, clockTimer = 0;
  let pendingSettle = false, generation = 0, graphics = null;
  let pointerDrag = null, ready = false, unavailable = false, progressEmitted = false;
  const previousTouchAction = canvas.style.touchAction;
  const previousCursor = canvas.style.cursor;
  const previousTabindex = canvas.getAttribute('tabindex');
  const previousLabel = canvas.getAttribute('aria-label');
  const previousRole = canvas.getAttribute('role');
  // Touch gestures belong to this bounded instrument canvas; the rest of the
  // page retains ordinary vertical scrolling. HTML controls provide an equally
  // direct route for visitors who do not want to drag.
  canvas.style.touchAction = 'none';
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  if (!previousRole) canvas.setAttribute('role', 'group');
  if (!previousLabel) canvas.setAttribute('aria-label', 'Three alignment rings. Drag a ring, or use left and right arrows to turn it. Up and down select a ring; Enter aligns it.');

  function getState() {
    return {
      selected, solved: rings.map(r => r.solved), complete, phase, paused,
      angles: rings.map(r => r.angle),
      targets: rings.map(r => r.target),
      steps: rings.map(r => {
        const step = Math.round(r.target / STEP);
        return ((step + 6) % 12 + 12) % 12 - 6;
      }),
    };
  }
  function valid(i) { return Number.isInteger(i) && i >= 0 && i < 3; }
  function progress() {
    progressEmitted = true;
    onProgress?.({ solved: rings.map(r => r.solved), complete });
  }
  function failGraphics() {
    if (unavailable || destroyed) return;
    unavailable = true;
    queueMicrotask(() => { if (!destroyed) onUnavailable?.(); });
  }
  function solvedRing(i, now) {
    const ring = rings[i];
    if (ring.solved || !aligned(ring.angle)) return;
    ring.angle = ring.target = northAngle(ring.angle);
    ring.solved = true;
    ring.pulse = paused ? -Infinity : now;
    if (rings.every(r => r.solved)) {
      complete = true;
      phase = 'opening';
      // First let the last pulse reach the hub, then physically unfold.
      opening = { from: expansion, to: 1, start: now + (paused ? 0 : 360), duration: 2300 };
    }
    progress();
  }
  function advance(now, instant = false) {
    const currentGeneration = generation;
    rings.forEach((ring, i) => {
      if (!ring.tween || generation !== currentGeneration) return;
      const tween = ring.tween;
      const t = instant ? 1 : clamp((now - tween.start) / tween.duration, 0, 1);
      ring.angle = tween.from + (tween.to - tween.from) * magnetic(t);
      if (t === 1) {
        ring.angle = ring.target = tween.to;
        ring.tween = null;
        if (phase !== 'resetting') solvedRing(i, now);
      }
    });
    if (opening) {
      const motion = opening;
      const t = instant ? 1 : clamp((now - motion.start) / motion.duration, 0, 1);
      expansion = motion.from + (motion.to - motion.from) * ease(t);
      if (t === 1) {
        expansion = motion.to;
        opening = null;
        phase = expansion === 1 ? 'open' : 'playing';
      }
    }
    if (phase === 'resetting' && !opening && !rings.some(r => r.tween)) phase = 'playing';
    const moving = Boolean(opening || rings.some(r => r.tween));
    if (!moving && pendingSettle && !pointerDrag) {
      pendingSettle = false;
      onSettle?.(getState());
    }
    return moving || (!paused && rings.some(r => now - r.pulse < 1000));
  }
  function draw(now = performance.now()) {
    if (destroyed || unavailable || !graphics) return;
    try { graphics.draw(now); } catch { failGraphics(); }
  }
  function scheduleBackgroundSettle() {
    clearTimeout(clockTimer);
    if (destroyed || paused) return;
    const deadlines = rings.filter(r => r.tween).map(r => r.tween.start + r.tween.duration);
    if (opening) deadlines.push(opening.start + opening.duration);
    if (!deadlines.length) return;
    clockTimer = setTimeout(() => {
      clockTimer = 0;
      const now = performance.now();
      advance(now);
      if (active && !document.hidden) draw(now);
      scheduleBackgroundSettle();
    }, Math.max(16, Math.min(...deadlines) - performance.now() + 2));
  }
  function tick(now) {
    raf = 0;
    if (destroyed || paused || !active || document.hidden) return;
    const moving = advance(now);
    draw(now);
    if (moving || pointerDrag) raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (destroyed) return;
    const now = performance.now();
    if (paused) {
      advance(now, true);
      draw(now);
    } else {
      if (active && !document.hidden && !raf) raf = requestAnimationFrame(tick);
      scheduleBackgroundSettle();
    }
  }
  function select(i) {
    if (destroyed || !valid(i)) return false;
    selected = i;
    draw();
    return true;
  }
  function moveRing(i, target, duration = 520) {
    if (destroyed || !valid(i) || rings[i].solved || phase === 'resetting') return false;
    const now = performance.now();
    advance(now);
    const ring = rings[i];
    if (ring.solved || phase === 'resetting') return false;
    ring.target = target;
    ring.tween = { from: ring.angle, to: target, start: now, duration };
    pendingSettle = true;
    wake();
    return true;
  }
  function rotateStep(i, dir = 1) {
    if (!valid(i) || !Number.isFinite(dir) || dir === 0) return false;
    return moveRing(i, (Math.round(rings[i].target / STEP) + Math.sign(dir)) * STEP);
  }
  function align(i) {
    if (!valid(i)) return false;
    return moveRing(i, northAngle(rings[i].angle), 640);
  }
  function cancelDrag() {
    if (!pointerDrag) return;
    try { canvas.releasePointerCapture(pointerDrag.id); } catch { /* Already released. */ }
    pointerDrag = null;
    canvas.classList.remove('is-dragging');
    canvas.style.cursor = 'grab';
  }
  function reset() {
    if (destroyed) return;
    cancelDrag();
    generation++;
    const now = performance.now();
    selected = 0;
    complete = false;
    phase = 'resetting';
    rings.forEach((ring, i) => {
      ring.solved = false;
      ring.pulse = -Infinity;
      // Choose the equivalent start angle nearest the current ring position.
      const base = START[i] * STEP;
      const target = base + Math.round((ring.angle - base) / TAU) * TAU;
      ring.target = target;
      ring.tween = { from: ring.angle, to: target, start: now, duration: expansion > .01 ? 1350 : 700 };
    });
    opening = { from: expansion, to: 0, start: now, duration: 1500 };
    pendingSettle = true;
    progress();
    onSelect?.(0);
    wake();
  }
  function setPaused(value) {
    paused = Boolean(value);
    if (paused) {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(clockTimer); clockTimer = 0;
      const now = performance.now();
      advance(now, true);
      rings.forEach(r => { r.pulse = -Infinity; });
      draw(now);
    } else wake();
  }
  function setActive(value) {
    active = Boolean(value);
    if (!active) { cancelAnimationFrame(raf); raf = 0; }
    else { advance(performance.now()); draw(); wake(); }
    scheduleBackgroundSettle();
  }
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (active) { advance(performance.now()); draw(); wake(); }
  }
  function keyboard(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); rotateStep(selected, event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      select((selected + (event.key === 'ArrowDown' ? 1 : 2)) % 3);
      onSelect?.(selected);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); align(selected);
    }
  }
  function down(event) {
    if (destroyed || unavailable || !graphics || event.button !== 0 || pointerDrag) return;
    const hit = graphics.hit(event.clientX, event.clientY);
    if (hit === null) return;
    canvas.focus({ preventScroll: true });
    select(hit); onSelect?.(hit);
    if (rings[hit].solved || phase === 'resetting') return;
    advance(performance.now());
    const angle = graphics.pointerAngle(event.clientX, event.clientY, hit);
    if (angle === null) return;
    rings[hit].tween = null;
    rings[hit].target = rings[hit].angle;
    pointerDrag = { id: event.pointerId, index: hit, angle, x: event.clientX, y: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    canvas.style.cursor = 'grabbing';
    event.preventDefault();
    wake();
  }
  function move(event) {
    if (!graphics || unavailable) return;
    if (!pointerDrag) {
      const hit = graphics.hit(event.clientX, event.clientY);
      canvas.style.cursor = hit === null ? 'default' : rings[hit].solved ? 'pointer' : 'grab';
      return;
    }
    if (event.pointerId !== pointerDrag.id) return;
    const drag = pointerDrag;
    const angle = graphics.pointerAngle(event.clientX, event.clientY, drag.index);
    if (angle === null) return;
    let delta = angle - drag.angle;
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;
    const ring = rings[drag.index];
    ring.angle -= delta;
    ring.target = ring.angle;
    drag.angle = angle;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
    draw();
    event.preventDefault();
  }
  function up(event) {
    if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
    const i = pointerDrag.index;
    cancelDrag();
    moveRing(i, Math.round(rings[i].angle / STEP) * STEP, 440);
  }
  function contextLost(event) {
    event.preventDefault();
    cancelDrag();
    failGraphics();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelDrag();
    cancelAnimationFrame(raf); clearTimeout(clockTimer);
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('keydown', keyboard);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('lostpointercapture', up);
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.style.touchAction = previousTouchAction;
    canvas.style.cursor = previousCursor;
    for (const [name, value] of [['tabindex', previousTabindex], ['aria-label', previousLabel], ['role', previousRole]]) {
      if (value === null) canvas.removeAttribute(name); else canvas.setAttribute(name, value);
    }
    graphics?.destroy();
  }

  // Rendering is optional. The same puzzle controller remains fully functional
  // when WebGL is unavailable, so the accessible HTML controls never dead-end.
  try {
    graphics = buildInstrument(canvas, rings, () => ({ selected, expansion }), () => draw());
    draw();
    ready = true;
  } catch { failGraphics(); }
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('keydown', keyboard);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('webglcontextlost', contextLost);
  queueMicrotask(() => {
    if (destroyed) return;
    if (!progressEmitted) progress();
    if (ready && !unavailable) onReady?.();
  });

  return { align, rotateStep, select, reset, setPaused, setActive, destroy, getState };
}

function buildInstrument(canvas, rings, state, invalidate) {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x0c1015, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
  const instrument = new THREE.Group();
  instrument.rotation.set(.30, -.23, 0);
  scene.add(instrument);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const faces = [], pickable = [], linkages = [];
  let width = 1, height = 1, baseDistance = 13.1, disposed = false;
  const metal = params => {
    const m = new THREE.MeshStandardMaterial(params); materials.add(m); return m;
  };
  const basic = params => {
    const m = new THREE.MeshBasicMaterial(params); materials.add(m); return m;
  };
  const steel = metal({ color: 0x6f8994, metalness: .9, roughness: .27 });
  const darkSteel = metal({ color: 0x243842, metalness: .88, roughness: .3 });
  const brass = metal({ color: 0xb99a5e, metalness: .84, roughness: .31 });
  const dark = metal({ color: 0x233b48, metalness: .68, roughness: .34 });
  const blue = basic({ color: 0x8bdbf3, toneMapped: false });
  const faintBlue = basic({ color: 0x426e7d, toneMapped: false });
  const labelInk = '#d5e1e2';

  function mesh(geometry, material, parent = instrument) {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    parent.add(object);
    return object;
  }
  function torus(radius, tube, material, parent = instrument, arc = TAU) {
    return mesh(new THREE.TorusGeometry(radius, tube, 7, Math.ceil(120 * arc / TAU), arc), material, parent);
  }
  function segment(inner, outer, start, end, depth = .12) {
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
    shape.absarc(0, 0, outer, start, end, false);
    shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
    shape.absarc(0, 0, inner, end, start, true);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: true, bevelSize: .018,
      bevelThickness: .022, bevelSegments: 2, curveSegments: 70,
    });
  }
  function lines(points, color, opacity = 1, parent = instrument) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    geometries.add(geometry); materials.add(material);
    const object = new THREE.LineSegments(geometry, material); parent.add(object); return object;
  }
  function textureFromCanvas(c) {
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(texture); return texture;
  }
  function label(text, sub, parent, w = 1.2, h = .34) {
    const c = document.createElement('canvas'); c.width = 768; c.height = 192;
    const ctx = c.getContext('2d');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = labelInk;
    ctx.font = '500 81px sans-serif'; ctx.fillText(text, 384, 74);
    ctx.font = '21px monospace'; ctx.fillStyle = '#9caeaf'; ctx.fillText(sub, 384, 146);
    return mesh(new THREE.PlaneGeometry(w, h), basic({
      map: textureFromCanvas(c), transparent: true, depthWrite: false, toneMapped: false,
    }), parent);
  }

  // Broad photographic softboxes, baked once into a small environment map.
  // No downloaded HDR, screen-space bloom, shadow map, or perpetual render loop.
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0x111c22);
  for (const [x, y, z, w, h, color] of [
    [-4, 3, 2, 2.3, 7, 0xb4d6e6], [4, 0, 2, 2.3, 6, 0x688c9c],
    [0, 5, -1, 7, 2, 0xd9ded9], [0, -5, 2, 5, 1.5, 0x9c784d],
    [-1, 1, 5, .6, 5, 0xe6f1f2],
  ]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    p.position.set(x, y, z); p.lookAt(0, 0, 0); studio.add(p);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .04, .1, 30, { size: 128 });
  scene.environment = environment.texture;
  pmrem.dispose();
  studio.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  scene.add(new THREE.HemisphereLight(0xb6d5e3, 0x121916, 2.3));
  for (const [color, intensity, x, y, z] of [
    [0xe0f4ff, 4.1, -3, 7, 8], [0x658ea6, 3.6, 7, -1, 5],
    [0xc89c62, 3.6, -4, -3, 2], [0x98c6da, 3.1, 0, 5, -3],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z); scene.add(light);
  }

  const chassis = new THREE.Group(); instrument.add(chassis);
  torus(3.32, .047, darkSteel, chassis).position.z = -.15;
  torus(3.36, .009, brass, chassis).position.z = -.12;
  torus(3.23, .017, steel, chassis).position.z = -.22;
  const ticks = [];
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * TAU;
    const r = i % 10 === 0 ? 3.38 : i % 5 === 0 ? 3.40 : 3.43;
    ticks.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -.15));
    ticks.push(new THREE.Vector3(Math.cos(a) * 3.47, Math.sin(a) * 3.47, -.15));
  }
  lines(ticks, 0x79939b, .54, chassis);
  // The same fixed twelve-o'clock marker remains in view throughout play.
  const marker = mesh(new THREE.ConeGeometry(.084, .24, 3), brass, chassis);
  marker.position.set(0, 3.63, -.04); marker.rotation.z = Math.PI;
  const markerLight = mesh(new THREE.BoxGeometry(.043, .20, .023), blue, chassis);
  markerLight.position.set(0, 3.37, .07);
  const northRail = mesh(new THREE.BoxGeometry(.018, 2.42, .014), faintBlue, chassis);
  northRail.position.set(0, 2.02, -.09);
  const fixedLabel = label('ALIGN', 'TWELVE O’CLOCK', chassis, .70, .21);
  fixedLabel.position.set(.57, 3.47, -.10);

  const dimensions = [[2.66, 3.15], [1.86, 2.48], [1.07, 1.68]];
  const gap = .15;
  dimensions.forEach(([inner, outer], i) => {
    const layer = new THREE.Group(); instrument.add(layer);
    const rotor = new THREE.Group(); layer.add(rotor);
    const face = metal({
      color: [0x8a9da3, 0x72909a, 0x8d9a9a][i], metalness: .88,
      roughness: .29, emissive: 0x091118, emissiveIntensity: .18,
    });
    const plate = mesh(segment(inner, outer, Math.PI / 2 + gap, Math.PI / 2 + TAU - gap, .24), [face, darkSteel], rotor);
    // Keep the working surface at the same depth while extending a substantial
    // machined side wall behind it, especially visible beside each cut-out.
    plate.position.z = -.12;
    plate.userData.ring = i; pickable.push(plate);
    const channel = mesh(segment(inner + .092, outer - .092, Math.PI / 2 + gap + .014, Math.PI / 2 + TAU - gap - .014, .012), dark, rotor);
    channel.position.z = .142;
    channel.userData.ring = i; pickable.push(channel);
    const smokedGlass = new THREE.MeshPhysicalMaterial({
      color: 0x284450, metalness: .66, roughness: .14, clearcoat: 1,
      clearcoatRoughness: .10, transparent: true, opacity: .56,
    });
    materials.add(smokedGlass);
    const glazing = mesh(segment(inner + .112, outer - .112, Math.PI / 2 + gap + .025, Math.PI / 2 + TAU - gap - .025, .004), smokedGlass, rotor);
    glazing.position.z = .159;
    const traceMaterial = basic({ color: 0x7a989f, toneMapped: false });
    const trace = torus(inner + .048, .009, traceMaterial, rotor, TAU - gap * 2);
    trace.rotation.z = Math.PI / 2 + gap; trace.position.z = .16;
    const gold = torus(outer - .045, .010, brass, rotor, TAU - gap * 2);
    gold.rotation.z = Math.PI / 2 + gap; gold.position.z = .16;
    // Fine circumferential grooves create a restrained brushed-metal finish.
    for (const radius of [inner + .028, inner + .075, outer - .075, outer - .025]) {
      const groove = torus(radius, .0028, darkSteel, rotor, TAU - gap * 2);
      groove.rotation.z = Math.PI / 2 + gap; groove.position.z = .153;
    }
    const mid = (inner + outer) / 2;
    for (const side of [-1, 1]) {
      const end = mesh(new THREE.BoxGeometry(.042, outer - inner - .04, .034), brass, rotor);
      const angle = Math.PI / 2 + side * (gap + .018);
      end.position.set(Math.cos(angle) * mid, Math.sin(angle) * mid, .17);
      end.rotation.z = angle - Math.PI / 2;
      const lamp = mesh(new THREE.BoxGeometry(.035, outer - inner - .12, .012), blue, rotor);
      const at = Math.PI / 2 + side * (gap + .048);
      lamp.position.set(Math.cos(at) * mid, Math.sin(at) * mid, .177);
      lamp.rotation.z = at - Math.PI / 2;
    }
    // One notch, visibly interrupted track, and a short arrow pointing through
    // it. These move with the ring; the external north marker does not.
    const needle = mesh(new THREE.ConeGeometry(.044, .13, 3), blue, rotor);
    needle.position.set(0, inner - .035, .13);
    const lockMaterial = basic({ color: 0xa6eaff, toneMapped: false });
    const lock = mesh(new THREE.BoxGeometry(mid * gap * 1.75, .022, .022), lockMaterial, rotor);
    lock.position.set(0, mid, .17); lock.visible = false;
    const title = label(NAMES[i].toUpperCase(), `0${i + 1}  /  12 POSITIONS`, rotor, [1.18, 1.13, 1.04][i], [.29, .30, .30][i]);
    title.position.set(0, -mid, .212);
    const marks = [];
    for (let n = 1; n < 12; n++) {
      const a = Math.PI / 2 + n * STEP;
      // Leave a clear engraved label area along the lower face.
      if (n === 5 || n === 6 || n === 7) continue;
      for (const radius of [inner + .13, outer - .13]) {
        marks.push(new THREE.Vector3(Math.cos(a) * (radius - .032), Math.sin(a) * (radius - .032), .211));
        marks.push(new THREE.Vector3(Math.cos(a) * (radius + .032), Math.sin(a) * (radius + .032), .211));
      }
    }
    lines(marks, 0xacc1c4, .68, rotor);
    faces.push({ layer, rotor, face, traceMaterial, lock, base: face.color.clone(), inner, outer });
  });

  // The hub stays physically continuous with the unlocked, expanded assembly.
  const core = new THREE.Group(); instrument.add(core);
  const hub = mesh(new THREE.CylinderGeometry(.81, .81, .24, 72), darkSteel, core);
  hub.rotation.x = Math.PI / 2; hub.position.z = .20;
  torus(.81, .022, brass, core).position.z = .335;
  torus(.70, .008, steel, core).position.z = .35;
  const hubGlass = new THREE.MeshPhysicalMaterial({ color: 0x233a44, metalness: .55, roughness: .12, clearcoat: 1, clearcoatRoughness: .10 });
  materials.add(hubGlass);
  const dome = mesh(new THREE.SphereGeometry(.69, 40, 20), hubGlass, core);
  dome.scale.z = .18; dome.position.z = .32;
  const emblem = document.createElement('canvas'); emblem.width = emblem.height = 512;
  const ec = emblem.getContext('2d');
  ec.strokeStyle = '#e0ddd1'; ec.lineWidth = 4; ec.lineJoin = 'round'; ec.lineCap = 'round';
  ec.beginPath(); ec.moveTo(128, 296); ec.lineTo(128, 171); ec.lineTo(256, 281); ec.lineTo(384, 171); ec.lineTo(384, 296);
  ec.moveTo(256, 281); ec.lineTo(256, 370); ec.stroke();
  ec.font = '23px monospace'; ec.fillStyle = '#97b9c1'; ec.textAlign = 'center'; ec.fillText('MARC TEYRA', 256, 424);
  const monogram = mesh(new THREE.PlaneGeometry(1.07, 1.07), basic({ map: textureFromCanvas(emblem), transparent: true, depthWrite: false, toneMapped: false }), core);
  monogram.position.z = .455;
  const coreLightMaterial = basic({ color: 0x8dd9f1, transparent: true, opacity: .35, toneMapped: false });
  torus(.89, .012, coreLightMaterial, core).position.z = .19;

  // Three small telescopic shafts appear as the real layers lift. Each remains
  // attached to its ring, so the finale reads as the same assembly opening.
  for (let i = 0; i < 3; i++) {
    const sleeve = mesh(new THREE.CylinderGeometry(.043, .043, 1, 12), darkSteel, instrument);
    const piston = mesh(new THREE.CylinderGeometry(.021, .021, 1, 12), brass, instrument);
    const cap = mesh(new THREE.SphereGeometry(.055, 12, 8), steel, instrument);
    linkages.push({ sleeve, piston, cap, local: new THREE.Vector3(-.65, -.40, 0), index: i });
  }
  const pulseCanvas = document.createElement('canvas'); pulseCanvas.width = pulseCanvas.height = 96;
  const pc = pulseCanvas.getContext('2d'), gradient = pc.createRadialGradient(48, 48, 0, 48, 48, 47);
  gradient.addColorStop(0, 'rgba(222,251,255,1)'); gradient.addColorStop(.14, 'rgba(144,221,255,.9)');
  gradient.addColorStop(.4, 'rgba(79,169,210,.2)'); gradient.addColorStop(1, 'rgba(62,139,191,0)');
  pc.fillStyle = gradient; pc.fillRect(0, 0, 96, 96);
  const pulseMap = textureFromCanvas(pulseCanvas);
  const pulses = rings.map(() => {
    const material = new THREE.SpriteMaterial({ map: pulseMap, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    materials.add(material);
    const sprite = new THREE.Sprite(material); sprite.scale.set(.4, .4, .4); instrument.add(sprite); return sprite;
  });
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext('2d'), sg = sc.createRadialGradient(64, 64, 5, 64, 64, 63);
  sg.addColorStop(0, 'rgba(0,0,0,.5)'); sg.addColorStop(.6, 'rgba(0,0,0,.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
  const shadow = mesh(new THREE.PlaneGeometry(9, 8), basic({ map: textureFromCanvas(shadowCanvas), transparent: true, depthWrite: false }), scene);
  shadow.position.set(.30, -.50, -2.2);

  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const intersection = new THREE.Vector3(), normal = new THREE.Vector3(), origin = new THREE.Vector3();
  const plane = new THREE.Plane(), connectorAxis = new THREE.Vector3(0, 1, 0);
  const endpoint = new THREE.Vector3(), startpoint = new THREE.Vector3(), direction = new THREE.Vector3();
  function cast(x, y) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }
  function hit(x, y) {
    cast(x, y);
    const result = raycaster.intersectObjects(pickable, false);
    return result.length ? result[0].object.userData.ring : null;
  }
  function pointerAngle(x, y, index) {
    const layer = faces[index].layer;
    layer.updateWorldMatrix(true, false);
    normal.set(0, 0, 1).transformDirection(layer.matrixWorld);
    origin.set(0, 0, .14).applyMatrix4(layer.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, origin);
    cast(x, y);
    if (!raycaster.ray.intersectPlane(plane, intersection)) return null;
    const local = layer.worldToLocal(intersection);
    return Math.atan2(local.y, local.x);
  }
  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    baseDistance = Math.max(13.1, 3.85 / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect));
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  resize();

  function connect(cylinder, start, end, radiusScale = 1) {
    direction.subVectors(end, start);
    cylinder.position.copy(start).add(end).multiplyScalar(.5);
    cylinder.scale.set(radiusScale, Math.max(.001, direction.length()), radiusScale);
    cylinder.quaternion.setFromUnitVectors(connectorAxis, direction.normalize());
  }
  function draw(now) {
    if (disposed) return;
    const { selected, expansion } = state();
    camera.position.set(-.16 * expansion, .12 + .52 * expansion, baseDistance * (1 + .16 * expansion));
    camera.lookAt(.06 * expansion, .12 * expansion, .15 * expansion);
    instrument.rotation.set(.30 + expansion * .10, -.23 - expansion * .13, expansion * -.035);
    faces.forEach((face, i) => {
      const t = ease(clamp(expansion * 1.30 - i * .13, 0, 1));
      const lift = [0, .93, 1.91][i] * t;
      face.layer.position.set([-.06, .23, .53][i] * t, [.03, .85, 1.80][i] * t, i * .024 + lift);
      face.layer.rotation.set([-.10, -.57, -1.01][i] * t, [.06, .18, -.10][i] * t, [0, .025, -.035][i] * t);
      face.rotor.rotation.z = -rings[i].angle;
      const brightness = rings[i].solved ? 1.10 : i === selected ? 1.16 : .77;
      face.face.color.copy(face.base).multiplyScalar(brightness);
      face.face.emissiveIntensity = i === selected && !rings[i].solved ? .35 : .11;
      face.traceMaterial.color.setHex(rings[i].solved ? 0x9addf3 : i === selected ? 0x7faab6 : 0x405b64);
      face.lock.visible = rings[i].solved;
      const p = clamp((now - rings[i].pulse) / 870, 0, 1);
      pulses[i].visible = p > 0 && p < 1;
      pulses[i].material.opacity = Math.sin(Math.PI * p) * .86;
      pulses[i].position.set(0, (1 - ease(p)) * (face.inner + .14), .25 + .07 * i);
      pulses[i].scale.setScalar(.26 + .3 * Math.sin(Math.PI * p));
    });
    // The central medallion slides down into the space between the lifted
    // leaves; it remains legible instead of disappearing under the inner ring.
    core.position.y = expansion * -.90;
    core.position.z = expansion * .20;
    coreLightMaterial.opacity = .30 + .45 * expansion + Math.max(...rings.map(r => {
      const p = (now - r.pulse) / 900;
      return p > .55 && p < 1 ? Math.sin((p - .55) / .45 * Math.PI) * .5 : 0;
    }));
    instrument.updateMatrixWorld(true);
    linkages.forEach(({ sleeve, piston, cap, index }) => {
      const face = faces[index];
      const a = -.70 + index * -.42;
      endpoint.set(Math.cos(a) * face.inner, Math.sin(a) * face.inner, -.04);
      endpoint.applyMatrix4(face.layer.matrix);
      startpoint.set(Math.cos(a) * face.inner, Math.sin(a) * face.inner, -.17);
      const middle = startpoint.clone().lerp(endpoint, .55);
      connect(sleeve, startpoint, middle);
      connect(piston, middle, endpoint);
      cap.position.copy(endpoint);
      sleeve.visible = piston.visible = cap.visible = expansion > .025;
    });
    renderer.render(scene, camera);
  }
  function destroy() {
    disposed = true; observer.disconnect();
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    environment.dispose();
    renderer.dispose();
  }
  return { draw, hit, pointerAngle, destroy };
}
