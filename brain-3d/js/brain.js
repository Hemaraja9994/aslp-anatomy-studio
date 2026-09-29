// Brain, speech, language & cognition 3D — networks, aphasia, dysarthria, AOS and cognitive-communication disorders.
import { createLab, createNetwork, THREE, V, clamp, lerp, smooth, CSS, COL, std, solid, shellMat, sprite, tube, canvasCtx, $ } from '../../lab3d/engine.js';

const L = (n) => n + '.l', R = (n) => n + '.r';
const G = {
  broca: [L('Opercular part of inferior frontal gyrus'), L('Triangular part of inferior frontal gyrus')],
  ifgOrb: [L('Orbital part of inferior frontal gyrus')],
  insula: [L('Insula (Subcentral gyrus and ant. and post. sulci*)'), L('Circular sulcus of insula')],
  m1: [L('Precentral gyrus')], s1: [L('Postcentral gyrus')], m1R: [R('Precentral gyrus')],
  stg: [L('Superior temporal gyrus (Lateral part)')], pt: [L('Temporal plane')], a1: [L('Transverse temporal gyri')],
  mtg: [L('Middle temporal gyrus'), L('Superior temporal sulcus')], itg: [L('Inferior temporal gyrus'), L('Inferior temporal sulcus')], tp: [L('Temporal pole')],
  smg: [L('Supramarginal gyrus')], ang: [L('Angular gyrus')], sfg: [L('Superior frontal gyrus')], mfg: [L('Middle frontal gyrus')], orb: [L('Orbital gyri'), R('Orbital gyri')],
  spl: [L('Superior parietal lobule'), R('Superior parietal lobule')],
  put: [L('Putamen')], gp: [L('Globus pallidus')], caud: [L('Caudate nucleus')], thal: [L('Thalamus')], hip: [L('Hippocampus'), R('Hippocampus')],
  cb: ['Anterior quadrangular lobule', 'Posterior quadrangular lobule', 'Superior semilunar lobule', 'Inferior semilunar lobule', 'Biventral lobule', 'Gracile lobule'].flatMap((n) => [L(n), R(n)]).concat(['Central lobule', 'Folium of vermis', 'Pyramis of vermis', 'Nodule of vermis', 'Lingula of cerebellum']),
  nuclei: ['Nucleus ambiguus', 'Nucleus of hypoglossal nerve', 'Motor nucleus of facial nerve'].flatMap((n) => [L(n), R(n)]),
  nerves: ['Facial nerve (VII)', 'Vagus nerve (X)', 'Hypoglossal nerve (XII)', 'Glossopharyngeal nerve (IX)', 'Trigeminal nerve (V)'].flatMap((n) => [L(n), R(n)]),
  cc: ['Corpus callosum'],
  rPeri: ['Opercular part of inferior frontal gyrus', 'Triangular part of inferior frontal gyrus', 'Supramarginal gyrus', 'Angular gyrus', 'Superior temporal gyrus (Lateral part)', 'Temporal plane', 'Superior parietal lobule'].map(R),
};
const RED = CSS.bad;

// ---------------------------------------------------------------- aphasia
const APHASIA = [
  { id: 'broca', name: "Broca's aphasia", prof: [2, 7, 3, 4], les: ['broca', 'insula', 'm1'], terr: 'MCA superior division',
    feat: ['Non-fluent, effortful, telegraphic speech with agrammatism', 'Comprehension relatively spared, except complex syntax', 'Repetition impaired; naming helped by phonemic cues', 'Often right hemiparesis and apraxia of speech; aware of errors'],
    en: '"Walk… dog… park… yes… nice."', kn: ['ಅಮ್ಮ… ಆಸ್ಪತ್ರೆ… ಹೋಗು…', 'amma… āspatre… hōgu… (mother… hospital… go)'] },
  { id: 'wernicke', name: "Wernicke's aphasia", prof: [8, 2, 2, 2], les: ['stg', 'pt', 'mtg'], terr: 'MCA inferior division',
    feat: ['Fluent, well-articulated speech with semantic and phonemic paraphasias and neologisms (jargon)', 'Poor auditory comprehension; repetition and naming impaired', 'Reduced awareness of errors (anosognosia); press of speech', 'Usually no hemiparesis; may have a right upper quadrantanopia'],
    en: '"I saw the tarple with the flumps, you know, and it went over there the other thing."', kn: ['ನಾನು ನಿನ್ನೆ ಆ ಪಟಗು ತಂದೆ, ಅದು ಇದು ಆಗೋಯ್ತು ಗೊತ್ತಾ…', 'nānu ninne ā paṭagu tande, adu idu āgōytu gottā… (fluent, with a non-word)'] },
  { id: 'conduction', name: 'Conduction aphasia', prof: [8, 8, 2, 6], les: ['smg', 'pt'], terr: 'MCA posterior (supramarginal / arcuate)', arcuate: true,
    feat: ['Fluent speech with frequent phonemic paraphasias', 'Good comprehension', 'Repetition disproportionately impaired, worse for longer and non-word strings', 'Conduite d\'approche: repeated self-corrections that approach the target'],
    en: '"It\'s a /spoon/… a /spun/… a /spoon/, that\'s it."', kn: null },
  { id: 'global', name: 'Global aphasia', prof: [1, 1, 1, 1], les: ['broca', 'insula', 'stg', 'pt', 'smg', 'm1', 'mtg'], terr: 'Proximal MCA (whole territory)',
    feat: ['All modalities severely impaired', 'Stereotyped utterances or recurring syllables', 'Some automatic speech or emotional utterances may survive', 'Dense right hemiparesis common'], en: '"Tan… tan… tan."', kn: null },
  { id: 'tcm', name: 'Transcortical motor aphasia', prof: [2, 8, 8, 5], les: ['sfg', 'mfg'], terr: 'ACA–MCA watershed / SMA',
    feat: ['Non-fluent, with poor initiation of spontaneous speech', 'Comprehension good', 'Repetition strikingly preserved, which distinguishes it from Broca\'s', 'Lesion anterior or superior to Broca\'s area or in the supplementary motor area'], en: '(Long pause)… "Yes."  Repeats a long sentence perfectly.', kn: null },
  { id: 'tcs', name: 'Transcortical sensory aphasia', prof: [8, 3, 8, 3], les: ['ang', 'itg'], terr: 'MCA–PCA watershed (temporo-occipital)',
    feat: ['Fluent, empty speech with semantic paraphasias', 'Poor comprehension', 'Repetition preserved, sometimes echolalia', 'Seen in stroke and in Alzheimer\'s disease'], en: '"Well, the thing, you do it with the thing for the other."', kn: null },
  { id: 'mtc', name: 'Mixed transcortical aphasia', prof: [2, 2, 8, 1], les: ['sfg', 'mfg', 'ang', 'itg'], terr: 'Both watershed zones (isolation of the speech area)',
    feat: ['Non-fluent with poor comprehension', 'Repetition preserved: an echolalic, isolated perisylvian circuit', 'Hypoperfusion (e.g. carotid occlusion, cardiac arrest)'], en: 'Echoes the examiner\'s question word for word.', kn: null },
  { id: 'anomic', name: 'Anomic aphasia', prof: [9, 9, 9, 4], les: ['ang', 'itg'], terr: 'Variable (angular gyrus, inferior temporal)',
    feat: ['Fluent speech with word-finding pauses and circumlocution', 'Comprehension and repetition good', 'Most common residual type as other aphasias recover', 'Semantic or phonemic cueing helps'],
    en: '"It\'s the… you know, the thing you write with… a pen!"', kn: ['ಅದೇ… ಬರೆಯೋದಕ್ಕೆ ಉಪಯೋಗಿಸ್ತೀವಲ್ಲ… ಪೆನ್ನು!', 'adē… bareyōdakke upayōgistīvalla… pennu! (that… what we use to write… pen!)'] },
  { id: 'thal', name: 'Subcortical (thalamic) aphasia', prof: [7, 6, 8, 4], les: ['thal', 'put'], terr: 'Thalamus / striatocapsular (small vessel, PCA or lenticulostriate)',
    feat: ['Fluctuating attention and word retrieval; semantic paraphasias', 'Repetition relatively preserved', 'Hypophonia; tendency to perseverate', 'Often recovers well'], en: '"I went to the… the market… no, the… hospital."', kn: null },
];
// ---------------------------------------------------------------- dysarthria (Mayo)
const DYS = [
  { id: 'flaccid', name: 'Flaccid dysarthria', site: 'Lower motor neuron: brainstem nuclei, cranial nerves, neuromuscular junction, muscle', les: ['nuclei', 'nerves'],
    feat: { resp: 'Short phrases, audible inspiration', phon: 'Breathy voice, reduced loudness', res: 'Hypernasality, nasal emission', art: 'Imprecise consonants (weakness)', pros: 'Monopitch, short phrases' },
    cause: 'Brainstem stroke, bulbar palsy, myasthenia gravis, Guillain–Barré, cranial nerve injury', ddk: { rate: 4.6, irreg: 0.05, amp: 0.55, trend: 0 } },
  { id: 'spastic', name: 'Spastic dysarthria', site: 'Bilateral upper motor neuron (corticobulbar tracts)', les: ['m1', 'm1R'], tract: 'both',
    feat: { resp: 'Short phrases', phon: 'Strained-strangled, harsh, low pitch', res: 'Hypernasality', art: 'Slow, imprecise consonants, distorted vowels', pros: 'Slow rate, excess and equal stress; pseudobulbar affect' },
    cause: 'Bilateral strokes, TBI, ALS (UMN component), MS, cerebral palsy', ddk: { rate: 3.4, irreg: 0.04, amp: 0.8, trend: 0 } },
  { id: 'ataxic', name: 'Ataxic dysarthria', site: 'Cerebellum and its connections', les: ['cb'],
    feat: { resp: 'Paradoxical breathing', phon: 'Harsh voice, loudness bursts', res: 'Usually normal', art: 'Irregular articulatory breakdowns, distorted vowels', pros: 'Excess and equal stress (scanning speech), prolonged phonemes' },
    cause: 'Cerebellar stroke, MS, spinocerebellar ataxias, alcohol, tumour', ddk: { rate: 3.8, irreg: 0.35, amp: 0.85, trend: 0 } },
  { id: 'hypok', name: 'Hypokinetic dysarthria', site: 'Basal ganglia control circuit (substantia nigra → putamen)', les: ['put', 'gp'],
    feat: { resp: 'Reduced vital capacity use', phon: 'Hypophonia, breathy-harsh voice', res: 'Mild hypernasality', art: 'Imprecise consonants, repeated phonemes (palilalia)', pros: 'Monopitch, monoloudness, short rushes of speech, variable or accelerating rate' },
    cause: "Parkinson's disease, parkinsonism (PSP, MSA)", ddk: { rate: 6, irreg: 0.08, amp: 0.7, trend: 1 } },
  { id: 'hyperk', name: 'Hyperkinetic dysarthria', site: 'Basal ganglia (caudate, putamen) — involuntary movements', les: ['caud', 'put'],
    feat: { resp: 'Sudden forced inspiration or expiration', phon: 'Voice arrests, strained voice (dystonia), tremor', res: 'Intermittent hypernasality', art: 'Irregular breakdowns, distorted vowels', pros: 'Variable rate, prolonged intervals, excess loudness variation' },
    cause: "Huntington's chorea, dystonia, spasmodic dysphonia, essential voice tremor, tics", ddk: { rate: 4.5, irreg: 0.28, amp: 0.8, trend: 0, bursts: 1 } },
  { id: 'uumn', name: 'Unilateral UMN dysarthria', site: 'Unilateral corticobulbar tract (lower face and tongue on the opposite side)', les: ['m1'], tract: 'left',
    feat: { resp: 'Usually normal', phon: 'Mild harshness', res: 'Usually normal', art: 'Imprecise consonants; contralateral lower-face and tongue weakness', pros: 'Slightly slow rate' },
    cause: 'Unilateral stroke (internal capsule, corona radiata), tumour', ddk: { rate: 5, irreg: 0.1, amp: 0.8, trend: 0 } },
  { id: 'mixed', name: 'Mixed flaccid–spastic (ALS)', site: 'Upper and lower motor neurons', les: ['m1', 'm1R', 'nuclei', 'nerves'], tract: 'both',
    feat: { resp: 'Reduced support, short phrases', phon: 'Strained and breathy', res: 'Severe hypernasality', art: 'Very imprecise, slow', pros: 'Slow, reduced stress' },
    cause: 'Amyotrophic lateral sclerosis; also MS (ataxic–spastic) and Wilson\'s disease', ddk: { rate: 2.8, irreg: 0.12, amp: 0.5, trend: 0 } },
];
// ---------------------------------------------------------------- cognitive-communication
const CCD = [
  { id: 'rhd', name: 'Right hemisphere damage', les: ['rPeri'], dom: [7, 3, 5, 3, 8, 8], feat: ['Left neglect in reading, writing and drawing', 'Aprosodia: flat expressive and poor receptive emotional prosody', 'Pragmatic deficits: literal interpretation, tangential discourse, poor inference and humour', 'Reduced awareness of deficits (anosognosia)'] },
  { id: 'tbi', name: 'Traumatic brain injury', les: ['orb', 'tp', 'mfg', 'cc'], dom: [8, 7, 8, 3, 7, 3], feat: ['Frontal and temporal contusions plus diffuse axonal injury (corpus callosum)', 'Attention, processing speed and memory deficits; post-traumatic amnesia', 'Executive dysfunction: planning, self-monitoring, disinhibition', 'Disorganised, tangential or impoverished discourse; social communication problems'] },
  { id: 'ad', name: "Alzheimer's disease", les: ['hip', 'ang', 'mtg'], dom: [5, 9, 6, 6, 4, 5], feat: ['Episodic memory first: medial temporal / hippocampal pathology', 'Word-finding and semantic decline; empty speech in later stages', 'Discourse cohesion breaks down; repetition and phonology preserved until late', 'Management: memory books, spaced retrieval, caregiver communication training'] },
  { id: 'nfvppa', name: 'Non-fluent / agrammatic PPA', les: ['broca', 'insula'], dom: [2, 2, 3, 8, 2, 1], feat: ['Effortful, halting speech with agrammatism', 'Apraxia of speech often present', 'Single-word comprehension and object knowledge spared', 'Atrophy: left posterior frontal and insula (tau pathology common)'] },
  { id: 'svppa', name: 'Semantic variant PPA', les: ['tp', 'itg'], dom: [2, 3, 2, 9, 3, 2], feat: ['Impaired naming and single-word comprehension; loss of object knowledge', 'Surface dyslexia/dysgraphia', 'Fluent, grammatical but empty speech', 'Atrophy: anterior temporal lobe, left more than right (TDP-43)'] },
  { id: 'lvppa', name: 'Logopenic variant PPA', les: ['ang', 'smg', 'stg'], dom: [3, 5, 3, 7, 2, 2], feat: ['Word-finding pauses; impaired repetition of sentences (phonological store)', 'Phonological paraphasias', 'Single-word comprehension spared', 'Atrophy: left temporoparietal junction; usually Alzheimer pathology'] },
];
const DOMAINS = ['Attention', 'Memory', 'Executive', 'Language', 'Pragmatics', 'Visuospatial'];

const S = { aph: 'broca', dys: 'flaccid', ccd: 'rhd' };
let net, comp, arcuate, ventral, cbTracts, cbLoop, bgLoop, mats = new Map();

const CAM_L = [V(265, 75, 55), V(15, 42, -12)];
const CAM_DEEP = [V(190, 150, 150), V(10, 38, -8)];
const lab = createLab({
  models: [{ url: '../lab3d/models/brain.glb', regroup: (n, g) => (g === 'cortex' ? (n.endsWith('.l') ? 'cortexL' : 'cortexR') : g) }],
  state: S,
  groups: {
    skin: { make: () => shellMat(0x7fa6c4, 2.0), op: [0.3, 0.1, 0.1, 0.1, 0.1, 0.12, 0.1, 0.1] },
    cortexL: { make: () => std(0xb3a4d8, { roughness: 0.55, emissive: 0x000000 }), op: [0.9, 0.35, 0.55, 0.45, 0.92, 0.3, 0.85, 0.7] },
    cortexR: { make: () => std(0xa597cc, { roughness: 0.55, emissive: 0x000000 }), op: [0.35, 0.12, 0.2, 0.3, 0.18, 0.3, 0.2, 0.55] },
    deep: { make: () => std(0x7fc4d8, { emissive: 0x000000, roughness: 0.4 }), op: [0.6, 0.95, 0.6, 1, 0.8, 1, 0.6, 0.9] },
    cerebellum: { make: () => std(0xd6b27a, { emissive: 0x000000, roughness: 0.5 }), op: [0.8, 0.95, 0.3, 0.5, 0.4, 1, 0.5, 0.4] },
    brainstem: { make: () => shellMat(0xd79dab, 1.7), op: [0.5, 0.8, 0.3, 0.3, 0.3, 0.9, 0.4, 0.3] },
    nucleus: { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3 }), op: [0.8, 1, 0.3, 0.2, 0.3, 1, 0.5, 0.2] },
    nerve: { make: () => std(0xe2b84d, { emissive: 0x3a2800 }), op: [0.4, 0.8, 0.1, 0.1, 0.1, 0.9, 0.3, 0.1] },
  },
  chapters: [
    { k: 'Overview', nav: 'Overview', t: 'A network, not a single "speech centre"', sig: CSS.violet, cam: [V(250, 110, 170), V(10, 40, -10)], tour: 10,
      body: () => `<p>Speech, language and cognition depend on distributed networks. In most people the language network is <b>left-lateralised</b> (≈ 95 % of right-handers, ≈ 70 % of left-handers): the frontal regions around Broca's area, the temporal and parietal regions around Wernicke's area, and the white-matter tracts between them.</p>
        <p>These interact with motor loops (basal ganglia and cerebellum) and cognitive networks (attention, memory, executive control). Step through the networks, then use the explorers to see how a lesion in each place changes communication.</p>`,
      facts: () => [['≈ 95 %', 'left-hemisphere language in right-handers'], ['2 streams', 'dorsal (sound → articulation) and ventral (sound → meaning)']] },
    { k: 'Speech production', nav: 'Speech motor network', t: 'From intention to articulation', sig: CSS.neural, cam: [V(240, 90, 110), V(15, 30, -5)], tour: 14,
      body: () => `<p>Planning of speech sounds happens in left <b>ventral premotor cortex / Broca's area</b> (speech sound maps). The supplementary motor area starts utterances, and the <b>ventral precentral gyrus</b> sends motor commands down the corticobulbar tract to the brainstem nuclei of V, VII, X and XII.</p>
        <p>Two loops tune the movement: the <b>basal ganglia</b> (putamen → pallidum → thalamus) select and scale movements, and the <b>cerebellum</b> times and coordinates them. <b>Auditory</b> (superior temporal) and <b>somatosensory</b> (supramarginal) feedback correct errors, as in the DIVA model (Guenther).</p>`,
      facts: () => [['vPMC / IFG', 'speech sound maps'], ['corticobulbar', 'mostly bilateral to the brainstem']] },
    { k: 'Language', nav: 'Dual streams', t: 'Comprehension: dorsal and ventral streams', sig: CSS.air, cam: CAM_L, tour: 14,
      body: () => `<p>Heard speech reaches <b>Heschl's gyrus</b> (A1), then the superior temporal gyrus and sulcus for phonological analysis. From there, two streams (Hickok & Poeppel):</p>
        <p>The <b style="color:${CSS.air}">ventral stream</b> (middle and inferior temporal gyrus → anterior temporal lobe, via the extreme capsule and uncinate) maps sound to <b>meaning</b>, and is largely bilateral. The <b style="color:${CSS.mech}">dorsal stream</b> (planum temporale / area Spt → supramarginal → <b>arcuate fasciculus</b> → Broca) maps sound to <b>articulation</b>. It supports repetition, phonological working memory and learning new words, and is left-dominant.</p>`,
      facts: () => [['arcuate', 'dorsal: repetition'], ['extreme capsule / uncinate', 'ventral: semantics']] },
    { k: 'Cognition', nav: 'Cognitive networks', t: 'Attention, memory and executive control', sig: CSS.ok, cam: CAM_DEEP, tour: 12,
      body: () => `<p><b>Episodic memory</b> depends on the hippocampus and medial temporal lobe. <b>Working memory</b> and <b>executive functions</b> (planning, inhibition, flexibility) depend on dorsolateral prefrontal (middle frontal gyrus) and parietal cortex. <b>Attention</b> relies on frontoparietal networks, with the right hemisphere dominant for spatial attention.</p>
        <p>The orbitofrontal cortex and anterior temporal lobes support social cognition and pragmatics. Damage to these networks causes <b>cognitive-communication</b> disorders even when core language is intact.</p>`,
      facts: () => [['hippocampus', 'episodic memory'], ['DLPFC', 'working memory · executive']] },
    { k: 'Aphasia', nav: 'Aphasia explorer', t: () => apa().name, sig: CSS.bad, cam: CAM_L, tour: 18, sel: 'aph',
      body: () => { const a = apa(); return `<p>${a.feat.map((f) => `• ${f}`).join('<br>')}</p><p class="note">Lesion: ${a.terr}.</p><div class="sample"><b>Sample</b><p>${a.en}</p>${a.kn ? `<p class="kn">${a.kn[0]}</p><p class="note">${a.kn[1]}</p>` : ''}</div>`; } },
    { k: 'Dysarthria', nav: 'Dysarthria explorer', t: () => dys().name, sig: CSS.mech, cam: [V(230, 60, 150), V(10, 20, -15)], tour: 18, sel: 'dys',
      body: () => { const d = dys(); return `<p><b>Lesion:</b> ${d.site}.</p><dl class="kv">${[['Respiration', d.feat.resp], ['Phonation', d.feat.phon], ['Resonance', d.feat.res], ['Articulation', d.feat.art], ['Prosody', d.feat.pros]].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><p class="note">Typical causes: ${d.cause}. Classification: Darley, Aronson & Brown (Mayo).</p>`; } },
    { k: 'Motor planning', nav: 'Apraxia of speech', t: 'Apraxia of speech: a planning disorder', sig: CSS.violet, cam: CAM_L, tour: 14,
      body: () => `<p>Apraxia of speech (AOS) disrupts the <b>planning and programming</b> of speech movements, without weakness. Lesions involve left <b>posterior inferior frontal gyrus, anterior insula and ventral premotor cortex</b>. It usually co-occurs with Broca's aphasia, and in progressive AOS with nfvPPA.</p>
        <table class="dx"><thead><tr><th></th><th>AOS</th><th>Dysarthria</th><th>Aphasia</th></tr></thead><tbody>
        <tr><td>Level</td><td>motor planning</td><td>motor execution</td><td>language</td></tr>
        <tr><td>Errors</td><td>distortions, sound substitutions; variable</td><td>consistent distortions</td><td>paraphasias</td></tr>
        <tr><td>Groping</td><td>yes</td><td>no</td><td>no</td></tr>
        <tr><td>Prosody</td><td>slow, syllable segregation</td><td>by type</td><td>normal or agrammatic</td></tr>
        <tr><td>Automatic speech</td><td>better than volitional</td><td>same</td><td>better</td></tr></tbody></table>`,
      facts: () => [['insula · IFG · vPMC', 'lesion sites'], ['sound production treatment', 'integral stimulation, PROMPT, DTTC (childhood)']] },
    { k: 'Cognitive-communication', nav: 'RHD · TBI · dementia', t: () => ccd().name, sig: CSS.ok, cam: [V(0, 230, 190), V(0, 40, -10)], tour: 16, sel: 'ccd',
      body: () => { const c = ccd(); return `<p>${c.feat.map((f) => `• ${f}`).join('<br>')}</p>`; } },
  ],
  build, update, renderPanels, onChapter,
});
const apa = () => APHASIA.find((a) => a.id === S.aph); const dys = () => DYS.find((d) => d.id === S.dys); const ccd = () => CCD.find((c) => c.id === S.ccd);

// ---------------------------------------------------------------- build
function build(ctx) {
  const c = (n) => ctx.centre(n);
  const ctr = (arr) => arr.reduce((a, n) => a.add(c(n)), V(0, 0, 0)).divideScalar(arr.length);
  const P = {
    a1: c(G.a1[0]), stg: c(G.stg[0]).add(V(4, 0, -10)), spt: c(G.pt[0]).add(V(0, 4, -8)), smg: c(G.smg[0]), mtg: c(G.mtg[0]).add(V(4, 0, 6)), atl: c(G.tp[0]),
    ifgT: c(G.broca[1]), ifgO: c(G.broca[0]), vpmc: V(56, 74, 8), m1: V(55, 76, -8), sma: V(8, 102, 6), put: c(G.put[0]), gp: c(G.gp[0]), thal: c(G.thal[0]),
    cb: c(L('Posterior quadrangular lobule')), bs: c(L('Nucleus ambiguus')).add(V(0, 4, 2)), bsR: c(R('Nucleus ambiguus')).add(V(0, 4, 2)), mouth: V(0, -45, 88), s1: V(58, 72, -22),
  };
  ctx.W.P = P;
  // tracts
  const arcPts = [P.spt, V(52, 72, -52), V(46, 86, -32), V(43, 84, -8), V(45, 74, 12), P.ifgO];
  arcuate = tube(arcPts, 1.6, std(0xf3b64a, { emissive: 0xf3b64a, emissiveIntensity: 0.4, opacity: 0.85 }), 60, 10); ctx.scene.add(arcuate);
  ventral = tube([P.mtg, V(46, 30, 8), V(40, 38, 20), V(42, 48, 30), P.ifgT], 1.4, std(0x5fe3f2, { emissive: 0x5fe3f2, emissiveIntensity: 0.4, opacity: 0.85 }), 50, 10); ctx.scene.add(ventral);
  const cbMatF = () => std(0xff5c8a, { emissive: 0xff5c8a, emissiveIntensity: 0.35, opacity: 0.7 });
  cbTracts = new THREE.Group(); ctx.scene.add(cbTracts);
  cbTracts.add(tube([P.m1, V(30, 58, -8), V(18, 44, -6), V(8, 24, -8), V(6, 6, -12), P.bs], 1.1, cbMatF(), 50, 8)); // left corticobulbar
  cbTracts.add(tube([P.m1, V(30, 58, -8), V(18, 44, -6), V(8, 24, -8), V(2, 6, -12), P.bsR], 1.1, cbMatF(), 50, 8));
  const Rm1 = P.m1.clone().setX(-P.m1.x);
  cbTracts.add(tube([Rm1, V(-30, 58, -8), V(-18, 44, -6), V(-8, 24, -8), V(-6, 6, -12), P.bsR], 1.1, cbMatF(), 50, 8));
  cbTracts.add(tube([Rm1, V(-30, 58, -8), V(-18, 44, -6), V(-8, 24, -8), V(-2, 6, -12), P.bs], 1.1, cbMatF(), 50, 8));
  // networks
  net = createNetwork(ctx, [['sma', P.sma], ['ifg', P.ifgO], ['vpmc', P.vpmc], ['m1', P.m1], ['put', P.put], ['gp', P.gp], ['thal', P.thal], ['cb', P.cb], ['bs', P.bs], ['mouth', P.mouth], ['a1', P.a1], ['spt', P.spt], ['s1', P.s1]], [
    ['ifg', 'vpmc', 1], ['sma', 'm1', 1], ['vpmc', 'm1', 1], ['m1', 'bs', 0.6, [V(18, 44, -6), V(8, 22, -8)]], ['m1', 'put', 0.2], ['m1', 'cb', 0.2, [V(20, 30, -20)]],
    ['put', 'gp', 1], ['gp', 'thal', 1], ['thal', 'sma', 0.5], ['thal', 'm1', 0.5], ['cb', 'thal', 1, [V(12, 20, -30)]],
    ['bs', 'mouth', 1, [V(4, -20, 10), V(2, -40, 50)]], ['mouth', 'a1', 1, [V(40, -30, 60), V(62, 10, 20)]], ['a1', 'spt', 1], ['spt', 'vpmc', 1, arcPts.slice(1, -1)], ['s1', 'vpmc', 1],
  ], { speed: 55 });
  comp = createNetwork(ctx, [['a1', P.a1], ['stg', P.stg], ['spt', P.spt], ['smg', P.smg], ['mtg', P.mtg], ['atl', P.atl], ['ifgT', P.ifgT], ['ifgO', P.ifgO]], [
    ['a1', 'stg', 1], ['stg', 'mtg', 0.55], ['stg', 'spt', 0.45], ['mtg', 'atl', 0.5], ['mtg', 'ifgT', 0.5, [V(46, 30, 8), V(40, 38, 20), V(42, 48, 30)]], ['atl', 'ifgT', 1, [V(40, 38, 22)]],
    ['spt', 'smg', 1], ['smg', 'ifgO', 1, arcPts.slice(2, -1)],
  ], { speed: 45, color: COL.air });
  // labels
  const lab2 = (t, p, chs, color, when) => ctx.label(t, p, chs, { color, when });
  lab2("Broca's area (IFG)", P.ifgT.clone().add(V(6, -4, 6)), [0, 1, 2, 6], CSS.bad);
  lab2("Wernicke's area (pSTG)", P.stg.clone().add(V(6, -6, -8)), [0, 2], CSS.bad);
  lab2("Heschl's gyrus (A1)", P.a1.clone().add(V(10, 0, 0)), [1, 2], CSS.air);
  lab2('Ventral precentral (face M1)', P.m1.clone().add(V(6, 6, 0)), [1, 6], CSS.neural);
  lab2('SMA', P.sma.clone().add(V(0, 6, 0)), [1], CSS.neural);
  lab2('Putamen · pallidum', P.put.clone().add(V(0, 0, 10)), [1, 3], '#7fc4d8');
  lab2('Thalamus', P.thal, [1, 3], '#7fc4d8');
  lab2('Cerebellum', P.cb.clone().add(V(10, -8, -6)), [1], '#d6b27a');
  lab2('Brainstem nuclei V · VII · X · XII', P.bs.clone().add(V(0, -8, 4)), [1, 5], CSS.neural);
  lab2('Arcuate fasciculus (dorsal)', V(48, 88, -30), [2, 6], CSS.mech);
  lab2('Ventral stream', V(46, 32, 12), [2], CSS.air);
  lab2('Supramarginal gyrus', P.smg.clone().add(V(8, 6, 0)), [1, 2], CSS.violet);
  lab2('Middle temporal gyrus', P.mtg.clone().add(V(8, -6, 0)), [2], CSS.air);
  lab2('Anterior temporal lobe', P.atl.clone().add(V(8, -4, 4)), [2], CSS.air);
  lab2('Hippocampus', c(G.hip[0]).add(V(6, -2, 0)), [3], CSS.ok);
  lab2('DLPFC (middle frontal gyrus)', c(G.mfg[0]).add(V(8, 6, 10)), [3], CSS.ok);
  lab2('Parietal attention network', c(G.spl[0]).add(V(6, 8, 0)), [3], CSS.ok);
  lab2('Orbitofrontal cortex', c(G.orb[0]).add(V(6, -6, 10)), [3], CSS.ok);
  lab2('Insula', c(G.insula[0]).add(V(14, 0, 0)), [6], CSS.violet);
  lab2('Corticobulbar tracts', V(10, 30, -6), [5], CSS.neural, () => !!dys().tract);
  lab2('Lesion', () => lesionCentre(ctx), [4, 5, 7], RED);
}
function namesOf(keys) { return keys.flatMap((k) => G[k] || []); }
function lesionKeys(ctx) {
  const ch = ctx.S.ch;
  if (ch === 4) return apa().les; if (ch === 5) return dys().les; if (ch === 7) return ccd().les; if (ch === 6) return ['broca', 'insula'];
  return [];
}
function lesionCentre(ctx) { const ns = namesOf(lesionKeys(ctx)).filter((n) => ctx.byName[n]); if (!ns.length) return V(0, 0, 0); const v = V(0, 0, 0); ns.forEach((n) => v.add(ctx.centre(n))); return v.divideScalar(ns.length).add(V(14, 0, 0)); }

// ---------------------------------------------------------------- update
const HL = { 1: { broca: CSS.neural, m1: CSS.neural, put: '#7fc4d8', gp: '#7fc4d8', thal: '#7fc4d8', cb: '#d6b27a', smg: CSS.violet, pt: CSS.air, a1: CSS.air },
  2: { a1: CSS.air, stg: CSS.air, mtg: CSS.air, tp: CSS.air, pt: CSS.mech, smg: CSS.mech, broca: CSS.bad },
  3: { hip: CSS.ok, mfg: CSS.ok, spl: CSS.ok, orb: CSS.ok } };
function update(ctx, t, dt, rdt) {
  const ch = ctx.S.ch;
  // highlights
  const les = new Set(namesOf(lesionKeys(ctx)));
  const hl = HL[ch] || {};
  const hlNames = new Map(); for (const k in hl) for (const n of G[k] || []) hlNames.set(n, hl[k]);
  if (ch === 6) { for (const n of G.broca) hlNames.set(n, RED); for (const n of G.insula) hlNames.set(n, RED); }
  const pulse = 0.75 + 0.25 * Math.sin(t * 1.8);
  for (const [name, m] of Object.entries(ctx.byName)) {
    const mat = m.material; if (!mat.emissive) continue;
    let target = 0, colr = null;
    m.userData.base = m.userData.base || mat.color.clone();
    if (les.has(name)) { target = 0.55 + 0.45 * pulse; colr = '#ff3b30'; mat.color.set('#ff6a5a'); }
    else { mat.color.copy(m.userData.base); if (hlNames.has(name)) { target = 0.55; colr = hlNames.get(name); } }
    if (colr) mat.emissive.set(colr);
    mat.emissiveIntensity = lerp(mat.emissiveIntensity, target, Math.min(1, rdt * 5));
    if (les.has(name) && ch >= 4) { m.userData.lock = true; mat.opacity = lerp(mat.opacity, 1, rdt * 4); m.visible = true; mat.depthWrite = true; } else m.userData.lock = false;
  }
  // tracts
  arcuate.visible = [2, 6].includes(ch) || (ch === 4 && ['conduction', 'global'].includes(S.aph));
  arcuate.material.emissive.set(ch === 4 ? RED : CSS.mech);
  ventral.visible = ch === 2;
  cbTracts.visible = ch === 1 || (ch === 5 && !!dys().tract);
  cbTracts.children.forEach((m, i) => { const lesioned = ch === 5 && (dys().tract === 'both' || (dys().tract === 'left' && i < 2)); m.material = m.material; m.material.emissive.set(lesioned ? RED : CSS.neural); m.material.emissiveIntensity = lesioned ? 0.5 * pulse + 0.2 : 0.35; });
  // networks
  net.visible = ch === 1 || ch === 5 || ch === 0; comp.visible = ch === 2 || ch === 4;
  if (ctx.S.playing) {
    if (net.visible && Math.random() < dt * (ch === 0 ? 4 : 7)) net.spawn(Math.random() < 0.6 ? 'ifg' : 'sma');
    if (comp.visible && Math.random() < dt * 7) comp.spawn('a1', COL.air);
  }
  // lesion effects on flow
  const blockAt = (node) => {
    if (ch === 4) { const a = apa(); const map = { broca: ['ifgO', 'ifgT'], wernicke: ['stg', 'mtg'], conduction: ['smg', 'spt'], global: ['stg', 'ifgO', 'ifgT', 'smg'], tcm: [], tcs: ['atl', 'mtg'], mtc: ['atl'], anomic: ['atl'], thal: [] }[a.id] || []; return map.includes(node); }
    if (ch === 5) { const d = dys(); const map = { flaccid: ['mouth'], spastic: ['bs'], ataxic: ['thal'], hypok: ['thal'], hyperk: [], uumn: [], mixed: ['bs', 'mouth'] }[d.id] || []; return map.includes(node); }
    return false;
  };
  net.block = comp.block = (k) => k.u > 0.6 && blockAt(k.e.to) && Math.random() < 0.08;
  net.step(dt, rdt); comp.step(dt, rdt);
  if (!net.visible) net.clear(); if (!comp.visible) comp.clear();
  drawDDK(t);
}

// ---------------------------------------------------------------- panels
function renderPanels(ctx) {
  const ch = ctx.S.ch;
  const box = $('prof');
  if (ch === 4) { const a = apa(); box.innerHTML = `<div class="panel-head"><h3>Language profile (0–10)</h3><span class="chip-note">WAB-style</span></div><div class="bars">${['Fluency', 'Comprehension', 'Repetition', 'Naming'].map((k, i) => bar(k, a.prof[i], 10, a.prof[i] <= 4 ? CSS.bad : a.prof[i] <= 6 ? CSS.mech : CSS.ok)).join('')}</div>${tree(a)}`; }
  else if (ch === 7) { const c = ccd(); box.innerHTML = `<div class="panel-head"><h3>Domains affected (0–10)</h3></div><div class="bars">${DOMAINS.map((k, i) => bar(k, c.dom[i], 10, c.dom[i] >= 7 ? CSS.bad : c.dom[i] >= 4 ? CSS.mech : CSS.ok)).join('')}</div>`; }
  else if (ch === 5) { box.innerHTML = `<div class="panel-head"><h3>Mayo types at a glance</h3></div><dl class="kv">${DYS.map((d) => `<dt>${d.name.replace(' dysarthria', '')}</dt><dd>${d.site.split(' (')[0].split(':')[0]}</dd>`).join('')}</dl>`; }
  else box.innerHTML = `<div class="panel-head"><h3>Key</h3></div><dl class="kv"><dt style="color:${CSS.neural}">●</dt><dd>Speech motor network and corticobulbar output</dd><dt style="color:${CSS.air}">●</dt><dd>Auditory and ventral (meaning) stream</dd><dt style="color:${CSS.mech}">●</dt><dd>Dorsal stream / arcuate fasciculus</dd><dt style="color:${CSS.ok}">●</dt><dd>Cognitive networks</dd><dt style="color:${RED}">●</dt><dd>Lesion (explorers)</dd></dl>`;
  $('ddkBox').hidden = ch !== 5;
  // dock selector
  const sel = $('cond'), lbl = $('condLbl');
  const list = ch === 4 ? APHASIA : ch === 5 ? DYS : ch === 7 ? CCD : null;
  $('condRow').hidden = !list;
  if (list) { const key = ch === 4 ? 'aph' : ch === 5 ? 'dys' : 'ccd'; lbl.textContent = ch === 4 ? 'Aphasia' : ch === 5 ? 'Dysarthria' : 'Disorder'; sel.innerHTML = list.map((x) => `<option value="${x.id}" ${S[key] === x.id ? 'selected' : ''}>${x.name}</option>`).join(''); sel.dataset.key = key; }
}
function bar(k, v, max, c) { return `<div class="bar-row"><span>${k}</span><span class="b"><i style="width:${(v / max) * 100}%;background:${c}"></i></span><span class="v">${v}</span></div>`; }
function tree(a) {
  const [f, c, r] = a.prof; const flu = f >= 5, com = c >= 5, rep = r >= 5;
  return `<p class="note" style="margin-top:12px">Classification: ${flu ? 'fluent' : 'non-fluent'} → comprehension ${com ? 'good' : 'poor'} → repetition ${rep ? 'good' : 'poor'} → <b>${a.name}</b></p>`;
}
function drawDDK(t) {
  const cv = $('ddk'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv), d = dys().ddk;
  const T = 4, X = (s) => 6 + (s / T) * (w - 12), mid = h / 2;
  g.strokeStyle = 'rgba(150,185,215,.15)'; g.beginPath(); g.moveTo(6, mid); g.lineTo(w - 6, mid); g.stroke();
  // normal reference (6 syll/s) as faint ticks
  g.fillStyle = 'rgba(143,162,183,.3)'; for (let s = 0; s < T; s += 1 / 6.2) g.fillRect(X(s), h - 10, 1.5, 6);
  // syllable train
  let s = 0.1, i = 0; const rnd = (k) => Math.sin(k * 12.9898 + 78.233) * 43758.5453 % 1;
  g.fillStyle = CSS.mech;
  while (s < T) {
    const rate = d.rate * (d.trend ? 1 + 0.35 * (s / T) : 1);
    const amp = d.amp * (d.trend ? 1 - 0.45 * (s / T) : 1) * (1 - d.irreg * Math.abs(rnd(i))) * (d.bursts && Math.abs(rnd(i * 3)) > 0.8 ? 1.4 : 1);
    const hh = amp * (mid - 10), wdt = Math.max(3, (w / T) / rate * 0.55);
    g.globalAlpha = 0.9; g.fillRect(X(s), mid - hh, wdt, hh * 2);
    s += (1 / rate) * (1 + d.irreg * rnd(i + 7)) + (d.bursts && Math.abs(rnd(i * 5)) > 0.85 ? 0.35 : 0); i++;
  }
  g.globalAlpha = 1;
  const cur = (t % T); g.strokeStyle = 'rgba(255,92,138,.7)'; g.beginPath(); g.moveTo(X(cur), 4); g.lineTo(X(cur), h - 4); g.stroke();
  $('ddkNote').textContent = `≈ ${d.rate.toFixed(1)} syll/s${d.trend ? ', accelerating' : ''}${d.irreg > 0.2 ? ', irregular' : ''} · normal ≈ 6`;
}
function onChapter(ctx) { renderPanels(ctx); }
$('cond').addEventListener('change', (e) => { S[e.target.dataset.key] = e.target.value; lab.renderAll(); });
