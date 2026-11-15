import * as THREE from './vendor/three.module.js';

// Nomad's Station: a small architectural world, built entirely from geometry.
const P = { porcelain: 0xeff1ee, chassis: 0x151c2a, metal: 0x627083, glass: 0x5b76ff, signal: 0xff553b, night: 0x10192b };
const TAU = Math.PI * 2;
const positions = {
  work: new THREE.Vector3(-7.5, 0, -6.5),
  study: new THREE.Vector3(7.2, 0, -5.8),
  travel: new THREE.Vector3(8.1, 0, 7),
  about: new THREE.Vector3(-7.2, 0, 7.2),
};
const stationIds = Object.keys(positions);
const clamp = THREE.MathUtils.clamp;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createWorld(canvas, callbacks = {}) {
  const inert = { focus() {}, setPaused() {}, setActive() {}, setRoutes() { return { routes: 0, points: 0 }; }, destroy() {} };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    callbacks.onUnavailable?.();
    return inert;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(P.night);
  scene.fog = new THREE.FogExp2(P.night, 0.0055);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.2, 280);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const materials = {
    porcelain: new THREE.MeshStandardMaterial({ color: P.porcelain, roughness: 0.65, metalness: 0.12 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xcfd2d0, roughness: 0.72, metalness: 0.1 }),
    chassis: new THREE.MeshStandardMaterial({ color: P.chassis, roughness: 0.58, metalness: 0.55 }),
    metal: new THREE.MeshStandardMaterial({ color: P.metal, roughness: 0.36, metalness: 0.76 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x3346a2, emissive: 0x26398e, emissiveIntensity: 0.3, roughness: 0.22, metalness: 0.68 }),
    signal: new THREE.MeshStandardMaterial({ color: 0x050101, emissive: P.signal, emissiveIntensity: 1, roughness: 0.4, toneMapped: false }),
    blue: new THREE.MeshStandardMaterial({ color: 0x02030a, emissive: 0x446aff, emissiveIntensity: 1, roughness: 0.4, toneMapped: false }),
    rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
    floor: new THREE.MeshStandardMaterial({ color: 0x111b2d, roughness: 0.96, metalness: 0.05 }),
    window: new THREE.MeshStandardMaterial({ color: 0x243555, emissive: 0x263a63, emissiveIntensity: 0.28, metalness: 0.55, roughness: 0.3 }),
  };
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x637fb5, transparent: true, opacity: 0.42 });
  const signalLineMaterial = new THREE.LineBasicMaterial({ color: P.signal, transparent: true, opacity: 0.92 });
  const paleLineMaterial = new THREE.LineBasicMaterial({ color: 0xd1dbee, transparent: true, opacity: 0.68 });
  const allMaterials = new Set([...Object.values(materials), lineMaterial, signalLineMaterial, paleLineMaterial]);
  const campus = new THREE.Group();
  scene.add(campus);
  const stations = {};
  const mechanisms = [];
  const rotations = [];
  const streamParticles = [];
  const pulseMaterials = [];
  const pointGeometry = new THREE.SphereGeometry(0.055, 6, 4);
  let destroyed = false, frame = 0, width = 1, height = 1, aspect = 1;
  let active = 'overview', view = 'overview', visible = true, contextLost = false;
  let lastTime = 0, elapsed = 0, lastProjection = 0, framing = 0;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionQuery.matches;
  let manualMotion = false;
  let transition = null;
  const lookAt = new THREE.Vector3(0, 1, 0);
  const projectionVector = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.1;
  raycaster.params.Points.threshold = 0.1;
  const pointer = new THREE.Vector2();
  let orbitYaw = Math.atan2(32, 38), orbitPitch = 0.52;
  let drag = null;

  function mesh(geometry, material, parent = campus, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, parent, [x, y, z]);
  }
  function cylinder(top, bottom, h, material, parent, x = 0, y = 0, z = 0, sides = 32) {
    return mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material, parent, [x, y, z]);
  }
  function ring(radius, tube, material, parent, position = [0, 0, 0], rotation = [Math.PI / 2, 0, 0], arc = TAU) {
    const object = mesh(new THREE.TorusGeometry(radius, tube, 6, 80, arc), material, parent, position);
    object.rotation.set(...rotation);
    return object;
  }
  function line(points, material = lineMaterial, parent = campus, closed = false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const object = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
    parent.add(object);
    return object;
  }
  function tube(points, radius, material, parent, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed);
    return mesh(new THREE.TubeGeometry(curve, 56, radius, 7, closed), material, parent);
  }
  function beam(a, b, thickness, material, parent = campus) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const object = box(thickness, start.distanceTo(end), thickness, material, parent);
    object.position.copy(start).lerp(end, 0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return object;
  }
  function slab(w, d, h, material, parent, x = 0, y = 0, z = 0) {
    const r = Math.min(0.22, w / 6, d / 6), shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 3 });
    const object = mesh(geometry, material, parent, [x, y, z]);
    object.rotation.x = -Math.PI / 2;
    return object;
  }
  function station(id) {
    const group = new THREE.Group();
    group.position.copy(positions[id]);
    group.userData.station = id;
    campus.add(group);
    stations[id] = group;
    slab(7.2, 7.2, 0.4, materials.chassis, group, 0, 0, 0);
    slab(6.9, 6.9, 0.22, materials.porcelain, group, 0, 0.4, 0);
    slab(6.55, 6.55, 0.1, materials.warm, group, 0, 0.62, 0);
    // Fine reveal around each raised ceramic platform.
    for (const x of [-3.5, 3.5]) box(0.06, 0.055, 4.8, materials.blue, group, x, 0.36, 0);
    for (const x of [-2.8, 2.8]) for (const z of [-2.8, 2.8]) {
      cylinder(0.12, 0.16, 0.9, materials.chassis, group, x, 1.1, z, 8);
      cylinder(0.13, 0.13, 0.1, materials.porcelain, group, x, 1.6, z, 8);
    }
    return group;
  }

  // Lighting is deliberately architectural: broad neutral key, blue edge, warm bounce.
  scene.add(new THREE.HemisphereLight(0xa9c5ff, 0x283040, 2.0));
  const key = new THREE.DirectionalLight(0xfff7eb, 3.7);
  key.position.set(-12, 32, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  Object.assign(key.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 90 });
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0001;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x597bff, 3.4);
  rim.position.set(7, 12, -24);
  scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xffa393, 0.5);
  bounce.position.set(20, 6, 20);
  scene.add(bounce);

  // Fractured basalt island. Separate faces preserve a crafted geological silhouette.
  const rockPositions = [], rockColors = [];
  const segments = 34;
  const geologicalRings = [
    { y: -0.36, radius: 18.7 }, { y: -1.25, radius: 19.2 },
    { y: -4.35, radius: 15.7 }, { y: -6.75, radius: 5.6 },
  ].map((level, levelIndex) => Array.from({ length: segments }, (_, index) => {
    const a = index / segments * TAU;
    const variation = 0.9 + random(index + 4) * 0.15;
    return new THREE.Vector3(Math.cos(a) * level.radius * variation, level.y + (levelIndex ? random(index * 3 + levelIndex) * 0.7 : 0), Math.sin(a) * level.radius * 0.87 * variation);
  }));
  function rockFace(a, b, c, shade) {
    const color = new THREE.Color().setRGB(shade * 0.07, shade * 0.10, shade * 0.17);
    [a, b, c].forEach(v => { rockPositions.push(v.x, v.y, v.z); rockColors.push(color.r, color.g, color.b); });
  }
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    rockFace(new THREE.Vector3(0, -0.36, 0), geologicalRings[0][next], geologicalRings[0][i], 0.13 + random(i) * 0.035);
    for (let level = 0; level < 3; level += 1) {
      const [a, b, c, d] = [geologicalRings[level][i], geologicalRings[level][next], geologicalRings[level + 1][i], geologicalRings[level + 1][next]];
      rockFace(a, b, c, 0.08 + random(i * 9 + level) * 0.085);
      rockFace(b, d, c, 0.075 + random(i * 7 + level) * 0.075);
    }
  }
  const rockGeometry = new THREE.BufferGeometry();
  rockGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rockPositions, 3));
  rockGeometry.setAttribute('color', new THREE.Float32BufferAttribute(rockColors, 3));
  rockGeometry.computeVertexNormals();
  mesh(rockGeometry, materials.rock);
  geologicalRings.slice(1, 3).forEach(points => line(points, new THREE.LineBasicMaterial({ color: 0x48566e, transparent: true, opacity: 0.2 }), campus, true));
  // Embedded service strata and foundation ribs contrast with the raw rock.
  for (let i = 0; i < 18; i += 1) {
    const a = i / 18 * TAU;
    const p = [Math.cos(a) * 15.4, -2.4, Math.sin(a) * 13.4];
    const rib = box(0.55, 2.5 + random(i) * 1.5, 1, materials.chassis, campus, ...p);
    rib.rotation.y = -a;
    if (i % 3 === 0) {
      const strip = box(0.09, 1.1, 1.03, materials.signal, campus, p[0], -1.9, p[2]);
      strip.rotation.y = -a;
    }
  }

  // Terraced paths form one continuous place, including stairs and service rails.
  slab(5.2, 5.2, 0.45, materials.chassis, campus, 0, -0.05, 0);
  slab(4.85, 4.85, 0.16, materials.porcelain, campus, 0, 0.4, 0);
  ring(1.35, 0.028, materials.signal, campus, [0, 0.59, 0]);
  ring(1.65, 0.025, materials.metal, campus, [0, 0.58, 0]);
  for (let i = 0; i < 8; i += 1) {
    const a = i / 8 * TAU;
    const marker = box(0.06, 0.02, i % 2 ? 0.18 : 0.35, materials.chassis, campus, Math.sin(a) * 1.8, 0.59, Math.cos(a) * 1.8);
    marker.rotation.y = a;
  }
  function walkway(a, b, w = 1.65) {
    const direction = new THREE.Vector3().subVectors(b, a);
    const distance = direction.length();
    const center = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const platform = slab(w, distance, 0.2, materials.porcelain, campus, center.x, 0.34, center.z);
    platform.rotation.z = Math.atan2(direction.x, direction.z);
    const side = new THREE.Vector3(direction.z, 0, -direction.x).normalize().multiplyScalar(w / 2 - 0.13);
    for (const s of [-1, 1]) {
      const start = a.clone().addScaledVector(side, s), end = b.clone().addScaledVector(side, s);
      line([new THREE.Vector3(start.x, 0.565, start.z), new THREE.Vector3(end.x, 0.565, end.z)], signalLineMaterial);
    }
    for (let i = 1; i < distance / 1.1; i += 1) {
      const p = a.clone().lerp(b, i * 1.1 / distance);
      const joint = box(w - 0.3, 0.012, 0.025, materials.metal, campus, p.x, 0.55, p.z);
      joint.rotation.y = Math.atan2(direction.x, direction.z);
    }
  }
  stationIds.forEach(id => walkway(new THREE.Vector3(), positions[id]));
  walkway(positions.work, positions.study, 1.15);
  walkway(positions.about, positions.travel, 1.15);
  for (const x of [-12.6, 12.6]) {
    slab(1.35, 17, 0.24, materials.chassis, campus, x, -0.16, 0);
    for (let z = -7; z <= 7; z += 2.8) {
      box(0.1, 1.35, 0.1, materials.metal, campus, x, 0.57, z);
      box(0.4, 0.09, 0.3, materials.porcelain, campus, x, 1.28, z);
      box(0.26, 0.025, 0.19, materials.blue, campus, x, 1.34, z);
    }
  }

  // WORK / exposed computation yard, with separated ceramic server decks.
  const work = station('work');
  const workLift = new THREE.Group();
  work.add(workLift);
  const towers = [
    [-1.65, -1.45, 6.3, 1.65], [0.5, -1.65, 4.9, 1.55], [2.05, -0.1, 3.7, 1.35],
    [-1.85, 1.4, 3.4, 1.5], [0.2, 1.1, 5.35, 1.7],
  ];
  const liftedDecks = [];
  towers.forEach(([x, z, h, w], towerIndex) => {
    box(w * 0.72, h, w * 0.72, materials.chassis, workLift, x, 0.75 + h / 2, z);
    box(w * 0.76, h * 0.75, 0.05, materials.glass, workLift, x, 1 + h / 2, z + w * 0.37);
    const floors = Math.round(h / 0.58);
    for (let level = 0; level <= floors; level += 1) {
      const deck = slab(w, w, 0.15, materials.porcelain, workLift, x, 0.8 + level * 0.55, z);
      liftedDecks.push({ object: deck, y: deck.position.y, layer: level / floors, tower: towerIndex });
      if (level % 3 === 1) box(w * 0.64, 0.045, 0.03, materials.blue, workLift, x, 0.92 + level * 0.55, z + w / 2 + 0.02);
    }
    slab(w + 0.12, w + 0.12, 0.22, materials.porcelain, workLift, x, h + 1.05, z);
    box(0.08, 0.8, 0.08, materials.metal, workLift, x, h + 1.6, z);
    mesh(pointGeometry, materials.signal, workLift, [x, h + 2, z]);
  });
  slab(5.1, 1, 0.18, materials.porcelain, work, 0, 3.55, -0.1);
  for (const x of [-2.1, 2.1]) beam([x, 0.75, -0.1], [x, 3.5, -0.1], 0.13, materials.metal, work);
  // A physical I/O terminal and animated packets in a routed service conduit.
  const workConsole = box(1.65, 0.22, 0.85, materials.chassis, work, 1.45, 1.25, 2.65);
  workConsole.rotation.x = 0.25;
  const panel = box(1.38, 0.025, 0.59, materials.glass, workConsole, 0, 0.13, 0);
  panel.castShadow = false;
  const packetCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.65, 1.05, 2.65), new THREE.Vector3(-2.65, 3.35, 2.65),
    new THREE.Vector3(-2.65, 5.3, -2.5), new THREE.Vector3(0.5, 5.3, -2.5),
    new THREE.Vector3(2.7, 2.1, -2.2), new THREE.Vector3(2.7, 1.05, 2.65),
  ]);
  const conduit = mesh(new THREE.TubeGeometry(packetCurve, 70, 0.023, 4), materials.metal, work);
  conduit.castShadow = false;
  for (let i = 0; i < 9; i += 1) {
    const particle = mesh(new THREE.SphereGeometry(0.075, 7, 5), i % 3 ? materials.blue : materials.signal, work);
    particle.castShadow = false;
    streamParticles.push({ object: particle, curve: packetCurve, offset: i / 9 });
  }
  mechanisms.push({ id: 'work', value: 0, update(value) {
    liftedDecks.forEach(({ object, y, layer }) => { object.position.y = y + value * layer * 1.6; });
  } });

  // STUDY / a research observatory, its lens suspended in an opening ceramic iris.
  const study = station('study');
  cylinder(2.65, 2.85, 0.35, materials.chassis, study, 0, 0.85, 0, 64);
  cylinder(2.48, 2.48, 0.16, materials.porcelain, study, 0, 1.1, 0, 64);
  const researchCore = new THREE.Group();
  researchCore.position.y = 3.55;
  study.add(researchCore);
  const coreMaterial = new THREE.MeshStandardMaterial({ color: P.signal, emissive: P.signal, emissiveIntensity: 0.8, roughness: 0.4 });
  allMaterials.add(coreMaterial);
  mesh(new THREE.IcosahedronGeometry(0.66, 1), coreMaterial, researchCore).castShadow = false;
  const coreCage = mesh(new THREE.IcosahedronGeometry(1.12, 1), materials.glass, researchCore);
  const cageWire = new THREE.LineSegments(new THREE.EdgesGeometry(coreCage.geometry), paleLineMaterial);
  coreCage.visible = false;
  researchCore.add(cageWire);
  rotations.push({ object: researchCore, speed: 0.1, axis: 'y' });
  const arch = ring(2.35, 0.19, materials.porcelain, study, [0, 3.3, 0], [0.18, 0, 0], Math.PI * 1.64);
  arch.rotation.z = -0.32 * Math.PI;
  ring(2.35, 0.055, materials.chassis, study, [0, 3.3, 0.2], [0.18, 0, -0.32 * Math.PI], Math.PI * 1.64);
  for (const x of [-1.9, 1.9]) beam([x, 1.2, 0], [x * 0.63, 5.3, -0.15], 0.18, materials.metal, study);
  const iris = new THREE.Group();
  iris.position.y = 3.45;
  study.add(iris);
  for (let i = 0; i < 10; i += 1) {
    const angle = i / 10 * TAU;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 2.25, -0.27, 0.27, false);
    shape.absarc(0, 0, 1.4, 0.27, -0.27, true);
    shape.closePath();
    const blade = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 5 }), materials.porcelain, iris);
    blade.rotation.set(-Math.PI / 2, 0, angle);
    const fin = box(0.075, 0.045, 0.65, materials.metal, iris, Math.cos(angle) * 1.81, 0.17, -Math.sin(angle) * 1.81);
    fin.rotation.y = angle + Math.PI / 2;
  }
  const neuralPositions = [];
  const neuralNodes = [];
  for (let i = 0; i < 28; i += 1) {
    const y = 1 - i / 27 * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963;
    const point = new THREE.Vector3(Math.cos(a) * r * 1.65, y * 1.55 + 3.55, Math.sin(a) * r * 1.65);
    neuralNodes.push(point);
    const dot = mesh(pointGeometry, i % 7 === 0 ? materials.signal : materials.blue, study, point.toArray());
    dot.castShadow = false;
  }
  neuralNodes.forEach((point, i) => neuralNodes.slice(i + 1).forEach(other => {
    if (point.distanceTo(other) < 1.28) neuralPositions.push(...point.toArray(), ...other.toArray());
  }));
  const neuralGeometry = new THREE.BufferGeometry();
  neuralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(neuralPositions, 3));
  study.add(new THREE.LineSegments(neuralGeometry, lineMaterial));
  cylinder(0.38, 0.75, 1.65, materials.chassis, study, 0, 1.9, 0, 8);
  ring(1.95, 0.035, materials.blue, study, [0, 1.26, 0]);
  mechanisms.push({ id: 'study', value: 0, update(value) {
    iris.position.y = 3.45 + value * 1.45;
    iris.rotation.y = value * 0.48;
    iris.scale.setScalar(1 + value * 0.16);
  } });

  // TRAVEL / a cartographic sphere inside a mechanically supported orbital cradle.
  const travel = station('travel');
  cylinder(2.55, 2.8, 0.24, materials.chassis, travel, 0, 0.85, 0, 64);
  cylinder(2.28, 2.4, 0.19, materials.porcelain, travel, 0, 1.06, 0, 64);
  ring(2.05, 0.025, materials.signal, travel, [0, 1.19, 0]);
  cylinder(0.33, 0.7, 0.8, materials.metal, travel, 0, 1.5, 0, 12);
  const globe = new THREE.Group();
  globe.position.y = 3.25;
  globe.rotation.z = -0.18;
  travel.add(globe);
  const globeMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2e58, metalness: 0.45, roughness: 0.4 });
  allMaterials.add(globeMaterial);
  mesh(new THREE.SphereGeometry(1.89, 40, 28), globeMaterial, globe).castShadow = false;
  function onSphere(lon, lat, radius = 1.91) {
    const u = lon * Math.PI / 180, v = lat * Math.PI / 180;
    return new THREE.Vector3(Math.cos(v) * Math.cos(u) * radius, Math.sin(v) * radius, -Math.cos(v) * Math.sin(u) * radius);
  }
  for (let lat = -60; lat <= 60; lat += 20) line(Array.from({ length: 97 }, (_, i) => onSphere(i / 96 * 360, lat)), lineMaterial, globe);
  for (let lon = 0; lon < 360; lon += 20) line(Array.from({ length: 65 }, (_, i) => onSphere(lon, -90 + i / 64 * 180)), lineMaterial, globe);
  const continents = [
    [[-168, 70], [-135, 73], [-60, 48], [-83, 8], [-105, 22], [-127, 48]],
    [[-80, 11], [-49, 1], [-35, -8], [-53, -56], [-72, -47]],
    [[-17, 35], [12, 38], [35, 30], [51, 12], [35, -34], [18, -35], [-4, 5]],
    [[-10, 36], [-9, 58], [38, 72], [70, 73], [180, 60], [145, 35], [110, 0], [75, 8], [46, 38]],
    [[112, -12], [144, -10], [155, -28], [135, -39], [113, -30]],
    [[-54, 60], [-18, 73], [-40, 84], [-63, 78]],
  ];
  function inPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [x, y] = polygon[i], [px, py] = polygon[j];
      if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) inside = !inside;
    }
    return inside;
  }
  const landPoints = [];
  for (let lat = -55; lat <= 80; lat += 5) for (let lon = -180; lon < 180; lon += 5) {
    if (continents.some(polygon => inPolygon([lon, lat], polygon))) landPoints.push(...onSphere(lon, lat, 1.922).toArray());
  }
  const landGeometry = new THREE.BufferGeometry();
  landGeometry.setAttribute('position', new THREE.Float32BufferAttribute(landPoints, 3));
  const dotsMaterial = new THREE.PointsMaterial({ color: 0xe7edfa, size: 0.038, sizeAttenuation: true });
  allMaterials.add(dotsMaterial);
  globe.add(new THREE.Points(landGeometry, dotsMaterial));
  const routeLayer = new THREE.Group();
  routeLayer.userData.station = 'travel';
  globe.add(routeLayer);
  const routeMaterial = new THREE.LineBasicMaterial({
    color: P.signal, transparent: true, opacity: 0.98, toneMapped: false, depthWrite: false,
  });
  allMaterials.add(routeMaterial);
  function setRoutes(collection) {
    if (destroyed || collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      return { routes: 0, points: 0, skipped: 1 };
    }
    const segments = [], pointBudget = 10000;
    let skipped = 0;
    const valid = point => Array.isArray(point) && point.length >= 2
      && Number.isFinite(point[0]) && Number.isFinite(point[1])
      && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
    for (const feature of collection.features) {
      const geometry = feature?.geometry;
      const parts = geometry?.type === 'LineString' ? [geometry.coordinates]
        : geometry?.type === 'MultiLineString' && Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
      if (!parts.length) skipped += 1;
      for (const coordinates of parts) {
        if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 100000
          || !coordinates.every(valid) || segments.length >= pointBudget / 2) { skipped += 1; continue; }
        segments.push(coordinates);
      }
    }
    // Reserve both endpoints before sharing the remaining budget, so long routes
    // cannot consume the capacity needed to represent later segments.
    const interiorCount = segments.reduce((sum, coordinates) => sum + coordinates.length - 2, 0);
    const interiorBudget = Math.min(interiorCount, pointBudget - segments.length * 2);
    const allocations = segments.map((coordinates, index) => {
      const share = interiorCount ? interiorBudget * (coordinates.length - 2) / interiorCount : 0;
      const interior = Math.floor(share);
      return { index, count: interior + 2, remainder: share - interior };
    });
    let pointCount = allocations.reduce((sum, allocation) => sum + allocation.count, 0);
    const unused = segments.length * 2 + interiorBudget - pointCount;
    const byRemainder = [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; i < unused; i++) { byRemainder[i].count += 1; pointCount += 1; }
    const prepared = allocations.map(({ index, count }) => {
      const coordinates = segments[index];
      return Array.from({ length: count }, (_, i) => {
        const coordinate = coordinates[Math.round(i * (coordinates.length - 1) / (count - 1))];
        return onSphere(coordinate[0], coordinate[1], 1.97);
      });
    });
    [...routeLayer.children].forEach(child => { child.geometry?.dispose(); routeLayer.remove(child); });
    prepared.forEach(points => {
      const route = line(points, routeMaterial, routeLayer);
      route.userData.station = 'travel';
    });
    requestFrame();
    return { routes: prepared.length, points: pointCount, skipped };
  }
  const cradle = new THREE.Group();
  cradle.position.y = 3.25;
  cradle.rotation.z = -0.18;
  travel.add(cradle);
  ring(2.25, 0.13, materials.porcelain, cradle, [0, 0, 0], [0, Math.PI / 2, 0], Math.PI * 1.8);
  ring(2.6, 0.055, materials.metal, cradle, [0, 0, 0], [0.8, 0.1, 0.2]);
  ring(2.61, 0.025, materials.signal, cradle, [0, 0, 0], [0.8, 0.1, 0.2], Math.PI * 0.65);
  for (const x of [-2.4, 2.4]) {
    beam([x, 1.15, 0], [x * 0.92, 3.5, 0], 0.15, materials.chassis, travel);
    cylinder(0.24, 0.24, 0.3, materials.metal, travel, x * 0.92, 3.5, 0, 12).rotation.z = Math.PI / 2;
  }
  rotations.push({ object: globe, speed: 0.045, axis: 'y' });
  mechanisms.push({ id: 'travel', value: 0, update(value) {
    cradle.scale.setScalar(1 + value * 0.15);
    cradle.rotation.y = value * 0.38;
  } });

  // ABOUT / the orientation hall: open porcelain architecture and a nomad compass.
  const about = station('about');
  slab(5.5, 5.2, 0.24, materials.chassis, about, 0, 0.78, 0);
  slab(5.2, 4.9, 0.14, materials.porcelain, about, 0, 1.02, 0);
  for (const x of [-2.25, 2.25]) for (const z of [-1.85, 1.85]) {
    box(0.34, 3.9, 0.34, materials.porcelain, about, x, 3.1, z);
    box(0.07, 3.3, 0.08, materials.chassis, about, x + 0.17, 3.1, z + 0.12);
  }
  for (let i = 0; i < 7; i += 1) {
    const fin = box(0.13, 3.45, 1.1, materials.porcelain, about, -1.65 + i * 0.55, 2.88, -2.1);
    fin.rotation.y = -0.3;
  }
  const roof = new THREE.Group();
  roof.position.y = 5.04;
  about.add(roof);
  for (const z of [-2, 2]) slab(5.55, 0.72, 0.26, materials.porcelain, roof, 0, 0, z);
  for (const x of [-2.42, 2.42]) slab(0.7, 4.1, 0.26, materials.porcelain, roof, x, 0, 0);
  for (let i = -2; i <= 2; i += 1) box(0.12, 0.14, 4.7, materials.metal, roof, i * 0.88, 0.31, 0);
  // The two horn-like sweeps form a navigational emblem attached to the hall.
  for (const side of [-1, 1]) {
    const points = [
      new THREE.Vector3(side * 0.18, 1.65, -0.5), new THREE.Vector3(side * 0.55, 3.0, -0.5),
      new THREE.Vector3(side * 1.55, 4.15, -0.6), new THREE.Vector3(side * 1.66, 3.0, -0.48),
      new THREE.Vector3(side * 1.06, 2.68, -0.32),
    ];
    tube(points, 0.16, materials.metal, about);
    tube(points.map(point => point.clone().add(new THREE.Vector3(0, 0, 0.15))), 0.028, materials.signal, about).castShadow = false;
  }
  cylinder(1.45, 1.55, 0.18, materials.chassis, about, 0, 1.3, 0.45, 48);
  ring(1.28, 0.025, materials.signal, about, [0, 1.41, 0.45]);
  const compass = new THREE.Group();
  compass.position.set(0, 1.46, 0.45);
  about.add(compass);
  for (let i = 0; i < 8; i += 1) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.13); shape.lineTo(-0.13, 0.42); shape.lineTo(0, i % 2 ? 0.8 : 1.12); shape.lineTo(0.13, 0.42); shape.closePath();
    const needle = mesh(new THREE.ShapeGeometry(shape), i === 0 ? materials.signal : materials.porcelain, compass);
    needle.rotation.set(-Math.PI / 2, 0, i / 8 * TAU);
    needle.castShadow = false;
  }
  slab(2.1, 0.9, 0.16, materials.chassis, about, 0, 1.9, 2.05);
  box(1.7, 0.025, 0.55, materials.glass, about, 0, 2.07, 2.05);
  mechanisms.push({ id: 'about', value: 0, update(value) { roof.position.y = 5.04 + value * 1.15; } });

  // Service details give the campus human scale without turning it into a toy city.
  for (const id of stationIds) {
    const group = stations[id];
    for (let i = 0; i < 4; i += 1) {
      slab(1.8, 0.32, 0.13, materials.porcelain, group, 0, 0.11 + i * 0.15, 4.15 - i * 0.32);
    }
    for (const x of [-2.5, 2.5]) {
      box(0.52, 0.65, 0.85, materials.chassis, group, x, 1.08, 2.2);
      box(0.38, 0.025, 0.66, materials.metal, group, x, 1.42, 2.2);
    }
    const indicatorMaterial = materials.signal.clone();
    indicatorMaterial.emissiveIntensity = 0.35;
    allMaterials.add(indicatorMaterial);
    box(2.4, 0.045, 0.04, indicatorMaterial, group, 0, 0.69, 3.45);
    pulseMaterials.push({ id, material: indicatorMaterial });
    group.traverse(object => { object.userData.station = id; });
  }
  const floor = mesh(new THREE.PlaneGeometry(500, 500), materials.floor, scene, [0, -8.8, 0]);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const grid = new THREE.GridHelper(160, 80, 0x334461, 0x263751);
  grid.position.y = -8.76;
  grid.material.transparent = true;
  grid.material.opacity = 0.23;
  scene.add(grid);
  for (const radius of [25, 38]) ring(radius, 0.012, materials.metal, scene, [0, -8.73, 0]);
  const dustPositions = [];
  for (let i = 0; i < 110; i += 1) dustPositions.push((random(i * 3) - 0.5) * 100, random(i * 3 + 1) * 35 + 3, (random(i * 3 + 2) - 0.5) * 100);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: 0x8ca4d1, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false });
  allMaterials.add(dustMaterial);
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  const labelAnchors = {
    work: new THREE.Vector3(-7.5, 9.5, -6.5),
    study: new THREE.Vector3(7.2, 7.2, -5.8),
    travel: new THREE.Vector3(8.1, 6.5, 7),
    about: new THREE.Vector3(-7.2, 6.2, 7.2),
  };
  function pose(id) {
    if (id === 'plan') {
      return { position: new THREE.Vector3(0, 62 * Math.max(1, 0.98 / aspect), 8), target: new THREE.Vector3(0, 0, 0), framing: 0 };
    }
    if (!positions[id]) {
      const radius = 58 * Math.max(1, 1.03 / aspect);
      return {
        position: new THREE.Vector3(Math.sin(orbitYaw) * Math.cos(orbitPitch) * radius, Math.sin(orbitPitch) * radius, Math.cos(orbitYaw) * Math.cos(orbitPitch) * radius),
        target: new THREE.Vector3(0, 0.6, 0),
        framing: 0,
      };
    }
    const p = positions[id];
    const offsets = { work: [11.8, 8.4, 14.8], study: [10.8, 7.8, 13.6], travel: [11.4, 7.0, 13.5], about: [10.2, 7.2, 13.7] };
    const offset = new THREE.Vector3(...offsets[id]);
    if (width <= 900) offset.multiplyScalar(id === 'work' ? 2.05 : 1.6);
    return { position: p.clone().add(offset), target: p.clone().add(new THREE.Vector3(0, id === 'work' ? 3.5 : 3, 0)), framing: 1 };
  }
  function projection() {
    if (framing > 0.001) {
      camera.setViewOffset(width, height, width <= 900 ? 0 : width * 0.17 * framing, width <= 900 ? height * 0.20 * framing : 0, width, height);
    } else camera.clearViewOffset();
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
  }
  function projectLabels() {
    stationIds.forEach(id => {
      projectionVector.copy(labelAnchors[id]).project(camera);
      const x = (projectionVector.x * 0.5 + 0.5) * width;
      const y = (-projectionVector.y * 0.5 + 0.5) * height;
      const shown = projectionVector.z > -1 && projectionVector.z < 1 && x > 20 && x < width - 20 && y > 30 && y < height - 40;
      callbacks.onProject?.(id, x, y, shown);
    });
  }
  function setActive(id) {
    active = stationIds.includes(id) ? id : 'overview';
    pulseMaterials.forEach(entry => { entry.material.emissiveIntensity = entry.id === active ? 1 : 0.35; });
    requestFrame();
  }
  function focus(id) {
    view = positions[id] || id === 'plan' ? id : 'overview';
    setActive(view);
    const destination = pose(view);
    if (paused || motionQuery.matches) {
      camera.position.copy(destination.position);
      lookAt.copy(destination.target);
      framing = destination.framing;
      transition = null;
      mechanisms.forEach(mechanism => { mechanism.value = mechanism.id === active ? 1 : 0; mechanism.update(mechanism.value); });
      renderer.shadowMap.needsUpdate = true;
    } else {
      transition = {
        start: performance.now(), duration: 1.4, fromPosition: camera.position.clone(),
        fromTarget: lookAt.clone(), fromFraming: framing, ...destination,
      };
    }
    requestFrame();
  }
  function resize() {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    aspect = width / height;
    camera.aspect = aspect;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width <= 900 ? 1.3 : 1.5));
    renderer.setSize(width, height, false);
    camera.updateProjectionMatrix();
    const destination = pose(view);
    camera.position.copy(destination.position);
    lookAt.copy(destination.target);
    framing = destination.framing;
    transition = null;
    renderer.shadowMap.needsUpdate = true;
    requestFrame();
  }
  function update(delta) {
    let mechanismsMoving = false;
    if (transition) {
      const fraction = clamp((performance.now() - transition.start) / 1000 / transition.duration, 0, 1);
      const t = ease(fraction);
      camera.position.lerpVectors(transition.fromPosition, transition.position, t);
      camera.position.y += Math.sin(fraction * Math.PI) * 2.3;
      lookAt.lerpVectors(transition.fromTarget, transition.target, t);
      framing = THREE.MathUtils.lerp(transition.fromFraming, transition.framing, t);
      if (fraction === 1) transition = null;
    }
    mechanisms.forEach(mechanism => {
      const target = mechanism.id === active ? 1 : 0;
      if (Math.abs(mechanism.value - target) > 0.001) {
        mechanism.value = paused ? target : THREE.MathUtils.damp(mechanism.value, target, 4.3, delta);
        mechanism.update(mechanism.value);
        mechanismsMoving = true;
      }
    });
    if (mechanismsMoving) renderer.shadowMap.needsUpdate = true;
    if (!paused) {
      elapsed += delta;
      rotations.forEach(({ object, speed, axis }) => { object.rotation[axis] += delta * speed; });
      streamParticles.forEach(({ object, curve, offset }) => object.position.copy(curve.getPointAt((elapsed * 0.07 + offset) % 1)));
      dust.rotation.y += delta * 0.0012;
    }
    projection();
  }
  function render(time = 0) {
    frame = 0;
    if (destroyed || contextLost || !visible || document.hidden) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.25) : 1 / 30;
    if (lastTime && time - lastTime < 1000 / 30 - 1) { requestFrame(); return; }
    lastTime = time;
    update(delta);
    renderer.render(scene, camera);
    if (time - lastProjection > 30 || paused) { projectLabels(); lastProjection = time; }
    if (!paused || transition || mechanisms.some(m => Math.abs(m.value - (m.id === active ? 1 : 0)) > 0.001)) requestFrame();
  }
  function requestFrame() {
    if (!frame && !destroyed && !contextLost && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  function setPaused(value) {
    manualMotion = true;
    paused = Boolean(value);
    if (paused && transition) {
      camera.position.copy(transition.position);
      lookAt.copy(transition.target);
      framing = transition.framing;
      transition = null;
    }
    lastTime = 0;
    requestFrame();
  }
  function pick(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(Object.values(stations), true)[0];
    return hit?.object.userData.station;
  }
  function pointerDown(event) {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag) {
      canvas.style.cursor = pick(event) ? 'pointer' : view === 'overview' ? 'grab' : 'default';
      return;
    }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
    if (drag.moved && view === 'overview') {
      orbitYaw = clamp(orbitYaw - dx * 0.003, -0.15, 1.35);
      orbitPitch = clamp(orbitPitch + dy * 0.0025, 0.35, 0.95);
      const destination = pose('overview');
      camera.position.copy(destination.position);
      lookAt.copy(destination.target);
      transition = null;
      canvas.style.cursor = 'grabbing';
      requestFrame();
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
  }
  function pointerUp(event) {
    if (drag && !drag.moved) {
      const id = pick(event);
      if (id) callbacks.onSelect?.(id);
    }
    drag = null;
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.style.cursor = view === 'overview' ? 'grab' : 'default';
  }
  function pointerCancel() { drag = null; }
  function visibilityChange() { lastTime = 0; requestFrame(); }
  function motionChange() {
    if (!manualMotion) {
      paused = motionQuery.matches;
      if (paused) focus(view);
      requestFrame();
    }
  }
  function lost(event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    callbacks.onUnavailable?.();
  }
  function restored() {
    contextLost = false;
    renderer.shadowMap.needsUpdate = true;
    callbacks.onReady?.();
    requestFrame();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    lastTime = 0;
    requestFrame();
  });
  intersectionObserver.observe(canvas);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  document.addEventListener('visibilitychange', visibilityChange);
  motionQuery.addEventListener('change', motionChange);
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  streamParticles.forEach(({ object, curve, offset }) => object.position.copy(curve.getPointAt(offset)));
  resize();
  projection();
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  projectLabels();
  callbacks.onReady?.();
  requestFrame();

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', visibilityChange);
    motionQuery.removeEventListener('change', motionChange);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    const geometries = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => allMaterials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    allMaterials.forEach(material => material.dispose());
    renderer.dispose();
  }
  return { focus, setPaused, setActive, setRoutes, destroy };
}
