// Pinna to Cortex — 3D journey of a sound through the auditory system.
// Anatomy: Z-Anatomy / BodyParts3D meshes (CC BY-SA), co-registered in mm (x = right→left, y = up, z = anterior).
// Physiology: ./physio.js (shared with the Travelling Wave Lab).
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
import * as P from './physio.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = P.clamp;
const MOBILE = matchMedia('(max-width: 900px)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = { air: 0x5fe3f2, mech: 0xf3b64a, fluid: 0x7d95ff, neural: 0xff5c8a, ok: 0x58d38c, bad: 0xff8a5c };
const CSS = { air: '#5fe3f2', mech: '#f3b64a', fluid: '#7d95ff', neural: '#ff5c8a', bad: '#ff8a5c', ink: '#e9eff6', muted: '#8fa2b7', dim: '#5d6f83' };

const S = {
  ch: 0, stim: '1000', level: 70, cond: 'normal',
  playing: !REDUCED, labels: true, glow: !MOBILE && !COARSE, speed: 1, tour: false,
};

// ---------------------------------------------------------------- renderer
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels-layer';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 4000);
camera.position.set(-260, 70, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 900;
controls.target.set(-20, 12, -5);

scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x1a1512, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-220, 260, 180); scene.add(key);
const rim = new THREE.DirectionalLight(0x74d9ff, 0.9); rim.position.set(200, 120, -240); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffc9a8, 0.35); fill.position.set(-100, -150, 60); scene.add(fill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(nanGuard());
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  { const pr = Math.min(devicePixelRatio || 1, MOBILE || COARSE ? 1.5 : 2, Math.sqrt(3.2e6 / (w * h))); if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); composer.setPixelRatio(pr); } } renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h;
  // keep the subject centred in the free area between the side panels (desktop)
  if (!MOBILE && w > 900) camera.setViewOffset(w, h, w > 1280 ? 95 : 80, 45, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

// ---------------------------------------------------------------- materials
function shellMat(hex, power = 2.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: 0 }, uPower: { value: power } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalMatrix*normal; vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uPower; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = vN; float ln = length(n); n = ln > 1e-6 ? n / ln : vec3(0.0, 0.0, 1.0); vec3 v = vV; float lv = length(v); v = lv > 1e-6 ? v / lv : vec3(0.0, 0.0, 1.0); float f = pow(max(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 1e-4), uPower);
        gl_FragColor = vec4(uColor*(0.25+1.25*f), uOpacity*(0.12+0.88*f)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.0, transparent: true, ...o });

// per-group look; opacity per chapter [ch0..ch9]
const GROUP = {
  skin:           { make: () => shellMat(0x7fa6c4, 2.0), op: [0.3, 0.8, 0.7, 0.14, 0.08, 0.06, 0.06, 0.04, 0.1, 0.14] },
  auricle:        { make: () => std(0xd49a86, { roughness: 0.62 }), op: [1, 1, 1, 0.14, 0.08, 0.05, 0.05, 0.04, 0.1, 0.16] },
  bone:           { make: () => shellMat(0xd9c9a2, 2.6), op: [0.08, 0.06, 0.08, 0.18, 0.14, 0.1, 0.14, 0.08, 0.06, 0.04] },
  ossicle:        { make: () => std(0xf1e4c2, { roughness: 0.38 }), op: [1, 1, 1, 1, 1, 1, 1, 0.45, 0.5, 0.5] },
  tm:             { make: () => std(0xcfe6f6, { roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }), op: [0.85, 0.85, 0.85, 0.85, 0.72, 0.4, 0.3, 0.25, 0.3, 0.4] },
  labyrinth:      { make: () => std(0xe3eef7, { roughness: 0.28, depthWrite: false, side: THREE.DoubleSide }), op: [0.7, 0.6, 0.6, 0.6, 0.55, 0.55, 0.42, 0.3, 0.45, 0.5] },
  nerve:          { make: () => std(0xe2b84d, { emissive: 0x3a2800, roughness: 0.45 }), op: [0.9, 0.5, 0.5, 0.6, 0.6, 0.6, 0.85, 0.7, 0.95, 0.8] },
  tube:           { make: () => std(0x7fc4aa, { depthWrite: false }), op: [0.4, 0.2, 0.2, 0.4, 0.45, 0.6, 0.35, 0.15, 0.2, 0.2] },
  brainstem:      { make: () => shellMat(0xd79dab, 1.7), op: [0.45, 0.1, 0.1, 0.12, 0.1, 0.1, 0.08, 0.05, 0.75, 0.4] },
  nucleus:        { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.15, roughness: 0.4 }), op: [0.9, 0.2, 0.2, 0.2, 0.2, 0.2, 0.15, 0.1, 1, 0.9] },
  auditoryCortex: { make: () => std(0x3fd2e6, { emissive: 0x19b6d0, emissiveIntensity: 0.15, roughness: 0.45 }), op: [0.9, 0.2, 0.2, 0.15, 0.1, 0.1, 0.15, 0.15, 0.5, 1] },
  cortex:         { make: () => shellMat(0x9b90d6, 1.8), op: [0.2, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.1, 0.16] },
};
const meshes = {}; // group -> [mesh]
const byName = {};
function setOp(m, v) { if (m.uniforms) m.uniforms.uOpacity.value = v; else m.opacity = v; }
function getOp(m) { return m.uniforms ? m.uniforms.uOpacity.value : m.opacity; }

// ---------------------------------------------------------------- dynamic objects (built after load)
const W = {}; // world anchors
let tmMat = null, tmN = new THREE.Vector3(), chainPivot = null, stapesGroup = null;
let canal = null, particles = null, wavefronts = [], cochleaInset = null, ocInset = null;
const lesions = {};
const spikes = [];
const glowNodes = {};

// ---------------------------------------------------------------- load
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('./ear.glb', (g) => {
  scene.add(g.scene);
  g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const ud = Object.keys(o.userData).length ? o.userData : o.parent.userData;
    const grp = ud.group || 'skin';
    const spec = GROUP[grp] || GROUP.skin;
    o.material = spec.make();
    setOp(o.material, 0);
    o.userData.grp = grp;
    o.userData.label = ud.en || ud.name || o.name;
    o.renderOrder = o.material.uniforms ? 2 : (o.material.depthWrite === false ? 1 : 0);
    (meshes[grp] = meshes[grp] || []).push(o);
    byName[ud.name || o.name] = o;
  });
  build();
  $('loader').classList.add('done');
  setChapter(0, true);
  setTimeout(() => { $('hint').style.opacity = 0; }, 6000);
}, (e) => {
  if (e.total) $('loadMsg').textContent = `Loading anatomy… ${Math.round((e.loaded / e.total) * 100)} %`;
}, () => { $('loadMsg').textContent = 'The 3D model could not be loaded. Check the connection and reload the page.'; });

const centre = (name) => { const m = byName[name]; if (!m) return V(0, 0, 0); return new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()); };

function build() {
  // ---- anchors from the real meshes
  W.tm = centre('Tympanic membrane.r');
  W.malleus = centre('Malleus.r'); W.incus = centre('Incus.r'); W.stapes = centre('Stapes.r');
  W.cochlea = centre('Cochlea.r'); W.vest = centre('Vestibule.r');
  W.concha = centre('Cavity of concha.r'); W.helix = centre('Helix.r'); W.tragus = centre('Tragus.r');
  W.lobule = centre('Lobule of auricle.r'); W.antihelix = centre('Antihelix.r');
  W.acn = centre('Anterior cochlear nucleus.r'); W.pcn = centre('Posterior cochlear nucleus.r');
  W.cn = W.acn.clone().lerp(W.pcn, 0.5);
  W.icR = centre('Inferior colliculus.r'); W.icL = centre('Inferior colliculus.l');
  W.mgbR = centre('Medial geniculate body.r'); W.mgbL = centre('Medial geniculate body.l');
  W.hgR = centre('Transverse temporal gyri.r'); W.hgL = centre('Transverse temporal gyri.l');
  W.tube = centre('Auditory tube.r'); W.pons = centre('Pons.r');
  W.source = V(-215, 6, 18);

  buildMiddleEar();
  buildCanal();
  buildWavefronts();
  buildPathway();
  buildLesions();
  cochleaInset = buildCochleaInset();
  ocInset = buildOCInset();
  buildLabels();
  buildSourceGlyph();
  refreshModel();
}

// ---------------------------------------------------------------- middle ear motion
function buildMiddleEar() {
  // Eardrum: centre moves along its normal, rim stays fixed (per-vertex weight in the shader).
  const tm = byName['Tympanic membrane.r'];
  const geo = tm.geometry, pos = geo.attributes.position, n = pos.count;
  const wpos = new THREE.Vector3(), c = W.tm;
  let rmax = 0; const d = new Float32Array(n);
  for (let i = 0; i < n; i++) { wpos.fromBufferAttribute(pos, i).applyMatrix4(tm.matrixWorld); d[i] = wpos.distanceTo(c); rmax = Math.max(rmax, d[i]); }
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) { const r = d[i] / rmax; w[i] = Math.max(0, 1 - r * r); }
  geo.setAttribute('aW', new THREE.BufferAttribute(w, 1));
  // TM normal (points medially) from a plane fit of the mesh
  tmN.copy(normalFit(tm)).normalize(); if (tmN.x < 0) tmN.negate();
  const inv = new THREE.Matrix4().copy(tm.matrixWorld).invert();
  const localN = tmN.clone().transformDirection(inv).multiplyScalar(1 / tm.matrixWorld.getMaxScaleOnAxis());
  tmMat = tm.material;
  tmMat.emissive = new THREE.Color(COL.air); tmMat.emissiveIntensity = 0;
  tmMat.onBeforeCompile = (sh) => {
    sh.uniforms.uDisp = { value: 0 }; sh.uniforms.uN = { value: localN };
    tmMat.userData.sh = sh;
    sh.vertexShader = 'attribute float aW; uniform float uDisp; uniform vec3 uN;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += uN * uDisp * aW;');
  };
  // Malleus + incus rotate together about the anterior–posterior ligament axis (≈ z).
  chainPivot = new THREE.Group();
  const axis = W.malleus.clone().lerp(W.incus, 0.5); axis.y = Math.max(W.malleus.y, W.incus.y) + 1.2;
  chainPivot.position.copy(axis); scene.add(chainPivot); chainPivot.updateMatrixWorld();
  chainPivot.attach(byName['Malleus.r']); chainPivot.attach(byName['Incus.r']);
  stapesGroup = new THREE.Group(); scene.add(stapesGroup); stapesGroup.attach(byName['Stapes.r']);
  W.chainAxis = axis;
  W.ow = W.stapes.clone().add(V(1.6, -0.3, 0.2)); // footplate in the oval window (medial end)
  W.rw = W.ow.clone().add(V(0.2, -3.2, 1.2));
  for (const n of ['Malleus.r', 'Incus.r', 'Stapes.r']) { const m = byName[n].material; m.emissive = new THREE.Color(COL.mech); m.emissiveIntensity = 0; }
}
function normalFit(mesh) {
  // average of (vertex - centre) cross products → approximate plane normal
  const pos = mesh.geometry.attributes.position, c = W.tm, a = new THREE.Vector3(), b = new THREE.Vector3(), acc = new THREE.Vector3();
  const pts = []; for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 400))) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).sub(c));
  for (let i = 0; i < pts.length; i++) { a.copy(pts[i]); b.copy(pts[(i + 7) % pts.length]); const x = a.clone().cross(b); if (x.dot(acc) < 0) x.negate(); acc.add(x); }
  return acc.lengthSq() > 0 ? acc : V(1, 0, 0);
}

// ---------------------------------------------------------------- ear canal
function buildCanal() {
  const entry = W.concha.clone().lerp(W.tragus, 0.35).add(V(3, 1.5, 0));
  const end = W.tm.clone().sub(tmN.clone().multiplyScalar(1.2));
  const pts = [entry, entry.clone().lerp(end, 0.33).add(V(0, 1.2, -1.2)), entry.clone().lerp(end, 0.66).add(V(0, 0.4, -0.4)), end];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 3.3, 28, false), shellMat(0x5fe3f2, 1.6));
  tube.renderOrder = 3; scene.add(tube);
  // pressure particles
  const N = MOBILE ? 380 : 700;
  const LUT = 200, lp = [], ln = [], lb = [];
  const frames = curve.computeFrenetFrames(LUT, false);
  for (let i = 0; i <= LUT; i++) { lp.push(curve.getPointAt(i / LUT)); ln.push(frames.normals[Math.min(i, LUT - 1)]); lb.push(frames.binormals[Math.min(i, LUT - 1)]); }
  const u = new Float32Array(N), ra = new Float32Array(N), an = new Float32Array(N);
  for (let i = 0; i < N; i++) { u[i] = Math.random(); ra[i] = Math.sqrt(Math.random()) * 2.8; an[i] = Math.random() * Math.PI * 2; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts3 = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex(), size: 0.9, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  pts3.renderOrder = 4; scene.add(pts3);
  canal = { curve, tube, lp, ln, lb, LUT, entry, end };
  particles = { pts: pts3, u, ra, an, N };
  W.canalMid = curve.getPointAt(0.5); W.canalEntry = entry;
}
function lutAt(a, s) { const L = canal.LUT, x = clamp(s, 0, 1) * L, i = Math.min(L - 1, Math.floor(x)), f = x - i; return a[i].clone().lerp(a[i + 1] || a[i], f); }

// ---------------------------------------------------------------- sound in air
function buildSourceGlyph() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(7, 10, 10, 32, 1, true), std(0x9fb2c6, { opacity: 0.9, side: THREE.DoubleSide, metalness: 0.3 }));
  body.rotation.z = Math.PI / 2; g.add(body);
  const cone = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ color: COL.air, transparent: true, opacity: 0.7 }));
  cone.rotation.y = Math.PI / 2; cone.position.x = 5; g.add(cone);
  g.position.copy(W.source); g.lookAt(W.concha); g.rotateY(-Math.PI / 2); g.scale.setScalar(0.7);
  scene.add(g); W.sourceGlyph = g; W.sourceCone = cone;
}
function buildWavefronts() {
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), shellMat(COL.air, 3.2));
    m.material.blending = THREE.AdditiveBlending; m.visible = false; m.renderOrder = 5;
    m.userData = { born: -99 }; scene.add(m); wavefronts.push(m);
  }
}

// ---------------------------------------------------------------- neural pathway
const NODES = {}; const EDGES = {};
function node(id, pos, wave, side = 'i') { NODES[id] = { id, pos, wave, side }; }
function edge(a, b, w, via = []) { (EDGES[a] = EDGES[a] || []).push({ to: b, w, via }); }
function nerveCentreline() {
  // bin the cochlear nerve + VIII vertices along x to get a centreline from cochlea to brainstem
  const ms = ['Cochlear nerve', 'Vestibulocochlear nerve (VIII).r'].map((n) => byName[n]).filter(Boolean);
  const bins = 9, lo = W.cochlea.x + 2, hi = W.cn.x - 1, acc = Array.from({ length: bins }, () => [new THREE.Vector3(), 0]);
  const v = new THREE.Vector3();
  for (const m of ms) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const k = Math.floor(((v.x - lo) / (hi - lo)) * bins); if (k >= 0 && k < bins) { acc[k][0].add(v); acc[k][1]++; } } }
  return acc.filter((a) => a[1] > 0).map((a) => a[0].divideScalar(a[1]));
}
function buildPathway() {
  const cl = nerveCentreline();
  const socI = V(-4.2, W.cn.y - 3.6, W.cn.z + 2.5), socC = socI.clone().setX(4.2);
  const llI = V(W.icR.x - 3.2, (W.cn.y + W.icR.y) * 0.5, W.icR.z - 1), llC = llI.clone().setX(-llI.x);
  node('C0', W.cochlea.clone(), 'I-');
  node('N1', cl[Math.floor(cl.length * 0.3)] || W.cochlea.clone().lerp(W.cn, 0.35), 'I');
  node('N2', cl[cl.length - 1] || W.cochlea.clone().lerp(W.cn, 0.8), 'II');
  node('CN', W.cn, 'III');
  node('SOCi', socI, 'IV'); node('SOCc', socC, 'IV', 'c');
  node('LLi', llI, 'IV+'); node('LLc', llC, 'IV+', 'c');
  node('ICi', W.icR, 'V'); node('ICc', W.icL, 'V', 'c');
  node('MGBi', W.mgbR, 'VI'); node('MGBc', W.mgbL, 'VI', 'c');
  node('HGi', W.hgR, 'VII'); node('HGc', W.hgL, 'VII', 'c');
  const nerveVia = cl.slice(0, Math.floor(cl.length * 0.3));
  edge('C0', 'N1', 1, nerveVia);
  edge('N1', 'N2', 1, cl.slice(Math.floor(cl.length * 0.3) + 1, cl.length - 1));
  edge('N2', 'CN', 1);
  edge('CN', 'SOCi', 0.35); edge('CN', 'SOCc', 0.35, [V(0, socI.y - 0.8, socI.z)]); edge('CN', 'LLc', 0.3, [V(0, W.cn.y - 1.5, W.cn.z - 4)]);
  edge('SOCi', 'LLi', 0.5); edge('SOCi', 'LLc', 0.5, [V(0, socI.y + 1, socI.z)]);
  edge('SOCc', 'LLc', 0.8); edge('SOCc', 'LLi', 0.2, [V(0, socI.y + 1, socI.z)]);
  edge('LLi', 'ICi', 1); edge('LLc', 'ICc', 1);
  edge('ICi', 'MGBi', 0.85); edge('ICi', 'ICc', 0.15, [V(0, W.icR.y + 1, W.icR.z)]);
  edge('ICc', 'MGBc', 1);
  edge('MGBi', 'HGi', 1, [V(W.mgbR.x - 14, W.mgbR.y + 8, W.mgbR.z + 1)]);
  edge('MGBc', 'HGc', 1, [V(W.mgbL.x + 14, W.mgbL.y + 8, W.mgbL.z + 1)]);
  // faint tract lines
  const lineMat = new THREE.LineBasicMaterial({ color: COL.neural, transparent: true, opacity: 0.22, depthWrite: false });
  W.tracts = new THREE.Group(); scene.add(W.tracts);
  for (const a in EDGES) for (const e of EDGES[a]) {
    const pts = [NODES[a].pos, ...e.via, NODES[e.to].pos];
    const c = new THREE.CatmullRomCurve3(pts);
    W.tracts.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(30)), lineMat));
    e.curve = c; e.len = c.getLength();
  }
  // procedural nuclei with no mesh (SOC, LL) + glow sprites for every relay
  const sph = (p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3, opacity: 0.95 })); m.position.copy(p); scene.add(m); return m; };
  W.socMeshes = [sph(socI, 1.3), sph(socC, 1.3)];
  W.llMeshes = [sph(llI, 1.0), sph(llC, 1.0)];
  for (const id in NODES) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COL.neural, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.copy(NODES[id].pos); s.scale.setScalar(6); s.renderOrder = 6; scene.add(s);
    glowNodes[id] = { sprite: s, v: 0 };
  }
  // acoustic reflex arc (SOC → facial nucleus → VII → stapedius)
  const facial = V(socI.x - 1.5, socI.y - 2.5, socI.z - 4);
  const stapedius = W.stapes.clone().add(V(-1.8, -2.4, -4.2));
  W.stapediusPt = stapedius;
  const arc = new THREE.CatmullRomCurve3([socI, facial, V(facial.x - 18, facial.y - 3, facial.z + 2), V(stapedius.x + 6, stapedius.y - 4, stapedius.z - 3), stapedius]);
  W.reflexArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc.getPoints(60)), new THREE.LineDashedMaterial({ color: COL.mech, dashSize: 1.2, gapSize: 0.9, transparent: true, opacity: 0 }));
  W.reflexArc.computeLineDistances(); scene.add(W.reflexArc);
  // stapedius muscle + tendon
  const tendon = new THREE.CatmullRomCurve3([W.stapes.clone().add(V(-1.2, 0.6, -0.8)), stapedius]);
  W.stapedius = new THREE.Mesh(new THREE.TubeGeometry(tendon, 12, 0.35, 8, false), std(0xd2504f, { emissive: 0xff4040, emissiveIntensity: 0 }));
  scene.add(W.stapedius);
}
let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c); return _glow;
}

// ---------------------------------------------------------------- lesions
function buildLesions() {
  // cerumen plug in the canal
  const wax = new THREE.Mesh(new THREE.IcosahedronGeometry(3.1, 3), std(0x8a5a22, { roughness: 0.9, emissive: 0x2a1500 }));
  jitter(wax.geometry, 0.35); wax.position.copy(canal.curve.getPointAt(0.42)); wax.scale.set(1.3, 1, 1); scene.add(wax); lesions.wax = wax;
  // perforation: dark hole in the anteroinferior pars tensa
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshBasicMaterial({ color: 0x020305, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  hole.position.copy(W.tm.clone().add(V(0, -1.5, 1.4)).sub(tmN.clone().multiplyScalar(0.25)));
  hole.lookAt(hole.position.clone().add(tmN)); scene.add(hole); lesions.perforation = hole;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.0, 32), new THREE.MeshBasicMaterial({ color: COL.bad, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.position.copy(hole.position); ring.quaternion.copy(hole.quaternion); scene.add(ring); lesions.perfRing = ring;
  // middle-ear effusion: fluid filling the lower tympanic cavity
  const fl = new THREE.Mesh(new THREE.SphereGeometry(6.2, 40, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), std(0xd8b35a, { opacity: 0.55, emissive: 0x4a3200, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false }));
  fl.position.copy(W.malleus.clone().lerp(W.stapes, 0.5).add(V(0, 0.8, 0))); fl.scale.set(0.9, 1.1, 1.25); scene.add(fl); lesions.ome = fl;
  // otosclerotic focus fixing the stapes footplate
  const foc = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 3), std(0xe2884d, { roughness: 0.95, emissive: 0x3a1400 }));
  jitter(foc.geometry, 0.45); foc.position.copy(W.ow); scene.add(foc); lesions.otosclerosis = foc;
  // vestibular schwannoma in the internal auditory meatus
  const vs = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 4), std(0xe79a6a, { roughness: 0.7, emissive: 0x3a1a08 }));
  jitter(vs.geometry, 0.3); vs.position.copy(NODES.N1.pos.clone().lerp(NODES.N2.pos, 0.35)); scene.add(vs); lesions.vs = vs;
  for (const k in lesions) { lesions[k].visible = false; lesions[k].renderOrder = 3; }
}
function jitter(geo, a) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + a * (Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) * Math.sin(v.z * 3.7)); v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); }

// ---------------------------------------------------------------- magnified cochlea (travelling wave)
const NB = 360, TURNS = 2.6;
function buildCochleaInset() {
  const g = new THREE.Group();
  g.position.copy(W.cochlea.clone().add(V(-12, -26, 42)));
  g.scale.setScalar(1.25);
  const th = (d) => (d / P.LEN) * TURNS * Math.PI * 2;
  const rad = (d) => 8 * (1 - 0.6 * (d / P.LEN));
  const hgt = (d) => 8.5 * Math.pow(d / P.LEN, 0.85);
  const wid = (d) => 0.7 + 1.9 * (d / P.LEN); // BM widens toward the apex
  const at = (d, r, y = 0) => V(Math.cos(th(d)) * r, hgt(d) + y, Math.sin(th(d)) * r);
  // duct shell
  const duct = new THREE.CatmullRomCurve3(Array.from({ length: 120 }, (_, i) => at((i / 119) * P.LEN, rad((i / 119) * P.LEN))));
  const shell = new THREE.Mesh(new THREE.TubeGeometry(duct, 260, 1.9, 20, false), shellMat(COL.fluid, 1.7)); shell.renderOrder = 3; g.add(shell);
  // modiolus
  const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.6, 9, 24, 1, true), shellMat(0xd9c9a2, 2)); mod.position.y = 4.5; g.add(mod);
  // BM ribbon
  const pos = new Float32Array(NB * 2 * 3), col = new Float32Array(NB * 2 * 3), idx = [];
  for (let i = 0; i < NB - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  const bm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 1 }));
  g.add(bm);
  const base = [];
  for (let i = 0; i < NB; i++) { const d = (i / (NB - 1)) * P.LEN; base.push({ d, cf: P.cfAt(d), rgb: P.freqRGB(P.cfAt(d)), inner: at(d, rad(d) - wid(d) / 2), outer: at(d, rad(d) + wid(d) / 2) }); }
  // oval & round windows at the base
  const win = (y, c) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); const p = at(0, rad(0) + 1.9, y); m.position.copy(p); m.lookAt(p.clone().multiplyScalar(2)); g.add(m); return m; };
  const ow = win(1.0, COL.mech), rw = win(-1.0, COL.fluid);
  // leader line from the real cochlea
  const lead = new THREE.Line(new THREE.BufferGeometry().setFromPoints([W.cochlea, g.position.clone().add(V(0, 5, 0))]), new THREE.LineDashedMaterial({ color: COL.fluid, dashSize: 1.5, gapSize: 1, transparent: true, opacity: 0.6 }));
  lead.computeLineDistances(); scene.add(lead);
  scene.add(g);
  const tickAt = (f) => g.localToWorld(at(P.placeOf(f), rad(P.placeOf(f)) + 3.2, 0.4));
  return { g, bm, base, ow, rw, lead, at, rad, tickAt, profile: null };
}

// ---------------------------------------------------------------- magnified organ of Corti
function buildOCInset() {
  const g = new THREE.Group();
  g.position.copy(W.cochlea.clone().add(V(-12, -58, 44)));
  const body = new THREE.Group(); g.add(body); // moves with the BM
  const L = 16;
  const bm = new THREE.Mesh(new THREE.BoxGeometry(L, 0.5, 9), std(0x5aa9ff, { emissive: 0x1a3a7a, opacity: 0.95 })); bm.position.y = 0; body.add(bm);
  const cells = { ihc: [], ohc: [], cilia: [], ohcCilia: [] };
  const N = 5;
  for (let i = 0; i < N; i++) {
    const x = -L / 2 + 1.6 + i * ((L - 3.2) / (N - 1));
    // IHC (flask)
    const ihc = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14), std(0xa987ee, { emissive: 0x5a2cc0, emissiveIntensity: 0.3 }));
    bodyM.scale.set(1, 1.5, 1); bodyM.position.y = 2.1; ihc.add(bodyM);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 1.4, 14), bodyM.material); neck.position.y = 3.6; ihc.add(neck);
    ihc.position.set(x, 0, -2.8); body.add(ihc); cells.ihc.push(ihc);
    const cil = ciliaBundle(0xc9b3ff); cil.position.set(x, 4.35, -2.8); body.add(cil); cells.cilia.push(cil);
    // three rows of OHCs
    for (let r = 0; r < 3; r++) {
      const z = 0.6 + r * 1.35;
      const o = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.0, 14), std(0xf3b64a, { emissive: 0x6a4300, emissiveIntensity: 0.2 }));
      o.position.set(x + (r - 1) * 0.3, 2.7, z); o.userData.y0 = 2.7; body.add(o); cells.ohc.push(o);
      const deiters = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.2, 10), std(0x6b7c8f, { opacity: 0.8 })); deiters.position.set(o.position.x, 0.85, z); body.add(deiters);
      const oc = ciliaBundle(0xffd88a); oc.position.set(o.position.x, 4.25, z); body.add(oc); cells.ohcCilia.push(oc);
    }
    // pillar cells (tunnel of Corti)
    const pil = std(0x7f8ea0, { opacity: 0.8 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.2, 8), pil); p1.position.set(x, 2.0, -1.4); p1.rotation.x = -0.28; body.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.2, 8), pil); p2.position.set(x, 2.0, 0.0); p2.rotation.x = 0.28; body.add(p2);
  }
  // reticular lamina + tectorial membrane
  const rl = new THREE.Mesh(new THREE.BoxGeometry(L, 0.15, 7), std(0x9fb0c2, { opacity: 0.35, depthWrite: false })); rl.position.set(0, 4.15, -0.3); body.add(rl);
  const tect = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 7.5), std(0xcfe6f6, { opacity: 0.35, depthWrite: false, emissive: 0x0d2a3a })); tect.position.set(0, 5.6, 0.2);
  g.add(tect); // TM hinged on the limbus; does not ride fully with the BM → shear
  // afferent fibres to the spiral ganglion
  const fibres = [];
  const sg = V(0, -5.5, -7.5);
  const sgM = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 14), std(0xe2b84d, { emissive: 0x6a4a00, emissiveIntensity: 0.4 })); sgM.position.copy(sg); g.add(sgM);
  for (const ihc of cells.ihc) {
    const a = ihc.position.clone().add(V(0, 1.1, 0));
    const c = new THREE.CatmullRomCurve3([a, a.clone().add(V(0, -1.2, -1.6)), V(a.x * 0.6, -2.5, -5.8), sg]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.13, 6, false), std(0xe2b84d, { emissive: 0x3a2800 })); g.add(t);
    fibres.push(c);
  }
  // K+ sparks
  const K = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)),
    new THREE.PointsMaterial({ color: COL.ok, size: 0.35, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  body.add(K);
  const kState = Array.from({ length: 60 }, () => ({ life: 1, x: 0, y: 0, z: 0 }));
  scene.add(g);
  const lead = new THREE.Line(new THREE.BufferGeometry().setFromPoints([cochleaInset.g.position, g.position]), new THREE.LineDashedMaterial({ color: COL.fluid, dashSize: 1.5, gapSize: 1, transparent: true, opacity: 0.5 }));
  lead.computeLineDistances(); scene.add(lead);
  return { g, body, cells, tect, fibres, sg, K, kState, lead, bm };
}
function ciliaBundle(hex) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.25, roughness: 0.4 });
  [0.5, 0.8, 1.15].forEach((h, k) => {
    for (let j = -1; j <= 1; j++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), m);
      c.position.set(j * 0.28, h / 2, (k - 1) * 0.22); g.add(c);
    }
  });
  return g;
}

// ---------------------------------------------------------------- labels
const LABELS = [];
function label(text, posFn, chs, opts = {}) {
  const el = document.createElement('div'); el.className = 'tag';
  el.innerHTML = `<div class="in"><span>${text}</span></div>`;
  if (opts.color) el.style.setProperty('--c', opts.color);
  const o = new CSS2DObject(el); scene.add(o);
  LABELS.push({ o, el, posFn: typeof posFn === 'function' ? posFn : () => posFn, chs, cond: opts.cond, when: opts.when });
}
function buildLabels() {
  const C = CSS;
  label('Sound source', W.source.clone().add(V(0, 12, 0)), [1], { color: C.air });
  label('Auricle (pinna)', W.helix.clone().add(V(-4, 18, 0)), [0, 1], { color: C.air });
  label('Helix', W.helix.clone().add(V(-6, 22, -8)), [2], { color: C.air });
  label('Antihelix', W.antihelix, [2], { color: C.air });
  label('Concha', W.concha, [2], { color: C.air });
  label('Tragus', W.tragus.clone().add(V(-2, 0, 3)), [2], { color: C.air });
  label('Lobule', W.lobule, [2], { color: C.air });
  label('Entrance of ear canal', () => W.canalEntry, [2], { color: C.air });
  label('External auditory canal', () => W.canalMid.clone().add(V(0, 4.5, 0)), [3], { color: C.air });
  label('Tympanic membrane', W.tm.clone().add(V(0, -6, 1)), [0, 3, 4], { color: C.air });
  label('Cerumen plug', () => lesions.wax.position.clone().add(V(0, 4.5, 0)), [3], { color: C.bad, cond: 'wax' });
  label('Umbo', W.tm.clone().add(V(0.6, -1.4, 0.2)), [4], { color: C.mech });
  label('Perforation', () => lesions.perforation.position.clone().add(V(-1, -1.5, 2)), [4], { color: C.bad, cond: 'perforation' });
  label('Malleus', W.malleus.clone().add(V(0, 3, 0)), [4, 5], { color: C.mech });
  label('Incus', W.incus.clone().add(V(0, 2.5, -1)), [5], { color: C.mech });
  label('Stapes', W.stapes.clone().add(V(0, 1.6, 0)), [5], { color: C.mech });
  label('Oval window', () => W.ow, [5, 6], { color: C.mech });
  label('Round window', () => W.rw, [5], { color: C.fluid });
  label('Stapedius (acoustic reflex)', () => W.stapediusPt, [5], { color: C.bad, when: () => reflexOn() });
  label('Eustachian tube', W.tube, [5], { color: '#7fc4aa' });
  label('Middle-ear effusion', () => lesions.ome.position.clone().add(V(0, -4, 3)), [5], { color: C.bad, cond: 'ome' });
  label('Otosclerotic focus', () => W.ow.clone().add(V(0.5, -1.5, 1)), [5], { color: C.bad, cond: 'otosclerosis' });
  label('Cochlea', W.cochlea.clone().add(V(0, 4, 2)), [0, 6], { color: C.fluid });
  label('Vestibule & semicircular canals', W.vest.clone().add(V(0, 8, -4)), [6], { color: C.fluid });
  label('Base · high frequencies', () => cochleaInset.tickAt(16000), [6], { color: C.fluid });
  label('Apex · low frequencies', () => cochleaInset.g.localToWorld(cochleaInset.at(P.LEN, 0.5, 1.5)), [6], { color: C.fluid });
  for (const f of [8000, 4000, 2000, 1000, 500, 250]) label(P.fmtF(f), () => cochleaInset.tickAt(f), [6], { color: '#' + new THREE.Color(...P.freqRGB(f)).getHexString() });
  label('Inner hair cells', () => ocInset.g.localToWorld(ocInset.cells.ihc[0].position.clone().add(V(-1.5, 2, 0))), [7], { color: '#a987ee' });
  label('Outer hair cells × 3 rows', () => ocInset.g.localToWorld(V(-9, 3, 2)), [7], { color: C.mech });
  label('Tectorial membrane', () => ocInset.g.localToWorld(V(6, 6.6, 0)), [7], { color: '#cfe6f6' });
  label('Basilar membrane', () => ocInset.g.localToWorld(V(7, -0.6, 3)), [7], { color: '#5aa9ff' });
  label('Afferent fibres → spiral ganglion', () => ocInset.g.localToWorld(ocInset.sg.clone().add(V(1.5, 0, 0))), [7], { color: '#e2b84d' });
  label('Cochlear nerve (VIII)', () => NODES.N1.pos.clone().add(V(-2, -4, 3)), [6, 8], { color: '#e2b84d' });
  label('Vestibular schwannoma', () => lesions.vs.position.clone().add(V(0, 5, 0)), [8], { color: C.bad, cond: 'vs' });
  label('Cochlear nuclei', () => NODES.CN.pos, [8], { color: C.neural });
  label('Superior olivary complex', () => NODES.SOCi.pos, [8], { color: C.neural });
  label('Lateral lemniscus', () => NODES.LLc.pos, [8], { color: C.neural });
  label('Inferior colliculus', () => NODES.ICi.pos, [8, 9], { color: C.neural });
  label('Medial geniculate body', () => NODES.MGBi.pos, [9], { color: C.neural });
  label('Acoustic radiation', () => NODES.MGBc.pos.clone().lerp(NODES.HGc.pos, 0.5).add(V(0, 3, 0)), [9], { color: C.neural });
  label("Heschl's gyrus (A1) · contralateral", () => NODES.HGc.pos.clone().add(V(0, 5, 0)), [0, 9], { color: C.air });
  label("Heschl's gyrus (A1) · ipsilateral", () => NODES.HGi.pos.clone().add(V(0, 5, 0)), [9], { color: C.air });
  label('Brainstem', () => W.pons.clone().add(V(-10, -14, 6)), [0], { color: C.neural });
}
function updateLabels() {
  for (const L of LABELS) {
    const on = S.labels && L.chs.includes(S.ch) && (!L.cond || L.cond === S.cond) && (!L.when || L.when());
    L.el.style.opacity = on ? 1 : 0;
    if (on) L.o.position.copy(L.posFn());
  }
}

// ---------------------------------------------------------------- chapters
const CH = [
  { k: 'Overview', t: 'From the air to the cortex', sig: CSS.air,
    cam: [V(-250, 70, 205), V(-22, 12, -6)],
    body: () => `<p>A sound changes form four times on its way to perception: <b style="color:${CSS.air}">air pressure</b> in the ear canal, <b style="color:${CSS.mech}">mechanical vibration</b> of the eardrum and ossicles, a <b style="color:${CSS.fluid}">fluid wave</b> in the cochlea, and <b style="color:${CSS.neural}">nerve impulses</b> from the auditory nerve to Heschl's gyrus.</p>
      <p>Step through the chapters, or start the guided tour. Change the stimulus and the ear below to see how each stage responds.</p>`,
    facts: () => [['4', 'energy forms: acoustic, mechanical, hydromechanical, neural'], ['≈ 9 ms', 'click to auditory cortex (ABR wave VII)']] },
  { k: 'Stage 1 · Air', t: 'A pressure wave reaches the head', sig: CSS.air,
    cam: [V(-125, 50, 250), V(-118, 4, -5)],
    body: () => `<p>Sound travels through air at about 343 m/s as alternating compressions and rarefactions. At ${fmtStim()} each wavelength is about <b>${stimLambda()}</b>.</p>
      <p>The head is an acoustic obstacle. Above about 1.5 kHz, where wavelengths are shorter than the head, the far ear sits in a sound shadow (interaural level difference). At low frequencies the cue is timing instead: up to about 0.7 ms interaural time difference.</p>`,
    facts: () => [[stimLambda(), 'wavelength in air'], ['≤ 0.7 ms', 'maximum interaural time difference']] },
  { k: 'Stage 2 · Outer ear', t: 'Auricle and concha collect and colour the sound', sig: CSS.air,
    cam: [V(-150, 26, 62), V(-78, 0, -6)],
    body: () => `<p>The folds of the auricle reflect sound into the concha, a bowl that resonates near 5 kHz. The reflections add direction-dependent peaks and notches, mainly between 6 and 10 kHz. The brain uses these spectral cues for elevation and front–back localisation.</p>
      <p>The tragus and concha then funnel sound into the external auditory canal.</p>`,
    facts: () => [['≈ 5 kHz', 'concha resonance, about +10 dB'], ['6–10 kHz', 'pinna notches for elevation']] },
  { k: 'Stage 3 · Ear canal', t: 'A quarter-wave resonator', sig: CSS.air,
    cam: [V(-78, 30, 55), V(-58, -2, -5)],
    body: () => `<p>The external auditory canal is about 2.5 cm long and 7 mm wide. The lateral third is cartilaginous and carries the ceruminous glands; the medial two-thirds is bony. Closed at the eardrum, it behaves as a quarter-wave tube resonating near <b>2.7 kHz</b>.</p>
      <p>Together with the concha it boosts sound at the eardrum by 15–20 dB between 2 and 4 kHz. At ${fmtStim()}, the gain in this model is <b>+${Math.round(stimExt())} dB</b>. The brightening of the particles toward the eardrum shows this build-up of pressure.</p>`,
    facts: () => [['≈ 2.7 kHz', 'canal resonance (adult)'], [`+${Math.round(stimExt())} dB`, `canal + concha gain at ${fmtStim()}`]],
    lens: { wax: 'Impacted cerumen blocks the canal. An occluding plug causes a conductive loss of up to about 40 dB, a flat tympanogram with low canal volume, and absent OAEs.',
      nihl: 'The 2–4 kHz boost from the canal is one reason noise damage concentrates at 3–6 kHz (the 4 kHz notch).' } },
  { k: 'Stage 4 · Eardrum', t: 'The tympanic membrane turns pressure into motion', sig: CSS.mech,
    cam: [V(-72, 6, 10), V(-48, -2, -4)],
    body: () => `<p>The eardrum is a thin (≈ 0.1 mm) cone about 9 mm across. It is drawn in at the umbo by the handle of the malleus. Its vibrating area is about 55 mm² of a total of 85 mm².</p>
      <p>Below about 1 kHz it moves as a whole. At higher frequencies it breaks into complex modes. The glow on the membrane follows the pressure it receives.</p>`,
    facts: () => [['≈ 85 mm²', 'total area (≈ 55 mm² effective)'], ['≈ 0.1 mm', 'thickness of pars tensa']],
    lens: { perforation: 'A perforation reduces the effective area and lets sound reach the round window directly, partly cancelling the drive to the oval window. The loss is usually 10–40 dB and grows with perforation size. The tympanogram is flat with a large canal volume.',
      wax: 'With the canal occluded, very little pressure reaches the eardrum.',
      ome: 'Fluid behind the drum stiffens and loads it, so its motion is much reduced.' } },
  { k: 'Stage 5 · Middle ear', t: 'Impedance matching by the ossicles', sig: CSS.mech,
    cam: [V(-70, 16, 38), V(-45, 0.5, -5)],
    body: () => `<p>Without the middle ear, about 99.9 % of sound energy would reflect off the fluid-filled cochlea (a 30 dB loss). The malleus and incus rotate as one unit about their ligament axis, and the stapes pistons into the oval window.</p>
      <p>Three effects restore the energy: the area ratio of eardrum to footplate (≈ 17 : 1), the ossicular lever (≈ 1.3 : 1), and eardrum buckling. Together they give about 25–30 dB. The Eustachian tube keeps middle-ear pressure equal to the atmosphere.</p>
      <p>${reflexOn() ? `<b style="color:${CSS.bad}">Acoustic reflex active:</b> at ${S.level} dB SPL the stapedius (facial nerve) contracts on both sides and stiffens the chain, reducing low-frequency transmission.` : `At high levels (reflex threshold about 70–100 dB HL) the stapedius contracts on both sides. Raise the level to 90 dB to see it.`}</p>`,
    facts: () => [['≈ 17 : 1', 'eardrum : footplate area'], ['≈ 1.3 : 1', 'ossicular lever'], ['25–30 dB', 'middle-ear pressure gain'], [reflexOn() ? 'ON' : 'off', 'acoustic reflex now']],
    lens: { ome: 'Otitis media with effusion: fluid in the tympanic cavity damps the chain. Expect a 20–30 dB conductive loss, a type B tympanogram with normal volume, absent reflexes and absent OAEs.',
      otosclerosis: 'Otosclerosis: new spongy bone fixes the stapes footplate in the oval window. The eardrum still moves but the stapes barely does. Expect a type As tympanogram, absent reflexes, and a Carhart notch near 2 kHz on bone conduction.',
      perforation: 'With a perforation the chain is driven weakly and sound also reaches the round window directly.',
      wax: 'The chain is barely driven because the canal is blocked.' } },
  { k: 'Stage 6 · Cochlea', t: 'A travelling wave sorts sound by frequency', sig: CSS.fluid,
    cam: [V(-82, -2, 88), V(-51, -21, 42)],
    body: () => { const pd = model.peakD; return `<p>The stapes pushes perilymph in the scala vestibuli, and the round window bulges out in opposite phase. The pressure difference sets up a travelling wave on the basilar membrane. The membrane is narrow and stiff at the base and wide and floppy at the apex, so each frequency peaks at its own place.</p>
      <p>${S.stim === 'click' ? 'A click excites the whole membrane, starting at the base; each place rings at its own frequency after a travel delay.' : `${fmtStim()} peaks about <b>${pd.toFixed(1)} mm</b> from the base (Greenwood map). The magnified spiral shows the wave; colour marks each place's characteristic frequency.`}</p>
      <p><a href="../cochlea/" style="color:${CSS.fluid}">Open the Travelling Wave Lab</a> for the 2D model with excitation patterns and input–output curves.</p>`; },
    facts: () => [['35 mm', 'basilar membrane, 2.5–2.75 turns'], [S.stim === 'click' ? 'all places' : `${model.peakD.toFixed(1)} mm`, S.stim === 'click' ? 'click excitation' : 'peak place from the base'], ['20 kHz → 20 Hz', 'base → apex']],
    lens: { ohc: 'Presbycusis: outer hair cells are lost first at the base. High-frequency waves lose their sharp, tall peak.',
      nihl: 'Noise damage is centred on the 4 kHz place (3–6 kHz). Try 4 kHz, then 1 kHz and 8 kHz.',
      dead: 'In a dead region (here CF 3–10 kHz) the membrane still moves but no inner hair cells or neurons respond. High-frequency sounds are heard only at the edge of the region.' } },
  { k: 'Stage 7 · Organ of Corti', t: 'Hair cells turn motion into nerve signals', sig: CSS.neural,
    cam: [V(-72, -38, 84), V(-50, -56, 44)],
    body: () => `<p>As the basilar membrane rises, the tectorial membrane shears the stereocilia toward the tallest row. This opens mechanotransduction channels, and K⁺ flows in from the endolymph (+80 mV endocochlear potential).</p>
      <p>About 12,000 <b style="color:${CSS.mech}">outer hair cells</b> in three rows change length (prestin electromotility). They amplify soft sounds by 40–60 dB, sharpen tuning, and generate OAEs. About 3,500 <b style="color:#a987ee">inner hair cells</b> in one row release glutamate onto 90–95 % of the roughly 30,000 afferent fibres (type I, 10–20 per IHC).</p>`,
    facts: () => [['≈ 3,500', 'inner hair cells (1 row)'], ['≈ 12,000', 'outer hair cells (3 rows)'], ['40–60 dB', 'cochlear amplifier gain'], ['+80 mV', 'endocochlear potential']],
    lens: { ohc: 'The damaged OHCs no longer amplify, so the loss of sensitivity goes with broader tuning, recruitment and absent OAEs.',
      nihl: 'OHCs near the 4 kHz place are damaged; OAEs are reduced around 3–6 kHz.',
      dead: 'With no functioning IHCs in the region, nothing reaches the nerve from those places. Diagnose with the TEN(HL) test.' } },
  { k: 'Stage 8 · Nerve and brainstem', t: 'Relays that compare the two ears', sig: CSS.neural,
    cam: [V(-78, 30, 118), V(-12, 6, -12)],
    body: () => `<p>The cochlear nerve leaves through the internal auditory meatus with the vestibular and facial nerves (ABR waves I and II). Every fibre synapses in the ipsilateral <b>cochlear nucleus</b> (wave III).</p>
      <p>The <b>superior olivary complex</b> is the first binaural stage (wave IV). The MSO codes interaural time differences and the LSO codes level differences. Fibres cross in the trapezoid body and ascend in the <b>lateral lemniscus</b> to the <b>inferior colliculus</b>, an obligatory midbrain relay. Wave V, the most robust ABR peak, arises here. Watch most impulses cross to the opposite side.</p>`,
    facts: () => { const a = model.abr; return [[`${a.L.V.toFixed(1)} ms`, 'wave V latency'], [`${a.I_V.toFixed(2)} ms`, 'I–V interpeak (normal ≈ 4.0)'], ['III · IV · V', 'CN · SOC · LL/IC'], ['> 50 %', 'of ascending input is contralateral']]; },
    lens: { vs: 'A vestibular schwannoma in the internal auditory meatus slows and blocks conduction. Wave I is normal but I–III and I–V are prolonged (> 4.4 ms), and reflexes decay. OAEs are often preserved because the cochlea is intact.',
      wax: 'In conductive loss every wave is delayed by the same amount, so the I–V interval stays normal.', perforation: 'All waves are delayed; I–V is normal.', ome: 'All waves are delayed; I–V is normal.', otosclerosis: 'All waves are delayed; I–V is normal.' } },
  { k: 'Stage 9 · Thalamus and cortex', t: 'Perception in Heschl\'s gyrus', sig: CSS.air,
    cam: [V(0, 100, 225), V(0, 30, -12)],
    body: () => `<p>From the inferior colliculus, fibres reach the <b>medial geniculate body</b> of the thalamus. The acoustic radiation then passes through the sublenticular internal capsule to <b>Heschl's gyrus</b> (primary auditory cortex, BA 41). The belt and parabelt areas include the planum temporale and Wernicke's area.</p>
      <p>Tonotopy is kept all the way up. Because each ear projects to both hemispheres, a one-sided cortical lesion rarely causes deafness. It shows up instead on central auditory tests such as dichotic listening and gaps-in-noise.</p>`,
    facts: () => [['BA 41 / 42', 'primary / secondary auditory cortex'], ['bilateral', 'each ear reaches both cortices']] },
];

function fmtStim() { return S.stim === 'click' ? 'a click' : P.fmtF(+S.stim); }
function stimLambda() { if (S.stim === 'click') return 'broadband'; const mm = P.lambdaMM(+S.stim); return mm >= 100 ? (mm / 10).toFixed(0) + ' cm' : (mm / 10).toFixed(1) + ' cm'; }
function stimExt() { return P.extGain(S.stim === 'click' ? 2700 : +S.stim); }
function reflexOn() { return S.level >= 90 && !P.isConductive(S.cond) && S.cond !== 'vs'; }

let camTween = null;
function setChapter(i, instant = false) {
  S.ch = (i + CH.length) % CH.length;
  const c = CH[S.ch];
  document.documentElement.style.setProperty('--sig', c.sig);
  renderChapters(); renderCard();
  const [pos, tgt] = c.cam;
  const p = MOBILE ? tgt.clone().add(pos.clone().sub(tgt).multiplyScalar(1.35)) : pos;
  if (instant) { camera.position.copy(p); controls.target.copy(tgt); camTween = null; }
  else camTween = { t: 0, dur: 1.8, p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: tgt.clone() };
  tourClock = 0;
}
function renderChapters() {
  $('chapters').innerHTML = CH.map((c, i) => `<button type="button" data-i="${i}" ${i === S.ch ? 'aria-current="step"' : ''}><span class="n">${String(i).padStart(2, '0')}</span><span class="dot"></span>${c.k.replace(/^Stage \d · /, '')}</button>`).join('');
  const cur = $('chapters').querySelector('[aria-current]'); if (cur && MOBILE) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
}
$('chapters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stopTour(); setChapter(+b.dataset.i); } });
function renderCard() {
  const c = CH[S.ch];
  const facts = c.facts ? c.facts() : [];
  const lensTxt = c.lens && c.lens[S.cond];
  const condLbl = P.condById(S.cond).label;
  let lens = '';
  if (S.cond !== 'normal') lens = lensTxt ? `<div class="lens"><b>${condLbl}</b>${lensTxt}</div>` : `<div class="lens ok"><b>${condLbl}</b>No change at this stage.</div>`;
  $('card').innerHTML = `<div class="kicker">${c.k}</div><h2>${c.t}</h2>${c.body()}
    ${facts.length ? `<div class="facts">${facts.map(([b, s]) => `<div class="fact"><b>${b}</b><span>${s}</span></div>`).join('')}</div>` : ''}${lens}`;
}

// ---------------------------------------------------------------- model state (recomputed on control change)
let model = { profile: null, fire: 1, abr: null, peakD: 20 };
function refreshModel() {
  model.profile = P.bmProfile(S.stim, S.cond, NB, S.level);
  model.fire = P.firing(S.stim, S.cond) * clamp(Math.pow(10, (S.level - 70) / 40), 0.35, 1.3);
  model.abr = P.abr(S.stim, S.cond);
  model.peakD = model.profile.peakD;
  model.cd = P.condition(S.cond);
  model.vis = P.visFreq(S.stim === 'click' ? null : +S.stim);
  model.rgb = new THREE.Color(...P.freqRGB(S.stim === 'click' ? null : +S.stim));
  const pc = P.cfAt(model.peakD);
  model.peakHealth = P.ohcHealth(pc, S.cond);
  model.peakIHC = P.ihcAlive(pc, S.cond);
  // latencies (ms) at each pathway node
  const L = model.abr.L;
  const lat = { 'I-': L.I - 0.6, I: L.I, II: L.II, III: L.III, IV: L.IV, 'IV+': (L.IV + L.V) / 2, V: L.V, VI: L.VI, VII: L.VII };
  for (const id in NODES) NODES[id].lat = lat[NODES[id].wave] + (NODES[id].side === 'c' ? 0.1 : 0);
  for (const k in lesions) lesions[k].visible = false;
  if (S.cond === 'wax') lesions.wax.visible = true;
  if (S.cond === 'perforation') { lesions.perforation.visible = true; lesions.perfRing.visible = true; }
  if (S.cond === 'ome') lesions.ome.visible = true;
  if (S.cond === 'otosclerosis') lesions.otosclerosis.visible = true;
  if (S.cond === 'vs') lesions.vs.visible = true;
  renderCard(); renderClinic();
}

// ---------------------------------------------------------------- clinic panel
function renderClinic() {
  const f = S.stim === 'click' ? 2000 : +S.stim, cd = model.cd;
  const ff = S.level;
  const ear = ff + P.extGain(f) - (S.cond === 'wax' ? 30 : 0);
  const ow = ear + P.meGain(f) - (S.cond === 'wax' ? 0 : cd.meLoss);
  const rows = [
    ['Free field', ff, 'dB SPL', CSS.air],
    ['At the eardrum', ear, 'dB SPL', CSS.air],
    ['At the oval window', ow, 'dB SPL', CSS.mech],
    ['Nerve response', Math.round(clamp(model.fire, 0, 1) * 100), '%', CSS.neural],
  ];
  $('ladder').innerHTML = rows.map(([k, v, u, c]) => `<div class="rung"><span class="k">${k}</span><span class="bar"><i style="width:${u === '%' ? clamp(v, 0, 100) : clamp((v / 130) * 100, 2, 100)}%;background:${c}"></i></span><span class="v">${Math.round(v)} ${u === '%' ? '%' : 'dB'}</span></div>`).join('');
  $('stimNote').textContent = `${S.stim === 'click' ? 'click' : P.fmtF(+S.stim)} · ${S.level} dB SPL`;
  $('abrNote').textContent = `${S.stim === 'click' ? 'click' : P.fmtF(+S.stim) + ' tone burst'} · I–V ${model.abr.I_V.toFixed(2)} ms`;
  $('battery').innerHTML = P.clinical(S.cond).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}
const abrCv = $('abr'), abrCtx = abrCv.getContext('2d');
function drawABR(cursorMs) {
  const r = abrCv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (abrCv.width !== Math.round(r.width * dpr)) { abrCv.width = Math.round(r.width * dpr); abrCv.height = Math.round(r.height * dpr); }
  const g = abrCtx; g.setTransform(dpr, 0, 0, dpr, 0, 0); const w = r.width, h = r.height; g.clearRect(0, 0, w, h);
  const T = 12, X = (t) => 6 + (t / T) * (w - 12), Y = (v) => h * 0.45 - v * h * 0.55;
  g.strokeStyle = 'rgba(150,185,215,.14)'; g.lineWidth = 1; g.font = '10px "JetBrains Mono",monospace'; g.fillStyle = CSS.dim; g.textAlign = 'center';
  for (let t = 0; t <= T; t += 2) { g.beginPath(); g.moveTo(X(t), 8); g.lineTo(X(t), h - 16); g.stroke(); g.fillText(t + (t === T ? ' ms' : ''), X(t), h - 4); }
  // normal reference
  if (S.cond !== 'normal') {
    const n = P.abr(S.stim, 'normal').waves; g.strokeStyle = 'rgba(143,162,183,.45)'; g.setLineDash([3, 3]); g.beginPath();
    for (let t = 0; t <= T; t += 0.04) { const x = X(t), y = Y(P.abrValue(n, t)); t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.setLineDash([]);
  }
  const wv = model.abr.waves, end = cursorMs == null ? T : clamp(cursorMs, 0, T);
  g.strokeStyle = CSS.neural; g.lineWidth = 1.8; g.beginPath();
  for (let t = 0; t <= end; t += 0.03) { const x = X(t), y = Y(P.abrValue(wv, t)); t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.fillStyle = CSS.ink; g.font = '600 10px "JetBrains Mono",monospace';
  for (const v of wv) if (['I', 'III', 'V'].includes(v.n) && v.lat <= end) { const x = X(v.lat); g.fillText(v.n, x, Y(P.abrValue(wv, v.lat)) - 6); }
  if (cursorMs != null && cursorMs < T) { g.strokeStyle = 'rgba(255,92,138,.5)'; g.beginPath(); g.moveTo(X(end), 8); g.lineTo(X(end), h - 16); g.stroke(); }
}

// ---------------------------------------------------------------- spikes
const spikePool = [];
function spawnSpike(t0 = 0) {
  let s = spikePool.pop();
  if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COL.neural, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.renderOrder = 7; scene.add(s); }
  s.visible = true; s.scale.setScalar(S.ch === 9 || S.ch === 0 ? 4.2 : 2.6);
  s.material.color.copy(model.rgb).lerp(new THREE.Color(COL.neural), 0.35);
  spikes.push({ s, at: 'C0', e: pick('C0'), u: -t0 });
}
function pick(id) {
  const es = EDGES[id]; if (!es) return null;
  let r = Math.random() * es.reduce((a, e) => a + e.w, 0);
  for (const e of es) { r -= e.w; if (r <= 0) return e; } return es[es.length - 1];
}
const MS = 0.55; // visual seconds per real millisecond of neural conduction
function stepSpikes(dt) {
  for (let i = spikes.length - 1; i >= 0; i--) {
    const k = spikes[i];
    if (!k.e) { recycle(i); continue; }
    const a = NODES[k.at], b = NODES[k.e.to];
    const dur = Math.max(0.18, (b.lat - a.lat) * MS);
    k.u += dt / dur;
    if (k.u < 0) { k.s.visible = false; continue; }
    k.s.visible = true;
    if (S.cond === 'vs' && k.at === 'N1' && k.u > 0.3 && !k.checked) { k.checked = true; if (Math.random() < 0.45) { recycle(i); continue; } }
    if (k.u >= 1) {
      glowNodes[k.e.to].v = Math.min(1.6, glowNodes[k.e.to].v + 0.45);
      k.at = k.e.to; k.u = 0; k.checked = false; k.e = pick(k.at);
      if (!k.e) { recycle(i); continue; }
    }
    k.s.position.copy(k.e.curve.getPointAt(clamp(k.u, 0, 1)));
  }
}
function recycle(i) { const k = spikes[i]; k.s.visible = false; spikePool.push(k.s); spikes.splice(i, 1); }

// ---------------------------------------------------------------- animation
const clock = new THREE.Clock();
let t = 0, emitAcc = 0, lastWave = -99, tourClock = 0, clickVolleyAt = -1;
const CLICK_P = 9.5;
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function drive(tt) {
  // normalised stimulus waveform at the eardrum
  if (S.stim === 'click') { const c = tt % CLICK_P - 2.6; return c < 0 ? 0 : Math.exp(-c * 3.2) * Math.sin(2 * Math.PI * 1.8 * c); }
  return Math.sin(2 * Math.PI * model.vis * tt);
}
function frame() {
  const rdt = Math.min(0.05, clock.getDelta());
  const dt = S.playing ? rdt * S.speed : 0;
  t += dt;
  if (!NODES.C0) { renderer.render(scene, camera); requestAnimationFrame(frame); return; }
  const lf = clamp(Math.pow(10, (S.level - 70) / 40), 0.35, 1.5);
  const cd = model.cd;
  const refl = reflexOn() ? 0.55 : 1;

  // camera tween
  if (camTween) {
    camTween.t += rdt / camTween.dur; const e = easeIO(Math.min(1, camTween.t));
    camera.position.lerpVectors(camTween.p0, camTween.p1, e); controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (camTween.t >= 1) camTween = null;
  }
  controls.update();

  // group opacities
  for (const g in meshes) {
    const target = GROUP[g].op[S.ch];
    for (const m of meshes[g]) { const o = getOp(m.material); const n = o + (target - o) * Math.min(1, rdt * 3.5); setOp(m.material, n); m.visible = n > 0.01; if (!m.material.uniforms) m.material.depthWrite = n > 0.95 && g !== 'tm' && g !== 'labyrinth'; }
  }
  const near = (list) => (list.includes(S.ch) ? 1 : 0);
  // ---- air: wavefronts from the source
  const airOn = S.ch <= 2 || S.ch === 0;
  const dist = W.source.distanceTo(W.concha), speed = dist / 1.6; // 1.6 s from source to concha
  const period = S.stim === 'click' ? CLICK_P : 1 / model.vis;
  if (S.playing) {
    const phaseT = S.stim === 'click' ? (t % CLICK_P) : t;
    if (S.stim === 'click' ? (phaseT < lastWave) : (t - lastWave >= period)) {
      const m = wavefronts.find((w) => t - w.userData.born > (dist + 30) / speed) || wavefronts[0];
      m.userData.born = t; m.visible = true;
    }
    lastWave = S.stim === 'click' ? phaseT : (t - lastWave >= period ? t : lastWave);
  }
  for (const m of wavefronts) {
    const age = t - m.userData.born, R = age * speed;
    if (age < 0 || R > dist + 25) { m.visible = false; continue; }
    m.visible = true; m.position.copy(W.source); m.scale.setScalar(Math.max(0.5, R));
    m.material.uniforms.uOpacity.value = (airOn ? 0.55 : 0.12) * lf * (1 - R / (dist + 25)) * (S.stim === 'click' ? 1.5 : 1);
  }
  W.sourceCone.material.opacity = 0.35 + 0.5 * Math.abs(drive(t));
  W.sourceGlyph.visible = S.ch === 1 || S.ch === 2;

  // ---- canal pressure particles (longitudinal wave, resonance build-up)
  const pAttr = particles.pts.geometry.attributes.position, cAttr = particles.pts.geometry.attributes.color;
  const gainLin = Math.pow(10, stimExt() / 20);
  const k = S.stim === 'click' ? 1.2 : clamp(model.vis * 0.9, 0.5, 2.2);
  const pOn = [2, 3, 4].includes(S.ch) ? 1 : S.ch === 0 ? 0.5 : S.ch === 5 ? 0.12 : 0.05;
  const acol = new THREE.Color(COL.air);
  for (let i = 0; i < particles.N; i++) {
    const u = particles.u[i];
    const block = S.cond === 'wax' && u > 0.42 ? 0.12 : 1;
    const amp = 0.018 * lf * (1 + (gainLin - 1) * u * 0.6) * block;
    let ph;
    if (S.stim === 'click') { const c = (t % CLICK_P) - 1.6 - u * 1.0; ph = c < 0 ? 0 : Math.exp(-c * 3) * Math.sin(2 * Math.PI * 1.8 * c); }
    else ph = Math.sin(2 * Math.PI * (model.vis * t - u * k));
    const s = clamp(u + amp * ph, 0, 1);
    const p = lutAt(canal.lp, s), n = lutAt(canal.ln, s), b = lutAt(canal.lb, s);
    const ra = particles.ra[i], an = particles.an[i];
    p.addScaledVector(n, Math.cos(an) * ra).addScaledVector(b, Math.sin(an) * ra);
    pAttr.setXYZ(i, p.x, p.y, p.z);
    const comp = S.stim === 'click' ? Math.abs(ph) : 0.5 + 0.5 * Math.cos(2 * Math.PI * (model.vis * t - u * k));
    const br = pOn * block * (0.18 + 0.9 * comp * (0.5 + 0.5 * u * (gainLin / 4 + 0.6))) * clamp(lf, 0.5, 1.3);
    cAttr.setXYZ(i, acol.r * br, acol.g * br, acol.b * br);
  }
  pAttr.needsUpdate = true; cAttr.needsUpdate = true;
  canal.tube.material.uniforms.uOpacity.value += ((near([2, 3]) ? 0.55 : near([0, 4]) ? 0.25 : 0.06) - canal.tube.material.uniforms.uOpacity.value) * Math.min(1, rdt * 3);

  // ---- eardrum + ossicles
  const dv = drive(t);
  const tmAmp = 0.55 * lf * cd.tm * (S.cond === 'wax' ? 1 : 1);
  if (tmMat.userData.sh) tmMat.userData.sh.uniforms.uDisp.value = tmAmp * dv;
  tmMat.emissiveIntensity = 0.1 + 0.9 * Math.abs(dv) * cd.tm * lf;
  const ch = cd.chain * lf * refl;
  chainPivot.rotation.z = 0.07 * ch * dv;
  stapesGroup.position.copy(V(1, 0.08, 0.12).normalize().multiplyScalar(0.5 * cd.stapes * lf * refl * dv));
  for (const n of ['Malleus.r', 'Incus.r']) byName[n].material.emissiveIntensity = 0.3 * Math.abs(dv) * ch;
  byName['Stapes.r'].material.emissiveIntensity = 0.35 * Math.abs(dv) * cd.stapes * lf * refl;
  W.stapedius.material.emissiveIntensity = reflexOn() ? 0.6 + 0.4 * Math.sin(t * 6) : 0;
  W.reflexArc.material.opacity += (((reflexOn() && [5, 8].includes(S.ch)) ? 0.9 : 0) - W.reflexArc.material.opacity) * Math.min(1, rdt * 3);
  W.stapedius.visible = [4, 5].includes(S.ch) || reflexOn();

  // ---- magnified cochlea: travelling wave on the BM ribbon
  const CI = cochleaInset, pr = model.profile;
  const insetOn = [6].includes(S.ch) ? 1 : [7].includes(S.ch) ? 0.35 : 0;
  CI.g.visible = insetOn > 0; CI.lead.visible = insetOn > 0;
  if (CI.g.visible) {
    const pos = CI.bm.geometry.attributes.position, col = CI.bm.geometry.attributes.color;
    const scale = 2.8 * lf;
    for (let i = 0; i < NB; i++) {
      const B = CI.base[i];
      let y, env;
      if (pr.click) { const c = (t % CLICK_P) - 3.0 - pr.tau[i]; env = pr.amp[i]; y = c < 0 ? 0 : env * (1 - Math.exp(-c * pr.vis[i] * 6)) * Math.exp(-c * pr.vis[i] / pr.ncyc[i]) * Math.sin(2 * Math.PI * pr.vis[i] * c); }
      else { env = pr.amp[i]; y = env * Math.cos(2 * Math.PI * model.vis * t + pr.phase[i]); }
      y *= scale;
      pos.setXYZ(i * 2, B.inner.x, B.inner.y + y, B.inner.z);
      pos.setXYZ(i * 2 + 1, B.outer.x, B.outer.y + y, B.outer.z);
      const alive = P.ihcAlive(B.cf, S.cond);
      const br = (0.1 + 2.6 * Math.abs(y) / Math.max(scale, 0.3) + 0.5 * env) * insetOn;
      const rgb = alive ? B.rgb : [0.5, 0.36, 0.3];
      col.setXYZ(i * 2, rgb[0] * br, rgb[1] * br, rgb[2] * br); col.setXYZ(i * 2 + 1, rgb[0] * br, rgb[1] * br, rgb[2] * br);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    const sd = cd.stapes * lf * refl * dv;
    CI.ow.scale.setScalar(1 + 0.35 * sd); CI.rw.scale.setScalar(1 - 0.35 * sd);
  }

  // ---- organ of Corti inset
  const O = ocInset;
  O.g.visible = S.ch === 7; O.lead.visible = S.ch === 7;
  if (O.g.visible) {
    let yb;
    const iP = Math.round((model.peakD / P.LEN) * (NB - 1));
    if (pr.click) { const c = (t % CLICK_P) - 3.0 - pr.tau[iP]; yb = c < 0 ? 0 : pr.amp[iP] * Math.exp(-c * 1.2) * Math.sin(2 * Math.PI * 1.4 * c); }
    else yb = pr.amp[iP] * Math.cos(2 * Math.PI * model.vis * t + pr.phase[iP]);
    yb *= lf;
    O.body.position.y = 0.9 * yb;
    const h = model.peakHealth, alive = model.peakIHC;
    const shear = 0.55 * yb;
    O.cells.cilia.forEach((c) => { c.rotation.x = alive ? shear : 0.5; });
    O.cells.ohcCilia.forEach((c, j) => { c.rotation.x = h > 0.3 ? shear : (j % 2 ? 0.7 : -0.5); c.scale.y = h > 0.3 ? 1 : 0.5; });
    O.cells.ohc.forEach((o) => { o.scale.y = 1 - 0.12 * h * clamp(yb, -0.6, 1); o.material.opacity = 0.25 + 0.75 * h; o.material.emissiveIntensity = 0.15 + 0.8 * h * Math.max(0, yb); });
    O.cells.ihc.forEach((c) => { c.children.forEach((m) => { m.material.color.set(alive ? 0xa987ee : 0x4b4f5c); m.material.emissiveIntensity = alive ? 0.2 + 1.2 * Math.max(0, yb) : 0; }); });
    // K+ influx sparks on excitatory deflection
    const kp = O.K.geometry.attributes.position;
    for (let j = 0; j < O.kState.length; j++) {
      const q = O.kState[j];
      q.life += dt * 1.6;
      if (q.life >= 1 && yb > 0.08 && Math.random() < yb * 0.5 && (alive || h > 0.3)) {
        const src = Math.random() < 0.3 && alive ? O.cells.ihc[Math.floor(Math.random() * 5)].position.clone().setY(5.2) : O.cells.ohc[Math.floor(Math.random() * 15)].position.clone().setY(5.0);
        q.x = src.x + (Math.random() - 0.5) * 0.5; q.y = src.y; q.z = src.z; q.life = 0;
      }
      const yy = q.life < 1 ? q.y - q.life * 2.2 : -99;
      kp.setXYZ(j, q.x, yy, q.z);
    }
    kp.needsUpdate = true;
  }

  // ---- spikes
  const neuralOn = S.ch === 0 || S.ch >= 6;
  if (S.playing && neuralOn) {
    if (S.stim === 'click') {
      const c = t % CLICK_P;
      if (c >= 3.4 && clickVolleyAt < 0) { const n = Math.round(22 * clamp(model.fire, 0.05, 1.2)); for (let i = 0; i < n; i++) spawnSpike(Math.random() * 0.12); clickVolleyAt = t; }
      if (c < 3.4) clickVolleyAt = -1;
    } else {
      emitAcc += dt * 9 * clamp(model.fire, 0.03, 1.3);
      while (emitAcc > 1) { emitAcc -= 1; spawnSpike(); }
    }
  }
  if (!neuralOn) while (spikes.length) recycle(spikes.length - 1);
  stepSpikes(dt);
  for (const id in glowNodes) {
    const gN = glowNodes[id]; gN.v *= Math.exp(-rdt * 2.2);
    gN.sprite.material.opacity = Math.min(0.9, gN.v * 0.8);
    gN.sprite.scale.setScalar((S.ch === 9 || S.ch === 0 ? 14 : 7) * (0.7 + gN.v * 0.4));
  }
  const glowMesh = (names, v) => names.forEach((n) => { const m = byName[n]; if (m) m.material.emissiveIntensity = 0.15 + 1.6 * v; });
  glowMesh(['Anterior cochlear nucleus.r', 'Posterior cochlear nucleus.r'], glowNodes.CN.v);
  glowMesh(['Inferior colliculus.r'], glowNodes.ICi.v); glowMesh(['Inferior colliculus.l'], glowNodes.ICc.v);
  glowMesh(['Medial geniculate body.r'], glowNodes.MGBi.v); glowMesh(['Medial geniculate body.l'], glowNodes.MGBc.v);
  glowMesh(['Transverse temporal gyri.r', 'Temporal plane.r'], glowNodes.HGi.v); glowMesh(['Transverse temporal gyri.l', 'Temporal plane.l'], glowNodes.HGc.v);
  W.socMeshes[0].material.emissiveIntensity = 0.3 + 1.6 * glowNodes.SOCi.v; W.socMeshes[1].material.emissiveIntensity = 0.3 + 1.6 * glowNodes.SOCc.v;
  W.llMeshes[0].material.emissiveIntensity = 0.3 + 1.6 * glowNodes.LLi.v; W.llMeshes[1].material.emissiveIntensity = 0.3 + 1.6 * glowNodes.LLc.v;
  const pathOn = S.ch === 0 || S.ch >= 8;
  W.tracts.visible = pathOn || S.ch === 6;
  [...W.socMeshes, ...W.llMeshes].forEach((m) => { m.visible = pathOn; });

  // ---- ABR cursor (synchronised with the click volley)
  if (S.stim === 'click') { const c = t % CLICK_P; drawABR(c < 3.4 ? 0 : (c - 3.4) / MS + (model.abr.L.I - 0.6)); }
  else if (!drawABR.static || drawABR.key !== S.stim + S.cond) { drawABR(null); drawABR.static = true; drawABR.key = S.stim + S.cond; }

  // ---- tour
  if (S.tour && S.playing) { tourClock += rdt; if (tourClock > (S.ch === 0 ? 9 : 14)) { if (S.ch === CH.length - 1) stopTour(); else setChapter(S.ch + 1); } }

  updateLabels();
  if (S.glow) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- controls
$('stim').innerHTML = P.STIMS.map((s) => `<button type="button" data-v="${s.id}" aria-pressed="${s.id === S.stim}">${s.label}</button>`).join('');
$('stim').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.stim = b.dataset.v; $('stim').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawABR.static = false; refreshModel(); });
const groups = {}; P.CONDITIONS.forEach((c) => { (groups[c.group] = groups[c.group] || []).push(c); });
$('cond').innerHTML = Object.entries(groups).map(([g, cs]) => (g ? `<optgroup label="${g}">` : '') + cs.map((c) => `<option value="${c.id}">${c.label}</option>`).join('') + (g ? '</optgroup>' : '')).join('');
$('cond').addEventListener('change', (e) => { S.cond = e.target.value; drawABR.static = false; refreshModel(); });
$('level').addEventListener('input', (e) => { S.level = +e.target.value; $('levelOut').textContent = `${S.level} dB SPL`; refreshModel(); });
$('speed').addEventListener('input', (e) => { S.speed = +e.target.value; });
$('labels').addEventListener('change', (e) => { S.labels = e.target.checked; });
$('glow').checked = S.glow; $('glow').addEventListener('change', (e) => { S.glow = e.target.checked; });
const syncPlay = () => { $('play').textContent = S.playing ? 'Pause' : 'Play'; };
$('play').addEventListener('click', () => { S.playing = !S.playing; syncPlay(); }); syncPlay();
$('prev').addEventListener('click', () => { stopTour(); setChapter(S.ch - 1); });
$('next').addEventListener('click', () => { stopTour(); setChapter(S.ch + 1); });
$('tour').addEventListener('click', () => { if (S.tour) stopTour(); else { S.tour = true; S.playing = true; syncPlay(); $('tour').setAttribute('aria-pressed', 'true'); $('tour').textContent = 'Stop tour'; setChapter(S.ch === CH.length - 1 ? 0 : S.ch); } });
function stopTour() { S.tour = false; $('tour').setAttribute('aria-pressed', 'false'); $('tour').textContent = 'Guided tour'; }
addEventListener('keydown', (e) => {
  if (e.target.closest('input,select')) return;
  if (e.key === 'ArrowRight') { stopTour(); setChapter(S.ch + 1); }
  else if (e.key === 'ArrowLeft') { stopTour(); setChapter(S.ch - 1); }
  else if (e.key === ' ') { e.preventDefault(); S.playing = !S.playing; syncPlay(); }
  else if (e.key.toLowerCase() === 'l') { S.labels = !S.labels; $('labels').checked = S.labels; }
});
controls.addEventListener('start', () => { camTween = null; $('hint').style.opacity = 0; });

if (MOBILE) $('hint').textContent = 'Drag to orbit · pinch to zoom';
renderChapters(); renderCard();
resize();
requestAnimationFrame(frame);
window.__hear = { S, setChapter, W, NODES };

// Replaces NaN / Inf pixels with black before bloom: on some phone GPUs a single invalid pixel is
// spread by the bloom blur into flickering black boxes.
function nanGuard() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bool bad = !(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b) || !(c.a == c.a) || c.r > 6e4 || c.g > 6e4 || c.b > 6e4; gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, 0.0, 64.0); }',
  });
}
