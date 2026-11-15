import * as THREE from '../assets/vendor/three.module.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * A quiet companion to each reading view. Text controls own navigation;
 * clicking a physical part offers the same selection, without a keyboard trap.
 */
export function createChapterWorld(canvas, { kind = 'studies', onSelect, onReady, onUnavailable } = {}) {
  const chapter = ['studies', 'experience', 'projects'].includes(kind) ? kind : 'studies';
  const count = chapter === 'projects' ? 4 : 3;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const before = {
    ariaHidden: canvas.getAttribute('aria-hidden'),
    tabIndex: canvas.getAttribute('tabindex'),
    touchAction: canvas.style.touchAction,
    cursor: canvas.style.cursor,
  };
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  canvas.style.touchAction = 'pan-y pinch-zoom';

  let selected = 0, manualPaused = false, paused = reduced.matches;
  let visible = true, destroyed = false, ready = false, unavailable = false;
  let renderer, scene, camera, assembly, environment, shadowLight, resizeObserver, visibilityObserver;
  let frame = 0, last = 0, width = 0, height = 0, pressed = null;
  let tiltX = 0, tiltY = 0, targetX = 0, targetY = 0, moving = false;
  const pieces = [], pickable = [];
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

  function geometry(value) { geometries.add(value); return value; }
  function finish(colour, roughness = .27) {
    const value = new THREE.MeshPhysicalMaterial({
      color: colour, metalness: .94, roughness,
      clearcoat: .3, clearcoatRoughness: .23,
    });
    materials.add(value);
    return value;
  }
  function mesh(shape, material, parent = assembly) {
    const value = new THREE.Mesh(shape, material);
    value.castShadow = true;
    value.receiveShadow = true;
    parent.add(value);
    return value;
  }
  function roundedPath(path, w, h, radius) {
    const x = -w / 2, y = -h / 2, r = radius;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    path.closePath();
    return path;
  }
  function extruded(w, h, depth, radius, opening = 0) {
    const shape = roundedPath(new THREE.Shape(), w, h, radius);
    if (opening) shape.holes.push(roundedPath(new THREE.Path(), w - opening * 2, h - opening * 2, Math.max(.015, radius - opening / 2)));
    const value = geometry(new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: true, bevelThickness: .025,
      bevelSize: .025, bevelSegments: 4, curveSegments: 16,
    }));
    value.translate(0, 0, -depth / 2);
    return value;
  }
  function addPiece(index, shape, colour, position, rotation) {
    const group = new THREE.Group();
    assembly.add(group);
    const face = finish(colour, chapter === 'studies' ? .24 : .29);
    const finishSet = chapter === 'studies' ? face : [face, finish(colour === 0x343a37 ? 0x727974 : 0xd9dcd7, .21)];
    const body = mesh(shape, finishSet, group);
    body.userData.index = index;
    pickable.push(body);
    pieces.push({
      group, face, colour: face.color.clone(),
      position: new THREE.Vector3(...position),
      rotation: new THREE.Vector3(...rotation),
      emphasis: index === selected ? 1 : 0,
    });
  }

  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0xeeefed, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-2.6, 2.6, 2.6, -2.6, .1, 30);
    camera.position.set(0, 1.25, 8);
    camera.lookAt(0, -.04, 0);
    assembly = new THREE.Group();
    scene.add(assembly);

    // Broad neutral reflectors and narrow highlights match the home monogram.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0xa4a7a5);
    for (const [x, y, z, w, h, colour] of [
      [-5, 5, 3, 5, 7, 0xffffff],
      [4, 2, 4, 1.4, 8, 0xf1f3f0],
      [1, 7, -3, 8, 4, 0xffffff],
      [0, 0, 6, 3.5, 7, 0x242827],
      [5, -1, -1, 5, 7, 0x171b19],
      [-3, -5, 0, 7, 5, 0x585d59],
    ]) {
      const reflector = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide }));
      reflector.position.set(x, y, z);
      reflector.lookAt(0, 0, 0);
      studio.add(reflector);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environment = pmrem.fromScene(studio, .04, .1, 30, { size: 128 });
      scene.environment = environment.texture;
    } finally {
      studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      pmrem.dispose();
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7b807a, 1.15));
    shadowLight = new THREE.DirectionalLight(0xffffff, 3.1);
    shadowLight.position.set(-2, 12, 5);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(512, 512);
    Object.assign(shadowLight.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 22 });
    shadowLight.shadow.bias = -.00005;
    shadowLight.shadow.normalBias = .02;
    shadowLight.shadow.radius = 8;
    shadowLight.shadow.blurSamples = 10;
    scene.add(shadowLight);
    const fill = new THREE.DirectionalLight(0xe9ede9, .9);
    fill.position.set(4, 1.8, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.5);
    rim.position.set(-1, 4, -5);
    scene.add(rim);

    if (chapter === 'studies') {
      addPiece(0, geometry(new THREE.TorusGeometry(1.49, .049, 16, 160)), 0x343a37, [-.05, .05, .10], [.10, .05, .13]);
      addPiece(1, geometry(new THREE.TorusGeometry(1.48, .045, 16, 160)), 0xc5c9c2, [.11, .02, -.10], [.66, .96, -.39]);
      addPiece(2, geometry(new THREE.TorusGeometry(1.43, .047, 16, 160)), 0x858d86, [-.12, -.03, .02], [-.82, .57, .36]);
    } else if (chapter === 'experience') {
      addPiece(0, extruded(2.55, 1.55, .13, .13), 0xc5c9c2, [-.35, .64, -.15], [-.77, .08, -.14]);
      addPiece(1, extruded(2.55, 1.55, .13, .13), 0x343a37, [.23, .02, .06], [-.77, -.08, .05]);
      addPiece(2, extruded(2.55, 1.55, .13, .13), 0x929a92, [-.08, -.61, -.09], [-.77, .15, -.07]);
    } else {
      addPiece(0, extruded(1.85, 1.85, .14, .09, .13), 0x343a37, [-.47, .39, -.22], [.03, -.34, -.09]);
      addPiece(1, extruded(1.85, 1.85, .14, .09, .13), 0xc5c9c2, [.41, .26, .12], [.08, .57, .04]);
      addPiece(2, extruded(1.85, 1.85, .14, .09, .13), 0x8c958c, [-.13, -.48, .29], [.79, .15, -.12]);
      addPiece(3, extruded(1.85, 1.85, .14, .09, .13), 0x59625b, [.18, -.07, -.48], [-.38, 1.12, .08]);
    }

    const groundMaterial = new THREE.ShadowMaterial({ color: 0x3d443e, opacity: .13, depthWrite: false });
    materials.add(groundMaterial);
    const ground = mesh(geometry(new THREE.PlaneGeometry(30, 30)), groundMaterial, scene);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.84;
    ground.castShadow = false;
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 63);
      gradient.addColorStop(0, 'rgba(34,41,34,.19)');
      gradient.addColorStop(.4, 'rgba(34,41,34,.1)');
      gradient.addColorStop(1, 'rgba(34,41,34,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(shadowCanvas);
      textures.add(texture);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: .64 });
      materials.add(material);
      const contact = mesh(geometry(new THREE.PlaneGeometry(4.7, 3.1)), material, scene);
      contact.rotation.x = -Math.PI / 2;
      contact.position.set(.08, -1.83, .08);
      contact.castShadow = contact.receiveShadow = false;
    }
  }

  function update(instant = false, dt = 1 / 60) {
    if (!assembly) return false;
    const amount = instant ? 1 : 1 - Math.exp(-dt * 7);
    const intendedX = paused ? 0 : targetX;
    const intendedY = paused ? 0 : targetY;
    tiltX += (intendedX - tiltX) * amount;
    tiltY += (intendedY - tiltY) * amount;
    let changed = Math.abs(intendedX - tiltX) + Math.abs(intendedY - tiltY) > .0002;
    assembly.rotation.set(-.025 + tiltY * .035, -.27 + tiltX * .06, .015);
    pieces.forEach((piece, index) => {
      const goal = index === selected ? 1 : 0;
      piece.emphasis += (goal - piece.emphasis) * amount;
      if (Math.abs(goal - piece.emphasis) < .0003) piece.emphasis = goal;
      else changed = true;
      const emphasis = piece.emphasis;
      piece.group.position.copy(piece.position);
      piece.group.position.z += emphasis * .25 - .075;
      piece.group.position.y += chapter === 'experience' ? emphasis * .075 : emphasis * .025;
      piece.group.rotation.set(
        piece.rotation.x + (chapter === 'experience' ? emphasis * .065 : 0),
        piece.rotation.y + emphasis * (index % 2 ? -.065 : .065),
        piece.rotation.z,
      );
      piece.face.color.copy(piece.colour).multiplyScalar(.96 + emphasis * .11);
    });
    scene.updateMatrixWorld(true);
    return changed;
  }
  function render() {
    if (!renderer || destroyed || unavailable || !width || !height) return;
    try { renderer.render(scene, camera); } catch { fail(); }
  }
  function canAnimate() { return !destroyed && !unavailable && !paused && visible && !document.hidden; }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    const dt = Math.min(.05, (now - (last || now - 16.67)) / 1000);
    last = now;
    moving = update(false, dt);
    render();
    if (moving && canAnimate()) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function wake() {
    if (destroyed || unavailable) return;
    if (paused) {
      moving = update(true);
      if (visible && !document.hidden) render();
    } else if (canAnimate() && !frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function resize() {
    if (!renderer || destroyed || unavailable) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (rect.width === width && rect.height === height) return;
    width = rect.width;
    height = rect.height;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = Math.max(2.22, 2.0 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    update(true);
    if (visible && !document.hidden) render();
  }
  function setSelection(index) {
    if (destroyed || !Number.isInteger(index) || index < 0 || index >= count) return false;
    if (selected === index) return true;
    selected = index;
    moving = true;
    wake();
    return true;
  }
  function pauseChanged() {
    const next = manualPaused || reduced.matches;
    if (paused === next) return;
    paused = next;
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    targetX = targetY = 0;
    moving = update(true);
    if (visible && !document.hidden) render();
  }
  function setPaused(value) {
    if (destroyed) return;
    manualPaused = Boolean(value);
    pauseChanged();
  }
  function visibilityChanged() {
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    } else {
      resize();
      wake();
    }
  }
  function hit(x, y) {
    if (!ready || unavailable || destroyed) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickable, false)[0]?.object.userData.index ?? null;
  }
  function down(event) {
    if (event.button !== 0 || pressed) return;
    const index = hit(event.clientX, event.clientY);
    if (index === null) return;
    pressed = { index, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional. */ }
  }
  function move(event) {
    if (pressed && pressed.id === event.pointerId && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 8) pressed.moved = true;
    if (event.pointerType === 'touch' || unavailable || destroyed) return;
    canvas.style.cursor = hit(event.clientX, event.clientY) === null ? 'default' : 'pointer';
    if (paused) return;
    const rect = canvas.getBoundingClientRect();
    targetX = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1);
    targetY = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1);
    wake();
  }
  function cancelPointer() {
    const press = pressed;
    pressed = null;
    if (press) {
      try { canvas.releasePointerCapture(press.id); } catch { /* Already released. */ }
    }
  }
  function up(event) {
    if (!pressed || pressed.id !== event.pointerId) return;
    const press = pressed;
    const index = hit(event.clientX, event.clientY);
    cancelPointer();
    if (!press.moved && index === press.index) {
      setSelection(index);
      onSelect?.(index);
    }
  }
  function leave() {
    targetX = targetY = 0;
    canvas.style.cursor = 'default';
    if (!paused) wake();
  }
  function disposeGraphics() {
    for (const item of geometries) item.dispose();
    for (const item of materials) item.dispose();
    for (const item of textures) item.dispose();
    shadowLight?.shadow.map?.dispose();
    shadowLight?.shadow.mapPass?.dispose();
    environment?.dispose();
    renderer?.dispose();
  }
  function fail() {
    if (destroyed || unavailable) return;
    unavailable = true;
    ready = false;
    moving = false;
    cancelPointer();
    cancelAnimationFrame(frame);
    frame = 0;
    queueMicrotask(() => { if (!destroyed) onUnavailable?.(); });
  }
  function contextLost(event) { event.preventDefault(); fail(); }
  function getState() {
    return { kind: chapter, count, selected, paused, visible: visible && !document.hidden, ready, unavailable, moving, destroyed };
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    ready = false;
    moving = false;
    cancelPointer();
    cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    reduced.removeEventListener('change', pauseChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('pointercancel', cancelPointer);
    canvas.removeEventListener('lostpointercapture', cancelPointer);
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.style.touchAction = before.touchAction;
    canvas.style.cursor = before.cursor;
    for (const [name, value] of [['aria-hidden', before.ariaHidden], ['tabindex', before.tabIndex]]) {
      if (value === null) canvas.removeAttribute(name);
      else canvas.setAttribute(name, value);
    }
    disposeGraphics();
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibilityChanged);
  reduced.addEventListener('change', pauseChanged);
  try {
    build();
    update(true);
    resize();
    if (!unavailable) {
      ready = true;
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visibilityChanged();
      });
      visibilityObserver.observe(canvas);
      queueMicrotask(() => { if (!destroyed && !unavailable) onReady?.(); });
    }
  } catch { fail(); }

  return { setSelection, setPaused, destroy, getState };
}
