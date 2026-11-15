import * as THREE from '../assets/vendor/three.module.js';

// One physical instrument, four selectable leaves. This scene carries the
// chapter navigation; it is not a background illustration or a data display.
export function createObservatory(canvas, { onReady, onUnavailable, onSelect } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    let disposed = false;
    queueMicrotask(() => { if (!disposed) onUnavailable?.(); });
    return { select() {}, setPaused() {}, setActive() {}, reset() {}, destroy() { disposed = true; } };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x111619, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 70);
  camera.position.set(0, .18, 13.6);
  camera.lookAt(0, 0, 0);
  const instrument = new THREE.Group(); scene.add(instrument);
  instrument.rotation.set(.35, -.36, -.17);
  const core = new THREE.Group(); instrument.add(core);
  const faces = [], selectable = [], draggable = [], disposal = [], textures = [];
  const colors = [0xadc3c7, 0x99afb5, 0xc3ad7f, 0xa2b0b4];
  let selected = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = true, destroyed = false, contextUnavailable = false, raf = 0, last = 0, elapsed = 0;
  let drag = false, pointerId = null, startX = 0, startY = 0, moved = false;
  let previousX = 0, previousY = 0, previousAngle = 0, yaw = 0, targetYaw = 0, pitch = 0, targetPitch = 0;
  let autoAngle = -Math.PI / 4, targetAngle = -Math.PI / 4, angleFrom = -Math.PI / 4, angleStarted = 0, width = 0, height = 0;
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(), planeNormal = new THREE.Vector3(), planeOrigin = new THREE.Vector3(), intersection = new THREE.Vector3();
  const TAU = Math.PI * 2;
  const previousTouchAction = canvas.style.touchAction;
  const previousCursor = canvas.style.cursor;
  const previousTabindex = canvas.getAttribute('tabindex');
  canvas.style.touchAction = 'none';
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;

  const steel = new THREE.MeshStandardMaterial({ color: 0x53656b, metalness: .82, roughness: .29 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x31464f, metalness: .85, roughness: .23 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb49a66, metalness: .78, roughness: .34 });
  const black = new THREE.MeshStandardMaterial({ color: 0x131f25, metalness: .58, roughness: .38 });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xaec6cb, metalness: .45, roughness: .36 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x263c46, metalness: .66, roughness: .15, clearcoat: 1, clearcoatRoughness: .13 });
  disposal.push(steel, edge, brass, black, ceramic, glass);

  scene.add(new THREE.HemisphereLight(0xc4dbe4, 0x17201e, 2.3));
  const key = new THREE.DirectionalLight(0xe4f4ff, 4.5); key.position.set(-4, 7, 8); scene.add(key);
  const fill = new THREE.DirectionalLight(0x739ba8, 3.3); fill.position.set(7, -1, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd4a167, 4.7); rim.position.set(-4, -3, 1); scene.add(rim);
  const back = new THREE.DirectionalLight(0x8baabe, 2.5); back.position.set(0, 5, -4); scene.add(back);

  // Small procedural studio environment: broad reflected light on brushed metal.
  // Generated once, with no network image or continuous post-processing pass.
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0x1b2427);
  for (const [x, y, z, w, h, color] of [
    [-4, 3, 2, 2, 7, 0xc8dfeb], [5, 1, 1, 3, 6, 0x526e7c],
    [0, 5, -2, 7, 2, 0xdedcce], [0, -5, 2, 6, 1.5, 0x8b6e4c],
  ]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    p.position.set(x, y, z); p.lookAt(0, 0, 0); studio.add(p);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .04, .1, 30, { size: 128 });
  scene.environment = environment.texture;
  studio.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  pmrem.dispose();

  function mesh(geometry, material, parent = instrument) {
    const m = new THREE.Mesh(geometry, material); parent.add(m); disposal.push(geometry);
    if (parent !== scene) draggable.push(m);
    return m;
  }
  function torus(radius, tube, material, parent = instrument, arc = TAU) {
    return mesh(new THREE.TorusGeometry(radius, tube, 8, Math.ceil(140 * arc / TAU), arc), material, parent);
  }
  function line(points, color, opacity, parent = instrument) {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const l = new THREE.Line(g, m); parent.add(l); disposal.push(g, m); return l;
  }
  function textTexture(text, sub = '', color = '#b8cbd0', type = 'label') {
    const c = document.createElement('canvas'); c.width = type === 'hub' ? 512 : 768; c.height = type === 'hub' ? 512 : 256;
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    if (type === 'hub') {
      ctx.lineWidth = 4; ctx.strokeStyle = '#d0c2a6'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(137, 317); ctx.lineTo(137, 160); ctx.lineTo(256, 270); ctx.lineTo(375, 160); ctx.lineTo(375, 317); ctx.moveTo(256,270); ctx.lineTo(256, 377); ctx.stroke();
      ctx.font = '17px monospace'; ctx.fillStyle = '#8aabae'; ctx.fillText('MARC TEYRA', 256, 430);
    } else {
      ctx.font = '500 90px sans-serif'; ctx.fillText(text, 384, 128);
    }
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.push(texture); return texture;
  }
  function decal(text, sub, w, h, parent, color) {
    const material = new THREE.MeshBasicMaterial({ map: textTexture(text, sub, color), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    disposal.push(material);
    return mesh(new THREE.PlaneGeometry(w, h), material, parent);
  }
  function annularSector(inner, outer, start, end) {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
    s.absarc(0, 0, outer, start, end, false);
    s.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
    s.absarc(0, 0, inner, end, start, true);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: .11, steps: 1, bevelEnabled: true, bevelSize: .035, bevelThickness: .027, bevelSegments: 2, curveSegments: 42 });
  }
  const outer = torus(3.05, .035, steel); outer.position.z = -.17;
  const guide = torus(3.16, .008, brass); guide.position.z = -.19;
  const bearing = torus(2.16, .055, edge); bearing.position.z = -.11;
  torus(2.10, .013, brass).position.z = .02;
  const hub = mesh(new THREE.CylinderGeometry(.83, .83, .22, 80), edge);
  hub.rotation.x = Math.PI / 2; hub.position.z = .14;
  torus(.85, .025, brass).position.z = .29;
  torus(.73, .007, ceramic).position.z = .32;
  const innerGlass = mesh(new THREE.SphereGeometry(.69, 48, 24), glass);
  innerGlass.scale.z = .3; innerGlass.position.z = .3;
  const hubLabelMaterial = new THREE.MeshBasicMaterial({ map: textTexture('', '', '', 'hub'), transparent: true, depthWrite: false, toneMapped: false });
  disposal.push(hubLabelMaterial);
  mesh(new THREE.PlaneGeometry(1.12, 1.12), hubLabelMaterial).position.z = .54;

  // Four radial leaves share one hub. Chapter selection raises the chosen leaf
  // and aligns its engraved heading at the top of the instrument.
  const labels = [
    ['ABOUT', ''],
    ['STUDIES', ''],
    ['EXPERIENCE', ''],
    ['PROJECTS', ''],
  ];
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Group(); leaf.rotation.z = i * TAU / 4; instrument.add(leaf);
    const material = new THREE.MeshStandardMaterial({ color: colors[i], metalness: .82, roughness: .31, emissive: 0x000000 });
    disposal.push(material);
    const plate = mesh(annularSector(2.25, 2.88, .13 + Math.PI / 2, TAU / 4 - .13 + Math.PI / 2), material, leaf);
    plate.userData.chapter = i; selectable.push(plate);
    const span = TAU / 4 - .26;
    const trim = torus(2.82, .009, brass, leaf, span);
    trim.rotation.z = Math.PI / 2 + .13; trim.position.z = .151;
    const middle = Math.PI / 2 + Math.PI / 4;
    const a = middle;
    const text = decal(labels[i][0], labels[i][1], 1.88, .44, leaf, '#243b43');
    text.position.set(Math.cos(a) * 2.54, Math.sin(a) * 2.54, .162);
    text.rotation.z = a - Math.PI / 2;
    for (const radius of [2.22, 2.95]) {
      const screw = mesh(new THREE.CylinderGeometry(.043, .043, .028, 16), brass, leaf);
      screw.rotation.x = Math.PI / 2; screw.position.set(Math.cos(a) * radius, Math.sin(a) * radius, .03);
      const slit = line([new THREE.Vector3(-.018,0,0), new THREE.Vector3(.018,0,0)],0x1e3035,1,leaf);
      slit.position.copy(screw.position); slit.position.z += .017; slit.rotation.z = a;
    }
    const spoke = mesh(new THREE.BoxGeometry(.055, 1.32, .06), edge, leaf);
    spoke.position.set(Math.cos(a) * 1.45, Math.sin(a) * 1.45, -.04);
    spoke.rotation.z = a - Math.PI / 2;
    const block = mesh(new THREE.BoxGeometry(.16, .22, .13), steel, leaf);
    block.position.set(Math.cos(a) * 1.96, Math.sin(a) * 1.96, .01); block.rotation.z = a - Math.PI / 2;
    faces.push({ leaf, material, base: new THREE.Color(colors[i]), plate });
  }
  // Index marks are engraved around the rim, not floating interface particles.
  const tickPoints = [];
  for (let i = 0; i < 80; i++) {
    const a = i / 80 * TAU, outerRadius = 3.09;
    const r = i % 10 === 0 ? 2.98 : i % 5 === 0 ? 3.015 : 3.04;
    tickPoints.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -.14), new THREE.Vector3(Math.cos(a) * outerRadius, Math.sin(a) * outerRadius, -.14));
  }
  const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickPoints);
  const tickMaterial = new THREE.LineBasicMaterial({ color: 0x97b1b8, transparent: true, opacity: .45 });
  disposal.push(tickGeometry, tickMaterial); instrument.add(new THREE.LineSegments(tickGeometry, tickMaterial));

  // Intersecting inner gimbals make the four leaves parts of one instrument.
  const gimbalA = new THREE.Group(), gimbalB = new THREE.Group(), gimbalC = new THREE.Group();
  core.add(gimbalA, gimbalB, gimbalC);
  torus(1.81, .028, steel, gimbalA); torus(1.765, .007, ceramic, gimbalA);
  torus(1.52, .037, brass, gimbalB); torus(1.565, .006, edge, gimbalB);
  torus(1.17, .021, steel, gimbalC);
  gimbalA.rotation.set(.82, -.45, .17);
  gimbalB.rotation.set(-.73, .36, .48);
  gimbalC.rotation.set(.4, 1.07, -.2);
  for (const group of [gimbalA, gimbalB]) {
    for (const side of [-1, 1]) {
      const pin = mesh(new THREE.SphereGeometry(.075, 12, 8), brass, group);
      pin.position.set(side * (group === gimbalA ? 1.81 : 1.52), 0, 0);
    }
  }
  const marker = mesh(new THREE.ConeGeometry(.052, .18, 3), brass);
  marker.position.set(0, 3.38, 0); marker.rotation.z = Math.PI;

  // A quiet contact shadow gives the object weight without a large shadow map.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 128; shadowCanvas.height = 128;
  const sx = shadowCanvas.getContext('2d'), radial = sx.createRadialGradient(64,64,5,64,64,63);
  radial.addColorStop(0, 'rgba(0,0,0,.5)'); radial.addColorStop(.55, 'rgba(0,0,0,.25)'); radial.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = radial; sx.fillRect(0,0,128,128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas); textures.push(shadowTexture);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  disposal.push(shadowMaterial);
  const shadow = mesh(new THREE.PlaneGeometry(7.8, 6.7), shadowMaterial, scene);
  shadow.position.set(.4, -.6, -2.1);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || (rect.width === width && rect.height === height)) return;
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    const horizontalMargin = camera.aspect < .95 ? 3.75 : 3.50;
    camera.position.z = Math.max(12.8, horizontalMargin / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect));
    camera.updateProjectionMatrix(); draw();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  function closestAngle(a, from) { while (a - from > Math.PI) a -= TAU; while (a - from < -Math.PI) a += TAU; return a; }
  function select(i) {
    if (destroyed || !Number.isInteger(i) || i < 0 || i > 3) return;
    const goal = closestAngle(-i * TAU / 4 - Math.PI / 4, autoAngle);
    if (i === selected && Math.abs(goal - targetAngle) < .0001 && !drag) return;
    selected = i;
    angleFrom = autoAngle; angleStarted = performance.now();
    targetAngle = goal;
    targetYaw = targetPitch = 0;
    if (paused) { autoAngle = angleFrom = targetAngle; angleStarted = 0; update(0, true); draw(); }
    else kick();
  }
  function commitSelection(i) {
    select(i);
    onSelect?.(i);
  }
  function update(dt, snap = false) {
    const smooth = snap ? 1 : 1 - Math.exp(-dt * 5.2);
    const progress = snap ? 1 : THREE.MathUtils.clamp((performance.now() - angleStarted) / 1100, 0, 1);
    if (!drag || !moved) autoAngle = angleFrom + (targetAngle - angleFrom) * (1 - Math.pow(1 - progress, 3));
    yaw += (targetYaw - yaw) * smooth; pitch += (targetPitch - pitch) * smooth;
    instrument.rotation.set(.36 + pitch + (paused ? 0 : Math.sin(elapsed * .22) * .024), -.32 + yaw + (paused ? 0 : Math.sin(elapsed * .16) * .04), -.11);
    instrument.position.y = paused ? 0 : Math.sin(elapsed * .27) * .02;
    // Rotate the chapter leaves independently from the central engraved hub.
    faces.forEach(({ leaf, material, base }, i) => {
      leaf.rotation.z = i * TAU / 4 + autoAngle;
      const goal = i === selected ? .38 : -.02;
      leaf.position.z += (goal - leaf.position.z) * smooth;
      const brightness = i === selected ? 1.2 : .76;
      material.color.copy(base).multiplyScalar(brightness);
      material.emissive.setHex(i === selected ? 0x101719 : 0x000000);
    });
    core.rotation.z = autoAngle * -.21;
    gimbalA.rotation.y = -.45 + (paused ? 0 : Math.sin(elapsed * .13) * .06);
    gimbalB.rotation.y = .36 + selected * .14 + (paused ? 0 : Math.sin(elapsed * .11) * .05);
    gimbalC.rotation.z = -.2 + selected * .24;
  }
  function draw() { if (!destroyed && !contextUnavailable) renderer.render(scene, camera); }
  function tick(time) {
    raf = 0;
    if (destroyed || !active || paused || document.hidden) return;
    // Gentle idle movement renders at 30 fps; direct manipulation and chapter
    // transitions retain the display's normal frame cadence.
    if (!drag && time - angleStarted > 1200 && last && time - last < 32) {
      raf = requestAnimationFrame(tick); return;
    }
    const dt = Math.min(.045, Math.max(.001, (time - (last || time)) / 1000)); last = time; elapsed += dt;
    update(dt); draw(); raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf && !paused && active && !document.hidden && !destroyed && !contextUnavailable) { last = 0; raf = requestAnimationFrame(tick); } }
  function setPaused(value) {
    paused = Boolean(value);
    if (paused) { cancelAnimationFrame(raf); raf = 0; autoAngle = angleFrom = targetAngle; angleStarted = 0; update(0, true); draw(); }
    else kick();
  }
  function setActive(value) { active = Boolean(value); if (!active) { cancelAnimationFrame(raf); raf = 0; } else kick(); }
  function reset() {
    targetYaw = targetPitch = 0;
    angleFrom = autoAngle; angleStarted = performance.now();
    targetAngle = closestAngle(-selected * TAU / 4 - Math.PI / 4, autoAngle);
    if (paused) { yaw = pitch = 0; update(0, true); draw(); } else kick();
  }
  function cast(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }
  function angleAtPointer(e) {
    instrument.updateWorldMatrix(true, false);
    planeNormal.set(0, 0, 1).transformDirection(instrument.matrixWorld);
    planeOrigin.set(0, 0, 0).applyMatrix4(instrument.matrixWorld);
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, planeOrigin);
    cast(e);
    if (!raycaster.ray.intersectPlane(dragPlane, intersection)) return previousAngle;
    instrument.worldToLocal(intersection);
    return Math.atan2(intersection.y, intersection.x);
  }
  function down(e) {
    if (e.button !== 0 || drag || contextUnavailable) return;
    cast(e);
    if (!raycaster.intersectObjects(draggable, false).length) return;
    canvas.focus({ preventScroll: true });
    pointerId = e.pointerId; startX = previousX = e.clientX; startY = previousY = e.clientY; moved = false; drag = true;
    previousAngle = angleAtPointer(e);
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function move(e) {
    if (!drag) {
      cast(e);
      const hit = raycaster.intersectObjects(selectable, false)[0];
      canvas.style.cursor = hit ? 'pointer' : raycaster.intersectObjects(draggable, false).length ? 'grab' : 'default';
      return;
    }
    if (e.pointerId !== pointerId) return;
    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 6) moved = true;
    const angle = angleAtPointer(e);
    let delta = angle - previousAngle;
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;
    if (moved) {
      autoAngle += delta;
      targetAngle = angleFrom = autoAngle;
      angleStarted = performance.now();
      // A small physical response, without changing the reading orientation.
      targetYaw = THREE.MathUtils.clamp((e.clientX - previousX) * .001, -.08, .08);
      targetPitch = THREE.MathUtils.clamp((e.clientY - previousY) * .0007, -.06, .06);
    }
    previousAngle = angle;
    previousX = e.clientX; previousY = e.clientY;
    if (paused) { yaw = targetYaw; pitch = targetPitch; update(0, true); draw(); }
    e.preventDefault();
  }
  function up(e) {
    if (!drag || e.pointerId !== pointerId) return;
    drag = false; canvas.classList.remove('dragging');
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (moved) {
      const step = Math.round((-autoAngle - Math.PI / 4) / (TAU / 4));
      commitSelection(((step % 4) + 4) % 4);
    } else {
      cast(e);
      const hit = raycaster.intersectObjects(selectable, false)[0];
      if (hit) commitSelection(hit.object.userData.chapter);
    }
    targetYaw = targetPitch = 0;
  }
  function cancel() {
    const wasDragging = drag;
    drag = false; canvas.classList.remove('dragging');
    canvas.style.cursor = 'grab';
    if (wasDragging) reset();
  }
  function keyboard(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home'].includes(e.key)) {
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : (selected + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 3)) % 4;
      commitSelection(next);
    }
  }
  function visibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else kick();
  }
  function lost(e) { e.preventDefault(); contextUnavailable = true; setActive(false); onUnavailable?.(); }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  canvas.addEventListener('keydown', keyboard);
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  resize(); update(0, true); draw();
  queueMicrotask(() => { if (!destroyed && !contextUnavailable) onReady?.(); });
  kick();
  return {
    select, setPaused, setActive, reset,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', cancel);
      canvas.removeEventListener('keydown', keyboard);
      canvas.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', visibility);
      canvas.style.touchAction = previousTouchAction; canvas.style.cursor = previousCursor;
      canvas.classList.remove('dragging');
      if (previousTabindex === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', previousTabindex);
      new Set(disposal).forEach(x => x.dispose()); textures.forEach(t => t.dispose());
      environment.dispose(); renderer.dispose();
    },
  };
}
