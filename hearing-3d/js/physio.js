// Shared physiology model: stimulus, place map, ear-canal gain, BM response, ABR, clinical profiles.
// Values are teaching approximations drawn from standard sources (Greenwood 1990; Shaw 1974;
// Ruggero et al. 1997; Hall, New Handbook of Auditory Evoked Responses, 2007).

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

export const STIMS = [
  { id: '250', f: 250, label: '250 Hz' },
  { id: '500', f: 500, label: '500 Hz' },
  { id: '1000', f: 1000, label: '1 kHz' },
  { id: '2000', f: 2000, label: '2 kHz' },
  { id: '4000', f: 4000, label: '4 kHz' },
  { id: '8000', f: 8000, label: '8 kHz' },
  { id: 'click', f: null, label: 'Click' },
];
export const stimById = (id) => STIMS.find((s) => s.id === id) || STIMS[2];

export const CONDITIONS = [
  { id: 'normal', group: '', label: 'Normal hearing' },
  { id: 'wax', group: 'Conductive', label: 'Impacted cerumen (wax)' },
  { id: 'perforation', group: 'Conductive', label: 'Tympanic membrane perforation' },
  { id: 'ome', group: 'Conductive', label: 'Otitis media with effusion' },
  { id: 'otosclerosis', group: 'Conductive', label: 'Otosclerosis (stapes fixation)' },
  { id: 'ohc', group: 'Cochlear', label: 'Presbycusis (sloping OHC loss)' },
  { id: 'nihl', group: 'Cochlear', label: 'Noise-induced loss (4 kHz notch)' },
  { id: 'dead', group: 'Cochlear', label: 'Cochlear dead region (3–10 kHz)' },
  { id: 'vs', group: 'Retrocochlear', label: 'Vestibular schwannoma' },
];
export const condById = (id) => CONDITIONS.find((c) => c.id === id) || CONDITIONS[0];

export function fmtF(f) {
  if (!f) return 'click';
  return f >= 1000 ? (Math.round(f / 100) / 10) + ' kHz' : Math.round(f) + ' Hz';
}

// Tonotopic palette: low frequencies warm, high frequencies cool.
const PAL = [[250, [1.0, 0.42, 0.22]], [500, [1.0, 0.64, 0.22]], [1000, [1.0, 0.86, 0.38]],
  [2000, [0.48, 1.0, 0.58]], [4000, [0.25, 0.84, 1.0]], [8000, [0.58, 0.5, 1.0]]];
export function freqRGB(f) {
  if (!f) return [0.86, 0.93, 1.0];
  const x = Math.log2(clamp(f, 250, 8000));
  for (let i = 0; i < PAL.length - 1; i++) {
    const a = Math.log2(PAL[i][0]), b = Math.log2(PAL[i + 1][0]);
    if (x <= b) { const t = (x - a) / (b - a); return PAL[i][1].map((v, k) => v + (PAL[i + 1][1][k] - v) * t); }
  }
  return PAL[PAL.length - 1][1];
}

// Greenwood (1990) human place map, d = mm from base, 35 mm duct.
export const LEN = 35;
export const cfAt = (d) => 165.4 * (Math.pow(10, 0.06 * (LEN - d)) - 0.88);
export const placeOf = (f) => clamp(LEN - Math.log10(f / 165.4 + 0.88) / 0.06, 0, LEN);
export const lambdaMM = (f) => 343000 / f;

// Ear canal + concha pressure gain at the eardrum re free field (approx. Shaw 1974, frontal incidence).
const EXT = [[125, 0], [250, 0.5], [500, 1.5], [1000, 3], [1500, 6], [2000, 12], [2700, 17], [3500, 16], [4000, 14],
  [5000, 10], [6000, 7], [8000, 4], [10000, 2], [16000, 0]];
export function extGain(f) {
  if (!f) return 12;
  const x = Math.log2(f);
  if (f <= EXT[0][0]) return EXT[0][1];
  for (let i = 0; i < EXT.length - 1; i++) {
    const a = Math.log2(EXT[i][0]), b = Math.log2(EXT[i + 1][0]);
    if (x <= b) return EXT[i][1] + (EXT[i + 1][1] - EXT[i][1]) * (x - a) / (b - a);
  }
  return 0;
}

// Visual (slowed) vibration frequency used for eardrum, ossicles and BM.
export function visFreq(f) {
  if (!f) return 1.3;
  return 0.65 + 0.33 * Math.log2(f / 250); // 250 Hz → 0.65 Hz … 8 kHz → 2.3 Hz
}

// Condition parameters (visual factors + dB losses used by the models).
export function condition(id) {
  const base = { id, meLoss: 0, tm: 1, chain: 1, stapes: 1, tmHole: false, fluid: false, focus: false, ohc: false, vs: false, rock: 1, wax: false };
  switch (id) {
    case 'wax': return { ...base, meLoss: 30, tm: 0.18, chain: 0.18, stapes: 0.18, wax: true };
    case 'nihl': case 'dead': return { ...base, ohc: true };
    case 'perforation': return { ...base, meLoss: 20, tm: 0.55, chain: 0.45, stapes: 0.45, tmHole: true };
    case 'ome': return { ...base, meLoss: 25, tm: 0.28, chain: 0.3, stapes: 0.3, fluid: true };
    case 'otosclerosis': return { ...base, meLoss: 35, tm: 0.6, chain: 0.3, stapes: 0.04, focus: true, rock: 0 };
    case 'ohc': return { ...base, ohc: true };
    case 'vs': return { ...base, vs: true };
    default: return base;
  }
}
export function isConductive(id) { return id === 'wax' || id === 'perforation' || id === 'ome' || id === 'otosclerosis'; }
export const ihcAlive = (cf, condId) => !(condId === 'dead' && cf >= 3000 && cf <= 10000);
// Middle-ear pressure gain, eardrum → vestibule (approx.; peaks near 1 kHz).
export function meGain(f) { const x = Math.log2((f || 2000) / 1000); return clamp(25 - 5 * x * x, 8, 25); }

export function ohcHealth(cf, condId) {
  if (condId === 'nihl') { const z = Math.log2(cf / 4000) / 0.55; return 1 - 0.92 * Math.exp(-z * z); }
  if (condId === 'dead') {
    if (cf >= 3000 && cf <= 10000) return 0;
    const z = cf < 3000 ? Math.log2(3000 / cf) / 0.5 : Math.log2(cf / 10000) / 0.5; return 1 - Math.exp(-z * z);
  }
  if (condId !== 'ohc') return 1;
  const t = clamp(Math.log2(cf / 1000) / 2.5, 0, 1); // sloping from 1 kHz, gone by ~5.7 kHz
  return 1 - t * t * (3 - 2 * t) * 0.97;
}

// ---- basilar-membrane response (same model as the Travelling Wave Lab) ----
function gmax(c) { const t = clamp(Math.log2(c / 250) / 2, 0, 1); return 35 + 25 * t; }
function passive(r) { return r < -0.5 ? -30 - (-0.5 - r) * 8 : -30 - (r + 0.5) * (r + 0.5) * 55; }
function tip(r) { const s = r < 0 ? 0.22 : 0.12; return Math.exp(-(r * r) / (s * s)); }
function effGain(c, L, h) { return Math.max(0, gmax(c) * h - 0.8 * Math.max(0, L - 30)); }
export function bmOut(f, L, c, h) { const r = Math.log2(f / c); return L + passive(r) + effGain(c, L, h) * tip(r); }
export const dispOf = (O) => Math.tanh(1.3 * Math.pow(10, (O - 65) / 30));
function phaseOf(f, c) { const r = Math.log2(f / c); return -2 * Math.PI * 2.5 * Math.pow(2, 1.3 * Math.min(r, 0.3)); }

// Profile of BM motion sampled at N points from base (d=0) to apex (d=35 mm).
export function bmProfile(stimId, condId, N = 400, level = 70) {
  const st = stimById(stimId), cd = condition(condId);
  const amp = new Float32Array(N), phase = new Float32Array(N), tau = new Float32Array(N), vis = new Float32Array(N), ncyc = new Float32Array(N);
  let peakI = 0, peak = 0;
  for (let i = 0; i < N; i++) {
    const d = (i / (N - 1)) * LEN, c = cfAt(d), h = ohcHealth(c, condId);
    let O;
    if (st.f) {
      const L = level + (extGain(st.f) - 8) - cd.meLoss;
      O = bmOut(st.f, L, c, h);
      phase[i] = phaseOf(st.f, c);
    } else {
      let Lb = level - 8 + (extGain(c) - 8) * 0.8 - cd.meLoss;
      if (c < 300) Lb -= 6 * Math.log2(300 / c);
      if (c > 6000) Lb -= 12 * Math.log2(c / 6000);
      O = bmOut(c, Lb, c, h);
      tau[i] = 0.12 + 2.3 * Math.pow(d / LEN, 2.1);
      vis[i] = Math.max(0.45, 0.5 + 0.4 * Math.log2(c / 125));
      ncyc[i] = 1.2 + 2.3 * h;
    }
    amp[i] = dispOf(O);
    if (amp[i] > peak) { peak = amp[i]; peakI = i; }
  }
  return { amp, phase, tau, vis, ncyc, click: !st.f, peak, peakD: (peakI / (N - 1)) * LEN, N };
}

// Relative neural drive at the characteristic place (1 = normal at this stimulus).
export function firing(stimId, condId) {
  const P = bmProfile(stimId, condId, 200), n = bmProfile(stimId, 'normal', 200).peak;
  // neural drive only from places with surviving IHCs
  let p = 0; for (let i = 0; i < 200; i++) { if (ihcAlive(cfAt((i / 199) * LEN), condId)) p = Math.max(p, P.amp[i]); }
  let s = clamp(p / Math.max(n, 1e-3), 0.05, 1);
  if (condId === 'vs') s *= 0.8;
  return s;
}

// ---- ABR (click 80 dB nHL reference latencies, ms) ----
const BASE = [
  { n: 'I', lat: 1.6, amp: 0.30, w: 0.20, gen: 'Distal VIII nerve' },
  { n: 'II', lat: 2.7, amp: 0.16, w: 0.20, gen: 'Proximal VIII nerve' },
  { n: 'III', lat: 3.7, amp: 0.28, w: 0.22, gen: 'Cochlear nucleus' },
  { n: 'IV', lat: 4.9, amp: 0.22, w: 0.22, gen: 'Superior olivary complex' },
  { n: 'V', lat: 5.6, amp: 0.50, w: 0.28, gen: 'Lateral lemniscus → inferior colliculus' },
  { n: 'VI', lat: 7.2, amp: 0.20, w: 0.40, gen: 'Medial geniculate body' },
  { n: 'VII', lat: 9.0, amp: 0.12, w: 0.50, gen: 'Auditory radiation' },
];
const TONE_DELAY = { 250: 3.0, 500: 2.1, 1000: 1.3, 2000: 0.7, 4000: 0.3, 8000: 0.05 };

export function abr(stimId, condId) {
  const st = stimById(stimId);
  const d0 = st.f ? TONE_DELAY[st.f] : 0;
  const waves = BASE.map((w) => ({ ...w, lat: w.lat + d0, amp: w.amp * (st.f && st.f <= 500 && w.n === 'I' ? 0.5 : 1) }));
  const shiftAll = (ms, k) => waves.forEach((w) => { w.lat += ms; w.amp *= k; });
  switch (condId) {
    case 'perforation': shiftAll(0.6, 0.72); break;
    case 'ome': shiftAll(0.75, 0.62); break;
    case 'wax': shiftAll(0.9, 0.55); break;
    case 'otosclerosis': shiftAll(1.05, 0.5); break;
    case 'nihl': case 'dead':
    case 'ohc': {
      const hf = !st.f || st.f >= 2000;
      if (hf) { waves.forEach((w) => { w.lat += w.n === 'I' ? 0.2 : 0.3; w.amp *= w.n === 'I' ? 0.35 : 0.8; }); }
      break;
    }
    case 'vs': {
      const add = { I: 0, II: 0.5, III: 0.8, IV: 1.0, V: 1.1, VI: 1.2, VII: 1.3 };
      waves.forEach((w) => { w.lat += add[w.n]; if (w.n !== 'I') { w.amp *= w.n === 'V' ? 0.5 : 0.6; w.w *= 1.5; } });
      break;
    }
    default: break;
  }
  const L = Object.fromEntries(waves.map((w) => [w.n, w.lat]));
  return { waves, L, I_III: L.III - L.I, III_V: L.V - L.III, I_V: L.V - L.I, end: L.VII + 4 };
}

export function abrValue(waves, t) {
  let y = 0;
  for (const w of waves) {
    const x = t - w.lat;
    y += w.amp * (Math.exp(-(x * x) / (w.w * w.w)) - 0.55 * Math.exp(-((x - 1.4 * w.w) * (x - 1.4 * w.w)) / (1.4 * w.w * w.w)));
  }
  // deterministic low-level "EEG" texture
  y += 0.018 * Math.sin(t * 13.1) + 0.012 * Math.sin(t * 29.7 + 1.3) + 0.008 * Math.sin(t * 51.3 + 0.4);
  return y;
}

// ---- clinical signature ----
export function clinical(condId) {
  const T = {
    normal: ['Type A', 'Present', 'Present', 'Normal latencies, I–V ≈ 4.0 ms', 'Normal (≤ 20 dB HL)'],
    wax: ['Type B, low ear-canal volume (if occlusive)', 'Absent', 'Absent', 'All waves delayed, I–V normal', 'Conductive, up to ≈ 40 dB when fully occluding'],
    perforation: ['Flat, large ear-canal volume', 'Absent (probe ear)', 'Usually absent', 'All waves delayed, I–V normal', 'Conductive, 10–40 dB air–bone gap'],
    ome: ['Type B, normal volume', 'Absent', 'Absent', 'All waves delayed, I–V normal', 'Conductive, 20–30 dB, often flat'],
    otosclerosis: ['Type As (stiff)', 'Absent (early: on–off effect)', 'Absent', 'All waves delayed, I–V normal', 'Conductive → mixed; Carhart notch ≈ 2 kHz (BC)'],
    ohc: ['Type A', 'Present at reduced sensation level (recruitment)', 'Absent at affected frequencies', 'Wave I small; V near normal at high levels; I–V normal', 'Sloping high-frequency SNHL'],
    nihl: ['Type A', 'Present; reduced sensation level', 'Reduced or absent around 3–6 kHz', 'Usually normal for clicks; I–V normal', 'Notch at 3–6 kHz with recovery at 8 kHz'],
    dead: ['Type A', 'Present at low frequencies', 'Absent across the dead region', 'Wave I small or absent; I–V normal if measurable', 'Steep high-frequency SNHL; TEN(HL) positive at 3–8 kHz'],
    vs: ['Type A', 'Elevated or absent; reflex decay', 'Often present', 'I–III and I–V prolonged (> 4.4 ms); interaural V difference > 0.4 ms', 'Asymmetric SNHL; word recognition poorer than expected'],
  }[condId] || [];
  return ['Tympanogram', 'Acoustic reflex', 'OAEs', 'ABR', 'Audiogram'].map((k, i) => [k, T[i]]);
}
