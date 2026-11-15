import * as THREE from '../assets/vendor/three.module.js';

const PAGES = ['about', 'studies', 'experience', 'projects'];
const QUARTER = Math.PI / 2, TAU = Math.PI * 2;
const REST_TILT = -1.08, ALIGNMENT_WINDOW = Math.PI / 15;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const nearestAngle = (value, reference) => reference + Math.atan2(Math.sin(value - reference), Math.cos(value - reference));

// The compass is an optional physical index; ordinary HTML links own keyboard navigation.
export function createIndexScene(canvas, { onSelect, onInteraction, onReady, onUnavailable } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const before = {
    hidden: canvas.getAttribute('aria-hidden'), tabIndex: canvas.getAttribute('tabindex'),
    cursor: canvas.style.cursor, touchAction: canvas.style.touchAction,
  };
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  canvas.style.touchAction = 'pinch-zoom';
  canvas.style.cursor = 'default';

  let renderer, scene, camera, ring, rotor, environment, resizeObserver, visibilityObserver;
  let selected = 0, angle = 0, targetAngle = 0, tilt = REST_TILT, targetTilt = REST_TILT;
  let candidate = 0, aligned = true, faceVisible = true, hasInteracted = false;
  let lastInteraction = '', puzzleSelection = null, sightMaterial;
  let manualPaused = false, paused = reduced.matches, visible = true;
  let ready = false, unavailable = false, destroyed = false, disposed = false;
  let width = 0, height = 0, frame = 0, animation = null, press = null;
  const geometries = new Set(), materials = new Set(), sectors = [];
  const bounds = new THREE.Box3(), faceNormal = new THREE.Vector3();
  const sightBounds = new THREE.Box3(new THREE.Vector3(-.22, 3.26, .07), new THREE.Vector3(.22, 3.67, .18));
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const quietMark = new THREE.Color(0x656b70), activeMark = new THREE.Color(0xe5e8e7);

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
  function cylinder(radius, height, material, z, parent = rotor) {
    const value = mesh(new THREE.CylinderGeometry(radius, radius, height, 144), material, parent);
    value.rotation.x = QUARTER; value.position.z = z;
    return value;
  }
  function stroke(x1, y1, x2, y2, thickness, material, z = .095, parent = rotor) {
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
    ring = new THREE.Group(); ring.rotation.set(tilt, .035, -.025); scene.add(ring);
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
    ['N', 'E', 'S', 'W'].forEach((letter, index) => {
      const center = QUARTER - index * QUARTER;
      const bearing = finish({ color: quietMark, toneMapped: false }, true);
      glyph(letter, Math.cos(center) * 2.16, Math.sin(center) * 2.16, bearing);
      const indicator = mesh(new THREE.CircleGeometry(.042, 24), bearing);
      indicator.position.set(Math.cos(center) * 2.79, Math.sin(center) * 2.79, .098);
      sectors.push({ bearing });
    });

    // The raised needle, dial and case belong to one instrument and turn together.
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


    // The sight follows the viewing tilt, but stays fixed while the instrument turns.
    sightMaterial = finish({ color: 0xc7cecc, metalness: .35, roughness: .4, envMapIntensity: .8 });
    const sight = new THREE.Shape();
    sight.moveTo(-.13, 3.61); sight.lineTo(0, 3.28); sight.lineTo(.13, 3.61); sight.closePath();
    mesh(new THREE.ExtrudeGeometry(sight, { depth: .07, bevelEnabled: true, bevelSize: .01,
      bevelThickness: .01, bevelSegments: 2, steps: 1 }), sightMaterial, ring).position.z = .09;
    const sightBase = mesh(new THREE.BoxGeometry(.42, .045, .075), darkMetal, ring);
    sightBase.position.set(0, 3.64, .115);

    // A restrained back plate makes the object readable when tipped all the way over.
    cylinder(2.88, .018, dialFinish, -.314);
    mesh(solid(2.69, 2.72, .012, .003), darkMetal).position.z = -.341;
    mesh(solid(.49, .515, .012, .003), caseMetal).position.z = -.349;
    for (let spoke = 0; spoke < 3; spoke++) {
      const theta = spoke * TAU / 3 + QUARTER;
      const brace = mesh(new THREE.BoxGeometry(2.14, .025, .012), caseMetal);
      brace.position.set(Math.cos(theta) * 1.61, Math.sin(theta) * 1.61, -.344);
      brace.rotation.z = theta;
      const fastener = cylinder(.049, .016, caseMetal, -.342);
      fastener.position.x = Math.cos(theta) * 2.79;
      fastener.position.y = Math.sin(theta) * 2.79;
    }
  }
  function canOpen(gesture = press) {
    return Boolean(gesture?.dragging && gesture.horizontalTravel >= 12 &&
      Math.abs(angle - gesture.angle) >= .12 && aligned && candidate !== selected);
  }
  function emitInteraction() {
    if (destroyed) return;
    const state = {
      candidate: faceVisible ? PAGES[candidate] : null, aligned,
      dragging: Boolean(press?.dragging), faceVisible, hasInteracted, canOpen: canOpen(),
    };
    const signature = JSON.stringify(state);
    if (signature !== lastInteraction) { lastInteraction = signature; onInteraction?.(state); }
  }
  function fitCamera() {
    if (!width || !height) return;
    // Project the cylindrical envelope, not a rotating square bounding box.
    // This fits front/back views without making the case breathe as the dial turns.
    bounds.copy(sightBounds).applyMatrix4(ring.matrixWorld);
    const matrix = ring.matrixWorld.elements;
    for (let axis = 0; axis < 2; axis++) {
      const radius = 3.19 * Math.hypot(matrix[axis], matrix[axis + 4]);
      const lowerZ = -.36 * matrix[axis + 8], upperZ = .50 * matrix[axis + 8];
      const minimum = -radius + Math.min(lowerZ, upperZ) + matrix[axis + 12];
      const maximum = radius + Math.max(lowerZ, upperZ) + matrix[axis + 12];
      bounds.min.setComponent(axis, Math.min(bounds.min.getComponent(axis), minimum));
      bounds.max.setComponent(axis, Math.max(bounds.max.getComponent(axis), maximum));
    }
    const aspect = width / height;
    const spanX = 2 * Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) + .35;
    const spanY = 2 * Math.max(Math.abs(bounds.min.y), Math.abs(bounds.max.y)) + .16;
    const viewHeight = Math.max(3.8, spanY, spanX / aspect);
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }
  function update() {
    if (!rotor) return;
    ring.rotation.x = tilt;
    rotor.rotation.z = angle;
    ring.updateMatrixWorld(true);
    faceNormal.set(0, 0, 1).applyQuaternion(ring.quaternion);
    faceVisible = faceNormal.z > .18;
    const quarter = Math.round(angle / QUARTER);
    candidate = ((quarter % PAGES.length) + PAGES.length) % PAGES.length;
    aligned = faceVisible && Math.abs(angle - quarter * QUARTER) <= ALIGNMENT_WINDOW;
    sectors.forEach(({ bearing }, index) => {
      const strength = faceVisible && index === candidate ? (aligned ? 1 : .65) : index === selected ? .35 : 0;
      bearing.color.copy(quietMark).lerp(activeMark, strength);
    });
    sightMaterial.color.setHex(aligned ? 0xf0f2eb : 0x8e9798);
    fitCamera();
    emitInteraction();
  }
  function canDraw() { return renderer && !destroyed && !unavailable && visible && !document.hidden && width > 0 && height > 0; }
  function canAnimate() { return canDraw() && !paused && !reduced.matches; }
  function draw() {
    if (!canDraw()) return;
    try { renderer.render(scene, camera); } catch { fail(); }
  }
  function stopAnimation() { cancelAnimationFrame(frame); frame = 0; animation = null; }
  function renderNow() { update(); draw(); }
  function settle() {
    stopAnimation(); angle = targetAngle; tilt = targetTilt; renderNow();
  }
  function tick(now) {
    frame = 0;
    if (destroyed || unavailable) return;
    if (animation) {
      if (!canAnimate()) { settle(); return; }
      animation.started ??= now;
      const progress = clamp((now - animation.started) / animation.duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      angle = animation.angle + (targetAngle - animation.angle) * eased;
      tilt = animation.tilt + (targetTilt - animation.tilt) * eased;
      if (progress >= 1) { angle = targetAngle; tilt = targetTilt; animation = null; }
      update();
    }
    draw();
    if (animation && canDraw()) frame = requestAnimationFrame(tick);
  }
  function requestDraw() { if (!frame && canDraw()) frame = requestAnimationFrame(tick); }
  function turn(instant = false) {
    stopAnimation();
    if (instant || !canAnimate() || (Math.abs(angle - targetAngle) + Math.abs(tilt - targetTilt) < .0001)) { settle(); return; }
    animation = { angle, tilt, started: null, duration: 260 };
    update(); requestDraw();
  }
  function releasePointer() {
    const previous = press; press = null;
    if (previous) { try { canvas.releasePointerCapture(previous.id); } catch { /* Capture may already be gone. */ } }
    canvas.style.cursor = 'default';
    return previous;
  }
  function hold() {
    stopAnimation(); targetAngle = angle; targetTilt = tilt; renderNow();
  }
  function select(page, { instant = false } = {}) {
    const next = PAGES.indexOf(page);
    if (destroyed || next < 0) return false;
    releasePointer();
    selected = next;
    targetAngle = nearestAngle(next * QUARTER, angle);
    targetTilt = puzzleSelection === next ? tilt : nearestAngle(REST_TILT, tilt);
    turn(instant);
    return true;
  }
  function commit(index) {
    selected = index;
    targetAngle = nearestAngle(index * QUARTER, angle);
    targetTilt = tilt;
    turn();
    // The synchronous route callback may select the same page; preserve the inspected tilt.
    puzzleSelection = index;
    try { onSelect?.(PAGES[index]); } finally { puzzleSelection = null; }
  }
  function cast(event) {
    if (!ready || destroyed || unavailable || !width || !height) return false;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return false;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(rotor, true).length > 0;
  }
  function hover(event) {
    if (event.pointerType !== 'mouse' || press) return;
    canvas.style.cursor = cast(event) ? 'grab' : 'default';
  }
  function down(event) {
    if (destroyed || unavailable || event.button !== 0 || event.isPrimary === false || press) return;
    if (!cast(event)) return;
    stopAnimation(); targetAngle = angle; targetTilt = tilt;
    press = {
      id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
      angle, tilt, width, height, dragging: false, horizontalTravel: 0,
    };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional capture. */ }
    canvas.style.cursor = 'grabbing';
    if (event.pointerType !== 'touch' && event.cancelable) event.preventDefault();
  }
  function move(event) {
    if (!press) { hover(event); return; }
    if (event.pointerId !== press.id) return;
    const dx = event.clientX - press.x, dy = event.clientY - press.y;
    if (!press.dragging && Math.hypot(dx, dy) < 5) return;
    press.dragging = true; hasInteracted = true;
    press.horizontalTravel = Math.max(press.horizontalTravel, Math.abs(dx));
    canvas.style.cursor = 'grabbing';
    if (event.cancelable) event.preventDefault();
    // Direct manipulation is available even with reduced motion; only settling is animated.
    angle = press.angle - dx / Math.max(press.width, 1) * TAU;
    tilt = press.tilt + dy / Math.max(press.height, 96) * Math.PI;
    targetAngle = angle; targetTilt = tilt;
    update(); requestDraw();
  }
  function up(event) {
    if (!press || event.pointerId !== press.id) return;
    const previous = releasePointer();
    update();
    if (canOpen(previous)) commit(candidate);
    else hold();
    hover(event);
  }
  function cancelPointer() {
    if (!press) return;
    releasePointer(); hold();
  }
  function anotherPointer(event) {
    if (press?.type === 'touch' && event.pointerType === 'touch' && event.pointerId !== press.id) cancelPointer();
  }
  function keydown(event) { if (event.key === 'Escape') cancelPointer(); }
  function leave() { if (!press) canvas.style.cursor = 'default'; }
  function resize() {
    if (!renderer || destroyed || unavailable) return;
    // A viewport resize cancels intent even when the canvas keeps its fixed CSS size.
    cancelPointer();
    const nextWidth = canvas.clientWidth, nextHeight = canvas.clientHeight;
    if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return;
    // Resizing or cancelling an inspection must never complete the alignment puzzle.
    width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
    if (animation) settle(); else renderNow();
  }
  function pauseChanged() {
    const next = reduced.matches || manualPaused;
    if (destroyed || paused === next) return;
    paused = next;
    if (animation) settle(); else { update(); requestDraw(); }
  }
  function setPaused(value) { manualPaused = Boolean(value); pauseChanged(); }
  function visibilityChanged() {
    if (destroyed) return;
    if (!visible || document.hidden) { cancelPointer(); if (animation) settle(); else stopAnimation(); }
    else { resize(); renderNow(); }
  }
  function blur() { cancelPointer(); if (animation) settle(); }
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
    unavailable = true; ready = false; releasePointer(); stopAnimation();
    dispose(); onUnavailable?.();
  }
  function contextLost(event) { event.preventDefault(); fail(); }
  function getState() {
    return {
      type: 'compass', page: PAGES[selected], index: selected,
      angle, spin: angle, targetAngle, tilt, targetTilt,
      candidate: faceVisible ? PAGES[candidate] : null, aligned, faceVisible, hasInteracted,
      canOpen: canOpen(),
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
    document.removeEventListener('pointerdown', anotherPointer, true);
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', visibilityChanged);
    reduced.removeEventListener('change', pauseChanged);
    dispose();
    canvas.style.cursor = before.cursor; canvas.style.touchAction = before.touchAction;
    if (before.hidden === null) canvas.removeAttribute('aria-hidden'); else canvas.setAttribute('aria-hidden', before.hidden);
    if (before.tabIndex === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', before.tabIndex);
  }

  try {
    build();
    listeners.forEach(([type, handler]) => canvas.addEventListener(type, handler));
    window.addEventListener('resize', resize, { passive: true }); window.addEventListener('blur', blur);
    document.addEventListener('pointerdown', anotherPointer, true);
    document.addEventListener('keydown', keydown);
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced.addEventListener('change', pauseChanged);
    resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      const next = entries[0]?.isIntersecting ?? true;
      if (next !== visible) { visible = next; visibilityChanged(); }
    }) : null;
    visibilityObserver?.observe(canvas);
    ready = true; resize(); renderNow();
    queueMicrotask(() => { if (!destroyed && !unavailable) onReady?.(); });
  } catch {
    queueMicrotask(() => { if (!destroyed) fail(); });
  }
  return { select, setPaused, destroy, getState };
}
