// Swallowing 3D — normal deglutition and dysphagia (neurogenic and head & neck cancer) on the real head model,
// with VFSS (lateral fluoroscopy) and FEES (endoscopic) views and PAS, Yale, FOIS and IDDSI scales.
import { createLab, createNetwork, THREE, V, clamp, lerp, smooth, CSS, COL, std, solid, shellMat, sprite, canvasCtx, $ } from '../../lab3d/engine.js';
import { createOralRig, vowelPose, REST_U, buildGlottis } from '../../lab3d/oral.js';

const CLIP = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.3)];
const cut = (m) => { m.clippingPlanes = CLIP; m.side = THREE.DoubleSide; return m; };

// ---------------------------------------------------------------- conditions
// pas/yv/yp/oral arrays are by consistency: [thin (IDDSI 0), slightly–mildly thick (1–2), moderately thick / puree (3–4), regular solid (7)]
const CONDS = [
  { id: 'normal', g: 'Reference', label: 'Healthy adult swallow', pas: [1, 1, 1, 1], yv: [1, 1, 1, 2], yp: [1, 1, 1, 1], oral: [1, 1, 1, 1], fois: 7,
    p: { delay: 0, hyo: 1, epi: 1, bot: 1, phar: 1, ues: 1, lvc: 1, tongue: 1, velum: 1 }, timing: 'none', cough: true,
    find: ['Oral transit < 1 s; pharyngeal response triggered as the bolus head passes the ramus of the mandible', 'Complete laryngeal vestibule closure before bolus arrival', 'Full epiglottic inversion; UES opens for about 0.5 s', 'Trace vallecular residue on solids is normal'],
    mgmt: ['None needed.'] },
  { id: 'lmca', g: 'Neurogenic', label: 'Left MCA cortical stroke', pas: [7, 3, 2, 2], yv: [2, 2, 3, 3], yp: [2, 2, 2, 2], oral: [3, 3, 3, 4], fois: 3,
    p: { delay: 1.3, hyo: 0.85, epi: 0.8, bot: 0.8, phar: 0.85, ues: 0.9, lvc: 0.9, tongue: 0.55, velum: 1 }, timing: 'before', cough: 'weak',
    find: ['Delayed oral initiation and groping (oral apraxia); prolonged oral transit', 'Delayed pharyngeal response: bolus reaches the pyriform sinuses before the swallow triggers', 'Aspiration before the swallow on thin liquids; weak cough', 'Oral residue on the affected side'],
    mgmt: ['Chin-down posture narrows the airway entrance during the delay', 'Short-term thickened liquids, then re-assess', 'Effortful swallow; sensory enhancement (sour, cold bolus)', 'Oral hygiene to reduce aspiration pneumonia risk; many recover within 2–4 weeks'] },
  { id: 'wallenberg', g: 'Neurogenic', label: 'Lateral medullary (Wallenberg) syndrome', pas: [8, 7, 6, 6], yv: [2, 3, 3, 4], yp: [5, 5, 5, 5], oral: [1, 1, 1, 1], fois: 1,
    p: { delay: 2.2, hyo: 0.45, epi: 0.5, bot: 0.7, phar: 0.35, ues: 0.18, lvc: 0.75, tongue: 0.95, velum: 0.85, side: 'R' }, timing: 'after', cough: false,
    find: ['Oral phase near normal: the lesion is in the medulla (nucleus ambiguus and NTS), not the cortex', 'Very delayed or absent pharyngeal response; reduced hyolaryngeal elevation', 'Ipsilateral pharyngeal paresis: the bolus diverts to the stronger side', 'UES fails to open, so severe pyriform residue overflows into the airway after the swallow, often silently'],
    mgmt: ['Head turn to the weak (ipsilateral) side closes that pyriform and directs the bolus to the strong side', 'Mendelsohn manoeuvre and Shaker (head-lift) exercise to prolong UES opening', 'Balloon dilatation or botulinum toxin to the cricopharyngeus; myotomy if it persists', 'Non-oral feeding (NG/PEG) is often needed at first'] },
  { id: 'pd', g: 'Neurogenic', label: "Parkinson's disease", pas: [8, 5, 3, 3], yv: [3, 3, 4, 4], yp: [2, 2, 3, 3], oral: [3, 3, 3, 3], fois: 5,
    p: { delay: 0.8, hyo: 0.7, epi: 0.7, bot: 0.5, phar: 0.75, ues: 0.8, lvc: 0.8, tongue: 0.6, velum: 1, pump: 1 }, timing: 'before', cough: false,
    find: ['Tongue pumping and rocking; piecemeal deglutition', 'Reduced base-of-tongue retraction, giving vallecular residue', 'Delayed pharyngeal response; reduced hyolaryngeal excursion', 'Silent aspiration is common because laryngeal sensation is reduced'],
    mgmt: ['Time meals to "on" medication periods', 'Expiratory muscle strength training (EMST) improves airway protection', 'Effortful swallow; chin-down posture; LSVT LOUD carry-over', 'Monitor weight and pneumonia; cognition affects safety'] },
  { id: 'als', g: 'Neurogenic', label: 'ALS / MND (bulbar onset)', pas: [7, 6, 4, 5], yv: [4, 4, 4, 5], yp: [3, 3, 4, 5], oral: [4, 4, 4, 5], fois: 3,
    p: { delay: 0.5, hyo: 0.6, epi: 0.6, bot: 0.4, phar: 0.4, ues: 0.7, lvc: 0.65, tongue: 0.35, velum: 0.4 }, timing: 'during', cough: 'weak',
    find: ['Tongue weakness, atrophy and fasciculations; poor bolus control and oral residue', 'Reduced velar elevation leading to nasal regurgitation', 'Diffuse pharyngeal residue from weak constriction', 'Progressive; aspiration during and after the swallow'],
    mgmt: ['Texture modification and energy conservation (small, frequent meals)', 'Supraglottic swallow; avoid fatiguing exercise', 'Discuss gastrostomy early, ideally before FVC falls below 50 %', 'Saliva management (anticholinergics, botulinum toxin to the salivary glands)'] },
  { id: 'mg', g: 'Neurogenic', label: 'Myasthenia gravis (fatigable)', pas: [5, 3, 2, 2], yv: [2, 2, 3, 3], yp: [2, 2, 2, 3], oral: [2, 2, 2, 3], fois: 5,
    p: { delay: 0.3, hyo: 0.8, epi: 0.8, bot: 0.8, phar: 0.7, ues: 0.9, lvc: 0.85, tongue: 0.8, velum: 0.6, fatigue: 1 }, timing: 'during', cough: true,
    find: ['Early swallows near normal; strength falls with repeated swallows', 'Velar weakness leading to nasal regurgitation; hypernasality late in meals', 'Pharyngeal residue increases across a meal', 'Watch successive swallows in this view'],
    mgmt: ['Eat during the peak effect of pyridostigmine', 'Small meals and rest breaks; the largest meal early in the day', 'Avoid strengthening exercise to fatigue', 'Myasthenic crisis can cause abrupt dysphagia: urgent referral'] },
  { id: 'gloss', g: 'Head & neck cancer', label: 'Partial glossectomy (oral tongue)', pas: [4, 3, 2, 3], yv: [2, 2, 3, 3], yp: [1, 1, 2, 2], oral: [4, 4, 4, 5], fois: 4,
    p: { delay: 0.2, hyo: 0.9, epi: 0.9, bot: 0.85, phar: 0.9, ues: 1, lvc: 0.95, tongue: 0.25, velum: 1, spill: 1 }, timing: 'before', cough: true,
    find: ['Poor bolus formation and control; prolonged oral transit', 'Premature spillage into the pharynx before the swallow triggers', 'Oral residue in the sulci and on the resected side', 'Pharyngeal phase largely intact when the base of tongue is preserved'],
    mgmt: ['Palatal augmentation prosthesis lowers the palate to meet the residual tongue', 'Liquid wash; place the bolus on the stronger side', 'Head-back posture only when airway protection is good', 'Range-of-motion and tongue-strength exercises after healing'] },
  { id: 'crt', g: 'Head & neck cancer', label: 'Base of tongue cancer after chemoradiation', pas: [8, 5, 4, 4], yv: [4, 4, 5, 5], yp: [4, 4, 4, 5], oral: [2, 2, 2, 3], fois: 4,
    p: { delay: 0.6, hyo: 0.5, epi: 0.3, bot: 0.3, phar: 0.5, ues: 0.6, lvc: 0.75, tongue: 0.8, velum: 0.9 }, timing: 'after', cough: false,
    find: ['Fibrosis reduces base-of-tongue retraction, hyolaryngeal excursion and epiglottic inversion', 'Heavy vallecular and pyriform residue', 'Reduced pharyngeal sensation: silent aspiration after the swallow', 'Late radiation-associated dysphagia (RAD) can appear years after treatment'],
    mgmt: ['Prophylactic swallowing exercises during radiotherapy ("eat and exercise")', 'Effortful swallow, tongue-hold (Masako), Mendelsohn, Shaker', 'Treat trismus (TheraBite); dilatation for strictures', 'Track outcomes with the MDADI and FOIS'] },
  { id: 'sgl', g: 'Head & neck cancer', label: 'Supraglottic laryngectomy', pas: [6, 4, 3, 3], yv: [1, 1, 1, 1], yp: [2, 2, 3, 3], oral: [1, 1, 1, 1], fois: 5,
    p: { delay: 0.3, hyo: 0.7, epi: 0, bot: 0.8, phar: 0.85, ues: 0.9, lvc: 0.45, tongue: 1, velum: 1, noEpi: 1 }, timing: 'during', cough: true,
    find: ['Epiglottis and false vocal folds removed; no vallecula', 'Airway protection depends on the arytenoids tilting to the base of tongue and on true-fold closure', 'Aspiration during the swallow early after surgery, with a strong cough', 'Most patients regain an oral diet with training'],
    mgmt: ['Supraglottic and super-supraglottic swallow (hold breath, swallow, cough)', 'Chin-down posture', 'Effortful swallow for base-of-tongue drive', 'Graded return to thin liquids under instrumental review'] },
  { id: 'tl', g: 'Head & neck cancer', label: 'Total laryngectomy', pas: [0, 0, 0, 0], yv: [3, 3, 3, 4], yp: [1, 1, 1, 1], oral: [1, 1, 1, 1], fois: 6,
    p: { delay: 0.1, hyo: 0, epi: 0, bot: 0.7, phar: 0.6, ues: 0.8, lvc: 1, tongue: 1, velum: 1, noLarynx: 1 }, timing: 'none', cough: true,
    find: ['Airway permanently separated: the trachea ends at a neck stoma, so aspiration is impossible', 'Neopharynx: a pseudo-vallecula or pseudo-epiglottis can trap food', 'Strictures and reduced propulsion slow solids', 'Leakage through or around a voice prosthesis (TEP) mimics aspiration'],
    mgmt: ['Alternate solids and liquids; extra swallows', 'Dilatation for stricture; revision of pseudo-vallecula if severe', 'Replace or re-size a leaking voice prosthesis', 'PAS does not apply: residue and transit time are the outcome measures'] },
];
const condBy = (id) => CONDS.find((c) => c.id === id) || CONDS[0];
const IDDSI = [
  { v: 0, n: 'Thin', c: '#ffffff', col: 0 }, { v: 1, n: 'Slightly thick', c: '#9aa0a6', col: 1 }, { v: 2, n: 'Mildly thick', c: '#e889b0', col: 1 },
  { v: 3, n: 'Moderately thick / liquidised', c: '#f2d34b', col: 2 }, { v: 4, n: 'Extremely thick / puree', c: '#68b76a', col: 2 }, { v: 7, n: 'Regular (solid)', c: '#1b1b1b', col: 3 },
];
const iddsiBy = (v) => IDDSI.find((x) => x.v === v) || IDDSI[0];
const PAS_TXT = ['', 'Material does not enter the airway', 'Enters the airway, stays above the vocal folds, is ejected', 'Enters the airway, stays above the vocal folds, is not ejected', 'Contacts the vocal folds, is ejected', 'Contacts the vocal folds, is not ejected', 'Passes below the vocal folds, is ejected', 'Passes below the vocal folds, not ejected despite effort', 'Passes below the vocal folds, no effort to eject (silent)'];
const FOIS_TXT = ['', 'Nothing by mouth', 'Tube dependent, minimal oral trials', 'Tube dependent, consistent oral intake', 'Total oral, single consistency', 'Total oral, multiple consistencies with special preparation', 'Total oral, no special preparation but specific limitations', 'Total oral, no restrictions'];

// ---------------------------------------------------------------- state
const S = { cond: 'normal', iddsi: 0, view: '3d', swCount: 0 };
let R, LX, EPI, UES, net, feesG, stoma, lastCycle = -1, fates = null;
const bolus = [];
const cur = () => condBy(S.cond);
const col = () => iddsiBy(S.iddsi).col;

const CH_3D = [0.35, 0.18, 0.18, 0.18, 0.18, 0.2, 0.2, 0.18, 0.18, 0.18, 0.18];
const lab = createLab({
  models: [{ url: '../lab3d/models/head.glb' }],
  state: S,
  groups: {
    skin: { make: () => shellMat(0x7fa6c4, 2.0), op: CH_3D },
    auricle: { make: () => std(0xd49a86), op: [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.1, 0.1, 0.1, 0.1] },
    bone: { make: () => cut(std(0xe9dfc6, { roughness: 0.6 })), op: [0.5, 0.55, 0.55, 0.55, 0.55, 0.4, 0.3, 0.55, 0.55, 0.55, 0.55] },
    teeth: { make: () => cut(solid(0xfbf8ef, { roughness: 0.3, transparent: true })), op: [1, 1, 1, 1, 1, 1, 0.6, 1, 1, 1, 1] },
    tongue: { make: () => std(0xcf6f78), op: new Array(11).fill(0) },
    tonguem: { make: () => cut(std(0xb85c64, { depthWrite: false })), op: [0.15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    lips: { make: () => std(0xd07a80), op: new Array(11).fill(0) },
    palate: { make: () => std(0xd98a8f), op: new Array(11).fill(0) },
    airway: { make: () => cut(std(0xe7a9ad, { roughness: 0.7, depthWrite: false })), op: [0.15, 0.2, 0.25, 0.3, 0.3, 0.2, 0.1, 0.25, 0.25, 0.25, 0.25] },
    constrictor: { make: () => cut(std(0xc9828a, { roughness: 0.6, depthWrite: false, emissive: 0x3a0a10, emissiveIntensity: 0 })), op: [0.3, 0.25, 0.3, 0.35, 0.45, 0.3, 0.15, 0.35, 0.35, 0.35, 0.35] },
    larynx: { make: () => cut(std(0xcfe0ea, { roughness: 0.4 })), op: [0.7, 0.6, 0.7, 0.9, 0.8, 0.6, 0.4, 0.8, 0.8, 0.8, 0.8] },
    oesophagus: { make: () => std(0xd9a0a0, { depthWrite: false }), op: [0.35, 0.2, 0.2, 0.25, 0.45, 0.7, 0.2, 0.35, 0.35, 0.35, 0.35] },
    nerve: { make: () => std(0xe2b84d, { emissive: 0x3a2800 }), op: [0.4, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0] },
    brainstem: { make: () => shellMat(0xd79dab, 1.7), op: [0.3, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0] },
    nucleus: { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3 }), op: [0.8, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
    cortex: { make: () => shellMat(0x9b90d6, 1.8), op: [0.15, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0] },
    cerebellum: { make: () => shellMat(0x9b90d6, 1.8), op: [0.1, 0, 0, 0, 0, 0, 0.12, 0, 0, 0, 0] },
  },
  opacityFor,
  chapters: [
    { k: 'Overview', nav: 'Overview', t: 'A swallow in four phases', sig: CSS.air, cam: [V(-240, -40, 150), V(0, -75, 30)], tour: 12,
      body: () => `<p>Swallowing moves a bolus from the mouth to the stomach while protecting the airway, in about a second through the mouth and pharynx. It uses about 30 pairs of muscles and cranial nerves V, VII, IX, X and XII, and is sequenced by a <b>central pattern generator</b> in the medulla.</p>
        <p>The phases are oral preparatory, oral transit, pharyngeal and oesophageal. The bolus (glowing) is shown on a real midsagittal head. Use the dock to pick a condition, a consistency (IDDSI) and a view: 3D, <b>VFSS</b> or <b>FEES</b>.</p>`,
      facts: () => [['< 1 s', 'oral transit'], ['≈ 0.7 s', 'pharyngeal transit'], ['8–20 s', 'oesophageal transit'], ['≈ 600/day', 'swallows, most of saliva']] },
    { k: 'Phase 1–2', nav: 'Oral phases', t: 'Oral preparation and transit', sig: CSS.air, cam: [V(-230, -45, 62), V(0, -48, 50)], tour: 13,
      body: () => `<p>The bolus is chewed and mixed (oral preparatory) and held in a <b>groove</b> on the tongue, sealed at the front by the tip on the alveolar ridge and at the back by the tongue base against the lowered velum (glossopalatal seal).</p>
        <p>In the <b>oral transit</b> phase the tongue presses up against the palate from front to back in a stripping wave, driving the bolus into the oropharynx. The facial (VII), trigeminal (V) and hypoglossal (XII) nerves run this phase, which is under voluntary control.</p>`,
      facts: () => [['CN V, VII, XII', 'jaw, lips/cheeks, tongue'], ['voluntary', 'oral phases']] },
    { k: 'Phase 3', nav: 'Trigger', t: 'Triggering the pharyngeal swallow', sig: CSS.mech, cam: [V(-230, -58, 50), V(0, -65, 35)], tour: 12,
      body: () => `<p>When the bolus head passes the ramus of the mandible, sensory input through IX and the superior laryngeal branch of X reaches the <b>nucleus of the solitary tract</b>. The medullary pattern generator then fires an obligatory, patterned motor sequence through the <b>nucleus ambiguus</b>.</p>
        <p>A <b>delayed</b> pharyngeal response lets the bolus fall into the valleculae or pyriform sinuses while the airway is still open, the classic path to aspiration <i>before</i> the swallow.</p>`,
      facts: () => [['≤ 0.35 s', 'normal stage-transition duration'], ['IX · X (SLN)', 'afferent trigger']] },
    { k: 'Phase 3', nav: 'Airway protection', t: 'Closing the airway', sig: CSS.bad, cam: [V(-190, -85, 45), V(0, -90, 25)], tour: 13,
      body: () => `<p>Airway protection works from the bottom up: the <b>true vocal folds</b> close, the <b>arytenoids</b> tilt forward to the base of the epiglottis, and the <b>hyolaryngeal complex</b> moves up and forward (hyoid about 1.5–2 cm) under the suprahyoid muscles. The <b>epiglottis</b> inverts over the laryngeal vestibule.</p>
        <p>Respiration pauses (swallow apnoea), and most healthy adults resume with an exhalation, which clears any remaining material away from the airway.</p>`,
      facts: () => [['≈ 1.5–2 cm', 'hyoid excursion'], ['0.3–1 s', 'swallow apnoea']] },
    { k: 'Phase 3', nav: 'Clearance & UES', t: 'Pharyngeal clearance and UES opening', sig: CSS.mech, cam: [V(-210, -95, 40), V(0, -95, 20)], tour: 13,
      body: () => `<p>The tongue base retracts to meet the posterior pharyngeal wall, and a <b>constriction wave</b> sweeps down the pharynx. The <b>upper oesophageal sphincter</b> (cricopharyngeus) opens by relaxing, by being pulled open by the hyolaryngeal excursion, and by bolus pressure, all three together.</p>
        <p>Weak base-of-tongue retraction leaves <b>vallecular</b> residue; poor UES opening or weak constriction leaves <b>pyriform</b> residue, which can spill into the airway after the swallow.</p>`,
      facts: () => [['≈ 0.5 s', 'UES opening'], ['3 mechanisms', 'relaxation, traction, bolus pressure']] },
    { k: 'Phase 4', nav: 'Oesophagus', t: 'Oesophageal peristalsis', sig: CSS.air, cam: [V(-330, -170, 70), V(0, -170, 0)], tour: 10,
      body: () => `<p>Primary peristalsis carries the bolus down the oesophagus (upper third striated, lower two-thirds smooth muscle) to the lower oesophageal sphincter in about 8–20 seconds. Secondary peristalsis clears anything left behind.</p><p>Oesophageal dysphagia (achalasia, strictures, reflux) is referred to gastroenterology, but it often coexists with oropharyngeal problems.</p>`,
      facts: () => [['8–20 s', 'oesophageal transit'], ['≈ 25 cm', 'oesophageal length']] },
    { k: 'Neural control', nav: 'Brainstem & cortex', t: 'Who controls the swallow', sig: CSS.neural, cam: [V(-200, 40, 140), V(0, -10, 0)], tour: 12,
      body: () => `<p>Both hemispheres (precentral gyrus, insula, cingulate) start and modulate the swallow; each side of the pharynx is represented in both hemispheres, but asymmetrically. That is why a unilateral cortical stroke causes dysphagia that often recovers as the other hemisphere compensates.</p>
        <p>The brainstem <b>pattern generator</b> sits in the medulla: a dorsal group in the <b>nucleus of the solitary tract</b> (sensory, timing) and a ventral group near the <b>nucleus ambiguus</b> (motor to the pharynx and larynx via IX and X), with the hypoglossal nucleus driving the tongue. A lateral medullary stroke hits this generator directly.</p>`,
      facts: () => [['NTS', 'dorsal swallowing group'], ['nucleus ambiguus', 'ventral group → IX, X']] },
    { k: 'Disorders', nav: 'Condition explorer', t: () => cur().label, sig: CSS.bad, cam: [V(-235, -75, 55), V(0, -78, 35)], tour: 16,
      body: () => condBody(), lens: () => '' },
    { k: 'Instrumental', nav: 'VFSS view', t: 'Videofluoroscopy (VFSS / MBS)', sig: CSS.muted, cam: [V(-780, -86, 40), V(0, -88, 40)], tour: 14, view: 'vfss', mobileZoom: 1.15,
      body: () => `<p>A lateral fluoroscopic view with barium-labelled boluses of graded consistency. VFSS shows all phases, bolus flow, the <b>timing</b> of airway entry relative to the swallow, and hyoid and UES movement. Findings are scored on the <b>Penetration–Aspiration Scale</b> and, in MBSImP-style protocols, on physiological components.</p><p>Limits: radiation exposure, barium is not real food, and it is a single snapshot in time.</p>${condLine()}` },
    { k: 'Instrumental', nav: 'FEES view', t: 'Fibreoptic endoscopic evaluation (FEES)', sig: CSS.ok, cam: () => [V(0, -58 + hyoY(), 13 + hyoZ() * 0.3), V(0, -98 + hyoY(), 18 + hyoZ())], tour: 14, view: 'fees', mobileZoom: 1,
      body: () => `<p>A flexible endoscope passed through the nose looks down on the pharynx and larynx. Food is dyed (green here) so residue in the valleculae and pyriform sinuses, penetration and aspiration are easy to see.</p><p>During the swallow the pharynx closes around the scope tip: the <b>white-out</b>. Aspiration during the swallow is inferred from what is seen below the cords afterwards. FEES is portable and radiation-free, suits bedside and repeated use, and allows sensory testing and real food.</p>${condLine()}` },
    { k: 'Management', nav: 'Management', t: () => `Managing: ${cur().label}`, sig: CSS.ok, cam: [V(-235, -60, 80), V(0, -70, 40)], tour: 12,
      body: () => `<ul class="mg">${cur().mgmt.map((m) => `<li>${m}</li>`).join('')}</ul><p class="note">Techniques should be chosen and checked with instrumental assessment; evidence levels vary. Teaching summary only.</p>` },
  ],
  build, update, renderPanels, onChapter, onAction,
  onResize: (ctx) => { if (S.view === 'fees') { ctx.camera.fov = 78; ctx.camera.updateProjectionMatrix(); } },
});

function condLine() { const c = cur(); return `<p class="note">Now showing <b>${c.label}</b> on ${iddsiBy(S.iddsi).n.toLowerCase()} (IDDSI ${S.iddsi}).</p>`; }
function condBody() {
  const c = cur();
  return `<p>${c.find.map((f) => `• ${f}`).join('<br>')}</p><p class="note">Change the consistency in the dock to see how PAS and residue shift. Switch to the VFSS or FEES view to see the same swallow as a clinician would.</p>`;
}
function opacityFor(ctx, grp) {
  if (S.view === 'vfss') return { skin: 0.35, auricle: 0.2, bone: 0.95, teeth: 1, airway: 0.3, constrictor: 0.35, larynx: 0.8, oesophagus: 0.4, tonguem: 0, nerve: 0, brainstem: 0, nucleus: 0, cortex: 0, cerebellum: 0, tongue: 0, lips: 0, palate: 0 }[grp] ?? null;
  if (S.view === 'fees') return { skin: 0, auricle: 0, bone: 0, teeth: 0, airway: 0.95, constrictor: 0.9, larynx: 0.95, oesophagus: 0, tonguem: 0, nerve: 0, brainstem: 0, nucleus: 0, cortex: 0, cerebellum: 0, tongue: 0, lips: 0, palate: 0 }[grp] ?? null;
  if (cur().p.noLarynx && grp === 'larynx') return 0;
  return null;
}

// ---------------------------------------------------------------- build
function build(ctx) {
  R = createOralRig(ctx, { clip: CLIP, glottis: false });
  R.air.visible = false;
  // hyolaryngeal complex moves as one; epiglottis pivots on its petiole
  LX = new THREE.Group(); ctx.scene.add(LX); LX.updateMatrixWorld();
  for (const n of ['Hyoid bone', 'Thyroid cartilage', 'Cricoid cartilage', 'Arytenoid cartilage.r', 'Arytenoid cartilage.l', 'Corniculate cartilage.r', 'Corniculate cartilage.l', 'Laryngopharynx']) if (ctx.byName[n]) LX.attach(ctx.byName[n]);
  EPI = new THREE.Group(); EPI.position.set(0, -95, 22); LX.add(EPI); EPI.updateMatrixWorld();
  if (ctx.byName.Epiglottis) EPI.attach(ctx.byName.Epiglottis);
  // UES (cricopharyngeal segment) ring
  UES = new THREE.Mesh(new THREE.TorusGeometry(5, 2.2, 12, 32), solid(0xc9707a, { roughness: 0.5, emissive: 0x3a0a10 }));
  UES.position.set(0, -121, 3); UES.rotation.x = Math.PI / 2; ctx.scene.add(UES);
  // FEES larynx (vocal folds seen from above), riding with the larynx
  feesG = buildGlottis(ctx, V(0, -100, 17)); LX.attach(feesG.g); feesG.g.rotation.set(Math.PI / 2, 0, 0); feesG.g.scale.setScalar(1.05);
  // stoma for total laryngectomy
  stoma = new THREE.Mesh(new THREE.TorusGeometry(6, 1.8, 10, 28), solid(0xb85c64)); stoma.position.set(0, -150, 34); ctx.scene.add(stoma);
  // bolus train
  const bm = solid(0xcdefff, { emissive: 0x5fe3f2, emissiveIntensity: 0.6, roughness: 0.2 });
  for (let k = 0; k < 18; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bm); m.renderOrder = 5; ctx.scene.add(m); bolus.push({ m, fate: 'pass' }); }
  ctx.W.bolusMat = bm;
  // neural network (chapter 6)
  const c = (n) => ctx.centre(n);
  net = createNetwork(ctx, [
    ['ctxL', c('Precentral gyrus.l').add(V(0, -18, 12))], ['ctxR', c('Precentral gyrus.r').add(V(0, -18, 12))],
    ['ntsL', c('Nucleus of solitary tract.l')], ['ntsR', c('Nucleus of solitary tract.r')], ['naL', c('Nucleus ambiguus.l')], ['naR', c('Nucleus ambiguus.r')],
    ['xii', c('Nucleus of hypoglossal nerve.l')], ['phar', V(0, -70, 8)], ['tongue', V(0, -48, 50)], ['lar', V(0, -98, 18)],
  ], [
    ['ctxL', 'ntsL', 0.5], ['ctxL', 'ntsR', 0.5], ['ctxR', 'ntsR', 0.5], ['ctxR', 'ntsL', 0.5],
    ['ntsL', 'naL', 0.7], ['ntsL', 'xii', 0.3], ['ntsR', 'naR', 0.7], ['ntsR', 'xii', 0.3],
    ['naL', 'phar', 0.6], ['naL', 'lar', 0.4], ['naR', 'phar', 0.6], ['naR', 'lar', 0.4], ['xii', 'tongue', 1],
  ], { speed: 45 });
  // labels
  const L = (t, p, chs, color, when) => ctx.label(t, p, chs, { color, when });
  L('Bolus', () => bolus[0].m.position.clone().add(V(0, 5, 3)), [0, 1, 2], CSS.air);
  L('Velum', () => V(0, -26 + 3 * R.cur.velum, 40), [1, 2], CSS.violet);
  L('Tongue', V(0, -44, 55), [0, 1], '#e79aa0');
  L('Vallecula', () => V(0, -73 + LX.position.y * 0.3, 27), [3, 4, 7], CSS.bad);
  L('Epiglottis', () => EPI.localToWorld(V(0, 18, 2)), [3, 4, 7], '#cfe0ea', () => !cur().p.noEpi && !cur().p.noLarynx);
  L('Hyoid', () => ctx.centre('Hyoid bone').add(V(0, 0, 10)), [3, 4], '#e9dfc6');
  L('Vocal folds · laryngeal vestibule', () => V(0, -100 + LX.position.y, 26 + LX.position.z), [3], CSS.bad, () => !cur().p.noLarynx);
  L('Pyriform sinuses', () => V(0, -107 + LX.position.y * 0.5, 6), [4, 7], CSS.bad);
  L('UES (cricopharyngeus)', () => UES.position.clone().add(V(0, 0, -6)), [4, 5, 7], CSS.mech);
  L('Posterior pharyngeal wall', V(0, -55, 6), [4], '#c9828a');
  L('Oesophagus', V(0, -190, 0), [5], '#d9a0a0');
  L('Cortex (bilateral)', () => net.N.ctxL.pos, [6], CSS.neural);
  L('NTS · dorsal swallowing group', () => net.N.ntsL.pos.clone().add(V(0, 4, -4)), [6], CSS.neural);
  L('Nucleus ambiguus · ventral group', () => net.N.naL.pos.clone().add(V(0, -5, 4)), [6], CSS.neural);
  L('Stoma (airway separated)', () => stoma.position.clone().add(V(0, -8, 6)), 'all', CSS.bad).when = () => cur().p.noLarynx && S.view === '3d';
  L('Epiglottis', () => EPI.localToWorld(V(0, 16, 0)), [9], '#f2c9c9', () => S.view === 'fees' && !cur().p.noEpi && !cur().p.noLarynx);
  L('Vocal folds', () => feesG.g.getWorldPosition(V(0, 0, 0)).add(V(0, 2, 0)), [9], '#f2c9c9', () => S.view === 'fees' && !cur().p.noLarynx);
  // materials for the instrumental views
  ctx.W.orig = new Map();
  ctx.scene.traverse((o) => { if (o.isMesh && o.material) ctx.W.orig.set(o, o.material); });
  setView(ctx, S.view);
}

// ---------------------------------------------------------------- VFSS / FEES rendering
const XR = {}, FE = {};
function xrMat(shade, opacity = 1) { return new THREE.MeshBasicMaterial({ color: shade, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: CLIP }); }
function setView(ctx, v) {
  S.view = v;
  const bg = v === 'vfss' ? new THREE.Color(0xc9c9c3) : v === 'fees' ? new THREE.Color(0x000000) : null;
  ctx.scene.background = bg;
  ctx.noBloom = v !== '3d';
  ctx.camera.fov = v === 'fees' ? 78 : v === 'vfss' ? 14 : 36; ctx.camera.near = v === 'fees' ? 0.3 : 0.5; ctx.camera.updateProjectionMatrix();
  const ov = $('overlay'); ov.hidden = v === '3d'; ov.className = 'overlay ' + v; ov.dataset.stamp = v === 'vfss' ? 'VFSS · LATERAL · 30 fps · BARIUM' : v === 'fees' ? 'FEES · TRANSNASAL' : '';
  ov.innerHTML = '<div class="white"></div>';
  const map = { bone: 0x3d3d3d, teeth: 0x252525, skin: 0xa9a9a3, auricle: 0xa9a9a3, airway: 0xd8d8d2, constrictor: 0x9a9a95, larynx: 0x6f6f6b, oesophagus: 0x9a9a95 };
  ctx.scene.traverse((o) => {
    if (!o.isMesh) return;
    const orig = ctx.W.orig.get(o); if (!orig) return;
    const g = o.userData.grp;
    if (v === 'vfss') {
      if (g && map[g] !== undefined) { XR[g] = XR[g] || xrMat(map[g], 0.5); o.material = XR[g]; }
      else if (bolus.some((b) => b.m === o)) o.material = XR.bolus = XR.bolus || new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
      else if ([R.tongue, R.velum, R.upperLip, R.lowerLip, R.wall, UES, stoma].includes(o)) o.material = XR.soft = XR.soft || xrMat(0x8f8f8a, 0.55);
      else o.material = orig;
    } else if (v === 'fees') {
      const pink = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0, side: THREE.DoubleSide, transparent: true, emissive: 0x5a1a14, emissiveIntensity: 0.35 });
      if (['airway', 'constrictor'].includes(g)) { FE[g] = FE[g] || pink(0xe59a94); o.material = FE[g]; }
      else if (g === 'larynx') { FE.l = FE.l || pink(0xf0b8b0); o.material = FE.l; }
      else if (bolus.some((b) => b.m === o)) o.material = FE.bolus = FE.bolus || new THREE.MeshStandardMaterial({ color: 0x3fbf62, roughness: 0.2, emissive: 0x0d3a18 });
      else if ([R.tongue, R.wall].includes(o)) { o.material = FE.t = FE.t || pink(0xd9807e); }
      else o.material = orig;
    } else o.material = orig;
  });
  if (v === 'fees') { if (!ctx.W.scope) { ctx.W.scope = new THREE.PointLight(0xfff1e0, 5200, 0, 2); ctx.scene.add(ctx.W.scope); } ctx.W.scope.visible = true; ctx.lights.children.forEach((l) => { l.userData.i0 = l.userData.i0 ?? l.intensity; l.intensity = l.userData.i0 * 0.25; }); }
  else { if (ctx.W.scope) ctx.W.scope.visible = false; ctx.lights.children.forEach((l) => { if (l.userData.i0 !== undefined) l.intensity = l.userData.i0; }); }
  for (const k in XR) XR[k].needsUpdate = true;
}

// ---------------------------------------------------------------- the swallow
const T_CYCLE = 9.5;
function hyoY() { return LX ? LX.position.y : 0; } function hyoZ() { return LX ? LX.position.z : 0; }
// bolus paths ([z, y], x-offset handled separately)
const P_MAIN = [[62, -47], [52, -45], [40, -45], [30, -50], [26, -60], [25, -71], [20, -82], [13, -94], [8, -106], [4, -119], [3, -140], [1, -175], [-3, -230], [-6, -280]];
const mainCurve = new THREE.CatmullRomCurve3(P_MAIN.map(([z, y]) => V(0, y, z)));
const S_VAL = 0.33, S_PYR = 0.53, S_UES = 0.61, S_LAR = 0.46;
const airCurve = new THREE.CatmullRomCurve3([[20, -84], [21, -92], [19, -98], [16, -102], [13, -115], [10, -135]].map(([z, y]) => V(0, y, z)));
const nasalCurve = new THREE.CatmullRomCurve3([[30, -40], [20, -30], [22, -18], [45, -10], [80, -12], [104, -22]].map(([z, y]) => V(0, y, z)));

function planFates() {
  const c = cur(), k = col();
  let pas = c.pas[k], yv = c.yv[k], yp = c.yp[k], oral = c.oral[k];
  if (c.p.fatigue) { const f = Math.min(3, S.swCount); pas = Math.min(8, pas + f); yp = Math.min(5, yp + Math.floor(f / 2)); yv = Math.min(5, yv + Math.floor(f / 2)); }
  const n = bolus.length, F = new Array(n).fill('pass');
  const nRes = (y) => [0, 0, 1, 2, 3, 5][y] || 0;
  let i = n - 1;
  for (let r = 0; r < nRes(oral) && i > 0; r++) F[i--] = 'oral';
  for (let r = 0; r < nRes(yv) && i > 0; r++) F[i--] = 'val';
  for (let r = 0; r < nRes(yp) && i > 0; r++) F[i--] = r % 2 ? 'pyrL' : 'pyrR';
  if (c.p.side === 'R') for (let j = 0; j < n; j++) if (F[j] === 'pyrL') F[j] = 'pyrR';
  const asp = pas >= 6 ? (pas === 8 ? 3 : 2) : 0, pen = pas >= 2 && pas <= 5 ? 2 : 0;
  // aspirated material: from the bolus head (before/during) or overflow from pyriform residue (after)
  const idx = [];
  if (c.timing === 'after') { for (let q = n - 1; q >= 0; q--) if (F[q].startsWith('pyr')) idx.push(q); for (let q = n - 1; q >= 0; q--) if (F[q] === 'pass') idx.push(q); }
  else for (let q = 1; q < n; q++) if (F[q] === 'pass') idx.push(q);
  for (let r = 0; r < asp && r < idx.length; r++) F[idx[r]] = 'asp';
  for (let r = 0, q = 3; r < pen && q < n; q++) if (F[q] === 'pass') { F[q] = pas >= 4 ? 'penVF' : 'pen'; r++; }
  const ejected = [2, 4, 6].includes(pas);
  return { F, pas, yv, yp, oral, ejected, silent: pas === 8 };
}
function update(ctx, t, dt) {
  const c = cur(), p = c.p;
  const cyc = t % T_CYCLE, cycIdx = Math.floor(t / T_CYCLE);
  if (cycIdx !== lastCycle) { lastCycle = cycIdx; S.swCount = c.p.fatigue ? S.swCount + 1 : 0; fates = planFates(); renderPanels(ctx); }
  const F = fates;
  const tongue = p.tongue, delay = p.delay * (p.fatigue ? 1 + 0.3 * Math.min(3, S.swCount) : 1);
  // --- timeline (visual seconds, slow motion ×2.5)
  const tHold = 0.9, tOral = tHold + 1.1 / (0.5 + 0.5 * tongue);
  const tTrig = tOral + delay;
  const tEnd = tTrig + 1.9;
  const inPh = clamp((cyc - tTrig) / 1.6, 0, 1); // pharyngeal phase progress
  const exc = p.hyo * smooth(inPh / 0.25) * (1 - smooth((inPh - 0.75) / 0.25)); // hyolaryngeal excursion envelope
  const close = p.lvc * smooth((inPh - 0.02) / 0.2) * (1 - smooth((inPh - 0.85) / 0.15));
  // hyolaryngeal complex
  LX.position.set(0, 16 * exc, 12 * exc);
  EPI.rotation.x = -(p.noEpi ? 0 : p.epi) * 1.9 * smooth((inPh - 0.1) / 0.25) * (1 - smooth((inPh - 0.75) / 0.2));
  EPI.visible = !p.noEpi && !p.noLarynx;
  feesG.g.visible = !p.noLarynx && S.view === 'fees';
  feesG.update(dt, close > 0.5 ? 'closed' : cyc < tTrig ? 'open' : 'open');
  stoma.visible = !!p.noLarynx && S.view === '3d';
  // UES
  const uesOpen = p.ues * smooth((inPh - 0.18) / 0.12) * (1 - smooth((inPh - 0.62) / 0.12));
  UES.scale.set(1 + 0.7 * uesOpen, 1 + 0.7 * uesOpen, 1); UES.material.emissiveIntensity = 0.2 + uesOpen;
  // tongue & velum poses
  let pose = { U: REST_U.map((q) => q.slice()), jaw: 0.05, lips: { close: 1 }, velum: 0.1, groove: 0 };
  if (cyc < tHold) { pose.U = [[80.5, -43], [72, -41.5], [60, -45.5], [48, -38], [37, -32], [29, -45], [25, -62]]; pose.groove = 1; pose.velum = 0; }
  else if (cyc < tOral) {
    const u = (cyc - tHold) / (tOral - tHold); // stripping wave
    const front = u < 0.5 ? smooth(u / 0.5) : 1;
    pose.U = [[80.5, -43], [72, -41.5 + 2.5 * front], [62, -45 + 12 * front * tongue], [49, -38 + 5 * smooth((u - 0.35) / 0.4) * tongue], [37, -33 - 5 * front + 6 * smooth((u - 0.6) / 0.4) * tongue], [29, -46], [25, -62]];
    pose.groove = 1 - u; pose.velum = smooth((u - 0.55) / 0.4) * p.velum;
    if (p.pump) pose.U[3][1] += 3 * Math.sin(cyc * 18) * (1 - u);
  } else if (cyc < tEnd) {
    const b = p.bot * smooth((inPh - 0.25) / 0.3) * (1 - smooth((inPh - 0.9) / 0.1));
    pose.U = [[80, -44], [72, -40], [62, -33.5], [50, -32], [39, -33], [27 - 11 * b, -48], [24 - 9 * b, -63]];
    pose.velum = p.velum * (1 - smooth((inPh - 0.9) / 0.1));
  } else { pose = vowelPose(0.45, 0.5, 0); pose.lips = { close: 1 }; pose.velum = 0.1; }
  R.rate = 12; R.set(pose); R.update(dt);
  // pharyngeal constriction wave on the posterior wall
  const waveY = lerp(-30, -125, smooth((inPh - 0.25) / 0.55)), amp = p.phar * 6 * (inPh > 0.2 && inPh < 0.95 ? 1 : 0);
  R.wallBulge = (y) => amp * Math.exp(-Math.pow((y - waveY) / 9, 2));
  // bolus kinematics
  const k = col(), vis = [0.0105, 0.0095, 0.0085, 0.008][k], rad = [3.4, 3.6, 3.9, 4.2][k];
  let head;
  const spillHold = p.spill ? 0.18 : 0.02;
  if (cyc < tHold) head = lerp(0.0, spillHold, cyc / tHold);
  else if (cyc < tOral) head = lerp(spillHold, 0.27, smooth((cyc - tHold) / (tOral - tHold)));
  else if (cyc < tTrig) { const pool = c.timing === 'before' || delay > 1 ? (delay > 1.5 ? S_PYR : S_VAL + 0.08) : 0.29; head = lerp(0.27, pool, smooth((cyc - tOral) / Math.max(0.3, delay))); }
  else head = lerp(Math.max(0.29, cyc < tTrig + 0.01 ? 0.29 : 0.29), 1.0, smooth(inPh * 0.55) * (p.noLarynx ? 1 : 1)) + (inPh > 0.5 ? (inPh - 0.5) * 0.9 : 0);
  if (cyc >= tTrig) head = Math.max(head, lerp(0.3, S_UES, smooth(inPh / 0.45)));
  if (cyc >= tTrig + 0.72) head = lerp(S_UES, 1, smooth((cyc - tTrig - 0.72) / 3.2));
  const post = cyc > tEnd;
  bolus.forEach((b, i) => {
    const fate = F.F[i];
    let s = head - i * vis;
    let pos, x = 0;
    const r = rad * (i === 0 ? 1 : i < 4 ? 0.95 : 0.8 - 0.02 * i);
    b.m.scale.setScalar(Math.max(0.9, r));
    b.m.visible = s > -0.02 || cyc < tOral;
    s = Math.max(0, s);
    // residue sites stop the sphere
    const stopAt = { oral: 0.02 + (i % 3) * 0.03, val: S_VAL, pyrL: S_PYR, pyrR: S_PYR, asp: c.timing === 'after' ? S_PYR : undefined }[fate];
    if (stopAt !== undefined && s > stopAt && cyc > tTrig) s = stopAt;
    if (fate === 'oral' && cyc > tOral) s = Math.min(s, stopAt);
    pos = mainCurve.getPointAt(clamp(s, 0, 1));
    if (s > 0.38 && s < 0.6) x = (i % 2 ? 1 : -1) * 9 * Math.sin(((s - 0.38) / 0.22) * Math.PI);
    if (fate === 'pyrL') x = 9.5; if (fate === 'pyrR') x = -9.5;
    if (p.side === 'R' && s > 0.38 && s < 0.6 && fate === 'pass') x = Math.abs(x); // divert to the strong (left) side
    if (fate === 'oral') { x = (i % 2 ? 1 : -1) * 12; pos.y -= 3; }
    // airway entry
    const openAirway = cyc < tTrig + 0.05 || (cyc > tTrig && close < 0.9) || post;
    const enterTime = c.timing === 'before' ? tTrig - 0.35 : c.timing === 'during' ? tTrig + 0.35 : tEnd + 0.4;
    if ((fate === 'asp' || fate === 'pen' || fate === 'penVF') && cyc > enterTime && openAirway && !p.noLarynx) {
      const depth = fate === 'asp' ? 1 : fate === 'penVF' ? 0.45 : 0.3;
      let a = smooth((cyc - enterTime) / 0.9) * depth;
      if (F.ejected && cyc > enterTime + 1.3) a *= 1 - smooth((cyc - enterTime - 1.3) / 0.8);
      const ap = airCurve.getPointAt(clamp(a, 0, 1));
      if (c.timing === 'after') { const py = mainCurve.getPointAt(S_PYR); pos = py.lerp(ap, smooth(a * 2.5)); x = lerp(i % 2 ? 9.5 : -9.5, 0, smooth(a * 2.5)); } else { pos = ap; x = 0; }
      b.m.userData.air = a > 0.02;
    } else b.m.userData.air = false;
    // nasal regurgitation with a weak velum
    if (p.velum < 0.7 && i === 5 && cyc > tOral - 0.2 && cyc < tTrig + 0.8) { const a = smooth((cyc - tOral + 0.2) / 0.6) * (1 - p.velum); pos = nasalCurve.getPointAt(clamp(a, 0, 1)); x = 0; }
    // move residue/air with the larynx where relevant
    if (['val', 'pyrL', 'pyrR'].includes(fate) && s >= (stopAt || 0) - 0.001) { pos.y += LX.position.y * 0.6; pos.z += LX.position.z * 0.4; }
    b.m.position.set(x, pos.y, pos.z);
    if (s >= 0.999) b.m.visible = false;
  });
  // white-out in FEES at the height of the pharyngeal squeeze
  if (S.view === 'fees') { const w = $('overlay').querySelector('.white'); if (w) w.style.opacity = (0.95 * smooth((inPh - 0.22) / 0.08) * (1 - smooth((inPh - 0.55) / 0.1))).toFixed(2); const cam = ctx.camera; cam.position.set(0, -58 + hyoY() * 0.4, 13); ctx.controls.target.set(0, -98 + hyoY(), 18 + hyoZ()); if (ctx.W.scope) ctx.W.scope.position.copy(cam.position); }
  // neural chapter
  const neuralOn = ctx.S.ch === 6;
  net.visible = neuralOn;
  if (neuralOn && ctx.S.playing) { if (cyc > tOral - 0.3 && cyc < tTrig + 0.8 && Math.random() < dt * 10) { net.spawn(Math.random() < 0.5 ? 'ctxL' : 'ctxR'); } if (Math.random() < dt * 3) net.spawn(Math.random() < 0.5 ? 'ntsL' : 'ntsR'); }
  if (!neuralOn) net.clear();
  net.step(dt, dt);
  // constrictor glow during squeeze
  (ctx.meshes.constrictor || []).forEach((m) => { if (m.material.emissive) m.material.emissiveIntensity = lerp(m.material.emissiveIntensity, amp > 0 ? 0.35 : 0, Math.min(1, dt * 4)); });
  drawTiming(cyc, { tHold, tOral, tTrig, tEnd, exc, close, uesOpen });
}

// ---------------------------------------------------------------- panels
function scaleRow(n, on, color) { return `<div class="scale" style="--c:${color}">${Array.from({ length: n }, (_, i) => `<span class="${i + 1 === on ? 'on' : ''}">${i + 1}</span>`).join('')}</div>`; }
function renderPanels(ctx) {
  const c = cur(), f = fates || planFates();
  const pasOn = c.p.noLarynx ? 0 : f.pas;
  const pasCol = f.pas >= 6 ? CSS.bad : f.pas >= 2 ? CSS.mech : CSS.ok;
  $('scales').innerHTML = `
    <div class="panel-head"><h3>Penetration–Aspiration Scale</h3><span class="chip-note">${c.p.noLarynx ? 'not applicable' : 'PAS ' + f.pas}</span></div>
    ${scaleRow(8, pasOn, pasCol)}<p class="note" style="margin-top:-4px">${c.p.noLarynx ? 'The airway is separated after total laryngectomy.' : PAS_TXT[f.pas]}${c.p.fatigue ? ` · swallow ${S.swCount} of the meal` : ''}</p>
    <div class="panel-head"><h3>Yale residue · vallecula</h3><span class="chip-note">${['', 'none', 'trace', 'mild', 'moderate', 'severe'][f.yv]}</span></div>${scaleRow(5, f.yv, f.yv >= 4 ? CSS.bad : f.yv >= 3 ? CSS.mech : CSS.ok)}
    <div class="panel-head"><h3>Yale residue · pyriform</h3><span class="chip-note">${['', 'none', 'trace', 'mild', 'moderate', 'severe'][f.yp]}</span></div>${scaleRow(5, f.yp, f.yp >= 4 ? CSS.bad : f.yp >= 3 ? CSS.mech : CSS.ok)}
    <div class="panel-head"><h3>FOIS (typical)</h3><span class="chip-note">level ${c.fois}</span></div>${scaleRow(7, c.fois, c.fois >= 6 ? CSS.ok : c.fois >= 4 ? CSS.mech : CSS.bad)}<p class="note" style="margin-top:-4px">${FOIS_TXT[c.fois]}</p>
    <div class="panel-head"><h3>IDDSI</h3><span class="chip-note">level ${S.iddsi}</span></div>
    <div class="iddsi">${IDDSI.map((d) => `<button type="button" data-act="iddsi" data-v="${d.v}" aria-pressed="${d.v === S.iddsi}" style="--c:${d.c}"><i></i>${d.v} · ${d.n}</button>`).join('')}</div>`;
}
function drawTiming(cyc, T) {
  const cv = $('timing'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv);
  const X = (s) => 8 + (s / T_CYCLE) * (w - 16);
  const rows = [['Oral', CSS.air, [[0, T.tOral]]], ['Delay', CSS.bad, T.tTrig - T.tOral > 0.1 ? [[T.tOral, T.tTrig]] : []], ['Hyoid', CSS.mech, [[T.tTrig, T.tTrig + 1.5]]], ['Airway closed', CSS.ok, [[T.tTrig + 0.04, T.tTrig + 1.4]]], ['UES open', CSS.fluid, [[T.tTrig + 0.3, T.tTrig + 1.0]]]];
  g.font = '10px "JetBrains Mono",monospace'; g.textAlign = 'left';
  rows.forEach(([name, c, spans], i) => {
    const y = 10 + i * 18;
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(X(0), y, X(T_CYCLE) - X(0), 10);
    g.fillStyle = c; for (const [a, b] of spans) g.fillRect(X(a), y, Math.max(2, X(b) - X(a)), 10);
    g.fillStyle = CSS.muted; g.fillText(name, X(0) + 3, y + 8.5);
  });
  g.strokeStyle = 'rgba(255,92,138,.8)'; g.beginPath(); g.moveTo(X(cyc), 4); g.lineTo(X(cyc), h - 12); g.stroke();
  g.fillStyle = CSS.dim; g.fillText('slow motion ×2.5', X(0), h - 2);
}
function onChapter(ctx, c) {
  const v = c.view || (S.view !== '3d' && !c.view ? '3d' : S.view);
  if (v !== S.view || (c.view && c.view !== S.view)) setView(ctx, c.view || '3d');
  syncViewButtons();
  if (ctx.S.ch === 7 && S.cond === 'normal') { S.cond = 'wallenberg'; $('cond').value = S.cond; fates = planFates(); renderPanels(ctx); }
}
function syncViewButtons() { document.querySelectorAll('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === S.view)); }
function onAction(ctx, act, v) {
  if (act === 'iddsi') { S.iddsi = +v; fates = planFates(); renderPanels(ctx); ctx.renderCard(); $('iddsiSel').value = v; }
  if (act === 'view') { const idx = v === 'vfss' ? 8 : v === 'fees' ? 9 : ctx.S.ch >= 8 && ctx.S.ch <= 9 ? 7 : ctx.S.ch; if (idx !== ctx.S.ch) ctx.setChapter(idx); else { setView(ctx, v); syncViewButtons(); } }
}
// dock controls
const grp = {}; CONDS.forEach((c) => (grp[c.g] = grp[c.g] || []).push(c));
$('cond').innerHTML = Object.entries(grp).map(([g, cs]) => `<optgroup label="${g}">${cs.map((c) => `<option value="${c.id}">${c.label}</option>`).join('')}</optgroup>`).join('');
$('cond').addEventListener('change', (e) => { S.cond = e.target.value; S.swCount = 0; fates = planFates(); lab.renderAll(); if (lab.S.ch < 7) lab.setChapter(7); });
$('iddsiSel').innerHTML = IDDSI.map((d) => `<option value="${d.v}">IDDSI ${d.v} · ${d.n}</option>`).join('');
$('iddsiSel').addEventListener('change', (e) => onAction(lab, 'iddsi', e.target.value));
$('viewSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) onAction(lab, 'view', b.dataset.v); });
