/**
 * The Field Index — a small, dependency-free wireframe instrument.
 * Geometry is rendered in canvas; the surrounding interface remains native HTML.
 */

const TAU = Math.PI * 2;
const INK = [186, 211, 195];
const GOLD = [219, 180, 116];
const MODES = new Set(['systems', 'intelligence', 'exploration']);

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function unit(p) {
  const length = Math.hypot(...p) || 1;
  return p.map(value => value / length);
}

function curve(sample, count = 144, style = {}) {
  return {
    points: Array.from({ length: count + 1 }, (_, index) => sample(index / count)),
    gold: false,
    weight: 1,
    opacity: 1,
    ...style,
  };
}

function knot(t, v) {
  const a = t * TAU;
  const b = v * TAU;
  const r = 0.73 + 0.235 * Math.cos(3 * a);
  const dr = -0.705 * Math.sin(3 * a);
  const centre = [r * Math.cos(2 * a), r * Math.sin(2 * a), 0.33 * Math.sin(3 * a)];
  const tangent = unit([
    dr * Math.cos(2 * a) - 2 * r * Math.sin(2 * a),
    dr * Math.sin(2 * a) + 2 * r * Math.cos(2 * a),
    0.99 * Math.cos(3 * a),
  ]);
  const normal = unit(cross(tangent, [0, 0, 1]));
  const binormal = cross(tangent, normal);
  const radius = 0.145;
  return centre.map((value, axis) =>
    value + radius * (Math.cos(b) * normal[axis] + Math.sin(b) * binormal[axis]),
  );
}

function sphere(u, v, scale = [1, 1, 1]) {
  return [
    Math.cos(u) * Math.cos(v) * scale[0],
    Math.sin(v) * scale[1],
    Math.sin(u) * Math.cos(v) * scale[2],
  ];
}

function orbit(t, angle = 0, radius = 1.13) {
  return [
    Math.cos(t) * radius,
    Math.sin(t) * Math.sin(angle) * radius,
    Math.sin(t) * Math.cos(angle) * radius,
  ];
}

function buildGeometry(mode) {
  const lines = [];
  const markers = [];

  if (mode === 'systems') {
    for (let longitude = 0; longitude < 24; longitude += 1) {
      lines.push(curve(t => knot(t, longitude / 24), 216, {
        gold: longitude === 3 || longitude === 4,
        weight: longitude === 3 ? 1.2 : 0.8,
        opacity: longitude === 4 ? 0.45 : 1,
      }));
    }
    for (let section = 0; section < 84; section += 1) {
      lines.push(curve(v => knot(section / 84, v), 28, { weight: 0.65, opacity: 0.8 }));
    }
    [0.035, 0.34, 0.67].forEach(t => markers.push(knot(t, 3 / 24)));
  } else if (mode === 'intelligence') {
    const scale = [0.89, 1.04, 0.76];
    const wave = (u, v) => {
      const p = sphere(u, v, scale);
      const amplitude = 1 + 0.045 * Math.cos(u * 6 + v * 3) * Math.cos(v);
      return p.map(value => value * amplitude);
    };
    for (let latitude = -8; latitude <= 8; latitude += 1) {
      lines.push(curve(t => wave(t * TAU, latitude * Math.PI / 19), 144, { weight: 0.7 }));
    }
    for (let longitude = 0; longitude < 32; longitude += 1) {
      lines.push(curve(t => wave(longitude * TAU / 32, t * TAU), 144, {
        opacity: 0.7,
        weight: 0.65,
      }));
    }
    [-0.67, 0.7, 1.8].forEach((angle, index) => {
      lines.push(curve(t => orbit(t * TAU, angle, 1.16), 144, {
        gold: index === 1,
        weight: index === 1 ? 1.2 : 0.75,
        opacity: index === 1 ? 1 : 0.55,
      }));
    });
    [0.45, 2.1, 3.9, 5.35].forEach(t => markers.push(orbit(t, 0.7, 1.16)));
  } else {
    for (let latitude = -8; latitude <= 8; latitude += 1) {
      lines.push(curve(t => sphere(t * TAU, latitude * Math.PI / 20), 144, { weight: 0.7 }));
    }
    for (let longitude = 0; longitude < 24; longitude += 1) {
      lines.push(curve(t => sphere(longitude * TAU / 24, t * TAU), 144, {
        weight: 0.7,
        opacity: 0.8,
      }));
    }
    lines.push(curve(t => orbit(t * TAU, 0.42, 1.15), 144, {
      gold: true,
      weight: 1.2,
    }));
    lines.push(curve(t => orbit(t * TAU, -0.65, 1.2), 144, {
      opacity: 0.4,
      weight: 0.65,
    }));
    [0.6, 2.8, 4.9].forEach(t => markers.push(orbit(t, 0.42, 1.15)));
  }
  return { lines, markers };
}

export class FieldInstrument {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('FieldInstrument needs a canvas element.');
    }
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.mode = MODES.has(options.mode) ? options.mode : 'systems';
    this.geometry = buildGeometry(this.mode);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.finePointer = window.matchMedia('(pointer: fine)');
    this.paused = options.paused ?? this.reducedMotion.matches;
    this.manualMotion = options.paused !== undefined;
    this.visible = true;
    this.destroyed = false;
    this.frame = 0;
    this.lastTime = 0;
    this.phase = 0;
    this.width = 0;
    this.height = 0;
    this.pointer = { x: 0, y: 0 };
    this.targetPointer = { x: 0, y: 0 };
    this.opacity = 1;

    this.tick = this.tick.bind(this);
    this.handleVisibility = () => this.resume();
    this.handleMotion = () => {
      if (!this.manualMotion) this.paused = this.reducedMotion.matches;
      this.pointer.x = this.pointer.y = 0;
      this.targetPointer.x = this.targetPointer.y = 0;
      this.resume();
    };
    this.handlePointer = event => {
      if (!this.finePointer.matches || this.paused || this.reducedMotion.matches) return;
      const bounds = canvas.getBoundingClientRect();
      this.targetPointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.2;
      this.targetPointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.2;
    };
    this.handlePointerLeave = () => {
      this.targetPointer.x = 0;
      this.targetPointer.y = 0;
    };

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      this.resume();
    }, { rootMargin: '50px' });
    this.intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.reducedMotion.addEventListener('change', this.handleMotion);
    canvas.addEventListener('pointermove', this.handlePointer, { passive: true });
    canvas.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
    this.resize();
  }

  setMode(mode) {
    if (!MODES.has(mode) || mode === this.mode || this.destroyed) return;
    this.mode = mode;
    this.geometry = buildGeometry(mode);
    this.opacity = this.paused || this.reducedMotion.matches ? 1 : 0.16;
    this.draw();
    this.resume();
  }

  setPaused(paused) {
    this.manualMotion = true;
    this.paused = Boolean(paused);
    if (this.paused) {
      this.opacity = 1;
      this.pointer.x = this.pointer.y = 0;
      this.targetPointer.x = this.targetPointer.y = 0;
    }
    this.resume();
  }

  resize() {
    if (this.destroyed) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
    this.resume();
  }

  resume() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    if (this.destroyed) return;
    this.draw();
    if (!this.paused && this.visible && !document.hidden) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  tick(time) {
    if (this.destroyed || this.paused || !this.visible || document.hidden) return;
    if (!this.lastTime) this.lastTime = time - 34;
    const elapsed = time - this.lastTime;
    if (elapsed >= 1000 / 30) {
      this.phase += Math.min(elapsed, 70) / 1000;
      this.lastTime = time;
      this.pointer.x += (this.targetPointer.x - this.pointer.x) * 0.07;
      this.pointer.y += (this.targetPointer.y - this.pointer.y) * 0.07;
      this.opacity = Math.min(1, this.opacity + 0.065);
      this.draw();
    }
    this.frame = requestAnimationFrame(this.tick);
  }

  draw() {
    const ctx = this.context;
    const { width, height } = this;
    if (!ctx || !width || !height || this.destroyed) return;
    ctx.clearRect(0, 0, width, height);
    const size = Math.min(width, height);
    const scale = size * 0.345;
    const tilt = this.mode === 'systems' ? 0.72 : -0.17;
    const pitch = tilt + this.pointer.y;
    const yaw = 0.28 + this.phase * 0.046 + this.pointer.x;
    const roll = this.mode === 'systems' ? -0.38 : -0.18;
    const ca = Math.cos(pitch), sa = Math.sin(pitch);
    const cb = Math.cos(yaw), sb = Math.sin(yaw);
    const cc = Math.cos(roll), sc = Math.sin(roll);

    const project = p => {
      const y1 = p[1] * ca - p[2] * sa;
      const z1 = p[1] * sa + p[2] * ca;
      const x2 = p[0] * cb + z1 * sb;
      const z2 = -p[0] * sb + z1 * cb;
      const x3 = x2 * cc - y1 * sc;
      const y3 = x2 * sc + y1 * cc;
      const perspective = 4.8 / (4.8 - z2);
      return [
        width * 0.5 + x3 * scale * perspective,
        height * 0.5 + y3 * scale * perspective,
        z2,
      ];
    };

    // A quiet ground-light gives the transparent object volume without a halo.
    const light = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, size * 0.47);
    light.addColorStop(0, 'rgba(130, 165, 141, 0.035)');
    light.addColorStop(1, 'rgba(130, 165, 141, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    const paths = this.geometry.lines.map(line => {
      const points = line.points.map(project);
      return {
        ...line,
        points,
        depth: points.reduce((sum, point) => sum + point[2], 0) / points.length,
      };
    }).sort((a, b) => a.depth - b.depth);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const lineScale = Math.max(0.72, Math.min(1, size / 500));

    for (const path of paths) {
      const color = path.gold ? GOLD : INK;
      const depthAlpha = Math.max(0.13, Math.min(0.62, 0.35 + path.depth * 0.24));
      const alpha = (path.gold ? 0.75 : depthAlpha) * path.opacity * this.opacity;
      ctx.strokeStyle = `rgba(${color.join(',')},${alpha})`;
      ctx.lineWidth = path.weight * lineScale;
      ctx.beginPath();
      path.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.stroke();
    }

    for (const marker of this.geometry.markers) {
      const p = project(marker);
      const alpha = Math.max(0.35, Math.min(1, 0.72 + p[2] * 0.28)) * this.opacity;
      ctx.fillStyle = `rgba(${GOLD.join(',')},${alpha})`;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.2 * lineScale, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(${GOLD.join(',')},${alpha * 0.28})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 5.8 * lineScale, 0, TAU);
      ctx.stroke();
    }
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.reducedMotion.removeEventListener('change', this.handleMotion);
    this.canvas.removeEventListener('pointermove', this.handlePointer);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
  }
}
