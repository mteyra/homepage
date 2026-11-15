import * as THREE from '../assets/vendor/three.module.js';

const PAGES = ['about', 'studies', 'experience', 'projects'];
const QUARTER = Math.PI / 2, TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const nearestAngle = (value, reference) => reference + Math.atan2(Math.sin(value - reference), Math.cos(value - reference));

// The compass is an optional physical index; ordinary HTML links own keyboard navigation.
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
  const quietMark = new THREE.Color(0x656b70), activeMark = new THREE.Color(0xe5e8e7);

  function finish(options, basic = false) {
    const value = basic ? new THREE.MeshBasicMaterial(options) : new THREE.MeshPhysicalMaterial(options);
    materials.add(value); return value;
  }
  function mesh(geometry, material, parent = ring) {
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
  function cylinder(radius, height, material, z, parent = ring) {
    const value = mesh(new THREE.CylinderGeometry(radius, radius, height, 144), material, parent);
    value.rotation.x = QUARTER; value.position.z = z;
    return value;
  }
  function stroke(x1, y1, x2, y2, thickness, material, z = .095, parent = ring) {
    const value = mesh(new THREE.PlaneGeometry(Math.hypot(x2 - x1, y2 - y1), thickness), material, parent);
    value.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    value.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    return value;
  }
  function glyph(letter, x, y, material) {
    // Small geometric engravings stay sharp without an external font texture.
    const paths = {
      N: [[-.5,-.5,-.5,.5],[-.5,.5,.5,-.5],[.5,-.5,.5,.5]],
      E: [[-.5,-.5,-.5,.5],[-.5,.5,.5,.5],[-.5,0,.35,0],[-.5,-.5,.5,-.5]],
      S: [[.5,.5,-.5,.5],[-.5,.5,-.5,0],[-.5,0,.5,0],[.5,0,.5,-.5],[.5,-.5,-.5,-.5]],
      W: [[-.5,.5,-.27,-.5],[-.27,-.5,0,.15],[0,.15,.27,-.5],[.27,-.5,.5,.5]],
    };
    paths[letter].forEach(([ax, ay, bx, by]) => stroke(x + ax * .19, y + ay * .29, x + bx * .19, y + by * .29, .027, material));
  }
  function facet(points, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.computeVertexNormals();
    const value = mesh(geometry, material, rotor); value.castShadow = true;
    return value;
  }
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5));
    renderer.setClearColor(0x08090b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-4, 4, 3.125, -3.125, .1, 40);
    camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
    ring = new THREE.Group(); ring.rotation.set(-.60, .035, -.025); scene.add(ring);
    rotor = new THREE.Group(); ring.add(rotor);

    // Large, neutral reflectors reveal the case's bevels and the needle's facets.
    const studio = new THREE.Scene(); studio.background = new THREE.Color(0x333333);
    for (const [x, y, z, w, h, color] of [
      [-4, 4, 5, 6, 8, 0xf1f1f1],
      [5, 1, 3, 3.5, 7, 0xb0b0b0],
      [0, 6, -1, 8, 3, 0xffffff],
      [0, -4, 4, 7, 3, 0x818181],
      [0, 0, 6, 3.5, 6, 0x55585b],
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
    scene.add(new THREE.HemisphereLight(0xeeeeee, 0x181818, .7));
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-4, 5, 7); scene.add(key);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
    key.shadow.bias = -.0005; key.shadow.normalBias = .012;
    const fill = new THREE.DirectionalLight(0xe3e3e3, .5); fill.position.set(5, -2, 4); scene.add(fill);

    const caseMetal = finish({ color: 0x979b9d, metalness: .86, roughness: .32, envMapIntensity: 1.05 });
    const edgeMetal = finish({ color: 0xd2d5d5, metalness: .90, roughness: .26, envMapIntensity: 1.10 });
    const darkMetal = finish({ color: 0x24282b, metalness: .78, roughness: .38, envMapIntensity: .8 });
    const dialFinish = finish({ color: 0x171a1d, metalness: .2, roughness: .72, envMapIntensity: .5 });
    const marks = finish({ color: 0x777e82, toneMapped: false }, true);
    const faintMarks = finish({ color: 0x3b4145, toneMapped: false }, true);
    const seam = finish({ color: 0x14171a, toneMapped: false }, true);

    cylinder(3.105, .27, darkMetal, -.165);
    mesh(solid(2.88, 3.15, .20, .035), caseMetal).position.z = -.13;
    mesh(solid(3.085, 3.145, .025, .012), edgeMetal).position.z = .072;
    mesh(solid(2.88, 2.94, .02, .012), edgeMetal).position.z = .07;
    mesh(solid(2.854, 2.881, .008, 0), seam).position.z = .079;
    const dial = cylinder(2.873, .055, dialFinish, .03); dial.receiveShadow = true;
    mesh(new THREE.ShapeGeometry(annulus(2.742, 2.751), 144), faintMarks).position.z = .087;
    mesh(new THREE.ShapeGeometry(annulus(1.91, 1.918), 144), faintMarks).position.z = .087;

    // A fixed 5-degree scale. Every sixth mark is longer; only four bearings navigate.
    for (let tick = 0; tick < 72; tick++) {
      const theta = QUARTER - tick * TAU / 72;
      const cardinal = tick % 18 === 0, major = tick % 6 === 0;
      const length = cardinal ? .265 : major ? .185 : .09;
      const outer = 2.67, inner = outer - length;
      stroke(Math.cos(theta) * inner, Math.sin(theta) * inner,
        Math.cos(theta) * outer, Math.sin(theta) * outer,
        cardinal ? .032 : major ? .022 : .012, major ? marks : faintMarks);
    }
    const hitMaterial = finish({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }, true);
    ['N', 'E', 'S', 'W'].forEach((letter, index) => {
      const center = QUARTER - index * QUARTER;
      const bearing = finish({ color: quietMark, toneMapped: false }, true);
      glyph(letter, Math.cos(center) * 2.16, Math.sin(center) * 2.16, bearing);
      const indicator = mesh(new THREE.CircleGeometry(.042, 24), bearing);
      indicator.position.set(Math.cos(center) * 2.79, Math.sin(center) * 2.79, .098);
      const hit = mesh(new THREE.ShapeGeometry(annulus(.72, 3.16, center - QUARTER / 2, center + QUARTER / 2), 48), hitMaterial);
      hit.position.z = .50; hit.userData.index = index; hits.push(hit);
      sectors.push({ bearing });
    });

    // The compass needle is a real raised diamond section; only this assembly turns.
    const needleEdge = finish({ color: 0x555e65, metalness: .95, roughness: .3, envMapIntensity: .8 });
    const needleLight = finish({ color: 0xf0f0e9, metalness: .74, roughness: .32, envMapIntensity: 1.05 });
    const needleShade = finish({ color: 0xb9c0c2, metalness: .87, roughness: .31, envMapIntensity: .95 });
    const counterLight = finish({ color: 0x81898e, metalness: .72, roughness: .36, envMapIntensity: 1.0 });
    const counterShade = finish({ color: 0x535d64, metalness: .70, roughness: .40, envMapIntensity: .95 });
    const silhouette = new THREE.Shape();
    silhouette.moveTo(0, 1.79); silhouette.lineTo(-.30, 0); silhouette.lineTo(0, -1.48); silhouette.lineTo(.30, 0); silhouette.closePath();
    const needleBase = mesh(new THREE.ExtrudeGeometry(silhouette, { depth: .028, bevelEnabled: false, steps: 1 }), needleEdge, rotor);
    needleBase.position.z = .195; needleBase.castShadow = true;
    const north = [0, 1.79, .225], south = [0, -1.48, .225];
    const left = [-.30, 0, .225], right = [.30, 0, .225], ridge = [0, 0, .435];
    facet([north, left, ridge], needleLight);
    facet([north, ridge, right], needleShade);
    facet([south, right, ridge], counterLight);
    facet([south, ridge, left], counterShade);
    const hub = cylinder(.16, .078, edgeMetal, .425); hub.castShadow = true;
    cylinder(.10, .012, darkMetal, .471);
    cylinder(.034, .009, edgeMetal, .483);
  }
  function update() {
    if (!rotor) return;
    rotor.rotation.z = angle;
    sectors.forEach(({ bearing }, index) => {
      const strength = index === selected ? 1 : index === hovered ? .6 : 0;
      bearing.color.copy(quietMark).lerp(activeMark, strength);
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
    const aspect = width / height, viewHeight = Math.max(6.25, 6.9 / aspect);
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
    scene?.traverse(object => object.shadow?.dispose());
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
      type: 'compass', page: PAGES[selected], index: selected, angle, targetAngle, hovered: PAGES[hovered] ?? null,
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
