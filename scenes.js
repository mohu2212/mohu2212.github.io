/* ==========================================================================
   Four WebGL scenes for the Nocturne portfolio:
     hero-field           depth field + sculptural mark
     skill-constellation  orbitable skill clusters
     arch-stack           Clean Architecture layer stack
     phone-stage          rotating phone with painted app screens

   Colours are read from the CSS design tokens rather than hardcoded, so the
   scenes follow the light/dark toggle. A theme change rebuilds each element,
   which re-runs build() against the new palette.
   ========================================================================== */

import * as THREE from 'https://esm.sh/three@0.160.0';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- palette from CSS tokens ---------- */

const P = {};

function token(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function readPalette() {
  P.cssAccent = token('--color-accent', '#9184d9');
  P.cssAccentLight = token('--color-accent-300', '#d2cefd');
  P.cssSurface = token('--color-surface', '#232532');
  P.cssMuted = token('--color-neutral-500', '#9397ab');
  P.cssText = token('--color-text', '#e9e9ed');
  P.cssInk = token('--scene-ink', '#12131f');

  P.accent = new THREE.Color(P.cssAccent).getHex();
  P.accentLight = new THREE.Color(P.cssAccentLight).getHex();
  P.surface = new THREE.Color(P.cssSurface).getHex();

  const c = new THREE.Color(P.cssAccent);
  P.accentRGBA = (a) =>
    `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
  const t = new THREE.Color(P.cssText);
  P.textRGBA = (a) =>
    `rgba(${Math.round(t.r * 255)},${Math.round(t.g * 255)},${Math.round(t.b * 255)},${a})`;
}

readPalette();

/* ---------- helpers ---------- */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.__redraw = () => { ctx.clearRect(0, 0, w, h); draw(ctx, w, h); tex.needsUpdate = true; };
  tex.__redraw();
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function line(a, b, opacity, color) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  return new THREE.Line(g, new THREE.LineBasicMaterial({
    color: color || P.accent, transparent: true, opacity, depthWrite: false,
  }));
}

function labelSprite(text, pos, worldWidth) {
  const tex = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = P.cssAccentLight;
    ctx.font = '500 46px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.92 }));
  s.position.copy(pos);
  s.scale.set(worldWidth, worldWidth * 0.25, 1);
  s.__tex = tex;
  return s;
}

function pointField(count, spread, size, opacity) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[3 * i] = (Math.random() - 0.5) * spread[0];
    pos[3 * i + 1] = (Math.random() - 0.5) * spread[1];
    pos[3 * i + 2] = (Math.random() - 0.5) * spread[2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({
    color: P.accentLight, size, transparent: true, opacity, depthWrite: false,
  }));
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* ---------- base element ---------- */

class Scene3D extends HTMLElement {
  connectedCallback() {
    if (this.__started) return;
    this.__started = true;
    /* Sizing and positioning belong to the stylesheet. Only fall back to
       relative when nothing has positioned the element at all — writing
       inline width/height/position here would override .hero-scene's
       absolute fill and collapse the fixed-height scene wrappers. */
    if (getComputedStyle(this).position === 'static') this.style.position = 'relative';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    this.appendChild(canvas);

    this._textures = [];
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      document.body.classList.add('no-scenes');
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.clock = new THREE.Clock();
    this.pointer = { x: 0, y: 0 };

    this._onMove = (e) => {
      const r = this.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / Math.max(r.width, 1)) * 2 - 1;
      this.pointer.y = ((e.clientY - r.top) / Math.max(r.height, 1)) * 2 - 1;
    };
    window.addEventListener('pointermove', this._onMove, { passive: true });

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this);
    this._visible = true;
    this._io = new IntersectionObserver((es) => { this._visible = es[0].isIntersecting; }, { rootMargin: '160px' });
    this._io.observe(this);

    this.build();
    this.resize();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this._textures.forEach((t) => t.__redraw && t.__redraw()));
    }

    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (!this._visible) return;
      this.update(REDUCED ? 0 : dt, this.clock.elapsedTime);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('pointermove', this._onMove);
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this._textures) this._textures.forEach((t) => t.dispose && t.dispose());
    if (this.renderer) this.renderer.dispose();
    this.__started = false;
  }

  track(tex) { this._textures.push(tex); return tex; }

  resize() {
    if (!this.renderer) return;
    const w = this.clientWidth || 1, h = this.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
  }

  /* 0 -> element just entering from below, 1 -> element fully past the top */
  progress() {
    const r = this.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  }

  build() {}
  update() {}
}

/* ---------- 1. hero: depth field + sculptural mark ---------- */

class HeroField extends Scene3D {
  build() {
    this.camera.position.set(0, 0, 7);
    this.field = pointField(1500, [30, 18, 20], 0.038, 0.5);
    this.scene.add(this.field);

    this.mark = new THREE.Group();
    const ico = new THREE.IcosahedronGeometry(1.65, 1);
    this.mark.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(ico),
      new THREE.LineBasicMaterial({ color: P.accent, transparent: true, opacity: 0.9 }),
    ));
    this.mark.add(new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.57, 1),
      new THREE.MeshBasicMaterial({ color: P.surface, transparent: true, opacity: 0.9 }),
    ));
    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.78, 0),
      new THREE.MeshBasicMaterial({ color: P.accentLight, wireframe: true, transparent: true, opacity: 0.8 }),
    );
    this.mark.add(this.core);
    this.orb = new THREE.Group();
    this.orb.add(this.mark);
    this.scene.add(this.orb);

    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(2.2 + i * 0.44, 0.007, 3, 160),
        new THREE.MeshBasicMaterial({ color: i === 1 ? P.accentLight : P.accent, transparent: true, opacity: 0.45 - i * 0.09 }),
      );
      r.rotation.set(Math.PI / 2 + i * 0.42, i * 0.7, 0);
      this.rings.push(r);
      this.orb.add(r);
    }
  }

  onResize(w, h) {
    const R = 3.4;
    const tan = Math.tan((45 * Math.PI / 180) / 2);
    const asp = w / Math.max(h, 1);
    let z = (R * 1.18) / tan;
    if (asp < 1.25) z = Math.max(z, (R * 1.06) / (tan * Math.max(asp, 0.4)));
    this._baseZ = z;
    this.camera.position.z = z;
  }

  update(dt, t) {
    this.mark.rotation.y += dt * 0.24;
    this.mark.rotation.x = Math.sin(t * 0.3) * 0.16;
    this.core.rotation.y -= dt * 0.7;
    this.core.rotation.z += dt * 0.35;
    this.rings.forEach((r, i) => { r.rotation.z += dt * (0.14 + i * 0.06) * (i % 2 ? -1 : 1); });
    this.field.rotation.y += dt * 0.014;
    const p = this.progress();
    const wide = (this.clientWidth || 1) / (this.clientHeight || 1) > 1.15;
    const halfW = Math.tan((45 * Math.PI / 180) / 2) * this.camera.position.z * this.camera.aspect;
    const ox = wide ? Math.max(1.2, Math.min(3.4, halfW - 3.4)) : 0;
    const oy = wide ? 0 : -2.1;
    this.orb.position.x += (ox - this.orb.position.x) * 0.06;
    this.orb.position.y += (oy - this.orb.position.y) * 0.06;
    const tx = this.pointer.x * 0.75, ty = -this.pointer.y * 0.4;
    this.camera.position.x += (tx - this.camera.position.x) * 0.05;
    this.camera.position.y += (ty - this.camera.position.y) * 0.05;
    const baseZ = this._baseZ || 9.7;
    this.camera.position.z += (baseZ - Math.max(0, p - 0.5) * 3.4 - this.camera.position.z) * 0.08;
    this.camera.lookAt(0, 0, 0);
  }
}

/* ---------- 2. skills: orbitable constellation ---------- */

const CLUSTERS = [
  { label: 'Flutter & Dart', c: [-3.4, 0.5, 0.2], n: 7 },
  { label: 'State & Architecture', c: [0.3, -1.5, 1.4], n: 7 },
  { label: 'Backend & Data', c: [3.3, 1.1, -0.7], n: 7 },
];

class SkillConstellation extends Scene3D {
  build() {
    this.camera.position.set(0, 0, 10.5);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.rot = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.dragging = false;

    const nodeGeo = new THREE.SphereGeometry(0.08, 14, 14);
    const nodeMat = new THREE.MeshBasicMaterial({ color: P.accentLight });
    const hubMat = new THREE.MeshBasicMaterial({ color: P.accent });
    const rings = [];

    CLUSTERS.forEach((cl) => {
      const c = new THREE.Vector3(...cl.c);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), hubMat);
      hub.position.copy(c);
      this.group.add(hub);
      const pts = [];
      for (let i = 0; i < cl.n; i++) {
        const v = c.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.2,
        ));
        const m = new THREE.Mesh(nodeGeo, nodeMat);
        m.position.copy(v);
        this.group.add(m);
        this.group.add(line(c, v, 0.3));
        pts.push(v);
      }
      rings.push(pts);
      const lb = labelSprite(cl.label, c.clone().add(new THREE.Vector3(0, 1.9, 0)), 2.5);
      this.track(lb.__tex);
      this.group.add(lb);
    });

    for (let i = 0; i < rings.length; i++) {
      const a = rings[i], b = rings[(i + 1) % rings.length];
      for (let k = 0; k < 3; k++) {
        this.group.add(line(a[(k * 2) % a.length], b[(k * 3 + 1) % b.length], 0.13));
      }
    }

    this.style.cursor = 'grab';
    this.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.style.cursor = 'grabbing';
      this._last = { x: e.clientX, y: e.clientY };
      this.setPointerCapture(e.pointerId);
    });
    this.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.vel.y = (e.clientX - this._last.x) * 0.006;
      this.vel.x = (e.clientY - this._last.y) * 0.004;
      this.rot.y += this.vel.y;
      this.rot.x = Math.max(-0.45, Math.min(0.45, this.rot.x + this.vel.x));
      this._last = { x: e.clientX, y: e.clientY };
    });
    const end = () => { this.dragging = false; this.style.cursor = 'grab'; };
    this.addEventListener('pointerup', end);
    this.addEventListener('pointercancel', end);
  }

  update(dt) {
    if (!this.dragging) {
      this.vel.y *= 0.94;
      this.vel.x *= 0.94;
      this.rot.y += this.vel.y + dt * 0.09;
      this.rot.x += this.vel.x;
      this.rot.x += (this.pointer.y * 0.12 - this.rot.x) * 0.02;
    }
    this.group.rotation.y = this.rot.y;
    this.group.rotation.x = this.rot.x;
    const tan = Math.tan((45 * Math.PI / 180) / 2);
    const asp = Math.max(0.4, (this.clientWidth || 1) / (this.clientHeight || 1));
    const fitZ = Math.max(4.15 / tan, 5.6 / (tan * asp));
    this.camera.position.z += (fitZ - Math.sin(this.progress() * Math.PI) * 0.8 - this.camera.position.z) * 0.08;
  }
}

/* ---------- 3. architecture stack ---------- */

const LAYERS = [
  ['Presentation', 'Widgets · BLoC / Cubit'],
  ['Domain', 'Entities · Use cases'],
  ['Data', 'Repositories · DTOs'],
  ['Core', 'DI · Network · Cache'],
];

class ArchStack extends Scene3D {
  build() {
    this.camera.position.set(0, 4.7, 6.6);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.planes = [];

    LAYERS.forEach((d, i) => {
      const tex = this.track(canvasTexture(1024, 620, (ctx, w, h) => {
        ctx.save();
        roundRect(ctx, 8, 8, w - 16, h - 16, 26);
        ctx.fillStyle = P.cssSurface;
        ctx.globalAlpha = 0.86;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 3;
        ctx.strokeStyle = i === 0 ? P.cssAccent : P.accentRGBA(0.45);
        ctx.stroke();
        ctx.restore();
        ctx.textBaseline = 'middle';
        ctx.fillStyle = P.cssMuted;
        ctx.font = '500 34px Inter, system-ui, sans-serif';
        ctx.fillText(String(i + 1).padStart(2, '0'), 56, h * 0.42);
        ctx.fillStyle = P.cssText;
        ctx.font = '500 104px Inter, system-ui, sans-serif';
        ctx.fillText(d[0], 56, h * 0.62);
        ctx.fillStyle = P.cssAccentLight;
        ctx.font = '400 50px Inter, system-ui, sans-serif';
        ctx.fillText(d[1], 56, h * 0.81);
      }));
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 3.15),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      m.rotation.x = -Math.PI / 2;
      this.planes.push(m);
      this.group.add(m);
    });

    this.field = pointField(500, [18, 10, 14], 0.03, 0.35);
    this.scene.add(this.field);
  }

  update(dt, t) {
    const p = this.progress();
    const spread = 0.34 + Math.min(1, Math.max(0, (p - 0.15) / 0.6)) * 1.45;
    this.planes.forEach((m, i) => {
      m.position.y = (1.5 - i) * spread;
      m.position.z = (i - 1.5) * spread * 0.25;
      m.rotation.z = Math.sin(t * 0.25 + i * 0.5) * 0.02;
    });
    this.group.rotation.y = Math.sin(t * 0.14) * 0.16 + this.pointer.x * 0.12;
    this.field.rotation.y += dt * 0.02;
    this.camera.position.y = 4.7 - this.pointer.y * 0.45;
    this.camera.lookAt(0, 0, 0);
  }
}

/* ---------- 4. projects: phone in space ---------- */

function paintChrome(ctx, w, title) {
  ctx.fillStyle = P.cssInk;
  ctx.fillRect(0, 0, w, 1180);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = P.cssMuted;
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  ctx.fillText('9:41', 40, 54);
  ctx.textAlign = 'right';
  ctx.fillText('▮▮▮', w - 40, 54);
  ctx.textAlign = 'left';
  ctx.fillStyle = P.cssText;
  ctx.font = '500 52px Inter, system-ui, sans-serif';
  ctx.fillText(title, 40, 150);
}

const SCREENS = [
  (ctx, w) => { /* Waslny — live map + trip */
    paintChrome(ctx, w, 'Waslny');
    ctx.save();
    roundRect(ctx, 40, 210, w - 80, 560, 22);
    ctx.clip();
    ctx.fillStyle = P.cssSurface;
    ctx.fillRect(40, 210, w - 80, 560);
    ctx.strokeStyle = P.accentRGBA(0.16);
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.moveTo(40, 250 + i * 62); ctx.lineTo(w - 40, 230 + i * 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(70 + i * 58, 210); ctx.lineTo(110 + i * 58, 770); ctx.stroke();
    }
    ctx.strokeStyle = P.cssAccent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(110, 700); ctx.bezierCurveTo(230, 620, 260, 470, 400, 380);
    ctx.stroke();
    ctx.fillStyle = P.cssAccentLight;
    ctx.beginPath(); ctx.arc(110, 700, 16, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(400, 380, 16, 0, 7); ctx.fill();
    ctx.restore();
    roundRect(ctx, 40, 800, w - 80, 250, 22);
    ctx.fillStyle = P.cssSurface; ctx.fill();
    ctx.strokeStyle = P.accentRGBA(0.3); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = P.cssMuted;
    ctx.font = '400 26px Inter, system-ui, sans-serif';
    ctx.fillText('Estimated fare', 72, 852);
    ctx.fillStyle = P.cssText;
    ctx.font = '500 60px Inter, system-ui, sans-serif';
    ctx.fillText('EGP 48.00', 72, 916);
    roundRect(ctx, 72, 960, w - 144, 62, 12);
    ctx.strokeStyle = P.cssAccent; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = P.cssAccentLight;
    ctx.font = '500 30px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Confirm ride', w / 2, 992);
    ctx.textAlign = 'left';
  },
  (ctx, w) => { /* Emirates RX — medication lookup */
    paintChrome(ctx, w, 'Emirates RX');
    roundRect(ctx, 40, 210, w - 80, 76, 16);
    ctx.fillStyle = P.cssSurface; ctx.fill();
    ctx.strokeStyle = P.accentRGBA(0.3); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = P.cssMuted;
    ctx.font = '400 28px Inter, system-ui, sans-serif';
    ctx.fillText('Search medications', 74, 250);
    ctx.fillStyle = P.cssAccent;
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText('Offline · cached', 40, 330);
    for (let i = 0; i < 5; i++) {
      const y = 370 + i * 150;
      roundRect(ctx, 40, y, w - 80, 124, 18);
      ctx.fillStyle = P.cssSurface; ctx.fill();
      ctx.strokeStyle = P.textRGBA(0.1); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = P.cssAccent;
      ctx.fillRect(40, y + 24, 5, 76);
      ctx.fillStyle = P.cssText;
      ctx.font = '500 36px Inter, system-ui, sans-serif';
      ctx.fillText('Medication ' + String.fromCharCode(65 + i), 76, y + 48);
      ctx.fillStyle = P.cssMuted;
      ctx.font = '400 26px Inter, system-ui, sans-serif';
      ctx.fillText('Dosage · interactions · class', 76, y + 92);
    }
  },
  (ctx, w) => { /* EduNest — attendance */
    paintChrome(ctx, w, 'EduNest');
    ctx.fillStyle = P.cssMuted;
    ctx.font = '400 26px Inter, system-ui, sans-serif';
    ctx.fillText('Attendance · this term', 40, 216);
    const cols = 7, rows = 6, cell = 62, gap = 12;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = (r * cols + c) % 5 !== 3;
        roundRect(ctx, 40 + c * (cell + gap), 260 + r * (cell + gap), cell, cell, 10);
        ctx.fillStyle = on ? P.accentRGBA(0.55) : P.textRGBA(0.07);
        ctx.fill();
      }
    }
    let y = 260 + rows * (cell + gap) + 40;
    ['Grades posted', 'Parent message', 'Bus arriving'].forEach((t, i) => {
      roundRect(ctx, 40, y + i * 130, w - 80, 106, 18);
      ctx.fillStyle = P.cssSurface; ctx.fill();
      ctx.strokeStyle = P.textRGBA(0.1); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = P.cssText;
      ctx.font = '500 34px Inter, system-ui, sans-serif';
      ctx.fillText(t, 76, y + i * 130 + 42);
      ctx.fillStyle = P.cssMuted;
      ctx.font = '400 24px Inter, system-ui, sans-serif';
      ctx.fillText('Real-time notification', 76, y + i * 130 + 80);
    });
  },
];

class PhoneStage extends Scene3D {
  build() {
    this.camera.position.set(0, 0, 7.4);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d1 = new THREE.DirectionalLight(P.accentLight, 1.5); d1.position.set(3, 4, 6);
    const d2 = new THREE.DirectionalLight(P.accent, 0.9); d2.position.set(-4, -2, 3);
    this.scene.add(d1, d2);

    this.phone = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(2.3, 4.7, 0.3), {
        depth: 0.2, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 3, curveSegments: 14,
      }),
      new THREE.MeshStandardMaterial({ color: 0x2b2d3d, roughness: 0.42, metalness: 0.65 }),
    );
    this.phone.add(body);

    this.screens = SCREENS.map((fn) => this.track(canvasTexture(560, 1180, (ctx, w) => fn(ctx, w))));
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.screens[0], transparent: true });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.06, 4.34), this.screenMat);
    screen.position.z = 0.255;
    this.phone.add(screen);
    this.screen = screen;

    const edge = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(2.34, 4.74, 0.32), { depth: 0.02, bevelEnabled: false, curveSegments: 14 }),
      new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.28 }),
    );
    edge.position.z = -0.02;
    this.phone.add(edge);

    this.scene.add(this.phone);
    this.field = pointField(700, [24, 16, 16], 0.032, 0.4);
    this.scene.add(this.field);

    this.idx = 0;
    this.timer = 0;
  }

  update(dt, t) {
    this.timer += dt;
    if (this.timer > 4.6) {
      this.timer = 0;
      this.idx = (this.idx + 1) % this.screens.length;
      this.screenMat.map = this.screens[this.idx];
      this.screenMat.needsUpdate = true;
    }
    const fade = Math.min(1, this.timer / 0.45) * Math.min(1, (4.6 - this.timer) / 0.35);
    this.screenMat.opacity = 0.25 + 0.75 * Math.max(0, fade);

    const p = this.progress();
    this.phone.rotation.y = Math.sin(t * 0.22) * 0.5 + this.pointer.x * 0.55;
    this.phone.rotation.x = -this.pointer.y * 0.3 + Math.sin(t * 0.3) * 0.05;
    this.phone.position.y = Math.sin(t * 0.5) * 0.12 + (0.5 - p) * 0.9;
    this.field.rotation.y += dt * 0.02;
  }
}

customElements.define('hero-field', HeroField);
customElements.define('skill-constellation', SkillConstellation);
customElements.define('arch-stack', ArchStack);
customElements.define('phone-stage', PhoneStage);

/* ---------- rebuild on theme change ----------
   Replacing each element runs disconnectedCallback (disposing GPU resources)
   then connectedCallback, which re-runs build() against the fresh palette. */

window.addEventListener('themechange', () => {
  readPalette();
  document.querySelectorAll('hero-field, skill-constellation, arch-stack, phone-stage')
    .forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      const fresh = document.createElement(el.tagName.toLowerCase());
      fresh.className = el.className;
      fresh.setAttribute('data-scene', '');
      fresh.setAttribute('aria-hidden', 'true');
      parent.replaceChild(fresh, el);
    });
});
