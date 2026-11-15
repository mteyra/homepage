import * as THREE from '../assets/vendor/three.module.js';

// The original three-piece M, permanently in its assembled pose.
// Its three pieces are ordinary destinations, not an alignment task.
const COUNT = 3;
const valid = index => Number.isInteger(index) && index >= 0 && index < COUNT;
const pagePieces = { about: null, studies: 0, experience: 1, projects: 2 };
const clamp = value => Math.max(-1, Math.min(1, value));

export function createMonogram(canvas, { onPreview, onNavigate, onReady, onUnavailable } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const before = {
    hidden: canvas.getAttribute('aria-hidden'),
    tabIndex: canvas.getAttribute('tabindex'),
    touchAction: canvas.style.touchAction,
    cursor: canvas.style.cursor,
  };
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  canvas.style.touchAction = 'pan-y pinch-zoom';

  let page = 'about', preview = null, hover = null, manualPaused = null, paused = reduced.matches;
  let active = true, visible = true, ready = false, unavailable = false, destroyed = false;
  let renderer, scene, camera, sculpture, environment, key, resizeObserver, visibilityObserver;
  let frame = 0, last = 0, width = 0, height = 0, moving = false, pressed = null, disposed = false;
  let tiltX = 0, tiltY = 0, targetX = 0, targetY = 0;
  const pieces = [], pickable = [];
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

  function material(options) {
    const value = new THREE.MeshPhysicalMaterial(options);
    materials.add(value); return value;
  }
  function mesh(shape, finish, parent = sculpture) {
    geometries.add(shape);
    const value = new THREE.Mesh(shape, finish);
    value.castShadow = value.receiveShadow = true;
    parent.add(value); return value;
  }
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0xeeefed, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
    sculpture = new THREE.Group();
    sculpture.rotation.set(-.02, -.19, 0);
    sculpture.position.y = -.07;
    scene.add(sculpture);
    const hitAssembly = new THREE.Group();
    hitAssembly.rotation.copy(sculpture.rotation);
    hitAssembly.position.copy(sculpture.position);
    scene.add(hitAssembly);

    // Original broad reflectors, negative fill and narrow bevel light.
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
    try { environment = pmrem.fromScene(studio, .04, .1, 30, { size: 128 }); scene.environment = environment.texture; }
    finally { studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); pmrem.dispose(); }

    scene.add(new THREE.HemisphereLight(0xffffff, 0x7b807a, 1.15));
    key = new THREE.DirectionalLight(0xffffff, 3.25);
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

    const graphite = material({ color: 0x333735, roughness: .33, metalness: .88, clearcoat: .32, clearcoatRoughness: .28 });
    const graphiteSides = material({ color: 0x6d726e, roughness: .25, metalness: .94, clearcoat: .36, clearcoatRoughness: .2 });
    const silver = material({ color: 0xbec2bc, roughness: .29, metalness: .94, clearcoat: .3, clearcoatRoughness: .22 });
    const silverSides = material({ color: 0xdde0db, roughness: .2, metalness: .96, clearcoat: .4, clearcoatRoughness: .2 });
    function extrude(points) {
      const path = new THREE.Shape();
      points.forEach(([x, y], index) => index ? path.lineTo(x, y) : path.moveTo(x, y));
      path.closePath();
      const value = new THREE.ExtrudeGeometry(path, {
        depth: .64, steps: 1, bevelEnabled: true,
        bevelThickness: .055, bevelSize: .055, bevelSegments: 5, curveSegments: 12,
      });
      value.translate(0, 0, -.32);
      return value;
    }
    const upright = [[-.33,-1.55],[.33,-1.55],[.33,1.55],[-.33,1.55]];
    const chevron = [[-1.18,1.55],[0,-.08],[1.18,1.55],[1.18,.53],[0,-1.1],[-1.18,.53]];
    for (let index = 0; index < COUNT; index++) {
      const group = new THREE.Group();
      sculpture.add(group);
      const body = mesh(extrude(index === 1 ? chevron : upright), [index === 1 ? silver : graphite, index === 1 ? silverSides : graphiteSides], group);
      body.userData.index = index;
      const position = new THREE.Vector3(index === 0 ? -1.63 : index === 2 ? 1.63 : 0, 0, 0);
      group.position.copy(position);
      // Keep the hit surface in the assembled pose. Lifting the visible piece
      // must not move its boundary out from under a stationary pointer.
      const target = new THREE.Mesh(body.geometry, body.material);
      target.visible = false;
      target.position.copy(position);
      target.userData.index = index;
      hitAssembly.add(target); pickable.push(target);
      pieces.push({ group, position, emphasis: 0, pageEmphasis: 0 });
    }

    const groundMaterial = new THREE.ShadowMaterial({ color: 0x3d443e, opacity: .17, depthWrite: false });
    materials.add(groundMaterial);
    const ground = mesh(new THREE.PlaneGeometry(60, 60), groundMaterial, scene);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.88;
    ground.castShadow = false; ground.receiveShadow = true;

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 63);
      gradient.addColorStop(0, 'rgba(34,41,34,.23)');
      gradient.addColorStop(.36, 'rgba(34,41,34,.15)');
      gradient.addColorStop(1, 'rgba(34,41,34,0)');
      context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(shadowCanvas); textures.add(texture);
      const finish = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: .84 });
      materials.add(finish);
      const ambient = mesh(new THREE.PlaneGeometry(5.9, 3.8), finish, scene);
      ambient.rotation.x = -Math.PI / 2; ambient.position.set(.1, -1.87, .15); ambient.scale.setScalar(.955);
      ambient.castShadow = ambient.receiveShadow = false;
    }
  }
  function update(instant = false, dt = 1 / 60) {
    const amount = instant ? 1 : 1 - Math.exp(-dt * 12);
    let changed = false;
    const intendedX = paused ? 0 : targetX, intendedY = paused ? 0 : targetY;
    tiltX += (intendedX - tiltX) * amount; tiltY += (intendedY - tiltY) * amount;
    if (Math.abs(intendedX - tiltX) < .0003) tiltX = intendedX; else changed = true;
    if (Math.abs(intendedY - tiltY) < .0003) tiltY = intendedY; else changed = true;
    sculpture?.rotation.set(-.02 + tiltY * .028, -.19 + tiltX * .055, 0);
    pieces.forEach((piece, index) => {
      const target = index === preview ? 1 : 0;
      piece.emphasis += (target - piece.emphasis) * amount;
      if (Math.abs(target - piece.emphasis) < .0003) piece.emphasis = target;
      else changed = true;
      const chapterTarget = index === pagePieces[page] ? 1 : 0;
      piece.pageEmphasis += (chapterTarget - piece.pageEmphasis) * amount;
      if (Math.abs(chapterTarget - piece.pageEmphasis) < .0003) piece.pageEmphasis = chapterTarget;
      else changed = true;
      piece.group.position.copy(piece.position);
      piece.group.position.y += Math.max(piece.emphasis * .16, piece.pageEmphasis * .12);
      piece.group.position.z += Math.max(piece.emphasis * .09, piece.pageEmphasis * .14);
    });
    scene?.updateMatrixWorld(true);
    return changed;
  }
  function render() {
    if (!renderer || destroyed || unavailable || !active || !visible || document.hidden || !width || !height) return;
    try { renderer.render(scene, camera); } catch { fail(); }
  }
  function resize() {
    if (!renderer || destroyed || unavailable) return;
    const rect = canvas.getBoundingClientRect();
    // FLIP may scale the mounted stage while its layout size has already
    // changed. Size the drawing surface to layout, not that temporary scale.
    const nextWidth = canvas.clientWidth || rect.width, nextHeight = canvas.clientHeight || rect.height;
    if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return;
    width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const distance = Math.max(9.25, 4.2 / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect));
    camera.position.set(0, 2, distance - .23);
    camera.lookAt(0, .30, 0);
    camera.updateProjectionMatrix();
    moving = update(true); render();
  }
  function canAnimate() { return !destroyed && !unavailable && active && visible && !paused && !document.hidden; }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    const dt = Math.min(.05, (now - (last || now - 16.67)) / 1000); last = now;
    moving = update(false, dt); render();
    if (moving && canAnimate()) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() {
    if (destroyed || unavailable) return;
    if (!canAnimate()) { moving = update(true); render(); }
    else if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function setPreview(index) {
    if (destroyed || (index !== null && !valid(index))) return false;
    if (preview === index) return true;
    preview = index; wake(); return true;
  }
  function setPage(value) {
    if (destroyed || !Object.hasOwn(pagePieces, value)) return false;
    if (page === value) return true;
    page = value; targetX = targetY = 0; wake(); return true;
  }
  function nativePreview(index) {
    if (destroyed || !active || hover === index) return;
    hover = index; setPreview(index);
    onPreview?.(index);
  }
  function pauseChanged() {
    const next = manualPaused ?? reduced.matches;
    if (paused === next || destroyed) return;
    paused = next; cancelAnimationFrame(frame); frame = 0; last = 0; targetX = targetY = 0;
    moving = update(true); render();
  }
  function setPaused(value) { if (!destroyed) { manualPaused = Boolean(value); pauseChanged(); } }
  function setActive(value) {
    if (destroyed || active === Boolean(value)) return;
    active = Boolean(value);
    if (!active) {
      cancelPointer(); cancelAnimationFrame(frame); frame = 0; last = 0;
      hover = preview = null; targetX = targetY = 0; canvas.style.cursor = 'default'; moving = update(true);
    } else { resize(); moving = update(true); render(); }
  }
  function visibilityChanged() {
    if (destroyed) return;
    if (!visible || document.hidden || !active) {
      cancelPointer(); cancelAnimationFrame(frame); frame = 0; last = 0;
      targetX = targetY = 0; moving = update(true);
    } else { resize(); moving = update(true); render(); }
  }
  function hit(clientX, clientY) {
    if (!ready || unavailable || destroyed || !active || !visible || document.hidden) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickable, false)[0]?.object.userData.index ?? null;
  }
  function down(event) {
    if (event.button !== 0 || event.isPrimary === false || pressed) return;
    const index = hit(event.clientX, event.clientY);
    if (index === null) return;
    pressed = { id: event.pointerId, index, pointerType: event.pointerType, x: event.clientX, y: event.clientY, moved: false };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional. */ }
    if (event.pointerType === 'touch') nativePreview(index);
  }
  function move(event) {
    if (destroyed || unavailable || !active) return;
    if (pressed && event.pointerId === pressed.id && !pressed.moved && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 9) {
      pressed.moved = true;
      if (pressed.pointerType === 'touch') nativePreview(null);
    }
    if (event.pointerType === 'touch') return;
    if (!paused) {
      const rect = canvas.getBoundingClientRect();
      targetX = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1);
      targetY = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1);
      wake();
    }
    const index = hit(event.clientX, event.clientY);
    canvas.style.cursor = index === null ? 'default' : 'pointer';
    nativePreview(index);
  }
  function cancelPointer() {
    const press = pressed; pressed = null;
    if (press) { try { canvas.releasePointerCapture(press.id); } catch { /* Already released. */ } }
    if (press?.pointerType === 'touch') nativePreview(null);
  }
  function up(event) {
    if (!pressed || event.pointerId !== pressed.id) return;
    const press = pressed, index = hit(event.clientX, event.clientY);
    const moved = press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9;
    cancelPointer();
    if (!moved && index === press.index) onNavigate?.(index);
  }
  function leave() { targetX = targetY = 0; canvas.style.cursor = 'default'; nativePreview(null); wake(); }
  function windowBlur() { cancelPointer(); leave(); }
  function disposeGraphics() {
    if (disposed) return;
    disposed = true;
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    for (const value of textures) value.dispose();
    key?.shadow.map?.dispose(); key?.shadow.mapPass?.dispose(); environment?.dispose();
    if (renderer) {
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    }
  }
  function fail() {
    if (destroyed || unavailable) return;
    unavailable = true; ready = false; moving = false;
    cancelPointer(); cancelAnimationFrame(frame); frame = 0;
    disposeGraphics();
    queueMicrotask(() => { if (!destroyed) onUnavailable?.(); });
  }
  function contextLost(event) { event.preventDefault(); fail(); }
  function getState() { return { count: COUNT, page, pagePiece: pagePieces[page], preview, hover, paused, active, visible: visible && !document.hidden, ready, unavailable, moving, destroyed, parallax: { x: tiltX, y: tiltY } }; }
  function destroy() {
    if (destroyed) return;
    destroyed = true; ready = false; moving = false;
    cancelPointer(); cancelAnimationFrame(frame); frame = 0;
    resizeObserver?.disconnect(); visibilityObserver?.disconnect();
    reduced.removeEventListener('change', pauseChanged); document.removeEventListener('visibilitychange', visibilityChanged); window.removeEventListener('blur', windowBlur);
    for (const [name, handler] of listeners) canvas.removeEventListener(name, handler);
    canvas.style.touchAction = before.touchAction; canvas.style.cursor = before.cursor;
    for (const [name, value] of [['aria-hidden', before.hidden], ['tabindex', before.tabIndex]]) { if (value === null) canvas.removeAttribute(name); else canvas.setAttribute(name, value); }
    disposeGraphics();
  }
  const listeners = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointerleave', leave], ['pointercancel', cancelPointer], ['lostpointercapture', cancelPointer], ['webglcontextlost', contextLost]];
  for (const [name, handler] of listeners) canvas.addEventListener(name, handler);
  reduced.addEventListener('change', pauseChanged); document.addEventListener('visibilitychange', visibilityChanged); window.addEventListener('blur', windowBlur);
  try {
    build(); update(true); resize();
    if (!unavailable) {
      ready = true;
      resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
      visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibilityChanged(); }); visibilityObserver.observe(canvas);
      queueMicrotask(() => { if (!destroyed && !unavailable) onReady?.(); });
    }
  } catch { fail(); }
  return { setPage, setPreview, setPaused, setActive, destroy, getState };
}
