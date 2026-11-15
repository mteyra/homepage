import * as THREE from '../assets/vendor/three.module.js';

const REST_YAW = -.19, REST_PITCH = -.02;
const YAW_LIMIT = .65, PITCH_LIMIT = .2;
const pages = ['about', 'studies', 'experience', 'projects'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A single typographic glyph. Dragging inspects it without changing the page.
export function createMonogram(canvas, { onReady, onUnavailable } = {}) {
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

  let page = 'about', manualPaused = null, paused = reduced.matches;
  let active = true, visible = true, ready = false, unavailable = false, destroyed = false;
  let renderer, scene, camera, sculpture, environment, key, resizeObserver, visibilityObserver;
  let frame = 0, last = 0, width = 0, height = 0, moving = false, pressed = null, disposed = false;
  let yaw = REST_YAW, pitch = REST_PITCH, targetYaw = yaw, targetPitch = pitch;
  let glyph;
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
    sculpture.rotation.set(pitch, yaw, 0, 'YXZ');
    sculpture.position.y = -.07;
    scene.add(sculpture);

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

    const graphite = material({
      color: 0x343735, roughness: .42, metalness: .65,
      clearcoat: .1, clearcoatRoughness: .4, envMapIntensity: .55,
    });
    const path = new THREE.Shape();
    path.moveTo(-1.9, -1.25);
    path.lineTo(-1.9, 1.12);
    path.lineTo(-1.47, 1.12);
    path.lineTo(-1.47, .80);
    path.bezierCurveTo(-1.25, 1.10, -1.03, 1.28, -.63, 1.28);
    path.bezierCurveTo(-.22, 1.28, .03, 1.06, .15, .79);
    path.bezierCurveTo(.38, 1.10, .70, 1.28, 1.06, 1.28);
    path.bezierCurveTo(1.6, 1.28, 1.9, .93, 1.9, .32);
    path.lineTo(1.9, -1.25);
    path.lineTo(1.38, -1.25);
    path.lineTo(1.38, .24);
    path.bezierCurveTo(1.38, .64, 1.20, .83, .9, .83);
    path.bezierCurveTo(.6, .83, .25, .59, .25, .2);
    path.lineTo(.25, -1.25);
    path.lineTo(-.25, -1.25);
    path.lineTo(-.25, .24);
    path.bezierCurveTo(-.25, .64, -.43, .83, -.73, .83);
    path.bezierCurveTo(-1.03, .83, -1.38, .59, -1.38, .2);
    path.lineTo(-1.38, -1.25);
    path.closePath();
    const shape = new THREE.ExtrudeGeometry(path, {
      depth: .48, steps: 1, bevelEnabled: true,
      bevelThickness: .04, bevelSize: .04, bevelSegments: 4, curveSegments: 32,
    });
    shape.translate(0, 0, -.24);
    glyph = mesh(shape, graphite);

    const groundMaterial = new THREE.ShadowMaterial({ color: 0x3d443e, opacity: .17, depthWrite: false });
    materials.add(groundMaterial);
    const ground = mesh(new THREE.PlaneGeometry(60, 60), groundMaterial, scene);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.40;
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
      ambient.rotation.x = -Math.PI / 2; ambient.position.set(.1, -1.39, .15); ambient.scale.setScalar(.955);
      ambient.castShadow = ambient.receiveShadow = false;
    }
  }
  function update(instant = false, dt = 1 / 60) {
    const amount = instant ? 1 : 1 - Math.exp(-dt * 14);
    yaw += (targetYaw - yaw) * amount;
    pitch += (targetPitch - pitch) * amount;
    let changed = false;
    if (Math.abs(targetYaw - yaw) < .0003) yaw = targetYaw; else changed = true;
    if (Math.abs(targetPitch - pitch) < .0003) pitch = targetPitch; else changed = true;
    // Local pitch precedes yaw, keeping the feet clear of the ground throughout inspection.
    sculpture?.rotation.set(pitch, yaw, 0, 'YXZ');
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
    // Size to layout while the shared stage moves between page compositions.
    const nextWidth = canvas.clientWidth || rect.width, nextHeight = canvas.clientHeight || rect.height;
    if (!nextWidth || !nextHeight || (width === nextWidth && height === nextHeight)) return;
    width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const distance = Math.max(9.25, 4.2 / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect));
    camera.position.set(0, 2, distance - .23);
    camera.lookAt(0, .30, 0);
    camera.updateProjectionMatrix();
    update(false, 0); render();
  }
  function canAnimate() { return !destroyed && !unavailable && active && visible && !paused && !reduced.matches && !document.hidden; }
  function canManipulate() { return ready && canAnimate(); }
  function freezeMotion() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    targetYaw = yaw; targetPitch = pitch; moving = false;
    update(true);
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) { freezeMotion(); return; }
    const dt = Math.min(.05, (now - (last || now - 16.67)) / 1000); last = now;
    moving = update(false, dt); render();
    if (moving && canAnimate()) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() {
    if (destroyed || unavailable) return;
    if (!canAnimate()) { freezeMotion(); return; }
    if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function setPage(value) {
    if (destroyed || !pages.includes(value)) return false;
    page = value;
    return true;
  }
  function pauseChanged() {
    const next = reduced.matches || Boolean(manualPaused);
    if (paused === next || destroyed) return;
    paused = next; cancelPointer(); freezeMotion();
    canvas.style.cursor = 'default';
  }
  function setPaused(value) { if (!destroyed) { manualPaused = Boolean(value); pauseChanged(); } }
  function setActive(value) {
    if (destroyed || active === Boolean(value)) return;
    active = Boolean(value);
    if (!active) { cancelPointer(); freezeMotion(); canvas.style.cursor = 'default'; }
    else { resize(); update(false, 0); render(); }
  }
  function visibilityChanged() {
    if (destroyed) return;
    if (!visible || document.hidden || !active) {
      cancelPointer(); freezeMotion(); canvas.style.cursor = 'default';
    } else { resize(); update(false, 0); render(); }
  }
  function hit(clientX, clientY) {
    if (!canManipulate() || !glyph) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(glyph, false).length > 0;
  }
  function down(event) {
    if (event.button !== 0 || event.isPrimary === false || pressed || !canManipulate()) return;
    if (!hit(event.clientX, event.clientY)) return;
    freezeMotion();
    pressed = { id: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY, yaw, pitch, dragging: false };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional. */ }
    if (event.pointerType !== 'touch' && event.cancelable) event.preventDefault();
    canvas.style.cursor = 'grab';
  }
  function move(event) {
    if (!canManipulate()) { canvas.style.cursor = 'default'; return; }
    if (pressed && event.pointerId === pressed.id) {
      const dx = event.clientX - pressed.x, dy = event.clientY - pressed.y;
      if (pressed.pointerType === 'touch') {
        // Once a gesture becomes vertical, release it to the browser. With no
        // active press, later horizontal movement in that gesture cannot rotate.
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.05) {
          cancelPointer(); freezeMotion(); return;
        }
        if (!pressed.dragging && (Math.abs(dx) < 7 || Math.abs(dx) <= Math.abs(dy) * 1.05)) return;
      } else if (!pressed.dragging && Math.hypot(dx, dy) < 3) return;
      pressed.dragging = true;
      canvas.style.cursor = 'grabbing';
      if (event.cancelable) event.preventDefault();
      const scale = Math.max(240, Math.min(width, height) * 1.25);
      targetYaw = clamp(pressed.yaw + dx / scale * 1.3, REST_YAW - YAW_LIMIT, REST_YAW + YAW_LIMIT);
      targetPitch = pressed.pointerType === 'touch' ? pressed.pitch : clamp(pressed.pitch + dy / scale * .65, REST_PITCH - PITCH_LIMIT, REST_PITCH + PITCH_LIMIT);
      wake();
      return;
    }
    if (event.pointerType !== 'touch') canvas.style.cursor = hit(event.clientX, event.clientY) ? 'grab' : 'default';
  }
  function cancelPointer() {
    const press = pressed; pressed = null;
    if (!press) return;
    canvas.style.cursor = 'default';
    try { canvas.releasePointerCapture(press.id); } catch { /* Already released. */ }
  }
  function up(event) {
    if (!pressed || event.pointerId !== pressed.id) return;
    cancelPointer();
    if (event.pointerType !== 'touch') canvas.style.cursor = hit(event.clientX, event.clientY) ? 'grab' : 'default';
  }
  function leave() { if (!pressed?.dragging) canvas.style.cursor = 'default'; }
  function windowBlur() { cancelPointer(); freezeMotion(); canvas.style.cursor = 'default'; }
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
    cancelPointer(); freezeMotion();
    disposeGraphics();
    queueMicrotask(() => { if (!destroyed) onUnavailable?.(); });
  }
  function contextLost(event) { event.preventDefault(); fail(); }
  function getState() {
    return {
      count: 1, page, dragging: Boolean(pressed?.dragging), pressed: Boolean(pressed),
      paused, active, visible: visible && !document.hidden, ready, unavailable, moving, destroyed,
      rotation: { yaw, pitch }, target: { yaw: targetYaw, pitch: targetPitch },
      bounds: { yaw: [REST_YAW - YAW_LIMIT, REST_YAW + YAW_LIMIT], pitch: [REST_PITCH - PITCH_LIMIT, REST_PITCH + PITCH_LIMIT] },
    };
  }
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
  return { setPage, setPaused, setActive, destroy, getState };
}
