// Original, self-contained exhibit geometry. All dimensions are display units.
// The caller owns lighting, interaction and disposal of geometry/material maps.
const TAU = Math.PI * 2;

function tools(THREE, name) {
  const root = new THREE.Group(); root.name = name;
  const assembly = new THREE.Group(); assembly.name = `${name}-assembly`; root.add(assembly);
  const geometryCache = new Map();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x536159, transparent: true, opacity: .24, depthWrite: false });
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: .82, metalness: .08, ...options,
  });
  const palette = {
    body: material(0xb5beb6), bodyLight: material(0xc9cec5),
    bodyShade: material(0x8d9b91), graphite: material(0x293b34),
    dark: material(0x172922), rubber: material(0x14241e, { roughness: .97, metalness: 0 }),
    steel: material(0x8e9d93, { roughness: .52, metalness: .52 }),
    steelDark: material(0x56695f, { roughness: .62, metalness: .35 }),
    sage: material(0x879a7c, { roughness: .88, metalness: .02 }),
    ivory: material(0xdcd9c8, { roughness: .96, metalness: 0 }),
    paperEdge: material(0xbcbda9, { roughness: 1, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x779b8b, roughness: .24, metalness: .05,
      transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x173e30, roughness: .16, metalness: .36,
      clearcoat: .35, clearcoatRoughness: .16 }),
  };
  function cached(key, create) {
    if (!geometryCache.has(key)) geometryCache.set(key, create());
    return geometryCache.get(key);
  }
  function mesh(geometry, surface, position = [0, 0, 0], parent = assembly) {
    const object = new THREE.Mesh(geometry, surface);
    object.position.set(...position); object.castShadow = !surface.transparent; object.receiveShadow = true;
    parent.add(object); return object;
  }
  function box(w, h, d, surface, position, parent = assembly) {
    const object = mesh(unitBox, surface, position, parent); object.scale.set(w, h, d); return object;
  }
  function cylinder(radius, height, surface, position, parent = assembly, segments = 32, topRadius = radius) {
    const ratio = topRadius / radius;
    const geometry = cached(`cylinder:${segments}:${ratio}`, () => new THREE.CylinderGeometry(ratio, 1, 1, segments));
    const object = mesh(geometry, surface, position, parent); object.scale.set(radius, height, radius); return object;
  }
  function axis(position, direction, parent = assembly, name = '') {
    const group = new THREE.Group(); group.position.set(...position);
    group.quaternion.setFromUnitVectors(up, new THREE.Vector3(...direction).normalize());
    group.name = name; parent.add(group); return group;
  }
  function roundedShape(width, depth, radius) {
    const x = -width / 2, y = -depth / 2, r = Math.min(radius, width / 2, depth / 2);
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y); shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + depth - r); shape.quadraticCurveTo(x + width, y + depth, x + width - r, y + depth);
    shape.lineTo(x + r, y + depth); shape.quadraticCurveTo(x, y + depth, x, y + depth - r);
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }
  function slab(width, depth, height, radius, surface, position, parent = assembly, bevel = .01, hole = null) {
    const key = `slab:${[width, depth, height, radius, bevel, ...(hole || [])].join(':')}`;
    const geometry = cached(key, () => {
      const shape = roundedShape(width, depth, radius);
      if (hole) {
        const opening = new THREE.Path(); opening.absarc(hole[0], -hole[1], hole[2], 0, TAU, true); shape.holes.push(opening);
      }
      const value = new THREE.ExtrudeGeometry(shape, { depth: height, steps: 1, curveSegments: 10,
        bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
      value.rotateX(-Math.PI / 2); return value;
    });
    return mesh(geometry, surface, position, parent);
  }
  function annulus(inner, outer, height, surface, position, parent = assembly) {
    const geometry = cached(`annulus:${inner}:${outer}:${height}`, () => {
      const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, TAU, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, TAU, true); shape.holes.push(hole);
      const value = new THREE.ExtrudeGeometry(shape, { depth: height, steps: 1, bevelEnabled: false, curveSegments: 48 });
      value.rotateX(-Math.PI / 2); return value;
    });
    return mesh(geometry, surface, position, parent);
  }
  function lines(positions, color = 0x68796c, opacity = .35, parent = assembly) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(2), 3));
    const object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    object.raycast = () => {}; parent.add(object); return object;
  }
  function edges(object, threshold = 38) {
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, threshold), edgeMaterial);
    outline.raycast = () => {}; object.add(outline); return outline;
  }
  function tube(points, radius, surface, parent = assembly, segments = 24) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))),
      segments, radius, 7, false), surface, [0, 0, 0], parent);
  }
  function repeatBox(dimensions, placements, surface, parent = assembly) {
    const object = new THREE.InstancedMesh(unitBox, surface, placements.length);
    for (let i = 0; i < placements.length; i++) {
      const { position, rotation = [0, 0, 0], size = dimensions } = placements[i];
      quaternion.setFromEuler(new THREE.Euler(...rotation));
      matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(...size));
      object.setMatrixAt(i, matrix);
    }
    object.instanceMatrix.needsUpdate = true; object.castShadow = true; object.receiveShadow = true;
    object.computeBoundingBox(); object.computeBoundingSphere(); parent.add(object); return object;
  }
  function screw(position, direction = [0, 1, 0], radius = .028, parent = assembly) {
    const mount = axis(position, direction, parent, 'recessed-fastener');
    cylinder(radius * 1.20, .010, palette.dark, [0, 0, 0], mount, 20);
    cylinder(radius, .012, palette.steelDark, [0, .006, 0], mount, 20);
    box(radius * 1.35, .003, radius * .19, palette.dark, [0, .013, 0], mount);
    return mount;
  }
  function knurled(radius, height, surface, position, direction = [0, 1, 0], parent = assembly, count = 48) {
    const knob = axis(position, direction, parent, 'knurled-control');
    cylinder(radius - .006, height, surface, [0, 0, 0], knob, 64);
    cylinder(radius - .014, .010, surface, [0, height / 2 + .003, 0], knob, 64);
    repeatBox([.014, height * .78, .012], Array.from({ length: count }, (_, index) => {
      const theta = index / count * TAU;
      return { position: [Math.cos(theta) * radius, 0, Math.sin(theta) * radius], rotation: [0, -theta, 0] };
    }), surface, knob);
    return knob;
  }
  function canvasTexture(draw, width = 1024, height = 1024) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d'); if (!context) return null;
    draw(context, width, height);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4; return texture;
  }
  function compact() {
    // Keep richly constructed static parts, but submit one draw per material.
    // Repeated knurls and ticks retain instancing after their local axes are baked.
    root.updateMatrixWorld(true);
    const batches = new Map(), instanceBatches = new Map(), originalGeometries = new Set(), retainedGeometries = new Set();
    const local = new THREE.Matrix4(), world = new THREE.Matrix4();
    root.traverse(object => {
      if (!object.geometry || (!object.isMesh && !object.isLineSegments)) return;
      originalGeometries.add(object.geometry);
      if (object.isInstancedMesh) {
        const key = `${object.geometry.uuid}:${object.material.uuid}`;
        if (!instanceBatches.has(key)) instanceBatches.set(key, { geometry: object.geometry, material: object.material, matrices: [] });
        const bucket = instanceBatches.get(key);
        retainedGeometries.add(object.geometry);
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, local); world.multiplyMatrices(object.matrixWorld, local); bucket.matrices.push(world.clone());
        }
        return;
      }
      const line = Boolean(object.isLineSegments), key = `${line ? 'line' : 'mesh'}:${object.material.uuid}`;
      if (!batches.has(key)) batches.set(key, { material: object.material, positions: [], normals: [], uvs: [], line,
        castShadow: false, receiveShadow: false });
      const bucket = batches.get(key);
      bucket.castShadow ||= object.castShadow; bucket.receiveShadow ||= object.receiveShadow;
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), uvs = geometry.getAttribute('uv');
      for (let i = 0; i < positions.count; i++) {
        bucket.positions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
        if (!line) {
          bucket.normals.push(normals?.getX(i) || 0, normals?.getY(i) || 0, normals?.getZ(i) || 0);
          bucket.uvs.push(uvs?.getX(i) || 0, uvs?.getY(i) || 0);
        }
      }
      geometry.dispose();
    });
    assembly.clear();
    for (const bucket of batches.values()) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
      let object;
      if (bucket.line) {
        object = new THREE.LineSegments(geometry, bucket.material); object.raycast = () => {};
      } else {
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
        object = new THREE.Mesh(geometry, bucket.material);
        object.castShadow = bucket.castShadow; object.receiveShadow = bucket.receiveShadow;
      }
      assembly.add(object);
    }
    for (const bucket of instanceBatches.values()) {
      const object = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length);
      bucket.matrices.forEach((value, i) => object.setMatrixAt(i, value));
      object.instanceMatrix.needsUpdate = true; object.castShadow = true; object.receiveShadow = true;
      object.computeBoundingBox(); object.computeBoundingSphere(); assembly.add(object);
    }
    originalGeometries.forEach(geometry => { if (!retainedGeometries.has(geometry)) geometry.dispose(); });
  }
  function finish(labelHeight = .25) {
    compact();
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root), center = bounds.getCenter(new THREE.Vector3());
    assembly.position.set(-center.x, -bounds.min.y, -center.z);
    root.userData.labelAnchor = new THREE.Vector3(0, bounds.max.y - bounds.min.y + labelHeight, 0);
    root.userData.modelType = name;
    root.updateMatrixWorld(true); return root;
  }
  return { root, assembly, palette, material, mesh, box, cylinder, axis, roundedShape, slab, annulus,
    lines, edges, tube, repeatBox, screw, knurled, canvasTexture, finish };
}

function notebookPrint(context, width, height, right) {
  context.fillStyle = '#dddac9'; context.fillRect(0, 0, width, height);
  const ink = '#3d5548', quiet = '#82927c';
  context.strokeStyle = quiet; context.lineWidth = 1.4;
  context.beginPath(); context.moveTo(84, 133); context.lineTo(934, 133); context.stroke();
  context.fillStyle = ink; context.font = '500 26px sans-serif';
  context.fillText(right ? 'MOLECULAR BIOLOGY' : 'ALGORITHMS', 84, 108);
  context.fillStyle = quiet; context.font = '16px monospace'; context.fillText(right ? '02' : '01', 902, 953);
  if (!right) {
    context.fillStyle = ink; context.font = '23px sans-serif'; context.fillText('Binary search', 84, 199);
    const values = [2, 5, 9, 14, 18, 23, 31];
    values.forEach((value, index) => {
      const x = 92 + index * 116;
      context.strokeStyle = index === 3 ? '#4d6e57' : '#a8b29c';
      context.lineWidth = index === 3 ? 2.5 : 1;
      context.strokeRect(x, 233, 92, 56);
      context.fillStyle = ink; context.font = '23px monospace'; context.fillText(String(value), x + 29, 269);
    });
    context.fillStyle = quiet; context.font = '17px monospace';
    context.fillText('lo', 117, 319); context.fillText('mid', 458, 319); context.fillText('hi', 817, 319);
    context.fillStyle = ink; context.font = '21px monospace';
    ['while lo ≤ hi', '  mid = ⌊(lo + hi) / 2⌋', '  a[mid] < x  →  lo = mid + 1', '  a[mid] > x  →  hi = mid − 1'].forEach((line, index) => context.fillText(line, 92, 404 + index * 40));
    context.strokeStyle = '#7d927c'; context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(120, 610); context.lineTo(120, 858); context.lineTo(886, 858); context.stroke();
    context.beginPath();
    for (let step = 0; step < 140; step++) {
      const t = step / 139, x = 127 + t * 733, y = 846 - Math.log2(1 + t * 15) * 49;
      if (!step) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.lineWidth = 3; context.strokeStyle = '#4c7058'; context.stroke();
    context.fillStyle = ink; context.font = '22px monospace'; context.fillText('O(log n)', 686, 636);
    context.fillStyle = quiet; context.font = '17px sans-serif'; context.fillText('comparisons', 93, 593); context.fillText('n', 895, 867);
  } else {
    // A small molecular sketch, followed by the information flow and a neuron.
    for (const phase of [0, Math.PI]) {
      context.beginPath();
      for (let step = 0; step <= 120; step++) {
        const t = step / 120, x = 298 + Math.sin(t * Math.PI * 3 + phase) * 69, y = 180 + t * 211;
        if (!step) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = phase ? '#8a9b7d' : '#4d725c'; context.lineWidth = 3.6; context.stroke();
    }
    for (let rung = 1; rung < 12; rung++) {
      const t = rung / 12, span = Math.sin(t * Math.PI * 3) * 69, y = 180 + t * 211;
      context.beginPath(); context.moveTo(298 - span, y); context.lineTo(298 + span, y);
      context.lineWidth = 1.6; context.strokeStyle = '#9aa78d'; context.stroke();
    }
    context.fillStyle = ink; context.font = '21px monospace';
    context.fillText('A · T', 535, 230); context.fillText('C · G', 535, 270);
    context.fillStyle = quiet; context.font = '19px sans-serif'; context.fillText('complementary bases', 535, 329);
    context.fillStyle = ink; context.font = '25px sans-serif'; context.fillText('DNA  →  RNA  →  protein', 202, 466);
    context.strokeStyle = '#a8b29c'; context.lineWidth = 1;
    context.beginPath(); context.moveTo(84, 540); context.lineTo(934, 540); context.stroke();
    context.fillStyle = ink; context.font = '500 25px sans-serif'; context.fillText('NEUROANATOMY', 84, 588);
    context.strokeStyle = '#557461'; context.lineWidth = 2.3;
    const paths = [
      [[280, 747], [221, 720], [185, 684], [141, 672]], [[221, 720], [174, 735], [136, 719]],
      [[280, 747], [223, 776], [183, 818], [139, 833]], [[223, 776], [168, 781], [127, 804]],
      [[277, 742], [264, 697], [290, 657]], [[264, 697], [230, 661]],
      [[300, 752], [390, 760], [520, 754], [660, 760], [761, 754]],
      [[761, 754], [806, 714], [873, 700]], [[806, 714], [839, 667]],
      [[761, 754], [825, 791], [885, 799]], [[825, 791], [842, 832]],
    ];
    for (const path of paths) {
      context.beginPath(); path.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y)); context.stroke();
    }
    context.beginPath(); context.ellipse(283, 750, 28, 22, -.2, 0, TAU); context.fillStyle = '#a8b49a'; context.fill(); context.stroke();
    context.beginPath(); context.ellipse(282, 750, 8, 7, 0, 0, TAU); context.stroke();
    context.fillStyle = '#c1c8b4';
    for (let sheath = 0; sheath < 5; sheath++) {
      const x = 387 + sheath * 67;
      context.fillRect(x, 749, 50, 16); context.strokeRect(x, 749, 50, 16);
    }
    context.fillStyle = quiet; context.font = '18px sans-serif';
    context.fillText('dendrites', 113, 886); context.fillText('soma', 264, 886); context.fillText('axon', 517, 886);
  }
}

export function createNotebook(THREE) {
  const t = tools(THREE, 'notebook');
  const { assembly, palette: p, mesh, box, slab, lines, tube } = t;
  const clothBump = t.canvasTexture((context, width, height) => {
    context.fillStyle = '#777'; context.fillRect(0, 0, width, height);
    for (let i = 0; i < 32; i++) {
      context.fillStyle = i % 2 ? '#858585' : '#696969';
      context.fillRect(i * 8, 0, 3, height); context.fillRect(0, i * 8 + 3, width, 2);
    }
  }, 256, 256);
  if (clothBump) {
    clothBump.colorSpace = THREE.NoColorSpace;
    clothBump.wrapS = clothBump.wrapT = THREE.RepeatWrapping; clothBump.repeat.set(9, 13);
  }
  const cover = t.material(0x344e40, { roughness: .98, metalness: 0, bumpMap: clothBump, bumpScale: .007 });
  const thread = t.material(0xa4b196, { roughness: 1, metalness: 0 });
  const edgeInk = 0x959f89, gutter = .055, pageWidth = 1.965, pageDepth = 2.91;
  for (const side of [-1, 1]) {
    slab(2.045, 3.07, .045, .060, cover, [side * 1.035, .018, 0], assembly, .009);
    slab(2.005, 3.015, .018, .035, p.paperEdge, [side * 1.027, .078, 0], assembly, .003);
  }
  // The flexible hinge remains visible between the two stiff covers.
  const hinge = new THREE.Shape();
  hinge.moveTo(-.16, .038); hinge.bezierCurveTo(-.095, .004, .095, .004, .16, .038);
  hinge.lineTo(.16, .069); hinge.bezierCurveTo(.08, .033, -.08, .033, -.16, .069); hinge.closePath();
  const hingeGeometry = new THREE.ExtrudeGeometry(hinge, { depth: 3.045, bevelEnabled: false, curveSegments: 16 });
  hingeGeometry.translate(0, 0, -1.5225); mesh(hingeGeometry, cover);
  function pageHeight(u, v, side) {
    const shoulder = .076 * Math.exp(-(((u - .13) / .135) ** 2));
    const crease = -.031 * Math.exp(-u / .047);
    const curl = (side > 0 ? .070 : .022) * u ** 9 * Math.exp(-(((v - .90) / .14) ** 2));
    return .205 + shoulder + crease + curl;
  }
  function pagePoint(u, v, side, layer = 1) {
    return [side * (gutter + pageWidth * u), .105 + (pageHeight(u, v, side) - .105) * layer, (v - .5) * pageDepth];
  }
  for (const side of [-1, 1]) {
    const positions = [], uvs = [], indices = [], columns = 56, rows = 32;
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const u = column / columns, v = row / rows;
      positions.push(...pagePoint(u, v, side)); uvs.push(side > 0 ? u : 1 - u, 1 - v);
    }
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
      indices.push(...(side > 0 ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
    }
    const geometry = new THREE.BufferGeometry(); geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals();
    const texture = t.canvasTexture((context, width, height) => notebookPrint(context, width, height, side > 0));
    const paper = t.material(0xffffff, { map: texture, color: texture ? 0xffffff : 0xdcd9c8,
      roughness: .98, metalness: 0, side: THREE.DoubleSide });
    const page = mesh(geometry, paper); page.name = side > 0 ? 'biology-page' : 'algorithms-page';

    // Actual front, rear and fore-edge surfaces close the paper stack.
    const edgePositions = [];
    const quad = (a, b, c, d) => edgePositions.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (const v of [0, 1]) for (let i = 0; i < columns; i++) {
      const a = pagePoint(i / columns, v, side), b = pagePoint((i + 1) / columns, v, side);
      quad(a, b, [b[0], .105, b[2]], [a[0], .105, a[2]]);
    }
    for (let i = 0; i < rows; i++) {
      const a = pagePoint(1, i / rows, side), b = pagePoint(1, (i + 1) / rows, side);
      quad(a, b, [b[0], .105, b[2]], [a[0], .105, a[2]]);
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3)); edgeGeometry.computeVertexNormals();
    const edgeMaterial = p.paperEdge.clone(); edgeMaterial.side = THREE.DoubleSide; mesh(edgeGeometry, edgeMaterial);
    const pageLines = [];
    for (let layer = 1; layer < 12; layer++) {
      for (const v of [0, 1]) for (let i = 0; i < columns; i++)
        pageLines.push(pagePoint(i / columns, v, side, layer / 12), pagePoint((i + 1) / columns, v, side, layer / 12));
      for (let i = 0; i < rows; i++)
        pageLines.push(pagePoint(1, i / rows, side, layer / 12), pagePoint(1, (i + 1) / rows, side, layer / 12));
    }
    lines(pageLines, edgeInk, .38);
  }
  const gutterLine = [];
  for (let i = 0; i < 30; i++) gutterLine.push([0, .149, -1.44 + i * .096], [0, .149, -1.44 + (i + 1) * .096]);
  lines(gutterLine, 0x4a634e, .47);
  for (const z of [-1.13, -.72, -.31, .10, .51, .92]) {
    tube([[-.047, .162, z - .025], [-.023, .15, z], [.023, .15, z], [.047, .162, z + .025]], .005, thread, assembly, 10);
  }
  // A fabric ribbon follows the gutter, then drops naturally beyond the fore-edge.
  const ribbonPositions = [
    [-.049, .156, 1.12], [.049, .156, 1.12], [-.049, .146, 1.40], [.049, .146, 1.40],
    [-.049, .055, 1.56], [.049, .055, 1.56], [-.049, .043, 1.67], [.049, .043, 1.67],
    [0, .043, 1.635],
  ];
  const ribbonGeometry = new THREE.BufferGeometry();
  ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions.flat(), 3));
  ribbonGeometry.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 4, 6, 8, 4, 8, 5, 5, 8, 7]);
  ribbonGeometry.computeVertexNormals(); const ribbonMaterial = p.sage.clone(); ribbonMaterial.side = THREE.DoubleSide;
  mesh(ribbonGeometry, ribbonMaterial);
  for (const [index, z] of [-.92, -.46, .03].entries()) {
    slab(.18, .255, .008, .012, index === 1 ? p.paperEdge : p.sage, [2.055, .151 + index * .013, z], assembly, .001);
    lines([[[2.084, .163 + index * .013, z - .057], [2.084, .163 + index * .013, z + .057]]], 0x5a735b, .48);
  }
  return t.finish(.22);
}

export function createMicroscope(THREE) {
  const t = tools(THREE, 'microscope');
  const { assembly, palette: p, mesh, box, cylinder, slab, annulus, axis, screw, knurled, tube, repeatBox } = t;
  // A low die-cast base, rubber feet and a separate service cover.
  const base = slab(2.02, 1.84, .155, .25, p.body, [0, .055, 0], assembly, .045); t.edges(base, 52);
  slab(1.82, 1.63, .058, .20, p.bodyLight, [0, .211, -.035], assembly, .025);
  for (const x of [-.70, .70]) for (const z of [-.64, .64]) cylinder(.125, .062, p.rubber, [x, .022, z], assembly, 24);
  repeatBox([.060, .038, .015], Array.from({ length: 10 }, (_, index) => ({
    position: [-.315 + index * .07, .149, -.922],
  })), p.dark);
  const switchMount = axis([-.63, .28, .60], [0, 1, 0], assembly, 'power-control');
  cylinder(.092, .022, p.graphite, [0, 0, 0], switchMount);
  cylinder(.065, .006, p.bodyShade, [0, .016, 0], switchMount);
  box(.008, .004, .033, p.ivory, [0, .021, -.007], switchMount);
  const brightness = knurled(.094, .045, p.graphite, [.62, .286, .60], [0, 1, 0], assembly, 28);
  box(.009, .004, .043, p.ivory, [0, .029, -.039], brightness);
  for (const x of [-.70, .70]) screw([x, .29, -.51], [0, 1, 0], .022);
  // The illuminator's lens sits inside a recessed, concentric metal well.
  cylinder(.258, .030, p.graphite, [0, .293, .34]);
  annulus(.198, .239, .022, p.steelDark, [0, .309, .34]);
  cylinder(.193, .008, p.lens, [0, .327, .34], assembly, 64);
  annulus(.168, .185, .006, p.steel, [0, .332, .34]);

  // A continuously curved C-arm, thick enough to read as a cast structural part.
  const armShape = new THREE.Shape();
  armShape.moveTo(-.78, .24);
  armShape.bezierCurveTo(-.72, .86, -.69, 1.91, -.62, 2.64);
  armShape.bezierCurveTo(-.58, 3.08, -.30, 3.30, .34, 3.34);
  armShape.quadraticCurveTo(.56, 3.33, .56, 3.14);
  armShape.bezierCurveTo(.18, 3.04, -.16, 2.83, -.25, 2.54);
  armShape.bezierCurveTo(-.36, 2.18, -.30, 1.43, -.12, .97);
  armShape.quadraticCurveTo(.05, .55, .37, .37);
  armShape.lineTo(.38, .25); armShape.closePath();
  const armGeometry = new THREE.ExtrudeGeometry(armShape, { depth: .48, curveSegments: 24, steps: 1,
    bevelEnabled: true, bevelSize: .046, bevelThickness: .036, bevelSegments: 3 });
  armGeometry.translate(0, 0, -.24); armGeometry.rotateY(-Math.PI / 2);
  const arm = mesh(armGeometry, p.body); arm.name = 'cast-c-arm'; t.edges(arm, 54);
  const seamPoints = [];
  for (const x of [-.282, .282]) {
    const profile = [[-.69, .41], [-.625, 1.30], [-.574, 2.56], [-.475, 2.93], [-.26, 3.12], [.12, 3.19]];
    for (let i = 1; i < profile.length; i++) seamPoints.push([x, profile[i - 1][1], profile[i - 1][0]], [x, profile[i][1], profile[i][0]]);
  }
  t.lines(seamPoints, 0x697f6f, .35);
  for (const x of [-.287, .287]) for (const [y, z] of [[2.72, -.45], [1.82, -.47], [.65, -.55]]) screw([x, y, z], [Math.sign(x), 0, 0], .022);
  // Coaxial coarse and fine focus controls on both sides of the arm.
  for (const side of [-1, 1]) {
    const direction = [side, 0, 0];
    const focusMount = axis([side * .286, 1.085, -.265], direction, assembly, 'focus-axis');
    cylinder(.112, .11, p.steelDark, [0, .036, 0], focusMount);
    const coarse = knurled(.236, .148, p.graphite, [side * .425, 1.085, -.265], direction, assembly, 56);
    cylinder(.189, .014, p.steelDark, [0, .083, 0], coarse, 64);
    repeatBox([.010, .004, .020], Array.from({ length: 32 }, (_, index) => {
      const theta = index / 32 * TAU;
      return { position: [Math.sin(theta) * .163, .094, Math.cos(theta) * .163], rotation: [0, theta, 0] };
    }), p.bodyShade, coarse);
    const fine = knurled(.113, .105, p.rubber, [side * .575, 1.085, -.265], direction, assembly, 40);
    cylinder(.083, .006, p.bodyShade, [0, .058, 0], fine);
    screw([side * .638, 1.085, -.265], direction, .024);
  }
  // Vertical stage carrier and its rack, partially exposed behind the stage.
  slab(.55, .24, .48, .025, p.graphite, [0, 1.07, -.26], assembly, .006);
  box(.048, .49, .028, p.steel, [.18, 1.30, -.11]);
  repeatBox([.074, .012, .029], Array.from({ length: 18 }, (_, index) => ({
    position: [.18, 1.08 + index * .024, -.088],
  })), p.steelDark);
  const stageLower = slab(1.30, .96, .07, .07, p.steelDark, [0, 1.371, .31], assembly, .01, [0, .02, .245]);
  t.edges(stageLower);
  const stage = slab(1.57, 1.18, .063, .07, p.graphite, [0, 1.451, .31], assembly, .011, [0, .02, .203]);
  stage.name = 'mechanical-stage'; t.edges(stage);
  for (const z of [-.12, .70]) box(1.20, .024, .027, p.steelDark, [0, 1.542, z]);
  for (const x of [-.55, .55]) box(.042, .028, .73, p.steel, [x, 1.558, .30]);
  for (const x of [-.62, .62]) for (const z of [-.14, .73]) screw([x, 1.534, z], [0, 1, 0], .021);
  const slideCarrier = new THREE.Group(); slideCarrier.name = 'slide-carriage'; assembly.add(slideCarrier);
  box(1.12, .022, .044, p.graphite, [.015, 1.57, .101], slideCarrier);
  box(1.12, .022, .044, p.graphite, [.015, 1.57, .545], slideCarrier);
  box(.044, .022, .486, p.graphite, [-.523, 1.57, .323], slideCarrier);
  slab(1.035, .358, .011, .013, p.glass, [.018, 1.587, .329], slideCarrier, .001);
  slab(.174, .348, .003, .007, p.paperEdge, [-.405, 1.601, .329], slideCarrier, 0);
  slab(.246, .246, .005, .008, p.glass, [.04, 1.608, .33], slideCarrier, 0);
  const specimen = mesh(new THREE.CircleGeometry(.035, 18), p.sage, [.04, 1.612, .33], slideCarrier); specimen.rotation.x = -Math.PI / 2;
  for (const x of [-.48, .47]) {
    screw([x, 1.585, .115], [0, 1, 0], .028, slideCarrier);
    box(.049, .015, .24, p.steel, [x, 1.595, .24], slideCarrier);
    tube([[x, 1.60, .34], [x, 1.623, .39], [x, 1.612, .47]], .013, p.steel, slideCarrier, 10);
  }
  // Paired controls for the two axes of the mechanical stage.
  box(.16, .11, .13, p.graphite, [.83, 1.42, .71]);
  cylinder(.032, .14, p.steel, [.83, 1.30, .71]);
  knurled(.088, .102, p.graphite, [.83, 1.27, .71], [0, 1, 0], assembly, 36);
  knurled(.065, .105, p.rubber, [.83, 1.14, .71], [0, 1, 0], assembly, 30);
  const vernier = t.canvasTexture((context, w, h) => {
    context.fillStyle = '#293b34'; context.fillRect(0, 0, w, h);
    context.strokeStyle = '#a0b49c'; context.fillStyle = '#b5c2aa'; context.lineWidth = 1;
    context.font = '11px monospace';
    for (let tick = 0; tick <= 40; tick++) {
      const x = 13 + tick * 11.6, major = tick % 5 === 0;
      context.beginPath(); context.moveTo(x, 6); context.lineTo(x, major ? 22 : 15); context.stroke();
      if (major) context.fillText(String(tick), x - 4, 35);
    }
  }, 512, 48);
  if (vernier) {
    const plate = mesh(new THREE.PlaneGeometry(1.11, .104), new THREE.MeshStandardMaterial({ map: vernier, roughness: .88, metalness: 0 }),
      [0, 1.532, .782]); plate.rotation.x = -Math.PI / 2;
  }
  // Condenser lens assembly, iris diaphragm and its small aperture lever.
  box(.35, .074, .31, p.graphite, [0, 1.16, -.044]);
  cylinder(.214, .11, p.graphite, [0, 1.247, .33], assembly, 48);
  annulus(.112, .192, .028, p.steelDark, [0, 1.309, .33]);
  cylinder(.106, .012, p.lens, [0, 1.332, .33], assembly, 48);
  cylinder(.168, .132, p.steelDark, [0, 1.127, .33], assembly, 48);
  const iris = knurled(.214, .035, p.graphite, [0, 1.05, .33], [0, 1, 0], assembly, 48);
  annulus(.035, .146, .008, p.dark, [0, -.025, 0], iris);
  tube([[.12, 1.07, .41], [.22, 1.072, .49], [.30, 1.078, .53]], .016, p.steelDark, assembly, 8);
  cylinder(.034, .027, p.rubber, [.30, 1.077, .53], assembly, 20);
  const condenserFocus = axis([-.30, 1.18, -.03], [-1, 0, 0], assembly);
  knurled(.075, .068, p.graphite, [0, 0, 0], [0, 1, 0], condenserFocus, 28);

  // The revolving nosepiece carries three distinct, stepped objective barrels.
  const turret = new THREE.Group(); turret.name = 'revolving-objective-turret'; turret.position.set(0, 2.72, .075); assembly.add(turret);
  cylinder(.266, .21, p.bodyShade, [0, .12, 0], turret, 48, .224);
  cylinder(.427, .116, p.graphite, [0, -.026, 0], turret, 64);
  annulus(.332, .416, .018, p.steelDark, [0, .033, 0], turret);
  knurled(.421, .067, p.graphite, [0, -.028, 0], [0, 1, 0], turret, 64);
  cylinder(.364, .034, p.steelDark, [0, -.100, 0], turret, 48);
  for (const [index, length] of [.80, .57, .45].entries()) {
    const theta = index / 3 * TAU;
    const objective = axis([Math.sin(theta) * .25, -.132, Math.cos(theta) * .25], [0, -1, 0], turret, `objective-${[40, 10, 4][index]}x`);
    cylinder(.128, .092, p.steelDark, [0, .026, 0], objective, 32);
    knurled(.118, .058, p.steelDark, [0, .080, 0], [0, 1, 0], objective, 36);
    cylinder(.106, length - .22, p.steel, [0, .117 + (length - .22) / 2, 0], objective, 40, .097);
    cylinder(.109, .026, index === 0 ? p.sage : index === 1 ? p.bodyShade : p.graphite, [0, length - .174, 0], objective, 40);
    cylinder(.081, .095, p.steelDark, [0, length - .091, 0], objective, 32, .091);
    cylinder(.059, .056, p.graphite, [0, length - .024, 0], objective, 32);
    cylinder(.044, .006, p.lens, [0, length + .008, 0], objective, 32);
    const labelTexture = t.canvasTexture((context, w, h) => {
      context.clearRect(0, 0, w, h); context.fillStyle = '#273b30'; context.textAlign = 'center';
      context.font = '500 35px sans-serif'; context.fillText(`${[40, 10, 4][index]}×`, w / 2, 43);
      context.font = '20px monospace'; context.fillText(['0.65', '0.25', '0.10'][index], w / 2, 75);
    }, 128, 96);
    if (labelTexture) {
      const label = mesh(new THREE.PlaneGeometry(.136, .105), new THREE.MeshStandardMaterial({ map: labelTexture,
        transparent: true, depthWrite: false, roughness: .84, metalness: 0, side: THREE.DoubleSide }), [0, length * .49, .105], objective);
      label.rotation.z = Math.PI;
    }
  }
  // Prism housing and binocular bridge. The eyepieces incline toward the viewer.
  cylinder(.220, .28, p.body, [0, 2.976, .075], assembly, 48, .252);
  const head = slab(.80, .68, .242, .12, p.bodyLight, [0, 3.075, .042], assembly, .038); t.edges(head, 55);
  slab(.65, .51, .060, .10, p.bodyShade, [0, 3.322, .069], assembly, .015);
  const bridge = axis([0, 3.365, .11], [1, 0, 0], assembly, 'interpupillary-bridge');
  cylinder(.100, .60, p.steelDark, [0, 0, 0], bridge, 32);
  for (const side of [-1, 1]) {
    const eyepiece = axis([side * .249, 3.265, .097], [side * .045, .82, .57], assembly, 'binocular-eyepiece');
    cylinder(.181, .165, p.bodyShade, [0, .085, 0], eyepiece, 40, .158);
    cylinder(.144, .417, p.body, [0, .357, 0], eyepiece, 40, .129);
    cylinder(.152, .032, p.steelDark, [0, .545, 0], eyepiece, 40);
    const diopter = knurled(.142, .125, p.graphite, [0, .620, 0], [0, 1, 0], eyepiece, 44);
    cylinder(.120, .078, p.rubber, [0, .728, 0], eyepiece, 40);
    annulus(.096, .148, .041, p.rubber, [0, .763, 0], eyepiece);
    cylinder(.091, .007, p.lens, [0, .799, 0], eyepiece, 48);
    annulus(.087, .098, .004, p.steelDark, [0, .803, 0], eyepiece);
    repeatBox([.006, .006, .021], Array.from({ length: 14 }, (_, index) => {
      const theta = index / 14 * TAU;
      return { position: [Math.sin(theta) * .132, .067, Math.cos(theta) * .132], rotation: [0, theta, 0] };
    }), p.bodyShade, diopter);
  }
  // Rear cord relief, a short cable and quiet body vents are visible when turned.
  const cableSocket = axis([0, .183, -.940], [0, 0, -1], assembly);
  cylinder(.062, .115, p.rubber, [0, .038, 0], cableSocket, 24);
  tube([[0, .177, -1.01], [.035, .13, -1.085], [.12, .071, -1.11], [.30, .056, -1.07]], .023, p.rubber, assembly, 20);
  repeatBox([.018, .030, .13], Array.from({ length: 7 }, (_, index) => ({
    position: [.289, 2.15 + index * .058, -.48],
  })), p.steelDark);
  return t.finish(.24);
}
