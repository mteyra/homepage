/**
 * ALOHA's palm, adapted from Marc's original procedural exhibit geometry:
 * Aloha-Robotics-HH2.0/Website/site/palm.mjs (buildExhibit).
 *
 * The ten pinnate fronds, folded leaflets, curved ringed trunk, crown spears,
 * coconuts and indexed plinth retain the original construction and silhouette.
 * This adaptation supplies static Three.js BufferGeometry and quiet materials.
 * No original repository assets, renderer, shaders or runtime are required.
 */

const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const add = (a, b) => a.map((value, i) => value + b[i]);
const sub = (a, b) => a.map((value, i) => value - b[i]);
const mul = (a, amount) => a.map(value => value * amount);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = vector => mul(vector, 1 / (Math.hypot(...vector) || 1));

/**
 * Records real face boundaries rather than a wireframe of every triangulation.
 * A quad contributes four edges, while a folded leaflet retains its ridge.
 */
class Surface {
  constructor(THREE) {
    this.THREE = THREE;
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.edges = new Map();
    this.palette = new Map();
  }

  color(hex) {
    if (!this.palette.has(hex)) {
      const color = new this.THREE.Color(hex);
      this.palette.set(hex, [color.r, color.g, color.b]);
    }
    return this.palette.get(hex);
  }

  edge(a, b) {
    if (Math.hypot(...sub(a, b)) < 0.000001) return;
    const ids = [a, b].map(point => point.map(n => n.toFixed(5)).join(','));
    const key = ids.sort().join('|');
    if (!this.edges.has(key)) this.edges.set(key, [...a, ...b]);
  }

  triangle(a, b, c, hex, recordEdges = true) {
    const perpendicular = cross(sub(b, a), sub(c, a));
    if (Math.hypot(...perpendicular) < 0.00000001) return;
    const normal = unit(perpendicular);
    const color = this.color(hex);
    for (const point of [a, b, c]) {
      this.positions.push(...point);
      this.normals.push(...normal);
      this.colors.push(...color);
    }
    if (recordEdges) {
      this.edge(a, b);
      this.edge(b, c);
      this.edge(c, a);
    }
  }

  quad(a, b, c, d, hex, recordEdges = true) {
    this.triangle(a, b, c, hex, false);
    this.triangle(a, c, d, hex, false);
    if (recordEdges) {
      this.edge(a, b);
      this.edge(b, c);
      this.edge(c, d);
      this.edge(d, a);
    }
  }

  geometry() {
    const geometry = new this.THREE.BufferGeometry();
    geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new this.THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new this.THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  edgeGeometry() {
    const geometry = new this.THREE.BufferGeometry();
    geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(
      [...this.edges.values()].flat(), 3,
    ));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function cylinder(surface, a, b, radiusA, radiusB, tint, segments = 12) {
  const axis = unit(sub(b, a));
  const u = unit(cross(axis, Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const v = cross(axis, u);
  const point = (center, radius, angle) => add(center, add(
    mul(u, Math.cos(angle) * radius),
    mul(v, Math.sin(angle) * radius),
  ));
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * TAU;
    const next = (i + 1) / segments * TAU;
    const p = point(a, radiusA, angle);
    const q = point(a, radiusA, next);
    const r = point(b, radiusB, next);
    const s = point(b, radiusB, angle);
    surface.quad(p, q, r, s, tint);
    // Cap triangulations are hidden construction, not structural spokes.
    surface.triangle(a, q, p, tint, false);
    surface.triangle(b, s, r, tint, false);
  }
}

function ring(surface, radius, width, y, tint, segments = 96, start = 0, end = TAU) {
  const point = (r, angle) => [Math.cos(angle) * r, y, Math.sin(angle) * r];
  for (let i = 0; i < segments; i++) {
    const a = mix(start, end, i / segments);
    const b = mix(start, end, (i + 1) / segments);
    surface.quad(
      point(radius - width / 2, a),
      point(radius - width / 2, b),
      point(radius + width / 2, b),
      point(radius + width / 2, a),
      tint,
      false,
    );
  }
}

function orb(surface, center, radius, tint, stretch = [1, 1, 1]) {
  const point = (latitude, longitude) => add(center, [
    Math.cos(latitude) * Math.cos(longitude) * radius * stretch[0],
    Math.sin(latitude) * radius * stretch[1],
    Math.cos(latitude) * Math.sin(longitude) * radius * stretch[2],
  ]);
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + j / 6 * Math.PI;
      const b = -Math.PI / 2 + (j + 1) / 6 * Math.PI;
      const u = i / 10 * TAU;
      const v = (i + 1) / 10 * TAU;
      surface.quad(point(a, u), point(a, v), point(b, v), point(b, u), tint);
    }
  }
}

/**
 * Returns a self-contained Group, centered in X/Z, with its bottom at Y=0
 * and total height of 4 scene units. Parent owns transforms and disposal.
 */
export function createPalm(THREE) {
  const foliage = new Surface(THREE);
  const timber = new Surface(THREE);
  const furniture = new Surface(THREE);
  const ornaments = new Surface(THREE);
  const palm = new THREE.Group();
  palm.name = 'Aloha palm';

  // Original shallow exhibit base; the former coral details are neutral.
  cylinder(furniture, [0, -0.03, 0], [0, 0.09, 0], 1.13, 1.13, '#4e5349', 96);
  cylinder(furniture, [0, 0.09, 0], [0, 0.115, 0], 1.13, 1.105, '#6d7160', 96);
  ring(furniture, 1.07, 0.014, 0.119, '#a8a58a');
  ring(furniture, 0.97, 0.006, 0.12, '#888b75');
  ring(furniture, 1.132, 0.008, 0.028, '#888b75');

  for (let i = 0; i < 48; i++) {
    const angle = i / 48 * TAU;
    const length = i % 4 === 0 ? 0.065 : 0.023;
    const radial = [Math.cos(angle), 0, Math.sin(angle)];
    const tangent = [-radial[2], 0, radial[0]];
    const p = mul(radial, 1.04);
    const q = mul(radial, 1.04 - length);
    p[1] = q[1] = 0.121;
    furniture.quad(
      add(p, mul(tangent, 0.002)),
      add(q, mul(tangent, 0.002)),
      add(q, mul(tangent, -0.002)),
      add(p, mul(tangent, -0.002)),
      '#b1b09a',
      false,
    );
  }

  const trunk = t => [
    -0.33 + 0.73 * t * t - 0.18 * t * t * t,
    0.125 + t * 2.18,
    0.06 + Math.sin(t * Math.PI) * 0.11,
  ];
  const trunkTints = ['#8b7e60', '#9c8c6d', '#a19273'];
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const next = (i + 1) / 24;
    const radiusA = mix(0.115, 0.062, t);
    const radiusB = mix(0.115, 0.062, next);
    cylinder(timber, trunk(t), trunk(next), radiusA, radiusB, trunkTints[i % 3], 10);
    cylinder(
      timber, trunk(t + 0.01), trunk(t + 0.029),
      radiusA * 1.06, radiusA * 1.04, '#6e6c53', 10,
    );
  }

  const crown = trunk(1);
  cylinder(
    foliage, add(crown, [0, -0.1, 0]), add(crown, [0, 0.22, 0]),
    0.1, 0.066, '#818d6e', 10,
  );
  const leafTints = ['#667c69', '#72836d', '#829179', '#5b7266', '#88977e', '#697d70'];

  // Ten original fronds, each with a curved rib and twelve pairs of blades.
  for (let frond = 0; frond < 10; frond++) {
    const theta = frond / 10 * TAU + 0.14;
    const radial = [Math.cos(theta), 0, Math.sin(theta)];
    const side = [-Math.sin(theta), 0, Math.cos(theta)];
    const length = 1.35 + (frond % 3) * 0.15;
    const rise = 0.46 + (frond % 2) * 0.14;
    const droop = frond % 3 === 0 ? 0.48 : 0.27;
    const root = add(crown, [0, 0.12 + (frond % 2) * 0.035, 0]);
    const spine = t => add(root, add(mul(radial, length * t), [
      0, rise * Math.sin(t * Math.PI * 0.85) - droop * t * t, 0,
    ]));

    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      const next = (i + 1) / 14;
      const a = spine(t);
      const b = spine(next);
      const width = mix(0.023, 0.003, t);
      foliage.quad(
        add(a, mul(side, width)),
        add(b, mul(side, width * 0.9)),
        add(b, mul(side, -width * 0.9)),
        add(a, mul(side, -width)),
        '#9daa8b',
      );
    }

    for (let i = 0; i < 12; i++) {
      const t = 0.13 + i * 0.067;
      for (const sign of [-1, 1]) {
        const start = spine(t);
        const span = (0.13 + Math.sin(t * Math.PI) * 0.34) * (1 - 0.1 * (frond % 2));
        const end = add(start, add(mul(side, span * sign), add(
          mul(radial, 0.22 + 0.17 * t),
          [0, -0.1 - 0.13 * t, 0],
        )));
        const mid = add(add(start, mul(sub(end, start), 0.46)), [0, 0.027, 0]);
        const width = 0.028 + Math.sin(t * Math.PI) * 0.025;
        const left = add(mid, mul(radial, -width));
        const right = add(mid, mul(radial, width));
        const ridge = add(mid, [0, 0.038, 0]);
        const tint = leafTints[(frond + (sign === 1 ? 0 : 1)) % leafTints.length];
        foliage.triangle(start, left, ridge, tint);
        foliage.triangle(left, end, ridge, tint);
        foliage.triangle(start, ridge, right, tint);
        foliage.triangle(ridge, end, right, tint);
      }
    }
  }

  // The fresh spears preserve the asymmetric height and real folded surfaces.
  for (let i = 0; i < 2; i++) {
    const a = add(crown, [0, 0.09, 0]);
    const b = add(crown, [i ? -0.3 : 0.22, 0.8, i ? 0.19 : -0.14]);
    const mid = add(mul(add(a, b), 0.5), [0, 0.03, 0]);
    const width = i ? [0, 0, 0.065] : [0.075, 0, 0];
    foliage.triangle(a, add(mid, width), b, '#9aa589');
    foliage.triangle(a, b, sub(mid, width), '#748870');
  }

  for (const [x, y, z, radius] of [
    [-0.1, -0.04, 0.08, 0.095],
    [0.075, -0.05, 0.12, 0.086],
    [0.055, 0.005, -0.085, 0.079],
  ]) {
    orb(ornaments, add(crown, [x, y, z]), radius, '#a19673', [0.85, 1.12, 0.85]);
  }
  orb(ornaments, [-0.69, 0.165, 0.23], 0.105, '#a8a58c', [1.3, 0.52, 0.8]);
  orb(ornaments, [-0.54, 0.147, 0.39], 0.064, '#8d927b', [1.1, 0.48, 0.8]);
  cylinder(furniture, [0.61, 0.122, 0.37], [0.61, 0.145, 0.37], 0.042, 0.042, '#a2a38a', 20);
  ring(furniture, 1.07, 0.023, 0.124, '#a2a38a', 16, 0.3, 0.55);

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.name = 'Palm matte vertex colors';
  const parts = [
    { surface: foliage, name: 'Folded fronds and crown', edgeColor: '#c3ceb2', opacity: 0.24 },
    { surface: timber, name: 'Curved trunk and leaf scars', edgeColor: '#c7b894', opacity: 0.22 },
    { surface: ornaments, name: 'Coconuts and stones', edgeColor: '#c8c1a5', opacity: 0.17 },
    { surface: furniture, name: 'Indexed exhibit base', edgeColor: '#b5b9a6', opacity: 0.16 },
  ];
  const bounds = new THREE.Box3();

  for (const part of parts) {
    const mesh = new THREE.Mesh(part.surface.geometry(), material);
    mesh.name = part.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: part.edgeColor,
      transparent: true,
      opacity: part.opacity,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(part.surface.edgeGeometry(), edgeMaterial);
    edges.name = `${part.name} — structural edges`;
    edges.renderOrder = 2;
    palm.add(mesh, edges);
    bounds.union(mesh.geometry.boundingBox);
  }

  // Bake normalization into the geometry so consumers can position the group
  // normally without compensating for an internal scale or off-center origin.
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 4 / (bounds.max.y - bounds.min.y);
  for (const child of palm.children) {
    child.geometry.translate(-center.x, -bounds.min.y, -center.z);
    child.geometry.scale(scale, scale, scale);
    child.geometry.computeBoundingBox();
    child.geometry.computeBoundingSphere();
  }
  palm.userData = {
    source: 'Aloha-Robotics-HH2.0/Website/site/palm.mjs',
    height: 4,
    fronds: 10,
    foldedLeaflets: 240,
  };
  return palm;
}
