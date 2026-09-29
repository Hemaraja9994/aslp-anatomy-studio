// Devices in 3D — hearing aids, bone conduction, middle-ear, cochlear and brainstem implants on the ear model.
// Anatomy: Z-Anatomy / BodyParts3D meshes (CC BY-SA), mm, x = right→left, y = up, z = anterior.
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
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as P from '../../hearing-3d/js/physio.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = P.clamp;
const MOBILE = matchMedia('(max-width: 900px)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL = { air: 0x5fe3f2, mech: 0xf3b64a, fluid: 0x7d95ff, neural: 0xff5c8a, elec: 0xb8f36a, bad: 0xff8a5c };
const CSS = { air: '#5fe3f2', mech: '#f3b64a', fluid: '#7d95ff', neural: '#ff5c8a', elec: '#b8f36a', bad: '#ff8a5c', ink: '#e9eff6', muted: '#8fa2b7', dim: '#5d6f83' };
const FREQS = [250, 500, 1000, 2000, 4000, 8000];

const S = { ch: 0, f: 1000, level: 65, cond: 'mildmod', custom: 'ite', bc: 'perc', playing: !REDUCED, labels: true, glow: !MOBILE && !COARSE, speed: 1, tour: false };

// ================================================================ candidacy
const DEVICES = ['bte', 'ric', 'custom', 'bc', 'mei', 'ci', 'abi'];
const DNAME = { bte: 'Behind-the-ear (BTE)', ric: 'Receiver-in-canal (RIC)', custom: 'Custom in-ear (ITE · ITC · CIC · IIC)', bc: 'Bone-conduction device', mei: 'Middle-ear implant', ci: 'Cochlear implant', abi: 'Auditory brainstem implant' };
const STAT = { F: 'First choice', S: 'Suitable', C: 'Consider', N: 'Not indicated' };
const EFF = { F: 1, S: 0.85, C: 0.5, N: 0.08 };
const CONDS = [
  { id: 'mildmod', g: 'Sensorineural', label: 'Mild–moderate sloping SNHL (presbycusis)', m: { bte: 'S', ric: 'F', custom: 'S', bc: 'N', mei: 'C', ci: 'N', abi: 'N' },
    why: 'The cochlea still works but needs more sound, mostly at high frequencies. An open-fit RIC restores high-frequency audibility while low frequencies enter naturally, without occlusion. A middle-ear implant is an option only when conventional aids cannot be worn.' },
  { id: 'nihl', g: 'Sensorineural', label: 'Noise-induced loss (4 kHz notch)', m: { bte: 'S', ric: 'F', custom: 'S', bc: 'N', mei: 'N', ci: 'N', abi: 'N' },
    why: 'A notch at 3–6 kHz with good low frequencies suits an open-fit aid with gain shaped to the notch. Hearing protection and counselling are part of the plan.' },
  { id: 'severe', g: 'Sensorineural', label: 'Severe SNHL', m: { bte: 'F', ric: 'S', custom: 'C', bc: 'N', mei: 'C', ci: 'C', abi: 'N' },
    why: 'A power BTE with a closed earmould gives the most gain without feedback; RIC needs a high-power receiver and closed dome. If aided speech recognition stays poor, refer for cochlear implant assessment.' },
  { id: 'profound', g: 'Sensorineural', label: 'Bilateral severe–profound SNHL, limited aided benefit', m: { bte: 'C', ric: 'N', custom: 'N', bc: 'N', mei: 'N', ci: 'F', abi: 'N' },
    why: 'Too few hair cells remain for amplification to give usable speech. A cochlear implant bypasses them and stimulates the spiral ganglion directly. Hearing aids are used as a trial before implantation. Children do best when implanted early; in India the ADIP scheme supports implants for eligible young children.' },
  { id: 'deadhf', g: 'Sensorineural', label: 'High-frequency dead region with usable low frequencies', m: { bte: 'S', ric: 'F', custom: 'C', bc: 'N', mei: 'N', ci: 'C', abi: 'N' },
    why: 'Amplifying inside a dead region adds distortion rather than audibility. Use an aid with frequency lowering and limit gain well above the edge frequency (TEN-HL test). With good low-frequency hearing and poor speech, consider electro-acoustic (hybrid) cochlear implantation.' },
  { id: 'otosclerosis', g: 'Conductive', label: 'Otosclerosis', m: { bte: 'S', ric: 'S', custom: 'S', bc: 'C', mei: 'C', ci: 'C', abi: 'N' },
    why: 'Stapedotomy is the usual first-line treatment. Because the cochlea is healthy, air-conduction aids work well for patients who decline surgery. Bone-conduction and round-window implants are alternatives; far-advanced otosclerosis may need a cochlear implant.' },
  { id: 'csom', g: 'Conductive', label: 'Chronic discharging ear / open mastoid cavity', m: { bte: 'C', ric: 'N', custom: 'N', bc: 'F', mei: 'S', ci: 'N', abi: 'N' },
    why: 'An earmould blocks drainage and keeps the ear wet, so air-conduction aids are a poor fit (only a well-vented mould when dry). A bone-conduction device bypasses the diseased canal and middle ear. A middle-ear implant on the round window is another option.' },
  { id: 'atresia', g: 'Conductive', label: 'Canal atresia / microtia', m: { bte: 'N', ric: 'N', custom: 'N', bc: 'F', mei: 'S', ci: 'N', abi: 'N' },
    why: 'With no ear canal, air-conduction aids cannot deliver sound. Bone conduction is first choice: on a softband from infancy, and implanted once the skull is thick enough. Active middle-ear and transcutaneous bone-conduction implants are alternatives.' },
  { id: 'ome', g: 'Conductive', label: 'Otitis media with effusion (child)', m: { bte: 'C', ric: 'N', custom: 'N', bc: 'C', mei: 'N', ci: 'N', abi: 'N' },
    why: 'Usually watchful waiting for about three months, then grommets if it persists with hearing loss. A temporary aid or a bone-conduction softband can bridge the gap when surgery is not wanted.' },
  { id: 'wax', g: 'Conductive', label: 'Impacted cerumen', m: { bte: 'N', ric: 'N', custom: 'N', bc: 'N', mei: 'N', ci: 'N', abi: 'N' },
    why: 'Remove the wax and retest. No device is indicated.' },
  { id: 'ssd', g: 'Single-sided', label: 'Single-sided deafness', m: { bte: 'C', ric: 'N', custom: 'N', bc: 'S', mei: 'N', ci: 'S', abi: 'N' },
    why: 'A bone-conduction device on the deaf side routes sound through the skull to the good cochlea (transcranial CROS); a CROS aid does the same by wireless. Only a cochlear implant restores input to the deaf ear itself, and it is increasingly used for SSD.' },
  { id: 'vs', g: 'Retrocochlear', label: 'Vestibular schwannoma (unilateral, after treatment)', m: { bte: 'C', ric: 'N', custom: 'N', bc: 'S', mei: 'N', ci: 'C', abi: 'N' },
    why: 'The treated ear is often left with single-sided deafness, so bone-conduction or CROS routing is usual. A cochlear implant is possible only if the cochlear nerve is preserved and responds to promontory or intraoperative testing.' },
  { id: 'nf2', g: 'Retrocochlear', label: 'NF2: bilateral vestibular schwannomas', m: { bte: 'N', ric: 'N', custom: 'N', bc: 'N', mei: 'N', ci: 'C', abi: 'F' },
    why: 'When both cochlear nerves are lost, an auditory brainstem implant stimulates the cochlear nucleus directly, often placed at tumour removal. It mainly gives sound awareness and lip-reading support. If a nerve is anatomically and functionally preserved, a cochlear implant can do better.' },
  { id: 'aplasia', g: 'Retrocochlear', label: 'Cochlear nerve aplasia (child)', m: { bte: 'N', ric: 'N', custom: 'N', bc: 'N', mei: 'N', ci: 'C', abi: 'F' },
    why: 'Without a cochlear nerve, a cochlear implant has nothing to stimulate, so an auditory brainstem implant is considered. If MRI shows a thin nerve, some teams trial a cochlear implant first.' },
];
const condBy = (id) => CONDS.find((c) => c.id === id) || CONDS[0];
const status = (dev) => condBy(S.cond).m[dev];

// ================================================================ renderer
const stage = $('stage');
const LITE = MOBILE || COARSE; // phones/tablets: no MSAA, smaller pixel budget, glow buffers only on demand
const renderer = new THREE.WebGLRenderer({ antialias: !LITE, powerPreference: LITE ? 'default' : 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, LITE ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels-layer';
stage.appendChild(labelRenderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 4000);
camera.position.set(-260, 70, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 6; controls.maxDistance = 900;
scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x1a1512, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-220, 260, 180); scene.add(key);
const rim = new THREE.DirectionalLight(0x74d9ff, 0.9); rim.position.set(200, 120, -240); scene.add(rim);
const back = new THREE.DirectionalLight(0xffe2c8, 0.8); back.position.set(-150, 80, -260); scene.add(back);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(nanGuard());
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.72);
composer.addPass(bloom); composer.addPass(new OutputPass());
let compSized = false, ctxLost = false;
function sizeComp() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2); compSized = true; }
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ctxLost = true; const m = document.getElementById('loadMsg'), l = document.getElementById('loader'); if (m && l) { m.innerHTML = 'The graphics memory was reset by the device. <button type="button" onclick="location.reload()">Reload</button>'; l.classList.remove('done'); } });
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return; { const pr = Math.min(devicePixelRatio || 1, LITE ? 1.5 : 2, Math.sqrt((LITE ? 2.0e6 : 3.2e6) / (w * h))); if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr); } renderer.setSize(w, h, false); labelRenderer.setSize(w, h); compSized = false; if (S.glow) sizeComp();
  camera.aspect = w / h;
  if (!MOBILE && w > 900) camera.setViewOffset(w, h, w > 1280 ? 95 : 80, 45, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

// ================================================================ materials
function shellMat(hex, power = 2.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: 0 }, uPower: { value: power } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalMatrix*normal; vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uPower; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = vN; float ln = length(n); n = ln > 1e-6 ? n / ln : vec3(0.0, 0.0, 1.0); vec3 v = vV; float lv = length(v); v = lv > 1e-6 ? v / lv : vec3(0.0, 0.0, 1.0); float f = pow(max(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 1e-4), uPower); gl_FragColor = vec4(uColor*(0.25+1.25*f), uOpacity*(0.12+0.88*f)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0, transparent: true, ...o });
const dev = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.15, ...o });

// chapters: 0 overview · 1 BTE · 2 RIC · 3 custom · 4 BC · 5 MEI · 6 CI · 7 ABI · 8 choosing
const GROUP = {
  skin:           { make: () => shellMat(0x7fa6c4, 2.0), op: [0.3, 0.45, 0.45, 0.35, 0.4, 0.3, 0.3, 0.14, 0.3] },
  auricle:        { make: () => std(0xd49a86, { roughness: 0.62 }), op: [1, 1, 0.75, 0.5, 1, 0.55, 0.7, 0.2, 1] },
  bone:           { make: () => shellMat(0xd9c9a2, 2.6), op: [0.08, 0.05, 0.08, 0.12, 0.3, 0.16, 0.16, 0.08, 0.08] },
  ossicle:        { make: () => std(0xf1e4c2, { roughness: 0.38 }), op: [1, 0.9, 1, 1, 0.8, 1, 0.7, 0.4, 1] },
  tm:             { make: () => std(0xcfe6f6, { roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }), op: [0.8, 0.7, 0.8, 0.8, 0.5, 0.7, 0.4, 0.2, 0.8] },
  labyrinth:      { make: () => std(0xe3eef7, { roughness: 0.28, depthWrite: false, side: THREE.DoubleSide, emissive: 0x7d95ff, emissiveIntensity: 0 }), op: [0.6, 0.45, 0.5, 0.5, 0.7, 0.55, 0.5, 0.3, 0.6] },
  nerve:          { make: () => std(0xe2b84d, { emissive: 0x3a2800, roughness: 0.45 }), op: [0.9, 0.5, 0.5, 0.5, 0.6, 0.6, 0.9, 0.8, 0.9] },
  tube:           { make: () => std(0x7fc4aa, { depthWrite: false }), op: [0.3, 0.1, 0.1, 0.2, 0.2, 0.4, 0.2, 0.1, 0.3] },
  brainstem:      { make: () => shellMat(0xd79dab, 1.7), op: [0.4, 0.08, 0.08, 0.08, 0.1, 0.1, 0.15, 0.7, 0.4] },
  nucleus:        { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.15, roughness: 0.4 }), op: [0.9, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 1, 0.9] },
  auditoryCortex: { make: () => std(0x3fd2e6, { emissive: 0x19b6d0, emissiveIntensity: 0.15, roughness: 0.45 }), op: [0.9, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.6, 0.9] },
  cortex:         { make: () => shellMat(0x9b90d6, 1.8), op: [0.18, 0.03, 0.03, 0.03, 0.04, 0.04, 0.05, 0.12, 0.18] },
};
const meshes = {}, byName = {};
const setOp = (m, v) => { if (m.uniforms) m.uniforms.uOpacity.value = v; else m.opacity = v; };
const getOp = (m) => (m.uniforms ? m.uniforms.uOpacity.value : m.opacity);

// ================================================================ load
const W = {};
let chainPivot, stapesGroup, tmMat, tmN = new THREE.Vector3(), canal, particles;
const D = {}; // device groups
let eff = 1;
const lesions = {};
const spikes = [], glowNodes = {}, NODES = {}, EDGES = {};
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('../hearing-3d/ear.glb', (g) => {
  scene.add(g.scene); g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const ud = Object.keys(o.userData).length ? o.userData : o.parent.userData;
    const grp = ud.group || 'skin';
    o.material = (GROUP[grp] || GROUP.skin).make(); setOp(o.material, 0);
    o.userData.grp = grp; o.renderOrder = o.material.uniforms ? 2 : (o.material.depthWrite === false ? 1 : 0);
    (meshes[grp] = meshes[grp] || []).push(o); byName[ud.name || o.name] = o;
  });
  build();
  $('loader').classList.add('done');
  setChapter(0, true);
  setTimeout(() => { $('hint').style.opacity = 0; }, 6000);
}, (e) => { if (e.total) $('loadMsg').textContent = `Loading anatomy… ${Math.round((e.loaded / e.total) * 100)} %`; },
() => { $('loadMsg').textContent = 'The 3D model could not be loaded. Check the connection and reload the page.'; });
const centre = (n) => (byName[n] ? new THREE.Box3().setFromObject(byName[n]).getCenter(new THREE.Vector3()) : V(0, 0, 0));

// raycast from inside the head outward to the skin surface
const ray = new THREE.Raycaster();
function skinPoint(dir, from = W.cochlea) {
  ray.set(from, dir.clone().normalize());
  const hits = ray.intersectObjects((meshes.skin || []), false);
  const h = hits[0];
  if (!h) return { p: from.clone().addScaledVector(dir.clone().normalize(), 40), n: dir.clone().normalize() };
  const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
  if (n.dot(dir) < 0) n.negate();
  return { p: h.point.clone(), n };
}

function build() {
  Object.assign(W, {
    tm: centre('Tympanic membrane.r'), malleus: centre('Malleus.r'), incus: centre('Incus.r'), stapes: centre('Stapes.r'),
    cochlea: centre('Cochlea.r'), concha: centre('Cavity of concha.r'), tragus: centre('Tragus.r'), helix: centre('Helix.r'),
    acn: centre('Anterior cochlear nucleus.r'), pcn: centre('Posterior cochlear nucleus.r'),
    icR: centre('Inferior colliculus.r'), icL: centre('Inferior colliculus.l'), mgbR: centre('Medial geniculate body.r'), mgbL: centre('Medial geniculate body.l'),
    hgR: centre('Transverse temporal gyri.r'), hgL: centre('Transverse temporal gyri.l'), pons: centre('Pons.r'),
  });
  W.cn = W.acn.clone().lerp(W.pcn, 0.5);
  W.source = V(-215, 6, 18);
  W.contraCochlea = W.cochlea.clone().setX(-W.cochlea.x);
  buildMiddleEar(); buildCanal(); buildSource(); buildPathway(); buildLesions();
  buildBTE(); buildRIC(); buildCustom(); buildBC(); buildMEI(); buildCI(); buildABI(); buildRouteMarkers();
  buildLabels();
  refresh();
}

// ---------------------------------------------------------------- eardrum, ossicles
function buildMiddleEar() {
  const tm = byName['Tympanic membrane.r'], geo = tm.geometry, pos = geo.attributes.position, c = W.tm, wp = new THREE.Vector3();
  let rmax = 0; const d = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { wp.fromBufferAttribute(pos, i).applyMatrix4(tm.matrixWorld); d[i] = wp.distanceTo(c); rmax = Math.max(rmax, d[i]); }
  geo.setAttribute('aW', new THREE.BufferAttribute(d.map((x) => Math.max(0, 1 - (x / rmax) ** 2)), 1));
  // plane-fit normal
  const acc = new THREE.Vector3(), pts = [];
  for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 400))) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(tm.matrixWorld).sub(c));
  for (let i = 0; i < pts.length; i++) { const x = pts[i].clone().cross(pts[(i + 7) % pts.length]); if (x.dot(acc) < 0) x.negate(); acc.add(x); }
  tmN.copy(acc.lengthSq() ? acc : V(1, 0, 0)).normalize(); if (tmN.x < 0) tmN.negate();
  const inv = new THREE.Matrix4().copy(tm.matrixWorld).invert();
  const localN = tmN.clone().transformDirection(inv).multiplyScalar(1 / tm.matrixWorld.getMaxScaleOnAxis());
  tmMat = tm.material; tmMat.emissive = new THREE.Color(COL.air); tmMat.emissiveIntensity = 0;
  tmMat.onBeforeCompile = (sh) => { sh.uniforms.uDisp = { value: 0 }; sh.uniforms.uN = { value: localN }; tmMat.userData.sh = sh;
    sh.vertexShader = 'attribute float aW; uniform float uDisp; uniform vec3 uN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += uN * uDisp * aW;'); };
  chainPivot = new THREE.Group();
  const axis = W.malleus.clone().lerp(W.incus, 0.5); axis.y = Math.max(W.malleus.y, W.incus.y) + 1.2;
  chainPivot.position.copy(axis); scene.add(chainPivot); chainPivot.updateMatrixWorld();
  chainPivot.attach(byName['Malleus.r']); chainPivot.attach(byName['Incus.r']);
  stapesGroup = new THREE.Group(); scene.add(stapesGroup); stapesGroup.attach(byName['Stapes.r']);
  W.ow = W.stapes.clone().add(V(1.6, -0.3, 0.2)); W.rw = W.ow.clone().add(V(0.2, -3.2, 1.2));
  for (const n of ['Malleus.r', 'Incus.r', 'Stapes.r']) { const m = byName[n].material; m.emissive = new THREE.Color(COL.mech); m.emissiveIntensity = 0; }
}

// ---------------------------------------------------------------- ear canal + particles
function buildCanal() {
  const entry = W.concha.clone().lerp(W.tragus, 0.35).add(V(3, 1.5, 0));
  const end = W.tm.clone().sub(tmN.clone().multiplyScalar(1.2));
  const curve = new THREE.CatmullRomCurve3([entry, entry.clone().lerp(end, 0.33).add(V(0, 1.2, -1.2)), entry.clone().lerp(end, 0.66).add(V(0, 0.4, -0.4)), end]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 3.3, 28, false), shellMat(COL.air, 1.6)); tube.renderOrder = 3; scene.add(tube);
  const N = MOBILE ? 320 : 600, LUT = 200, lp = [], ln = [], lb = [];
  const fr = curve.computeFrenetFrames(LUT, false);
  for (let i = 0; i <= LUT; i++) { lp.push(curve.getPointAt(i / LUT)); ln.push(fr.normals[Math.min(i, LUT - 1)]); lb.push(fr.binormals[Math.min(i, LUT - 1)]); }
  const u = new Float32Array(N), ra = new Float32Array(N), an = new Float32Array(N);
  for (let i = 0; i < N; i++) { u[i] = Math.random(); ra[i] = Math.sqrt(Math.random()) * 2.6; an[i] = Math.random() * Math.PI * 2; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex(), size: 0.9, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.renderOrder = 4; scene.add(pts);
  canal = { curve, tube, lp, ln, lb, LUT, entry, end, frames: fr };
  particles = { pts, u, ra, an, N };
}
const lutAt = (a, s) => { const L = canal.LUT, x = clamp(s, 0, 1) * L, i = Math.min(L - 1, Math.floor(x)), f = x - i; return a[i].clone().lerp(a[i + 1] || a[i], f); };
const canalAt = (u) => canal.curve.getPointAt(clamp(u, 0, 1));

// ---------------------------------------------------------------- sound source + air wavefronts
const wavefronts = [];
function buildSource() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(7, 10, 10, 32, 1, true), std(0x9fb2c6, { opacity: 0.9, side: THREE.DoubleSide, metalness: 0.3 })); body.rotation.z = Math.PI / 2; g.add(body);
  const cone = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ color: COL.air, transparent: true, opacity: 0.7 })); cone.rotation.y = Math.PI / 2; cone.position.x = 5; g.add(cone);
  g.position.copy(W.source); g.lookAt(W.concha); g.rotateY(-Math.PI / 2); g.scale.setScalar(0.7); scene.add(g); W.sourceGlyph = g; W.sourceCone = cone;
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), shellMat(COL.air, 3.2)); m.material.blending = THREE.AdditiveBlending; m.visible = false; m.renderOrder = 5; m.userData.born = -99; scene.add(m); wavefronts.push(m); }
  // bone-conduction vibration shells
  W.boneWaves = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), shellMat(COL.mech, 2.6)); m.material.blending = THREE.AdditiveBlending; m.visible = false; m.renderOrder = 5; m.userData.born = -99; scene.add(m); W.boneWaves.push(m); }
  const cs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COL.fluid, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  cs.position.copy(W.contraCochlea); cs.scale.setScalar(12); scene.add(cs); W.contraGlow = cs;
  const cm = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.9, 12, 32), std(0xe3eef7, { opacity: 0.5 })); cm.position.copy(W.contraCochlea); cm.rotation.y = Math.PI / 2; scene.add(cm); W.contraMesh = cm;
}
let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (_glow = new THREE.CanvasTexture(c));
}

// ---------------------------------------------------------------- neural pathway
const node = (id, pos, side = 'i') => { NODES[id] = { id, pos, side }; };
const edge = (a, b, w, via = []) => { (EDGES[a] = EDGES[a] || []).push({ to: b, w, via }); };
function nerveCentreline() {
  const ms = ['Cochlear nerve', 'Vestibulocochlear nerve (VIII).r'].map((n) => byName[n]).filter(Boolean);
  const bins = 9, lo = W.cochlea.x + 2, hi = W.cn.x - 1, acc = Array.from({ length: bins }, () => [new THREE.Vector3(), 0]), v = new THREE.Vector3();
  for (const m of ms) { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); const k = Math.floor(((v.x - lo) / (hi - lo)) * bins); if (k >= 0 && k < bins) { acc[k][0].add(v); acc[k][1]++; } } }
  return acc.filter((a) => a[1]).map((a) => a[0].divideScalar(a[1]));
}
function buildPathway() {
  const cl = nerveCentreline();
  const socI = V(-4.2, W.cn.y - 3.6, W.cn.z + 2.5), socC = socI.clone().setX(4.2);
  const llI = V(W.icR.x - 3.2, (W.cn.y + W.icR.y) * 0.5, W.icR.z - 1), llC = llI.clone().setX(-llI.x);
  node('C0', W.cochlea.clone()); node('N2', cl[cl.length - 1] || W.cochlea.clone().lerp(W.cn, 0.8)); node('CN', W.cn);
  node('SOCi', socI); node('SOCc', socC, 'c'); node('LLi', llI); node('LLc', llC, 'c');
  node('ICi', W.icR); node('ICc', W.icL, 'c'); node('MGBi', W.mgbR); node('MGBc', W.mgbL, 'c'); node('HGi', W.hgR); node('HGc', W.hgL, 'c');
  edge('C0', 'N2', 1, cl.slice(0, cl.length - 1)); edge('N2', 'CN', 1);
  edge('CN', 'SOCi', 0.35); edge('CN', 'SOCc', 0.35, [V(0, socI.y - 0.8, socI.z)]); edge('CN', 'LLc', 0.3, [V(0, W.cn.y - 1.5, W.cn.z - 4)]);
  edge('SOCi', 'LLi', 0.5); edge('SOCi', 'LLc', 0.5, [V(0, socI.y + 1, socI.z)]); edge('SOCc', 'LLc', 0.8); edge('SOCc', 'LLi', 0.2, [V(0, socI.y + 1, socI.z)]);
  edge('LLi', 'ICi', 1); edge('LLc', 'ICc', 1); edge('ICi', 'MGBi', 0.85); edge('ICi', 'ICc', 0.15, [V(0, W.icR.y + 1, W.icR.z)]); edge('ICc', 'MGBc', 1);
  edge('MGBi', 'HGi', 1, [V(W.mgbR.x - 14, W.mgbR.y + 8, W.mgbR.z + 1)]); edge('MGBc', 'HGc', 1, [V(W.mgbL.x + 14, W.mgbL.y + 8, W.mgbL.z + 1)]);
  const lineMat = new THREE.LineBasicMaterial({ color: COL.neural, transparent: true, opacity: 0.22, depthWrite: false });
  W.tracts = new THREE.Group(); scene.add(W.tracts);
  for (const a in EDGES) for (const e of EDGES[a]) {
    e.curve = new THREE.CatmullRomCurve3([NODES[a].pos, ...e.via, NODES[e.to].pos]);
    e.dur = Math.max(0.35, e.curve.getLength() / 28);
    W.tracts.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(e.curve.getPoints(30)), lineMat));
  }
  const sph = (p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3, opacity: 0.95 })); m.position.copy(p); scene.add(m); return m; };
  W.relays = [sph(socI, 1.3), sph(socC, 1.3), sph(llI, 1), sph(llC, 1)];
  for (const id in NODES) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COL.neural, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(NODES[id].pos); s.scale.setScalar(6); s.renderOrder = 6; scene.add(s); glowNodes[id] = { sprite: s, v: 0 }; }
}
const spikePool = [];
function spawnSpike(at = 'C0', delay = 0) {
  let s = spikePool.pop();
  if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COL.neural, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.renderOrder = 7; scene.add(s); }
  s.visible = false; s.scale.setScalar(S.ch === 0 || S.ch === 8 ? 4.2 : 2.8);
  s.material.color.set(COL.neural).lerp(new THREE.Color(...P.freqRGB(S.f)), 0.45);
  spikes.push({ s, at, e: pick(at), u: -delay });
}
function pick(id) { const es = EDGES[id]; if (!es) return null; let r = Math.random() * es.reduce((a, e) => a + e.w, 0); for (const e of es) { r -= e.w; if (r <= 0) return e; } return es[es.length - 1]; }
function stepSpikes(dt) {
  for (let i = spikes.length - 1; i >= 0; i--) {
    const k = spikes[i]; if (!k.e) { recycle(i); continue; }
    k.u += dt / k.e.dur; if (k.u < 0) continue; k.s.visible = true;
    if (k.u >= 1) { glowNodes[k.e.to].v = Math.min(1.6, glowNodes[k.e.to].v + 0.45); k.at = k.e.to; k.u = 0; k.e = pick(k.at); if (!k.e) { recycle(i); continue; } }
    k.s.position.copy(k.e.curve.getPointAt(clamp(k.u, 0, 1)));
  }
}
function recycle(i) { const k = spikes[i]; k.s.visible = false; spikePool.push(k.s); spikes.splice(i, 1); }

// ---------------------------------------------------------------- lesions for the selected ear
function jitter(geo, a) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + a * Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) * Math.sin(v.z * 3.7)); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); }
function buildLesions() {
  const add = (k, m) => { m.visible = false; m.renderOrder = 3; scene.add(m); lesions[k] = m; return m; };
  const wax = add('wax', new THREE.Mesh(new THREE.IcosahedronGeometry(3.1, 3), std(0x8a5a22, { roughness: 0.9, emissive: 0x2a1500 }))); jitter(wax.geometry, 0.35); wax.position.copy(canalAt(0.42)); wax.scale.set(1.3, 1, 1);
  const plate = add('atresia', new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 2.2, 32), std(0xd9c9a2, { roughness: 0.8, emissive: 0x2a2010 })));
  plate.position.copy(canalAt(0.12)); plate.quaternion.setFromUnitVectors(V(0, 1, 0), canal.curve.getTangentAt(0.12));
  const hole = add('csom', new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: 0x020305, transparent: true, opacity: 0.95, side: THREE.DoubleSide })));
  hole.position.copy(W.tm.clone().add(V(0, -1.2, 1.2)).sub(tmN.clone().multiplyScalar(0.3))); hole.lookAt(hole.position.clone().add(tmN));
  const pus = add('csomFluid', new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([canalAt(0.55), canalAt(0.8), canalAt(0.98)]), 20, 1.6, 12), std(0xc9c05a, { opacity: 0.6, emissive: 0x3a3500 })));
  pus.position.y = -1.6;
  const fl = add('ome', new THREE.Mesh(new THREE.SphereGeometry(6.2, 40, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), std(0xd8b35a, { opacity: 0.55, emissive: 0x4a3200, side: THREE.DoubleSide, depthWrite: false })));
  fl.position.copy(W.malleus.clone().lerp(W.stapes, 0.5).add(V(0, 0.8, 0))); fl.scale.set(0.9, 1.1, 1.25);
  const foc = add('otosclerosis', new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 3), std(0xe2884d, { roughness: 0.95, emissive: 0x3a1400 }))); jitter(foc.geometry, 0.45); foc.position.copy(W.ow);
  const vs = add('vs', new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 4), std(0xe79a6a, { roughness: 0.7, emissive: 0x3a1a08 }))); jitter(vs.geometry, 0.3);
  vs.position.copy(EDGES.C0[0].curve.getPointAt(0.55));
  const vsL = add('vsL', vs.clone()); vsL.position.x = -vs.position.x;
}

// ---------------------------------------------------------------- device helpers
const tubeOn = (pts, r, m, seg = 40) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 16, false), m);
function capsule(a, b, r, m) {
  const g = new THREE.Group(); const c = new THREE.CatmullRomCurve3([a, b]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 8, r, 20, false), m));
  for (const p of [a, b]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); s.position.copy(p); g.add(s); }
  return g;
}
function curvedCase(pts, r, m) {
  const g = new THREE.Group(), c = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 22, false), m));
  for (const p of [pts[0], pts[pts.length - 1]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); s.position.copy(p); g.add(s); }
  g.userData.curve = c; return g;
}
function disc(p, n, r, h, m) { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), m); d.position.copy(p); d.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().normalize()); return d; }
function led(p, hex = COL.elec, r = 0.6) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshBasicMaterial({ color: hex })); s.position.copy(p); return s; }
function curveThrough(pts) { return new THREE.CatmullRomCurve3(pts); }
function devGroup(id) { const g = new THREE.Group(); g.visible = false; scene.add(g); D[id] = { g, routes: [], mic: null }; return D[id]; }

// behind-the-ear geometry from the real auricle
function btePath(scale = 1) {
  const h = byName['Helix.r'], bb = new THREE.Box3().setFromObject(h);
  const top = V(bb.max.x - 6, bb.max.y - 3, bb.min.z + 9);
  const midB = V(bb.max.x - 4, bb.max.y - 13 * scale, bb.min.z + 1.5);
  const low = V(bb.max.x - 3, bb.max.y - 24 * scale, bb.min.z + 0.8);
  return { top, pts: [top, midB, low], bb };
}

// ---------------------------------------------------------------- BTE
function buildBTE() {
  const d = devGroup('bte'), g = d.g;
  const shell = dev(0xc9ced6, { metalness: 0.25 });
  const { top, pts, bb } = btePath(1);
  const cs = curvedCase(pts, 3.4, shell); g.add(cs);
  const clear = new THREE.MeshPhysicalMaterial({ color: 0xdfeff7, roughness: 0.1, transmission: 0, transparent: true, opacity: 0.55 });
  const hook = [top, V(top.x - 1.5, bb.max.y + 2.5, top.z + 6), V(top.x - 1, bb.max.y + 1, top.z + 14), V(top.x + 2.5, bb.max.y - 6, top.z + 18)];
  g.add(tubeOn(hook, 1.25, clear));
  const entry = canal.entry;
  const tub = [hook[3], V((hook[3].x + entry.x) / 2 + 1, (hook[3].y + entry.y) / 2, hook[3].z + 1), entry.clone().add(V(-2.5, 2.5, 1.5))];
  g.add(tubeOn(tub, 0.9, clear));
  // earmould: concha bowl + canal stem
  const mould = std(0xe79d98, { opacity: 0.88, roughness: 0.25 });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mould); bowl.position.copy(W.concha.clone().add(V(2.2, 1.2, 1.2))); bowl.scale.set(3.2, 5.2, 5.6); g.add(bowl);
  g.add(canalPlug(0, 0.3, 2.9, mould));
  for (const [k, o] of [[0, 0.4], [1, 3.6]]) g.add(led(top.clone().add(V(-1.5 - k * 0.3, 2.8 - k * 1.1, -1.8 - o)), 0x1b1f26, 0.45));
  d.mic = top.clone().add(V(-1.5, 2.8, -2.2));
  d.chip = led(cs.userData.curve.getPointAt(0.45).add(V(-2.6, 0, 0)), COL.elec, 0.7); g.add(d.chip);
  d.out = 0.3; // acoustic output enters the canal here (u)
  d.routes = [
    { c: curveThrough([d.mic, cs.userData.curve.getPointAt(0.45)]), k: 'elec' },
    { c: curveThrough([cs.userData.curve.getPointAt(0.45), top, ...hook.slice(1), ...tub.slice(1), canalAt(0.15), canalAt(0.3)]), k: 'air' },
  ];
  d.labels = [['Microphones', d.mic.clone().add(V(-2, 3, 0))], ['Processor + receiver in case', cs.userData.curve.getPointAt(0.55).add(V(-4, 0, -2))], ['Ear hook', hook[2].clone().add(V(-2, 2.5, 0))], ['Tubing', tub[1]], ['Custom earmould', bowl.position.clone().add(V(-4, -4, 3))]];
}
function canalPlug(u0, u1, r, m) {
  const pts = []; for (let i = 0; i <= 12; i++) pts.push(canalAt(u0 + (u1 - u0) * (i / 12)));
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 20, false), m));
  for (const p of [pts[0], pts[pts.length - 1]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); s.position.copy(p); s.scale.setScalar(0.98); g.add(s); }
  g.userData.lateral = pts[0]; g.userData.medial = pts[pts.length - 1];
  return g;
}

// ---------------------------------------------------------------- RIC
function buildRIC() {
  const d = devGroup('ric'), g = d.g;
  const { top, pts, bb } = btePath(0.75);
  const cs = curvedCase(pts, 2.6, dev(0x3a414c, { metalness: 0.35 })); g.add(cs);
  const wire = [top, V(top.x - 1.2, bb.max.y + 2, top.z + 6), V(top.x - 0.5, bb.max.y + 0.5, top.z + 14), V(top.x + 3, bb.max.y - 8, top.z + 17.5), canal.entry.clone().add(V(-2, 2.5, 1.2)), canalAt(0.2), canalAt(0.45)];
  g.add(tubeOn(wire, 0.32, dev(0x2a2f37), 80));
  const t = canal.curve.getTangentAt(0.55);
  const rc = capsule(canalAt(0.47), canalAt(0.62), 1.45, dev(0x2a2f37, { metalness: 0.3 })); g.add(rc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.9, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), std(0xe8eef2, { opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  dome.position.copy(canalAt(0.67)); dome.quaternion.setFromUnitVectors(V(0, 1, 0), t.clone().negate()); g.add(dome);
  d.mic = top.clone().add(V(-1.2, 2.3, -1.8)); g.add(led(d.mic, 0x10131a, 0.4));
  d.chip = led(cs.userData.curve.getPointAt(0.45).add(V(-2, 0, 0)), COL.elec, 0.6); g.add(d.chip);
  d.out = 0.68; d.open = true;
  d.routes = [{ c: curveThrough([d.mic, ...wire.slice(1), canalAt(0.55)]), k: 'elec' }];
  d.labels = [['Case: microphones + processor', cs.userData.curve.getPointAt(0.4).add(V(-4, 0, -2))], ['Thin wire', wire[3].clone().add(V(-2, 2, 0))], ['Receiver in the canal', canalAt(0.55).add(V(0, 4.5, 0))], ['Open dome', canalAt(0.7).add(V(0, -4.5, 1))]];
}

// ---------------------------------------------------------------- custom ITE / ITC / CIC / IIC
const CUSTOM = { ite: { u: [0, 0.34], bowl: 1, label: 'ITE · in the ear' }, itc: { u: [0.02, 0.42], bowl: 0.45, label: 'ITC · in the canal' }, cic: { u: [0.14, 0.56], bowl: 0, label: 'CIC · completely in canal' }, iic: { u: [0.36, 0.8], bowl: 0, label: 'IIC · invisible in canal' } };
function buildCustom() {
  const d = devGroup('custom'); d.variants = {};
  for (const [k, v] of Object.entries(CUSTOM)) {
    const g = new THREE.Group(); d.g.add(g);
    const m = std(0xc58b78, { opacity: 0.96, roughness: 0.35 });
    const plug = canalPlug(v.u[0], v.u[1], 2.95, m); g.add(plug);
    let face = plug.userData.lateral;
    if (v.bowl) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), m); b.position.copy(W.concha.clone().add(V(2.4, 1, 1)).lerp(canal.entry, 1 - v.bowl)); b.scale.set(2.2 * v.bowl + 1.4, 4.2 * v.bowl + 2.3, 4.6 * v.bowl + 2.3); g.add(b); face = b.position.clone().add(V(-2.2 * v.bowl - 1.3, 0, 0)); }
    const fp = disc(face, V(-1, 0, 0.2), v.bowl ? 2.6 : 2.2, 0.4, dev(0x3c434e)); g.add(fp);
    g.add(led(face.clone().add(V(-0.4, 1.1, 0.4)), 0x0d1016, 0.35));
    if (k === 'cic' || k === 'iic') g.add(tubeOn([face, face.clone().add(V(-3, -1.5, 0.6)), face.clone().add(V(-5.5, -1.2, 1))], 0.12, dev(0x2a2f37)));
    d.variants[k] = { g, mic: face.clone().add(V(-0.6, 1.1, 0.4)), out: v.u[1] + 0.02 };
  }
  d.routes = [];
  d.labels = [['Faceplate microphone', () => d.variants[S.custom].mic.clone().add(V(-2, 2.2, 0))], ['Receiver at the medial tip', () => canalAt(CUSTOM[S.custom].u[1]).add(V(0, 4, 0))]];
}

// ---------------------------------------------------------------- bone conduction
function buildBC() {
  const d = devGroup('bc'), g = d.g;
  const sp = skinPoint(V(-0.62, 0.22, -0.75));
  const n = sp.n, p = sp.p;
  d.site = p.clone(); d.n = n.clone();
  const ti = dev(0xb8c2cc, { metalness: 0.75, roughness: 0.25 });
  d.perc = new THREE.Group(); g.add(d.perc);
  d.perc.add(disc(p.clone().addScaledVector(n, -4), n, 1.9, 4.5, ti));
  d.perc.add(disc(p.clone().addScaledVector(n, 1), n, 1.7, 6, ti));
  d.trans = new THREE.Group(); g.add(d.trans);
  d.trans.add(disc(p.clone().addScaledVector(n, -3.5), n, 6.5, 1.8, ti));
  d.trans.add(disc(p.clone().addScaledVector(n, -2.6), n, 2.5, 1.2, dev(0x6c7480, { metalness: 0.6 })));
  const proc = new THREE.Mesh(new RoundedBoxGeometry(17, 23, 8, 4, 3.2), dev(0x444c58, { metalness: 0.2 }));
  proc.position.copy(p.clone().addScaledVector(n, 7.5)); proc.quaternion.setFromUnitVectors(V(0, 0, 1), n);
  const up = V(0, 1, 0).projectOnPlane(n).normalize(); const qa = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0).applyQuaternion(proc.quaternion), up); proc.quaternion.premultiply(qa);
  g.add(proc); d.proc = proc;
  d.mic = proc.position.clone().add(up.clone().multiplyScalar(11.5)); g.add(led(d.mic, 0x0d1016, 0.5));
  d.chip = led(proc.position.clone().addScaledVector(n, 4.2), COL.elec, 0.8); g.add(d.chip);
  d.routes = [{ c: curveThrough([d.mic, proc.position, p]), k: 'elec' }];
  d.labels = [['Sound processor', proc.position.clone().add(up.clone().multiplyScalar(14))], [() => (S.bc === 'perc' ? 'Titanium abutment + fixture (osseointegrated)' : 'Implanted magnet under intact skin'), p.clone().addScaledVector(n, -4).add(V(0, -6, 0))], ['Contralateral cochlea', W.contraCochlea.clone().add(V(0, 5, 0))]];
}

// ---------------------------------------------------------------- middle-ear implant (VSB-type)
function buildMEI() {
  const d = devGroup('mei'), g = d.g;
  const sp = skinPoint(V(-0.5, 0.52, -0.7)); const n = sp.n, p = sp.p;
  const proc = disc(p.clone().addScaledVector(n, 3), n, 12, 5, dev(0x3a414c, { metalness: 0.2 })); g.add(proc);
  const recv = disc(p.clone().addScaledVector(n, -3.5), n, 11, 2.6, dev(0xdfe5ea, { roughness: 0.5 })); g.add(recv);
  const fmt = W.incus.clone().add(V(0.9, -3.2, 0.6));
  const link = [recv.position, W.cochlea.clone().add(V(-18, 8, -16)), W.incus.clone().add(V(-4, 0.5, -6)), fmt];
  g.add(tubeOn(link, 0.35, dev(0xdfe5ea)));
  const f = capsule(fmt.clone().add(V(0, 0.9, 0)), fmt.clone().add(V(0, -0.9, 0)), 0.85, dev(0xd9b45a, { metalness: 0.6, emissive: 0x3a2800 })); g.add(f); d.fmt = f; d.fmtPos = fmt;
  d.mic = proc.position.clone().addScaledVector(n, 2.6); d.chip = led(proc.position.clone().addScaledVector(n, 2.7), COL.elec, 0.8); g.add(d.chip);
  d.routes = [{ c: curveThrough([d.mic, proc.position, recv.position]), k: 'elec', rf: true }, { c: curveThrough(link), k: 'elec' }];
  d.labels = [['Audio processor (magnet)', proc.position.clone().add(V(0, 14, 0))], ['Implant receiver', recv.position.clone().add(V(0, -13, 0))], ['Conductor link', link[1]], ['FMT on the long process of incus', fmt.clone().add(V(0, -2.5, 1.5))]];
}

// ---------------------------------------------------------------- cochlear implant (+ magnified array)
const NB = 360, TURNS = 2.6, NE = 12;
function buildCI() {
  const d = devGroup('ci'), g = d.g;
  const { top, pts } = btePath(1.05);
  const cs = curvedCase(pts, 3.7, dev(0x30363f, { metalness: 0.3 })); g.add(cs);
  const sp = skinPoint(V(-0.42, 0.62, -0.66)); const n = sp.n, p = sp.p;
  const coil = disc(p.clone().addScaledVector(n, 2.2), n, 15, 3.6, dev(0x30363f, { metalness: 0.25 })); g.add(coil);
  g.add(disc(p.clone().addScaledVector(n, 4.1), n, 4, 0.6, dev(0x8a929c, { metalness: 0.7 })));
  g.add(tubeOn([top, top.clone().add(V(-2.5, 8, -4)), p.clone().addScaledVector(n, 3).add(V(0, -12, 4))], 0.55, dev(0x30363f)));
  const recv = disc(p.clone().addScaledVector(n, -4), n, 12, 3.2, dev(0xdfe5ea, { roughness: 0.45 })); g.add(recv);
  const body = new THREE.Mesh(new RoundedBoxGeometry(10, 14, 4, 3, 1.8), dev(0xb8c2cc, { metalness: 0.7, roughness: 0.25 }));
  body.position.copy(recv.position.clone().add(V(0, -12, 6))); body.quaternion.setFromUnitVectors(V(0, 0, 1), n); g.add(body);
  const lead = [body.position, W.cochlea.clone().add(V(-17, 7, -15)), W.stapes.clone().add(V(-4.5, -3, -5)), W.rw];
  g.add(tubeOn(lead, 0.5, dev(0xe8eef2)));
  d.mic = top.clone().add(V(-1.4, 3, -2)); g.add(led(d.mic, 0x0d1016, 0.45));
  d.chip = led(cs.userData.curve.getPointAt(0.45).add(V(-3, 0, 0)), COL.elec, 0.7); g.add(d.chip);
  d.coil = coil; d.recv = recv;
  d.routes = [{ c: curveThrough([d.mic, cs.userData.curve.getPointAt(0.45), top, top.clone().add(V(-2.5, 8, -4)), coil.position]), k: 'elec' },
    { c: curveThrough([coil.position, recv.position]), k: 'rf' },
    { c: curveThrough([recv.position, ...lead]), k: 'elec' }];
  d.inset = buildArrayInset();
  d.labels = [['Sound processor (behind the ear)', cs.userData.curve.getPointAt(0.55).add(V(-4, 0, -2))], ['Transmitter coil + magnet', coil.position.clone().add(V(0, 17, 0))], ['Receiver–stimulator (implanted)', body.position.clone().add(V(0, -10, 0))], ['Electrode lead → round window', lead[2].clone().add(V(-2, -3, 0))]];
}
function buildArrayInset() {
  const g = new THREE.Group(); g.position.copy(W.cochlea.clone().add(V(-22, -32, 48))); g.scale.setScalar(1.6);
  const th = (d) => (d / P.LEN) * TURNS * Math.PI * 2, rad = (d) => 8 * (1 - 0.6 * (d / P.LEN)), hgt = (d) => 8.5 * Math.pow(d / P.LEN, 0.85), wid = (d) => 0.7 + 1.9 * (d / P.LEN);
  const at = (d, r, y = 0) => V(Math.cos(th(d)) * r, hgt(d) + y, Math.sin(th(d)) * r);
  const duct = new THREE.CatmullRomCurve3(Array.from({ length: 120 }, (_, i) => at((i / 119) * P.LEN, rad((i / 119) * P.LEN))));
  const shell = new THREE.Mesh(new THREE.TubeGeometry(duct, 260, 1.9, 20, false), shellMat(COL.fluid, 1.7)); shell.renderOrder = 3; g.add(shell);
  const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.6, 9, 24, 1, true), shellMat(0xd9c9a2, 2)); mod.position.y = 4.5; g.add(mod);
  // BM ribbon (static colour = tonotopic map)
  const pos = new Float32Array(NB * 6), col = new Float32Array(NB * 6), idx = [];
  for (let i = 0; i < NB - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  for (let i = 0; i < NB; i++) { const dd = (i / (NB - 1)) * P.LEN, c = P.freqRGB(P.cfAt(dd)); const a = at(dd, rad(dd) - wid(dd) / 2), b = at(dd, rad(dd) + wid(dd) / 2);
    pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); col.set([...c.map((v) => v * 0.35), ...c.map((v) => v * 0.35)], i * 6); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })));
  // electrode array in scala tympani: 12 contacts over ~24 mm from the round window
  const DEPTH = 24, carrierPts = [], contacts = [];
  for (let i = 0; i <= 60; i++) { const dd = 0.3 + (i / 60) * DEPTH; carrierPts.push(at(dd, rad(dd) + 0.6, -1.25)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([at(0, rad(0) + 6, -1.2), ...carrierPts]), 120, 0.42, 10, false), dev(0xe8eef2, { transparent: true, opacity: 0.9 })));
  for (let e = 0; e < NE; e++) {
    const dd = 1.5 + (e / (NE - 1)) * (DEPTH - 2);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf2f4f7, metalness: 0.8, roughness: 0.2, emissive: COL.elec, emissiveIntensity: 0 }));
    m.position.copy(at(dd, rad(dd) + 0.6, -1.25)); g.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: COL.elec, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.copy(at(dd, rad(dd) - 0.8, -0.4)); glow.scale.setScalar(3.5); g.add(glow);
    contacts.push({ m, glow, d: dd, cf: P.cfAt(dd) });
  }
  scene.add(g);
  const lead = new THREE.Line(new THREE.BufferGeometry().setFromPoints([W.cochlea, g.position.clone().add(V(0, 5, 0))]), new THREE.LineDashedMaterial({ color: COL.fluid, dashSize: 1.5, gapSize: 1, transparent: true, opacity: 0.6 }));
  lead.computeLineDistances(); scene.add(lead);
  return { g, contacts, lead, at, rad };
}
// 12 analysis bands, 200 Hz – 8 kHz, log spaced; highest band → most basal contact
const BANDS = Array.from({ length: NE + 1 }, (_, i) => 200 * Math.pow(8000 / 200, i / NE));
function channelEnergies(f, level) {
  const kf = Math.log(f / 200) / Math.log(8000 / 200) * NE - 0.5;
  const e = clamp((level - 25) / 55, 0, 1); // acoustic 25–80 dB SPL → electrical T–C range
  return Array.from({ length: NE }, (_, band) => e * Math.exp(-((band - kf) ** 2) / (2 * 0.55 ** 2)));
}

// ---------------------------------------------------------------- ABI
function buildABI() {
  const d = devGroup('abi'), g = d.g;
  const { top, pts } = btePath(1.05);
  g.add(curvedCase(pts, 3.7, dev(0x30363f, { metalness: 0.3 })));
  const sp = skinPoint(V(-0.42, 0.62, -0.66)); const n = sp.n, p = sp.p;
  const coil = disc(p.clone().addScaledVector(n, 2.2), n, 15, 3.6, dev(0x30363f, { metalness: 0.25 })); g.add(coil);
  g.add(tubeOn([top, top.clone().add(V(-2.5, 8, -4)), p.clone().addScaledVector(n, 3).add(V(0, -12, 4))], 0.55, dev(0x30363f)));
  const recv = disc(p.clone().addScaledVector(n, -4), n, 12, 3.2, dev(0xdfe5ea, { roughness: 0.45 })); g.add(recv);
  const paddle = W.cn.clone().add(V(-2.4, 0.2, -0.8));
  const lead = [recv.position, W.cochlea.clone().add(V(-12, 12, -24)), V(-26, 2, -26), V(-14, 0, -18), paddle];
  g.add(tubeOn(lead, 0.45, dev(0xe8eef2), 80));
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.8, 3.2, 5.5, 2, 0.35), dev(0xe8eef2)); pad.position.copy(paddle); g.add(pad);
  d.contacts = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2f4f7, metalness: 0.8, roughness: 0.2, emissive: COL.elec, emissiveIntensity: 0 }));
    m.position.copy(paddle.clone().add(V(0.45, -1 + r, -1.9 + c * 1.25))); g.add(m); d.contacts.push(m);
  }
  d.mic = top.clone().add(V(-1.4, 3, -2)); g.add(led(d.mic, 0x0d1016, 0.45));
  d.chip = led(pts[1].clone().add(V(-3, 0, 0)), COL.elec, 0.7); g.add(d.chip);
  d.routes = [{ c: curveThrough([d.mic, pts[1], top, coil.position]), k: 'elec' }, { c: curveThrough([coil.position, recv.position]), k: 'rf' }, { c: curveThrough(lead), k: 'elec' }];
  d.labels = [['Receiver–stimulator', recv.position.clone().add(V(0, -13, 0))], ['Lead to the brainstem', lead[2]], ['Electrode paddle on the cochlear nucleus', paddle.clone().add(V(-1, 4, 0))]];
}

// ---------------------------------------------------------------- overview route markers
function buildRouteMarkers() {
  W.markers = [];
  const mk = (p, hex) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(p); s.scale.setScalar(9); scene.add(s); W.markers.push(s); return s; };
  mk(canalAt(0.6), COL.air); mk(D.bc.site, COL.mech); mk(D.mei.fmtPos, COL.mech); mk(W.cochlea, COL.elec); mk(W.cn, COL.elec);
}

// ================================================================ labels
const LABELS = [];
function label(text, posFn, chs, opts = {}) {
  const el = document.createElement('div'); el.className = 'tag'; el.innerHTML = '<div class="in"><span></span></div>';
  if (opts.color) el.style.setProperty('--c', opts.color);
  const o = new CSS2DObject(el); scene.add(o);
  LABELS.push({ o, el, span: el.querySelector('span'), text, posFn: typeof posFn === 'function' ? posFn : () => posFn, chs, cond: opts.cond, when: opts.when });
}
function buildLabels() {
  const chOf = { bte: 1, ric: 2, custom: 3, bc: 4, mei: 5, ci: 6, abi: 7 };
  const colOf = { bte: CSS.air, ric: CSS.air, custom: CSS.air, bc: CSS.mech, mei: CSS.mech, ci: CSS.elec, abi: CSS.elec };
  for (const id of DEVICES) for (const [t, p] of D[id].labels) label(t, p, [chOf[id]], { color: colOf[id] });
  label('Air-conduction aids → ear canal', canalAt(0.2).add(V(-4, -9, 6)), [0], { color: CSS.air });
  label('Bone conduction → skull', D.bc.site.clone().add(V(0, 7, 0)), [0], { color: CSS.mech });
  label('Middle-ear implant → incus', D.mei.fmtPos.clone().add(V(0, 7, -3)), [0], { color: CSS.mech });
  label('Cochlear implant → spiral ganglion', W.cochlea.clone().add(V(4, -7, 4)), [0], { color: CSS.elec });
  label('ABI → cochlear nucleus', W.cn.clone().add(V(0, 5, 0)), [0], { color: CSS.elec });
  label('Eardrum', W.tm.clone().add(V(0, -6, 1)), [1, 2, 3], { color: CSS.air });
  label('Ossicles', W.malleus.clone().add(V(0, 4, 0)), [5], { color: CSS.mech });
  label('Base · high-frequency channels', () => D.ci.inset.g.localToWorld(D.ci.inset.at(0, D.ci.inset.rad(0) + 4, 0)), [6], { color: CSS.fluid });
  label('Apex (beyond the array)', () => D.ci.inset.g.localToWorld(D.ci.inset.at(P.LEN, 0.5, 1.5)), [6], { color: CSS.fluid });
  label('', () => { const c = D.ci.inset.contacts[NE - 1]; return D.ci.inset.g.localToWorld(c.m.position.clone().add(V(0, 1.5, 0))); }, [6], { color: CSS.elec, id: 'apical' });
  label('Cochlear nuclei', W.cn.clone().add(V(0, -4, 0)), [7], { color: CSS.neural });
  label("Heschl's gyrus", W.hgR.clone().add(V(0, 5, 0)), [8], { color: CSS.air });
  label('Wax', () => lesions.wax.position.clone().add(V(0, 4.5, 0)), [1, 2, 3], { color: CSS.bad, cond: 'wax' });
  label('No ear canal (atresia)', () => lesions.atresia.position.clone().add(V(0, 5, 0)), [0, 1, 2, 3, 4, 8], { color: CSS.bad, cond: 'atresia' });
  label('Perforation + discharge', () => lesions.csom.position.clone().add(V(0, -4, 2)), [1, 2, 3, 4, 5], { color: CSS.bad, cond: 'csom' });
  label('Vestibular schwannoma', () => lesions.vs.position.clone().add(V(0, 5, 0)), [0, 6, 7, 8], { color: CSS.bad, when: () => ['vs', 'nf2'].includes(S.cond) });
}
function updateLabels() {
  for (const L of LABELS) {
    const on = S.labels && L.chs.includes(S.ch) && (!L.cond || L.cond === S.cond) && (!L.when || L.when());
    L.el.style.opacity = on ? 1 : 0;
    if (!on) continue;
    const t = typeof L.text === 'function' ? L.text() : L.text;
    if (L.text === '' && S.ch === 6) { const c = D.ci.inset.contacts[NE - 1]; L.span.textContent = `Most apical contact ≈ ${P.fmtF(c.cf)} place, carries ${P.fmtF(Math.sqrt(BANDS[0] * BANDS[1]))}`; }
    else if (L.span.textContent !== t) L.span.textContent = t;
    L.o.position.copy(L.posFn());
  }
}

// ================================================================ chapters
const CHAIN = {
  bte: [['Microphones', 'acoustic → electric', CSS.air], ['Processor: WDRC, gain per channel, noise reduction', 'electric', CSS.elec], ['Receiver in the case', 'electric → acoustic', CSS.air], ['Ear hook, tubing, earmould', 'acoustic', CSS.air], ['Eardrum and ossicles', 'mechanical', CSS.mech], ['Cochlea and hair cells', 'hydromechanical', CSS.fluid], ['Auditory nerve → cortex', 'neural', CSS.neural]],
  ric: [['Microphones in the case', 'acoustic → electric', CSS.air], ['Processor', 'electric', CSS.elec], ['Thin wire to the canal', 'electric', CSS.elec], ['Receiver in the canal', 'electric → acoustic', CSS.air], ['Eardrum and ossicles', 'mechanical', CSS.mech], ['Cochlea and hair cells', 'hydromechanical', CSS.fluid], ['Auditory nerve → cortex', 'neural', CSS.neural]],
  custom: [['Faceplate microphone (keeps pinna cues when deep)', 'acoustic → electric', CSS.air], ['Processor in the shell', 'electric', CSS.elec], ['Receiver at the medial tip', 'electric → acoustic', CSS.air], ['Residual canal volume → eardrum', 'acoustic', CSS.air], ['Ossicles and cochlea', 'mechanical / fluid', CSS.mech], ['Auditory nerve → cortex', 'neural', CSS.neural]],
  bc: [['Microphone', 'acoustic → electric', CSS.air], ['Processor', 'electric', CSS.elec], ['Transducer vibrates', 'electric → mechanical', CSS.mech], ['Abutment or magnet → skull', 'bone vibration', CSS.mech], ['Both cochleae (canal and middle ear bypassed)', 'hydromechanical', CSS.fluid], ['Auditory nerve → cortex', 'neural', CSS.neural]],
  mei: [['Microphone in the audio processor', 'acoustic → electric', CSS.air], ['Processor → transcutaneous link', 'electric / RF', CSS.elec], ['Implant receiver → conductor link', 'electric', CSS.elec], ['FMT vibrates the incus (or round window)', 'mechanical', CSS.mech], ['Stapes → cochlea', 'hydromechanical', CSS.fluid], ['Auditory nerve → cortex', 'neural', CSS.neural]],
  ci: [['Microphone', 'acoustic → electric', CSS.air], ['Filter bank → envelopes → map (T to C levels)', 'electric', CSS.elec], ['Coil: data + power by RF through the skin', 'RF', CSS.elec], ['Receiver–stimulator: biphasic pulses', 'electric', CSS.elec], ['Electrodes in scala tympani (tonotopic)', 'electric', CSS.elec], ['Spiral ganglion neurons (hair cells bypassed)', 'neural', CSS.neural], ['Auditory nerve → cortex', 'neural', CSS.neural]],
  abi: [['Microphone + processor', 'acoustic → electric', CSS.air], ['Coil → receiver–stimulator', 'RF / electric', CSS.elec], ['Paddle on the cochlear nucleus', 'electric', CSS.elec], ['Brainstem relays (cochlea and nerve bypassed)', 'neural', CSS.neural], ['Auditory cortex', 'neural', CSS.neural]],
};
const CH = [
  { id: null, k: 'Overview', t: 'Four ways into the auditory system', sig: CSS.air, cam: [V(-250, 70, 205), V(-22, 12, -6)],
    body: () => `<p>Every device takes over one step of the pathway. <b style="color:${CSS.air}">Hearing aids</b> make sound louder and still need the outer ear, middle ear and hair cells. <b style="color:${CSS.mech}">Bone-conduction devices</b> vibrate the skull and skip the canal and middle ear. <b style="color:${CSS.mech}">Middle-ear implants</b> drive the ossicles directly. <b style="color:${CSS.elec}">Cochlear implants</b> skip the hair cells and stimulate the spiral ganglion. <b style="color:${CSS.elec}">Auditory brainstem implants</b> skip the cochlea and nerve and stimulate the cochlear nucleus.</p>
      <p>Pick the ear's diagnosis below. Each device is then marked as first choice, suitable, worth considering, or not indicated. The nerve activity in each view shows how well that route works for this ear.</p>` },
  { id: 'bte', k: 'Air conduction · 1', t: 'Behind-the-ear hearing aid', sig: CSS.air, cam: [V(-175, 52, -96), V(-80, 6, -6)],
    body: () => `<p>The case behind the pinna holds two microphones, the processor, the receiver (loudspeaker) and the battery. Amplified sound runs through the ear hook and tubing to a custom earmould sealed in the canal.</p>
      <p>The processor splits sound into channels and applies <b>wide dynamic range compression</b>: more gain for soft sounds, less for loud. Loud sounds stay comfortable despite recruitment. Gain per channel is set from the audiogram with a prescriptive formula (NAL-NL2 or DSL v5) and checked with real-ear measurement.</p>`,
    facts: [['mild → profound', 'fitting range (power models)'], ['children', 'first choice: robust, remote-mic compatible, moulds remade as the ear grows']] },
  { id: 'ric', k: 'Air conduction · 2', t: 'Receiver-in-canal hearing aid', sig: CSS.air, cam: [V(-150, 48, -80), V(-72, 4, -6)],
    body: () => `<p>Only the microphones and processor sit behind the ear. A thin wire carries the electrical signal to a receiver in the canal. With an <b>open dome</b>, low-frequency sound still enters naturally and the occlusion effect (own voice sounding boomy) disappears.</p>
      <p>This makes RIC the usual fit for sloping high-frequency loss. The receiver sits in the canal, so it needs wax guards and moisture care. Feedback limits gain with open fittings; closed domes and power receivers extend the range.</p>`,
    facts: [['mild → severe', 'range depends on receiver power'], ['open fit', 'natural low frequencies, no occlusion']] },
  { id: 'custom', k: 'Air conduction · 3', t: 'Custom in-ear hearing aids', sig: CSS.air, cam: [V(-128, 22, 50), V(-64, -2, -4)], sub: 'custom',
    body: () => `<p>A shell made from an ear impression holds everything. The deeper the aid, the more it keeps the pinna's natural spectral cues and reduces wind noise, and the less visible it is. The trade-offs are a smaller battery, fewer features (no directional microphones or telecoil in the smallest), less power, harder handling, and more exposure to wax and moisture.</p>
      <p>${{ ite: '<b>ITE</b> fills the concha: most power and features of the custom styles, suits mild to severe loss.', itc: '<b>ITC</b> fills the canal opening and part of the concha: a compromise between size and features.', cic: '<b>CIC</b> sits entirely in the canal with a removal string: mild to moderate loss, good dexterity needed.', iic: '<b>IIC</b> sits past the second bend, close to the eardrum: nearly invisible and little occlusion, but the canal must be large and straight enough.' }[S.custom]}</p>
      <p>Custom aids are not used for young children, because the canal keeps growing.</p>`,
    facts: [['ITE → IIC', 'shallow to deep placement'], ['adults', 'canal must be large enough']] },
  { id: 'bc', k: 'Bone conduction', t: 'Bone-conduction hearing device', sig: CSS.mech, cam: [V(-190, 62, -140), V(-62, 4, -30)], sub: 'bc',
    body: () => `<p>A titanium fixture osseointegrates in the skull about 50–55 mm behind the ear canal. The processor turns sound into vibration, which the skull carries to <b>both cochleae</b>, bypassing the ear canal and middle ear. Transcranial attenuation is only about 0–15 dB, which is why it also works as a CROS for single-sided deafness.</p>
      <p>${S.bc === 'perc' ? '<b>Percutaneous</b>: the processor clips onto an abutment through the skin. This gives the most efficient transmission, but the skin site needs lifelong care.' : '<b>Transcutaneous</b>: an implanted magnet holds the processor over intact skin. There is no skin-site care, but the skin damps high frequencies by roughly 5–20 dB unless the transducer itself is implanted (active devices).'}</p>
      <p>Children use a processor on a softband or adhesive until the skull is thick enough for implantation (commonly about 5 years).</p>`,
    facts: [['conductive · mixed · SSD', 'main indications'], ['BC ≤ 45–65 dB HL', 'bone thresholds within the device range']] },
  { id: 'mei', k: 'Mechanical', t: 'Active middle-ear implant', sig: CSS.mech, cam: [V(-150, 72, 40), V(-52, 6, -16)],
    body: () => `<p>An audio processor held by a magnet on the scalp sends the signal through the skin to an implanted receiver. A conductor link runs through the mastoid to a <b>floating mass transducer (FMT)</b> crimped on the long process of the incus. The FMT vibrates and drives the stapes directly. The ear canal stays open, with no earmould and no acoustic feedback path.</p>
      <p>With the FMT placed on the <b>round window</b> (vibroplasty), the same device treats conductive and mixed loss when the ossicles are diseased or absent.</p>`,
    facts: [['moderate–severe SNHL', 'adults who cannot wear conventional aids'], ['round window', 'option for conductive / mixed loss']] },
  { id: 'ci', k: 'Electrical · cochlea', t: 'Cochlear implant', sig: CSS.elec, cam: [V(-222, 58, 170), V(-66, 0, 4)],
    body: () => { const st = (f) => P.fmtF(f); return `<p>The processor splits sound into frequency bands, extracts each band's envelope and compresses it into the patient's electrical dynamic range (<b>T to C/M levels</b>, set at mapping). The coil sends data and power through the skin by radio frequency. The receiver–stimulator then fires <b>biphasic current pulses</b> on the electrodes in scala tympani. In CIS-type strategies these fire one at a time (interleaved) to limit channel interaction.</p>
      <p>Electrodes directly excite <b>spiral ganglion neurons</b>, bypassing the hair cells, and follow the cochlea's tonotopy: basal contacts carry high-frequency bands. Now ${st(S.f)} is carried by contact ${activeContact() + 1} of ${NE} (1 = most basal). The array rarely reaches the apex, so low bands are delivered to higher-frequency places (place mismatch), which the brain adapts to over months.</p>`; },
    facts: [['12–22', 'contacts, by manufacturer'], ['20–31 mm', 'insertion depth, about 1–1.75 turns'], ['bilateral severe–profound', 'with limited aided benefit'], ['cochlear nerve', 'must be present (MRI / CT)']] },
  { id: 'abi', k: 'Electrical · brainstem', t: 'Auditory brainstem implant', sig: CSS.elec, cam: [V(-100, 42, 120), V(-24, 4, -16)],
    body: () => `<p>When there is no working cochlear nerve, a paddle of surface electrodes is placed on the <b>cochlear nucleus</b> in the lateral recess of the fourth ventricle. This is usually done during tumour removal (translabyrinthine or retrosigmoid). The external parts work like a cochlear implant, but stimulation starts at the brainstem, bypassing the cochlea and auditory nerve.</p>
      <p>Most NF2 users gain sound awareness and better lip-reading; open-set speech is less common than with cochlear implants. Children with nerve aplasia and some non-tumour adults can do better.</p>`,
    facts: [['NF2', 'bilateral vestibular schwannomas'], ['nerve aplasia', 'or cochlear ossification / trauma'], ['12–21', 'surface electrodes'], ['CN', 'first relay of the pathway']] },
  { id: null, k: 'Choosing a device', t: 'From diagnosis to device', sig: CSS.air, cam: [V(-250, 70, 205), V(-22, 12, -6)],
    body: () => { const c = condBy(S.cond); return `<p><b>${c.label}.</b> ${c.why}</p>
      <div class="table-wrap"><table class="matrix"><thead><tr><th>Device</th><th>For this ear</th></tr></thead><tbody>${DEVICES.map((d) => `<tr><td>${DNAME[d]}</td><td><span class="pill ${c.m[d]}">${STAT[c.m[d]]}</span></td></tr>`).join('')}</tbody></table></div>`; } },
];
function activeContact() { const E = channelEnergies(S.f, 80); let bi = 0; E.forEach((v, i) => { if (v > E[bi]) bi = i; }); return NE - 1 - bi; }

let camTween = null, tourClock = 0;
function setChapter(i, instant = false) {
  S.ch = (i + CH.length) % CH.length;
  const c = CH[S.ch];
  eff = c.id ? EFF[status(c.id)] : 1;
  document.documentElement.style.setProperty('--sig', c.sig);
  for (const id of DEVICES) D[id] && (D[id].g.visible = c.id === id);
  if (D.ci) { D.ci.inset.g.visible = c.id === 'ci'; D.ci.inset.lead.visible = c.id === 'ci'; }
  applyVariants();
  renderAll();
  const [pos, tgt] = c.cam;
  const p = MOBILE ? tgt.clone().add(pos.clone().sub(tgt).multiplyScalar(1.3)) : pos;
  if (instant) { camera.position.copy(p); controls.target.copy(tgt); camTween = null; }
  else camTween = { t: 0, dur: 1.8, p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: tgt.clone() };
  tourClock = 0;
}
function applyVariants() {
  if (!D.custom) return;
  for (const k in D.custom.variants) D.custom.variants[k].g.visible = k === S.custom;
  D.bc.perc.visible = S.bc === 'perc'; D.bc.trans.visible = S.bc === 'trans';
}
function curDev() { return CH[S.ch].id; }

// ================================================================ side panels
function renderAll() { renderChapters(); renderCard(); renderChain(); renderCand(); }
function renderChapters() {
  $('chapters').innerHTML = CH.map((c, i) => { const st = c.id ? status(c.id) : null;
    return `<button type="button" data-i="${i}" ${i === S.ch ? 'aria-current="step"' : ''}><span class="n">${String(i).padStart(2, '0')}</span><span class="dot"></span>${c.id ? DNAME[c.id].replace(/ \(.*\)$/, '').replace('Custom in-ear', 'In-ear (custom)') : c.k}${st && st !== 'N' ? `<span class="pill ${st}" style="margin-left:auto;padding:1px 6px;font-size:9px">${st === 'F' ? '1st' : st === 'S' ? 'fit' : '?'}</span>` : ''}</button>`; }).join('');
  const cur = $('chapters').querySelector('[aria-current]'); if (cur && MOBILE) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
}
$('chapters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stopTour(); setChapter(+b.dataset.i); } });
function renderCard() {
  const c = CH[S.ch], st = c.id ? status(c.id) : null;
  let sub = '';
  if (c.sub === 'custom') sub = `<div class="sub" role="group" aria-label="Custom style">${Object.entries(CUSTOM).map(([k, v]) => `<button type="button" data-custom="${k}" aria-pressed="${k === S.custom}">${v.label.split(' · ')[0]}</button>`).join('')}</div>`;
  if (c.sub === 'bc') sub = `<div class="sub" role="group" aria-label="Coupling">${[['perc', 'Percutaneous'], ['trans', 'Transcutaneous']].map(([k, l]) => `<button type="button" data-bc="${k}" aria-pressed="${k === S.bc}">${l}</button>`).join('')}</div>`;
  const facts = c.facts ? `<div class="facts">${c.facts.map(([b, s]) => `<div class="fact"><b>${b}</b><span>${s}</span></div>`).join('')}</div>` : '';
  const stat = st ? `<div class="status"><span class="pill ${st}">${STAT[st]}</span><span>for ${condBy(S.cond).label.toLowerCase()}</span></div>` : '';
  $('card').innerHTML = `<div class="kicker">${c.k}</div><h2>${c.t}</h2>${stat}${sub}${c.body()}${facts}${st ? `<p class="why">${condBy(S.cond).why}</p>` : ''}`;
}
$('card').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.custom) S.custom = b.dataset.custom;
  if (b.dataset.bc) S.bc = b.dataset.bc;
  applyVariants(); renderCard();
});
function renderChain() {
  const id = curDev();
  const steps = id ? CHAIN[id] : [['Sound', 'acoustic', CSS.air], ['Device takes over one step', 'acoustic · mechanical · electrical', CSS.elec], ['Auditory nerve / brainstem', 'neural', CSS.neural], ['Auditory cortex', 'neural', CSS.neural]];
  $('chain').innerHTML = steps.map(([t, k, c]) => `<li style="--c:${c}">${t}<span>${k}</span></li>`).join('');
  $('chainNote').textContent = id ? DNAME[id].replace(/ \(.*\)$/, '') : 'overview';
  const isCI = id === 'ci' || id === 'abi';
  $('procTitle').textContent = isCI ? 'Channels → electrodes' : 'Wide dynamic range compression';
}
function renderCand() {
  const c = condBy(S.cond);
  $('candWhy').textContent = c.why;
  $('candNote').textContent = c.g;
  $('cand').innerHTML = DEVICES.map((d) => `<li><button type="button" data-dev="${d}" aria-current="${CH[S.ch].id === d}"><span>${DNAME[d]}</span><span class="pill ${c.m[d]}">${STAT[c.m[d]]}</span></button></li>`).join('');
}
$('cand').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; stopTour(); setChapter(CH.findIndex((c) => c.id === b.dataset.dev)); });

// processing graph
const pc = $('proc'), pg = pc.getContext('2d');
function gainFor() { return { mildmod: 22, nihl: 18, severe: 42, profound: 55, deadhf: 28, otosclerosis: 30, csom: 30, atresia: 40, ome: 20, ssd: 30, vs: 30 }[S.cond] ?? 25; }
function drawProc(t) {
  const r = pc.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (pc.width !== Math.round(r.width * dpr)) { pc.width = Math.round(r.width * dpr); pc.height = Math.round(r.height * dpr); }
  const g = pg, w = r.width, h = r.height; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  g.font = '10px "JetBrains Mono",monospace'; g.lineWidth = 1;
  const id = curDev();
  if (id === 'ci' || id === 'abi') {
    const E = channelEnergies(S.f, S.level), bw = (w - 40) / NE, base = h - 22;
    g.fillStyle = CSS.dim; g.textAlign = 'center';
    const step = Math.floor(t * 9) % NE; // interleaved pulse order, basal → apical
    for (let b = 0; b < NE; b++) {
      const x = 30 + b * bw, col = new THREE.Color(...P.freqRGB(Math.sqrt(BANDS[b] * BANDS[b + 1]))).getStyle();
      const hh = E[b] * (h - 44);
      g.fillStyle = 'rgba(150,185,215,.08)'; g.fillRect(x + 2, 12, bw - 4, base - 12);
      g.fillStyle = col; g.globalAlpha = (NE - 1 - b) === step % NE ? 1 : 0.55; g.fillRect(x + 2, base - hh, bw - 4, hh); g.globalAlpha = 1;
    }
    g.fillStyle = CSS.dim; g.textAlign = 'center';
    for (const b of [0, 4, 8, 11]) g.fillText(P.fmtF(Math.sqrt(BANDS[b] * BANDS[b + 1])).replace(' ', ''), 30 + b * bw + bw / 2, h - 8);
    g.textAlign = 'left'; g.fillText('C', 6, 18); g.fillText('T', 6, base); g.strokeStyle = 'rgba(150,185,215,.2)'; g.beginPath(); g.moveTo(18, 14); g.lineTo(18, base); g.stroke();
    $('procNote').textContent = `${S.level} dB SPL → ${Math.round(clamp((S.level - 25) / 55, 0, 1) * 100)} % of T–C range`;
    return;
  }
  // WDRC input–output
  const G = gainFor(), knee = 50, CR = 2, MPO = id === 'bc' || id === 'mei' ? 115 : 120;
  const X = (v) => 30 + ((v - 20) / 90) * (w - 40), Y = (v) => h - 20 - ((v - 20) / 110) * (h - 30);
  g.strokeStyle = 'rgba(150,185,215,.12)';
  for (let v = 20; v <= 110; v += 30) { g.beginPath(); g.moveTo(X(v), 8); g.lineTo(X(v), h - 20); g.stroke(); g.fillStyle = CSS.dim; g.textAlign = 'center'; g.fillText(v, X(v), h - 6); }
  g.textAlign = 'left'; g.fillText('out', 2, 14); g.textAlign = 'right'; g.fillText('in, dB SPL', w - 4, h - 20 - 4);
  g.setLineDash([3, 3]); g.strokeStyle = CSS.dim; g.beginPath(); g.moveTo(X(20), Y(20)); g.lineTo(X(110), Y(110)); g.stroke(); g.setLineDash([]);
  const out = (i) => Math.min(MPO, i < knee ? i + G : knee + G + (i - knee) / CR);
  g.strokeStyle = CSS.air; g.lineWidth = 2; g.beginPath(); for (let i = 20; i <= 110; i++) { const x = X(i), y = Y(out(i)); i === 20 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  g.fillStyle = CSS.air; g.beginPath(); g.arc(X(S.level), Y(out(S.level)), 4, 0, 7); g.fill();
  $('procNote').textContent = `gain ${Math.round(out(S.level) - S.level)} dB at ${S.level} dB · CR ${CR}:1 above ${knee}`;
}

// ================================================================ model state
function refresh() {
  const id = curDev();
  eff = id ? EFF[status(id)] : 1;
  for (const k in lesions) lesions[k].visible = false;
  const on = (k) => lesions[k] && (lesions[k].visible = true);
  if (S.cond === 'wax') on('wax');
  if (S.cond === 'atresia') on('atresia');
  if (S.cond === 'csom') { on('csom'); on('csomFluid'); }
  if (S.cond === 'ome') on('ome');
  if (S.cond === 'otosclerosis') on('otosclerosis');
  if (S.cond === 'vs' || S.cond === 'nf2') on('vs');
  if (S.cond === 'nf2') on('vsL');
  const cn = byName['Cochlear nerve']; if (cn) cn.visible = S.cond !== 'aplasia';
  $('levelOut').textContent = `${S.level} dB SPL`;
  renderAll();
}

// ================================================================ animation
const clock = new THREE.Clock();
let t = 0, emitAcc = 0, lastWave = -99, lastBone = -99;
const packets = [];
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const pktPool = [];
function spawnPacket(route, delay) {
  let s = pktPool.pop();
  if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.renderOrder = 8; scene.add(s); }
  s.material.color.set(route.k === 'air' ? COL.air : route.k === 'rf' ? 0xffffff : COL.elec);
  s.scale.setScalar(route.k === 'rf' ? 3.2 : 2.2); s.visible = false;
  packets.push({ s, route, u: -delay });
}
function frame() {
  const rdt = Math.min(0.05, clock.getDelta()), dt = S.playing ? rdt * S.speed : 0; t += dt;
  if (!NODES.C0) { renderer.render(scene, camera); requestAnimationFrame(frame); return; }
  if (camTween) { camTween.t += rdt / camTween.dur; const e = easeIO(Math.min(1, camTween.t)); camera.position.lerpVectors(camTween.p0, camTween.p1, e); controls.target.lerpVectors(camTween.t0, camTween.t1, e); if (camTween.t >= 1) camTween = null; }
  controls.update();
  for (const g in meshes) { const target = GROUP[g].op[S.ch]; for (const m of meshes[g]) { const o = getOp(m.material), n = o + (target - o) * Math.min(1, rdt * 3.5); setOp(m.material, n); m.visible = n > 0.01; if (!m.material.uniforms) m.material.depthWrite = n > 0.95 && g !== 'tm' && g !== 'labyrinth'; } }
  const id = curDev(), d = id ? D[id] : null;
  const vis = 0.65 + 0.33 * Math.log2(S.f / 250);
  const wave = Math.sin(2 * Math.PI * vis * t);
  const lf = clamp(Math.pow(10, (S.level - 65) / 40), 0.4, 1.5);

  // air wavefronts from the source toward the device microphone (or the ear)
  const target = d ? (id === 'custom' ? d.variants[S.custom].mic : d.mic) : W.concha;
  const dist = W.source.distanceTo(target), speed = dist / 1.6;
  if (S.playing && t - lastWave >= 1 / vis) { const m = wavefronts.find((w) => t - w.userData.born > (dist + 20) / speed) || wavefronts[0]; m.userData.born = t; lastWave = t; }
  for (const m of wavefronts) { const age = t - m.userData.born, R = age * speed; if (age < 0 || R > dist + 20) { m.visible = false; continue; } m.visible = [1, 2, 3, 4, 5].includes(S.ch); m.position.copy(W.source); m.scale.setScalar(Math.max(0.5, R)); m.material.uniforms.uOpacity.value = 0.4 * lf * (1 - R / (dist + 20)); }
  W.sourceGlyph.visible = [1, 2, 3, 4, 5].includes(S.ch); W.sourceCone.material.opacity = 0.35 + 0.5 * Math.abs(wave);

  // device packets along the route
  if (d && S.playing) { emitAcc += dt * vis * 2; if (emitAcc > 1) { emitAcc = 0; let delay = 0; for (const r of d.routes) { spawnPacket(r, delay); delay += r.k === 'rf' ? 0.35 : 0.9; } } }
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i]; p.u += dt / (p.route.k === 'rf' ? 0.35 : 0.9);
    if (p.u > 1 || !d || !d.routes.includes(p.route)) { p.s.visible = false; pktPool.push(p.s); packets.splice(i, 1); continue; }
    if (p.u < 0) continue; p.s.visible = true; p.s.position.copy(p.route.c.getPointAt(clamp(p.u, 0, 1)));
  }
  if (d && d.chip) d.chip.material.color.setScalar(0).add(new THREE.Color(COL.elec).multiplyScalar(0.4 + 0.6 * Math.abs(wave)));

  // canal pressure particles: from the device output (or the entry for natural sound)
  const canalBlocked = S.cond === 'atresia';
  const acousticRoute = !d || ['bte', 'ric', 'custom'].includes(id);
  const outU = !d ? 0 : id === 'custom' ? d.variants[S.custom].out : d.out ?? 0;
  const pAttr = particles.pts.geometry.attributes.position, cAttr = particles.pts.geometry.attributes.color, acol = new THREE.Color(COL.air);
  const gainLin = acousticRoute && d ? 1 + gainFor() / 25 : 1;
  for (let i = 0; i < particles.N; i++) {
    const u = particles.u[i];
    const inside = u >= outU || (d && d.open);
    const amp = 0.016 * lf * (u >= outU ? gainLin : 0.6);
    const ph = Math.sin(2 * Math.PI * (vis * t - u * 1.1));
    const s = clamp(u + amp * ph, 0, 1);
    const p = lutAt(canal.lp, s).addScaledVector(lutAt(canal.ln, s), Math.cos(particles.an[i]) * particles.ra[i]).addScaledVector(lutAt(canal.lb, s), Math.sin(particles.an[i]) * particles.ra[i]);
    pAttr.setXYZ(i, p.x, p.y, p.z);
    let br = acousticRoute && inside && !canalBlocked ? (0.15 + 0.8 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (vis * t - u * 1.1)))) * (u >= outU ? Math.min(1.3, gainLin * 0.6) : 0.35) : 0;
    if (S.cond === 'wax' && u > 0.42) br *= 0.1;
    if ([4, 5, 6, 7].includes(S.ch)) br *= 0.15;
    cAttr.setXYZ(i, acol.r * br, acol.g * br, acol.b * br);
  }
  pAttr.needsUpdate = true; cAttr.needsUpdate = true;
  canal.tube.material.uniforms.uOpacity.value += ((canalBlocked ? 0 : [1, 2, 3].includes(S.ch) ? 0.3 : 0.08) - canal.tube.material.uniforms.uOpacity.value) * Math.min(1, rdt * 3);

  // middle ear: driven acoustically (aids), by the FMT (MEI), or not at all (BC, CI, ABI)
  const tmDrive = acousticRoute && !canalBlocked ? (S.cond === 'wax' ? 0.15 : S.cond === 'csom' ? 0.4 : S.cond === 'ome' ? 0.3 : 1) : 0;
  let chainDrive = tmDrive * (S.cond === 'otosclerosis' ? 0.2 : 1);
  if (id === 'mei') chainDrive = 1;
  if (tmMat.userData.sh) tmMat.userData.sh.uniforms.uDisp.value = 0.5 * lf * tmDrive * wave;
  tmMat.emissiveIntensity = 0.1 + 0.8 * Math.abs(wave) * tmDrive;
  chainPivot.rotation.z = 0.07 * lf * chainDrive * wave;
  stapesGroup.position.set(0.45 * lf * chainDrive * (S.cond === 'otosclerosis' ? 0.1 : 1) * wave, 0, 0);
  for (const n of ['Malleus.r', 'Incus.r', 'Stapes.r']) byName[n].material.emissiveIntensity = 0.3 * Math.abs(wave) * chainDrive;
  if (id === 'mei') { D.mei.fmt.position.set(0.25 * wave, 0, 0); D.mei.fmt.children.forEach((m) => { m.material.emissiveIntensity = 0.5 + 0.8 * Math.abs(wave); }); }

  // bone conduction: vibration shells from the implant site to both cochleae
  const bcOn = id === 'bc';
  if (bcOn && S.playing && t - lastBone >= 1 / vis) { const m = W.boneWaves.find((w) => t - w.userData.born > 2.2) || W.boneWaves[0]; m.userData.born = t; lastBone = t; }
  for (const m of W.boneWaves) { const age = t - m.userData.born, R = age * 55; if (!bcOn || age < 0 || R > 125) { m.visible = false; continue; } m.visible = true; m.position.copy(D.bc.site); m.scale.setScalar(Math.max(0.5, R)); m.material.uniforms.uOpacity.value = 0.5 * (1 - R / 125); }
  const lab = meshes.labyrinth || [];
  const cochGlow = bcOn ? Math.abs(wave) * eff : id === 'mei' || acousticRoute ? Math.abs(wave) * chainDrive * 0.5 : 0;
  lab.forEach((m) => { m.material.emissiveIntensity = cochGlow * 0.8; });
  W.contraGlow.material.opacity = bcOn ? 0.25 + 0.5 * Math.abs(Math.sin(2 * Math.PI * vis * (t - 0.6))) : 0;
  W.contraMesh.visible = bcOn || S.ch === 0;
  if (D.bc) D.bc.proc.position.copy(D.bc.site.clone().addScaledVector(D.bc.n, 7.5 + (bcOn ? 0.25 * wave : 0)));

  // cochlear implant contacts (interleaved pulses) + ABI paddle
  if (id === 'ci') {
    const E = channelEnergies(S.f, S.level), step = Math.floor(t * 9) % NE;
    D.ci.inset.contacts.forEach((c, e) => { const band = NE - 1 - e; const on = e === step ? 1 : 0.15; const v = E[band] * on; c.m.material.emissiveIntensity = 0.2 + 3 * v; c.glow.material.opacity = Math.min(0.95, v * 1.4); c.glow.scale.setScalar(2.5 + 5 * E[band]); });
  }
  if (id === 'abi') { const step = Math.floor(t * 9) % 12; D.abi.contacts.forEach((c, i) => { c.material.emissiveIntensity = i === step ? 3 : 0.3; }); }
  W.markers.forEach((m, i) => { m.visible = S.ch === 0; m.material.opacity = 0.5 + 0.4 * Math.sin(t * 2 + i); });

  // neural activity: rate follows how well this route suits the ear
  const neuralOn = true;
  if (S.playing && neuralOn) {
    let rate = 7 * eff * clamp(lf, 0.5, 1.2);
    if (!id) rate = 5;
    if (id && ['bte', 'ric', 'custom', 'bc', 'mei'].includes(id) && ['profound', 'aplasia', 'nf2'].includes(S.cond)) rate = Math.min(rate, 0.6);
    if (id === 'ci' && ['aplasia', 'nf2'].includes(S.cond)) rate = Math.min(rate, 0.8);
    emitAcc2 += dt * rate;
    while (emitAcc2 > 1) { emitAcc2 -= 1; spawnSpike(id === 'abi' ? 'CN' : 'C0'); }
  }
  // schwannoma: block a share of spikes on the nerve
  if (['vs', 'nf2'].includes(S.cond) && id !== 'abi') for (let i = spikes.length - 1; i >= 0; i--) { const k = spikes[i]; if (k.at === 'C0' && k.u > 0.5 && !k.chk) { k.chk = true; if (Math.random() < 0.7) recycle(i); } }
  stepSpikes(dt);
  for (const nid in glowNodes) { const gN = glowNodes[nid]; gN.v *= Math.exp(-rdt * 2.2); gN.sprite.material.opacity = Math.min(0.9, gN.v * 0.8); gN.sprite.scale.setScalar((S.ch === 0 || S.ch === 8 ? 14 : 7) * (0.7 + gN.v * 0.4)); }
  const glowMesh = (names, v) => names.forEach((n) => { const m = byName[n]; if (m) m.material.emissiveIntensity = 0.15 + 1.6 * v; });
  glowMesh(['Anterior cochlear nucleus.r', 'Posterior cochlear nucleus.r'], glowNodes.CN.v); glowMesh(['Inferior colliculus.r'], glowNodes.ICi.v); glowMesh(['Inferior colliculus.l'], glowNodes.ICc.v);
  glowMesh(['Medial geniculate body.r'], glowNodes.MGBi.v); glowMesh(['Medial geniculate body.l'], glowNodes.MGBc.v);
  glowMesh(['Transverse temporal gyri.r', 'Temporal plane.r'], glowNodes.HGi.v); glowMesh(['Transverse temporal gyri.l', 'Temporal plane.l'], glowNodes.HGc.v);
  W.tracts.visible = [0, 6, 7, 8].includes(S.ch); W.relays.forEach((m) => { m.visible = W.tracts.visible; });

  if (S.tour && S.playing) { tourClock += rdt; if (tourClock > (S.ch === 0 ? 10 : 14)) { if (S.ch === CH.length - 1) stopTour(); else setChapter(S.ch + 1); } }
  drawProc(t);
  // highlight the chain step in step with the packets
  const lis = $('chain').children; if (lis.length) { const k = Math.floor((t * vis * 1.2) % lis.length); for (let i = 0; i < lis.length; i++) lis[i].classList.toggle('on', i === k); }
  updateLabels();
  if (ctxLost) { requestAnimationFrame(frame); return; }
  if (S.glow) { if (!compSized) sizeComp(); composer.render(); } else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
let emitAcc2 = 0;

// ================================================================ controls
$('stim').innerHTML = FREQS.map((f) => `<button type="button" data-f="${f}" aria-pressed="${f === S.f}">${P.fmtF(f)}</button>`).join('');
$('stim').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.f = +b.dataset.f; $('stim').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderCard(); });
const grp = {}; CONDS.forEach((c) => (grp[c.g] = grp[c.g] || []).push(c));
$('cond').innerHTML = Object.entries(grp).map(([g, cs]) => `<optgroup label="${g}">${cs.map((c) => `<option value="${c.id}"${c.id === S.cond ? ' selected' : ''}>${c.label}</option>`).join('')}</optgroup>`).join('');
$('cond').addEventListener('change', (e) => { S.cond = e.target.value; refresh(); });
$('level').addEventListener('input', (e) => { S.level = +e.target.value; $('levelOut').textContent = `${S.level} dB SPL`; });
$('speed').addEventListener('input', (e) => { S.speed = +e.target.value; });
$('labels').addEventListener('change', (e) => { S.labels = e.target.checked; });
$('glow').checked = S.glow; $('glow').addEventListener('change', (e) => { S.glow = e.target.checked; });
const syncPlay = () => { $('play').textContent = S.playing ? 'Pause' : 'Play'; };
$('play').addEventListener('click', () => { S.playing = !S.playing; syncPlay(); }); syncPlay();
$('prev').addEventListener('click', () => { stopTour(); setChapter(S.ch - 1); refresh(); });
$('next').addEventListener('click', () => { stopTour(); setChapter(S.ch + 1); refresh(); });
$('tour').addEventListener('click', () => { if (S.tour) stopTour(); else { S.tour = true; S.playing = true; syncPlay(); $('tour').setAttribute('aria-pressed', 'true'); $('tour').textContent = 'Stop tour'; setChapter(S.ch === CH.length - 1 ? 0 : S.ch); } });
function stopTour() { S.tour = false; $('tour').setAttribute('aria-pressed', 'false'); $('tour').textContent = 'Guided tour'; }
addEventListener('keydown', (e) => {
  if (e.target.closest('input,select')) return;
  if (e.key === 'ArrowRight') { stopTour(); setChapter(S.ch + 1); refresh(); } else if (e.key === 'ArrowLeft') { stopTour(); setChapter(S.ch - 1); refresh(); }
  else if (e.key === ' ') { e.preventDefault(); S.playing = !S.playing; syncPlay(); } else if (e.key.toLowerCase() === 'l') { S.labels = !S.labels; $('labels').checked = S.labels; }
});
controls.addEventListener('start', () => { camTween = null; $('hint').style.opacity = 0; });
// keep efficiency in sync whenever the chapter changes
const _set = setChapter; // eslint-disable-line no-unused-vars
if (MOBILE) $('hint').textContent = 'Drag to orbit · pinch to zoom';
renderAll(); resize(); requestAnimationFrame(frame);
window.__dev = { S, setChapter: (i, x) => { setChapter(i, x); refresh(); }, W, D, NODES };

// Replaces NaN / Inf pixels with black before bloom: on some phone GPUs a single invalid pixel is
// spread by the bloom blur into flickering black boxes.
function nanGuard() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bool bad = !(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b) || !(c.a == c.a) || c.r > 6e4 || c.g > 6e4 || c.b > 6e4; gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, 0.0, 64.0); }',
  });
}
