import * as THREE from '../assets/vendor/three.module.js';

const PAGES = ['about', 'studies', 'experience', 'projects'];
const QUARTER = Math.PI / 2, TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const nearestAngle = (value, reference) => reference + Math.atan2(Math.sin(value - reference), Math.cos(value - reference));

// The ring is an optional physical index; ordinary HTML links own keyboard navigation.
export function createIndexScene(canvas, { onSelect, onHover, onReady, onUnavailable } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const before = {
    hidden: canvas.getAttribute('aria-hidden'), tabIndex: canvas.getAttribute('tabindex'),
    cursor: canvas.style.cursor, touchAction: canvas.style.touchAction,
  };
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  canvas.style.touchAction = 'pan-y pinch-zoom';
  canvas.style.cursor = 'default';

  let renderer, scene, camera, ring, rotor, environment, resizeObserver, visibilityObserver;
  let selected = 0, hovered = -1, angle = 0, targetAngle = 0;
  let manualPaused = false, paused = reduced.matches, visible = true;
  let ready = false, unavailable = false, destroyed = false, disposed = false;
  let width = 0, height = 0, frame = 0, animation = null, press = null;
  const geometries = new Set(), materials = new Set(), sectors = [], hits = [];
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const graphiteColor = new THREE.Color(0x363636), silverColor = new THREE.Color(0x999999);

  function finish(options, basic = false) {
    const value = basic ? new THREE.MeshBasicMaterial(options) : new THREE.MeshPhysicalMaterial(options);
    materials.add(value); return value;
  }
  function mesh(geometry, material, parent = rotor) {
    geometries.add(geometry);
    const value = new THREE.Mesh(geometry, material);
    parent.add(value); return value;
  }
  function annulus(inner, outer, start = 0, end = TAU) {
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
    shape.absarc(0, 0, outer, start, end, false);
    shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
    shape.absarc(0, 0, inner, end, start, true);
    shape.closePath();
    return shape;
  }
  function solid(inner, outer, depth, bevel, start = 0, end = TAU) {
    return new THREE.ExtrudeGeometry(annulus(inner, outer, start, end), {
      depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel,
      bevelThickness: bevel, bevelSegments: 4, curveSegments: 192,
    });
  }
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5));
    renderer.setClearColor(0x08090b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-4, 4, 2, -2, .1, 40);
    camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
    ring = new THREE.Group(); ring.rotation.set(-1.15, .035, -.025); scene.add(ring);
    rotor = new THREE.Group(); ring.add(rotor);

    // Broad photographic reflectors reveal the machined section without a glow pass.
    const studio = new THREE.Scene(); studio.background = new THREE.Color(0x333333);
    for (const [x, y, z, w, h, color] of [
      [-4, 4, 5, 6, 8, 0xf1f1f1],
      [5, 1, 3, 3.5, 7, 0xb0b0b0],
      [0, 6, -1, 8, 3, 0xffffff],
      [0, -4, 4, 7, 3, 0x818181],
      [0, 0, 6, 3.5, 6, 0x161616],
      [-5, -2, -2, 6, 7, 0x0b0b0b],
    ]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      panel.position.set(x, y, z); panel.lookAt(0, 0, 0); studio.add(panel);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environment = pmrem.fromScene(studio, .10, .1, 30, { size: 128 });
      scene.environment = environment.texture;
    } finally {
      studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      pmrem.dispose();
    }
    scene.add(new THREE.HemisphereLight(0xeeeeee, 0x181818, .8));
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-4, 5, 7); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe3e3e3, .7); fill.position.set(5, -2, 4); scene.add(fill);

    const body = finish({ color: 0x383838, metalness: .91, roughness: .34, envMapIntensity: .95 });
    const rim = finish({ color: 0xb9b9b9, metalness: .96, roughness: .34, envMapIntensity: .9 });
    const bodyMesh = mesh(solid(2.60, 3.16, .16, .025), body);
    bodyMesh.position.z = -.09;
    // Both lips belong to the same shallow ring; its center remains completely open.
    mesh(solid(3.105, 3.145, .025, .012), rim).position.z = .09;
    mesh(solid(2.615, 2.655, .025, .012), rim).position.z = .09;
    const hitMaterial = finish({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }, true);
    for (let index = 0; index < PAGES.length; index++) {
      const center = -QUARTER + index * QUARTER;
      const start = center - QUARTER / 2, end = center + QUARTER / 2;
      const channel = finish({
        color: graphiteColor, metalness: .88, roughness: .37,
        clearcoat: .06, clearcoatRoughness: .42, envMapIntensity: .9,
      });
      mesh(solid(2.69, 3.07, .028, .009, start + .009, end - .009), channel).position.z = .073;
      const stopMaterial = finish({ color: 0xadadad, metalness: .94, roughness: .35, envMapIntensity: .8 });
      const stop = mesh(new THREE.BoxGeometry(.022, .20, .003), stopMaterial);
      stop.position.set(Math.cos(center) * 2.88, Math.sin(center) * 2.88, .115);
      stop.rotation.z = center - QUARTER;
      const hit = mesh(new THREE.ShapeGeometry(annulus(2.60, 3.16, start, end), 72), hitMaterial);
      hit.position.z = .13; hit.userData.index = index; hits.push(hit);
      sectors.push({ channel, stopMaterial });
    }
  }
  function update() {
    if (!rotor) return;
    rotor.rotation.z = angle;
    sectors.forEach(({ channel, stopMaterial }, index) => {
      const strength = index === selected ? 1 : index === hovered ? .46 : 0;
      channel.color.copy(graphiteColor).lerp(silverColor, strength);
      stopMaterial.color.setHex(index === selected ? 0xe6e6e6 : index === hovered ? 0xcccccc : 0x808080);
    });
    scene.updateMatrixWorld(true);
  }
  function canDraw() { return renderer && !destroyed && !unavailable && visible && !document.hidden && width > 0 && height > 0; }
  function canAnimate() { return canDraw() && !paused && !reduced.matches; }
  function draw() {
    if (!canDraw()) return;
    try { renderer.render(scene, camera); } catch { fail(); }
  }
  function stopAnimation() { cancelAnimationFrame(frame); frame = 0; animation = null; }
  function settle() {
    stopAnimation(); angle = targetAngle; update(); draw();
  }
  function tick(now) {
    frame = 0;
    if (!animation || destroyed || unavailable) return;
    if (!canAnimate()) { settle(); return; }
    animation.started ??= now;
    const progress = clamp((now - animation.started) / animation.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    angle = animation.from + (targetAngle - animation.from) * eased;
    if (progress >= 1) { angle = targetAngle; animation = null; }
    update(); draw();
    if (animation && !destroyed && !unavailable) frame = requestAnimationFrame(tick);
  }
  function turn(instant = false) {
    stopAnimation();
    if (instant || !canAnimate() || Math.abs(angle - targetAngle) < .0001) { settle(); return; }
    animation = { from: angle, started: null, duration: 320 };
    update(); draw(); frame = requestAnimationFrame(tick);
  }
  function clearHover() {
    if (hovered < 0) return;
    hovered = -1; onHover?.(null); update(); draw();
  }
  function releasePointer() {
    const previous = press; press = null;
    if (previous) { try { canvas.releasePointerCapture(previous.id); } catch { /* Capture may already be gone. */ } }
    canvas.style.cursor = 'default';
    return previous;
  }
  function select(page, { instant = false } = {}) {
    const next = PAGES.indexOf(page);
    if (destroyed || next < 0) return false;
    const goal = nearestAngle(-next * QUARTER, angle);
    if (next === selected && Math.abs(goal - targetAngle) < .0001 && !press) {
      if (instant) settle();
      return true;
    }
    releasePointer(); clearHover();
    selected = next; targetAngle = goal; turn(instant);
    return true;
  }
  function commit(index) {
    const changed = index !== selected;
    select(PAGES[index]);
    if (changed) onSelect?.(PAGES[index]);
  }
  function cast(event) {
    if (!ready || destroyed || unavailable || !width || !height) return -1;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return -1;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(hits, false)[0]?.object.userData.index ?? -1;
  }
  function hover(event) {
    if (event.pointerType !== 'mouse' || press) return;
    const hit = cast(event), changed = hit !== hovered;
    hovered = hit; canvas.style.cursor = hit < 0 ? 'default' : 'pointer';
    if (hit >= 0) {
      const rect = canvas.getBoundingClientRect();
      onHover?.(PAGES[hit], { x: event.clientX - rect.left, y: event.clientY - rect.top });
    } else if (changed) onHover?.(null);
    if (changed) { update(); draw(); }
  }
  function down(event) {
    if (destroyed || unavailable || press || event.button !== 0 || event.isPrimary === false) return;
    const hit = cast(event); if (hit < 0) return;
    clearHover(); stopAnimation();
    press = {
      id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
      angle, sector: hit, moved: false, dragging: false,
    };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional capture. */ }
    if (event.pointerType !== 'touch' && event.cancelable) event.preventDefault();
  }
  function move(event) {
    if (!press) { hover(event); return; }
    if (event.pointerId !== press.id) return;
    const dx = event.clientX - press.x, dy = event.clientY - press.y;
    if (Math.abs(dx) + Math.abs(dy) > 7) press.moved = true;
    if (press.type === 'touch' && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.1) { cancelPointer(); return; }
    if (!canAnimate() || (!press.dragging && (Math.abs(dx) < 7 || Math.abs(dx) <= Math.abs(dy)))) return;
    press.dragging = true; canvas.style.cursor = 'grabbing';
    if (event.cancelable) event.preventDefault();
    angle = press.angle + dx / Math.max(width, 1) * TAU;
    update(); draw();
  }
  function up(event) {
    if (!press || event.pointerId !== press.id) return;
    const previous = releasePointer();
    if (previous.dragging) {
      const next = ((Math.round(-angle / QUARTER) % PAGES.length) + PAGES.length) % PAGES.length;
      commit(next);
    } else if (!previous.moved && cast(event) === previous.sector) commit(previous.sector);
    else turn();
    if (!animation && Math.abs(angle - targetAngle) > .0001) turn();
    hover(event);
  }
  function cancelPointer() {
    if (!press) return;
    releasePointer(); turn();
  }
  function leave() { if (!press) { clearHover(); canvas.style.cursor = 'default'; } }
  function resize() {
    if (!renderer || destroyed || unavailable) return;
    const nextWidth = canvas.clientWidth, nextHeight = canvas.clientHeight;
    if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return;
    releasePointer(); width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height, viewHeight = Math.max(3.2, 6.9 / aspect);
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    settle();
  }
  function pauseChanged() {
    const next = reduced.matches || manualPaused;
    if (destroyed || paused === next) return;
    paused = next; releasePointer(); clearHover(); settle();
  }
  function setPaused(value) { manualPaused = Boolean(value); pauseChanged(); }
  function visibilityChanged() {
    if (destroyed) return;
    if (!visible || document.hidden) { releasePointer(); clearHover(); settle(); }
    else { resize(); update(); draw(); }
  }
  function blur() { releasePointer(); clearHover(); settle(); }
  function dispose() {
    if (disposed) return; disposed = true;
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    environment?.dispose();
    renderer?.dispose();
  }
  function fail() {
    if (destroyed || unavailable) return;
    unavailable = true; ready = false; releasePointer(); stopAnimation(); clearHover();
    dispose(); onUnavailable?.();
  }
  function contextLost(event) { event.preventDefault(); fail(); }
  function getState() {
    return {
      page: PAGES[selected], index: selected, angle, targetAngle, hovered: PAGES[hovered] ?? null,
      dragging: Boolean(press?.dragging), animating: Boolean(animation), paused,
      visible, ready, unavailable, destroyed, width, height,
    };
  }
  const listeners = [
    ['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancelPointer],
    ['lostpointercapture', cancelPointer], ['pointerleave', leave], ['webglcontextlost', contextLost],
  ];
  function destroy() {
    if (destroyed) return;
    destroyed = true; releasePointer(); stopAnimation();
    resizeObserver?.disconnect(); visibilityObserver?.disconnect();
    listeners.forEach(([type, handler]) => canvas.removeEventListener(type, handler));
    window.removeEventListener('resize', resize); window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibilityChanged);
    reduced.removeEventListener('change', pauseChanged);
    dispose();
    canvas.style.cursor = before.cursor; canvas.style.touchAction = before.touchAction;
    if (before.hidden === null) canvas.removeAttribute('aria-hidden'); else canvas.setAttribute('aria-hidden', before.hidden);
    if (before.tabIndex === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', before.tabIndex);
    onHover?.(null);
  }

  try {
    build();
    listeners.forEach(([type, handler]) => canvas.addEventListener(type, handler));
    window.addEventListener('resize', resize, { passive: true }); window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced.addEventListener('change', pauseChanged);
    resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      const next = entries[0]?.isIntersecting ?? true;
      if (next !== visible) { visible = next; visibilityChanged(); }
    }) : null;
    visibilityObserver?.observe(canvas);
    ready = true; resize(); update(); draw();
    queueMicrotask(() => { if (!destroyed && !unavailable) onReady?.(); });
  } catch {
    queueMicrotask(() => { if (!destroyed) fail(); });
  }
  return { select, setPaused, destroy, getState };
}
