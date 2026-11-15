import * as THREE from '../assets/vendor/three.module.js';

const PAGES = ['about', 'studies', 'experience', 'projects'];
const QUARTER = Math.PI / 2, TAU = Math.PI * 2;
const REST_TILT = -1.08, SCREEN_ROLL = .4, ALIGNMENT_WINDOW = Math.PI / 15;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const nearestAngle = (value, reference) => reference + Math.atan2(Math.sin(value - reference), Math.cos(value - reference));

// The compass is an optional physical index; ordinary HTML links own keyboard navigation.
export function createIndexScene(canvas, { onSelect, onInteraction, onReady, onUnavailable } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const before = {
    hidden: canvas.getAttribute('aria-hidden'), tabIndex: canvas.getAttribute('tabindex'),
    cursor: canvas.style.cursor, touchAction: canvas.style.touchAction, clipPath: canvas.style.clipPath,
  };
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  canvas.style.touchAction = 'pinch-zoom';
  canvas.style.cursor = 'default';

  let renderer, scene, camera, display, ring, rotor, resizeObserver, visibilityObserver;
  let selected = 0, angle = 0, targetAngle = 0, tilt = REST_TILT, targetTilt = REST_TILT;
  let candidate = 0, aligned = true, faceVisible = true, hasInteracted = false;
  let lastInteraction = '', lastClipPath = '', puzzleSelection = null, sightMaterial;
  let manualPaused = false, paused = reduced.matches, visible = true;
  let ready = false, unavailable = false, destroyed = false, disposed = false;
  let width = 0, height = 0, frame = 0, animation = null, press = null;
  const geometries = new Set(), materials = new Set(), sectors = [];
  const bounds = new THREE.Box3(), faceNormal = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const sightBounds = new THREE.Box3(new THREE.Vector3(-.22, 3.26, .07), new THREE.Vector3(.22, 3.67, .18));
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const quietMark = new THREE.Color(0xa5b1aa), activeMark = new THREE.Color(0xe5e8e7);

  function finish(options, basic = false) {
    const value = basic ? new THREE.MeshBasicMaterial(options) : new THREE.MeshPhysicalMaterial(options);
    materials.add(value); return value;
  }
  function mesh(geometry, material, parent = rotor) {
    geometries.add(geometry);
    const value = new THREE.Mesh(geometry, material);
    parent.add(value); return value;
  }
  function cylinder(radius, height, material, z, parent = rotor) {
    const value = mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material, parent);
    value.rotation.x = QUARTER; value.position.z = z;
    return value;
  }
  function stroke(x1, y1, x2, y2, thickness, material, z = .066, parent = rotor) {
    const value = mesh(new THREE.BoxGeometry(Math.hypot(x2 - x1, y2 - y1), thickness, .018), material, parent);
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
  function edges(geometry, material, parent = rotor) {
    geometries.add(geometry);
    const value = new THREE.LineSegments(geometry, material);
    // Fine topology lines are visual detail, not an enlarged pointer hit area.
    value.raycast = () => {};
    parent.add(value); return value;
  }
  function frameGeometry() {
    // A hexagonal section, swept through 48 sides: hollow, faceted and physically deep.
    const profile = [[3.16, 0], [3.08, .10], [2.96, .08], [2.90, -.005], [2.96, -.11], [3.08, -.12]];
    const positions = [];
    const point = (angle, [radius, z]) => [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
    for (let segment = 0; segment < 48; segment++) {
      const a = segment / 48 * TAU, b = (segment + 1) / 48 * TAU;
      for (let side = 0; side < profile.length; side++) {
        const next = (side + 1) % profile.length;
        const p = point(a, profile[side]), q = point(b, profile[side]);
        const r = point(b, profile[next]), t = point(a, profile[next]);
        positions.push(...p, ...q, ...r, ...p, ...r, ...t);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5));
    renderer.setClearColor(0x08090b, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-4, 4, 3.125, -3.125, .1, 40);
    camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
    // Roll belongs outside the tilt: the oval's long axis rises across the screen.
    display = new THREE.Group(); display.rotation.z = SCREEN_ROLL; scene.add(display);
    ring = new THREE.Group(); ring.rotation.x = tilt; display.add(ring);
    rotor = new THREE.Group(); ring.add(rotor);

    // Broad light and matte surfaces let the geometry, rather than reflections, describe depth.
    scene.add(new THREE.HemisphereLight(0xf1f2ec, 0x30363a, 1.65));
    const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-4, 5, 7); scene.add(key);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
    key.shadow.bias = -.0005; key.shadow.normalBias = .012;
    const fill = new THREE.DirectionalLight(0xdbe1e2, .5); fill.position.set(5, -2, 4); scene.add(fill);

    const frameFinish = finish({ color: 0x87918d, metalness: .06, roughness: .87,
      flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const supportFinish = finish({ color: 0x424c4e, metalness: .08, roughness: .84, flatShading: true });
    const tabFinish = finish({ color: 0x38433f, metalness: .04, roughness: .88, flatShading: true });
    const hubFinish = finish({ color: 0xa5aeaa, metalness: .08, roughness: .76, flatShading: true });
    const marks = finish({ color: 0xa7afaa, toneMapped: false }, true);
    const faintMarks = finish({ color: 0x6d7977, toneMapped: false }, true);
    const topology = new THREE.LineBasicMaterial({ color: 0xb7c1bb, transparent: true, opacity: .22, depthWrite: false });
    materials.add(topology);

    const frameMesh = mesh(frameGeometry(), frameFinish);
    frameMesh.castShadow = true; frameMesh.receiveShadow = true;
    edges(new THREE.EdgesGeometry(frameMesh.geometry, 16), topology);
    // The open aperture is grabbable without drawing a surface across its negative space.
    // It follows the instrument plane and remains bounded by the physical inner rim.
    const grabSurface = finish({ side: THREE.DoubleSide, visible: false, colorWrite: false, depthWrite: false }, true);
    mesh(new THREE.CircleGeometry(2.91, 64), grabSurface);

    // Four sparse struts hold the central axle; the background remains visible between them.
    for (let index = 0; index < 4; index++) {
      const theta = QUARTER - index * QUARTER;
      const support = mesh(new THREE.BoxGeometry(2.68, .042, .052), supportFinish);
      support.position.set(Math.cos(theta) * 1.61, Math.sin(theta) * 1.61, -.064);
      support.rotation.z = theta; support.receiveShadow = true;
      const point = (radius, tangent) => [Math.cos(theta) * radius - Math.sin(theta) * tangent,
        Math.sin(theta) * radius + Math.cos(theta) * tangent];
      const tab = new THREE.Shape();
      tab.moveTo(...point(2.23, -.15)); tab.lineTo(...point(2.94, -.23));
      tab.lineTo(...point(2.94, .23)); tab.lineTo(...point(2.23, .15)); tab.closePath();
      const bearingTab = mesh(new THREE.ExtrudeGeometry(tab, { depth: .052, steps: 1,
        bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 1 }), tabFinish);
      bearingTab.position.z = -.018; bearingTab.receiveShadow = true;
      const bearing = finish({ color: quietMark, toneMapped: false }, true);
      glyph(['N', 'E', 'S', 'W'][index], Math.cos(theta) * 2.55, Math.sin(theta) * 2.55, bearing);
      const indicator = cylinder(.034, .012, bearing, .06);
      indicator.position.x = Math.cos(theta) * 2.83; indicator.position.y = Math.sin(theta) * 2.83;
      sectors.push({ bearing });
    }
    for (let tick = 0; tick < 48; tick++) {
      const theta = QUARTER - tick * TAU / 48;
      const cardinal = tick % 12 === 0, major = tick % 4 === 0;
      const inner = cardinal ? 2.85 : major ? 2.90 : 2.95, outer = 3.065;
      stroke(Math.cos(theta) * inner, Math.sin(theta) * inner,
        Math.cos(theta) * outer, Math.sin(theta) * outer,
        cardinal ? .026 : major ? .019 : .012, major ? marks : faintMarks, .108);
    }

    // Folded, solid facets form a raised needle above the open frame.
    const needleEdge = finish({ color: 0x65716e, metalness: .04, roughness: .86 });
    const needleLight = finish({ color: 0xdde1d6, metalness: .02, roughness: .86, flatShading: true });
    const needleShade = finish({ color: 0xa5b1aa, metalness: .03, roughness: .88, flatShading: true });
    const counterLight = finish({ color: 0x85948e, metalness: .04, roughness: .86, flatShading: true });
    const counterShade = finish({ color: 0x556760, metalness: .04, roughness: .88, flatShading: true });
    const silhouette = new THREE.Shape();
    silhouette.moveTo(0, 2.12); silhouette.lineTo(-.38, 0);
    silhouette.lineTo(0, -1.88); silhouette.lineTo(.38, 0); silhouette.closePath();
    const needleBase = mesh(new THREE.ExtrudeGeometry(silhouette, { depth: .036, bevelEnabled: false, steps: 1 }), needleEdge);
    needleBase.position.z = .128; needleBase.castShadow = true;
    const north = [0, 2.12, .166], south = [0, -1.88, .166];
    const left = [-.38, 0, .166], right = [.38, 0, .166], ridge = [0, 0, .45];
    facet([north, left, ridge], needleLight); facet([north, ridge, right], needleShade);
    facet([south, right, ridge], counterLight); facet([south, ridge, left], counterShade);
    const needleLines = [north, left, left, south, south, right, right, north, north, ridge, ridge, south, left, ridge, ridge, right];
    const needleGeometry = new THREE.BufferGeometry();
    needleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(needleLines.flat(), 3));
    edges(needleGeometry, topology);
    const axle = cylinder(.14, .23, supportFinish, .063); axle.castShadow = true;
    const hub = cylinder(.115, .064, hubFinish, .454); hub.castShadow = true;
    cylinder(.047, .009, supportFinish, .491);

    // The small fixed sight shares the object's tilt but never the bearing rotation.
    sightMaterial = finish({ color: 0xc7cecc, metalness: .03, roughness: .8, flatShading: true });
    const sight = new THREE.Shape();
    sight.moveTo(-.13, 3.61); sight.lineTo(0, 3.28); sight.lineTo(.13, 3.61); sight.closePath();
    mesh(new THREE.ExtrudeGeometry(sight, { depth: .055, bevelEnabled: true, bevelSize: .012,
      bevelThickness: .012, bevelSegments: 1, steps: 1 }), sightMaterial, ring).position.z = .055;

    // The open back exposes the axle and four physical joints when the instrument is flipped.
    cylinder(.24, .055, supportFinish, -.119);
    cylinder(.10, .012, hubFinish, -.154);
    for (let joint = 0; joint < 4; joint++) {
      const theta = QUARTER - joint * QUARTER;
      const fastener = cylinder(.039, .018, hubFinish, -.094);
      fastener.position.x = Math.cos(theta) * 2.80;
      fastener.position.y = Math.sin(theta) * 2.80;
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
    updateClip();
  }
  function updateClip() {
    // The canvas rectangle is intentionally generous. Clip its hit region to the
    // projected instrument so empty corners do not intercept page scrolling or links.
    camera.updateMatrixWorld();
    const points = [], padding = 4;
    function include(x, y, z) {
      projected.set(x, y, z).applyMatrix4(ring.matrixWorld).project(camera);
      const px = (projected.x + 1) * width / 2, py = (1 - projected.y) * height / 2;
      for (const dx of [-padding, padding]) for (const dy of [-padding, padding]) points.push([px + dx, py + dy]);
    }
    for (let segment = 0; segment < 48; segment++) {
      const angle = segment / 48 * TAU;
      for (const z of [-.17, .17]) include(Math.cos(angle) * 3.24, Math.sin(angle) * 3.24, z);
    }
    include(0, 0, .54);
    for (const x of [sightBounds.min.x, sightBounds.max.x])
      for (const y of [sightBounds.min.y, sightBounds.max.y])
        for (const z of [sightBounds.min.z, sightBounds.max.z]) include(x, y, z);
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    function half(sequence) {
      const hull = [];
      for (const point of sequence) {
        while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
        hull.push(point);
      }
      hull.pop(); return hull;
    }
    const hull = [...half(points), ...half([...points].reverse())];
    const clip = `polygon(${hull.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(',')})`;
    if (clip !== lastClipPath) { lastClipPath = clip; canvas.style.clipPath = clip; }
  }
  function update() {
    if (!rotor) return;
    ring.rotation.x = tilt;
    rotor.rotation.z = angle;
    display.updateMatrixWorld(true);
    faceNormal.set(0, 0, 1).transformDirection(ring.matrixWorld);
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
      angle, spin: angle, targetAngle, tilt, targetTilt, roll: SCREEN_ROLL,
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
    canvas.style.cursor = before.cursor; canvas.style.touchAction = before.touchAction; canvas.style.clipPath = before.clipPath;
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
