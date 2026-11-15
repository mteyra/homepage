import * as THREE from './vendor/three.module.js';

// A continuous material: folded ribbon → project aperture → helix → globe.
// Geography is drawn from the existing Natural Earth country outlines. The
// highlighted countries belong to the historical 2024 journal, not a live trip.
const TAU = Math.PI * 2;
const MODES = new Set(['home', 'work', 'about', 'travel']);
const HISTORICAL_COUNTRIES = new Set([
  'Estonia', 'Latvia', 'Lithuania', 'Poland', 'Slovakia', 'Hungary',
  'Croatia', 'Slovenia', 'Montenegro', 'Albania', 'Greece',
]);
const V = 32;
const MOBILE_MAX = 720;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smooth = t => t * t * (3 - 2 * t);
const ease = t => 1 - (1 - t) ** 4;
const seeded = n => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return v - Math.floor(v);
};

const vertexShader = `
  attribute float aSeed;
  attribute float aWarm;
  uniform float uTime;
  uniform float uLife;
  uniform float uPointSize;
  uniform float uPixelRatio;
  varying float vDepth;
  varying float vSeed;
  varying float vWarm;
  void main() {
    vec3 p = position;
    float theta = atan(p.y, p.x);
    float wave = sin(theta * 3.0 + uTime * .43) * .024
               + sin(theta * 5.0 - uTime * .27 + p.z * 2.0) * .016;
    p.xy *= 1.0 + wave * uLife;
    p.z += sin(theta * 2.0 + uTime * .31) * .042 * uLife;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    #ifdef PARTICLE
      gl_PointSize = min(12.0, uPointSize * uPixelRatio
        * (.68 + aSeed * .56) * (12.0 / -mv.z));
    #endif
    vDepth = clamp(.30 + (14.0 + mv.z) * .19, .20, 1.0);
    vSeed = aSeed;
    vWarm = aWarm;
  }
`;

const pointFragment = `
  uniform float uOpacity;
  uniform float uTime;
  uniform float uLife;
  uniform float uWarmth;
  varying float vDepth;
  varying float vSeed;
  varying float vWarm;
  void main() {
    float r = length(gl_PointCoord - .5);
    if (r > .5) discard;
    float halo = exp(-r * r * 22.0);
    float core = exp(-r * r * 100.0);
    float edge = 1.0 - smoothstep(.34, .5, r);
    vec3 ice = mix(vec3(.34,.61,.86), vec3(.80,.92,1.0), core);
    vec3 copper = mix(vec3(.72,.24,.11), vec3(1.0,.70,.42), core);
    vec3 color = mix(ice, copper, vWarm * uWarmth);
    float breathe = 1.0 + sin(uTime * .7 + vSeed * 20.0) * .08 * uLife;
    float alpha = (halo * .56 + core * .38) * edge
      * vDepth * uOpacity * breathe;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const lineFragment = `
  uniform float uOpacity;
  uniform float uWarmth;
  varying float vDepth;
  varying float vWarm;
  void main() {
    vec3 color = mix(vec3(.40,.66,.90),vec3(.96,.49,.26),vWarm*uWarmth);
    gl_FragColor=vec4(color,uOpacity*vDepth);
    #include <colorspace_fragment>
  }
`;

const skinFragment = `
  uniform float uOpacity;
  varying float vDepth;
  void main() {
    gl_FragColor=vec4(vec3(.12,.28,.43),uOpacity*vDepth);
    #include <colorspace_fragment>
  }
`;

function geographicPoint(lon, lat, radius = 1) {
  const phi = lat * Math.PI / 180;
  const theta = lon * Math.PI / 180;
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta),
  );
}

// Europe faces the visitor instead of drifting around the back of the globe.
const GLOBE_ORIENTATION = new THREE.Quaternion().setFromUnitVectors(
  geographicPoint(17, 48).normalize(), new THREE.Vector3(0, 0, 1),
);

function rectanglePoint(t, band) {
  // Equally spaced points around a wide aperture, with a fine layered edge.
  const perimeter = 6.4;
  const at = t * perimeter;
  const w = 1;
  const h = .60;
  let x, y;
  if (at < 2) { x = -w + at; y = h; }
  else if (at < 3.2) { x = w; y = h - (at - 2); }
  else if (at < 5.2) { x = w - (at - 3.2); y = -h; }
  else { x = -w; y = -h + (at - 5.2); }
  const offset = band * .038;
  const bevel = .045;
  x = clamp(x, -w + bevel, w - bevel) + Math.sign(x) * offset;
  y = clamp(y, -h + bevel, h - bevel) + Math.sign(y) * offset;
  return [x, y, band * .055];
}

function makeShapes(U) {
  const count = U * V;
  const shapes = Object.fromEntries([...MODES].map(mode => [mode, new Float32Array(count * 3)]));
  const seeds = new Float32Array(count);
  const warmth = new Float32Array(count);
  const vector = new THREE.Vector3();
  for (let u = 0; u < U; u++) {
    const t = u / (U - 1);
    const a = t * TAU;
    for (let v = 0; v < V; v++) {
      const i = u * V + v;
      const at = i * 3;
      const band = v / (V - 1) * 2 - 1;
      const cross = band * .66;
      // A broad, three-half-turn ribbon. Each strand remains a continuous
      // luminous filament; its changes in depth are genuinely three-dimensional.
      const radius = 1.86 + cross * Math.cos(a * 1.5)
        + .13 * Math.cos(a * 3 + .5);
      shapes.home[at] = Math.cos(a) * radius / 2.55;
      shapes.home[at + 1] = Math.sin(a) * radius / 2.55;
      shapes.home[at + 2] = (cross * Math.sin(a * 1.5)
        + .32 * Math.sin(a * 2 + .5)) / 2.55;

      const aperture = rectanglePoint(t, band);
      shapes.work.set(aperture, at);

      // Two winding, open ribbons rather than an illustrated molecular model.
      const helixAngle = t * TAU * 1.7 + (v >= V / 2 ? Math.PI : 0);
      const strip = (v % (V / 2)) / (V / 2 - 1) - .5;
      const helixRadius = .45 + strip * .28;
      shapes.about[at] = Math.cos(helixAngle) * helixRadius;
      shapes.about[at + 1] = (t * 2 - 1) * 1.15;
      shapes.about[at + 2] = Math.sin(helixAngle) * helixRadius;

      const lat = Math.asin(clamp(band * .985, -.999, .999)) * 180 / Math.PI;
      vector.copy(geographicPoint(t * 360 - 180, lat)).applyQuaternion(GLOBE_ORIENTATION);
      shapes.travel[at] = vector.x;
      shapes.travel[at + 1] = vector.y;
      shapes.travel[at + 2] = vector.z;
      seeds[i] = seeded(i + 1);
      // Copper is a few continuous seams, never a second competing cloud.
      warmth[i] = v === 3 || v === 4 ? .92 : v === 5 ? .20 : .0;
    }
  }
  return { shapes, seeds, warmth, count };
}

function makeIndices(U) {
  const lines = [];
  const faces = [];
  for (let u = 0; u < U - 1; u++) {
    for (let v = 0; v < V; v++) {
      const i = u * V + v;
      if (v % 3 === 0 || v === V - 1) lines.push(i, i + V);
      if (u % 40 === 0 && v < V - 1) lines.push(i, i + 1);
      if (v < V - 1) faces.push(i, i + V, i + 1, i + 1, i + V, i + V + 1);
    }
  }
  return { lines, faces };
}

/**
 * Create the visual layer on an existing full-viewport canvas.
 *
 * focus('home'|'work'|'about'|'travel')
 * setPaused(boolean) — user control, including overriding initial reduced motion
 * setActive(boolean) — suspension while the visual surface is not in use
 * destroy()          — disposes WebGL, listeners and pending geographic fetch
 */
export function createSignalWorld(canvas, { onReady, onUnavailable } = {}) {
  const inert = { focus() {}, setPaused() {}, setActive() {}, destroy() {} };
  if (!canvas) {
    onUnavailable?.(new Error('The signal canvas was not found.'));
    return inert;
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true,
      powerPreference: 'high-performance', premultipliedAlpha: false,
    });
    renderer.setClearColor(0x090b10, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
  } catch (error) {
    onUnavailable?.(error);
    return inert;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 80);
  camera.position.set(0, 0, 12);
  const root = new THREE.Group();
  scene.add(root);
  const U = innerWidth <= MOBILE_MAX ? 256 : 320;
  const { shapes, seeds, warmth } = makeShapes(U);
  const { lines, faces } = makeIndices(U);
  const positions = new Float32Array(shapes.home);
  const transitionFrom = new Float32Array(positions);
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const seedAttribute = new THREE.BufferAttribute(seeds, 1);
  const warmthAttribute = new THREE.BufferAttribute(warmth, 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('aSeed', seedAttribute);
  geometry.setAttribute('aWarm', warmthAttribute);
  const uniforms = {
    uTime: { value: 0 }, uLife: { value: 1 },
    uPointSize: { value: 4.1 }, uPixelRatio: { value: 1 },
    uOpacity: { value: 1 }, uWarmth: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader: pointFragment,
    defines: { PARTICLE: '' }, transparent: true,
    depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  root.add(points);
  const filamentGeometry = new THREE.BufferGeometry();
  filamentGeometry.setAttribute('position', positionAttribute);
  filamentGeometry.setAttribute('aSeed', seedAttribute);
  filamentGeometry.setAttribute('aWarm', warmthAttribute);
  filamentGeometry.setIndex(lines);
  const lineUniforms = {
    ...uniforms, uOpacity: { value: .25 }, uWarmth: { value: .75 },
  };
  const filamentMaterial = new THREE.ShaderMaterial({
    uniforms: lineUniforms, vertexShader, fragmentShader: lineFragment,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const filaments = new THREE.LineSegments(filamentGeometry, filamentMaterial);
  filaments.frustumCulled = false;
  filaments.renderOrder = 2;
  root.add(filaments);
  const skinGeometry = new THREE.BufferGeometry();
  skinGeometry.setAttribute('position', positionAttribute);
  skinGeometry.setAttribute('aSeed', seedAttribute);
  skinGeometry.setAttribute('aWarm', warmthAttribute);
  skinGeometry.setIndex(faces);
  const skinUniforms = { ...uniforms, uOpacity: { value: .075 } };
  const skinMaterial = new THREE.ShaderMaterial({
    uniforms: skinUniforms, vertexShader, fragmentShader: skinFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const skin = new THREE.Mesh(skinGeometry, skinMaterial);
  skin.frustumCulled = false;
  skin.renderOrder = 1;
  root.add(skin);

  const geography = new THREE.Group();
  root.add(geography);
  const globeCoreMaterial = new THREE.MeshBasicMaterial({
    color: 0x090b10, transparent: true, opacity: 0, depthWrite: false,
  });
  const globeCore = new THREE.Mesh(new THREE.SphereGeometry(.997, 64, 40), globeCoreMaterial);
  geography.add(globeCore);
  const countryMaterial = new THREE.LineBasicMaterial({
    color: 0x6996ba, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const visitedMaterial = new THREE.LineBasicMaterial({
    color: 0xffad79, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const visitedFillMaterial = new THREE.MeshBasicMaterial({
    color: 0xbe835e, transparent: true, opacity: 0, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  geography.visible = false;

  const fetchController = new AbortController();
  let destroyed = false;
  let failed = false;
  let mode = 'home';
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = true;
  let frame = 0;
  let lastTime = 0;
  let time = 0;
  let morph = 1;
  let morphStarted = 0;
  let geographyOpacity = 0;
  let ready = false;
  let width = 1;
  let height = 1;
  let viewHeight = 1;
  let viewWidth = 1;
  const pointer = new THREE.Vector2();
  const follow = new THREE.Vector2();
  const targetPosition = new THREE.Vector3();
  const targetScale = new THREE.Vector3(1, 1, 1);
  const targetRotation = new THREE.Vector3();
  const transitionPosition = new THREE.Vector3();
  const transitionScale = new THREE.Vector3(1, 1, 1);
  const transitionRotation = new THREE.Vector3();

  function layout(instant = false) {
    const mobile = width <= MOBILE_MAX;
    let cx, cy, diameter;
    if (mode === 'home') {
      cx = mobile ? .53 : .69;
      // The mobile introduction ends around 570px. A taller, absolutely
      // positioned canvas can participate in the document's scroll; either
      // canvas arrangement keeps the sculpture below the reading area.
      cy = mobile ? Math.max(780, Math.min(825, height * .76)) / height : .53;
      diameter = mobile ? Math.min(width * 1.00, height * .55) : height * .76;
      const r = diameter / height * viewHeight / 2;
      targetScale.set(r, r, r);
      targetRotation.set(.44, -.24, -.29);
    } else if (mode === 'work') {
      cx = mobile ? .5 : .58;
      cy = mobile ? .63 : .50;
      const w = mobile ? width * .93 : width * .70;
      const h = mobile ? Math.min(height * .39, width * .68) : height * .53;
      targetScale.set(w / width * viewWidth / 2, h / height * viewHeight / 1.2, viewHeight * .33);
      targetRotation.set(0, 0, 0);
    } else if (mode === 'about') {
      cx = mobile ? .78 : .79;
      cy = mobile ? .67 : .55;
      diameter = mobile ? height * .45 : height * .69;
      const r = diameter / height * viewHeight / 2;
      targetScale.set(r, r, r);
      targetRotation.set(.12, .15, -.34);
    } else {
      cx = mobile ? .54 : .72;
      cy = mobile ? .68 : .55;
      diameter = mobile ? Math.min(width * .96, height * .50) : Math.min(width * .57, height * .82);
      const r = diameter / height * viewHeight / 2;
      targetScale.set(r, r, r);
      targetRotation.set(0, 0, -.025);
    }
    targetPosition.set((cx - .5) * viewWidth, (.5 - cy) * viewHeight, 0);
    if (instant) {
      root.position.copy(targetPosition);
      root.scale.copy(targetScale);
      root.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);
    }
  }

  function resize() {
    if (destroyed) return;
    const nextWidth = canvas.clientWidth || innerWidth;
    const nextHeight = canvas.clientHeight || innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.6);
    if (nextWidth === width && nextHeight === height && ratio === uniforms.uPixelRatio.value) return;
    width = nextWidth;
    height = nextHeight;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    uniforms.uPixelRatio.value = ratio;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    viewWidth = viewHeight * camera.aspect;
    layout(true);
    requestDraw();
  }

  function applyState(dt, instant = false) {
    const rate = instant ? 1 : 1 - Math.exp(-dt * 4.2);
    const visualRate = instant ? 1 : 1 - Math.exp(-dt * 3.8);
    const wasMorphing = morph < 1;
    if (wasMorphing) morph = instant ? 1 : clamp((performance.now() - morphStarted) / 1350, 0, 1);
    const amount = ease(morph);
    if (wasMorphing) {
      root.position.lerpVectors(transitionPosition, targetPosition, amount);
      root.scale.lerpVectors(transitionScale, targetScale, amount);
    } else {
      root.position.lerp(targetPosition, rate);
      root.scale.lerp(targetScale, rate);
    }
    follow.lerp(pointer, instant ? 0 : 1 - Math.exp(-dt * 2.5));
    const pointerStrength = mode === 'home' ? .14 : mode === 'about' ? .09 : mode === 'travel' ? .07 : .008;
    const drift = !paused && (mode === 'home' || mode === 'about');
    const x = targetRotation.x + follow.y * pointerStrength + (drift ? Math.sin(time * .17) * .07 : 0);
    const y = targetRotation.y + follow.x * pointerStrength + (drift ? Math.sin(time * .13) * .11 : 0);
    const z = targetRotation.z + (drift ? Math.sin(time * .11) * .055 : 0);
    root.rotation.x = lerp(wasMorphing ? transitionRotation.x : root.rotation.x, x, wasMorphing ? amount : rate);
    root.rotation.y = lerp(wasMorphing ? transitionRotation.y : root.rotation.y, y, wasMorphing ? amount : rate);
    root.rotation.z = lerp(wasMorphing ? transitionRotation.z : root.rotation.z, z, wasMorphing ? amount : rate);
    const life = mode === 'home' ? 1 : mode === 'about' ? .6 : 0;
    uniforms.uLife.value = lerp(uniforms.uLife.value, life, visualRate);
    const pointOpacity = mode === 'home' ? 1.17 : mode === 'work' ? .52 : mode === 'about' ? .36 : .25;
    const lineOpacity = mode === 'home' ? .30 : mode === 'work' ? .20 : mode === 'about' ? .095 : .12;
    const skinOpacity = mode === 'home' ? .075 : mode === 'work' ? .035 : mode === 'about' ? .028 : .012;
    uniforms.uOpacity.value = lerp(uniforms.uOpacity.value, pointOpacity, visualRate);
    lineUniforms.uOpacity.value = lerp(lineUniforms.uOpacity.value, lineOpacity, visualRate);
    skinUniforms.uOpacity.value = lerp(skinUniforms.uOpacity.value, skinOpacity, visualRate);
    uniforms.uWarmth.value = lerp(uniforms.uWarmth.value, mode === 'travel' ? 0 : 1, visualRate);
    lineUniforms.uWarmth.value = lerp(lineUniforms.uWarmth.value, mode === 'travel' ? 0 : .75, visualRate);
    // Geographic overlays belong only to the globe. Hide them as soon as its
    // route is left, and reveal them near the end of the globe morph. A slow
    // WebGL frame rate must not leave borders superimposed on the home ribbon.
    geographyOpacity = mode === 'travel' ? (instant ? 1 : smooth(clamp((morph - .55) / .45, 0, 1))) : 0;
    geography.visible = mode === 'travel' && geographyOpacity > .005;
    globeCoreMaterial.opacity = geographyOpacity * .96;
    globeCoreMaterial.depthWrite = geographyOpacity > .85;
    countryMaterial.opacity = geographyOpacity * .54;
    visitedMaterial.opacity = geographyOpacity * .96;
    visitedFillMaterial.opacity = geographyOpacity * .15;
    if (wasMorphing || instant) {
      if (instant) morph = 1;
      const target = shapes[mode];
      for (let i = 0; i < positions.length; i++) {
        positions[i] = lerp(transitionFrom[i], target[i], instant ? 1 : amount);
      }
      positionAttribute.needsUpdate = true;
    }
  }

  function render() {
    if (destroyed || failed) return;
    try {
      renderer.render(scene, camera);
      if (!ready) { ready = true; onReady?.(); }
    } catch (error) {
      failed = true;
      cancelAnimationFrame(frame);
      onUnavailable?.(error);
    }
  }

  function animate(now) {
    frame = 0;
    if (destroyed || failed || !active || document.hidden) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .045) : 1 / 60;
    lastTime = now;
    if (!paused) time += dt;
    uniforms.uTime.value = time;
    applyState(dt, paused);
    render();
    if (!paused && !destroyed && !failed) frame = requestAnimationFrame(animate);
  }

  function requestDraw() {
    if (!frame && !destroyed && !failed && active && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function onPointer(event) {
    if (paused || !active || event.pointerType === 'touch') return;
    pointer.set(
      clamp((event.clientX / width - .5) * 2, -1, 1),
      clamp((event.clientY / height - .5) * 2, -1, 1),
    );
  }
  function onPointerOut(event) {
    if (!event.relatedTarget) pointer.set(0, 0);
  }
  function onVisibility() {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestDraw();
  }
  function onContextLost(event) {
    event.preventDefault();
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onUnavailable?.(new Error('WebGL context was lost.'));
  }

  function addGeography(data) {
    const countries = [];
    const visited = [];
    const fills = [];
    const vector = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (const country of data) {
      const highlighted = HISTORICAL_COUNTRIES.has(country.name);
      const polygons = country.geometry.type === 'MultiPolygon'
        ? country.geometry.coordinates : [country.geometry.coordinates];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          const destination = highlighted ? visited : countries;
          for (let i = 1; i < ring.length; i++) {
            a.copy(geographicPoint(...ring[i - 1], 1.007));
            b.copy(geographicPoint(...ring[i], 1.007));
            const segments = Math.max(1, Math.ceil(a.angleTo(b) / .035));
            let previous = a.clone().applyQuaternion(GLOBE_ORIENTATION);
            for (let k = 1; k <= segments; k++) {
              vector.copy(a).lerp(b, k / segments).normalize().multiplyScalar(1.007).applyQuaternion(GLOBE_ORIENTATION);
              destination.push(previous.x, previous.y, previous.z, vector.x, vector.y, vector.z);
              previous.copy(vector);
            }
          }
        }
        if (highlighted && polygon[0]?.length >= 3) {
          // Local lon/lat triangulation is sufficient for these small European
          // polygons. Every vertex is then placed on the true sphere.
          const contour = polygon[0].slice(0, -1).map(p => new THREE.Vector2(p[0], p[1]));
          const holes = polygon.slice(1).map(ring => ring.slice(0, -1).map(p => new THREE.Vector2(p[0], p[1])));
          const all = [...contour, ...holes.flat()];
          const triangles = THREE.ShapeUtils.triangulateShape(contour, holes);
          for (const triangle of triangles) {
            for (const index of triangle) {
              vector.copy(geographicPoint(all[index].x, all[index].y, 1.003)).applyQuaternion(GLOBE_ORIENTATION);
              fills.push(vector.x, vector.y, vector.z);
            }
          }
        }
      }
    }
    const makeLines = (values, lineMaterial) => {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3));
      const line = new THREE.LineSegments(lineGeometry, lineMaterial);
      line.renderOrder = 4;
      geography.add(line);
    };
    makeLines(countries, countryMaterial);
    makeLines(visited, visitedMaterial);
    const fillGeometry = new THREE.BufferGeometry();
    fillGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fills, 3));
    const fill = new THREE.Mesh(fillGeometry, visitedFillMaterial);
    fill.renderOrder = 2;
    geography.add(fill);
    requestDraw();
  }

  fetch(new URL('./europe.json', import.meta.url), { signal: fetchController.signal })
    .then(response => {
      if (!response.ok) throw new Error('Country outlines could not be loaded.');
      return response.json();
    })
    .then(data => {
      if (!destroyed && Array.isArray(data)) addGeography(data);
    })
    .catch(error => {
      // A geographic asset failure never removes the rest of the homepage.
      if (error.name !== 'AbortError') console.warn('Signal globe:', error.message);
    });

  window.addEventListener('resize', resize, { passive: true });
  const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  sizeObserver?.observe(canvas);
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerout', onPointerOut, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  resize();
  applyState(0, true);
  render();
  requestDraw();

  return {
    focus(nextMode) {
      if (destroyed) return;
      const next = MODES.has(nextMode) ? nextMode : 'home';
      if (next === mode) return;
      transitionFrom.set(positions);
      transitionPosition.copy(root.position);
      transitionScale.copy(root.scale);
      transitionRotation.set(root.rotation.x, root.rotation.y, root.rotation.z);
      mode = next;
      morph = paused ? 1 : 0;
      morphStarted = performance.now();
      if (mode !== 'travel') {
        geography.visible = false;
        geographyOpacity = 0;
      }
      if (paused) positions.set(shapes[mode]);
      positionAttribute.needsUpdate = true;
      layout(paused);
      if (paused) applyState(0, true);
      requestDraw();
    },
    setPaused(value) {
      if (destroyed) return;
      paused = Boolean(value);
      lastTime = 0;
      if (paused) {
        cancelAnimationFrame(frame);
        frame = 0;
        applyState(0, true);
      }
      requestDraw();
    },
    setActive(value) {
      if (destroyed) return;
      active = Boolean(value);
      lastTime = 0;
      if (!active) { cancelAnimationFrame(frame); frame = 0; }
      else requestDraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      fetchController.abort();
      sizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          for (const item of Array.isArray(object.material) ? object.material : [object.material]) materials.add(item);
        }
      });
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      renderer.dispose();
      scene.clear();
    },
  };
}
