// Tinnitus 3D: deafferentation, central gain, tonotopic reorganisation, thalamocortical and limbic networks,
// somatosensory modulation, objective / pulsatile tinnitus, assessment and evidence-based management.
import { createLab, createNetwork, THREE, V, clamp, lerp, smooth, CSS, COL, std, solid, shellMat, sprite, tube, canvasCtx, $, MOBILE } from '../../lab3d/engine.js';

const D2R = Math.PI / 180;
const F = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000, 10000, 12500, 16000];
const FL = ['.25', '.5', '1', '2', '3', '4', '6', '8', '10', '12.5', '16'];
// ---------------------------------------------------------------- hearing profiles (right ear R, left ear L; dB HL)
const PROF = [
  { id: 'hidden', name: 'Normal audiogram, hidden hearing loss', R: [5, 5, 5, 5, 5, 10, 10, 10, 20, 30, 40], L: [5, 5, 5, 5, 10, 10, 10, 15, 25, 30, 45], syn: 0.45, pitch: 12000, type: 'hiss', lat: 'Bilateral', flag: '',
    note: 'Normal 0.25–8 kHz thresholds, but reduced extended-high-frequency hearing and fewer inner-hair-cell synapses (cochlear synaptopathy). Common after noise exposure; ABR wave I may be reduced.' },
  { id: 'nihl', name: 'Noise-induced hearing loss (4 kHz notch)', R: [10, 10, 10, 15, 35, 55, 45, 30, 35, 45, 55], L: [10, 10, 15, 20, 40, 60, 50, 35, 40, 45, 60], syn: 0.3, pitch: 4000, type: 'tonal', lat: 'Bilateral', flag: '',
    note: 'Bilateral notch at 3–6 kHz with recovery at 8 kHz. Tinnitus pitch usually matches the notch. Counsel on hearing protection.' },
  { id: 'presby', name: 'Age-related hearing loss (sloping)', R: [15, 15, 20, 30, 40, 50, 60, 65, 80, 95, 110], L: [15, 20, 20, 30, 40, 50, 60, 70, 85, 100, 110], syn: 0.4, pitch: 6000, type: 'hiss', lat: 'Bilateral', flag: '',
    note: 'Symmetric sloping high-frequency loss. Tinnitus is often a high-pitched hiss inside the region of loss. Hearing aids are first line.' },
  { id: 'menieres', name: "Ménière's disease (right)", R: [55, 50, 40, 30, 25, 25, 30, 35, 40, 45, 50], L: [10, 10, 10, 10, 15, 15, 15, 20, 25, 30, 35], syn: 0.1, pitch: 250, type: 'roar', lat: 'Right', flag: 'Unilateral: exclude retrocochlear pathology (MRI of the internal auditory meatus).',
    note: 'Low-frequency, fluctuating SNHL with a low-pitched roaring tinnitus, aural fullness and episodic vertigo lasting 20 min to 12 h.' },
  { id: 'ssnhl', name: 'Sudden SNHL (right)', R: [70, 75, 80, 85, 85, 90, 90, 95, 100, 110, 120], L: [10, 10, 10, 10, 15, 15, 20, 20, 25, 30, 35], syn: 0.6, pitch: 4000, type: 'hiss', lat: 'Right', flag: 'RED FLAG: sudden SNHL (≥ 30 dB over 3 contiguous frequencies within 72 h). Refer urgently for steroids (oral or intratympanic) and MRI.',
    note: 'Sudden loss is an otological emergency. Tinnitus accompanies it in about 80 % of cases.' },
  { id: 'vs', name: 'Vestibular schwannoma (right)', R: [15, 15, 20, 35, 45, 50, 55, 55, 60, 70, 80], L: [10, 10, 10, 15, 15, 20, 20, 25, 30, 35, 40], syn: 0.5, pitch: 4000, type: 'tonal', lat: 'Right', flag: 'RED FLAG: asymmetric SNHL (≥ 15 dB at two adjacent frequencies) or unilateral tinnitus → MRI of the internal auditory meatus.',
    note: 'Asymmetric SNHL with poor speech discrimination for the degree of loss. Acoustic reflexes may be absent or decay.' },
  { id: 'puls', name: 'Pulsatile tinnitus (normal hearing)', R: [10, 10, 5, 5, 10, 10, 10, 15, 20, 25, 30], L: [10, 10, 5, 5, 10, 10, 10, 15, 20, 25, 30], syn: 0, pitch: 500, type: 'pulse', lat: 'Right', flag: 'RED FLAG: pulse-synchronous tinnitus needs a vascular work-up (auscultation, blood pressure, fundoscopy, CTA / MRA or CT temporal bone).',
    note: 'A heartbeat-synchronous "whoosh" usually has a vascular source. See the Objective & pulsatile chapter.' },
];
const profBy = (id) => PROF.find((p) => p.id === id) || PROF[0];
const S = { prof: 'nihl', gain: 0.6, habit: false, soma: 0, somaT: 0, obj: 'vascular', ther: { ha: false, sound: false, cbt: false }, thi: 46, reorg: 0 };

// threshold at any frequency (log interpolation of the right-ear audiogram)
function thrAt(p, f, ear = 'R') { const lf = Math.log2(f), arr = p[ear]; for (let i = 0; i < F.length - 1; i++) { const a = Math.log2(F[i]), b = Math.log2(F[i + 1]); if (lf <= b) return lerp(arr[i], arr[i + 1], clamp((lf - a) / (b - a), 0, 1)); } return arr[arr.length - 1]; }
// hair-cell health from threshold: OHC loss dominates to ~55 dB, IHC beyond
const ohcLoss = (t) => clamp((t - 15) / 45, 0, 1), ihcLoss = (t) => clamp((t - 55) / 45, 0, 1);
function inputAt(p, f) { // relative afferent drive 0..1
  const t = thrAt(p, f) - (S.ther.ha && f >= 1000 && f <= 6000 ? 25 : 0);
  return clamp(1 - 0.45 * ohcLoss(t) - 0.5 * ihcLoss(t) - p.syn * clamp((f - 3000) / 9000, 0, 1) * 0.6 - p.syn * 0.15, 0.03, 1);
}
function effGain() { return clamp(S.gain * (S.ther.sound ? 0.55 : 1) * (S.ther.cbt ? 0.9 : 1) + (S.soma > 0 ? 0.25 * S.soma : 0), 0, 1.2); }
// spontaneous activity profile along the tonotopic axis (homeostatic gain + edge enhancement)
function hyperProfile(p, n = 60) {
  const fs = [], inp = [], out = [];
  for (let i = 0; i < n; i++) { const f = 250 * Math.pow(64, i / (n - 1)); fs.push(f); inp.push(inputAt(p, f)); }
  const g = effGain();
  for (let i = 0; i < n; i++) {
    const dI = Math.abs((inp[Math.min(n - 1, i + 2)] - inp[Math.max(0, i - 2)]) / 4) * 12;
    out.push(0.18 + g * (1 - inp[i]) * 0.75 + g * dI * 0.45 + (S.ther.sound ? 0.08 : 0));
  }
  return { fs, inp, out };
}
const fmtF = (f) => (f >= 1000 ? `${Math.round(f / 100) / 10} kHz` : `${Math.round(f)} Hz`);
const hueFor = (f) => new THREE.Color().setHSL(lerp(0.0, 0.78, Math.log(f / 250) / Math.log(64)), 0.85, 0.58);

// ---------------------------------------------------------------- lab
const EAR_SKIP = /region|Eyebrow|Angle of mouth|commissure|Mentolabial|Nasolabial|Philtrum|triangle|Tubercle of upper lip|Thalamus|Medulla|Pons|Midbrain|Angular|insula|occipit|Inferior temporal|Middle temporal|Middle frontal|Opercular|Orbital|Postcentral|Precentral|Superior frontal|Superior parietal|Superior temporal|Temporal pole|Supramarginal|Triangular part/i;
const BRAIN_SKIP = /Nucleus ambiguus|hypoglossal|Motor nucleus of facial|solitary|Facial nerve|Vagus|Glossopharyngeal|Transverse temporal|Temporal plane/;
let net, lim, soma, ribbon = [], inset, strip = [], vessels = [], somaTubes = [], hgSprites = [], tubeFlow, beatT = 0;
const lab = createLab({
  models: [
    { url: '../lab3d/models/brain.glb', skip: BRAIN_SKIP, regroup: (n, g) => (g === 'deep' ? (/Thalamus/.test(n) ? 'thalamus' : /Hippocampus|Hypothalamus/.test(n) ? 'limbic' : 'deep') : g === 'nerve' ? 'trig' : g) },
    { url: '../hearing-3d/ear.glb', skip: EAR_SKIP, regroup: (n, g) => (g === 'bone' ? 'tbone' : g) },
  ],
  state: S,
  groups: {
    skin: { make: () => shellMat(0x7fa6c4, 2.0), op: [0.3, 0.22, 0.12, 0.06, 0.12, 0.25, 0.25, 0.3, 0.25] },
    auricle: { make: () => std(0xd49a86), op: [1, 0.9, 0.2, 0.05, 0.2, 0.5, 0.8, 0.8, 0.6] },
    tbone: { make: () => shellMat(0xd9c9a2, 2.6), op: [0.08, 0.12, 0.03, 0, 0.03, 0.05, 0.15, 0.08, 0.05] },
    ossicle: { make: () => std(0xf1e4c2), op: [0.8, 1, 0.2, 0, 0.2, 0.4, 1, 0.6, 0.4] },
    tm: { make: () => std(0xcfe6f6, { depthWrite: false }), op: [0.6, 0.7, 0.1, 0, 0.1, 0.3, 0.8, 0.4, 0.3] },
    labyrinth: { make: () => std(0xe3eef7, { roughness: 0.28, emissive: 0x7d95ff, emissiveIntensity: 0.12 }), op: [0.9, 1, 0.5, 0.1, 0.4, 0.5, 0.9, 0.8, 0.6] },
    nerve: { make: () => std(0xe2b84d, { emissive: 0x3a2800 }), op: [0.8, 1, 0.8, 0.2, 0.4, 0.6, 0.5, 0.6, 0.5] },
    tube: { make: () => std(0x9fc6e0, { emissive: 0x000000 }), op: [0.3, 0.3, 0.05, 0, 0.05, 0.2, 0.9, 0.3, 0.2] },
    brainstem: { make: () => shellMat(0xd79dab, 1.7), op: [0.35, 0.25, 0.4, 0.12, 0.3, 0.45, 0.2, 0.3, 0.3] },
    nucleus: { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3 }), op: [1, 0.6, 1, 0.6, 1, 1, 0.4, 0.8, 0.9] },
    auditoryCortex: { make: () => std(0x7fe0c8, { emissive: 0x1f7a66, emissiveIntensity: 0.35 }), op: [0.9, 0.4, 1, 0.45, 1, 0.6, 0.3, 0.7, 0.9] },
    cortex: { make: () => shellMat(0x9b90d6, 2.4), op: [0.05, 0.015, 0.03, 0.012, 0.03, 0.02, 0.015, 0.05, 0.05] },
    cerebellum: { make: () => std(0xd6b27a, { roughness: 0.5 }), op: [0.3, 0.1, 0.12, 0.03, 0.12, 0.3, 0.1, 0.25, 0.25] },
    thalamus: { make: () => std(0xb89be0, { roughness: 0.4 }), op: [0.35, 0.05, 0.45, 0.15, 0.55, 0.25, 0.05, 0.3, 0.45] },
    limbic: { make: () => std(0xff9b6a, { emissive: 0xff5a2a, emissiveIntensity: 0.25 }), op: [0.5, 0.03, 0.15, 0.05, 1, 0.2, 0.03, 0.3, 0.8] },
    deep: { make: () => std(0x8a93b8), op: [0.12, 0, 0.04, 0, 0.18, 0.04, 0, 0.08, 0.12] },
    trig: { make: () => std(0xe2b84d, { emissive: 0x6a4a00, emissiveIntensity: 0.3 }), op: [0.3, 0.05, 0.15, 0, 0.25, 1, 0.1, 0.3, 0.3] },
  },
  chapters: [
    { k: 'Overview', nav: 'Overview', t: 'Tinnitus: a sound with no outside source', sig: CSS.neural, cam: [V(-330, 150, 270), V(0, 25, -5)], tour: 12,
      body: () => `<p><b>Tinnitus</b> is the perception of sound without an external acoustic source. <b>Subjective</b> tinnitus (heard only by the patient) is by far the most common; <b>objective</b> tinnitus comes from a real sound in the body (vascular flow, muscle clicks).</p>
        <p>The current model: tinnitus usually <b>starts with reduced input from the ear</b> and is <b>generated in the brain</b>, as the auditory pathway turns up its gain. Whether it becomes a <b>problem</b> depends on networks linking the auditory cortex to attention, emotion and memory. Pink spikes show spontaneous "phantom" activity; cyan spikes are sound-driven.</p>`,
      facts: () => [['≈ 14 %', 'of adults (Jarach 2022 meta-analysis)'], ['≈ 2 %', 'severe, life-affecting tinnitus']] },
    { k: 'Cochlea', nav: 'Deafferentation', t: 'It starts in the ear: lost input', sig: CSS.air, cam: [V(-175, 45, 120), V(-32, 5, -4)], tour: 14,
      body: () => { const p = profBy(S.prof); return `<p>Noise, ageing and ototoxic drugs damage <b>outer hair cells</b> first (thresholds up to ~50–60 dB HL), then <b>inner hair cells</b>. <b>Cochlear synaptopathy</b> removes inner-hair-cell ribbon synapses, mainly on low-spontaneous-rate fibres, and can leave the audiogram normal (<b>hidden hearing loss</b>).</p>
        <p>The magnified strip shows the organ of Corti from base (high frequencies) to apex for <b>${p.name}</b>: three rows of OHCs, one row of IHCs with their synapses, and afferent fibres that fire less where cells are lost. Tinnitus pitch usually lies <b>inside the region of hearing loss</b>.</p><p class="note">${p.note}</p>`; },
      facts: () => [['≈ 90 %', 'of chronic tinnitus with some hearing loss (incl. EHF)'], ['95 %', 'of afferent fibres are type I, from IHCs']] },
    { k: 'Gain', nav: 'Central gain', t: 'Central gain: the brain turns up the volume', sig: CSS.neural, cam: [V(-310, 110, -90), V(0, 25, -12)], tour: 16,
      body: () => `<p>When input falls, neurons in the <b>dorsal cochlear nucleus</b> (fusiform cells), <b>inferior colliculus</b>, <b>medial geniculate body</b> and <b>auditory cortex</b> compensate: inhibition (GABA, glycine) is reduced and excitability rises. This <b>homeostatic plasticity</b> restores average activity but also amplifies <b>spontaneous firing</b> and <b>synchrony</b>, which the cortex can read as sound.</p>
        <p>Move <b>Central gain</b> in the dock. The panel graph compares sound-driven input with spontaneous activity along the frequency axis; the peak sits in and at the edge of the hearing loss. The same gain increase explains why tinnitus and <b>hyperacusis</b> often co-exist.</p>`,
      facts: () => [['↑ SFR', 'spontaneous firing in DCN, IC, MGB and A1'], ['↓ inhibition', 'GABA / glycine down-regulated']] },
    { k: 'Map', nav: 'Tonotopic reorganisation', t: 'Map changes in the auditory cortex', sig: CSS.violet, cam: [V(110, 160, -18), V(44, 54, -11)], tour: 14,
      body: () => `<p>Primary auditory cortex on <b>Heschl's gyrus</b> is <b>tonotopic</b>: low frequencies anterolaterally, high frequencies posteromedially (colour bar on the gyrus). After a high-frequency loss, deprived neurons start responding to the <b>edge frequency</b> of the audiogram, so the edge becomes <b>over-represented</b> and hyperactive (Eggermont &amp; Roberts 2004).</p>
        <p>Grey segments are deprived; watch them take on the edge colour. This supports tinnitus pitch near or inside the loss region. The evidence is <b>mixed</b>: map changes also occur without tinnitus, and therapies that target the map (notched music, "tailor-made" sound) have not shown consistent benefit.</p>`,
      facts: () => [['Edge', 'frequency over-represented'], ['Mixed', 'evidence for map-based sound therapy']] },
    { k: 'Networks', nav: 'Distress networks', t: () => (S.habit ? 'Habituated: the tinnitus is heard but ignored' : 'Distress: the tinnitus captures attention'), sig: CSS.bad, cam: [V(-250, 170, 230), V(8, 38, 8)], tour: 16,
      sub: () => `<div class="sub"><button type="button" data-act="habit" data-v="0" aria-pressed="${!S.habit}">Distressed</button><button type="button" data-act="habit" data-v="1" aria-pressed="${S.habit}">Habituated</button></div>`,
      body: () => `<p><b>Jastreboff's neurophysiological model:</b> the signal is detected subcortically, perceived and evaluated in the cortex, and becomes bothersome when the <b>limbic</b> and <b>autonomic</b> systems attach fear and alarm to it: a conditioned reflex that keeps attention on the sound.</p>
        <p><b>Thalamocortical dysrhythmia</b>: deprived thalamic neurons fire in slow theta bursts, with gamma activity in the surrounding cortex. <b>Noise cancellation</b> (Rauschecker 2010): the ventromedial prefrontal cortex and nucleus accumbens normally gate the signal through the thalamic reticular nucleus; when gating fails, tinnitus becomes chronic. The <b>distress network</b> links the anterior cingulate, anterior insula, amygdala, parahippocampal area and precuneus.</p>
        ${S.habit ? '<p class="note">Habituated: gating (green) is active and the limbic loop is quiet. Counselling, CBT and TRT aim for this state; the sound may remain but no longer matters.</p>' : '<p class="note">Distressed: orange spikes circulate through amygdala, insula and cingulate; the hypothalamus drives the autonomic stress response (sleep, anxiety).</p>'}`,
      facts: () => [['θ–γ', 'thalamocortical dysrhythmia'], ['Habituation', 'the goal of counselling and TRT']] },
    { k: 'Somatic', nav: 'Somatosensory tinnitus', t: 'Jaw and neck can change the sound', sig: CSS.mech, cam: [V(-230, 55, 135), V(-10, -8, -10)], tour: 14,
      sub: () => `<div class="sub"><button type="button" data-act="soma" data-v="jaw">Clench jaw</button><button type="button" data-act="soma" data-v="neck">Push head against resistance</button></div>`,
      body: () => `<p>Most people with tinnitus (about 60–80 %) can change its loudness or pitch with jaw, head or neck manoeuvres. <b>Trigeminal</b> input (via the spinal trigeminal nucleus) and <b>upper cervical</b> input (C2, via the cuneate nucleus) converge on <b>DCN fusiform cells</b>. After hearing loss these somatosensory synapses are up-regulated, so a clench now drives the auditory system (Shore).</p>
        <p><b>Somatic tinnitus</b> (Michiels 2018 criteria) is suspected with TMJ disorder, neck pain or bruxism, tinnitus fluctuating with posture, or onset after neck/dental trauma. Management: physiotherapy for the neck, dental/TMJ care. <b>Bimodal neuromodulation</b> (sound paired with tongue or cheek-neck stimulation) is an emerging option.</p>`,
      facts: () => [['60–80 %', 'can modulate their tinnitus'], ['DCN', 'where sound and touch converge']] },
    { k: 'Objective', nav: 'Objective & pulsatile', t: () => ({ vascular: 'Pulsatile tinnitus: vascular sources', myoclonus: 'Middle-ear myoclonus', patulous: 'Patulous Eustachian tube' })[S.obj], sig: CSS.bad, cam: [V(-170, 25, 95), V(-34, -12, -4)], tour: 16,
      sub: () => `<div class="sub">${[['vascular', 'Vascular (pulse)'], ['myoclonus', 'Muscle clicks'], ['patulous', 'Patulous tube']].map(([k, n]) => `<button type="button" data-act="obj" data-v="${k}" aria-pressed="${S.obj === k}">${n}</button>`).join('')}</div>`,
      body: () => ({
        vascular: `<p><b>Pulse-synchronous</b> tinnitus means the ear is hearing blood flow. The internal carotid artery (red) runs just in front of the cochlea; the sigmoid sinus and <b>jugular bulb</b> (blue) sit behind and below the middle ear.</p><p>Causes: sigmoid sinus diverticulum or dehiscence, <b>idiopathic intracranial hypertension</b>, <b>dural arteriovenous fistula</b> (can bleed), <b>glomus (paraganglioma) tumour</b> (red mass behind the drum), carotid stenosis or dissection, high or dehiscent jugular bulb, and high-output states (anaemia, thyrotoxicosis). Work-up: otoscopy, auscultation over the ear and neck, blood pressure, fundoscopy for papilloedema, then CTA/MRA or CT of the temporal bone.</p>`,
        myoclonus: `<p><b>Middle-ear myoclonus</b>: rhythmic contractions of the <b>stapedius</b> or <b>tensor tympani</b> produce clicking, fluttering or buzzing. Tympanometry in the "reflex decay" or extended-time mode shows rhythmic compliance changes synchronous with the sound.</p><p><b>Palatal myoclonus</b> (tensor/levator veli palatini) causes objective clicks with visible palatal movement; it may be essential or secondary to brainstem lesions (Guillain–Mollaret triangle). Options: reassurance, relaxation, botulinum toxin, rarely tenotomy.</p>`,
        patulous: `<p>A <b>patulous Eustachian tube</b> stays open: patients hear their own <b>breathing</b> and voice (<b>autophony</b>), with a roaring synchronous with respiration. The drum moves with breathing on otoscopy.</p><p>It follows weight loss, pregnancy or hormonal change; symptoms ease lying down or with the head between the knees. Management: hydration, nasal saline, weight restoration; surgical options for severe cases.</p>`,
      })[S.obj],
      facts: () => [['< 5 %', 'of tinnitus is objective'], ['Always', 'investigate pulsatile tinnitus']] },
    { k: 'Assess', nav: 'Assessment', t: () => `Assessment: ${profBy(S.prof).name}`, sig: CSS.air, cam: [V(-310, 110, 250), V(0, 22, 0)], tour: 18,
      sub: () => `<div class="thi"><label for="thi">THI score <b id="thiVal">${S.thi}</b></label><input type="range" id="thi" min="0" max="100" step="2" value="${S.thi}"><div id="thiOut">${thiGrade(S.thi)}</div></div>`,
      body: () => { const p = profBy(S.prof); return `<ul class="mg">
        <li><b>History</b>: onset, laterality, character (tonal, hiss, roar, pulsatile), fluctuation, somatic modulation, noise and drug exposure, sleep, mood, hyperacusis.</li>
        <li><b>Otoscopy, tympanometry</b> (reflexes with care if hyperacusis) and <b>PTA including extended high frequencies</b> (9–16 kHz).</li>
        <li><b>Psychoacoustics</b>: pitch match (2-alternative forced choice, check octave confusion), loudness match (usually only 5–10 dB SL), <b>minimum masking level</b>, <b>residual inhibition</b> after 60 s of noise at MML + 10 dB, and loudness discomfort levels.</li>
        <li><b>Questionnaires</b>: THI (Newman 1996; grades McCombe 2001), TFI (Meikle 2012), a 0–10 rating scale; screen anxiety and depression (e.g. GAD-7, PHQ-9).</li>
        <li><b>Refer</b> on red flags: pulsatile, unilateral or asymmetric, sudden hearing loss, focal neurology, severe distress or thoughts of self-harm (same-day mental-health support).</li></ul>
        <p class="note"><b>${p.name}</b> · matched pitch ≈ ${p.pitch >= 1000 ? p.pitch / 1000 + ' kHz' : p.pitch + ' Hz'} (${p.type === 'roar' ? 'low roar' : p.type === 'pulse' ? 'pulsatile whoosh' : p.type}) · ${p.lat}${p.flag ? `<br><b style="color:${CSS.bad}">${p.flag}</b>` : ''}</p>`; } },
    { k: 'Manage', nav: 'Management & evidence', t: 'Management: what the evidence supports', sig: CSS.ok, cam: [V(-290, 160, 250), V(4, 32, 2)], tour: 18,
      sub: () => `<div class="sub">${[['ha', 'Hearing aids'], ['sound', 'Sound therapy'], ['cbt', 'Counselling / CBT']].map(([k, n]) => `<button type="button" data-act="ther" data-v="${k}" aria-pressed="${S.ther[k]}">${n}</button>`).join('')}</div>`,
      body: () => `<ul class="mg">
        <li><b>Education and counselling for everyone</b>: explain the mechanism, remove fear, sleep and sound-enrichment advice.</li>
        <li><b>CBT</b> has the strongest evidence: it reduces distress and improves quality of life, though loudness changes little (Cochrane 2020).</li>
        <li><b>Hearing aids</b> when there is hearing loss: restore input in the deprived region, improve communication; combination devices add a sound generator.</li>
        <li><b>Sound therapy</b> (enrichment, partial masking) and <b>TRT</b> (directive counselling + low-level sound for 12–24 months): widely used, evidence moderate to low.</li>
        <li><b>Cochlear implants</b> often reduce tinnitus in single-sided or bilateral profound deafness.</li>
        <li><b>Not recommended routinely</b> (AAO-HNS 2014, NICE NG155): drugs for tinnitus itself (antidepressants, anticonvulsants, anxiolytics, intratympanic drugs), supplements (ginkgo, melatonin, zinc), betahistine, rTMS. Treat insomnia, anxiety and depression in their own right.</li>
        <li><b>Emerging</b>: bimodal neuromodulation, vagus-nerve stimulation paired with tones.</li></ul>
        <p class="note">Toggle the therapies to see the model respond: hearing aids restore drive, sound therapy lowers contrast and gain, counselling/CBT settles the limbic loop.</p>`,
      facts: () => [['CBT', 'best evidence for distress'], ['No pill', 'is approved for tinnitus']] },
  ],
  build, update, renderPanels, onChapter, onAction,
});

function thiGrade(v) {
  const g = v <= 16 ? ['1 · Slight', 'only heard in quiet; reassure', CSS.ok] : v <= 36 ? ['2 · Mild', 'masked by environmental sound; counselling', CSS.ok] : v <= 56 ? ['3 · Moderate', 'noticed despite background noise; sound therapy + counselling', CSS.mech] : v <= 76 ? ['4 · Severe', 'always heard, disturbs sleep; CBT, multidisciplinary care', CSS.bad] : ['5 · Catastrophic', 'all symptoms worse; screen mood and self-harm risk, urgent psychological care', CSS.bad];
  return `<span class="pill" style="--c:${g[2]};border-color:${g[2]};color:${g[2]}">Grade ${g[0]}</span> <span class="muted">${g[1]}</span>`;
}

// ---------------------------------------------------------------- build
function build(ctx) {
  const c = (n) => ctx.centre(n);
  // --- auditory pathway network (right ear → both sides, mainly contralateral)
  const coch = c('Cochlea.r'), dcn = c('Posterior cochlear nucleus.r'), vcn = c('Anterior cochlear nucleus.r');
  const a1l = c('Transverse temporal gyri.l'), a1r = c('Transverse temporal gyri.r');
  net = createNetwork(ctx, [
    ['coch', coch], ['vcn', vcn], ['dcn', dcn], ['icl', c('Inferior colliculus.l')], ['icr', c('Inferior colliculus.r')],
    ['mgbl', c('Medial geniculate body.l')], ['mgbr', c('Medial geniculate body.r')], ['a1l', a1l], ['a1r', a1r],
  ], [
    ['coch', 'vcn', 1, [c('Vestibulocochlear nerve (VIII).r')]], ['coch', 'dcn', 0.6, [c('Vestibulocochlear nerve (VIII).r').add(V(0, -2, -3))]],
    ['vcn', 'icl', 1, [V(0, 3, -12), V(6, 14, -15)]], ['vcn', 'icr', 0.45, [V(-7, 14, -15)]], ['dcn', 'icl', 1, [V(0, 1, -17), V(6, 14, -18)]],
    ['icl', 'mgbl', 1], ['icr', 'mgbr', 1], ['mgbl', 'a1l', 1, [V(30, 44, -13)]], ['mgbr', 'a1r', 1, [V(-30, 44, -13)]],
  ], { speed: 70, glowSize: 8 });
  // --- limbic / attention / gating network
  const hip = c('Hippocampus.l'), hyp = c('Hypothalamus'), ins = c('Insula (Subcentral gyrus and ant. and post. sulci*).l'), prec = c('Precuneus.l');
  const amy = V(23, 25, 13), acc = V(6, 66, 36), vmp = V(7, 32, 58), nacc = V(10, 34, 24), trn = V(20, 44, -4);
  const extra = [['Amygdala', amy, 3.2, 0xff8a5c], ['Anterior cingulate', acc, 3.4, 0xff8a5c], ['vmPFC', vmp, 3.4, 0x58d38c], ['Nucleus accumbens', nacc, 2.6, 0x58d38c], ['Thalamic reticular nucleus', trn, 2.2, 0x58d38c]];
  ctx.W.limbicNodes = extra.map(([n, p, r, col]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), std(col, { emissive: col, emissiveIntensity: 0.35, opacity: 0.85 })); m.position.copy(p); ctx.scene.add(m); m.userData.nm = n; return m; });
  lim = createNetwork(ctx, [
    ['mgb', c('Medial geniculate body.l')], ['a1', a1l], ['amy', amy], ['hip', hip], ['ins', ins], ['acc', acc], ['hyp', hyp], ['prec', prec],
    ['vmp', vmp], ['nacc', nacc], ['trn', trn],
  ], [
    ['mgb', 'a1', 1], ['a1', 'amy', 1, [V(34, 34, 2)]], ['a1', 'ins', 0.8], ['a1', 'hip', 0.5], ['a1', 'prec', 0.4, [V(30, 80, -40)]],
    ['amy', 'hyp', 1], ['amy', 'acc', 0.6, [V(14, 45, 30)]], ['ins', 'acc', 1, [V(22, 60, 30)]], ['acc', 'a1', 1, [V(24, 72, 10)]], ['hip', 'amy', 0.6], ['prec', 'acc', 0.5, [V(8, 80, 0)]],
    ['vmp', 'nacc', 1], ['nacc', 'trn', 1, [V(18, 36, 10)]], ['trn', 'mgb', 1],
  ], { speed: 55, color: COL.bad, glowSize: 9 });
  // --- somatosensory inputs to the DCN
  const trig = c('Trigeminal nerve (V).r'), sp5 = V(-8, -7, -13), c2 = V(-16, -46, -30), cun = V(-4, -22, -21);
  const tmat = () => std(COL.mech, { emissive: COL.mech, emissiveIntensity: 0.4, opacity: 0.8 });
  somaTubes = [tube([trig, V(-12, 0, -8), sp5, dcn], 0.7, tmat()), tube([c2, V(-10, -36, -26), cun, V(-8, -10, -18), dcn], 0.7, tmat())];
  somaTubes.forEach((t) => ctx.scene.add(t));
  soma = createNetwork(ctx, [['trig', trig], ['c2', c2], ['dcn', dcn], ['icl', c('Inferior colliculus.l')]], [
    ['trig', 'dcn', 1, [V(-12, 0, -8), sp5]], ['c2', 'dcn', 1, [V(-10, -36, -26), cun, V(-8, -10, -18)]], ['dcn', 'icl', 1, [V(0, 1, -17), V(6, 14, -18)]],
  ], { speed: 45, color: COL.mech });
  // --- vessels near the right middle ear (schematic): petrous ICA and sigmoid sinus → jugular bulb
  const art = std(0xe04848, { emissive: 0x801010, emissiveIntensity: 0.5, opacity: 0.9 }), ven = std(0x4a6fe0, { emissive: 0x10206a, emissiveIntensity: 0.5, opacity: 0.9 });
  vessels = [
    tube([V(-31, -60, 6), V(-34, -30, 4), V(-35, -12, 3), V(-30, -6, 12), V(-21, -3, 17), V(-16, 8, 16)], 1.7, art),
    tube([V(-52, 18, -52), V(-50, 2, -38), V(-44, -10, -20), V(-40, -14, -9), V(-38, -22, -6), V(-36, -60, -6)], 2.2, ven),
  ];
  vessels.forEach((v) => { v.userData.r0 = 1; ctx.scene.add(v); });
  // --- tonotopic ribbon on the left Heschl's gyrus (raycast onto the gyrus surface)
  const hg = ctx.byName['Transverse temporal gyri.l'];
  const lo = V(55, 0, 1), hi = V(38, 0, -21), rc = new THREE.Raycaster();
  for (let i = 0; i < 22; i++) {
    const u = i / 21, p = lo.clone().lerp(hi, u); rc.set(V(p.x, 140, p.z), V(0, -1, 0));
    const hit = hg ? rc.intersectObject(hg, false)[0] : null; p.y = hit ? hit.point.y + 1.2 : 58;
    const f = 250 * Math.pow(64, u);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 10), solid(hueFor(f), { emissive: hueFor(f), emissiveIntensity: 0.5 }));
    m.position.copy(p); ctx.scene.add(m); m.userData.f = f; m.userData.cur = hueFor(f);
    const sp = sprite(COL.neural, 7, 0); sp.position.copy(p); ctx.scene.add(sp); hgSprites.push(sp);
    ribbon.push(m);
  }
  // --- magnified organ of Corti (screen-anchored)
  inset = new THREE.Group(); ctx.scene.add(inset);
  const bm = new THREE.Mesh(new THREE.BoxGeometry(38, 0.4, 4.2), std(0x6f8fb0, { opacity: 0.75 })); bm.position.y = -0.4; inset.add(bm);
  const nerveBar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 38, 10), std(0xe2b84d, { emissive: 0x3a2800, opacity: 0.9 })); nerveBar.rotation.z = Math.PI / 2; nerveBar.position.set(0, -6, -1.6); inset.add(nerveBar);
  const N = 26;
  for (let i = 0; i < N; i++) {
    const x = -18 + (i + 0.5) * (36 / N), u = (i + 0.5) / N, f = 16000 * Math.pow(250 / 16000, u);
    const ohc = [0.1, 0.8, 1.5].map((z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.6, 8), solid(0x9fe0b5, { emissive: 0x1a5a3a, emissiveIntensity: 0.3 })); m.position.set(x, 1.1, z); inset.add(m); return m; });
    const ihc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 2.8, 10), solid(0xffd27a, { emissive: 0x6a4a00, emissiveIntensity: 0.3 })); ihc.position.set(x, 1.2, -1.2); inset.add(ihc);
    const syn = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), solid(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.6 })); syn.position.set(x, -0.35, -1.6); inset.add(syn);
    const fib = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(x, -0.6, -1.6), V(x, -6, -1.6)]), new THREE.LineBasicMaterial({ color: 0xe2b84d, transparent: true, opacity: 0.5 })); inset.add(fib);
    const sp = sprite(COL.air, 1.6, 0); inset.add(sp); sp.position.set(x, -1, -1.6);
    strip.push({ x, f, ohc, ihc, syn, fib, sp, ph: Math.random(), rate: 1 });
  }
  applyProfile(ctx);
  // --- labels
  const L = (t, p, chs, color, when) => ctx.label(t, p, chs, { color, when });
  L('Cochlea (right)', () => c('Cochlea.r').add(V(-4, 6, 4)), [0, 1, 6], CSS.fluid);
  L('Dorsal cochlear nucleus', () => dcn.clone().add(V(-4, -4, -2)), [0, 2, 5], CSS.neural);
  L('Inferior colliculus', () => c('Inferior colliculus.l').add(V(3, 4, 0)), [2], CSS.neural);
  L('Medial geniculate body', () => c('Medial geniculate body.l').add(V(5, 2, 0)), [2, 4], CSS.neural);
  L('Auditory cortex (Heschl\'s gyrus)', () => a1l.clone().add(V(6, 6, 2)), [0, 2, 4], '#7fe0c8');
  L("Heschl's gyrus · low (anterolateral)", () => ribbon[0].position.clone().add(V(4, 3, 3)), [3], CSS.bad);
  L('high (posteromedial)', () => ribbon[ribbon.length - 1].position.clone().add(V(-3, 3, -3)), [3], CSS.violet);
  L(() => `Edge ≈ ${fmtF(edgeF())}`, () => (ribbon[edgeIdx()] || ribbon[0]).position.clone().add(V(0, 5, 0)), [3], CSS.neural, () => edgeIdx() > 0);
  for (const m of ctx.W.limbicNodes) L(m.userData.nm, () => m.position.clone().add(V(2, 3.5, 0)), [4], m.userData.nm.match(/vmPFC|accumbens|reticular/) ? CSS.ok : CSS.bad);
  L('Hippocampus / parahippocampal', () => hip.clone().add(V(3, -3, -6)), [4], CSS.bad);
  L('Anterior insula', () => ins.clone().add(V(4, 2, 4)), [4], CSS.bad);
  L('Hypothalamus (autonomic)', () => hyp.clone().add(V(0, -5, 2)), [4], CSS.bad);
  L('Precuneus', () => prec.clone().add(V(0, 4, 0)), [4], CSS.bad);
  L('Trigeminal nerve (V)', () => trig.clone().add(V(-4, 4, 4)), [5], CSS.mech);
  L('C2 (upper cervical) input', () => c2.clone().add(V(-4, 0, 0)), [5], CSS.mech);
  L('Internal carotid artery', () => V(-30, -30, 8), [6], '#ff6a6a', () => S.obj === 'vascular');
  L('Sigmoid sinus → jugular bulb', () => V(-47, -2, -34), [6], '#7fa0ff', () => S.obj === 'vascular');
  L('Stapes (stapedius)', () => c('Stapes.r').add(V(-2, 3, 0)), [6], CSS.mech, () => S.obj === 'myoclonus');
  L('Tympanic membrane', () => c('Tympanic membrane.r').add(V(-3, -4, 2)), [6], CSS.air, () => S.obj !== 'vascular');
  L('Eustachian tube (open)', () => c('Auditory tube.r').add(V(0, -3, 3)), [6], CSS.air, () => S.obj === 'patulous');
  L('Base · 16 kHz', () => inset.localToWorld(V(-17, 4.6, 0)), [1, 2], CSS.violet, () => inset.visible);
  L('Apex · 250 Hz', () => inset.localToWorld(V(14, 4.6, 0)), [1, 2], CSS.bad, () => inset.visible);
  L('OHC ×3 · IHC ×1', () => inset.localToWorld(V(-1, 4.6, 0)), [1], CSS.ok, () => inset.visible);
}
function edgeF() { const p = profBy(S.prof); for (let i = 0; i < 60; i++) { const f = 250 * Math.pow(64, i / 59); if (thrAt(p, f) >= 30) return f; } return 0; }
function edgeIdx() { const e = edgeF(); if (!e) return -1; return ribbon.findIndex((m) => m.userData.f >= e); }
function applyProfile(ctx) {
  const p = profBy(S.prof);
  for (const s of strip) {
    const t = thrAt(p, s.f) - (S.ther.ha && s.f >= 1000 && s.f <= 6000 ? 0 : 0);
    const o = ohcLoss(t), ih = ihcLoss(t), syn = clamp(p.syn * (0.3 + clamp((s.f - 3000) / 9000, 0, 1)) + ih, 0, 1);
    s.ohc.forEach((m, k) => { const dead = o > (k + 0.5) / 3.2; m.scale.y = dead ? 0.22 : 1; m.material.color.set(dead ? 0x505a66 : 0x9fe0b5); m.material.emissiveIntensity = dead ? 0 : 0.3; });
    s.ihc.scale.y = ih > 0.5 ? 0.25 : 1; s.ihc.material.color.set(ih > 0.5 ? 0x505a66 : 0xffd27a); s.ihc.material.emissiveIntensity = ih > 0.5 ? 0 : 0.3;
    s.syn.scale.setScalar(1 - syn * 0.85); s.syn.material.emissiveIntensity = 0.6 * (1 - syn);
    s.fib.material.opacity = 0.15 + 0.5 * (1 - syn);
    s.rate = inputAt(p, s.f);
  }
  S.reorg = 0;
}

// ---------------------------------------------------------------- per-frame
function placeInset(ctx) {
  const cam = ctx.camera, el = ctx.renderer.domElement, w = el.clientWidth || 1, h = el.clientHeight || 1;
  const mob = w < 700;
  const px = mob ? w * 0.5 : Math.min(250, w * 0.2), py = mob ? h * 0.83 : h - 215;
  const p = V((px / w) * 2 - 1, -(py / h) * 2 + 1, 0.5).unproject(cam);
  const dir = p.sub(cam.position).normalize(), dist = 110;
  inset.position.copy(cam.position).addScaledVector(dir, dist);
  inset.quaternion.copy(cam.quaternion); inset.rotateX(0.45);
  const mmPerPx = (2 * dist * Math.tan((cam.fov * D2R) / 2)) / h;
  inset.scale.setScalar((mmPerPx * (mob ? w * 0.66 : 330)) / 38);
}
function update(ctx, t, dt, rdt) {
  const ch = ctx.S.ch, p = profBy(S.prof), g = effGain();
  // inset
  inset.visible = ch === 1 || ch === 2;
  if (inset.visible) {
    placeInset(ctx);
    for (const s of strip) {
      s.ph += dt * (0.6 + s.rate * 4.5);
      const u = s.ph % 1; s.sp.position.y = lerp(-0.8, -6, u); s.sp.material.opacity = (ctx.S.playing ? 0.9 : 0.4) * s.rate * (u < 0.9 ? 1 : 0);
      s.sp.material.color.set(COL.air);
    }
  }
  // auditory network: sound-driven (cyan) at the cochlea, phantom (pink) at DCN / IC with gain × deafferentation
  const deaff = 1 - hyperProfile(p, 20).inp.reduce((a, b) => a + b, 0) / 20;
  const phantom = g * (0.3 + deaff * 1.6) * (ch === 8 && S.ther.sound ? 0.6 : 1);
  net.visible = [0, 2, 3, 5, 7, 8].includes(ch);
  if (ctx.S.playing && net.visible) {
    if (Math.random() < dt * (ch === 8 && S.ther.sound ? 6 : 3) * (1 - deaff * 0.6)) net.spawn('coch', COL.air);
    if (Math.random() < dt * 7 * phantom) net.spawn(Math.random() < 0.65 ? 'dcn' : 'vcn', COL.neural);
    if (Math.random() < dt * 3 * phantom) net.spawn('icl', COL.neural);
  }
  net.step(dt, rdt); if (!net.visible) net.clear();
  // nuclei pulse with gain
  for (const n of ['Posterior cochlear nucleus.r', 'Inferior colliculus.l', 'Medial geniculate body.l', 'Anterior cochlear nucleus.r']) { const m = ctx.byName[n]; if (m && m.material.emissive) m.material.emissiveIntensity = 0.25 + phantom * 0.5 * (0.6 + 0.4 * Math.sin(t * 7 + n.length)); }
  const hgm = ctx.byName['Transverse temporal gyri.l']; if (hgm) hgm.material.emissiveIntensity = 0.25 + phantom * 0.35;
  // limbic loop
  const habit = S.habit || (ch === 8 && S.ther.cbt);
  lim.visible = ch === 4 || ch === 8;
  ctx.W.limbicNodes.forEach((m) => { m.visible = [4, 8].includes(ch) || (ch === 0); const green = /vmPFC|accumbens|reticular/.test(m.userData.nm); m.material.opacity = ch === 0 ? 0.35 : 0.85; m.material.emissiveIntensity = green ? (habit ? 0.8 : 0.15) : (habit ? 0.1 : 0.35 + 0.35 * Math.sin(t * 5)); });
  if (ctx.S.playing && lim.visible) {
    if (Math.random() < dt * (habit ? 1.2 : 4) * (0.5 + phantom)) lim.spawn('mgb', COL.neural);
    if (!habit && Math.random() < dt * 4) lim.spawn(Math.random() < 0.5 ? 'a1' : 'amy', COL.bad);
    if (habit && Math.random() < dt * 5) lim.spawn('vmp', COL.ok);
  }
  lim.block = (k) => (habit ? ['amy', 'ins', 'hip', 'prec'].includes(k.at) && k.s.material.color.getHex() !== COL.ok : ['vmp', 'nacc', 'trn'].includes(k.at) && k.s.material.color.getHex() === COL.ok && Math.random() < 0.05);
  lim.step(dt, rdt); if (!lim.visible) lim.clear();
  // somatosensory
  if (S.somaT > 0) { S.somaT -= dt; S.soma = smooth(Math.min(1, S.somaT / 0.6)) * (S.somaT > 3 ? smooth((3.8 - S.somaT) / 0.8) : 1); } else S.soma = 0;
  somaTubes.forEach((tb, i) => { tb.visible = ch === 5; tb.material.emissiveIntensity = 0.3 + (S.soma * (S.somaWhich === (i ? 'neck' : 'jaw') ? 1.4 : 0.2)); });
  soma.visible = ch === 5;
  if (ctx.S.playing && soma.visible && S.soma > 0.1 && Math.random() < dt * 14 * S.soma) soma.spawn(S.somaWhich === 'neck' ? 'c2' : 'trig', COL.mech);
  soma.step(dt, rdt); if (!soma.visible) soma.clear();
  // objective: vessels pulse at ~72 bpm, myoclonus twitches, patulous breathing
  beatT += dt;
  const beat = Math.pow(Math.max(0, Math.sin(beatT * 2 * Math.PI * 1.2)), 6);
  vessels.forEach((v, i) => { v.visible = ch === 6 && S.obj === 'vascular'; v.material.emissiveIntensity = 0.3 + beat * (i ? 0.6 : 1.4); });
  const stp = ctx.byName['Stapes.r'], tmm = ctx.byName['Tympanic membrane.r'], tb = ctx.byName['Auditory tube.r'];
  const tw = ch === 6 && S.obj === 'myoclonus' ? (Math.sin(t * 60) * (Math.sin(t * 2.2) > 0.3 ? 1 : 0)) : 0;
  if (stp) { stp.userData.p0 = stp.userData.p0 || stp.position.clone(); stp.position.copy(stp.userData.p0).add(V(tw * 0.35, 0, 0)); }
  const breath = ch === 6 && S.obj === 'patulous' ? Math.sin(t * 2 * Math.PI * 0.25) : 0;
  if (tmm) { tmm.userData.p0 = tmm.userData.p0 || tmm.position.clone(); tmm.position.copy(tmm.userData.p0).add(V(tw * 0.25 + breath * 0.5, 0, 0)); }
  if (tb && tb.material.emissive) { tb.material.emissive.set(COL.air); tb.material.emissiveIntensity = ch === 6 && S.obj === 'patulous' ? 0.4 + 0.5 * Math.abs(breath) : 0; }
  // tonotopic ribbon: deprived segments adopt the edge colour over time (ch 3), hyperactive glow near the edge
  const ei = edgeIdx();
  if (ch === 3 && ctx.S.playing) S.reorg = Math.min(1, S.reorg + dt / 6);
  const eCol = ei >= 0 ? hueFor(ribbon[Math.max(0, ei - 1)].userData.f) : null;
  ribbon.forEach((m, i) => {
    m.visible = ch === 3 || ch === 2 || ch === 0; const f = m.userData.f;
    const dep = thrAt(p, f) >= 35 ? clamp((thrAt(p, f) - 35) / 30, 0.35, 1) : 0;
    const base = hueFor(f), grey = new THREE.Color(0x4a5360);
    let col = base.clone().lerp(grey, dep);
    if (dep && eCol && ch === 3) col.lerp(eCol, S.reorg * clamp(1 - Math.abs(i - ei) / 7, 0.2, 1));
    m.material.color.copy(col); m.material.emissive.copy(col);
    const near = ei >= 0 ? Math.exp(-Math.pow((i - ei) / 2.2, 2)) : 0;
    const hs = hgSprites[i]; hs.visible = m.visible; hs.material.opacity = (0.15 + 0.7 * near * g) * (0.6 + 0.4 * Math.sin(t * 9 + i));
    m.material.emissiveIntensity = 0.4 + near * g * 0.8;
  });
  drawSpec();
}

// ---------------------------------------------------------------- panels
function drawAud() {
  const cv = $('aud'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv); const p = profBy(S.prof);
  const x0 = 30, x1 = w - 8, y0 = 10, y1 = h - 18, X = (i) => x0 + (i / (F.length - 1)) * (x1 - x0), Y = (db) => y0 + ((db + 10) / 130) * (y1 - y0);
  g.fillStyle = 'rgba(125,149,255,.07)'; g.fillRect(X(7), y0, x1 - X(7), y1 - y0);
  g.strokeStyle = 'rgba(150,185,215,.14)'; g.lineWidth = 1; g.font = '9.5px "JetBrains Mono",monospace'; g.fillStyle = CSS.dim; g.textAlign = 'right';
  for (let db = 0; db <= 120; db += 20) { g.beginPath(); g.moveTo(x0, Y(db)); g.lineTo(x1, Y(db)); g.stroke(); g.fillText(db, x0 - 4, Y(db) + 3); }
  g.textAlign = 'center'; F.forEach((f, i) => { g.beginPath(); g.moveTo(X(i), y0); g.lineTo(X(i), y1); g.stroke(); g.fillText(FL[i], X(i), h - 5); });
  g.fillStyle = 'rgba(125,149,255,.8)'; g.textAlign = 'right'; g.fillText('EHF', x1 - 2, y0 + 10);
  const plot = (arr, col, sym) => { g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); arr.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
    arr.forEach((v, i) => { g.beginPath(); if (sym === 'o') g.arc(X(i), Y(v), 3.2, 0, 7); else { g.moveTo(X(i) - 3, Y(v) - 3); g.lineTo(X(i) + 3, Y(v) + 3); g.moveTo(X(i) + 3, Y(v) - 3); g.lineTo(X(i) - 3, Y(v) + 3); } g.stroke(); }); };
  plot(p.L, '#5b8cff', 'x'); plot(p.R, '#ff5a5a', 'o');
  // tinnitus pitch / loudness match marker
  const li = Math.log2(p.pitch / 250) / Math.log2(64), xi = (() => { const lf = Math.log2(p.pitch); for (let i = 0; i < F.length - 1; i++) if (lf <= Math.log2(F[i + 1])) return X(i) + ((lf - Math.log2(F[i])) / (Math.log2(F[i + 1]) - Math.log2(F[i]))) * (X(i + 1) - X(i)); return X(F.length - 1); })();
  const ty = Y(thrAt(p, p.pitch) + 8); g.fillStyle = CSS.neural; g.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.4 : 6, a = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(xi + r * Math.cos(a), ty + r * Math.sin(a)); } g.fill(); void li;
  $('pitchNote').textContent = `tinnitus ≈ ${fmtF(p.pitch)} · ${p.lat.toLowerCase()}`;
}
function drawSpec() {
  const cv = $('spec'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv); const p = profBy(S.prof); const { fs, inp, out } = hyperProfile(p);
  const x0 = 8, x1 = w - 8, y1 = h - 16, y0 = 8, X = (i) => x0 + (i / (fs.length - 1)) * (x1 - x0), Y = (v) => y1 - clamp(v, 0, 1.3) / 1.3 * (y1 - y0);
  g.strokeStyle = 'rgba(150,185,215,.14)'; g.beginPath(); g.moveTo(x0, Y(0.18)); g.lineTo(x1, Y(0.18)); g.stroke();
  g.fillStyle = 'rgba(95,227,242,.13)'; g.beginPath(); g.moveTo(X(0), y1); inp.forEach((v, i) => g.lineTo(X(i), Y(v))); g.lineTo(X(fs.length - 1), y1); g.fill();
  g.strokeStyle = CSS.air; g.lineWidth = 1.5; g.beginPath(); inp.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
  g.strokeStyle = CSS.neural; g.lineWidth = 2; g.beginPath(); out.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
  const thr = 0.55; g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,92,138,.45)'; g.beginPath(); g.moveTo(x0, Y(thr)); g.lineTo(x1, Y(thr)); g.stroke(); g.setLineDash([]);
  g.font = '9.5px "JetBrains Mono",monospace'; g.fillStyle = CSS.dim; g.textAlign = 'center';
  [['250', 0], ['1k', 20], ['4k', 40], ['16k', 59]].forEach(([s, i]) => g.fillText(s, X(i), h - 4));
  g.textAlign = 'left'; g.fillStyle = CSS.air; g.fillText('sound-driven input', x0 + 2, y0 + 8); g.fillStyle = CSS.neural; g.fillText('spontaneous activity', x0 + 2, y0 + 20);
  g.fillStyle = 'rgba(255,92,138,.7)'; g.textAlign = 'right'; g.fillText('perceived above line', x1 - 2, Y(thr) - 4);
  $('gainVal').textContent = Math.round(effGain() * 100) + ' %';
}
function renderPanels(ctx) {
  $('prof').innerHTML = PROF.map((p) => `<option value="${p.id}" ${p.id === S.prof ? 'selected' : ''}>${p.name}</option>`).join('');
  $('gain').value = S.gain;
  drawAud();
}
function onChapter(ctx, c) {
  if (ctx.S.ch === 3 && S.prof === 'menieres') { /* low-frequency loss: edge sits in the low-mid range */ }
  S.reorg = 0; renderPanels(ctx);
}
function onAction(ctx, act, v) {
  if (act === 'habit') { S.habit = v === '1'; ctx.renderCard(); }
  if (act === 'soma') { S.somaWhich = v; S.somaT = 3.8; }
  if (act === 'obj') { S.obj = v; ctx.renderCard(); }
  if (act === 'ther') { S.ther[v] = !S.ther[v]; applyProfile(ctx); ctx.renderCard(); drawAud(); }
}
$('prof').addEventListener('change', (e) => { S.prof = e.target.value; applyProfile(lab); lab.renderAll(); });
$('gain').addEventListener('input', (e) => { S.gain = +e.target.value; });
document.addEventListener('input', (e) => { if (e.target && e.target.id === 'thi') { S.thi = +e.target.value; $('thiVal').textContent = S.thi; $('thiOut').innerHTML = thiGrade(S.thi); } });
addEventListener('resize', () => drawAud());

// ---------------------------------------------------------------- listen (WebAudio, low level, 5 s)
let AC = null, snd = null;
function stopSnd() { if (!snd) return; try { snd.src.stop(); snd.lfo && snd.lfo.stop(); } catch (e) { /* already stopped */ } snd = null; $('listen').setAttribute('aria-pressed', 'false'); $('listen').textContent = 'Listen (low volume)'; }
$('listen').addEventListener('click', () => {
  if (snd) { stopSnd(); return; }
  AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume();
  const p = profBy(S.prof), t0 = AC.currentTime, out = AC.createGain(); out.connect(AC.destination);
  const lvl = p.type === 'tonal' ? 0.025 : 0.05;
  out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(lvl, t0 + 0.5); out.gain.setValueAtTime(lvl, t0 + 4.3); out.gain.linearRampToValueAtTime(0, t0 + 5);
  let src, lfo = null;
  if (p.type === 'tonal') { src = AC.createOscillator(); src.type = 'sine'; src.frequency.value = p.pitch; src.connect(out); }
  else {
    const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = AC.createBiquadFilter();
    if (p.type === 'roar') { f.type = 'lowpass'; f.frequency.value = 300; } else if (p.type === 'pulse') { f.type = 'lowpass'; f.frequency.value = 700; } else { f.type = 'bandpass'; f.frequency.value = p.pitch; f.Q.value = 3; }
    src.connect(f);
    if (p.type === 'pulse') { const am = AC.createGain(); am.gain.value = 0.3; lfo = AC.createOscillator(); lfo.frequency.value = 1.2; const d2 = AC.createGain(); d2.gain.value = 0.7; lfo.connect(d2); d2.connect(am.gain); f.connect(am); am.connect(out); lfo.start(t0); lfo.stop(t0 + 5.1); }
    else f.connect(out);
  }
  src.start(t0); src.stop(t0 + 5.1); snd = { src, lfo };
  $('listen').setAttribute('aria-pressed', 'true'); $('listen').textContent = 'Stop';
  src.onended = () => stopSnd();
});
