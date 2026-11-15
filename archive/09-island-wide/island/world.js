import * as THREE from '../assets/vendor/three.module.js';

// Three separate pieces, one quiet monogram. The small controller also runs
// without WebGL, so accompanying HTML controls never depend on the renderer.
const COUNT = 3;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const snap = t => 1 + 1.24 * Math.pow(t - 1, 3) + .24 * Math.pow(t - 1, 2);

export function createSculpture(canvas, { onReady, onUnavailable, onProgress } = {}) {
  const parts = Array.from({ length: COUNT }, () => ({ alignment: 0, solved: false, tween: null }));
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let selected = 0, complete = false, assembly = 0, assemblyTween = null;
  let paused = reduced?.matches ?? false, active = true, destroyed = false;
  let unavailable = false, graphics = null, phase = 'ready', generation = 0;
  let raf = 0, timer = 0, last = 0, idleTime = 0, emitted = false, pointerDown = null;
  let pointerX = 0, pointerY = 0, hover = -1;
  const before = {
    touchAction: canvas.style.touchAction,
    cursor: canvas.style.cursor,
    tabindex: canvas.getAttribute('tabindex'),
    label: canvas.getAttribute('aria-label'),
    role: canvas.getAttribute('role'),
  };
  canvas.style.touchAction = 'pan-y pinch-zoom';
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  if (!before.role) canvas.setAttribute('role', 'group');
  if (!before.label) canvas.setAttribute('aria-label', 'Three-piece M sculpture. Click a piece to align it. Left and right arrows choose a piece; Enter aligns it.');

  function valid(index) { return Number.isInteger(index) && index >= 0 && index < COUNT; }
  function getState() {
    return { selected, solved: parts.map(part => part.solved), complete, phase, paused };
  }
  function notify() {
    emitted = true;
    onProgress?.(getState());
  }
  function failed() {
    if (destroyed || unavailable) return;
    unavailable = true;
    cancelAnimationFrame(raf); raf = 0;
    queueMicrotask(() => { if (!destroyed) onUnavailable?.(); });
  }
  function moving() { return Boolean(assemblyTween || parts.some(part => part.tween)); }
  function advance(now, instant = false) {
    const turn = generation;
    for (let i = 0; i < COUNT; i++) {
      if (turn !== generation) return;
      const part = parts[i], tween = part.tween;
      if (!tween) continue;
      const t = instant ? 1 : clamp((now - tween.start) / tween.duration);
      part.alignment = tween.from + (tween.to - tween.from) * (tween.to === 1 ? snap(t) : ease(t));
      if (t < 1) continue;
      part.alignment = tween.to;
      part.tween = null;
      if (tween.to === 1 && !part.solved) {
        part.solved = true;
        if (parts.every(item => item.solved)) {
          complete = true;
          phase = 'settling';
          assemblyTween = { from: assembly, to: 1, start: now + 100, duration: 1050 };
        } else {
          const next = parts.findIndex(item => !item.solved);
          if (next >= 0) selected = next;
        }
        notify();
      }
    }
    if (turn !== generation) return;
    if (assemblyTween) {
      const tween = assemblyTween;
      const t = instant ? 1 : clamp((now - tween.start) / tween.duration);
      assembly = tween.from + (tween.to - tween.from) * ease(t);
      if (t === 1) {
        assembly = tween.to;
        assemblyTween = null;
        if (complete) { phase = 'complete'; notify(); }
      }
    }
    if (!moving() && !complete && phase !== 'ready') {
      phase = 'ready';
      notify();
    }
  }
  function draw(dt = 0, instant = false) {
    if (!graphics || unavailable || destroyed) return;
    try {
      graphics.draw({
        parts, selected, complete, assembly, paused, idleTime, pointerX, pointerY, hover,
      }, dt, instant);
    } catch { failed(); }
  }
  function schedule() {
    clearTimeout(timer); timer = 0;
    if (destroyed || paused) return;
    const times = parts.filter(part => part.tween).map(part => part.tween.start + part.tween.duration);
    if (assemblyTween) times.push(assemblyTween.start + assemblyTween.duration);
    if (!times.length) return;
    timer = setTimeout(() => {
      timer = 0;
      advance(performance.now());
      if (active && !document.hidden) draw();
      schedule();
    }, Math.max(16, Math.min(...times) - performance.now() + 3));
  }
  function tick(now) {
    raf = 0;
    if (destroyed || unavailable || !active || paused || document.hidden) return;
    // Idle drift is restrained and capped at 30fps; alignment is full cadence.
    if (!moving() && last && now - last < 32) { raf = requestAnimationFrame(tick); return; }
    const dt = Math.min(.045, Math.max(0, (now - (last || now)) / 1000));
    last = now; idleTime += dt;
    advance(now);
    draw(dt);
    raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (destroyed) return;
    if (paused) {
      advance(performance.now(), true);
      draw(0, true);
    } else if (active && !unavailable && !document.hidden && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
    schedule();
  }
  function select(index) {
    if (destroyed || !valid(index)) return false;
    if (selected === index) return true;
    selected = index;
    notify();
    if (paused) draw(0, true);
    else wake();
    return true;
  }
  function align(index = selected) {
    if (destroyed || !valid(index) || phase === 'resetting') return false;
    const part = parts[index];
    if (part.solved || part.tween?.to === 1) return false;
    const now = performance.now();
    advance(now);
    if (destroyed || part.solved || phase === 'resetting') return false;
    selected = index;
    part.tween = { from: part.alignment, to: 1, start: now, duration: 850 };
    phase = 'aligning';
    notify();
    wake();
    return true;
  }
  function cancelPointer() {
    const press = pointerDown;
    pointerDown = null;
    if (press) {
      try { canvas.releasePointerCapture(press.id); } catch { /* Already released. */ }
    }
  }
  function reset() {
    if (destroyed) return;
    cancelPointer();
    generation++;
    selected = 0; complete = false; phase = 'resetting';
    const now = performance.now();
    parts.forEach((part, i) => {
      part.solved = false;
      part.tween = { from: part.alignment, to: 0, start: now + (paused ? 0 : i * 45), duration: 850 };
    });
    assemblyTween = { from: assembly, to: 0, start: now, duration: 950 };
    notify();
    wake();
  }
  function setPaused(value) {
    paused = Boolean(value);
    if (paused) {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(timer); timer = 0;
      advance(performance.now(), true);
      pointerX = pointerY = 0;
      draw(0, true);
    } else wake();
  }
  function setActive(value) {
    active = Boolean(value);
    if (!active) { cancelAnimationFrame(raf); raf = 0; }
    else { advance(performance.now()); draw(0, true); wake(); }
    schedule();
  }
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (active) { advance(performance.now()); draw(0, true); wake(); }
    schedule();
  }
  function down(event) {
    if (event.button !== 0 || unavailable || !graphics || pointerDown) return;
    const index = graphics.hit(event.clientX, event.clientY);
    if (index === null) return;
    canvas.focus({ preventScroll: true });
    pointerDown = { id: event.pointerId, index, x: event.clientX, y: event.clientY, moved: false };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional on older browsers. */ }
    if (event.pointerType !== 'touch') event.preventDefault();
  }
  function move(event) {
    if (!graphics || unavailable) return;
    if (pointerDown && pointerDown.id === event.pointerId) {
      if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 9) pointerDown.moved = true;
    }
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointerX = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1);
    pointerY = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1);
    hover = graphics.hit(event.clientX, event.clientY) ?? -1;
    canvas.style.cursor = hover >= 0 && !parts[hover].solved ? 'pointer' : 'default';
    if (paused) draw(0, true);
  }
  function up(event) {
    if (!pointerDown || event.pointerId !== pointerDown.id) return;
    const press = pointerDown;
    const hit = graphics?.hit(event.clientX, event.clientY);
    cancelPointer();
    if (!press.moved && hit === press.index) {
      select(press.index);
      align(press.index);
    }
  }
  function leave() {
    pointerX = pointerY = 0; hover = -1;
    canvas.style.cursor = 'default';
    if (paused) draw(0, true);
  }
  function keyboard(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      select((selected + (event.key === 'ArrowRight' ? 1 : COUNT - 1)) % COUNT);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); select(event.key === 'Home' ? 0 : COUNT - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); if (!event.repeat) align();
    }
  }
  function lost(event) { event.preventDefault(); cancelPointer(); failed(); schedule(); }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelPointer();
    cancelAnimationFrame(raf); clearTimeout(timer);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('pointercancel', cancelPointer);
    canvas.removeEventListener('lostpointercapture', cancelPointer);
    canvas.removeEventListener('keydown', keyboard);
    canvas.removeEventListener('webglcontextlost', lost);
    document.removeEventListener('visibilitychange', visibility);
    canvas.style.touchAction = before.touchAction;
    canvas.style.cursor = before.cursor;
    for (const [name, value] of [['tabindex', before.tabindex], ['aria-label', before.label], ['role', before.role]]) {
      if (value === null) canvas.removeAttribute(name); else canvas.setAttribute(name, value);
    }
    graphics?.destroy();
  }

  try {
    graphics = buildSculpture(canvas, () => { draw(0, true); wake(); });
    draw(0, true);
  } catch { failed(); }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('keydown', keyboard);
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  queueMicrotask(() => {
    if (destroyed) return;
    if (!emitted) notify();
    if (graphics && !unavailable) onReady?.();
    wake();
  });
  return { setPaused, setActive, reset, align, select, getState, destroy };
}

function buildSculpture(canvas, invalidate) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0xeeefed, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const geometry = new Set(), materials = new Set(), textures = new Set();
  const pieces = [], pickable = [];
  let width = 1, height = 1, distance = 9, disposed = false;
  let tiltX = 0, tiltY = 0;
  const raycaster = new THREE.Raycaster(), cursor = new THREE.Vector2();
  function material(options) {
    const value = new THREE.MeshPhysicalMaterial(options);
    materials.add(value); return value;
  }
  function mesh(shape, finish, parent = sculpture) {
    geometry.add(shape);
    const object = new THREE.Mesh(shape, finish);
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }

  // A studio rather than an outdoor HDRI: broad white reflectors, neutral
  // negative fill, and one narrow strip defining the bevel of each piece.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0xa4a7a5);
  for (const [x, y, z, w, h, color] of [
    [-5, 5, 3, 5, 7, 0xffffff],
    [4, 2, 4, 1.4, 8, 0xf1f3f0],
    [1, 7, -3, 8, 4, 0xffffff],
    [0, 0, 6, 3.5, 7, 0x242827],
    [5, -1, -1, 5, 7, 0x171b19],
    [-3, -5, 0, 7, 5, 0x585d59],
  ]) {
    const reflector = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    reflector.position.set(x, y, z); reflector.lookAt(0, 0, 0); studio.add(reflector);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .04, .1, 30, { size: 128 });
  scene.environment = environment.texture;
  studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7b807a, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 3.25);
  key.position.set(-3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  Object.assign(key.shadow.camera, { left: -4.2, right: 4.2, top: 4.2, bottom: -4.2, near: 1, far: 18 });
  key.shadow.bias = -.00005;
  key.shadow.normalBias = .02;
  key.shadow.radius = 10;
  key.shadow.blurSamples = 12;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9ede9, .9);
  fill.position.set(4, 1.8, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6);
  rim.position.set(-1, 4, -5); scene.add(rim);

  const graphite = material({
    color: 0x333735, roughness: .33, metalness: .88, clearcoat: .32, clearcoatRoughness: .28,
  });
  const graphiteSides = material({
    color: 0x6d726e, roughness: .25, metalness: .94, clearcoat: .36, clearcoatRoughness: .2,
  });
  const silver = material({
    color: 0xbec2bc, roughness: .29, metalness: .94, clearcoat: .3, clearcoatRoughness: .22,
  });
  const silverSides = material({
    color: 0xdde0db, roughness: .2, metalness: .96, clearcoat: .4, clearcoatRoughness: .2,
  });
  const faces = [graphite.clone(), silver, graphite.clone()];
  materials.add(faces[0]); materials.add(faces[2]);
  const frontColors = faces.map(face => face.color.clone());

  function extrude(points) {
    const path = new THREE.Shape();
    points.forEach(([x, y], index) => index ? path.lineTo(x, y) : path.moveTo(x, y));
    path.closePath();
    const object = new THREE.ExtrudeGeometry(path, {
      depth: .64, steps: 1, bevelEnabled: true,
      bevelThickness: .055, bevelSize: .055, bevelSegments: 5, curveSegments: 12,
    });
    object.translate(0, 0, -.32);
    return object;
  }
  const upright = [[-.33,-1.55],[.33,-1.55],[.33,1.55],[-.33,1.55]];
  const chevron = [[-1.18,1.55],[0,-.08],[1.18,1.55],[1.18,.53],[0,-1.1],[-1.18,.53]];
  const starts = [
    { position: new THREE.Vector3(-1.93, .20, -.06), rotation: new THREE.Euler(.08, -.76, -.20) },
    { position: new THREE.Vector3(-.06, .50, .30), rotation: new THREE.Euler(-.13, .78, -.28) },
    { position: new THREE.Vector3(1.92, -.03, .02), rotation: new THREE.Euler(.12, -.32, -.53) },
  ];
  const identity = new THREE.Quaternion();
  for (let i = 0; i < COUNT; i++) {
    const piece = new THREE.Group();
    sculpture.add(piece);
    const body = mesh(extrude(i === 1 ? chevron : upright), [faces[i], i === 1 ? silverSides : graphiteSides], piece);
    body.userData.piece = i;
    pickable.push(body);
    pieces.push({
      group: piece, body, start: starts[i].position,
      startRotation: new THREE.Quaternion().setFromEuler(starts[i].rotation),
      end: new THREE.Vector3(i === 0 ? -1.69 : i === 2 ? 1.69 : 0, i === 1 ? .025 : 0, 0),
      cue: 0,
    });
  }

  // Real, softly blurred cast shadows give the bevelled solids their depth.
  // The plane itself remains transparent so the CSS background is continuous.
  const groundMaterial = new THREE.ShadowMaterial({ color: 0x3d443e, opacity: .17, depthWrite: false });
  materials.add(groundMaterial);
  const ground = mesh(new THREE.PlaneGeometry(60, 60), groundMaterial, scene);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.88;
  ground.castShadow = false; ground.receiveShadow = true;

  // Wide ambient contact falloff under the same object softens the studio floor.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(34,41,34,.23)');
  gradient.addColorStop(.36, 'rgba(34,41,34,.15)');
  gradient.addColorStop(1, 'rgba(34,41,34,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  textures.add(shadowTexture);
  const ambientMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: .65,
  });
  materials.add(ambientMaterial);
  const ambient = mesh(new THREE.PlaneGeometry(5.9, 3.8), ambientMaterial, scene);
  ambient.rotation.x = -Math.PI / 2; ambient.position.set(.1, -1.87, .15);
  ambient.castShadow = ambient.receiveShadow = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || (rect.width === width && rect.height === height)) return;
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Include the cast shadow in the horizontal fit on a narrow canvas.
    distance = Math.max(9.25, 4.2 / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect));
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    draw(state, dt, instant) {
      if (disposed) return;
      const smooth = instant ? 1 : 1 - Math.exp(-Math.max(dt, .001) * 6);
      const drift = state.paused || state.complete ? 0 : Math.sin(state.idleTime * .35);
      const intendedX = state.paused ? 0 : state.pointerY * .045;
      const intendedY = state.paused ? 0 : state.pointerX * .09;
      tiltX += (intendedX - tiltX) * smooth;
      tiltY += (intendedY - tiltY) * smooth;
      sculpture.rotation.set(-.02 + tiltX, -.36 + state.assembly * .17 + tiltY + drift * .025, .01 * (1 - state.assembly));
      sculpture.position.y = .29 - state.assembly * .36 + drift * .026;
      pieces.forEach((piece, i) => {
        const part = state.parts[i], t = part.alignment;
        piece.group.position.lerpVectors(piece.start, piece.end, t);
        piece.group.quaternion.slerpQuaternions(piece.startRotation, identity, t);
        if (i === 0) piece.group.position.x += state.assembly * .06;
        if (i === 2) piece.group.position.x -= state.assembly * .06;
        if (i === 1) piece.group.position.y -= state.assembly * .025;
        const goal = !state.complete && !part.solved && (state.selected === i || state.hover === i) ? 1 : 0;
        piece.cue += (goal - piece.cue) * smooth;
        piece.group.position.z += piece.cue * .09 * (1 - clamp(t));
        faces[i].color.copy(frontColors[i]).multiplyScalar(1 + piece.cue * .14);
      });
      camera.position.set(0, 2.0, distance - state.assembly * .23);
      camera.lookAt(.16 * (1 - state.assembly), .30, 0);
      ambientMaterial.opacity = .65 + state.assembly * .19;
      ambient.scale.setScalar(1 - state.assembly * .045);
      scene.updateMatrixWorld(true);
      renderer.render(scene, camera);
    },
    hit(clientX, clientY) {
      if (disposed) return null;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      cursor.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(cursor, camera);
      return raycaster.intersectObjects(pickable, false)[0]?.object.userData.piece ?? null;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      for (const item of geometry) item.dispose();
      for (const item of materials) item.dispose();
      for (const item of textures) item.dispose();
      key.shadow.map?.dispose();
      key.shadow.mapPass?.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
