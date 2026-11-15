import * as THREE from '../assets/vendor/three.module.js';
import { createNotebook, createMicroscope } from './models-learning.js?v=study-2';
import { createCampus } from './model-campus.js?v=study-2';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const ids = ['studies', 'experience', 'projects'];

export function createStudy(canvas, { onSelect, onReady, onUnavailable, onLabels, onHover } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    onUnavailable?.();
    return { select() {}, reset() {}, cancel() {}, setMesh() {}, setTheme() {}, setReduced() {}, setStudyChapter() {}, destroy() {}, getState: () => ({ ready: false, unavailable: true }) };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const world = new THREE.Scene();
  world.background = new THREE.Color('#151715');
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 200);
  const hemi = new THREE.HemisphereLight(0xe7edda, 0x3a4039, 1.5);
  const key = new THREE.DirectionalLight(0xfff5df, 2.2);
  key.position.set(-8, 15, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: .5, far: 45 });
  key.shadow.bias = -.00015;
  key.shadow.normalBias = .012;
  key.shadow.intensity = .38;
  const fill = new THREE.DirectionalLight(0xc8dbd6, .55);
  fill.position.set(8, 8, -8);
  world.add(hemi, key, fill);

  const furniture = new THREE.Group();
  const surface = new THREE.MeshStandardMaterial({ color: '#20241f', roughness: .98, metalness: .05 });
  const border = new THREE.LineBasicMaterial({ color: '#89927c', transparent: true, opacity: .24 });
  const plateGeometry = new THREE.BoxGeometry(15.5, .13, 8.5);
  const plate = new THREE.Mesh(plateGeometry, surface);
  plate.position.y = -.08;
  plate.receiveShadow = true;
  const plateEdges = new THREE.LineSegments(new THREE.EdgesGeometry(plateGeometry), border);
  plateEdges.position.copy(plate.position);
  furniture.add(plate, plateEdges);
  // An engraved drawing surface, deliberately much quieter than the objects.
  const markings = [];
  for (let x = -7; x <= 7; x += .5) markings.push(x, -.008, -4.1, x, -.008, x % 1 ? -3.99 : -3.91);
  for (let z = -4; z <= 4; z += .5) markings.push(-7.59, -.008, z, z % 1 ? -7.48 : -7.4, -.008, z);
  for (const x of [-2.2, 2.3]) markings.push(x, -.008, -3.5, x, -.008, 3.4);
  const markingGeometry = new THREE.BufferGeometry();
  markingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(markings, 3));
  furniture.add(new THREE.LineSegments(markingGeometry, new THREE.LineBasicMaterial({ color: '#98a08d', transparent: true, opacity: .14 })));
  world.add(furniture);
  const groups = {
    studies: createNotebook(THREE),
    experience: createMicroscope(THREE),
    projects: createCampus(THREE),
  };
  groups.studies.position.set(-4.7, .03, 1.05);
  groups.studies.rotation.y = .10;
  groups.experience.position.set(0, .03, -1.25);
  groups.experience.rotation.y = -.35;
  groups.projects.position.set(4.6, .03, 1.0);
  const materialSets = new Map(), originals = new Map(), opacity = new Map();
  for (const [id, group] of [...Object.entries(groups), ['furniture', furniture]]) {
    const materials = new Set();
    group.traverse(object => {
      object.userData.section = id;
      if (object.isMesh && id !== 'furniture') { object.castShadow = true; object.receiveShadow = true; }
      if (!object.material) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        originals.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, wireframe: material.wireframe });
      }
    });
    materialSets.set(id, materials); opacity.set(id, 1);
    if (id !== 'furniture') world.add(group);
  }
  world.updateMatrixWorld(true);
  const boxes = Object.fromEntries(ids.map(id => [id, new THREE.Box3().setFromObject(groups[id])]));
  const book = groups.studies.userData.book;
  // Keep the lifted sheet inside the frame without moving the camera on every turn.
  const studyFrame = boxes.studies.clone();
  studyFrame.max.y = Math.max(studyFrame.max.y, groups.studies.position.y + 2.3);
  const overviewBox = new THREE.Box3(new THREE.Vector3(-7.75, -.15, -4.25), new THREE.Vector3(7.75, 4.1, 4.25));
  const anchors = {
    studies: new THREE.Vector3(-4.7, .05, 2.97),
    experience: new THREE.Vector3(0, .05, .35),
    projects: new THREE.Vector3(4.6, .05, 3.4),
  };
  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const current = { center: new THREE.Vector3(), yaw: .38, pitch: .65, height: 12 };
  const desired = { center: new THREE.Vector3(), yaw: .38, pitch: .65, height: 12 };
  const pointers = new Map();
  let page = 'about', theme = 'night', width = 0, height = 0, raf = 0, disposed = false, reduced = false, meshMode = false, zoom = 1;
  let drag = null, pinch = null, blockedClick = false, hovered = null, visible = !document.hidden;
  let ready = false, lost = false, animating = false, lastFrame = 0;

  function cameraPose(pose) {
    camera.position.copy(pose.center).add(new THREE.Vector3(
      Math.sin(pose.yaw) * Math.cos(pose.pitch),
      Math.sin(pose.pitch),
      Math.cos(pose.yaw) * Math.cos(pose.pitch),
    ).multiplyScalar(35));
    camera.lookAt(pose.center);
    camera.updateMatrixWorld(true);
  }
  function fit(box) {
    cameraPose(desired);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const bounds = page === 'about' ? [...Object.values(boxes), new THREE.Box3(new THREE.Vector3(-7.75, -.15, -4.25), new THREE.Vector3(7.75, 0, 4.25))] : [box];
    for (const bound of bounds) for (const x of [bound.min.x, bound.max.x]) for (const y of [bound.min.y, bound.max.y]) for (const z of [bound.min.z, bound.max.z]) {
      const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
    desired.center.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), (minX + maxX) / 2);
    desired.center.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), (minY + maxY) / 2);
    return Math.max(maxY - minY, (maxX - minX) / Math.max(width / height, .1)) * (page === 'about' ? 1.12 : 1.26);
  }
  function destination(resetRotation = false) {
    const box = page === 'about' ? overviewBox : page === 'studies' ? studyFrame : boxes[page];
    box.getCenter(desired.center);
    if (resetRotation) {
      desired.yaw = page === 'studies' ? .08 : page === 'experience' ? .65 : .38;
      desired.pitch = page === 'studies' ? .95 : page === 'about' || page === 'projects' ? .65 : .35;
      zoom = 1;
    }
    desired.height = fit(box) / zoom;
  }
  function placeLabels() {
    const positions = {};
    for (const id of ids) {
      const point = anchors[id].clone().project(camera);
      const bound = boxes[id];
      let bottom = 0;
      for (const x of [bound.min.x, bound.max.x]) for (const z of [bound.min.z, bound.max.z]) {
        const edge = new THREE.Vector3(x, bound.min.y, z).project(camera);
        bottom = Math.max(bottom, (-edge.y * .5 + .5) * height);
      }
      positions[id] = {
        x: clamp((point.x * .5 + .5) * width, 62, width - 62),
        y: clamp(Math.max((-point.y * .5 + .5) * height, bottom + 21), 20, height - 24),
      };
    }
    onLabels?.(positions);
  }
  function paint(time) {
    raf = 0;
    if (disposed || lost || !visible || !width || !height) return;
    const dt = Math.min((time - lastFrame) / 1000 || 1 / 60, .5);
    lastFrame = time;
    const t = reduced || drag || pinch ? 1 : 1 - Math.exp(-dt / .13);
    current.center.lerp(desired.center, t);
    current.yaw += (desired.yaw - current.yaw) * t;
    current.pitch += (desired.pitch - current.pitch) * t;
    current.height += (desired.height - current.height) * t;
    animating = current.center.distanceTo(desired.center) > .001 ||
      Math.abs(current.yaw - desired.yaw) + Math.abs(current.pitch - desired.pitch) + Math.abs(current.height - desired.height) > .002;
    if (book?.update(dt)) animating = true;
    for (const [id, materials] of materialSets) {
      const goal = page === 'about' || id === page ? 1 : id === 'furniture' ? .12 : 0;
      let amount = opacity.get(id) + (goal - opacity.get(id)) * (reduced ? 1 : 1 - Math.exp(-dt / .12));
      if (Math.abs(amount - goal) < .003) amount = goal; else animating = true;
      opacity.set(id, amount);
      const group = id === 'furniture' ? furniture : groups[id];
      group.visible = amount > .005;
      for (const material of materials) {
        const original = originals.get(material);
        material.opacity = original.opacity * amount;
        material.transparent = original.transparent || amount < .99;
        material.depthWrite = original.depthWrite && amount > .6;
      }
    }
    cameraPose(current);
    const half = current.height / 2, aspect = width / height;
    camera.left = -half * aspect; camera.right = half * aspect;
    camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
    renderer.render(world, camera);
    if (page === 'about') placeLabels();
    if (!ready) { ready = true; onReady?.(); }
    if (animating) request();
  }
  function request() {
    if (!raf && !disposed && visible && !lost) {
      if (!animating) lastFrame = performance.now() - 16;
      raf = requestAnimationFrame(paint);
    }
  }
  function cancel() {
    for (const id of pointers.keys()) { try { canvas.releasePointerCapture(id); } catch {} }
    pointers.clear(); drag = null; pinch = null; blockedClick = true;
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(r.width)), nextH = Math.max(1, Math.round(r.height));
    if (nextW === width && nextH === height) return;
    cancel();
    width = nextW; height = nextH;
    renderer.setSize(width, height, false);
    destination();
    if (!ready) { current.center.copy(desired.center); Object.assign(current, { yaw: desired.yaw, pitch: desired.pitch, height: desired.height }); }
    request();
  }
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(ids.filter(id => page === 'about' || page === id).map(id => groups[id]), true);
    return hits.find(result => result.object.isMesh)?.object.userData.section || null;
  }
  function hover(id) { if (id === hovered) return; hovered = id; canvas.style.cursor = id && page === 'about' ? 'pointer' : 'grab'; onHover?.(id); }
  function pointerDown(event) {
    if (event.button !== 0 || lost) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      blockedClick = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: desired.yaw, pitch: desired.pitch, hit: hit(event), moved: false };
    } else {
      blockedClick = true; drag = null;
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), height: desired.height, zoom };
    }
    hover(null);
  }
  function pointerMove(event) {
    if (!pointers.has(event.pointerId)) { if (event.pointerType !== 'touch') hover(page === 'about' ? hit(event) : null); return; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      zoom = clamp(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(pinch.distance, 1), .65, 3.5);
      desired.height = pinch.height * pinch.zoom / zoom;
    } else if (drag?.id === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      desired.yaw = drag.yaw - dx / width * Math.PI * 1.7;
      desired.pitch = clamp(drag.pitch + dy / height * Math.PI * .75, .13, 1.45);
      destination();
    }
    request();
  }
  function pointerUp(event) {
    const selection = !blockedClick && drag?.id === event.pointerId && !drag.moved && drag.hit && page === 'about' ? drag.hit : null;
    pointers.delete(event.pointerId);
    try { canvas.releasePointerCapture(event.pointerId); } catch {}
    if (!pointers.size) { drag = null; pinch = null; }
    else { blockedClick = true; drag = null; pinch = null; }
    request();
    if (selection) onSelect?.(selection);
  }
  function wheel(event) {
    if (event.ctrlKey || event.metaKey || lost) return;
    event.preventDefault();
    cancel();
    const previous = zoom;
    zoom = clamp(zoom * Math.exp(-event.deltaY * .001), .65, 3.5);
    desired.height *= previous / zoom;
    request();
  }
  function select(next, { instant = false } = {}) {
    if (!ids.includes(next) && next !== 'about') return;
    const changed = page !== next;
    page = next; cancel(); hover(null);
    resize(); destination(changed || !ready);
    if (instant) {
      current.center.copy(desired.center);
      current.yaw = desired.yaw; current.pitch = desired.pitch; current.height = desired.height;
      for (const id of materialSets.keys()) opacity.set(id, page === 'about' || id === page ? 1 : id === 'furniture' ? .12 : 0);
    }
    request();
  }
  function setMesh(value) {
    meshMode = value;
    for (const id of ids) for (const material of materialSets.get(id)) {
      if ('wireframe' in material) { material.wireframe = meshMode; material.needsUpdate = true; }
    }
    request();
  }
  function setTheme(value) {
    theme = value;
    world.background.set(theme === 'day' ? '#e9e9e1' : '#151715');
    surface.color.set(theme === 'day' ? '#d2d4c8' : '#20241f');
    border.color.set(theme === 'day' ? '#727b69' : '#89927c');
    hemi.intensity = theme === 'day' ? 1.8 : 1.5;
    renderer.toneMappingExposure = theme === 'day' ? .95 : 1.05;
    request();
  }
  function visibility() {
    visible = !document.hidden;
    if (!visible) { cancel(); cancelAnimationFrame(raf); raf = 0; } else request();
  }
  function contextLost(event) { event.preventDefault(); lost = true; cancel(); cancelAnimationFrame(raf); raf = 0; onUnavailable?.(); }
  function contextRestored() { lost = false; ready = false; request(); }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancel);
  const lostPointerCapture = event => { if (pointers.has(event.pointerId)) cancel(); };
  canvas.addEventListener('lostpointercapture', lostPointerCapture);
  const pointerLeave = () => { if (!pointers.size) hover(null); };
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', cancel);
  resize(); destination(true);
  current.center.copy(desired.center); current.height = desired.height;
  request();
  return {
    select, cancel, setMesh, setTheme,
    setStudyChapter(chapter, options) { book?.setChapter(chapter, options); request(); },
    reset() { cancel(); destination(true); request(); },
    setReduced(value) { reduced = value; book?.setReduced(value); request(); },
    getState: () => ({ ready, unavailable: lost, page, theme, mesh: meshMode, dragging: Boolean(drag || pinch), animating, book: book?.getState(), yaw: current.yaw, pitch: current.pitch, zoom, width, height, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    destroy() {
      disposed = true; cancel(); cancelAnimationFrame(raf); observer.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', lostPointerCapture);
      canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', cancel);
      const geometries = new Set(), textures = new Set();
      world.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
      for (const material of originals.keys()) { for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); material.dispose(); }
      geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose()); renderer.dispose();
    },
  };
}
