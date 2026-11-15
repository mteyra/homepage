import * as THREE from '../assets/vendor/three.module.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const TAU = Math.PI * 2;

/**
 * Two opt-in personal forms: ceramic cells over a wing, or a folded M ribbon.
 * Inner-page cells mirror the ordinary text index. The home object has no
 * selection or task; an optional horizontal drag exposes its reverse face.
 */
export function createChapterWorld(canvas, { kind = 'studies', variant = 'wing', onSelect, onReady, onUnavailable } = {}) {
  const chapter = ['about', 'studies', 'experience', 'projects'].includes(kind) ? kind : 'studies';
  const isAbout = chapter === 'about';
  const isFold = variant === 'fold';
  const count = isAbout ? 0 : chapter === 'projects' ? 4 : 3;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const before = { ariaHidden: canvas.getAttribute('aria-hidden'), tabIndex: canvas.getAttribute('tabindex'), touchAction: canvas.style.touchAction, cursor: canvas.style.cursor };
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  canvas.style.touchAction = 'pan-y pinch-zoom';

  let selected = isAbout ? null : 0, manualPaused = null, paused = reduced.matches;
  let active = true, visible = true, destroyed = false, ready = false, unavailable = false;
  let renderer, scene, camera, assembly, environment, shadowLight, resizeObserver, visibilityObserver;
  let frame = 0, last = 0, width = 0, height = 0, pressed = null;
  let tiltX = 0, tiltY = 0, targetX = 0, targetY = 0, moving = false;
  let viewYaw = 0, intendedYaw = 0, viewPitch = 0, intendedPitch = 0;
  const pieces = [], pickable = [];
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

  function geometry(value) { geometries.add(value); return value; }
  function finish(colour, { ceramic = false, roughness = ceramic ? .41 : .29 } = {}) {
    const value = new THREE.MeshPhysicalMaterial({ color: colour, metalness: ceramic ? .2 : .93, roughness, clearcoat: ceramic ? .08 : .2, clearcoatRoughness: .3 });
    materials.add(value);
    return value;
  }
  function mesh(shape, material, parent = assembly, index = null) {
    const value = new THREE.Mesh(shape, material);
    value.castShadow = value.receiveShadow = true;
    parent.add(value);
    if (index !== null) { value.userData.index = index; pickable.push(value); }
    return value;
  }
  function hexPath(radius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + i * TAU / 6;
      const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath();
    return shape;
  }
  function hex(radius, depth = .09, bevel = .02) {
    const value = geometry(new THREE.ExtrudeGeometry(hexPath(radius), { depth, steps: 1, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 1 }));
    value.translate(0, 0, -depth / 2);
    return value;
  }
  function convexHull(points) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const lower = [], upper = [];
    for (const p of sorted) { while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
    for (const p of sorted.slice().reverse()) { while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  const arch = x => .085 * (1 - (x / 2.2) ** 2);
  function wingSkin(outline) {
    // Radial subdivisions let the silver skin share the tiles' gentle camber.
    const vertices = [], indices = [], rings = 12, n = outline.length;
    const center = outline.reduce((c, p) => ({ x: c.x + p.x / n, y: c.y + p.y / n }), { x: 0, y: 0 });
    for (let side = 0; side < 2; side++) {
      for (let r = 0; r <= rings; r++) {
        const t = r / rings;
        for (const p of outline) {
          const x = center.x + (p.x - center.x) * t, y = center.y + (p.y - center.y) * t;
          vertices.push(x, y, arch(x) - .092 - side * .083);
        }
      }
    }
    const layer = (rings + 1) * n;
    for (let side = 0; side < 2; side++) for (let r = 0; r < rings; r++) for (let j = 0; j < n; j++) {
      const a = side * layer + r * n + j, b = side * layer + r * n + (j + 1) % n, c = a + n, d = b + n;
      if (side === 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
    }
    for (let j = 0; j < n; j++) {
      const a = rings * n + j, b = rings * n + (j + 1) % n;
      indices.push(a, b, a + layer, b, b + layer, a + layer);
    }
    const value = new THREE.BufferGeometry();
    value.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    value.setIndex(indices);
    value.computeVertexNormals();
    return geometry(value);
  }
  function curvedRib(a, b, material) {
    const points = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      return new THREE.Vector3(x, y, arch(x) - .198);
    });
    mesh(geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .027, 6, false)), material);
  }
  function buildWing() {
    const radius = .397, stepX = Math.sqrt(3) * .43, stepY = .43 * 1.5;
    const rows = [5, 5, 4, 3, 2], centers = [];
    rows.forEach((length, row) => {
      const shift = [0, .5, .9, 1.4, 1.8][row];
      for (let q = 0; q < length; q++) centers.push({ x: (q + shift) * stepX, y: row * stepY });
    });
    const minX = Math.min(...centers.map(p => p.x)), maxX = Math.max(...centers.map(p => p.x));
    centers.forEach(p => { p.x -= (minX + maxX) / 2; p.y -= stepY * 2; });
    const edgePoints = centers.flatMap(p => Array.from({ length: 6 }, (_, i) => ({ x: p.x + Math.cos(Math.PI / 2 + i * TAU / 6) * .46, y: p.y + Math.sin(Math.PI / 2 + i * TAU / 6) * .46 })));
    const skin = finish(0xbfc5bf, { roughness: .31 });
    skin.side = THREE.DoubleSide;
    mesh(wingSkin(convexHull(edgePoints)), skin, assembly, 0);
    const face = finish(0x252a28, { ceramic: true }), edge = finish(0x3f4741, { ceramic: true, roughness: .33 });
    const pale = finish(0xc8cec7, { roughness: .34 });
    const tile = hex(radius, .093, .015);
    centers.forEach((p, i) => {
      const part = mesh(tile, [i === 7 ? pale : face, edge], assembly, 0);
      part.position.set(p.x, p.y, arch(p.x) - .004);
      part.rotation.y = Math.atan(.17 * p.x / 2.2 ** 2);
    });
    const ribs = finish(0xa3aca4, { roughness: .38 });
    curvedRib({ x: -1.42, y: -1.22 }, { x: .06, y: 1.25 }, ribs);
    curvedRib({ x: -.5, y: -1.32 }, { x: .65, y: 1.24 }, ribs);
    curvedRib({ x: .52, y: -1.18 }, { x: 1.09, y: .96 }, ribs);
  }
  function addCell(index, position, rotation, { radius = .76, tone = 0x323a34, depth = .115, cluster = false } = {}) {
    const group = new THREE.Group();
    assembly.add(group);
    const face = finish(tone, { ceramic: tone < 0x777777, roughness: .35 });
    const side = finish(0xadb6ae, { roughness: .29 });
    if (cluster) {
      const sub = hex(radius / 1.65, depth * .7, .016);
      for (const [x, y] of [[-.37, -.23], [.37, -.23], [0, .41]]) {
        const cell = mesh(sub, [face, side], group, index);
        cell.position.set(x, y, .06);
      }
      const back = mesh(hex(radius * 1.13, .045, .017), side, group, index);
      back.position.z = -.04;
    } else {
      mesh(hex(radius, depth, .026), [face, side], group, index);
      const back = mesh(hex(radius + .032, .034, .014), side, group, index);
      back.position.z = -depth / 2 - .034;
    }
    pieces.push({ group, face, colour: face.color.clone(), position: new THREE.Vector3(...position), rotation: new THREE.Vector3(...rotation), emphasis: index === selected ? 1 : 0 });
  }
  function addLink(a, b, material, z = -.14) {
    const start = new THREE.Vector3(a[0], a[1], z), end = new THREE.Vector3(b[0], b[1], z);
    mesh(geometry(new THREE.TubeGeometry(new THREE.LineCurve3(start, end), 1, .026, 6, false)), material);
  }
  function buildCells() {
    const join = finish(0xaab3aa, { roughness: .33 });
    if (chapter === 'studies') {
      const positions = [[-.83, .45, 0], [.83, .45, -.04], [0, -.92, .035]];
      addLink(positions[0], positions[1], join);
      addLink(positions[0], positions[2], join);
      addLink(positions[1], positions[2], join);
      positions.forEach((p, i) => addCell(i, p, [.02, i === 1 ? -.05 : .04, 0], { radius: .86, tone: [0x343d36, 0xc0c8bf, 0x879487][i] }));
    } else if (chapter === 'experience') {
      const positions = [[-.57, .7, -.18], [.56, .02, .08], [-.5, -.8, .31]];
      addLink(positions[0], positions[1], join, -.26);
      addLink(positions[1], positions[2], join, -.26);
      positions.forEach((p, i) => addCell(i, p, [-.16, -.1 + i * .05, i % 2 ? -.10 : .05], { radius: .74, tone: [0x414c43, 0xbdc6bd, 0x7f8c80][i], cluster: true }));
    } else {
      const positions = [[-1.35, -.6, 0], [-.45, .73, -.025], [.45, -.6, .03], [1.35, .73, -.05]];
      positions.forEach((p, i) => {
        if (i) addLink(positions[i - 1], p, join, -.13);
        addCell(i, p, [0, i % 2 ? -.09 : .06, 0], { radius: .77, tone: [0x343e35, 0xc0c8bf, 0x879487, 0x5c6a5e][i] });
      });
    }
  }
  function foldedRibbon(points, { width = .48, thickness = .07, segments = 128, twist = () => 0 } = {}) {
    // One closed strip: a rounded rectangular section travels along the fold.
    // Its broad faces, narrow edge and end cuts are actual connected geometry.
    const curve = Array.isArray(points) ? new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal') : points;
    const positions = [], materialIndices = [[], [], []];
    const half = width / 2, depth = thickness / 2, bevel = Math.min(.014, depth * .6);
    const section = [[-half + bevel, depth], [half - bevel, depth], [half, depth - bevel], [half, -depth + bevel], [half - bevel, -depth], [-half + bevel, -depth], [-half, -depth + bevel], [-half, depth - bevel]];
    const tangent = new THREE.Vector3(), across = new THREE.Vector3(), normal = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, point = curve.getPointAt(t);
      tangent.copy(curve.getTangentAt(t)).normalize();
      across.set(tangent.y, -tangent.x, 0).normalize();
      across.applyAxisAngle(tangent, twist(t));
      normal.crossVectors(across, tangent).normalize();
      for (const [u, v] of section) positions.push(point.x + across.x * u + normal.x * v, point.y + across.y * u + normal.y * v, point.z + across.z * u + normal.z * v);
    }
    for (let i = 0; i < segments; i++) for (let j = 0; j < 8; j++) {
      const a = i * 8 + j, b = i * 8 + (j + 1) % 8, c = a + 8, d = b + 8;
      materialIndices[j === 0 ? 0 : j === 4 ? 1 : 2].push(a, b, c, b, d, c);
    }
    for (const end of [0, segments]) {
      const offset = positions.length / 3;
      for (let j = 0; j < 8; j++) positions.push(...positions.slice((end * 8 + j) * 3, (end * 8 + j) * 3 + 3));
      for (let j = 1; j < 7; j++) {
        if (end === 0) materialIndices[2].push(offset, offset + j + 1, offset + j);
        else materialIndices[2].push(offset, offset + j, offset + j + 1);
      }
    }
    const value = new THREE.BufferGeometry();
    value.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    value.setIndex(materialIndices.flat());
    let start = 0;
    materialIndices.forEach((indices, material) => { value.addGroup(start, indices.length, material); start += indices.length; });
    value.computeVertexNormals();
    return geometry(value);
  }
  function ribbonFinish(tone = 0xbfc6c1) {
    const face = finish(tone, { roughness: .25 });
    const reverse = finish(0x707a73, { roughness: .29 });
    const edge = finish(0xd4d9d5, { roughness: .22 });
    return { face, materials: [face, reverse, edge] };
  }
  function buildFold() {
    // A single continuous M. Depth follows the two rounded shoulders rather
    // than adding a second emblem or disconnected decorative elements.
    // Circular bends keep a real inner radius under the broad ribbon face.
    const outline = new THREE.Path();
    outline.moveTo(-1.5, -1.3);
    outline.lineTo(-1.5, .6);
    outline.absarc(-.975, .6, .525, Math.PI, 0, true);
    outline.lineTo(-.45, -.14);
    outline.absarc(0, -.14, .45, Math.PI, TAU, false);
    outline.lineTo(.45, .6);
    outline.absarc(.975, .6, .525, Math.PI, 0, true);
    outline.lineTo(1.5, -1.3);
    class FoldPath extends THREE.Curve {
      getPoint(t, target = new THREE.Vector3()) {
        const point = outline.getPointAt(t);
        return target.set(point.x, point.y, .1 + .5 * Math.cos(t * TAU * 2));
      }
    }
    const path = new FoldPath();
    path.arcLengthDivisions = 1024;
    const finish = ribbonFinish(0xc3cac5);
    mesh(foldedRibbon(path, { width: .54, thickness: .082, segments: 192, twist: t => -.28 * Math.sin(t * TAU) }), finish.materials, assembly, 0);
  }
  function addFold(index, position, rotation, { tone = 0xbfc6c1, depth = .42, width = .30 } = {}) {
    const group = new THREE.Group();
    assembly.add(group);
    const finish = ribbonFinish(tone);
    const points = [[-.47, -.55, .12], [-.5, .17, -.06], [-.33, .57, -depth], [0, .69, -depth * .8], [.33, .57, -depth], [.5, .17, -.06], [.47, -.55, .12]];
    mesh(foldedRibbon(points, { width, thickness: .066, segments: 72, twist: t => -.26 * Math.sin(t * TAU) }), finish.materials, group, index);
    pieces.push({ group, face: finish.face, colour: finish.face.color.clone(), position: new THREE.Vector3(...position), rotation: new THREE.Vector3(...rotation), emphasis: index === selected ? 1 : 0 });
  }
  function buildFolds() {
    if (chapter === 'studies') {
      const positions = [[-1.23, -.12, 0], [0, .17, .18], [1.23, -.12, 0]];
      positions.forEach((p, i) => addFold(i, p, [0, (i - 1) * .16, (1 - i) * .10], { tone: [0xa7b2aa, 0xd0d6d1, 0x85938a][i], width: .32 }));
    } else if (chapter === 'experience') {
      const positions = [[-.80, .82, -.12], [0, -.04, .10], [.80, -.90, .32]];
      positions.forEach((p, i) => addFold(i, p, [-.08, .06, -.35], { tone: [0xbec7c0, 0x83938a, 0xcbd2cc][i], depth: .34, width: .34 }));
    } else {
      const positions = [[-.83, .79, 0], [.83, .79, -.04], [-.83, -.86, .05], [.83, -.86, .01]];
      positions.forEach((p, i) => addFold(i, p, [0, i % 2 ? -.14 : .14, i % 2 ? -.09 : .09], { tone: [0xcbd2cc, 0x8d9b91, 0xa7b3aa, 0xc3ccc5][i], depth: .35, width: .31 }));
    }
  }

  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0xeeefed, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-2.6, 2.6, 2.6, -2.6, .1, 30);
    camera.position.set(0, 1.25, 8);
    camera.lookAt(0, -.04, 0);
    assembly = new THREE.Group();
    scene.add(assembly);

    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0xa4a7a5);
    for (const [x, y, z, w, h, colour] of [[-5,5,3,5,7,0xffffff],[4,2,4,1.4,8,0xf1f3f0],[1,7,-3,8,4,0xffffff],[0,0,6,3.5,7,0x242827],[5,-1,-1,5,7,0x171b19],[-3,-5,0,7,5,0x585d59]]) {
      const reflector = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide }));
      reflector.position.set(x, y, z); reflector.lookAt(0, 0, 0); studio.add(reflector);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    try { environment = pmrem.fromScene(studio, .04, .1, 30, { size: 128 }); scene.environment = environment.texture; }
    finally { studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); pmrem.dispose(); }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7b807a, 1.15));
    shadowLight = new THREE.DirectionalLight(0xffffff, 3.1);
    shadowLight.position.set(-2, 12, 5); shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(512, 512);
    Object.assign(shadowLight.shadow.camera, { left: -4.5, right: 4.5, top: 4, bottom: -4, near: 1, far: 22 });
    shadowLight.shadow.bias = -.00005; shadowLight.shadow.normalBias = .02; shadowLight.shadow.radius = 8; shadowLight.shadow.blurSamples = 10;
    scene.add(shadowLight);
    const fill = new THREE.DirectionalLight(0xe9ede9, .9); fill.position.set(4, 1.8, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.5); rim.position.set(-1, 4, -5); scene.add(rim);
    if (isFold) { if (isAbout) buildFold(); else buildFolds(); }
    else if (isAbout) buildWing(); else buildCells();

    const groundMaterial = new THREE.ShadowMaterial({ color: 0x3d443e, opacity: .13, depthWrite: false });
    materials.add(groundMaterial);
    const ground = mesh(geometry(new THREE.PlaneGeometry(30, 30)), groundMaterial, scene);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2.04; ground.castShadow = false;
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 63);
      gradient.addColorStop(0, 'rgba(34,41,34,.19)'); gradient.addColorStop(.4, 'rgba(34,41,34,.1)'); gradient.addColorStop(1, 'rgba(34,41,34,0)');
      context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(shadowCanvas); textures.add(texture);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: .64 }); materials.add(material);
      const contact = mesh(geometry(new THREE.PlaneGeometry(isAbout ? 5.7 : 4.7, 3.1)), material, scene);
      contact.rotation.x = -Math.PI / 2; contact.position.set(.08, -2.03, .08); contact.castShadow = contact.receiveShadow = false;
    }
  }

  function update(instant = false, dt = 1 / 60) {
    if (!assembly) return false;
    const amount = instant ? 1 : 1 - Math.exp(-dt * 8);
    const intendedX = paused ? 0 : targetX, intendedY = paused ? 0 : targetY;
    tiltX += (intendedX - tiltX) * amount; tiltY += (intendedY - tiltY) * amount;
    viewYaw += (intendedYaw - viewYaw) * amount; viewPitch += (intendedPitch - viewPitch) * amount;
    let changed = Math.abs(intendedX - tiltX) + Math.abs(intendedY - tiltY) + Math.abs(intendedYaw - viewYaw) + Math.abs(intendedPitch - viewPitch) > .0002;
    if (isAbout) {
      assembly.rotation.set((isFold ? -.08 : -.23) + viewPitch + tiltY * .035, (isFold ? -.30 : -.4) + viewYaw + tiltX * .045, isFold ? .035 : -.21);
      assembly.position.y = .03;
    } else {
      assembly.rotation.set(-.10 + tiltY * .03, -.24 + tiltX * .05, .055);
      assembly.position.y = .04;
    }
    pieces.forEach((piece, index) => {
      const goal = index === selected ? 1 : 0;
      piece.emphasis += (goal - piece.emphasis) * amount;
      if (Math.abs(goal - piece.emphasis) < .0003) piece.emphasis = goal; else changed = true;
      const e = piece.emphasis;
      piece.group.position.copy(piece.position); piece.group.position.z += e * .18;
      piece.group.position.y += e * .025;
      piece.group.rotation.set(piece.rotation.x, piece.rotation.y + e * (index % 2 ? -.035 : .035), piece.rotation.z);
      piece.face.color.copy(piece.colour).multiplyScalar(.97 + e * .09);
    });
    scene.updateMatrixWorld(true);
    return changed;
  }
  function render() {
    if (!renderer || destroyed || unavailable || !active || !width || !height) return;
    try { renderer.render(scene, camera); } catch { fail(); }
  }
  function canAnimate() { return !destroyed && !unavailable && active && !paused && visible && !document.hidden; }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    const dt = Math.min(.05, (now - (last || now - 16.67)) / 1000); last = now;
    moving = update(false, dt); render();
    if (moving && canAnimate()) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() {
    if (destroyed || unavailable) return;
    if (paused || !active || !visible || document.hidden) { moving = update(true); if (active && visible && !document.hidden) render(); }
    else if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function resize() {
    if (!renderer || destroyed || unavailable) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (rect.width === width && rect.height === height) return;
    width = rect.width; height = rect.height; renderer.setSize(width, height, false);
    const aspect = width / height, halfHeight = isAbout ? Math.max(2.18, 2.35 / aspect) : Math.max(2.12, (chapter === 'projects' ? 2.27 : 1.95) / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    moving = update(true); if (active && visible && !document.hidden) render();
  }
  function setSelection(index) {
    if (destroyed || isAbout || !Number.isInteger(index) || index < 0 || index >= count) return false;
    if (selected === index) return true;
    selected = index; moving = true; wake(); return true;
  }
  function turn(direction = 1) {
    if (!isAbout || destroyed || !Number.isFinite(direction)) return false;
    intendedYaw += Math.PI * direction; wake(); return true;
  }
  function resetView() { if (!isAbout || destroyed) return; intendedYaw = intendedPitch = targetX = targetY = 0; wake(); }
  function pauseChanged() {
    const next = manualPaused ?? reduced.matches;
    if (paused === next) return;
    paused = next; cancelAnimationFrame(frame); frame = 0; last = 0; targetX = targetY = 0;
    moving = update(true); if (active && visible && !document.hidden) render();
  }
  function setPaused(value) { if (destroyed) return; manualPaused = Boolean(value); pauseChanged(); }
  function setActive(value) {
    if (destroyed || active === Boolean(value)) return;
    active = Boolean(value);
    if (!active) { cancelPointer(); cancelAnimationFrame(frame); frame = 0; last = 0; moving = update(true); }
    else { resize(); update(true); render(); wake(); }
  }
  function visibilityChanged() {
    if (!visible || document.hidden || !active) { cancelAnimationFrame(frame); frame = 0; last = 0; moving = update(true); }
    else { resize(); wake(); }
  }
  function hit(x, y) {
    if (!ready || unavailable || destroyed || !active) return null;
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return null;
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickable, false)[0]?.object.userData.index ?? null;
  }
  function down(event) {
    if (event.button !== 0 || pressed) return;
    const index = hit(event.clientX, event.clientY); if (index === null) return;
    pressed = { index, id: event.pointerId, x: event.clientX, y: event.clientY, yaw: intendedYaw, pitch: intendedPitch, moved: false, dragging: false };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* Optional. */ }
  }
  function move(event) {
    if (unavailable || destroyed || !active) return;
    if (pressed && pressed.id === event.pointerId) {
      const dx = event.clientX - pressed.x, dy = event.clientY - pressed.y;
      if (Math.hypot(dx, dy) > 8) pressed.moved = true;
      if (isAbout) {
        if (!pressed.dragging && event.pointerType === 'touch' && Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx) * 1.2) { cancelPointer(); return; }
        if (!pressed.dragging && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * .8) pressed.dragging = true;
        if (pressed.dragging) {
          if (event.cancelable) event.preventDefault();
          intendedYaw = pressed.yaw + dx / Math.max(180, width * .55) * Math.PI;
          intendedPitch = clamp(pressed.pitch + dy / Math.max(200, height) * .45, -.35, .35);
          canvas.style.cursor = 'grabbing';
          if (paused) { update(true); render(); } else wake();
          return;
        }
      }
    }
    if (event.pointerType === 'touch') return;
    canvas.style.cursor = hit(event.clientX, event.clientY) === null ? 'default' : isAbout ? 'grab' : 'pointer';
    if (paused) return;
    const rect = canvas.getBoundingClientRect(); targetX = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1); targetY = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1); wake();
  }
  function cancelPointer() {
    const press = pressed; pressed = null;
    if (press) { try { canvas.releasePointerCapture(press.id); } catch { /* Already released. */ } }
  }
  function up(event) {
    if (!pressed || pressed.id !== event.pointerId) return;
    const press = pressed, index = hit(event.clientX, event.clientY); cancelPointer();
    canvas.style.cursor = index === null ? 'default' : isAbout ? 'grab' : 'pointer';
    if (!isAbout && !press.moved && index === press.index) { setSelection(index); onSelect?.(index); }
  }
  function leave() { targetX = targetY = 0; if (!pressed) canvas.style.cursor = 'default'; wake(); }
  function disposeGraphics() {
    for (const item of geometries) item.dispose(); for (const item of materials) item.dispose(); for (const item of textures) item.dispose();
    shadowLight?.shadow.map?.dispose(); shadowLight?.shadow.mapPass?.dispose(); environment?.dispose();
    if (renderer) {
      renderer.dispose();
      // The canvas is about to leave the document. Release its context now,
      // rather than waiting for garbage collection across chapter switches.
      if (!unavailable) renderer.forceContextLoss();
    }
  }
  function fail() {
    if (destroyed || unavailable) return;
    unavailable = true; ready = false; moving = false; cancelPointer(); cancelAnimationFrame(frame); frame = 0;
    queueMicrotask(() => { if (!destroyed) onUnavailable?.(); });
  }
  function contextLost(event) { event.preventDefault(); fail(); }
  function getState() {
    return { kind: chapter, variant: isFold ? 'fold' : 'wing', count, selected, paused, active, visible: visible && !document.hidden, ready, unavailable, moving, destroyed, ...(isAbout ? { view: { yaw: viewYaw, pitch: viewPitch } } : {}) };
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; ready = false; moving = false; cancelPointer(); cancelAnimationFrame(frame); frame = 0;
    resizeObserver?.disconnect(); visibilityObserver?.disconnect(); reduced.removeEventListener('change', pauseChanged); document.removeEventListener('visibilitychange', visibilityChanged);
    for (const [name, handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointerleave',leave],['pointercancel',cancelPointer],['lostpointercapture',cancelPointer],['webglcontextlost',contextLost]]) canvas.removeEventListener(name, handler);
    canvas.style.touchAction = before.touchAction; canvas.style.cursor = before.cursor;
    for (const [name, value] of [['aria-hidden', before.ariaHidden], ['tabindex', before.tabIndex]]) { if (value === null) canvas.removeAttribute(name); else canvas.setAttribute(name, value); }
    disposeGraphics();
  }

  for (const [name, handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointerleave',leave],['pointercancel',cancelPointer],['lostpointercapture',cancelPointer],['webglcontextlost',contextLost]]) canvas.addEventListener(name, handler);
  document.addEventListener('visibilitychange', visibilityChanged); reduced.addEventListener('change', pauseChanged);
  try {
    build(); update(true); resize();
    if (!unavailable) {
      ready = true; resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
      visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibilityChanged(); }); visibilityObserver.observe(canvas);
      queueMicrotask(() => { if (!destroyed && !unavailable) onReady?.(); });
    }
  } catch { fail(); }
  return { setSelection, setPaused, setActive, turn, resetView, destroy, getState };
}
