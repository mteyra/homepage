// Original symbolic project exhibits, not replicas of Marc's personal hardware.
// Static local geometry only. The caller owns lighting, placement and disposal.
const TAU = Math.PI * 2;

function workshop(THREE, name) {
  const root = new THREE.Group();
  root.name = name;
  const parts = new THREE.Group();
  root.add(parts);
  const cache = new Map();
  const surface = (name, color, roughness = .79, metalness = .08) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    material.name = name;
    return material;
  };
  const p = {
    shell: surface('sage enamel', 0xa7b29e),
    pale: surface('warm ivory polymer', 0xd3d2bd, .91, 0),
    sage: surface('deep sage', 0x788b70),
    shade: surface('sage edge', 0x586b59),
    graphite: surface('graphite housing', 0x304238),
    dark: surface('recess and rubber', 0x15251e, .95, 0),
    metal: surface('brushed steel', 0x98a595, .43, .56),
    steel: surface('dark fastener steel', 0x5d7164, .50, .42),
    ochre: surface('ochre detail', 0xc1a05c, .83, 0),
    clay: surface('clay detail', 0xa16d54, .86, 0),
    screen: surface('dark screen glass', 0x254335, .28, .12),
    ink: surface('quiet display marks', 0x9bb49b, .82, 0),
  };
  const geometry = (key, create) => {
    if (!cache.has(key)) cache.set(key, create());
    return cache.get(key);
  };
  const unitBox = geometry('box', () => new THREE.BoxGeometry(1, 1, 1));
  const up = new THREE.Vector3(0, 1, 0);
  function group(name, position = [0, 0, 0], rotation = [0, 0, 0], parent = parts) {
    const result = new THREE.Group();
    result.name = name;
    result.position.set(...position);
    result.rotation.set(...rotation);
    parent.add(result);
    return result;
  }
  function mesh(geo, material, position = [0, 0, 0], parent = parts) {
    const result = new THREE.Mesh(geo, material);
    result.position.set(...position);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  }
  function box(width, height, depth, material, position, parent = parts) {
    const result = mesh(unitBox, material, position, parent);
    result.scale.set(width, height, depth);
    return result;
  }
  function outline(width, height, radius) {
    const x = -width / 2, y = -height / 2;
    const r = Math.min(radius, width / 2, height / 2);
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }
  function rounded(width, height, depth, radius, material, position, parent = parts, bevel = .012) {
    const key = `rounded:${width}:${height}:${depth}:${radius}:${bevel}`;
    const geo = geometry(key, () => {
      const result = new THREE.ExtrudeGeometry(outline(width, height, radius), {
        depth, steps: 1, curveSegments: 6,
        bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2,
      });
      result.translate(0, 0, -depth / 2);
      return result;
    });
    return mesh(geo, material, position, parent);
  }
  function cylinder(radius, height, material, position, parent = parts, segments = 24, topRadius = radius) {
    const ratio = topRadius / radius;
    const geo = geometry(`cylinder:${segments}:${ratio}`, () =>
      new THREE.CylinderGeometry(ratio, 1, 1, segments));
    const result = mesh(geo, material, position, parent);
    result.scale.set(radius, height, radius);
    return result;
  }
  function axis(position, direction, parent = parts, name = 'shaft') {
    const result = group(name, position, [0, 0, 0], parent);
    result.quaternion.setFromUnitVectors(up, new THREE.Vector3(...direction).normalize());
    return result;
  }
  function rod(start, end, radius, material, parent = parts, segments = 16) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const mount = axis(a.add(b).multiplyScalar(.5).toArray(), direction.toArray(), parent);
    return cylinder(radius, direction.length(), material, [0, 0, 0], mount, segments);
  }
  function tube(points, radius, material, parent = parts) {
    const geo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))),
      Math.max(16, points.length * 5), radius, 7, false,
    );
    return mesh(geo, material, [0, 0, 0], parent);
  }
  function ring(inner, outer, depth, material, position, parent = parts) {
    const geo = geometry(`ring:${inner}:${outer}:${depth}`, () => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outer, 0, TAU, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, 0, TAU, true);
      shape.holes.push(hole);
      const result = new THREE.ExtrudeGeometry(shape, {
        depth, steps: 1, bevelEnabled: false, curveSegments: 12,
      });
      result.translate(0, 0, -depth / 2);
      return result;
    });
    return mesh(geo, material, position, parent);
  }
  function screw(position, direction = [0, 0, 1], parent = parts, radius = .027) {
    const mount = axis(position, direction, parent, 'recessed screw');
    cylinder(radius * 1.17, .010, p.dark, [0, 0, 0], mount, 12);
    cylinder(radius, .012, p.steel, [0, .006, 0], mount, 12);
    box(radius * 1.36, .004, radius * .18, p.dark, [0, .014, 0], mount);
  }
  function beam(length, holes, material, position, rotation = [0, 0, 0], parent = parts) {
    const geo = geometry(`beam:${length}:${holes}`, () => {
      const shape = outline(length, .17, .084);
      for (let index = 0; index < holes; index++) {
        const hole = new THREE.Path();
        const x = holes === 1 ? 0 : -.5 * length + .105 + index * (length - .21) / (holes - 1);
        hole.absarc(x, 0, .047, 0, TAU, true);
        shape.holes.push(hole);
      }
      const result = new THREE.ExtrudeGeometry(shape, {
        depth: .16, steps: 1, curveSegments: 6, bevelEnabled: false,
      });
      result.translate(0, 0, -.08);
      return result;
    });
    const result = mesh(geo, material, position, parent);
    result.rotation.set(...rotation);
    return result;
  }
  function finish(id) {
    // Bake transforms and merge every static part by material: rich geometry,
    // with a small, predictable number of draw calls and no per-frame updates.
    root.updateMatrixWorld(true);
    const buckets = new Map();
    const originals = new Set();
    parts.traverse(object => {
      if (!object.isMesh) return;
      originals.add(object.geometry);
      if (!buckets.has(object.material)) buckets.set(object.material, { positions: [], normals: [] });
      const bucket = buckets.get(object.material);
      const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geo.applyMatrix4(object.matrixWorld);
      const positions = geo.getAttribute('position'), normals = geo.getAttribute('normal');
      for (let index = 0; index < positions.count; index++) {
        bucket.positions.push(positions.getX(index), positions.getY(index), positions.getZ(index));
        bucket.normals.push(normals.getX(index), normals.getY(index), normals.getZ(index));
      }
      geo.dispose();
    });
    parts.clear();
    for (const [material, bucket] of buckets) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const object = mesh(geo, material, [0, 0, 0], parts);
      object.name = `${name} · ${material.name}`;
    }
    originals.forEach(geo => geo.dispose());
    Object.values(p).forEach(material => { if (!buckets.has(material)) material.dispose(); });
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(1, 3.6 / size.x, 3 / size.y, 3.4 / size.z);
    parts.scale.setScalar(scale);
    parts.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    root.userData = {
      projectId: id,
      modelType: name,
      symbolicIllustration: true,
      labelAnchor: new THREE.Vector3(0, size.y * scale + .22, 0),
    };
    root.updateMatrixWorld(true);
    return root;
  }
  return { root, p, group, mesh, box, rounded, cylinder, axis, rod, tube, ring, screw, beam, finish };
}

function serviceInstrument(THREE) {
  const t = workshop(THREE, 'Nixcare maintenance instrument');
  const { p, group, box, rounded, cylinder, rod, ring, screw } = t;
  const body = group('service enclosure', [-.25, 0, -.06]);
  // A compact repairable machine: three independent system cartridges, an
  // exposed service side, real vents and a discrete removable front bay.
  rounded(1.78, 2.20, 1.55, .11, p.shell, [0, 1.23, 0], body, .025);
  rounded(1.54, 1.95, .035, .055, p.graphite, [0, 1.22, .799], body);
  for (const x of [-.64, .64]) for (const z of [-.55, .55]) {
    rounded(.24, .13, .26, .045, p.dark, [x, .095, z], body);
  }
  for (let index = 0; index < 3; index++) {
    const y = .62 + index * .52;
    const extension = index === 1 ? .19 : 0;
    rounded(1.31, .43, .12, .045, p.dark, [0, y, .83], body);
    rounded(1.22, .35, .16 + extension, .035, index === 1 ? p.pale : p.shade,
      [0, y, .865 + extension / 2], body);
    const front = .966 + extension;
    rounded(.50, .054, .03, .024, p.graphite, [-.15, y - .055, front], body, .004);
    for (let slot = 0; slot < 5; slot++) {
      box(.035, .12, .012, p.dark, [-.43 + slot * .072, y + .072, front], body);
    }
    // One progress marker per module, with no fabricated status text.
    rounded(.105, .037, .013, .014, index === 1 ? p.ochre : p.sage, [.43, y + .044, front + .008], body, .003);
    screw([-.515, y - .092, front + .011], [0, 0, 1], body, .019);
    screw([.515, y - .092, front + .011], [0, 0, 1], body, .019);
  }
  rounded(1.25, .22, .035, .035, p.dark, [0, 2.03, .837], body);
  for (let index = 0; index < 4; index++) {
    box(.14 + index * .053, .017, .012, index === 3 ? p.ochre : p.ink,
      [-.39 + index * .245, 2.034, .863], body);
  }
  for (const x of [-.70, .70]) for (const y of [.29, 2.17]) screw([x, y, .843], [0, 0, 1], body);
  // Right-side opening exposes ribs, bus rails and an inset service panel.
  box(.024, 1.72, 1.10, p.dark, [.905, 1.23, -.03], body);
  for (let index = 0; index < 11; index++) {
    box(.07, 1.50, .033, p.shade, [.934, 1.22, -.53 + index * .10], body);
  }
  box(.08, .055, 1.20, p.metal, [.961, .44, -.03], body);
  box(.08, .055, 1.20, p.metal, [.961, 2.01, -.03], body);
  for (let index = 0; index < 7; index++) {
    box(.90, .018, .047, p.graphite, [-.12, 2.36, -.36 + index * .10], body);
  }
  // Carry loop is a hollow bent handle, with a grip and separate fixings.
  for (const x of [-.44, .44]) {
    rounded(.17, .065, .25, .025, p.steel, [x, 2.38, -.10], body);
    rod([x, 2.39, -.10], [x, 2.65, -.10], .038, p.metal, body);
    screw([x, 2.423, -.10], [0, 1, 0], body, .023);
  }
  rod([-.44, 2.65, -.10], [.44, 2.65, -.10], .040, p.metal, body);
  rod([-.24, 2.65, -.10], [.24, 2.65, -.10], .067, p.graphite, body);
  // Cable inlet and back seam remain visible when the object is rotated.
  box(1.50, .018, .019, p.dark, [0, .38, -.799], body);
  box(1.50, .018, .019, p.dark, [0, 2.09, -.799], body);
  rounded(.36, .16, .05, .024, p.graphite, [.35, .49, -.82], body);
  for (let index = 0; index < 8; index++) {
    box(.055, .62, .022, p.shade, [-.58 + index * .16, 1.33, -.813], body);
  }
  // A small spanner makes the maintenance metaphor clear without medical cues.
  const wrench = group('open spanner', [1.16, .11, .18], [0, -.18, -.25]);
  rounded(.135, 1.31, .065, .065, p.metal, [0, .66, 0], wrench, .008);
  ring(.080, .14, .065, p.metal, [0, .14, 0], wrench);
  box(.15, .20, .068, p.metal, [0, 1.36, 0], wrench);
  const leftJaw = box(.082, .28, .070, p.metal, [-.116, 1.48, 0], wrench);
  leftJaw.rotation.z = -.20;
  const rightJaw = box(.082, .28, .070, p.metal, [.116, 1.48, 0], wrench);
  rightJaw.rotation.z = .20;
  box(.033, .67, .073, p.shade, [0, .75, 0], wrench);
  // Small loose filter cartridge rests beside the case, not on a display base.
  const cartridge = group('replaceable service cartridge', [1.08, .10, -.57], [0, -.18, 0]);
  rounded(.46, .15, .58, .03, p.graphite, [0, 0, 0], cartridge);
  for (let index = 0; index < 5; index++) box(.30, .019, .025, p.steel, [0, .095, -.18 + index * .083], cartridge);
  return t.finish('nixcare');
}

function workstation(THREE) {
  const t = workshop(THREE, 'NixOS convertible workstation');
  const { p, group, box, rounded, cylinder, rod, tube, screw } = t;
  // The device is an illustration of a declarative personal setup, with a
  // touch display and pen; it makes no claim about a particular laptop model.
  rounded(2.78, .15, 1.94, .085, p.shell, [-.16, .12, .18], undefined, .024);
  rounded(2.67, .035, 1.85, .072, p.metal, [-.16, .22, .18], undefined, .009);
  for (const x of [-1.20, .87]) for (const z of [-.49, .91]) {
    rounded(.20, .07, .18, .035, p.dark, [x, .03, z]);
  }
  // Recessed keyboard well and individually shaped, unlettered keys.
  rounded(2.35, .025, .78, .048, p.graphite, [-.16, .255, -.065], undefined, .006);
  const widths = [.145, .145, .145, .145];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 13; col++) {
      const width = col === 12 && row < 3 ? .17 : widths[row];
      rounded(width, .032, .12, .014, (row + col) % 8 === 0 ? p.shell : p.shade,
        [-1.215 + col * .176, .278, -.34 + row * .17], undefined, .004);
    }
  }
  rounded(.80, .032, .12, .014, p.shade, [-.16, .278, .32], undefined, .004);
  for (const x of [-1.12, -.93, -.74, .42, .61, .80]) {
    rounded(.145, .032, .12, .014, p.shade, [x, .278, .32], undefined, .004);
  }
  rounded(.87, .012, .40, .03, p.steel, [-.16, .25, .77], undefined, .004);
  rounded(.81, .012, .34, .025, p.shell, [-.16, .257, .77], undefined, .004);
  // Thin speaker perforations, ports, seam and the two exposed hinge barrels.
  for (let index = 0; index < 15; index++) {
    for (const x of [-1.44, 1.12]) box(.021, .008, .025, p.dark, [x, .25, -.32 + index * .038]);
  }
  for (const x of [-1.12, .79]) {
    const hinge = t.axis([x, .29, -.68], [1, 0, 0]);
    cylinder(.093, .46, p.graphite, [0, 0, 0], hinge);
    for (const y of [-.17, .17]) cylinder(.101, .037, p.steel, [0, y, 0], hinge);
  }
  for (const z of [-.32, -.03]) rounded(.020, .042, .14, .015, p.dark, [-1.579, .13, z], undefined, .003);
  box(2.51, .013, .017, p.dark, [-.16, .107, 1.18]);
  const lid = group('folded touch display', [-.16, .31, -.68], [-.22, 0, 0]);
  rounded(2.80, 1.82, .097, .077, p.shell, [0, .91, 0], lid, .020);
  rounded(2.64, 1.66, .022, .050, p.dark, [0, .91, .064], lid, .008);
  rounded(2.49, 1.49, .017, .025, p.screen, [0, .94, .082], lid, .003);
  screw([-1.27, .17, -.062], [0, 0, -1], lid, .019);
  screw([1.27, .17, -.062], [0, 0, -1], lid, .019);
  const webcam = t.axis([0, 1.739, .083], [0, 0, 1], lid);
  cylinder(.019, .009, p.steel, [0, 0, 0], webcam, 12);
  cylinder(.009, .013, p.dark, [0, .006, 0], webcam, 12);
  // Quiet declarative structure: a bracketed hierarchy and aligned config
  // lines, formed in geometry so the screen stays crisp without textures.
  box(.012, 1.22, .010, p.shade, [-.72, .94, .098], lid);
  for (const x of [-1.105, -1.00, -.895]) {
    rounded(.037, .037, .010, .018, x < -1 ? p.ochre : p.sage, [x, 1.54, .10], lid, .002);
  }
  for (let index = 0; index < 8; index++) {
    const y = 1.36 - index * .137;
    const length = [.35, .29, .40, .26, .34, .23, .37, .29][index];
    box(length, .019, .010, index === 1 ? p.ochre : p.sage, [-.95, y, .10], lid);
  }
  for (let row = 0; row < 8; row++) {
    const indent = row === 0 || row === 7 ? 0 : row === 3 || row === 4 ? .27 : .14;
    const start = -.53 + indent;
    const y = 1.38 - row * .14;
    const width = [.44, .39, .58, .29, .36, .62, .44, .12][row];
    box(width, .023, .012, row === 0 || row === 7 ? p.ochre : p.ink, [start + width / 2, y, .10], lid);
    if (row > 0 && row < 7) box(.23 + (row % 3) * .08, .016, .012, p.sage, [.75, y, .10], lid);
  }
  box(.012, .73, .012, p.shade, [-.46, .855, .10], lid);
  box(2.25, .012, .010, p.shade, [0, .30, .10], lid);
  // Pen, clip and tip sit in a shallow cradle beside the keyboard.
  rod([1.34, .25, .77], [1.34, .25, -.25], .034, p.graphite);
  rod([1.34, .25, -.25], [1.34, .25, -.36], .019, p.metal);
  box(.017, .049, .20, p.steel, [1.365, .27, .61]);
  // A tiny wired dock adds a distinct tactile silhouette and rear detail.
  const dock = group('cabled expansion dock', [1.56, .17, -.46], [0, -.12, 0]);
  rounded(.34, .24, .68, .052, p.graphite, [0, 0, 0], dock, .015);
  for (let index = 0; index < 3; index++) box(.20, .018, .025, p.dark, [0, .139, -.17 + index * .16], dock);
  rounded(.06, .025, .01, .009, p.ochre, [.065, .02, .357], dock, .002);
  tube([[1.54, .20, -.80], [1.56, .13, -1.02], [1.31, .105, -1.14], [.87, .12, -1.08], [.71, .14, -.73]], .020, p.dark);
  return t.finish('nixos-config');
}

function cubeMechanism(THREE) {
  const t = workshop(THREE, 'Mindstorms cube-solving mechanism');
  const { p, group, box, rounded, cylinder, rod, tube, screw, beam } = t;
  // An interpretive working arrangement: turntable, cube cradle, flip arm,
  // sensor and controller. It is not presented as Marc's exact robot build.
  for (const x of [-1.05, 1.05]) {
    for (const z of [-.69, .74]) cylinder(.13, .09, p.dark, [x, .05, z]);
    beam(1.90, 9, p.graphite, [x, .19, .02], [0, Math.PI / 2, 0]);
  }
  for (const z of [-.64, .64]) beam(2.27, 11, p.shade, [0, .27, z]);
  for (const x of [-.87, .87]) {
    beam(1.61, 7, p.shell, [x, 1.08, -.47], [0, 0, Math.PI / 2]);
    beam(1.06, 5, p.graphite, [x, .69, -.01], [Math.PI / 2, 0, Math.PI / 2]);
    for (const y of [.49, 1.59]) screw([x, y, -.36], [0, 0, 1], undefined, .041);
  }
  beam(1.93, 9, p.shell, [0, 1.86, -.47]);
  // Drive unit beneath the rotating cup, with visible gearing and shaft.
  rounded(.64, .52, .71, .075, p.pale, [0, .59, -.13], undefined, .02);
  for (let index = 0; index < 5; index++) box(.025, .34, .017, p.shade, [-.19 + index * .095, .59, .238]);
  cylinder(.16, .38, p.steel, [0, .73, .02]);
  cylinder(.62, .10, p.graphite, [0, .91, .02], undefined, 40);
  cylinder(.54, .042, p.shade, [0, .98, .02], undefined, 40);
  for (let index = 0; index < 20; index++) {
    const angle = index / 20 * TAU;
    const tooth = box(.058, .067, .046, p.steel, [Math.cos(angle) * .60, .895, .02 + Math.sin(angle) * .60]);
    tooth.rotation.y = -angle;
  }
  // Gaps and a modest six-face palette preserve the unmistakable 3×3 cube.
  const cube = group('three by three cube', [0, 1.55, .02], [0, -.16, 0]);
  rounded(1.065, 1.065, 1.065, .035, p.dark, [0, 0, 0], cube, .009);
  const tileStep = .346, tileSize = .310, faceOffset = .552;
  const faces = [
    { position: [0, 0, faceOffset], rotation: [0, 0, 0], material: p.ochre },
    { position: [0, 0, -faceOffset], rotation: [0, Math.PI, 0], material: p.graphite },
    { position: [faceOffset, 0, 0], rotation: [0, Math.PI / 2, 0], material: p.sage },
    { position: [-faceOffset, 0, 0], rotation: [0, -Math.PI / 2, 0], material: p.clay },
    { position: [0, faceOffset, 0], rotation: [-Math.PI / 2, 0, 0], material: p.pale },
    { position: [0, -faceOffset, 0], rotation: [Math.PI / 2, 0, 0], material: p.shade },
  ];
  for (const face of faces) {
    const side = group('cube face', face.position, face.rotation, cube);
    for (let row = -1; row <= 1; row++) for (let column = -1; column <= 1; column++) {
      rounded(tileSize, tileSize, .022, .027, face.material,
        [column * tileStep, row * tileStep, 0], side, .006);
    }
  }
  // Cradle fingers catch the bottom layer without concealing the cube.
  for (const x of [-.66, .66]) {
    box(.14, .35, .55, p.graphite, [x, 1.115, .02]);
    box(.12, .08, .41, p.dark, [x * .92, 1.285, .02]);
  }
  // Offset flipping arm, driven about a visible axle with toothed collar.
  const flip = group('cube flipping arm', [1.04, 1.99, -.47]);
  const axle = t.axis([0, 0, 0], [1, 0, 0], flip);
  cylinder(.25, .31, p.pale, [0, 0, 0], axle, 32);
  cylinder(.11, .39, p.steel, [0, 0, 0], axle, 20);
  for (let index = 0; index < 12; index++) {
    const angle = index / 12 * TAU;
    const tooth = box(.06, .038, .054, p.shade, [Math.cos(angle) * .233, .176, Math.sin(angle) * .233], axle);
    tooth.rotation.y = -angle;
  }
  beam(1.32, 6, p.shell, [.28, .38, 0], [0, 0, 1.19], flip);
  beam(.93, 4, p.shell, [-.02, .94, 0], [0, 0, -.10], flip);
  box(.23, .20, .29, p.graphite, [-.43, .89, .03], flip);
  rounded(.21, .067, .28, .026, p.dark, [-.43, .755, .03], flip);
  screw([.46, .92, .094], [0, 0, 1], flip, .034);
  // A forward-facing optical sensor sits behind the turntable.
  const sensor = group('optical sensor', [0, 1.49, -.79], [-.11, 0, 0]);
  rounded(.48, .28, .25, .042, p.pale, [0, 0, 0], sensor);
  rounded(.39, .18, .025, .04, p.graphite, [0, 0, .147], sensor, .006);
  for (const x of [-.10, .10]) {
    const eye = t.axis([x, 0, .171], [0, 0, 1], sensor);
    cylinder(.063, .019, p.steel, [0, 0, 0], eye, 20);
    cylinder(.046, .026, p.screen, [0, .009, 0], eye, 20);
  }
  // The controller is visibly part of the robot, with screen, keypad and
  // connected sockets rather than text or a fabricated brand mark.
  const controller = group('programmable controller', [0, .47, 1.02], [-.55, 0, 0]);
  rounded(1.03, .74, .26, .105, p.pale, [0, 0, 0], controller, .025);
  rounded(.74, .32, .027, .032, p.graphite, [0, .14, .164], controller, .005);
  rounded(.64, .225, .012, .016, p.screen, [0, .15, .185], controller, .003);
  for (let row = 0; row < 3; row++) box(.20 + row * .065, .016, .012, p.ink, [-.065, .208 - row * .051, .198], controller);
  rounded(.16, .15, .036, .026, p.ochre, [0, -.167, .174], controller);
  for (const x of [-.23, .23]) rounded(.105, .085, .028, .017, p.graphite, [x, -.167, .170], controller, .005);
  for (const y of [-.29, -.055]) rounded(.085, .065, .028, .015, p.graphite, [0, y, .170], controller, .005);
  for (const x of [-.39, .39]) screw([x, .28, .163], [0, 0, 1], controller, .024);
  for (let index = 0; index < 4; index++) rounded(.13, .045, .028, .007, p.dark, [-.30 + index * .20, .39, .03], controller, .003);
  tube([[-.36, .68, .90], [-.63, .53, .73], [-.67, .54, .07], [-.73, .85, -.70], [-.23, 1.47, -.89]], .023, p.dark);
  tube([[.38, .67, .92], [.71, .49, .75], [1.22, .59, .38], [1.27, 1.29, -.44], [1.16, 1.96, -.62]], .027, p.dark);
  return t.finish('cube-solver');
}

/**
 * Three distinct static exhibits, centered in X/Z with bottom Y=0.
 * Maximum size 3.6 × 3.0 × 3.4 display units; no shared display plate.
 */
export function createTechnicalProject(THREE, id) {
  if (id === 'nixcare') return serviceInstrument(THREE);
  if (id === 'nixos-config') return workstation(THREE);
  if (id === 'cube-solver') return cubeMechanism(THREE);
  throw new RangeError(`Unknown technical project: ${id}`);
}
