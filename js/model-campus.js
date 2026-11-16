/**
 * A miniature of the actual Rommelweb campus, not a substitute city.
 *
 * campus-mesh.js bakes the original Rommelweb exterior builders against its
 * public LoD2 and path data. Its provenance retains the source hashes,
 * attribution, licenses and limits. No interior or resident data is included.
 *
 * Building positions and heights share one uniform scale. The only additions
 * are a shallow display plinth and discreet skirts beneath elevated buildings;
 * these support the maquette and do not represent surveyed terrain.
 */
import { campusMesh } from './campus-mesh.js';

const SURFACE_COLORS = {
  timber: '#7b705e',
  plates: '#785c52',
  roof: '#66715e',
  recess: '#29342e',
  frame: '#344137',
  glass: '#455e5d',
  sill: '#a1aa94',
  frame51: '#c7ad5d',
  frame53: '#c67c4a',
  frame55: '#b95650',
  frame57: '#bdc1b6',
  frame59: '#78966a',
  detailRoofBed: '#5e6b50',
  detailMetal: '#9ca88f',
  detailRecess: '#27332c',
  detailSoffit: '#79856b',
  detailGlazing: '#405b59',
  detailRoofHardware: '#818e78',
  detailLime: '#a7bb76',
  foundation: '#46513f',
  road: '#69745d',
  path: '#7a846b',
};

const LINE_STYLES = {
  outline: ['structure', '#d2d7c6'],
  storeys: ['detail', '#babca6'],
  timberSeams: ['texture', '#baad94'],
  platesSeams: ['texture', '#b7a28e'],
  windowLines: ['detail', '#c0c9b5'],
  windowFrame: ['detail', '#8b9a85'],
  detailMetal: ['detail', '#c4cfb5'],
  detailRoofTexture: ['texture', '#a7b98b'],
  detailLime: ['detail', '#c2d49a'],
  pathEdge: ['site', '#a7b299'],
};

/**
 * Static, synchronous, buildless Three.js model. Bottom Y=0, centered X/Z,
 * footprint 4.5 × 4.40 units; source heights are never exaggerated.
 */
export function createCampus(THREE) {
  const group = new THREE.Group();
  group.name = 'Rommelweb campus maquette';
  const ring = campusMesh.base.ring;
  const minX = Math.min(...ring.map(point => point[0]));
  const maxX = Math.max(...ring.map(point => point[0]));
  const minZ = Math.min(...ring.map(point => point[1]));
  const maxZ = Math.max(...ring.map(point => point[1]));
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const scale = campusMesh.base.width / Math.max(maxX - minX, maxZ - minZ);
  const topOffset = campusMesh.base.topOffset;
  const { min, step } = campusMesh.quantization;
  const colorCache = new Map();

  function color(hex) {
    if (!colorCache.has(hex)) colorCache.set(hex, new THREE.Color(hex));
    return colorCache.get(hex);
  }

  // Explicit little-endian decoding also works on non-little-endian hosts.
  // Quantization error is below 1.5 mm in original campus coordinates.
  function positions(layer) {
    const binary = atob(layer.positions);
    const result = new Float32Array(layer.count * 3);
    for (let i = 0; i < result.length; i++) {
      const axis = i % 3;
      const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
      const native = min[axis] + value * step[axis];
      result[i] = axis === 1
        ? native * scale + topOffset
        : (native - (axis === 0 ? centerX : centerZ)) * scale;
    }
    return result;
  }

  function geometry(layers, colorForRole) {
    const count = layers.reduce((total, layer) => total + layer.count, 0);
    const xyz = new Float32Array(count * 3);
    const rgb = new Float32Array(count * 3);
    let offset = 0;
    for (const layer of layers) {
      xyz.set(positions(layer), offset);
      if (layer.colors) {
        const binary = atob(layer.colors);
        for (let i = 0; i < layer.count * 3; i++) rgb[offset + i] = binary.charCodeAt(i) / 255;
      } else {
        const tint = color(colorForRole(layer.role));
        for (let i = 0; i < layer.count; i++) {
          rgb[offset + i * 3] = tint.r;
          rgb[offset + i * 3 + 1] = tint.g;
          rgb[offset + i * 3 + 2] = tint.b;
        }
      }
      offset += layer.count * 3;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
    result.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    result.computeBoundingBox();
    result.computeBoundingSphere();
    return result;
  }

  const walls = geometry(
    campusMesh.layers.filter(layer => layer.kind === 'mesh' && layer.role !== 'weathering'),
    role => SURFACE_COLORS[role] || '#7c8973',
  );
  walls.computeVertexNormals();
  const wallsMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const buildings = new THREE.Mesh(walls, wallsMaterial);
  buildings.name = 'Eleven source buildings, detailed exteriors and mapped paths';
  buildings.castShadow = true;
  buildings.receiveShadow = true;
  group.add(buildings);

  const boards = geometry(
    campusMesh.layers.filter(layer => layer.role === 'weathering'),
    () => '#7b705e',
  );
  boards.computeVertexNormals();
  const boardMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const timber = new THREE.Mesh(boards, boardMaterial);
  timber.name = '3980 individually clipped timber boards';
  timber.receiveShadow = true;
  timber.renderOrder = 1;
  group.add(timber);

  const lineBuckets = new Map([
    ['structure', { opacity: 0.36, layers: [] }],
    ['detail', { opacity: 0.24, layers: [] }],
    ['texture', { opacity: 0.09, layers: [] }],
    ['site', { opacity: 0.24, layers: [] }],
  ]);
  function lineStyle(role) {
    return LINE_STYLES[role] || ['detail', SURFACE_COLORS[role] || '#a9b49c'];
  }
  for (const layer of campusMesh.layers.filter(layer => layer.kind === 'lines')) {
    lineBuckets.get(lineStyle(layer.role)[0]).layers.push(layer);
  }
  for (const [name, bucket] of lineBuckets) {
    if (!bucket.layers.length) continue;
    const lines = new THREE.LineSegments(
      geometry(bucket.layers, role => lineStyle(role)[1]),
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: bucket.opacity,
        depthWrite: false,
      }),
    );
    lines.name = `Campus ${name} linework`;
    lines.renderOrder = 2;
    group.add(lines);
  }

  // A clipped display extent: its chamfers are exhibition furniture, not a
  // claim about property boundaries. Real mapped paths stop at this edge.
  const baseOutline = ring.slice(0, -1).map(point => [
    (point[0] - centerX) * scale,
    (point[1] - centerZ) * scale,
  ]);
  const topY = campusMesh.base.topSourceY * scale + topOffset;
  const basePositions = [];
  const baseEdges = [];
  const bottomY = 0;
  for (let i = 0; i < baseOutline.length; i++) {
    const a = baseOutline[i];
    const b = baseOutline[(i + 1) % baseOutline.length];
    const topA = [a[0], topY, a[1]];
    const topB = [b[0], topY, b[1]];
    const bottomA = [a[0], bottomY, a[1]];
    const bottomB = [b[0], bottomY, b[1]];
    basePositions.push(
      0, topY, 0, ...topB, ...topA,
      0, bottomY, 0, ...bottomA, ...bottomB,
      ...bottomA, ...topA, ...topB,
      ...bottomA, ...topB, ...bottomB,
    );
    baseEdges.push(...topA, ...topB);
    // A fine lower band makes the base readable without a thick pedestal.
    baseEdges.push(a[0], 0.022, a[1], b[0], 0.022, b[1]);
  }
  const baseGeometry = new THREE.BufferGeometry();
  baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(basePositions, 3));
  baseGeometry.computeVertexNormals();
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: '#364231',
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.name = 'Shallow architectural model base';
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const edging = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(baseEdges, 3)),
    new THREE.LineBasicMaterial({
      color: '#9ca68d',
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
  );
  edging.name = 'Fine model-base edge';
  edging.renderOrder = 2;
  group.add(edging);

  group.userData = {
    source: 'Rommelweb public campus exterior',
    provenance: campusMesh.provenance,
    statistics: campusMesh.statistics,
    metresToModel: scale,
    sourceDimensionsPreserved: true,
  };
  return group;
}
