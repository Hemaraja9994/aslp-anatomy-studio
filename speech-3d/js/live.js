// Live voice analysis in the browser: F0 (autocorrelation), F1/F2 (LPC), a scrolling spectrogram and an
// approximate voice-onset time for stop + vowel syllables. Audio is analysed locally and never stored or sent.

// Reference vowel formants (Hz). English: Hillenbrand et al. (1995) adult male means.
// Kannada: approximate adult male values from Indian acoustic studies (teaching approximations).
export const TARGETS = {
  en: [['i', 342, 2322], ['ɪ', 427, 2034], ['e', 476, 2089], ['ɛ', 580, 1799], ['æ', 588, 1952], ['ʌ', 623, 1200], ['ɑ', 768, 1333], ['ɔ', 652, 997], ['o', 497, 910], ['ʊ', 469, 1122], ['u', 378, 997], ['ɝ', 474, 1379]],
  kn: [['ಇ i', 300, 2250], ['ಎ e', 440, 2000], ['ಅ ɐ', 620, 1320], ['ಆ aː', 720, 1260], ['ಒ o', 460, 930], ['ಉ u', 330, 860]],
};
export const SPEAKER = { m: 1, f: 1.16, c: 1.32 };

export function createLive() {
  const L = { on: false, err: '', f0: 0, f1: 0, f2: 0, voiced: false, level: -100, f0Trail: [], fTrail: [], vot: null, spk: 'm', spec: null };
  let AC, stream, src, proc, an, freq, sr = 48000;
  const RING = 96000; const ring = new Float32Array(RING); let wpos = 0;
  // 2-ms feature frames for VOT
  const FR = []; let frAcc = 0, frLF = 0, frHF = 0, frN = 0, lpState = 0, prevX = 0;
  let quiet = 0, pending = null, noise = -70, frameNo = 0;

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) { L.err = 'Microphone permission was refused or no microphone is available.'; return false; }
    AC = new (window.AudioContext || window.webkitAudioContext)(); await AC.resume(); sr = AC.sampleRate;
    src = AC.createMediaStreamSource(stream);
    an = AC.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; freq = new Uint8Array(an.frequencyBinCount);
    proc = AC.createScriptProcessor(1024, 1, 1);
    const sub = Math.round(sr * 0.002);
    const aLP = Math.exp(-2 * Math.PI * 450 / sr);
    proc.onaudioprocess = (e) => {
      const x = e.inputBuffer.getChannelData(0);
      for (let i = 0; i < x.length; i++) {
        const v = x[i]; ring[wpos] = v; wpos = (wpos + 1) % RING;
        lpState = aLP * lpState + (1 - aLP) * v; const hp = v - prevX; prevX = v;
        frAcc += v * v; frLF += lpState * lpState; frHF += hp * hp; frN++;
        if (frN >= sub) { pushFrame(frAcc / frN, frLF / frN, frHF / frN); frAcc = frLF = frHF = 0; frN = 0; }
      }
    };
    src.connect(an); src.connect(proc); proc.connect(AC.destination); // output is silent (we never write to it)
    L.on = true; L.err = ''; return true;
  }
  function stop() {
    L.on = false;
    try { proc && proc.disconnect(); src && src.disconnect(); stream && stream.getTracks().forEach((t) => t.stop()); AC && AC.close(); } catch (e) { /* closed */ }
    AC = null;
  }
  const dB = (p) => 10 * Math.log10(p + 1e-12);
  // --- VOT detector on 2-ms frames: burst = abrupt high-frequency rise after a quiet closure;
  // voicing = sustained low-frequency (<450 Hz) energy. Negative VOT = voicing leads the burst.
  function pushFrame(tot, lf, hf) {
    const f = { t: dB(tot), lf: dB(lf), hf: dB(hf) }; FR.push(f); frameNo++; if (FR.length > 600) FR.shift();
    const n = FR.length; if (n < 40) return;
    const base0 = frameNo - n; // absolute number of FR[0] minus 1
    if (f.t < noise) noise = noise * 0.9 + f.t * 0.1; else noise += 0.01;
    const cur = FR[n - 1];
    if (cur.t < noise + 8) quiet++; else if (!pending) quiet = Math.max(0, quiet - 1);
    if (!pending && quiet > 15) {
      const base = (FR[n - 6].hf + FR[n - 7].hf + FR[n - 8].hf) / 3;
      if (cur.hf > base + 18 && cur.hf > noise + 14) pending = { abs: frameNo, age: 0 };
    }
    if (pending) {
      pending.age++;
      if (pending.age >= 75) { // 150 ms after the burst
        const b = pending.abs - base0 - 1; pending = null; quiet = 0;
        const thr = noise + 14, voicedAt = (k) => FR[k] && FR[k].lf > thr && FR[k].lf > FR[k].hf - 6;
        let lead = 0; for (let k = b - 1; k > b - 90 && k > 0; k--) { if (voicedAt(k)) lead++; else break; }
        if (lead >= 10) { L.vot = { ms: -lead * 2, at: performance.now() }; return; }
        for (let k = b + 1; k < Math.min(FR.length - 8, b + 75); k++) {
          let ok = true; for (let j = 0; j < 8; j++) if (!voicedAt(k + j)) { ok = false; break; }
          if (ok) { L.vot = { ms: (k - b) * 2, at: performance.now() }; return; }
        }
      }
    }
  }
  function lastSamples(n, dec) {
    const out = new Float32Array(n); let p = (wpos - n * dec + RING) % RING;
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < dec; j++) { s += ring[p]; p = (p + 1) % RING; } out[i] = s / dec; }
    return out;
  }
  function pitch() {
    const dec = 2, fs = sr / dec, x = lastSamples(1024, dec);
    let e = 0; for (const v of x) e += v * v; const rms = Math.sqrt(e / x.length); L.level = 20 * Math.log10(rms + 1e-9);
    const minL = Math.floor(fs / 450), maxL = Math.floor(fs / 70); let best = 0, bl = 0;
    for (let l = minL; l <= maxL; l++) { let s = 0, a = 0, b = 0; for (let i = 0; i + l < x.length; i++) { s += x[i] * x[i + l]; a += x[i] * x[i]; b += x[i + l] * x[i + l]; } const r = s / Math.sqrt(a * b + 1e-12); if (r > best) { best = r; bl = l; } }
    return { f0: best > 0.55 && L.level > -48 ? fs / bl : 0, clar: best };
  }
  function formants() {
    const dec = Math.max(1, Math.round(sr / 11000)), fs = sr / dec, N = 480;
    const x = lastSamples(N, dec);
    for (let i = N - 1; i > 0; i--) x[i] -= 0.97 * x[i - 1];
    for (let i = 0; i < N; i++) x[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
    const p = 12, r = new Float64Array(p + 1);
    for (let k = 0; k <= p; k++) { let s = 0; for (let i = 0; i + k < N; i++) s += x[i] * x[i + k]; r[k] = s; }
    if (r[0] <= 0) return null; r[0] *= 1.0001;
    const a = new Float64Array(p + 1); a[0] = 1; let err = r[0];
    for (let i = 1; i <= p; i++) { let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j]; const k = -acc / err; const prev = a.slice(); for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j]; a[i] = k; err *= 1 - k * k; if (err <= 0) return null; }
    const M = 300, env = new Float64Array(M);
    for (let m = 0; m < M; m++) { const w = (Math.PI * m) / M; let re = 0, im = 0; for (let k = 0; k <= p; k++) { re += a[k] * Math.cos(k * w); im -= a[k] * Math.sin(k * w); } env[m] = -Math.log(re * re + im * im + 1e-12); }
    const peaks = []; for (let m = 1; m < M - 1; m++) if (env[m] > env[m - 1] && env[m] >= env[m + 1]) peaks.push((m / M) * (fs / 2));
    const f1 = peaks.find((f) => f > 200 && f < 1100); if (!f1) return null;
    const f2 = peaks.find((f) => f > f1 + 250 && f < 3300); if (!f2) return null;
    return { f1, f2 };
  }
  const med = (arr) => { const s = arr.slice().sort((q, w) => q - w); return s[s.length >> 1]; };
  const h1 = [], h2 = [];
  function tick() {
    if (!L.on) return;
    const pr = pitch(); L.voiced = pr.f0 > 0; L.f0 = pr.f0;
    L.f0Trail.push(L.f0); if (L.f0Trail.length > 240) L.f0Trail.shift();
    if (L.voiced) { const fm = formants(); if (fm) { h1.push(fm.f1); h2.push(fm.f2); if (h1.length > 5) { h1.shift(); h2.shift(); } L.f1 = med(h1); L.f2 = med(h2); L.fTrail.push([L.f1, L.f2]); if (L.fTrail.length > 40) L.fTrail.shift(); } }
    else if (h1.length) { h1.shift(); h2.shift(); }
    if (an) { an.getByteFrequencyData(freq); L.spec = freq; L.binHz = sr / an.fftSize; }
  }
  // articulatory estimate from formants (height from F1, backness from F2), normalised for speaker type
  function artic() {
    const k = SPEAKER[L.spk] || 1, f1 = L.f1 / k, f2 = L.f2 / k;
    const h = Math.max(0, Math.min(1, (820 - f1) / (820 - 300))), b = Math.max(0, Math.min(1, (2300 - f2) / (2300 - 850)));
    return { h, b, round: b > 0.62 && h > 0.35 ? 1 : 0 };
  }
  return Object.assign(L, { start, stop, tick, artic });
}
