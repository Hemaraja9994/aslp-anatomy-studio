// Vestibular & balance 3D — canals, otoliths, VOR on real oculomotor anatomy, nystagmus, BPPV (Dix–Hallpike, Epley),
// peripheral vs central vertigo (HINTS) and vestibular test findings.
import { createLab, createNetwork, THREE, V, clamp, lerp, smooth, CSS, COL, std, solid, shellMat, sprite, tube, canvasCtx, $ } from '../../lab3d/engine.js';

const D2R = Math.PI / 180;
// ---------------------------------------------------------------- disorders
const DIS = [
  { id: 'normal', name: 'Healthy vestibular system', side: null, nys: null, hit: [1, 1], cal: 'Symmetric (CP < 20–25 %)', vemp: 'Present, symmetric', aud: 'Normal', hints: 'Normal head impulse, no nystagmus, no skew',
    feat: ['No spontaneous nystagmus', 'Head impulses answered by a compensatory eye movement with gain ≈ 1'], mgmt: ['—'] },
  { id: 'neuritisR', name: 'Right vestibular neuritis', side: 'R', nys: { h: -1, v: 0, t: -0.6, spv: 7 }, hit: [0.35, 0.98], cal: 'Right canal paresis (CP ≈ 60–100 %)', vemp: 'oVEMP reduced right (superior nerve); cVEMP often spared', aud: 'Normal (labyrinthitis if hearing is lost)', hints: 'PERIPHERAL: abnormal head impulse to the right, unidirectional nystagmus, no skew',
    feat: ['Acute continuous vertigo for days, nausea, veering to the right', 'Horizontal–torsional nystagmus beating to the LEFT (healthy side), stronger when looking left (Alexander\'s law), suppressed by fixation', 'Head impulse to the right: the eyes are dragged with the head, then a catch-up saccade'],
    mgmt: ['Short course of corticosteroids early (evidence mixed); vestibular suppressants only for 1–3 days', 'Early vestibular rehabilitation: gaze stabilisation (X1), balance and walking', 'Central compensation usually restores function over weeks'] },
  { id: 'menieres', name: "Ménière's disease (right, during an attack)", side: 'R', nys: { h: 1, v: 0, t: 0.3, spv: 5 }, hit: [0.95, 1], cal: 'Right reduced interictally (often normal vHIT: dissociation)', vemp: 'Altered tuning (500 → 1000 Hz); cVEMP may be reduced', aud: 'Fluctuating low-frequency SNHL, aural fullness, roaring tinnitus', hints: 'PERIPHERAL (episodic)',
    feat: ['Endolymphatic hydrops: attacks of vertigo lasting 20 min to 12 h', 'Early irritative nystagmus toward the affected ear, then paretic (away)', 'Low-frequency sensorineural hearing loss that fluctuates, with fullness and tinnitus'],
    mgmt: ['Low-salt diet, betahistine (evidence limited), diuretics', 'Intratympanic steroid, then intratympanic gentamicin for intractable vertigo', 'Hearing aids; vestibular rehabilitation between attacks'] },
  { id: 'central', name: 'Central vertigo (cerebellar / lateral medullary stroke)', side: null, nys: { h: 0, v: -1, t: 0, spv: 4, dirChange: true }, hit: [1, 1], cal: 'Often normal', vemp: 'Variable', aud: 'Usually normal (AICA stroke can cause hearing loss)', hints: 'CENTRAL: normal head impulse, direction-changing or vertical nystagmus, skew deviation → urgent stroke work-up', skew: 1,
    feat: ['Acute vertigo with a NORMAL head impulse: a warning sign', 'Direction-changing gaze-evoked or pure vertical (downbeat) nystagmus, not suppressed by fixation', 'Skew deviation (one eye higher), severe truncal ataxia, other brainstem signs'],
    mgmt: ['Emergency stroke pathway: MRI (DWI may be negative in the first 48 h)', 'HINTS performed by trained examiners is more sensitive than early MRI for stroke', 'Rehabilitation for balance and gait'] },
  { id: 'scds', name: 'Superior canal dehiscence (right)', side: 'R', nys: null, hit: [1, 1], cal: 'Normal', vemp: 'Low cVEMP thresholds and large oVEMP amplitudes on the right', aud: 'Low-frequency air–bone gap with supranormal bone conduction; autophony', hints: '—', tullio: 1,
    feat: ['A "third window" in the bone over the superior canal', 'Sound- or pressure-induced vertigo (Tullio phenomenon, Hennebert sign) with vertical–torsional nystagmus in the plane of the superior canal', 'Autophony: hearing one\'s own eye movements, footsteps or pulse'],
    mgmt: ['High-resolution CT of the temporal bone confirms the defect', 'Surgical plugging or resurfacing if symptoms are disabling', 'Avoid triggers; counsel'] },
  { id: 'bvp', name: 'Bilateral vestibulopathy (e.g. gentamicin)', side: 'B', nys: null, hit: [0.25, 0.25], cal: 'Bilaterally reduced (sum < 6°/s)', vemp: 'Often absent bilaterally', aud: 'Normal or SNHL depending on cause', hints: '—', osc: 1,
    feat: ['Oscillopsia: the world jumps when walking', 'Imbalance worse in the dark or on uneven ground (visual and proprioceptive cues lost)', 'Bilateral catch-up saccades on head impulse testing'],
    mgmt: ['Vestibular rehabilitation: substitution with vision and proprioception, gaze stability', 'Fall prevention, home safety; avoid ototoxic drugs', 'Vestibular implants are experimental'] },
  { id: 'vm', name: 'Vestibular migraine', side: null, nys: { h: 0.4, v: 0.5, t: 0, spv: 2, dirChange: true }, hit: [1, 1], cal: 'Usually normal', vemp: 'Usually normal', aud: 'Usually normal', hints: 'Mixed: often central-type positional nystagmus during attacks',
    feat: ['Episodes of vertigo from 5 min to 72 h with migraine features (headache, photophobia, aura)', 'Tests often normal between attacks', 'Most common cause of recurrent spontaneous vertigo'],
    mgmt: ['Lifestyle and trigger management (sleep, meals, stress)', 'Migraine prophylaxis (e.g. propranolol, flunarizine, amitriptyline)', 'Vestibular rehabilitation for persistent symptoms'] },
];
const disBy = (id) => DIS.find((d) => d.id === id) || DIS[0];
const S = { dis: 'normal', bppv: 'dix', bppvT: 0, hitSide: 1, caloric: 0 };

const EXCL = /^(Temporal region|Parietal region|Frontal region|Occipital region)/;
const lab = createLab({
  models: [{ url: '../lab3d/models/vest.glb' }, { url: '../hearing-3d/ear.glb', skip: /region|^Helix|Antihelix|Crura|Tragus|Antitragus|concha|Cymba|Lobule of auricle|notch|Apex of auricle|Auricular tubercle|Scapha|Triangular fossa|Intertragic|Eminentia|Fossa antihelica|Posterior auricular groove|gyr|sulcus|pole|Insula|plane|lobule|Medulla|Pons|Midbrain|Thalamus|colliculus|geniculate|cochlear nucleus|Chorda|Auditory tube|Superior temporal|Angle|Labial|Philtrum|Tubercle|Eyebrow|triangle|neck/i,
    regroup: (n, g) => (g === 'labyrinth' ? 'labyrinth' : g === 'nerve' ? 'vnerve' : g === 'bone' ? 'tbone' : g) }],
  state: S,
  groups: {
    skin: { make: () => shellMat(0x7fa6c4, 2.0), op: [0.3, 0.25, 0.25, 0.14, 0.18, 0.5, 0.18, 0.25] },
    auricle: { make: () => std(0xd49a86), op: [1, 0.5, 0.5, 0.3, 0.4, 1, 0.4, 0.6] },
    eye: { make: () => solid(0xf4f1ea, { roughness: 0.25, transparent: true }), op: [1, 1, 1, 1, 1, 1, 1, 1] },
    eyemuscle: { make: () => std(0xc9646e, { roughness: 0.5, emissive: 0x000000 }), op: [0.8, 0.3, 0.3, 1, 0.9, 0.4, 0.9, 0.5] },
    cn: { make: () => std(0xe2b84d, { emissive: 0x3a2800 }), op: [0.8, 0.3, 0.3, 1, 0.8, 0.3, 0.8, 0.4] },
    vnuc: { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3 }), op: [0.9, 0.4, 0.4, 1, 0.9, 0.3, 0.9, 0.5] },
    cerebellum: { make: () => std(0xd6b27a, { roughness: 0.5, transparent: true, emissive: 0x000000 }), op: [0.5, 0.15, 0.15, 0.4, 0.35, 0.15, 0.5, 0.6] },
    brainstem: { make: () => shellMat(0xd79dab, 1.7), op: [0.4, 0.15, 0.15, 0.55, 0.5, 0.15, 0.5, 0.3] },
    cortex: { make: () => shellMat(0x9b90d6, 2.4), op: [0.05, 0.012, 0.012, 0.015, 0.015, 0.02, 0.03, 0.08] },
    labyrinth: { make: () => std(0xe3eef7, { roughness: 0.28, emissive: 0x7d95ff, emissiveIntensity: 0.1 }), op: [0.9, 0.95, 0.95, 0.8, 0.8, 0.95, 0.8, 0.6] },
    vnerve: { make: () => std(0xe2b84d, { emissive: 0x3a2800 }), op: [0.8, 0.8, 0.8, 1, 0.9, 0.6, 0.9, 0.5] },
    tbone: { make: () => shellMat(0xd9c9a2, 2.6), op: [0.08, 0.12, 0.12, 0.05, 0.05, 0.1, 0.06, 0.06] },
    ossicle: { make: () => std(0xf1e4c2), op: [0.8, 0.6, 0.6, 0.3, 0.3, 0.6, 0.4, 0.3] },
    tm: { make: () => std(0xcfe6f6, { depthWrite: false }), op: [0.6, 0.4, 0.4, 0.2, 0.2, 0.4, 0.3, 0.2] },
    nucleus: { make: () => std(0xff5c8a), op: new Array(8).fill(0) },
  },
  chapters: [
    { k: 'Overview', nav: 'Overview', t: 'Balance: three senses, one brainstem', sig: CSS.fluid, cam: [V(-300, 90, 240), V(-30, 10, 0)], tour: 10,
      body: () => `<p>Balance combines <b>vestibular</b>, <b>visual</b> and <b>proprioceptive</b> input in the vestibular nuclei and cerebellum. Each inner ear has five sensors: three <b>semicircular canals</b> for angular acceleration and two <b>otolith organs</b> (utricle, saccule) for linear acceleration and gravity.</p>
        <p>Outputs stabilise gaze (vestibulo-ocular reflex), posture (vestibulospinal reflexes) and our sense of orientation (vestibulo-thalamo-cortical pathways). The magnified labyrinth on the left mirrors every head movement.</p>`,
      facts: () => [['5', 'sensors per ear: 3 canals + 2 otoliths'], ['≈ 90 spikes/s', 'resting discharge of vestibular afferents']] },
    { k: 'Canals', nav: 'Semicircular canals', t: 'Canals sense head rotation', sig: CSS.fluid, cam: [V(-270, 70, 170), V(-95, 30, 30)], tour: 14, motion: 'yaw',
      body: () => `<p>When the head turns, the endolymph lags behind (inertia) and bends the <b>cupula</b> in the ampulla, deflecting the hair-cell bundles. The canals work in <b>push–pull pairs</b>: turning right excites the right horizontal canal and inhibits the left. The vertical canals pair diagonally as LARP and RALP.</p>
        <p><b>Ewald's laws:</b> eye movement occurs in the plane of the stimulated canal. For the horizontal canal, flow toward the ampulla (ampullopetal) excites; for the vertical canals, flow away (ampullofugal) excites. Excitation produces a larger response than inhibition, because firing cannot fall below zero.</p>`,
      facts: () => [['LARP · RALP', 'vertical canal pairs'], ['≈ 0.1–10 Hz', 'canal operating range']] },
    { k: 'Otoliths', nav: 'Utricle & saccule', t: 'Otoliths sense gravity and linear motion', sig: CSS.fluid, cam: [V(-270, 70, 170), V(-95, 30, 30)], tour: 12, motion: 'tilt',
      body: () => `<p>The <b>utricle</b> (roughly horizontal) and <b>saccule</b> (vertical) carry a gel membrane loaded with calcium carbonate crystals, the <b>otoconia</b>. Tilting the head or accelerating in a line shears the membrane over the hair cells. Hair cells are polarised on each side of the <b>striola</b>, so every direction is coded.</p>
        <p>Clinically, <b>cVEMP</b> tests the saccule and inferior vestibular nerve, and <b>oVEMP</b> tests the utricle and superior vestibular nerve. Otoconia displaced into a canal cause BPPV.</p>`,
      facts: () => [['cVEMP', 'saccule · inferior nerve · SCM'], ['oVEMP', 'utricle · superior nerve · inferior oblique']] },
    { k: 'VOR', nav: 'Vestibulo-ocular reflex', t: 'The fastest reflex: the VOR', sig: CSS.neural, cam: [V(-170, 130, 340), V(0, 5, 25)], tour: 14, motion: 'impulse',
      body: () => `<p>A rapid head turn to the <b>right</b> excites the right horizontal canal. The right vestibular nuclei drive the <b>left abducens nucleus</b>, which moves the left eye out through the left lateral rectus (VI) and, via the <b>medial longitudinal fasciculus</b>, moves the right eye in through the right oculomotor nucleus and medial rectus (III).</p>
        <p>The eyes rotate left at head speed, so gaze stays on target: a three-neuron arc with about 10 ms latency and a gain close to 1. The <b>video head impulse test</b> measures this gain.</p>`,
      facts: () => [['≈ 10 ms', 'VOR latency'], ['gain ≈ 1', 'normal vHIT'], ['3 neurons', 'afferent · VN · oculomotor']] },
    { k: 'Nystagmus', nav: 'Nystagmus & tests', t: () => `Tests: ${disBy(S.dis).name}`, sig: CSS.mech, cam: [V(-70, 45, 400), V(0, 20, 50)], tour: 14, motion: 'nys',
      body: () => { const d = disBy(S.dis); return `<p><b>Nystagmus</b> is a slow drift driven by the vestibular imbalance followed by a fast corrective reset. It is named by the direction of the fast phase. The VNG trace in the panel shows eye position over time.</p>
        <dl class="kv"><dt>vHIT gain R / L</dt><dd>${d.hit[0].toFixed(2)} / ${d.hit[1].toFixed(2)}${d.hit[0] < 0.7 || d.hit[1] < 0.7 ? ' · catch-up saccades' : ''}</dd><dt>Caloric</dt><dd>${d.cal}</dd><dt>VEMP</dt><dd>${d.vemp}</dd><dt>Audiogram</dt><dd>${d.aud}</dd><dt>HINTS</dt><dd>${d.hints}</dd></dl>`; },
      sub: () => `<div class="sub"><button type="button" data-act="hit" data-v="-1">Head impulse → right</button><button type="button" data-act="hit" data-v="1">Head impulse → left</button></div>` },
    { k: 'BPPV', nav: 'BPPV · Dix–Hallpike · Epley', t: () => (S.bppv === 'dix' ? 'Right posterior-canal BPPV: Dix–Hallpike' : 'Epley repositioning manoeuvre'), sig: CSS.bad, cam: [V(-330, 30, 260), V(-40, -30, 0)], tour: 30, motion: 'bppv',
      body: () => `<p>In <b>benign paroxysmal positional vertigo</b>, otoconia detach from the utricle and fall into a canal, most often the <b>posterior canal</b> (≈ 85–90 %), since it is the lowest when upright or supine. Moving the head moves the debris, which drags endolymph and deflects the cupula.</p>
        <p>${S.bppv === 'dix' ? '<b>Dix–Hallpike (right):</b> head turned 45° to the right, then the patient is brought supine with the head hanging about 20°. After a <b>latency</b> of a few seconds comes <b>upbeating, torsional</b> nystagmus (upper pole toward the lower, right ear), lasting under 60 s, <b>fatigable</b> on repetition, and reversing on sitting up.' : '<b>Epley:</b> from the right Dix–Hallpike position, turn the head 90° to the left, roll onto the left side with the nose down, then sit up. Each position is held until nystagmus stops (about 30–60 s), walking the debris round the canal and out through the common crus into the utricle. Success is about 80 % after one to three manoeuvres.'}</p>`,
      sub: () => `<div class="sub"><button type="button" data-act="bppv" data-v="dix" aria-pressed="${S.bppv === 'dix'}">Dix–Hallpike (right)</button><button type="button" data-act="bppv" data-v="epley" aria-pressed="${S.bppv === 'epley'}">Epley manoeuvre</button></div><p class="note" id="bppvStep"></p>` },
    { k: 'Disorders', nav: 'Disorder explorer', t: () => disBy(S.dis).name, sig: CSS.bad, cam: [V(-110, 60, 400), V(0, 15, 40)], tour: 16, motion: 'nys',
      body: () => { const d = disBy(S.dis); return `<p>${d.feat.map((f) => `• ${f}`).join('<br>')}</p><p class="note"><b>HINTS:</b> ${d.hints}</p>`; } },
    { k: 'Recovery', nav: 'Compensation & rehab', t: () => `Management: ${disBy(S.dis).name}`, sig: CSS.ok, cam: [V(-260, 110, 230), V(-10, 10, -10)], tour: 12,
      body: () => { const d = disBy(S.dis); return `<ul class="mg">${d.mgmt.map((m) => `<li>${m}</li>`).join('')}</ul><p>After a one-sided loss, <b>central compensation</b> (cerebellum, commissural vestibular pathways) rebalances the nuclei within days to weeks. Vestibular rehabilitation speeds this up through <b>adaptation</b> (X1/X2 gaze stability), <b>habituation</b> and <b>substitution</b>. Vestibular suppressants should be short-term only.</p>`; } },
  ],
  build, update, renderPanels, onChapter, onAction,
});

// ---------------------------------------------------------------- build
let head, eyes = [], inset, canals = {}, oto = [], utricle, flow = {}, net, vng = { h: [], v: [] }, cupulas = {};
function build(ctx) {
  // everything anatomical rotates with the head, pivoting near the craniovertebral junction
  head = new THREE.Group(); head.position.set(0, -40, -20); ctx.scene.add(head); head.updateMatrixWorld();
  const all = []; ctx.scene.traverse((o) => { if (o.isMesh && o.parent && o.parent !== head) all.push(o); });
  for (const o of all) if (!o.userData.skip) head.attach(o);
  // eyes: pivot at each eyeball centre
  for (const side of ['r', 'l']) {
    const names = ['Sclera', 'Cornea', 'Iris', 'Lens'].map((n) => `${n}.${side}`).filter((n) => ctx.byName[n]);
    const c = ctx.centre(`Sclera.${side}`);
    const g = new THREE.Group(); head.add(g); g.position.copy(head.worldToLocal(c.clone())); g.updateMatrixWorld();
    for (const n of names) g.attach(ctx.byName[n]);
    (ctx.byName[`Iris.${side}`] || {}).material && ctx.byName[`Iris.${side}`].material.color.set(0x5a3a22);
    eyes.push({ g, side, h: 0, v: 0, t: 0 });
  }
  // magnified right labyrinth (world space, copies head orientation)
  inset = new THREE.Group(); inset.position.set(-150, 40, 60); ctx.scene.add(inset); inset.scale.setScalar(3.2);
  const up = V(0, 1, 0), lat = V(-1, 0, 0);
  const mkCanal = (id, normal, centre, ampAngle, color) => {
    const g = new THREE.Group(); g.position.copy(centre); g.quaternion.setFromUnitVectors(V(0, 0, 1), normal.clone().normalize()); inset.add(g);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(6, 0.55, 12, 64), std(0xe3eef7, { opacity: 0.55, roughness: 0.3, depthWrite: false })); g.add(torus);
    const amp = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12), std(0xe3eef7, { opacity: 0.7 })); amp.position.set(Math.cos(ampAngle) * 6, Math.sin(ampAngle) * 6, 0); g.add(amp);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 1.05, 2.1, 12), solid(0x9fd3ff, { emissive: 0x3060ff, emissiveIntensity: 0.4 })); cup.position.copy(amp.position); g.add(cup);
    cup.lookAt(g.localToWorld(V(0, 0, 0))); cup.rotateX(Math.PI / 2);
    // endolymph particles
    const N = 36, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: ctx.glowTex(), color, size: 0.9, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(pts);
    canals[id] = { g, torus, amp, cup, pts, N, phase: 0, ampAngle, color, act: 0 };
  };
  mkCanal('H', V(0, 0.87, -0.5), lat.clone().multiplyScalar(6).add(V(0, 0, 1)), Math.PI * 0.95, COL.air);
  mkCanal('A', V(0.707, 0, 0.707), V(0, 6.5, 3.5).add(V(-2.5, 0, 2.5)), -Math.PI * 0.75, COL.mech);
  mkCanal('P', V(-0.707, 0, 0.707), V(0, 4, -3.5).add(V(-3.5, 0, -3.5)), -Math.PI * 0.35, COL.violet);
  utricle = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), std(0xe3eef7, { opacity: 0.75 })); utricle.scale.set(2.6, 1.6, 2.2); utricle.position.set(-1, 0.5, 0); inset.add(utricle);
  const sac = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), std(0xe3eef7, { opacity: 0.7 })); sac.scale.set(1.6, 2.2, 1.8); sac.position.set(-1, -3, 1.5); inset.add(sac);
  const mac = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), solid(0x58d38c, { emissive: 0x1a6a3a, side: THREE.DoubleSide })); mac.rotation.x = -Math.PI / 2; mac.position.set(-1, -0.4, 0); inset.add(mac); utricle.userData.mac = mac;
  // otoconia (for BPPV) — start in the utricle
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), solid(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 })); inset.add(m); oto.push(m); }
  const grav = new THREE.ArrowHelper(V(0, -1, 0), V(10, 6, 0), 6, 0xf3b64a, 1.6, 1); ctx.scene.add(grav);  ctx.W.grav = grav;
  const leadTo = ctx.centre('Vestibule.r');
  const lead = new THREE.Line(new THREE.BufferGeometry().setFromPoints([leadTo, inset.position]), new THREE.LineDashedMaterial({ color: COL.fluid, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.6 })); lead.computeLineDistances(); ctx.scene.add(lead); ctx.W.lead = lead; ctx.W.leadTo = leadTo;
  // VOR network (right horizontal canal → right VN → left VI nucleus → left LR; MLF → right III nucleus → right MR)
  const c = (n) => ctx.centre(n);
  net = createNetwork(ctx, [
    ['canal', c('Vestibule.r')], ['vn', c('Vestibular nuclei.r')], ['vi', c('Nucleus of abducens nerve.l')], ['lr', c('Lateral rectus muscle.l')],
    ['iii', c('Nucleus of oculomotor nerve.r')], ['mr', c('Medial rectus muscle.r')],
  ], [
    ['canal', 'vn', 1, [c('Vestibular nerve.r')]], ['vn', 'vi', 1, [V(0, c('Vestibular nuclei.r').y, c('Vestibular nuclei.r').z)]],
    ['vi', 'lr', 0.5, [c('Abducens nerve (VI).l')]], ['vi', 'iii', 0.5, [V(0.5, (c('Nucleus of abducens nerve.l').y + c('Nucleus of oculomotor nerve.r').y) / 2, c('Nucleus of abducens nerve.l').z)]],
    ['iii', 'mr', 1, [c('Oculomotor nerve (III).r')]],
  ], { speed: 60 });
  for (const k in net.glows) head.attach(net.glows[k].s); head.attach(net.lines);
  // labels
  const L = (t, p, chs, color, when) => ctx.label(t, p, chs, { color, when });
  const onInset = (v) => () => inset.localToWorld(v.clone());
  L('Horizontal canal', onInset(V(-12, 1, 1)), [0, 1], CSS.air);
  L('Anterior (superior) canal', onInset(V(-3, 13, 6)), [0, 1, 5], CSS.mech);
  L('Posterior canal', onInset(V(-7, 5, -11)), [0, 1, 5], CSS.violet);
  L('Ampulla + cupula', () => canals.H.g.localToWorld(canals.H.amp.position.clone()), [1], CSS.fluid);
  L('Utricle (macula)', onInset(V(-1, 2.5, -1)), [2, 5], CSS.ok);
  L('Saccule', onInset(V(-2, -5.5, 2)), [2], CSS.ok);
  L('Gravity', () => grav.position.clone().add(V(0, -7.5 * inset.scale.x, 0)), [2, 5], CSS.mech);
  L('Right vestibular nuclei', () => head.localToWorld(head.worldToLocal(c('Vestibular nuclei.r').clone())).add(V(-4, 4, 0)), [3], CSS.neural);
  L('Left abducens nucleus (VI)', () => c('Nucleus of abducens nerve.l').add(V(6, -3, 0)), [3], CSS.neural);
  L('MLF → right oculomotor nucleus (III)', () => c('Nucleus of oculomotor nerve.r').add(V(-4, 5, 0)), [3], CSS.neural);
  L('Left lateral rectus', () => c('Lateral rectus muscle.l').add(V(8, 3, 6)), [3], CSS.bad);
  L('Right medial rectus', () => c('Medial rectus muscle.r').add(V(2, -4, 8)), [3], CSS.bad);
  L('Vestibular nerve', () => c('Vestibular nerve.r').add(V(-3, 5, 0)), [0, 3], '#e2b84d');
  L('Cerebellum (flocculus: VOR adaptation)', () => c('Flocculus.r').add(V(-10, -8, -6)), [0, 7], '#d6b27a');
  L('Skew deviation', () => c('Sclera.r').add(V(-8, 12, 10)), [6], CSS.bad, () => !!disBy(S.dis).skew);
  L('Otoconia', () => oto[0].getWorldPosition(V(0, 0, 0)).add(V(0, 4, 0)), [5], '#ffffff');
}

// the magnified labyrinth floats at a fixed screen spot (bottom-left on desktop, top-left on phones), in front of the head
function placeInset(ctx) {
  const cam = ctx.camera, el = ctx.renderer.domElement, w = el.clientWidth || 1, h = el.clientHeight || 1;
  const mob = w < 700;
  const px = mob ? w * 0.3 : Math.min(250, w * 0.2), py = mob ? h * 0.3 : h - 255;
  const p = V((px / w) * 2 - 1, -(py / h) * 2 + 1, 0.5).unproject(cam);
  const dir = p.sub(cam.position).normalize(), dist = 110;
  inset.position.copy(cam.position).addScaledVector(dir, dist);
  const mmPerPx = (2 * dist * Math.tan((cam.fov * D2R) / 2)) / h;
  const s = (mmPerPx * (mob ? 34 : 70)) / 6; inset.scale.setScalar(s);
  const right = V(1, 0, 0).applyQuaternion(cam.quaternion), upv = V(0, 1, 0).applyQuaternion(cam.quaternion);
  ctx.W.grav.position.copy(inset.position).addScaledVector(right, 15 * s).addScaledVector(upv, 7 * s); ctx.W.grav.scale.setScalar(s * 1.1);
}
// ---------------------------------------------------------------- motion + physiology
const DIX = [ // [t (s), yaw°, pitch° (neg = back), roll°]
  [0, 0, 0, 0], [2, -45, 0, 0], [4.5, -45, -110, 0], [22, -45, -110, 0], [25, -45, 0, 0], [30, 0, 0, 0]];
const EPLEY = [[0, 0, 0, 0], [2, -45, 0, 0], [4.5, -45, -110, 0], [12, -45, -110, 0], [14.5, 45, -110, 0], [21, 45, -110, 0], [24, 135, -110, 0], [31, 135, -110, 0], [34, 45, 0, 0], [38, 0, 0, 0]];
function keyAt(K, t) { const T = K[K.length - 1][0]; t = t % T; for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t < K[i + 1][0]) { const u = smooth((t - K[i][0]) / (K[i + 1][0] - K[i][0])); return K[i].slice(1).map((v, j) => lerp(v, K[i + 1][j + 1], u)); } return K[K.length - 1].slice(1); }
let prevAng = [0, 0, 0], nysPh = 0, hitT = 99, hitDir = 1, lastT = 0;
function update(ctx, t, dt, rdt) {
  const ch = ctx.S.ch, c = ctx.cfg.chapters[ch], motion = c.motion;
  const d = disBy(S.dis);
  let yaw = 0, pitch = 0, roll = 0, eyeH = 0, eyeV = 0, eyeT = 0;
  // --- head motion
  if (motion === 'yaw') yaw = 35 * Math.sin(t * 1.6);
  else if (motion === 'tilt') { roll = 28 * Math.sin(t * 0.8); pitch = 12 * Math.sin(t * 0.5); }
  else if (motion === 'impulse' || motion === 'nys') {
    hitT += dt; if (motion === 'impulse' && hitT > 4) { hitT = 0; hitDir = -hitDir; }
    const u = hitT < 0.15 ? smooth(hitT / 0.15) : hitT < 0.9 ? 1 : 1 - smooth((hitT - 0.9) / 0.6);
    yaw = 18 * hitDir * u;
  } else if (motion === 'bppv') { S.bppvT += dt; [yaw, pitch, roll] = keyAt(S.bppv === 'dix' ? DIX : EPLEY, S.bppvT); }
  head.rotation.set(pitch * D2R, yaw * D2R, roll * D2R, 'YXZ');
  inset.quaternion.copy(head.quaternion); placeInset(ctx);
  ctx.W.lead.geometry.setFromPoints([head.localToWorld(head.worldToLocal(ctx.W.leadTo.clone())), inset.position]);
  // angular velocity (deg/s)
  const w = [(yaw - prevAng[0]) / Math.max(dt, 1e-3), (pitch - prevAng[1]) / Math.max(dt, 1e-3), (roll - prevAng[2]) / Math.max(dt, 1e-3)]; prevAng = [yaw, pitch, roll];
  if (dt === 0) w.fill(0);
  // --- canal activation (right ear): yaw right = negative yaw
  const act = { RH: -w[0], LH: w[0], RA: 0.7 * (-w[1]) + 0.7 * w[2], RP: 0.7 * w[1] + 0.7 * w[2] };
  act.LP = -act.RA; act.LA = -act.RP;
  // --- BPPV: otoconia in the right posterior canal
  let bppvDrive = 0, step = '';
  if (motion === 'bppv') {
    const T = S.bppvT % (S.bppv === 'dix' ? 30 : 38);
    let phi; // position along the posterior canal (radians from the ampulla)
    if (S.bppv === 'dix') { phi = T < 6.5 ? 0.15 : T < 22 ? 0.15 + 1.9 * smooth((T - 6.5) / 5) : 2.05 - 1.9 * smooth((T - 23) / 3); bppvDrive = T > 6.5 && T < 22 ? Math.exp(-(T - 8) / 6) * (T > 6.5 ? smooth((T - 6.5) / 1) : 0) : T > 24 && T < 29 ? -0.6 * Math.exp(-(T - 24.5) / 2) : 0;
      step = T < 2 ? 'Sitting: head turned 45° right' : T < 4.5 ? 'Lying back quickly, head hanging 20°' : T < 6.5 ? 'Latency: otoconia start to move…' : T < 22 ? 'Upbeating torsional nystagmus, fading (fatigable)' : 'Sitting up: nystagmus reverses briefly'; }
    else { phi = T < 6 ? 0.15 : T < 14.5 ? 0.15 + 1.8 * smooth((T - 6) / 4) : T < 24 ? 1.95 + 1.6 * smooth((T - 15) / 4) : T < 34 ? 3.55 + 1.3 * smooth((T - 24.5) / 4) : 4.85;
      bppvDrive = T > 6 && T < 12 ? 0.8 * Math.exp(-(T - 7) / 4) : T > 15 && T < 21 ? 0.5 * Math.exp(-(T - 16) / 4) : 0;
      step = T < 4.5 ? 'Step 1: right Dix–Hallpike' : T < 14.5 ? 'Step 1: hold until nystagmus stops' : T < 21 ? 'Step 2: head turned 90° to the left' : T < 31 ? 'Step 3: roll onto the left side, nose down' : 'Step 4: sit up; debris back in the utricle'; }
    const P = canals.P;
    oto.forEach((m, i) => { const a = P.ampAngle + phi + i * 0.06; const p = P.g.localToWorld(V(Math.cos(a) * 6, Math.sin(a) * 6, 0)); m.position.copy(inset.worldToLocal(p)); m.visible = true; if (phi > 4.8) m.position.copy(V(-1 + (i % 3) * 0.6, 0.2 + (i % 2) * 0.3, -0.6 + i * 0.12)); });
    act.RP += bppvDrive * 140; act.LA -= bppvDrive * 140;
    const st = $('bppvStep'); if (st && st.textContent !== step) st.textContent = step;
  } else oto.forEach((m, i) => { m.visible = ch === 2; m.position.set(-1.8 + (i % 3) * 0.9, 0.9, -0.8 + Math.floor(i / 3) * 0.8); });
  // disease tone imbalance (spontaneous nystagmus)
  if ((motion === 'nys') && d.nys) { const bias = d.side === 'R' ? -60 : 0; act.RH += bias; }
  // --- canal visuals
  for (const [id, key] of [['H', 'RH'], ['A', 'RA'], ['P', 'RP']]) {
    const C = canals[id]; const a = clamp(act[key] / 120, -1.2, 1.2);
    C.act = lerp(C.act, a, Math.min(1, rdt * 8));
    C.phase += C.act * dt * 1.8;
    const pos = C.pts.geometry.attributes.position;
    for (let i = 0; i < C.N; i++) { const ang = (i / C.N) * Math.PI * 2 + C.phase; pos.setXYZ(i, Math.cos(ang) * 6, Math.sin(ang) * 6, 0); }
    pos.needsUpdate = true; C.pts.material.opacity = 0.25 + Math.min(1, Math.abs(C.act)) * 0.75;
    C.cup.material.emissive.set(C.act > 0.05 ? COL.ok : C.act < -0.05 ? COL.bad : 0x3060ff); C.cup.material.emissiveIntensity = 0.25 + Math.min(1, Math.abs(C.act)) * 0.45;
    C.cup.scale.set(1, 1, 1); C.cup.rotation.z = 0; C.cup.material.needsUpdate = false;
  }
  utricle.userData.mac.material.emissiveIntensity = 0.2 + Math.abs(roll) / 40;
  // --- eyes: VOR + nystagmus
  let vorGain = 1;
  if (motion === 'impulse' || motion === 'nys') vorGain = w[0] < 0 ? d.hit[0] : d.hit[1];
  eyeH = -yaw * (motion === 'impulse' || motion === 'nys' ? (hitT < 0.3 ? vorGain : 1) : 1);
  // catch-up saccade after a deficient impulse
  if ((motion === 'impulse' || motion === 'nys') && hitT > 0.3 && hitT < 0.9) eyeH = -yaw; // corrected by saccade
  if (motion === 'yaw' || motion === 'tilt') { eyeH = -yaw; eyeV = -pitch * 0.9; eyeT = -roll * 0.3; }
  // nystagmus (sawtooth: slow drift then fast reset)
  let nys = null;
  if (motion === 'nys' || (ch === 6)) nys = d.nys;
  if (motion === 'bppv' && Math.abs(bppvDrive) > 0.05) nys = { h: 0, v: 1 * Math.sign(bppvDrive), t: -1 * Math.sign(bppvDrive), spv: 14 * Math.abs(bppvDrive) };
  if (nys) {
    nysPh += dt * (nys.spv / 6);
    const saw = (nysPh % 1); const slow = saw < 0.85 ? saw / 0.85 : 1 - (saw - 0.85) / 0.15; // position within beat
    const amp = 6;
    const dirFlip = nys.dirChange ? (Math.floor(t / 4) % 2 ? -1 : 1) : 1;
    eyeH += -nys.h * dirFlip * amp * (slow - 0.5); eyeV += -nys.v * amp * (slow - 0.5); eyeT += -nys.t * amp * 1.5 * (slow - 0.5);
  }
  if (d.tullio && motion === 'nys' && (t % 5) < 1.5) { eyeV += 4 * Math.sin(t * 20); eyeT += 5 * Math.sin(t * 20); }
  const skew = ch === 6 && d.skew ? 4 : 0;
  eyes.forEach((e) => { e.g.rotation.set(-(eyeV + (e.side === 'r' ? skew : -skew * 0.2)) * D2R, eyeH * D2R, eyeT * D2R, 'YXZ'); });
  // muscle glow (lateral/medial recti) follows horizontal eye velocity
  const ev = (eyeH - (update.pe || 0)) / Math.max(dt, 1e-3); update.pe = eyeH;
  const lrL = ctx.byName['Lateral rectus muscle.l'], mrR = ctx.byName['Medial rectus muscle.r'], lrR = ctx.byName['Lateral rectus muscle.r'], mrL = ctx.byName['Medial rectus muscle.l'];
  const on = (m, v) => { if (m && m.material.emissive) { m.material.emissive.set(COL.bad); m.userData.gl = lerp(m.userData.gl || 0, clamp(v, 0, 0.6), Math.min(1, rdt * 3)); m.material.emissiveIntensity = m.userData.gl; } };
  on(lrL, ev / 60); on(mrR, ev / 60); on(lrR, -ev / 60); on(mrL, -ev / 60);
  // VOR network spikes
  net.visible = ch === 3 || ch === 0;
  if (ctx.S.playing && net.visible && act.RH > 20 && Math.random() < dt * 25) net.spawn('canal');
  net.step(dt, rdt); if (!net.visible) net.clear();
  // VNG buffers
  if (ctx.S.playing) { vng.h.push(eyeH); vng.v.push(eyeV); if (vng.h.length > 360) { vng.h.shift(); vng.v.shift(); } }
  drawVNG(); drawRates(act);
  ctx.W.grav.visible = [2, 5].includes(ch);
}

// ---------------------------------------------------------------- panels
function renderPanels(ctx) {
  const ch = ctx.S.ch;
  $('disRow').hidden = ![4, 6, 7].includes(ch);
  $('dis').innerHTML = DIS.map((d) => `<option value="${d.id}" ${d.id === S.dis ? 'selected' : ''}>${d.name}</option>`).join('');
}
function onChapter(ctx, c) {
  hitT = c.motion === 'impulse' ? 0 : 99; S.bppvT = 0; vng.h.length = 0; vng.v.length = 0;
  if (ctx.S.ch === 6 && S.dis === 'normal') S.dis = 'neuritisR';
  renderPanels(ctx);
}
function onAction(ctx, act, v) {
  if (act === 'bppv') { S.bppv = v; S.bppvT = 0; ctx.renderCard(); }
  if (act === 'hit') { hitDir = +v; hitT = 0; }
}
$('dis').addEventListener('change', (e) => { S.dis = e.target.value; lab.renderAll(); });
function drawVNG() {
  const cv = $('vng'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv);
  const lanes = [['Horizontal (right ↑)', vng.h, CSS.air], ['Vertical (up ↑)', vng.v, CSS.mech]];
  lanes.forEach(([n, buf, col], k) => {
    const y0 = 22 + k * ((h - 26) / 2), sc = 1.6;
    g.strokeStyle = 'rgba(150,185,215,.15)'; g.beginPath(); g.moveTo(4, y0 + 14); g.lineTo(w - 4, y0 + 14); g.stroke();
    g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath();
    buf.forEach((v, i) => { const x = 4 + (i / 359) * (w - 8), y = y0 + 14 - clamp(-v, -18, 18) * sc * 0.5; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = CSS.dim; g.font = '10px "JetBrains Mono",monospace'; g.fillText(n, 6, y0 - 4);
  });
}
function drawRates(act) {
  const cv = $('rates'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv);
  const ks = ['RH', 'LH', 'RA', 'LP', 'RP', 'LA'], bw = (w - 20) / ks.length;
  const d = disBy(S.dis);
  ks.forEach((k, i) => {
    let rate = 90 + clamp(act[k] || 0, -90, 300) * 0.9;
    if (d.side === 'R' && k.startsWith('R') && ['neuritisR'].includes(d.id)) rate *= 0.15;
    if (d.side === 'B') rate *= 0.2;
    rate = clamp(rate, 0, 350);
    const x = 10 + i * bw, hh = (rate / 350) * (h - 30);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 4, 8, bw - 8, h - 30);
    g.fillStyle = rate > 110 ? CSS.ok : rate < 70 ? CSS.bad : CSS.fluid; g.fillRect(x + 4, h - 22 - hh, bw - 8, hh);
    g.fillStyle = CSS.muted; g.font = '10px "JetBrains Mono",monospace'; g.textAlign = 'center'; g.fillText(k, x + bw / 2, h - 8);
  });
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.setLineDash([3, 3]); const yr = h - 22 - (90 / 350) * (h - 30); g.beginPath(); g.moveTo(8, yr); g.lineTo(w - 8, yr); g.stroke(); g.setLineDash([]);
}
