// ASLP Anatomy Studio — shared 3D lab engine.
// One engine for every 3D teaching module: renderer, bloom, real-anatomy loading, per-chapter
// visibility, labels, guided chapters with camera flights, tour, dock controls and panels.
// Anatomy: Z-Anatomy / BodyParts3D (CC BY-SA 4.0), baked to world mm (x = right→left, y = up, z = anterior).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export { THREE };
export const $ = (id) => document.getElementById(id);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const MOBILE = matchMedia('(max-width: 900px)').matches;
export const COARSE = matchMedia('(pointer: coarse)').matches;
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const CSS = { air: '#5fe3f2', mech: '#f3b64a', fluid: '#7d95ff', neural: '#ff5c8a', elec: '#b8f36a', bad: '#ff8a5c', ok: '#58d38c', ink: '#e9eff6', muted: '#8fa2b7', dim: '#5d6f83', violet: '#a987ee' };
export const COL = Object.fromEntries(Object.entries(CSS).map(([k, v]) => [k, new THREE.Color(v).getHex()]));

// ---------------------------------------------------------------- materials
export function shellMat(hex, power = 2.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: 0 }, uPower: { value: power } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalMatrix*normal; vV = -mv.xyz; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; uniform float uPower; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = vN; float ln = length(n); n = ln > 1e-6 ? n / ln : vec3(0.0, 0.0, 1.0); vec3 v = vV; float lv = length(v); v = lv > 1e-6 ? v / lv : vec3(0.0, 0.0, 1.0); float f = pow(max(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 1e-4), uPower); gl_FragColor = vec4(uColor*(0.25+1.25*f), uOpacity*(0.12+0.88*f)); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
export const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0, transparent: true, ...o });
export const solid = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.05, ...o });
let _glow = null;
export function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (_glow = new THREE.CanvasTexture(c));
}
export function sprite(hex, size = 6, opacity = 0) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); s.renderOrder = 7; return s;
}
export const setOp = (m, v) => { if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = v; else m.opacity = v; };
export const getOp = (m) => (m.uniforms && m.uniforms.uOpacity ? m.uniforms.uOpacity.value : m.opacity);
export const tube = (pts, r, m, seg = 40, rs = 12) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), m);

// ---------------------------------------------------------------- lab
export function createLab(cfg) {
  const S = Object.assign({ ch: 0, playing: !REDUCED, labels: true, glow: !MOBILE && !COARSE, speed: 1, tour: false }, cfg.state || {});
  const stage = $('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  stage.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer(); labelRenderer.domElement.className = 'labels-layer'; stage.appendChild(labelRenderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 5000); camera.position.set(-260, 70, 200);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 4; controls.maxDistance = 1200;
  const lights = new THREE.Group(); scene.add(lights);
  lights.add(new THREE.HemisphereLight(0xcfe2ff, 0x1a1512, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-220, 260, 180); lights.add(key);
  const rim = new THREE.DirectionalLight(0x74d9ff, 0.9); rim.position.set(200, 120, -240); lights.add(rim);
  const fill = new THREE.DirectionalLight(0xffe2c8, 0.5); fill.position.set(150, -80, 220); lights.add(fill);
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(nanGuard());
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.45, 0.84); composer.addPass(bloom); composer.addPass(new OutputPass());
  const ctx = { THREE, S, scene, camera, controls, renderer, lights, meshes: {}, byName: {}, W: {}, $, V, clamp, lerp, smooth, CSS, COL, std, solid, shellMat, sprite, glowTex, tube, setOp, getOp, MOBILE, cfg, bg: null };
  const offset = cfg.viewOffset !== false;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    { const pr = Math.min(devicePixelRatio || 1, MOBILE || COARSE ? 1.5 : 2, Math.sqrt(3.2e6 / (w * h))); if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); composer.setPixelRatio(pr); } } renderer.setSize(w, h, false); labelRenderer.setSize(w, h); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    if (offset && !MOBILE && w > 900) camera.setViewOffset(w, h, w > 1280 ? 95 : 80, 45, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    cfg.onResize && cfg.onResize(ctx, w, h);
  }
  new ResizeObserver(resize).observe(stage);
  ctx.resize = resize;

  // ---- materials per group
  const GROUP = cfg.groups;
  ctx.makeFor = (grp) => (GROUP[grp] ? GROUP[grp].make() : shellMat(0x7fa6c4, 2));
  ctx.centre = (n) => (ctx.byName[n] ? new THREE.Box3().setFromObject(ctx.byName[n]).getCenter(new THREE.Vector3()) : V(0, 0, 0));
  ctx.box = (n) => (ctx.byName[n] ? new THREE.Box3().setFromObject(ctx.byName[n]) : new THREE.Box3());
  ctx.opFor = (grp) => (cfg.opacityFor ? cfg.opacityFor(ctx, grp) : null) ?? (GROUP[grp] ? GROUP[grp].op[S.ch] ?? GROUP[grp].op[GROUP[grp].op.length - 1] : 0);

  // ---- labels
  const LABELS = [];
  ctx.label = (text, posFn, chs, opts = {}) => {
    const el = document.createElement('div'); el.className = 'tag' + (opts.cls ? ' ' + opts.cls : ''); el.innerHTML = '<div class="in"><span></span></div>';
    if (opts.color) el.style.setProperty('--c', opts.color);
    const o = new CSS2DObject(el); scene.add(o);
    const L = { o, el, box: el.querySelector('span'), span: el.querySelector('span'), text, posFn: typeof posFn === 'function' ? posFn : () => posFn, chs, when: opts.when };
    LABELS.push(L); return L;
  };
  // Labels are decluttered: a label is hidden when it overlaps a higher-priority label (earlier = higher),
  // sits under a panel, leaves the stage, or exceeds the per-screen limit. Checked a few times a second,
  // with hysteresis so labels do not blink.
  const MAXL = MOBILE ? 6 : 11;
  let lastCull = 0;
  function cull() {
    const now = performance.now(); if (now - lastCull < 180) return; lastCull = now;
    const sr = stage.getBoundingClientRect();
    const obs = MOBILE ? [] : ['.brand', '.chapters', '.dock', '#card', '.side .panel'].flatMap((q) => [...document.querySelectorAll(q)]).map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
    const hit = (a, b, pad = 3) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
    const kept = [];
    for (const L of LABELS) {
      if (!L.want) { L.cull = false; L.miss = 0; continue; }
      const r = L.box.getBoundingClientRect();
      let bad = !r.width || kept.length >= MAXL || r.left < sr.left + 2 || r.right > sr.right - 2 || r.top < sr.top + 2 || r.bottom > sr.bottom - 2;
      if (!bad) bad = obs.some((o) => hit(r, o, 0)) || kept.some((k) => hit(r, k));
      // hysteresis: two agreeing checks before a label changes state
      if (bad !== L.cull) { L.miss = (L.miss || 0) + 1; if (L.miss >= 2) { L.cull = bad; L.miss = 0; } } else L.miss = 0;
      if (!L.cull) kept.push(r);
    }
  }
  function updateLabels() {
    for (const L of LABELS) {
      L.want = S.labels && (L.chs === 'all' || L.chs.includes(S.ch)) && (!L.when || L.when(ctx));
      const on = L.want && !L.cull;
      const op = on ? '1' : '0'; if (L.el.style.opacity !== op) L.el.style.opacity = op; if (!L.want) continue;
      const t = typeof L.text === 'function' ? L.text(ctx) : L.text; if (L.span.textContent !== t) L.span.textContent = t;
      L.o.position.copy(L.posFn(ctx));
    }
  }

  // ---- load models
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  let loaded = 0; const total = cfg.models.length; const prog = new Array(total).fill(0);
  cfg.models.forEach((m, idx) => loader.load(m.url, (g) => {
    scene.add(g.scene); g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      fixNormals(o.geometry);
      const ud = Object.keys(o.userData).length ? o.userData : o.parent.userData;
      const name = ud.name || o.name;
      if (m.skip && m.skip.test(name)) { o.visible = false; o.userData.skip = true; return; }
      let grp = (m.regroup && m.regroup(name, ud.group)) || ud.group || 'skin';
      o.material = ctx.makeFor(grp); setOp(o.material, 0);
      o.userData.grp = grp; o.userData.name = name; o.userData.en = ud.en || name;
      o.renderOrder = o.material.uniforms ? 2 : (o.material.depthWrite === false ? 1 : 0);
      (ctx.meshes[grp] = ctx.meshes[grp] || []).push(o);
      if (!ctx.byName[name]) ctx.byName[name] = o;
    });
    if (++loaded === total) {
      cfg.build(ctx); ctx.built = true;
      $('loader').classList.add('done');
      setChapter(S.ch, true);
      setTimeout(() => { const h = $('hint'); if (h) h.style.opacity = 0; }, 6000);
      ctx.ready = true;
    }
  }, (e) => { if (e.total) { prog[idx] = e.loaded / e.total; $('loadMsg').textContent = `Loading anatomy… ${Math.round((prog.reduce((a, b) => a + b, 0) / total) * 100)} %`; } },
  () => { $('loadMsg').textContent = 'The 3D model could not be loaded. Check the connection and reload the page.'; }));

  // ---- chapters
  const CH = cfg.chapters;
  let camTween = null, tourClock = 0;
  function setChapter(i, instant = false) {
    S.ch = (i + CH.length) % CH.length;
    const c = CH[S.ch];
    document.documentElement.style.setProperty('--sig', c.sig || CSS.air);
    if (cfg.onChapter && ctx.built) cfg.onChapter(ctx, c);
    renderAll();
    const [pos, tgt] = typeof c.cam === 'function' ? c.cam(ctx) : c.cam;
    const p = MOBILE ? tgt.clone().add(pos.clone().sub(tgt).multiplyScalar(c.mobileZoom || 1.3)) : pos;
    if (instant) { camera.position.copy(p); controls.target.copy(tgt); camTween = null; }
    else camTween = { t: 0, dur: c.flight || 1.8, p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: tgt.clone() };
    tourClock = 0;
  }
  ctx.setChapter = setChapter;
  ctx.flyTo = (pos, tgt, dur = 1.6) => { camTween = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone() }; };
  function renderChapters() {
    $('chapters').innerHTML = CH.map((c, i) => `<button type="button" data-i="${i}" ${i === S.ch ? 'aria-current="step"' : ''}><span class="n">${String(i).padStart(2, '0')}</span><span class="dot"></span>${c.nav || c.k}${c.badge ? c.badge(ctx) : ''}</button>`).join('');
    const cur = $('chapters').querySelector('[aria-current]'); if (cur && MOBILE) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function renderCard() {
    const c = CH[S.ch];
    const facts = c.facts ? c.facts(ctx) : [];
    const sub = c.sub ? c.sub(ctx) : '';
    const lens = c.lens ? c.lens(ctx) : '';
    $('card').innerHTML = `<div class="kicker">${c.k}</div><h2>${typeof c.t === 'function' ? c.t(ctx) : c.t}</h2>${sub}${c.body(ctx)}${facts.length ? `<div class="facts">${facts.map(([b, s]) => `<div class="fact"><b>${b}</b><span>${s}</span></div>`).join('')}</div>` : ''}${lens}`;
  }
  function renderAll() { renderChapters(); renderCard(); cfg.renderPanels && cfg.renderPanels(ctx); }
  ctx.renderAll = renderAll; ctx.renderCard = renderCard; ctx.renderChapters = renderChapters;
  $('chapters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stopTour(); setChapter(+b.dataset.i); } });
  $('card').addEventListener('click', (e) => { const b = e.target.closest('button[data-act]'); if (b && cfg.onAction) { cfg.onAction(ctx, b.dataset.act, b.dataset.v, b); } });
  document.addEventListener('click', (e) => { const b = e.target.closest('.side button[data-act], .dock button[data-act]'); if (b && cfg.onAction && !b.closest('#card')) cfg.onAction(ctx, b.dataset.act, b.dataset.v, b); });

  // ---- dock
  const syncPlay = () => { $('play').textContent = S.playing ? 'Pause' : 'Play'; };
  $('play').addEventListener('click', () => { S.playing = !S.playing; syncPlay(); }); syncPlay();
  $('prev').addEventListener('click', () => { stopTour(); setChapter(S.ch - 1); });
  $('next').addEventListener('click', () => { stopTour(); setChapter(S.ch + 1); });
  $('tour').addEventListener('click', () => { if (S.tour) stopTour(); else { S.tour = true; S.playing = true; syncPlay(); $('tour').setAttribute('aria-pressed', 'true'); $('tour').textContent = 'Stop tour'; setChapter(S.ch === CH.length - 1 ? 0 : S.ch); } });
  function stopTour() { S.tour = false; $('tour').setAttribute('aria-pressed', 'false'); $('tour').textContent = 'Guided tour'; }
  ctx.stopTour = stopTour;
  $('labels') && $('labels').addEventListener('change', (e) => { S.labels = e.target.checked; });
  if ($('glow')) { $('glow').checked = S.glow; $('glow').addEventListener('change', (e) => { S.glow = e.target.checked; }); }
  $('speed') && $('speed').addEventListener('input', (e) => { S.speed = +e.target.value; });
  addEventListener('keydown', (e) => {
    if (e.target.closest('input,select,textarea')) return;
    if (e.key === 'ArrowRight') { stopTour(); setChapter(S.ch + 1); } else if (e.key === 'ArrowLeft') { stopTour(); setChapter(S.ch - 1); }
    else if (e.key === ' ') { e.preventDefault(); S.playing = !S.playing; syncPlay(); } else if (e.key.toLowerCase() === 'l') { S.labels = !S.labels; if ($('labels')) $('labels').checked = S.labels; }
    cfg.onKey && cfg.onKey(ctx, e);
  });
  controls.addEventListener('start', () => { camTween = null; const h = $('hint'); if (h) h.style.opacity = 0; });
  if (MOBILE && $('hint')) $('hint').textContent = 'Drag to orbit · pinch to zoom';

  // ---- loop
  const clock = new THREE.Clock(); let t = 0;
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function frame() {
    const rdt = Math.min(0.05, clock.getDelta()), dt = S.playing ? rdt * S.speed : 0; t += dt; ctx.t = t;
    if (ctx.ready) {
      if (camTween) { camTween.t += rdt / camTween.dur; const e = easeIO(Math.min(1, camTween.t)); camera.position.lerpVectors(camTween.p0, camTween.p1, e); controls.target.lerpVectors(camTween.t0, camTween.t1, e); if (camTween.t >= 1) camTween = null; }
      controls.update();
      for (const g in ctx.meshes) {
        const target = ctx.opFor(g);
        for (const m of ctx.meshes[g]) {
          if (m.userData.lock) continue;
          const o = getOp(m.material), n = o + (target - o) * Math.min(1, rdt * 3.5); setOp(m.material, n);
          m.visible = n > 0.01 && !m.userData.hide;
          if (!m.material.uniforms) m.material.depthWrite = n > 0.95 && !m.userData.noDepth;
        }
      }
      cfg.update && cfg.update(ctx, t, dt, rdt);
      if (S.tour && S.playing) { tourClock += rdt; const c = CH[S.ch]; if (tourClock > (c.tour || 14)) { if (S.ch === CH.length - 1) stopTour(); else setChapter(S.ch + 1); } }
      updateLabels();
    }
    if (S.glow && !ctx.noBloom) composer.render(); else renderer.render(scene, camera);
    labelRenderer.render(scene, camera); cull();
    requestAnimationFrame(frame);
  }
  renderAll(); resize(); requestAnimationFrame(frame);
  window.__lab = ctx;
  return ctx;
}

// ---------------------------------------------------------------- neural spike network (shared)
export function createNetwork(ctx, nodes, edges, opts = {}) {
  const { THREE, scene } = ctx;
  const N = {}, E = {};
  for (const [id, pos, extra] of nodes) N[id] = { id, pos, ...(extra || {}) };
  for (const [a, b, w, via] of edges) {
    const c = new THREE.CatmullRomCurve3([N[a].pos, ...(via || []), N[b].pos]);
    (E[a] = E[a] || []).push({ to: b, w, curve: c, dur: Math.max(0.25, c.getLength() / (opts.speed || 30)) });
  }
  const lines = new THREE.Group(); scene.add(lines);
  const lm = new THREE.LineBasicMaterial({ color: opts.color || COL.neural, transparent: true, opacity: 0.22, depthWrite: false });
  for (const a in E) for (const e of E[a]) lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(e.curve.getPoints(30)), lm));
  const glows = {};
  for (const id in N) { const s = sprite(opts.color || COL.neural, 6); s.position.copy(N[id].pos); scene.add(s); glows[id] = { s, v: 0 }; }
  const pool = [], live = [];
  function pick(id) { const es = E[id]; if (!es) return null; let r = Math.random() * es.reduce((a, e) => a + e.w, 0); for (const e of es) { r -= e.w; if (r <= 0) return e; } return es[es.length - 1]; }
  const net = {
    N, E, lines, glows, live, lineMat: lm, block: null,
    spawn(at, color, delay = 0, size = 2.0) {
      let s = pool.pop(); if (!s) { s = sprite(color || COL.neural, size, 1); scene.add(s); }
      s.material.color.set(color || opts.color || COL.neural); s.material.opacity = 0.8; s.scale.setScalar(size); s.visible = false;
      live.push({ s, at, e: pick(at), u: -delay });
    },
    step(dt, rdt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const k = live[i]; if (!k.e) { net.kill(i); continue; }
        k.u += dt / k.e.dur; if (k.u < 0) continue; k.s.visible = true;
        if (net.block && net.block(k)) { net.kill(i); continue; }
        if (k.u >= 1) { glows[k.e.to].v = Math.min(1, glows[k.e.to].v + 0.18); k.at = k.e.to; k.u = 0; k.e = pick(k.at); if (!k.e) { net.kill(i); continue; } }
        k.s.position.copy(k.e.curve.getPointAt(clamp(k.u, 0, 1)));
      }
      for (const id in glows) { const g = glows[id]; g.v *= Math.exp(-rdt * 0.9); g.sm = (g.sm || 0) + (g.v - (g.sm || 0)) * Math.min(1, rdt * 3); g.s.material.opacity = Math.min(0.28, g.sm * 0.3); g.s.scale.setScalar((opts.glowSize || 7) * 0.85); }
    },
    kill(i) { const k = live[i]; k.s.visible = false; pool.push(k.s); live.splice(i, 1); },
    clear() { while (live.length) net.kill(live.length - 1); },
    _vis: true,
    get visible() { return net._vis; },
    set visible(v) { net._vis = v; lines.visible = v; for (const id in glows) glows[id].s.visible = v; },
  };
  return net;
}

// ---------------------------------------------------------------- 2D panel helpers
export function canvasCtx(cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  return { g, w: r.width, h: r.height };
}
export function pill(st, text) { return `<span class="pill ${st}">${text}</span>`; }

// Replaces NaN / Inf pixels with black before bloom: on some phone GPUs a single invalid pixel is
// spread by the bloom blur into flickering black boxes.
function nanGuard() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bool bad = !(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b) || !(c.a == c.a) || c.r > 6e4 || c.g > 6e4 || c.b > 6e4; gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, 0.0, 64.0); }',
  });
}
// Replace zero-length or invalid vertex normals (from simplification / quantisation) so shading never
// produces NaN.
function fixNormals(geo) {
  const n = geo && geo.attributes && geo.attributes.normal; if (!n) return;
  let bad = 0;
  for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = Math.hypot(x, y, z); if (!(l > 1e-3)) bad++; }
  if (!bad) return;
  geo.deleteAttribute('normal'); geo.computeVertexNormals();
  const m = geo.attributes.normal; for (let i = 0; i < m.count; i++) { if (!(Math.hypot(m.getX(i), m.getY(i), m.getZ(i)) > 1e-3)) m.setXYZ(i, 0, 1, 0); }
}
