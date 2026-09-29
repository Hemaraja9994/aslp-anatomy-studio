// Articulator rig shared by the speech and swallowing modules.
// Everything lives in the midsagittal plane (x = 0) of the real head model, coordinates as [z, y] in mm
// (z = anterior, y = up). Landmarks measured from the Z-Anatomy meshes:
//   upper incisor edge ≈ [90,-53], alveolar ridge ≈ [80,-42], hard palate → soft palate at ≈ [55,-29.5],
//   uvula tip ≈ [15,-38], posterior pharyngeal wall ≈ z 9 → 2, epiglottis tip ≈ [24,-70], glottis ≈ [16,-100],
//   upper oesophageal sphincter ≈ [4,-120].
import { THREE, V, clamp, lerp, smooth, solid, std, sprite, COL } from './engine.js';

export const REST_U = [[77, -55], [70, -47], [60, -42], [48, -40], [36, -43], [28, -52], [25, -64]];
const LOWER = [[26, -74], [32, -83], [50, -80], [66, -73], [74, -63]];
export const PALATE = [[91, -53], [86, -46], [80, -42], [74, -35], [66, -31], [58, -29.5], [54, -29.5]];
const VEL_DOWN = [[56, -29.5], [46, -30.5], [36, -32.5], [26, -35.5], [16, -39]];
const VEL_UP = [[56, -29.5], [46, -27.5], [36, -25], [26, -23.5], [13, -24]];
const WALL = [[10, -12], [10, -30], [9, -48], [8, -64], [6, -82], [4, -100], [3, -118], [3, -132]];
const JAW_PIVOT = [12, -8];

// place targets for the tongue's upper surface points [tip, blade, front, mid, back, root-upper, root]
export const PLACE = {
  dental: { 0: [86, -49.5], 1: [78, -44.5] },
  alveolar: { 0: [80.5, -43], 1: [73, -41.5], 2: [62, -40] },
  retroflex: { 0: [69, -32.5], 1: [74, -39.5], 2: [63, -40.5] },
  postalveolar: { 0: [79, -47], 1: [74, -39.5], 2: [65, -35.5] },
  palatal: { 0: [78, -52], 1: [73, -44], 2: [64, -33], 3: [53, -31.5] },
  velar: { 3: [47, -35], 4: [38, -30.5], 5: [29, -40] },
  alveolar_lat: { 0: [80.5, -43], 1: [73, -41.5] },
};
// constriction position along the oral airflow path (0 glottis → 1 outside lips)
export const PLACE_S = { glottal: 0.03, velar: 0.47, palatal: 0.55, retroflex: 0.6, postalveolar: 0.64, alveolar: 0.7, alveolar_lat: 0.7, dental: 0.76, labiodental: 0.83, bilabial: 0.86 };

export function vowelPose(h, b, round = 0, jawExtra = 0) {
  // h: 0 low → 1 high; b: 0 front → 1 back
  const U = REST_U.map((p) => p.slice());
  const shiftZ = 3 * (1 - b) - 6 * b;
  for (let i = 0; i < 7; i++) U[i][0] += shiftZ * (i < 5 ? 1 : 0.6);
  U[2][1] = -42 + 8.5 * h * (1 - b) - 5 * (1 - h);
  U[3][1] = -40 + 5.5 * h - 6 * (1 - h);
  U[4][1] = -43 + 10 * h * b - 3 * (1 - h);
  U[4][0] -= 2 * b;
  U[1][1] = -47 + 3 * h * (1 - b) - 3 * (1 - h);
  U[0][1] = -55 - 2 * (1 - h);
  U[5][0] -= 4 * b * (1 - h);
  U[6][0] -= 3 * b * (1 - h);
  return { U, jaw: 0.03 + 0.19 * (1 - h) + jawExtra, lips: { close: 0, round, protr: round, spread: (1 - b) * h * (1 - round) }, velum: 1 };
}

export function consonantPose(spec) {
  const U = REST_U.map((p) => p.slice());
  const pl = PLACE[spec.place];
  if (pl) for (const k in pl) U[k] = pl[k].slice();
  const fric = ['fricative', 'approximant'].includes(spec.manner);
  if (fric && pl) for (const k in pl) U[k][1] -= spec.manner === 'approximant' ? 3.5 : 1.3;
  const lips = { close: 0, round: 0, protr: 0, labiodental: 0, spread: 0 };
  if (spec.place === 'bilabial') lips.close = spec.manner === 'approximant' ? 0.6 : 1;
  if (spec.place === 'labiodental') lips.labiodental = spec.manner === 'approximant' ? 0.75 : 1;
  if (spec.round) { lips.round = 1; lips.protr = 1; }
  if (spec.place === 'postalveolar' && spec.lang === 'en') { lips.round = 0.5; lips.protr = 0.6; }
  return {
    U, jaw: spec.place === 'velar' ? 0.08 : spec.place === 'bilabial' ? 0.03 : 0.04, lips,
    velum: spec.manner === 'nasal' ? 0 : 1, groove: ['s', 'z', 'ʃ', 'ʒ', 'ʂ', 'tʃ', 'dʒ'].some((x) => spec.ipa.includes(x)) ? 1 : 0,
    lateral: spec.manner === 'lateral' ? 1 : 0, trill: spec.manner === 'trill' ? 1 : 0,
  };
}

// ---------------------------------------------------------------- geometry helpers
function sampleOpen(pts, n) { const c = new THREE.CatmullRomCurve3(pts.map(([z, y]) => V(0, y, z)), false, 'centripetal'); return c.getPoints(n - 1).map((p) => [p.z, p.y]); }
function rot([z, y], a, [pz, py] = JAW_PIVOT) { const dz = z - pz, dy = y - py, c = Math.cos(a), s = Math.sin(a); return [pz + dz * c + dy * s, py - dz * s + dy * c]; }

// Loft: closed sagittal contour swept across x with a width profile and rounded lateral edges.
function makeLoft(nC, M) {
  const geo = new THREE.BufferGeometry();
  const verts = nC * (M + 1) + 2;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  const idx = [];
  for (let i = 0; i < nC; i++) for (let j = 0; j < M; j++) {
    const a = i * (M + 1) + j, b = ((i + 1) % nC) * (M + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const cL = nC * (M + 1), cR = cL + 1;
  for (let i = 0; i < nC; i++) { const n = (i + 1) % nC; idx.push(cL, n * (M + 1), i * (M + 1)); idx.push(cR, i * (M + 1) + M, n * (M + 1) + M); }
  geo.setIndex(idx);
  return geo;
}
function writeLoft(geo, contour, M, width, upperCount, deform) {
  const pos = geo.attributes.position, nC = contour.length;
  let cz = 0, cy = 0; for (const [z, y] of contour) { cz += z; cy += y; } cz /= nC; cy /= nC;
  let wAvg = 0;
  for (let i = 0; i < nC; i++) {
    const [z, y] = contour[i]; const w = width(z, y, i); wAvg += w;
    for (let j = 0; j <= M; j++) {
      const u = (j / M) * 2 - 1, k = 1 - 0.3 * Math.pow(Math.abs(u), 3);
      let pz = cz + (z - cz) * k, py = cy + (y - cy) * k;
      if (deform) { const d = deform(i, u, i < upperCount); pz += d[0]; py += d[1]; }
      pos.setXYZ(i * (M + 1) + j, w * u * 0.98, py, pz);
    }
  }
  wAvg /= nC;
  pos.setXYZ(nC * (M + 1), -wAvg * 0.9, cy, cz); pos.setXYZ(nC * (M + 1) + 1, wAvg * 0.9, cy, cz);
  pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
}

// ---------------------------------------------------------------- rig
export function createOralRig(ctx, opts = {}) {
  const { scene, byName } = ctx;
  const root = new THREE.Group(); scene.add(root);
  const R = { root, cur: null, tgt: null, t: 0, trillPh: 0 };
  // jaw: real mandible + lower teeth rotate about the TMJ axis
  R.jaw = new THREE.Group(); R.jaw.position.set(0, JAW_PIVOT[1], JAW_PIVOT[0]); scene.add(R.jaw); R.jaw.updateMatrixWorld();
  for (const n of Object.keys(byName)) if (/^Mandible$|^Lower .*(incisor|molar)/.test(n)) R.jaw.attach(byName[n]);
  // tongue
  const NU = 44, NL = 22, NC = NU + NL, M = 12;
  R.tongueGeo = makeLoft(NC, M);
  R.tongueMat = solid(0xcf6f78, { roughness: 0.55, emissive: 0x3a0a10, emissiveIntensity: 0.3 });
  R.tongue = new THREE.Mesh(R.tongueGeo, R.tongueMat); R.tongue.renderOrder = 3; root.add(R.tongue);
  // velum
  R.velGeo = makeLoft(24, 8);
  R.velum = new THREE.Mesh(R.velGeo, solid(0xd98a8f, { roughness: 0.5, emissive: 0x2a0a0a })); root.add(R.velum);
  // posterior pharyngeal wall (sheet) — used for constriction in swallowing
  R.wallGeo = makeLoft(32, 8);
  R.wall = new THREE.Mesh(R.wallGeo, std(0xc9828a, { opacity: 0.55, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false })); R.wall.renderOrder = 2; root.add(R.wall);
  R.wallBulge = () => 0;
  // lips
  R.lipMat = solid(0xd07a80, { roughness: 0.45 });
  R.upperLip = new THREE.Mesh(new THREE.BufferGeometry(), R.lipMat); R.lowerLip = new THREE.Mesh(new THREE.BufferGeometry(), R.lipMat);
  root.add(R.upperLip, R.lowerLip);
  // palate midline guide (thin line)
  const pal = sampleOpen(PALATE, 30).map(([z, y]) => V(0, y + 0.4, z));
  R.palLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pal), new THREE.LineBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.5 })); root.add(R.palLine);
  // airflow
  const pathO = [[16, -100], [18, -80], [16, -60], [18, -45], [28, -34.5], [45, -34], [62, -37], [76, -45], [88, -51], [100, -52], [122, -52]];
  const pathN = [[16, -100], [18, -80], [16, -60], [15, -40], [18, -27], [28, -15], [55, -8], [85, -12], [106, -22], [126, -26]];
  R.oral = new THREE.CatmullRomCurve3(pathO.map(([z, y]) => V(0, y, z))); R.nasal = new THREE.CatmullRomCurve3(pathN.map(([z, y]) => V(0, y, z)));
  const NP = ctx.MOBILE ? 110 : 190;
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  R.air = new THREE.Points(pg, new THREE.PointsMaterial({ map: ctx.glowTex(), size: 2.2, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); R.air.renderOrder = 6; root.add(R.air);
  R.airP = Array.from({ length: NP }, (_, i) => ({ s: Math.random(), nasal: i % 3 === 0, x: (Math.random() - 0.5) * 8, v: 0.25 + Math.random() * 0.15, jit: Math.random() * 6.28 }));
  R.airOn = true;
  // glottis (magnified top view), placed beside the neck
  R.glot = buildGlottis(ctx, opts.glottisAt || V(0, -112, 84)); R.glot.g.visible = opts.glottis !== false;
  if (opts.clip) for (const m of [R.tongue, R.velum, R.upperLip, R.lowerLip, R.wall]) { m.material.clippingPlanes = opts.clip; m.material.side = THREE.DoubleSide; }

  const init = { U: REST_U.map((p) => p.slice()), jaw: 0.04, lips: { close: 0, round: 0, protr: 0, labiodental: 0, spread: 0 }, velum: 0.2, groove: 0, lateral: 0, trill: 0, tipCurl: 0 };
  R.cur = JSON.parse(JSON.stringify(init)); R.tgt = JSON.parse(JSON.stringify(init));
  R.set = (pose, rate) => { R.tgt = Object.assign(JSON.parse(JSON.stringify(init)), JSON.parse(JSON.stringify(pose))); R.tgt.lips = Object.assign({}, init.lips, pose.lips || {}); if (rate) R.rate = rate; };
  R.rate = 9;
  R.tongueWidth = (z) => 6 + 11 * smooth((79 - z) / 18) - 3 * smooth((34 - z) / 12);
  R.contactGlow = 0;
  R.extraDeform = null; // (i, u, upper) => [dz, dy]

  R.update = (dt) => {
    const k = 1 - Math.exp(-R.rate * dt), c = R.cur, g = R.tgt;
    for (let i = 0; i < 7; i++) { c.U[i][0] = lerp(c.U[i][0], g.U[i][0], k); c.U[i][1] = lerp(c.U[i][1], g.U[i][1], k); }
    for (const key of ['jaw', 'velum', 'groove', 'lateral', 'trill']) c[key] = lerp(c[key], g[key] || 0, k);
    for (const key of ['close', 'round', 'protr', 'labiodental', 'spread']) c.lips[key] = lerp(c.lips[key], g.lips[key] || 0, k);
    R.trillPh += dt * 26;
    R.jaw.rotation.x = c.jaw;
    // tongue contour (upper points ride partly with the jaw)
    const up = c.U.map((p, i) => { const q = p.slice(); if (i === 0 && c.trill > 0.05) q[1] -= c.trill * 2.2 * (0.5 + 0.5 * Math.sin(R.trillPh)); return rot(q, c.jaw * (i < 3 ? 0.75 : i < 5 ? 0.55 : 0.3)); });
    const lo = LOWER.map((p) => rot(p, c.jaw * 0.85));
    const upper = sampleOpen(up, NU), lower = sampleOpen([up[6], ...lo, up[0]], NL + 2).slice(1, -1);
    const contour = upper.concat(lower);
    writeLoft(R.tongueGeo, contour, M, (z) => R.tongueWidth(z), NU, (i, u, isUp) => {
      let dz = 0, dy = 0;
      if (isUp) {
        const f = i / NU; // 0 tip → 1 root
        if (c.groove > 0.01) dy -= c.groove * 2.2 * (1 - u * u) * smooth(1 - Math.abs(f - 0.25) / 0.3);
        if (c.lateral > 0.01) dy -= c.lateral * 4 * u * u * smooth(1 - Math.abs(f - 0.35) / 0.3);
      }
      if (R.extraDeform) { const d = R.extraDeform(i, u, isUp, f(i)); dz += d[0]; dy += d[1]; }
      return [dz, dy];
    });
    function f(i) { return i / NU; }
    R.tongueMat.emissiveIntensity = 0.3 + R.contactGlow;
    // velum between lowered and raised shapes
    const vel = VEL_DOWN.map((p, i) => [lerp(p[0], VEL_UP[i][0], c.velum), lerp(p[1], VEL_UP[i][1], c.velum)]);
    const vs = sampleOpen(vel, 12);
    const vc = vs.map(([z, y]) => [z, y + 1.8]).concat(vs.slice().reverse().map(([z, y], i) => [z, y - 1.8 - 1.2 * smooth(i / 11)]));
    writeLoft(R.velGeo, vc, 8, (z) => 3 + 12 * smooth((z - 14) / 26));
    // posterior pharyngeal wall
    const ws = sampleOpen(WALL, 16);
    const wc = ws.map(([z, y]) => [z + R.wallBulge(y), y]).concat(ws.slice().reverse().map(([z, y]) => [z - 2.5 + R.wallBulge(y), y]));
    writeLoft(R.wallGeo, wc, 8, () => 17);
    // lips
    const L = c.lips, jawDrop = (p) => rot(p, c.jaw * 0.9);
    const width = 23 * (1 - 0.38 * L.round) * (1 + 0.1 * L.spread), pz = 96 + 5 * L.protr - 1.5 * L.spread;
    const gap = 9 * (1 - L.close) * (1 - 0.6 * L.labiodental);
    const upY = -47.5 - 2.8 * L.close + 1.5 * L.labiodental;
    let [lz, ly] = jawDrop([94 + 4 * L.protr, -58]);
    ly = L.close > 0.01 ? lerp(ly, upY - 6.5, L.close) : ly;
    if (L.labiodental > 0.01) { lz = lerp(lz, 89.5, L.labiodental); ly = lerp(ly, -55.5, L.labiodental); }
    R.upperLip.geometry.dispose(); R.lowerLip.geometry.dispose();
    R.upperLip.geometry = lipGeo(width, pz, upY, 4.3, -1, L.round);
    R.lowerLip.geometry = lipGeo(width, lz + 1, ly, 4.8, 1, L.round);
    R.tongue.visible = R.velum.visible = R.upperLip.visible = R.lowerLip.visible = R.visible !== false;
  };
  function lipGeo(w, z, y, r, dir, round) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const x = -w + (2 * w * i) / 10, t = x / w; pts.push(V(x, y + dir * -1.2 * (1 - t * t) * round, z - 10 * t * t * (1 - 0.4 * round))); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 10, false);
  }

  // airflow: kind = 'vowel'|'stop'|'fricative'|'nasal'|'lateral'|'approx'|'silent'|'trill'; phase 0..1 for stops (closure→release)
  R.flow = { kind: 'vowel', s: 0.7, closed: false, burst: 0, voiced: true, aspir: 0 };
  R.updateAir = (dt) => {
    const P = R.airP, pos = R.air.geometry.attributes.position, col = R.air.geometry.attributes.color, F = R.flow;
    const cVoiced = new THREE.Color(COL.air), cFric = new THREE.Color(0xffffff), cNas = new THREE.Color(COL.violet);
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const nasalRoute = F.kind === 'nasal' ? true : F.kind === 'nasalised' ? p.nasal : false;
      let v = p.v * (F.kind === 'silent' ? 0 : 1) * (F.burst > 0 ? 1 + 3 * F.burst : 1);
      let s = p.s + v * dt * 0.55;
      const lim = F.closed && !nasalRoute ? F.s - 0.02 : 2;
      if (s > lim) s = lim - Math.random() * 0.12;
      if (s > 1) s = Math.random() * 0.05;
      p.s = s;
      const curve = nasalRoute ? R.nasal : R.oral;
      const q = curve.getPointAt(clamp(s, 0, 1));
      let x = p.x * 0.35, dy = 0;
      const nearC = Math.exp(-Math.pow((s - F.s) / 0.035, 2));
      if (F.kind === 'fricative' || F.kind === 'affric') { x += Math.sin(p.jit + s * 90) * 4 * nearC * (s > F.s ? 1 : 0.3); dy += Math.cos(p.jit * 3 + s * 70) * 2 * nearC; }
      if (F.kind === 'lateral' && Math.abs(s - F.s) < 0.08) x = Math.sign(p.x || 1) * 9;
      pos.setXYZ(i, x, q.y + dy, q.z);
      const pressure = F.closed && !nasalRoute ? smooth((s - (F.s - 0.25)) / 0.25) : 0;
      const b = (F.kind === 'silent' ? 0 : 0.35 + 0.65 * (F.burst > 0 ? 1 : 0.6)) * (s > 0.98 ? 0.2 : 1);
      const c = nasalRoute ? cNas : (F.kind === 'fricative' || F.kind === 'affric') && s > F.s - 0.02 ? cFric : cVoiced;
      col.setXYZ(i, c.r * b * (1 + pressure), c.g * b * (1 + pressure), c.b * b * (1 + pressure));
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    if (F.burst > 0) F.burst = Math.max(0, F.burst - dt * 3);
  };
  return R;
}

// ---------------------------------------------------------------- glottis inset (superior view)
export function buildGlottis(ctx, at) {
  const g = new THREE.Group(); g.position.copy(at); ctx.scene.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 1.2, 10, 40), std(0xc9828a, { opacity: 0.85 })); ring.scale.set(0.75, 1, 1); g.add(ring);
  const foldMat = solid(0xf2e6e2, { roughness: 0.35, emissive: 0x201010 });
  const mkFold = (s) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 11, 6, 12), foldMat); m.geometry.translate(0, -5.5, 0); m.position.set(0, 6.5, 0); m.userData.s = s; g.add(m); return m; };
  const L = mkFold(1), Rf = mkFold(-1);
  const aryMat = solid(0xd9a0a0, { roughness: 0.5 });
  const aL = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), aryMat), aR = aL.clone(); g.add(aL, aR);
  const glow = ctx.sprite(COL.air, 10, 0); g.add(glow);
  g.rotation.set(0, -Math.PI / 2, 0); g.scale.setScalar(0.9);
  const G = { g, L, R: Rf, aL, aR, glow, open: 0.2, vib: 0, ph: 0, state: 'voiced' };
  G.update = (dt, state, amp = 1) => {
    const target = { voiced: 0.04, voiceless: 0.55, breathy: 0.3, closed: 0, open: 0.8, whisper: 0.35 }[state] ?? 0.2;
    G.open = lerp(G.open, target, 1 - Math.exp(-10 * dt));
    const vib = state === 'voiced' || state === 'breathy' ? 1 : 0;
    G.vib = lerp(G.vib, vib, 1 - Math.exp(-12 * dt)); G.ph += dt * 18;
    const w = G.vib * 0.09 * amp * (0.5 + 0.5 * Math.sin(G.ph));
    L.rotation.z = G.open * 0.55 + w; Rf.rotation.z = -(G.open * 0.55 + w);
    const pL = V(-Math.sin(L.rotation.z) * -11 * -1, -4.5, 0);
    aL.position.set(-1.5 - 11 * Math.sin(G.open * 0.55 + w), 6.5 - 11 * Math.cos(G.open * 0.55 + w), 0);
    aR.position.set(1.5 + 11 * Math.sin(G.open * 0.55 + w), 6.5 - 11 * Math.cos(G.open * 0.55 + w), 0);
    L.position.x = -0.8; Rf.position.x = 0.8;
    glow.material.opacity = G.open > 0.15 ? 0.25 : G.vib * 0.35;
    void pL;
  };
  return G;
}
