import { createCampus } from './model-campus.js?v=study-3';
import { createPalm } from './model-palm.js?v=study-3';
import { createTechnicalProject } from './models-projects.js?v=study-3';

const PROJECTS = ['rommelweb', 'aloha', 'nixcare', 'nixos-config', 'cube-solver'];
const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * One shared display and five preconstructed exhibits.
 *
 * Models retain their proportions and stay upright. They retract behind a
 * world-space clip plane before the empty slab turns, then emerge after it
 * lands. The slab lifts by its rotated half-depth, keeping it above the desk.
 * The parent renderer must enable localClippingEnabled.
 */
export function createProjectDisplay(THREE) {
  const root = new THREE.Group();
  root.name = 'Projects display';
  const width = 4.7, depth = 4.58, thickness = 0.115;
  const surfaceY = 0.16;
  const plateCenterY = surfaceY - thickness / 2;
  const restingModelY = surfaceY + 0.008;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -surfaceY);
  const planePoint = new THREE.Vector3();
  const planeNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  const rotor = new THREE.Group();
  rotor.name = 'Turning project plate';
  rotor.position.y = plateCenterY;
  root.add(rotor);

  // Beveled corners and two distinct faces make the half-turn legible.
  const corner = 0.13;
  const outline = [
    [-width / 2 + corner, -depth / 2], [width / 2 - corner, -depth / 2],
    [width / 2, -depth / 2 + corner], [width / 2, depth / 2 - corner],
    [width / 2 - corner, depth / 2], [-width / 2 + corner, depth / 2],
    [-width / 2, depth / 2 - corner], [-width / 2, -depth / 2 + corner],
  ];
  const platePositions = [], plateColors = [], edgePositions = [];
  const faceTop = new THREE.Color('#44503a');
  const faceBottom = new THREE.Color('#293529');
  const sideColor = new THREE.Color('#747d65');
  function triangle(a, b, c, color) {
    platePositions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) plateColors.push(color.r, color.g, color.b);
  }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const ta = [a[0], thickness / 2, a[1]], tb = [b[0], thickness / 2, b[1]];
    const ba = [a[0], -thickness / 2, a[1]], bb = [b[0], -thickness / 2, b[1]];
    triangle([0, thickness / 2, 0], tb, ta, faceTop);
    triangle([0, -thickness / 2, 0], ba, bb, faceBottom);
    triangle(ba, ta, tb, sideColor);
    triangle(ba, tb, bb, sideColor);
    edgePositions.push(...ta, ...tb, ...ba, ...bb);
  }
  const plateGeometry = new THREE.BufferGeometry();
  plateGeometry.setAttribute('position', new THREE.Float32BufferAttribute(platePositions, 3));
  plateGeometry.setAttribute('color', new THREE.Float32BufferAttribute(plateColors, 3));
  plateGeometry.computeVertexNormals();
  const plate = new THREE.Mesh(plateGeometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.87, metalness: 0.08, side: THREE.DoubleSide,
  }));
  plate.name = 'Shared chamfered exhibit plate';
  plate.castShadow = true;
  plate.receiveShadow = true;
  rotor.add(plate);
  const rim = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3)),
    new THREE.LineBasicMaterial({ color: '#bdc6aa', opacity: 0.42, transparent: true, depthWrite: false }),
  );
  rim.name = 'Plate perimeter';
  rotor.add(rim);

  const models = new Map();

  // The original palm batches its stones with the coconuts. Retain only the
  // crown geometry from that batch after removing its original round plinth.
  function removePalmStones(object) {
    if (!object.geometry || !object.name.startsWith('Coconuts and stones')) return;
    const source = object.geometry;
    const position = source.getAttribute('position');
    const stride = object.isLineSegments ? 2 : 3;
    const retained = [];
    for (let i = 0; i < position.count; i += stride) {
      let crown = false;
      for (let j = 0; j < stride; j++) crown ||= position.getY(i + j) > 0.5;
      if (crown) for (let j = 0; j < stride; j++) retained.push(i + j);
    }
    const next = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values = new attribute.array.constructor(retained.length * attribute.itemSize);
      retained.forEach((index, target) => {
        for (let axis = 0; axis < attribute.itemSize; axis++) {
          values[target * attribute.itemSize + axis] = attribute.array[index * attribute.itemSize + axis];
        }
      });
      next.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
    }
    next.computeBoundingBox();
    next.computeBoundingSphere();
    object.geometry = next;
    source.dispose();
  }

  for (const id of PROJECTS) {
    const model = id === 'rommelweb' ? createCampus(THREE)
      : id === 'aloha' ? createPalm(THREE)
        : createTechnicalProject(THREE, id);
    const oldBases = [];
    model.traverse(object => {
      if (object.name === 'Shallow architectural model base' ||
          object.name === 'Fine model-base edge' ||
          object.name.startsWith('Indexed exhibit base')) oldBases.push(object);
      if (id === 'aloha') removePalmStones(object);
    });
    for (const object of oldBases) object.removeFromParent();
    const retainedGeometries = new Set(), retainedMaterials = new Set(), retainedTextures = new Set();
    model.traverse(object => {
      if (object.geometry) retainedGeometries.add(object.geometry);
      for (const material of object.material
        ? Array.isArray(object.material) ? object.material : [object.material] : []) {
        retainedMaterials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) retainedTextures.add(value);
      }
    });
    const orphanGeometries = new Set(), orphanMaterials = new Set(), orphanTextures = new Set();
    for (const base of oldBases) base.traverse(object => {
      if (object.geometry && !retainedGeometries.has(object.geometry)) orphanGeometries.add(object.geometry);
      for (const material of object.material
        ? Array.isArray(object.material) ? object.material : [object.material] : []) {
        if (retainedMaterials.has(material)) continue;
        orphanMaterials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture && !retainedTextures.has(value)) orphanTextures.add(value);
        }
      }
    });
    orphanGeometries.forEach(geometry => geometry.dispose());
    orphanMaterials.forEach(material => material.dispose());
    orphanTextures.forEach(texture => texture.dispose());
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = Math.min(4.32 / size.x, 3.08 / size.y, 4.18 / size.z);
    const content = new THREE.Group();
    content.name = `${id} normalized exhibit`;
    content.scale.setScalar(scale);
    model.position.set(-center.x, -box.min.y, -center.z);
    content.add(model);
    const carriage = new THREE.Group();
    carriage.name = `${id} retracting carriage`;
    carriage.position.y = restingModelY;
    carriage.visible = id === 'rommelweb';
    carriage.add(content);
    carriage.traverse(object => {
      object.userData.projectId = id;
      if (!object.material) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        material.clippingPlanes = [clipPlane];
        material.clipShadows = true;
      }
    });
    root.add(carriage);
    models.set(id, { carriage, height: size.y * scale, travel: size.y * scale + 0.035 });
  }

  let active = 'rommelweb', target = active, phase = 'idle', elapsed = 0;
  let reduced = false, depthFrom = 0, switched = false, restingAngle = 0;
  const durations = { retract: 0.21, flip: 0.40, reveal: 0.25 };

  function showOnly(id) {
    for (const [key, model] of models) model.carriage.visible = key === id;
  }
  function resetPlate() {
    rotor.rotation.x = restingAngle;
    rotor.position.y = plateCenterY;
  }
  function landImmediately() {
    active = target;
    phase = 'idle';
    elapsed = 0;
    resetPlate();
    for (const model of models.values()) model.carriage.position.y = restingModelY;
    showOnly(active);
  }
  function retract() {
    phase = 'retract';
    elapsed = 0;
    depthFrom = restingModelY - models.get(active).carriage.position.y;
  }
  function reveal() {
    active = target;
    const model = models.get(active);
    model.carriage.position.y = restingModelY - model.travel;
    showOnly(active);
    phase = 'reveal';
    elapsed = 0;
  }
  function updatePlane() {
    root.updateWorldMatrix(true, false);
    normalMatrix.getNormalMatrix(root.matrixWorld);
    planeNormal.set(0, 1, 0).applyMatrix3(normalMatrix).normalize();
    planePoint.set(0, surfaceY + 0.002, 0).applyMatrix4(root.matrixWorld);
    clipPlane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
  }
  function setProject(id, { instant = false } = {}) {
    if (!models.has(id)) return;
    target = id;
    if (instant || reduced) {
      landImmediately();
      updatePlane();
      return;
    }
    if (phase === 'idle' && active !== target) retract();
    else if (phase === 'reveal' && active !== target) retract();
    // Retract/flip requests are coalesced; a stale exhibit never rises.
  }

  function advance() {
    if (phase === 'retract') {
      if (target === active) {
        // A reversal can simply bring the same exhibit back.
        reveal();
      } else {
        showOnly(null);
        phase = 'flip';
        elapsed = 0;
        switched = false;
      }
    } else if (phase === 'flip') {
      restingAngle = (restingAngle + Math.PI) % (Math.PI * 2);
      resetPlate();
      reveal();
    } else if (phase === 'reveal') {
      models.get(active).carriage.position.y = restingModelY;
      phase = 'idle';
      elapsed = 0;
      if (active !== target) retract();
    }
  }

  function pose() {
    const amount = smooth(clamp(elapsed / durations[phase], 0, 1));
    if (phase === 'retract') {
      const model = models.get(active);
      model.carriage.position.y = restingModelY - (depthFrom + (model.travel - depthFrom) * amount);
    } else if (phase === 'flip') {
      const angle = restingAngle + Math.PI * amount;
      rotor.rotation.x = angle;
      rotor.position.y = plateCenterY + depth / 2 * Math.abs(Math.sin(angle));
      if (!switched && amount >= 0.5) {
        active = target;
        switched = true;
      }
    } else if (phase === 'reveal') {
      const model = models.get(active);
      model.carriage.position.y = restingModelY - model.travel * (1 - amount);
    }
  }

  function update(dtSeconds) {
    updatePlane();
    if (reduced && phase !== 'idle') landImmediately();
    let remaining = clamp(Number.isFinite(dtSeconds) ? dtSeconds : 0, 0, 1);
    for (let transitions = 0; phase !== 'idle' && transitions < 6; transitions++) {
      const duration = durations[phase];
      const step = Math.min(remaining, duration - elapsed);
      elapsed += step;
      remaining -= step;
      pose();
      if (elapsed >= duration - 0.000001) advance();
      else break;
      if (remaining <= 0) break;
    }
    return phase !== 'idle';
  }

  root.userData.frameBounds = new THREE.Box3(
    new THREE.Vector3(-width / 2, 0, -depth / 2),
    new THREE.Vector3(width / 2, plateCenterY + depth + thickness, depth / 2),
  );
  root.userData.projects = {
    setProject,
    update,
    setReduced(value) {
      reduced = Boolean(value);
      if (reduced) landImmediately();
    },
    getState: () => ({
      active, target, phase, animating: phase !== 'idle', reduced,
      angle: rotor.rotation.x,
      plateY: rotor.position.y,
      visible: [...models].filter(([, model]) => model.carriage.visible).map(([id]) => id),
    }),
  };
  updatePlane();
  return root;
}
