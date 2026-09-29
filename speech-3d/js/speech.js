// Speech & Articulation 3D — English and standard Kannada phonetic repertoire on the real head model.
import { createLab, THREE, V, clamp, lerp, smooth, CSS, COL, std, solid, shellMat, canvasCtx, $ } from '../../lab3d/engine.js';
import { createOralRig, vowelPose, consonantPose, PLACE, PLACE_S } from '../../lab3d/oral.js';
PLACE.interdental = { 0: [91, -53], 1: [83, -48.5] }; PLACE_S.interdental = 0.8;

const CLIP = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.3)]; // keep the left half → midsagittal section seen from the right
const cut = (m) => { m.clippingPlanes = CLIP; m.side = THREE.DoubleSide; return m; };

// ---------------------------------------------------------------- phoneme data
const C = (id, sym, ipa, place, manner, voice, ex, o = {}) => ({ id, sym, ipa, place, manner, voice, ex, ...o });
const VW = (id, sym, ipa, h, b, round, ex, o = {}) => ({ id, sym, ipa, vowel: true, h, b, round, ex, ...o });
const KN = {
  groups: [
    ['Vowels · ಸ್ವರಗಳು', [
      VW('a', 'ಅ', 'ɐ', 0.35, 0.55, 0, ['ಅಮ್ಮ', 'amma', 'mother']), VW('aa', 'ಆ', 'aː', 0, 0.55, 0, ['ಆನೆ', 'āne', 'elephant'], { long: 1 }),
      VW('i', 'ಇ', 'i', 0.9, 0, 0, ['ಇಲಿ', 'ili', 'rat']), VW('ii', 'ಈ', 'iː', 1, 0, 0, ['ಈಜು', 'īju', 'swim'], { long: 1 }),
      VW('u', 'ಉ', 'u', 0.9, 1, 1, ['ಉಪ್ಪು', 'uppu', 'salt']), VW('uu', 'ಊ', 'uː', 1, 1, 1, ['ಊಟ', 'ūṭa', 'meal'], { long: 1 }),
      VW('ru', 'ಋ', 'ru', 0.85, 1, 1, ['ಋಷಿ', 'r̥ṣi', 'sage'], { trillOnset: 1, note: 'Pronounced [ru] in modern Kannada: a tap or trill followed by a rounded high back vowel.' }),
      VW('e', 'ಎ', 'e', 0.6, 0.05, 0, ['ಎಲೆ', 'ele', 'leaf']), VW('ee', 'ಏ', 'eː', 0.62, 0.05, 0, ['ಏಣಿ', 'ēṇi', 'ladder'], { long: 1 }),
      VW('ai', 'ಐ', 'ɐi', 0.35, 0.55, 0, ['ಐದು', 'aidu', 'five'], { to: [0.9, 0, 0] }),
      VW('o', 'ಒ', 'o', 0.55, 1, 1, ['ಒಲೆ', 'ole', 'stove']), VW('oo', 'ಓ', 'oː', 0.57, 1, 1, ['ಓದು', 'ōdu', 'read'], { long: 1 }),
      VW('au', 'ಔ', 'ɐu', 0.35, 0.55, 0, ['ಔಷಧ', 'auṣadha', 'medicine'], { to: [0.9, 1, 1] }),
    ]],
    ['Velar · ಕವರ್ಗ', [
      C('ka', 'ಕ', 'k', 'velar', 'stop', 'vl', ['ಕಮಲ', 'kamala', 'lotus']), C('kha', 'ಖ', 'kʰ', 'velar', 'stop', 'vl', ['ಖಡ್ಗ', 'khaḍga', 'sword'], { asp: 1 }),
      C('ga', 'ಗ', 'g', 'velar', 'stop', 'vd', ['ಗಡಿಯಾರ', 'gaḍiyāra', 'clock']), C('gha', 'ಘ', 'gʱ', 'velar', 'stop', 'vd', ['ಘಂಟೆ', 'ghaṇṭe', 'bell'], { asp: 1 }),
      C('nga', 'ಙ', 'ŋ', 'velar', 'nasal', 'vd', ['ಅಂಗ', 'aŋga', 'limb'], { note: 'Occurs before velars; usually written with anusvāra (ಂ).' })]],
    ['Palatal · ಚವರ್ಗ', [
      C('cha', 'ಚ', 'tʃ', 'palatal', 'affricate', 'vl', ['ಚಮಚ', 'camaca', 'spoon'], { note: 'Often transcribed /c/; realised as a palato-alveolar affricate.' }), C('chha', 'ಛ', 'tʃʰ', 'palatal', 'affricate', 'vl', ['ಛತ್ರಿ', 'chatri', 'umbrella'], { asp: 1 }),
      C('ja', 'ಜ', 'dʒ', 'palatal', 'affricate', 'vd', ['ಜೇನು', 'jēnu', 'honey']), C('jha', 'ಝ', 'dʒʱ', 'palatal', 'affricate', 'vd', ['ಝರಿ', 'jhari', 'stream'], { asp: 1 }),
      C('nya', 'ಞ', 'ɲ', 'palatal', 'nasal', 'vd', ['ಮಂಜು', 'mañju', 'mist'], { note: 'Before palatals; usually written with anusvāra.' })]],
    ['Retroflex · ಟವರ್ಗ', [
      C('Ta', 'ಟ', 'ʈ', 'retroflex', 'stop', 'vl', ['ಟಗರು', 'ṭagaru', 'ram']), C('Tha', 'ಠ', 'ʈʰ', 'retroflex', 'stop', 'vl', ['ಠೇವಣಿ', 'ṭhēvaṇi', 'deposit'], { asp: 1 }),
      C('Da', 'ಡ', 'ɖ', 'retroflex', 'stop', 'vd', ['ಡಬ್ಬ', 'ḍabba', 'box']), C('Dha', 'ಢ', 'ɖʱ', 'retroflex', 'stop', 'vd', ['ಢಕ್ಕೆ', 'ḍhakke', 'drum'], { asp: 1 }),
      C('Na', 'ಣ', 'ɳ', 'retroflex', 'nasal', 'vd', ['ಹಣ', 'haṇa', 'money'])]],
    ['Dental · ತವರ್ಗ', [
      C('ta', 'ತ', 't̪', 'dental', 'stop', 'vl', ['ತಲೆ', 'tale', 'head']), C('tha', 'ಥ', 't̪ʰ', 'dental', 'stop', 'vl', ['ರಥ', 'ratha', 'chariot'], { asp: 1 }),
      C('da', 'ದ', 'd̪', 'dental', 'stop', 'vd', ['ದಾರ', 'dāra', 'thread']), C('dha', 'ಧ', 'd̪ʱ', 'dental', 'stop', 'vd', ['ಧನ', 'dhana', 'wealth'], { asp: 1 }),
      C('na', 'ನ', 'n̪', 'dental', 'nasal', 'vd', ['ನಾಯಿ', 'nāyi', 'dog'])]],
    ['Labial · ಪವರ್ಗ', [
      C('pa', 'ಪ', 'p', 'bilabial', 'stop', 'vl', ['ಪಟ', 'paṭa', 'kite']), C('pha', 'ಫ', 'pʰ', 'bilabial', 'stop', 'vl', ['ಫಲ', 'phala', 'fruit'], { asp: 1 }),
      C('ba', 'ಬ', 'b', 'bilabial', 'stop', 'vd', ['ಬಾಳೆ', 'bāḷe', 'banana']), C('bha', 'ಭ', 'bʱ', 'bilabial', 'stop', 'vd', ['ಭಾರತ', 'bhārata', 'India'], { asp: 1 }),
      C('ma', 'ಮ', 'm', 'bilabial', 'nasal', 'vd', ['ಮನೆ', 'mane', 'house'])]],
    ['Avargīya · ಅವರ್ಗೀಯ', [
      C('ya', 'ಯ', 'j', 'palatal', 'approximant', 'vd', ['ಯಾರು', 'yāru', 'who']), C('ra', 'ರ', 'r', 'alveolar', 'trill', 'vd', ['ರಾಗಿ', 'rāgi', 'finger millet'], { note: 'A tap [ɾ] between vowels, a trill [r] when geminated or emphatic.' }),
      C('la', 'ಲ', 'l', 'alveolar_lat', 'lateral', 'vd', ['ಲೋಟ', 'lōṭa', 'tumbler'], { note: 'Dental–alveolar lateral; air escapes over the sides of the tongue.' }),
      C('va', 'ವ', 'ʋ', 'labiodental', 'approximant', 'vd', ['ವನ', 'vana', 'forest'], { note: 'Labiodental approximant; [w] after rounded vowels.' }),
      C('sha', 'ಶ', 'ʃ', 'postalveolar', 'fricative', 'vl', ['ಶಾಲೆ', 'śāle', 'school']), C('Sha', 'ಷ', 'ʂ', 'retroflex', 'fricative', 'vl', ['ಕೃಷಿ', 'kr̥ṣi', 'agriculture'], { note: 'Retroflex sibilant; many speakers merge it with ಶ [ʃ].' }),
      C('sa', 'ಸ', 's', 'alveolar', 'fricative', 'vl', ['ಸಂತೆ', 'sante', 'market']), C('ha', 'ಹ', 'h', 'glottal', 'fricative', 'vl', ['ಹಾಲು', 'hālu', 'milk'], { note: 'Often breathy-voiced [ɦ] between vowels.' }),
      C('La', 'ಳ', 'ɭ', 'retroflex', 'lateral', 'vd', ['ತಾಳ', 'tāḷa', 'rhythm'], { note: 'Retroflex lateral approximant, contrastive with ಲ: ಕಲ (kala) vs ಕಳ (kaḷa).' })]],
  ],
};
const EN = {
  groups: [
    ['Vowels', [
      VW('iy', 'ee', 'iː', 1, 0, 0, ['see']), VW('ih', 'i', 'ɪ', 0.78, 0.15, 0, ['sit']), VW('eh', 'e', 'e', 0.55, 0.05, 0, ['bed']), VW('ae', 'a', 'æ', 0.15, 0.1, 0, ['cat']),
      VW('uh', 'u', 'ʌ', 0.35, 0.55, 0, ['cup']), VW('aa', 'ar', 'ɑː', 0, 0.9, 0, ['car'], { long: 1 }), VW('oh', 'o', 'ɒ', 0.1, 1, 0.7, ['hot']), VW('ao', 'aw', 'ɔː', 0.4, 1, 1, ['saw'], { long: 1 }),
      VW('uu', 'oo', 'ʊ', 0.78, 0.85, 0.8, ['put']), VW('uw', 'oo', 'uː', 1, 1, 1, ['food'], { long: 1 }), VW('er', 'ir', 'ɜː', 0.5, 0.5, 0, ['bird'], { long: 1 }), VW('schwa', 'ə', 'ə', 0.45, 0.5, 0, ['about']),
      VW('ey', 'ay', 'eɪ', 0.55, 0.05, 0, ['day'], { to: [0.85, 0.1, 0] }), VW('ay', 'eye', 'aɪ', 0.05, 0.6, 0, ['my'], { to: [0.85, 0.1, 0] }), VW('oy', 'oy', 'ɔɪ', 0.4, 1, 1, ['boy'], { to: [0.85, 0.1, 0] }),
      VW('aw', 'ow', 'aʊ', 0.05, 0.6, 0, ['now'], { to: [0.85, 0.9, 1] }), VW('ow', 'oh', 'əʊ', 0.45, 0.5, 0, ['go'], { to: [0.85, 0.9, 1] }),
    ]],
    ['Stops', [C('p', 'p', 'p', 'bilabial', 'stop', 'vl', ['pin'], { asp: 1 }), C('b', 'b', 'b', 'bilabial', 'stop', 'vd', ['bin']), C('t', 't', 't', 'alveolar', 'stop', 'vl', ['tin'], { asp: 1 }), C('d', 'd', 'd', 'alveolar', 'stop', 'vd', ['din']), C('k', 'k', 'k', 'velar', 'stop', 'vl', ['kit'], { asp: 1 }), C('g', 'g', 'g', 'velar', 'stop', 'vd', ['get'])]],
    ['Fricatives & affricates', [
      C('f', 'f', 'f', 'labiodental', 'fricative', 'vl', ['fan']), C('v', 'v', 'v', 'labiodental', 'fricative', 'vd', ['van']), C('th', 'th', 'θ', 'interdental', 'fricative', 'vl', ['thin']), C('dh', 'th', 'ð', 'interdental', 'fricative', 'vd', ['this']),
      C('s', 's', 's', 'alveolar', 'fricative', 'vl', ['sun']), C('z', 'z', 'z', 'alveolar', 'fricative', 'vd', ['zoo']), C('sh', 'sh', 'ʃ', 'postalveolar', 'fricative', 'vl', ['shoe']), C('zh', 's', 'ʒ', 'postalveolar', 'fricative', 'vd', ['measure']),
      C('h', 'h', 'h', 'glottal', 'fricative', 'vl', ['hat']), C('ch', 'ch', 'tʃ', 'postalveolar', 'affricate', 'vl', ['chin']), C('jh', 'j', 'dʒ', 'postalveolar', 'affricate', 'vd', ['jam'])]],
    ['Nasals & approximants', [
      C('m', 'm', 'm', 'bilabial', 'nasal', 'vd', ['man']), C('n', 'n', 'n', 'alveolar', 'nasal', 'vd', ['net']), C('ng', 'ng', 'ŋ', 'velar', 'nasal', 'vd', ['sing']),
      C('l', 'l', 'l', 'alveolar_lat', 'lateral', 'vd', ['leg']), C('r', 'r', 'ɹ', 'postalveolar', 'approximant', 'vd', ['red'], { round: 1, note: 'Bunched or retroflex approximant; Indian English often uses a tap [ɾ].' }),
      C('w', 'w', 'w', 'velar', 'approximant', 'vd', ['wet'], { round: 1, note: 'Labial–velar: lip rounding plus a raised tongue back. Many Indian English speakers use [ʋ] for both v and w.' }),
      C('y', 'y', 'j', 'palatal', 'approximant', 'vd', ['yes'])]],
  ],
};
const ALL = { kn: KN, en: EN };
const PLACE_NAME = { bilabial: 'Bilabial', labiodental: 'Labiodental', interdental: 'Interdental', dental: 'Dental', alveolar: 'Alveolar', alveolar_lat: 'Alveolar', postalveolar: 'Postalveolar', retroflex: 'Retroflex', palatal: 'Palatal', velar: 'Velar', glottal: 'Glottal' };
const findPh = (lang, id) => { for (const [, arr] of ALL[lang].groups) for (const p of arr) if (p.id === id) return p; return null; };

// ---------------------------------------------------------------- clinical error pairs
const ERRORS = [
  { id: 'fronting', name: 'Velar fronting', tgt: ['en', 'k'], err: ['en', 't'], txt: 'The tongue tip replaces the tongue back: /k/ → [t], "key" → "tea". Typical up to about age 3½; persisting fronting is a phonological disorder.' },
  { id: 'stopping', name: 'Stopping', tgt: ['en', 's'], err: ['en', 't'], txt: 'A fricative becomes a stop at the same place: /s/ → [t], "sun" → "tun". The tongue makes full closure instead of a narrow groove.' },
  { id: 'gliding', name: 'Gliding', tgt: ['en', 'r'], err: ['en', 'w'], txt: 'Liquids become glides: /r/ → [w], "red" → "wed". Lip rounding replaces tongue shaping.' },
  { id: 'interdental', name: 'Interdental lisp', tgt: ['en', 's'], err: ['en', 'th'], txt: 'The tongue tip protrudes between the teeth: /s/ → [θ]. It often co-occurs with an anterior open bite or tongue-thrust swallow.' },
  { id: 'lateral', name: 'Lateral lisp', tgt: ['en', 's'], err: ['en', 'l'], txt: 'Air escapes over the sides of the tongue instead of down a central groove: /s/ → [ɬ]. It is never developmental, so it always warrants treatment.' },
  { id: 'retro', name: 'Retroflex → dental (Kannada)', tgt: ['kn', 'Ta'], err: ['kn', 'ta'], txt: 'The tongue tip stays behind the upper teeth instead of curling back: ಟ → ತ. Retroflexes are acquired late in Kannada-speaking children, and this substitution is common in delayed phonology.' },
  { id: 'La', name: 'ಳ → ಲ (Kannada)', tgt: ['kn', 'La'], err: ['kn', 'la'], txt: 'The retroflex lateral is replaced by the dental lateral: ಬಾಳೆ → ಬಾಲೆ. It is among the last Kannada sounds acquired.' },
  { id: 'glottal', name: 'Cleft: glottal stop for /k/', tgt: ['kn', 'ka'], err: ['glottal', null], txt: 'Compensatory articulation in cleft palate / VPI: with no oral pressure available, the child stops the air at the glottis. It needs articulation therapy even after palate repair.' },
  { id: 'vpi', name: 'Cleft: nasal emission (VPI)', tgt: ['kn', 'pa'], err: ['vpi', null], txt: 'Velopharyngeal insufficiency: the velum cannot close the port, so pressure consonants leak air through the nose (nasal emission) and vowels sound hypernasal.' },
];

// ---------------------------------------------------------------- lab
const S = { lang: 'kn', ph: 'ka', err: 'fronting', showErr: false, word: 0 };
const WORDS = [
  { lang: 'kn', text: 'ಬಾಳೆ', tr: 'bāḷe · banana', seq: ['ba', 'aa', 'La', 'ee'] },
  { lang: 'kn', text: 'ಮನೆ', tr: 'mane · house', seq: ['ma', 'a', 'na', 'e'] },
  { lang: 'kn', text: 'ಘಂಟೆ', tr: 'ghaṇṭe · bell', seq: ['gha', 'a', 'Na', 'Ta', 'e'] },
  { lang: 'kn', text: 'ಕೃಷಿ', tr: 'kr̥ṣi · agriculture', seq: ['ka', 'ru', 'Sha', 'i'] },
  { lang: 'en', text: 'speech', tr: '/spiːtʃ/', seq: ['s', 'p', 'iy', 'ch'] },
  { lang: 'en', text: 'thank you', tr: '/θæŋk juː/', seq: ['th', 'ae', 'ng', 'k', 'y', 'uw'] },
];
const OP = (a) => a;
const lab = createLab({
  models: [{ url: '../lab3d/models/head.glb' }],
  state: S,
  groups: {
    skin: { make: () => shellMat(0x7fa6c4, 2.0), op: OP([0.35, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.14]) },
    auricle: { make: () => std(0xd49a86), op: OP([0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]) },
    bone: { make: () => cut(std(0xe9dfc6, { roughness: 0.6 })), op: OP([0.5, 0.55, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6]) },
    teeth: { make: () => cut(solid(0xfbf8ef, { roughness: 0.3, transparent: true })), op: OP([1, 1, 1, 1, 1, 1, 1, 1, 1]) },
    tongue: { make: () => std(0xcf6f78), op: OP([0, 0, 0, 0, 0, 0, 0, 0, 0]) },
    tonguem: { make: () => std(0xb85c64), op: OP([0, 0, 0, 0, 0, 0, 0, 0, 0]) },
    lips: { make: () => std(0xd07a80), op: OP([0, 0, 0, 0, 0, 0, 0, 0, 0]) },
    palate: { make: () => std(0xd98a8f), op: OP([0, 0, 0, 0, 0, 0, 0, 0, 0]) },
    airway: { make: () => cut(std(0xe7a9ad, { opacity: 0, roughness: 0.7, depthWrite: false })), op: OP([0.12, 0.25, 0.35, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3]) },
    constrictor: { make: () => cut(std(0xc9828a, { roughness: 0.6, depthWrite: false })), op: OP([0.2, 0.3, 0.3, 0.25, 0.25, 0.25, 0.25, 0.25, 0.3]) },
    larynx: { make: () => cut(std(0xcfe0ea, { roughness: 0.4 })), op: OP([0.6, 0.8, 0.5, 0.5, 0.5, 0.5, 0.6, 0.5, 0.5]) },
    oesophagus: { make: () => std(0xd9a0a0), op: OP([0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]) },
    nerve: { make: () => std(0xe2b84d), op: OP([0, 0, 0, 0, 0, 0, 0, 0, 0]) },
    brainstem: { make: () => shellMat(0xd79dab, 1.7), op: OP([0.25, 0, 0, 0, 0, 0, 0, 0, 0]) },
    nucleus: { make: () => std(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3 }), op: OP([0.8, 0, 0, 0, 0, 0, 0, 0, 0]) },
    cortex: { make: () => shellMat(0x9b90d6, 1.8), op: OP([0.18, 0, 0, 0, 0, 0, 0, 0, 0]) },
    cerebellum: { make: () => shellMat(0x9b90d6, 1.8), op: OP([0.12, 0, 0, 0, 0, 0, 0, 0, 0]) },
  },
  chapters: [
    { k: 'Overview', nav: 'Overview', t: 'Four subsystems make every sound', sig: CSS.air, cam: [V(-230, 10, 170), V(0, -45, 30)], tour: 10,
      body: () => `<p>Speech needs <b style="color:${CSS.air}">respiration</b> (subglottal pressure of about 5–10 cm H₂O), <b style="color:${CSS.mech}">phonation</b> (vocal folds vibrating), <b style="color:${CSS.violet}">resonance</b> (the velum opening or closing the nose), and <b style="color:${CSS.neural}">articulation</b> (tongue, lips and jaw shaping the tract).</p>
        <p>The model is a midsagittal section of a real head. Pick any English or Kannada sound in the panel and watch the articulators move, the air flow, the glottis, the palate contact pattern and the voice-onset timing.</p>`,
      facts: () => [['4', 'subsystems: respiration, phonation, resonance, articulation'], ['≈ 14', 'syllables per second at the fastest diadochokinetic rates']] },
    { k: 'Phonation', nav: 'Voicing & VOT', t: 'Voicing, aspiration and voice-onset time', sig: CSS.mech, cam: [V(-250, -74, 66), V(0, -80, 58)], tour: 14, ph: ['kn', 'kha'],
      body: () => `<p>The glottis view (top right of the neck) shows the vocal folds from above. <b>Voiceless</b> sounds abduct the folds, <b>voiced</b> sounds bring them together to vibrate, and <b>aspiration</b> is a delay in closing the folds after the release of a stop.</p>
        <p>Kannada contrasts four stop types at each place, as in ಕ ಖ ಗ ಘ: voiceless unaspirated (short lag, about +10–25 ms), voiceless aspirated (long lag, about +60–90 ms), voiced (voicing lead, about −60 to −100 ms), and breathy-voiced (voicing lead plus murmur after release). English word-initial /p t k/ are aspirated, while /b d g/ are mostly short-lag.</p>`,
      facts: () => [['+60–90 ms', 'aspirated VOT'], ['−60 to −100 ms', 'Kannada voiced prevoicing']] },
    { k: 'Resonance', nav: 'Oral vs nasal', t: 'The velopharyngeal port', sig: CSS.violet, cam: [V(-240, -26, 58), V(0, -32, 52)], tour: 12, ph: ['kn', 'ma'],
      body: () => `<p>For oral sounds, the levator veli palatini lifts the velum against the posterior pharyngeal wall and closes the nose. For ಮ ನ ಣ ಙ ಞ the velum lowers and air (violet) exits through the nose.</p>
        <p>In cleft palate or velopharyngeal insufficiency the port cannot close. The result is hypernasal vowels, nasal emission on pressure consonants, and weak oral pressure; see the clinical chapter.</p>`,
      facts: () => [['levator veli', 'main velar elevator (CN X, pharyngeal plexus)'], ['VPI', 'hypernasality + nasal emission']] },
    { k: 'Vowels', nav: 'Vowels', t: 'Vowels: tongue height, backness and lip rounding', sig: CSS.air, cam: [V(-235, -46, 58), V(0, -50, 55)], tour: 12, ph: ['kn', 'i'],
      body: () => `<p>Vowels have no constriction narrow enough to create noise. Their quality comes from the <b>height</b> and <b>front–back position</b> of the tongue body and the <b>rounding</b> of the lips, which set the first two formants (F1 falls as the tongue rises; F2 falls as it moves back).</p>
        <p>Kannada has five vowel qualities, each short and long (ಇ/ಈ, ಎ/ಏ …), plus the diphthongs ಐ and ಔ. English uses more qualities and tense–lax pairs. The chart in the panel plots the selected language.</p>`,
      facts: () => [['F1 ↔ height', 'open vowels have high F1'], ['F2 ↔ backness', 'front vowels have high F2']] },
    { k: 'Consonants', nav: 'Phoneme explorer', t: (c) => { const p = cur(); return p ? `${p.sym} [${p.ipa}]: ${p.vowel ? 'vowel' : describe(p)}` : 'Phoneme explorer'; }, sig: CSS.neural, cam: [V(-235, -46, 58), V(0, -50, 55)], tour: 16,
      body: (c) => phBody(), facts: () => phFacts() },
    { k: 'Kannada contrasts', nav: 'Retroflex vs dental', t: 'Retroflex against dental', sig: CSS.neural, cam: [V(-195, -42, 64), V(0, -44, 62)], tour: 16, ph: ['kn', 'Ta'],
      body: () => `<p>Indian languages contrast <b>dental</b> sounds (tongue tip on the back of the upper teeth: ತ ದ ನ ಲ) with <b>retroflex</b> sounds (tip curled up and back to the front of the hard palate, contacting with its underside: ಟ ಡ ಣ ಳ ಷ).</p>
        <p>Toggle between the pairs below and compare the tongue tip and the palatogram. Retroflex contact sits further back and is narrower, while dental contact is at the very front. English /t d n l/ are alveolar, between the two, and Indian English often uses retroflex [ʈ ɖ].</p>`,
      sub: () => `<div class="sub">${[['ta', 'ತ'], ['Ta', 'ಟ'], ['na', 'ನ'], ['Na', 'ಣ'], ['la', 'ಲ'], ['La', 'ಳ'], ['sa', 'ಸ'], ['sha', 'ಶ'], ['Sha', 'ಷ']].map(([id, s]) => `<button type="button" data-act="ph" data-v="kn:${id}" aria-pressed="${S.lang === 'kn' && S.ph === id}" class="kn">${s}</button>`).join('')}</div>` },
    { k: 'Connected speech', nav: 'Words', t: 'Coarticulation in words', sig: CSS.air, cam: [V(-235, -46, 58), V(0, -50, 55)], tour: 16,
      body: () => { const w = WORDS[S.word]; return `<p>In running speech each articulator starts moving toward the next target before the current one is finished. In <span class="kn">${w.text}</span> (${w.tr}), watch the lips, tongue and velum overlap from one sound to the next.</p><p>This coarticulation is why a sound is never produced exactly the same way twice, and why therapy targets move from isolation to syllables, words and sentences.</p>`; },
      sub: () => `<div class="sub">${WORDS.map((w, i) => `<button type="button" data-act="word" data-v="${i}" aria-pressed="${S.word === i}" class="${w.lang === 'kn' ? 'kn' : ''}">${w.text}</button>`).join('')}</div>` },
    { k: 'Clinical', nav: 'Articulation errors', t: (c) => ERRORS.find((e) => e.id === S.err).name, sig: CSS.bad, cam: [V(-235, -46, 58), V(0, -50, 55)], tour: 16,
      body: () => { const e = ERRORS.find((x) => x.id === S.err); return `<p>${e.txt}</p><p class="note">Showing <b>${S.showErr ? 'the error' : 'the target'}</b>. Use the buttons to compare.</p>`; },
      sub: () => `<div class="sub">${ERRORS.map((e) => `<button type="button" data-act="err" data-v="${e.id}" aria-pressed="${S.err === e.id}">${e.name}</button>`).join('')}</div><div class="sub"><button type="button" data-act="errshow" data-v="0" aria-pressed="${!S.showErr}">Target</button><button type="button" data-act="errshow" data-v="1" aria-pressed="${S.showErr}">Error</button></div>` },
    { k: 'Summary', nav: 'Place & manner map', t: 'Where and how', sig: CSS.air, cam: [V(-210, -40, 70), V(0, -50, 45)], tour: 12,
      body: () => `<p><b>Place</b> runs from the lips to the glottis: bilabial, labiodental, dental, alveolar, postalveolar, retroflex, palatal, velar, glottal. <b>Manner</b> is the degree of closure: stop, fricative, affricate, nasal, lateral, trill or tap, approximant. <b>Voicing</b> and, in Kannada, <b>aspiration</b> complete each description.</p>
        <p>Recordings: each sound has a slot for your own audio, e.g. <code>speech-3d/audio/kn/ka.mp3</code>. Add the files to the repository and the Play button appears automatically.</p>` },
  ],
  build,
  update,
  renderPanels,
  onChapter,
  onAction,
});

function cur() { return findPh(S.lang, S.ph); }
function describe(p) { return `${p.voice === 'vd' ? 'voiced' : 'voiceless'}${p.asp ? (p.voice === 'vd' ? ' breathy (aspirated)' : ' aspirated') : ''} ${PLACE_NAME[p.place].toLowerCase()} ${p.manner}`; }
function phBody() {
  const p = cur(); if (!p) return '';
  const ex = p.ex ? (S.lang === 'kn' ? `<p><span class="kn" style="font-size:20px">${p.ex[0]}</span> · <i>${p.ex[1]}</i> · ‘${p.ex[2]}’</p>` : `<p>Example: <b>${p.ex[0]}</b></p>`) : '';
  let how = '';
  if (p.vowel) how = `${p.h > 0.7 ? 'High' : p.h > 0.3 ? 'Mid' : 'Low'} ${p.b > 0.7 ? 'back' : p.b > 0.3 ? 'central' : 'front'} ${p.round ? 'rounded' : 'unrounded'} vowel${p.long ? ', long' : ''}${p.to ? ' (diphthong: the tongue glides to a second target)' : ''}.`;
  else how = articText(p);
  return `${ex}<p>${how}</p>${p.note ? `<p class="note">${p.note}</p>` : ''}<div class="audio-row"><button class="btn" type="button" data-act="play" id="playRec" disabled>Play recording</button><span class="note" id="recNote" style="margin:0">Checking for a recording…</span></div>`;
}
function articText(p) {
  const where = { bilabial: 'Both lips close', labiodental: 'The lower lip touches the upper incisors', interdental: 'The tongue tip rests between the teeth', dental: 'The tongue tip touches the back of the upper incisors', alveolar: 'The tongue tip or blade meets the alveolar ridge', alveolar_lat: 'The tongue tip meets the alveolar ridge while the sides stay low', postalveolar: 'The tongue blade rises just behind the alveolar ridge', retroflex: 'The tongue tip curls up and back to the front of the hard palate', palatal: 'The tongue front rises to the hard palate', velar: 'The tongue back rises to the soft palate', glottal: 'The vocal folds themselves are the articulator' }[p.place];
  const how = { stop: 'forming a complete closure; pressure builds, then releases as a burst', affricate: 'forming a closure that releases slowly into friction', fricative: 'leaving a narrow channel where air becomes turbulent', nasal: 'forming an oral closure while the velum lowers so air flows through the nose', lateral: 'blocking the midline while air flows over one or both sides', trill: 'while the tip vibrates against the ridge (a single tap between vowels)', approximant: 'narrowing the tract without creating turbulence' }[p.manner];
  return `${where}, ${how}. ${p.voice === 'vd' ? 'The vocal folds vibrate' : 'The vocal folds are apart'}${p.asp ? (p.voice === 'vd' ? ' with breathy murmur after the release' : ', and stay apart after the release (aspiration)') : ''}${p.place !== 'glottal' && p.manner !== 'nasal' ? '; the velum is raised.' : '.'}`;
}
function phFacts() { const p = cur(); if (!p) return []; return p.vowel ? [[`[${p.ipa}]`, 'IPA'], [p.long ? 'long' : 'short', 'length'], [p.round ? 'rounded' : 'unrounded', 'lips']] : [[`[${p.ipa}]`, 'IPA'], [PLACE_NAME[p.place], 'place'], [p.manner, 'manner'], [p.voice === 'vd' ? 'voiced' : 'voiceless', 'voicing']]; }

// ---------------------------------------------------------------- build
let R;
function build(ctx) {
  R = createOralRig(ctx, { clip: CLIP });
  ctx.W.rig = R;
  const L = (t, p, chs, c) => ctx.label(t, p, chs, { color: c });
  const all = [1, 2, 3, 4, 5, 6, 7, 8];
  L('Upper lip · lips', V(0, -44, 101), all, CSS.bad);
  L('Alveolar ridge', V(0, -40, 83), [4, 5, 8], '#ffe0b0');
  L('Hard palate', V(0, -29, 68), [2, 3, 4, 5, 8], '#ffe0b0');
  L('Velum (soft palate)', () => V(0, -28 + 4 * R.cur.velum, 38), [2, 4, 8], CSS.violet);
  L('Tongue', () => V(0, -43, 52), [3, 4, 8], '#e79aa0');
  L('Tongue tip', () => V(0, R.cur.U[0][1] + 1, R.cur.U[0][0] + 2), [5], '#e79aa0');
  L('Nasal cavity', V(0, -8, 75), [2, 8], CSS.violet);
  L('Pharynx', V(0, -60, 12), [0, 2, 8], CSS.fluid);
  L('Larynx', V(0, -95, 30), [0, 1, 8], '#cfe0ea');
  L('Glottis (view from above)', () => R.glot.g.position.clone().add(V(0, 13, 0)), [0, 1, 4, 5], CSS.mech);
  L('Jaw (mandible)', V(0, -80, 70), [3, 8], '#e9dfc6');
  L('Brainstem motor nuclei (V, VII, IX–XII)', V(0, 2, -20), [0], CSS.neural);
}

// ---------------------------------------------------------------- animation of a phoneme / word
let cycle = 0, lastKey = '';
function poseOf(p, stage) {
  if (!p) return vowelPose(0.45, 0.5, 0);
  if (p.vowel) {
    if (p.to && stage > 0.5) return vowelPose(p.to[0], p.to[1], p.to[2]);
    const v = vowelPose(p.h, p.b, p.round);
    if (p.trillOnset && stage < 0.3) return consonantPose({ place: 'alveolar', manner: 'trill', ipa: 'r', lang: 'kn' });
    return v;
  }
  return consonantPose({ ...p, lang: S.lang });
}
function playing() {
  if (lab.S.ch === 6) { const w = WORDS[S.word]; return { word: w }; }
  if (lab.S.ch === 7) { const e = ERRORS.find((x) => x.id === S.err); if (S.showErr) return { err: e.err, tgt: e.tgt }; return { ph: e.tgt }; }
  return { ph: [S.lang, S.ph] };
}
let flowState = { kind: 'vowel', s: 0.9, closed: false, voiced: true, glot: 'voiced', phase: '' };
function update(ctx, t, dt) {
  const P = playing();
  const key = JSON.stringify(P);
  if (key !== lastKey) { cycle = 0; lastKey = key; }
  cycle += dt;
  let target, spec, gl = 'voiced', flow = { kind: 'vowel', s: 0.95, closed: false };
  if (P.word) {
    const seq = P.word.seq, per = 0.42, total = seq.length * per + 0.9, c = cycle % total, i = Math.floor(c / per);
    const lang = P.word.lang;
    if (i < seq.length) { spec = findPh(lang, seq[i]); target = poseOf(spec, (c % per) / per); ctx.W.wordIdx = i; }
    else { target = vowelPose(0.45, 0.5, 0); spec = null; ctx.W.wordIdx = -1; gl = 'open'; flow.kind = 'silent'; }
    R.rate = 16;
    if (spec) ({ gl, flow } = gestureFlow(spec, 0.6));
  } else {
    let ph = P.ph;
    let special = null;
    if (P.err) { if (P.err[0] === 'glottal' || P.err[0] === 'vpi') { special = P.err[0]; ph = P.tgt; } else ph = P.err; }
    spec = findPh(ph[0], ph[1]);
    const T = 2.6, c = cycle % T;
    // 0–0.45 neutral → 0.45–1.7 target (stops: closure then release at 1.25) → 1.7–2.6 vowel [a]
    R.rate = 9;
    if (c < 0.45) { target = vowelPose(0.3, 0.55, 0); gl = 'voiced'; flow = { kind: 'vowel', s: 0.95, closed: false }; }
    else if (c < 1.7) { target = poseOf(spec, (c - 0.45) / 1.25); ({ gl, flow } = gestureFlow(spec, (c - 0.45) / 1.25)); }
    else { target = spec && spec.vowel ? poseOf(spec, 1) : vowelPose(0.1, 0.55, 0); gl = spec && spec.asp && c < 1.95 ? (spec.voice === 'vd' ? 'breathy' : 'voiceless') : 'voiced'; flow = { kind: 'vowel', s: 0.95, closed: false }; }
    if (special === 'glottal' && c >= 0.45 && c < 1.7) { target = vowelPose(0.3, 0.55, 0); gl = (c - 0.45) / 1.25 < 0.6 ? 'closed' : 'voiceless'; flow = { kind: 'stop', s: 0.05, closed: (c - 0.45) / 1.25 < 0.6 }; }
    if (special === 'vpi') { target = { ...target, velum: 0.35 }; if (flow.kind !== 'silent') flow = { ...flow, kind: 'nasalised' }; }
    ctx.W.cyclePh = c / T;
  }
  R.set(target);
  R.update(dt);
  R.flow.kind = flow.kind; R.flow.s = flow.s; R.flow.closed = flow.closed; if (flow.burst) R.flow.burst = 1;
  R.updateAir(dt);
  R.glot.update(dt, gl);
  R.contactGlow = lerp(R.contactGlow, flow.closed ? 0.35 : flow.kind === 'fricative' ? 0.15 : 0, Math.min(1, dt * 6));
  flowState = { ...flow, glot: gl };
  // panels
  drawPalato(spec); drawVOT(spec); drawVowels(spec);
  if (ctx.S.ch === 6 && ctx.W.wordIdx !== ctx.W.lastWordIdx) { ctx.W.lastWordIdx = ctx.W.wordIdx; const spans = document.querySelectorAll('#wordSeq span'); spans.forEach((s, i) => s.classList.toggle('on', i === ctx.W.wordIdx)); }
}
let prevStage = 0;
function gestureFlow(p, st) {
  if (!p || p.vowel) return { gl: 'voiced', flow: { kind: 'vowel', s: 0.95, closed: false } };
  const s = PLACE_S[p.place] ?? 0.7;
  const vd = p.voice === 'vd';
  let flow = { kind: 'approx', s, closed: false }, gl = vd ? 'voiced' : 'voiceless';
  if (p.manner === 'stop' || p.manner === 'affricate') {
    const closed = st < 0.64;
    flow = { kind: closed ? 'stop' : p.manner === 'affricate' ? 'fricative' : 'vowel', s, closed, burst: !closed && prevStage < 0.64 };
    if (!closed && p.asp) gl = vd ? 'breathy' : 'voiceless';
    else if (!closed && !vd) gl = st < 0.72 ? 'voiceless' : 'voiced';
    if (closed) gl = vd ? 'voiced' : 'voiceless';
  } else if (p.manner === 'fricative') flow = { kind: p.place === 'glottal' ? 'vowel' : 'fricative', s, closed: false };
  else if (p.manner === 'nasal') flow = { kind: 'nasal', s, closed: true };
  else if (p.manner === 'lateral') flow = { kind: 'lateral', s, closed: false };
  else if (p.manner === 'trill') flow = { kind: 'vowel', s, closed: false };
  prevStage = st;
  return { gl, flow };
}

// ---------------------------------------------------------------- panels
function renderPanels(ctx) {
  const sets = ALL[S.lang].groups;
  $('tabsLang').innerHTML = [['kn', 'ಕನ್ನಡ Kannada'], ['en', 'English']].map(([k, l]) => `<button type="button" data-act="lang" data-v="${k}" aria-pressed="${S.lang === k}" class="${k === 'kn' ? 'kn' : ''}">${l}</button>`).join('');
  $('phGrid').innerHTML = sets.map(([g, arr]) => `<div class="grp">${g}</div>` + arr.map((p) => `<button type="button" data-act="ph" data-v="${S.lang}:${p.id}" aria-pressed="${p.id === S.ph}"><b class="${S.lang === 'kn' ? 'kn' : ''}">${p.sym}</b><span>${p.ipa}</span></button>`).join('')).join('');
  const w = WORDS[S.word];
  $('wordBox').hidden = ctx.S.ch !== 6;
  if (ctx.S.ch === 6) $('wordSeq').innerHTML = w.seq.map((id) => { const p = findPh(w.lang, id); return `<span class="${w.lang === 'kn' ? 'kn' : ''}">${p.sym}<small>[${p.ipa}]</small></span>`; }).join('');
  checkAudio();
}
function onChapter(ctx, c) {
  if (c.ph) { S.lang = c.ph[0]; S.ph = c.ph[1]; }
}
function onAction(ctx, act, v) {
  if (act === 'lang') { S.lang = v; const first = ALL[v].groups[1][1][0]; S.ph = first.id; if (ctx.S.ch !== 4 && ctx.S.ch !== 3) ctx.setChapter(4); else ctx.renderAll(); return; }
  if (act === 'ph') { const [l, id] = v.split(':'); S.lang = l; S.ph = id; const p = cur(); if (![3, 4, 5, 1, 2].includes(ctx.S.ch)) ctx.setChapter(p.vowel ? 3 : 4); else ctx.renderAll(); return; }
  if (act === 'word') { S.word = +v; ctx.renderAll(); return; }
  if (act === 'err') { S.err = v; S.showErr = false; ctx.renderAll(); return; }
  if (act === 'errshow') { S.showErr = v === '1'; ctx.renderAll(); return; }
  if (act === 'play') { if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); } }
}
let audio = null, audioKey = '';
function checkAudio() {
  const btn = $('playRec'), note = $('recNote'); if (!btn) return;
  const key = `${S.lang}/${S.ph}`;
  if (key === audioKey && audio) { btn.disabled = !audio.ok; note.textContent = audio.ok ? 'Recording available' : `No recording yet · add audio/${key}.mp3`; return; }
  audioKey = key; audio = new Audio(`./audio/${key}.mp3`); audio.ok = false; audio.preload = 'auto';
  btn.disabled = true; note.textContent = 'Checking for a recording…';
  audio.addEventListener('canplaythrough', () => { audio.ok = true; if ($('playRec')) { $('playRec').disabled = false; $('recNote').textContent = 'Recording available'; } }, { once: true });
  audio.addEventListener('error', () => { if ($('recNote')) $('recNote').textContent = `No recording yet · add audio/${key}.mp3`; }, { once: true });
}

// palatogram (EPG-style, 8 rows front→back)
function contacts(p) {
  const g = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const lat = (r0, r1, cols = [0, 7]) => { for (let r = r0; r <= r1; r++) for (const c of cols) g[r][c] = 1; };
  const full = (r0, r1, c0 = 0, c1 = 7) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = 1; };
  if (!p) return g;
  if (p.vowel) { if (p.h > 0.6 && p.b < 0.4) lat(2, 7, [0, 1, 6, 7]); else if (p.h > 0.6) lat(5, 7, [0, 7]); return g; }
  const stop = ['stop', 'nasal', 'affricate'].includes(p.manner);
  switch (p.place) {
    case 'dental': if (stop) { full(0, 0); lat(1, 6, [0, 7]); } else if (p.manner === 'lateral') full(0, 0, 2, 5); else { full(0, 0, 0, 2); full(0, 0, 5, 7); lat(1, 6); } break;
    case 'interdental': lat(2, 6, [0, 7]); break;
    case 'alveolar': if (stop) { full(0, 1); lat(2, 7, [0, 7]); lat(2, 5, [1, 6]); } else if (p.manner === 'trill') full(1, 1, 2, 5); else { full(0, 1, 0, 2); full(0, 1, 5, 7); lat(2, 7, [0, 1, 6, 7]); } break;
    case 'alveolar_lat': full(0, 1, 2, 5); break;
    case 'postalveolar': if (stop) { full(1, 3); lat(4, 7, [0, 7]); } else if (p.manner === 'approximant') lat(2, 6, [0, 1, 6, 7]); else { full(1, 3, 0, 1); full(1, 3, 6, 7); lat(4, 7, [0, 7]); } break;
    case 'retroflex': if (stop) { full(2, 3, 1, 6); lat(4, 7, [0, 7]); } else if (p.manner === 'lateral') full(2, 3, 2, 5); else { full(2, 3, 1, 2); full(2, 3, 5, 6); lat(4, 7, [0, 7]); } break;
    case 'palatal': if (stop) { full(3, 5); lat(1, 7, [0, 1, 6, 7]); } else lat(1, 7, [0, 1, 6, 7]); break;
    case 'velar': if (stop) { full(7, 7); lat(5, 6, [0, 7]); } else lat(6, 7, [0, 7]); break;
    default: break;
  }
  return g;
}
function drawPalato(p) {
  const cv = $('palato'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv), G = contacts(p);
  const cx = w / 2, top = 14, rows = 8, rh = (h - 30) / rows;
  g.strokeStyle = 'rgba(150,185,215,.25)'; g.lineWidth = 1.5; g.beginPath();
  g.moveTo(cx - 78, h - 10); g.bezierCurveTo(cx - 90, top + 10, cx - 50, top - 6, cx, top - 6); g.bezierCurveTo(cx + 50, top - 6, cx + 90, top + 10, cx + 78, h - 10); g.stroke();
  g.fillStyle = '#5d6f83'; g.font = '10px "JetBrains Mono",monospace'; g.textAlign = 'left'; g.fillText('front', 6, top + 6); g.fillText('back', 6, h - 12);
  const active = flowState.closed || flowState.kind === 'fricative' || flowState.kind === 'lateral' || flowState.kind === 'nasal' || (p && p.vowel);
  for (let r = 0; r < rows; r++) {
    const span = 46 + r * 4.5;
    for (let c = 0; c < 8; c++) {
      const x = cx - span + (c + 0.5) * ((2 * span) / 8), y = top + 6 + (r + 0.5) * rh;
      g.beginPath(); g.arc(x, y, 5, 0, 7);
      g.fillStyle = G[r][c] && active ? CSS.neural : 'rgba(150,185,215,.12)'; g.fill();
    }
  }
}
function drawVOT(p) {
  const cv = $('vot'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv);
  g.font = '10px "JetBrains Mono",monospace';
  if (!p || p.vowel || !['stop', 'affricate'].includes(p.manner)) { g.fillStyle = CSS.dim; g.textAlign = 'center'; g.fillText('VOT applies to stops and affricates', w / 2, h / 2); return; }
  const X = (ms) => 20 + ((ms + 120) / 300) * (w - 30);
  const rel = X(0);
  const vot = p.voice === 'vd' ? (S.lang === 'kn' ? -90 : 10) : p.asp ? 75 : 15;
  const yV = 20, yA = 44, yL = 68;
  g.strokeStyle = 'rgba(150,185,215,.25)'; g.beginPath(); g.moveTo(rel, 10); g.lineTo(rel, h - 16); g.stroke();
  g.fillStyle = CSS.dim; g.textAlign = 'center'; g.fillText('release', rel, h - 4);
  for (const ms of [-100, 100]) g.fillText((ms > 0 ? '+' : '') + ms + ' ms', X(ms), h - 4);
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(X(-120), yL - 6, rel - X(-120), 12); g.fillStyle = CSS.muted; g.textAlign = 'left'; g.fillText('closure', X(-118), yL + 3);
  // voicing
  const vStart = vot < 0 ? X(vot) : X(vot), vEnd = X(180);
  g.strokeStyle = CSS.mech; g.lineWidth = 1.5; g.beginPath();
  for (let x = vStart; x < vEnd; x += 1) { const y = yV + Math.sin((x - vStart) * 0.6) * 5; x === vStart ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke(); g.fillStyle = CSS.mech; g.fillText('voicing', 4, yV + 3);
  // aspiration / murmur
  if (p.asp) { g.fillStyle = p.voice === 'vd' ? 'rgba(169,135,238,.6)' : 'rgba(255,255,255,.35)'; for (let x = rel; x < X(p.voice === 'vd' ? 60 : vot); x += 2) g.fillRect(x, yA - 4 + Math.random() * 8, 1.5, 1.5); g.fillStyle = CSS.violet; g.fillText(p.voice === 'vd' ? 'murmur' : 'aspiration', 4, yA + 3); }
  g.fillStyle = CSS.ink; g.textAlign = 'right'; g.fillText(`VOT ≈ ${vot > 0 ? '+' : ''}${vot} ms`, w - 6, yA + 3);
  // cursor
  const c = lab.W.cyclePh ?? 0, ms = (c * 2.6 - 1.25) * 300; if (ms > -120 && ms < 180) { g.strokeStyle = 'rgba(255,92,138,.6)'; g.beginPath(); g.moveTo(X(ms), 8); g.lineTo(X(ms), h - 16); g.stroke(); }
}
function drawVowels(p) {
  const cv = $('vch'); if (!cv || !cv.offsetParent) return;
  const { g, w, h } = canvasCtx(cv);
  const X = (b, hgt) => 30 + b * (w - 60) - (1 - hgt) * 0 + (1 - hgt) * (b < 0.5 ? 26 : 8), Y = (hgt) => 12 + (1 - hgt) * (h - 30);
  g.strokeStyle = 'rgba(150,185,215,.25)'; g.beginPath(); g.moveTo(X(0, 1), Y(1)); g.lineTo(X(1, 1), Y(1)); g.lineTo(X(1, 0), Y(0)); g.lineTo(X(0, 0), Y(0)); g.closePath(); g.stroke();
  g.font = '10px "JetBrains Mono",monospace'; g.fillStyle = CSS.dim; g.textAlign = 'center'; g.fillText('front', X(0, 0), h - 3); g.fillText('back', X(1, 0), h - 3);
  const vs = ALL[S.lang].groups[0][1];
  for (const v of vs) {
    if (v.to) continue;
    const on = p && p.id === v.id; const x = X(v.b, v.h), y = Y(v.h);
    g.fillStyle = on ? CSS.air : 'rgba(233,239,246,.75)'; g.font = `${on ? '600 15px' : '13px'} ${S.lang === 'kn' ? '"Noto Sans Kannada"' : '"Instrument Sans"'},sans-serif`;
    g.fillText(S.lang === 'kn' ? v.sym : v.ipa, x, y + 4);
    if (on) { g.strokeStyle = CSS.air; g.beginPath(); g.arc(x, y, 12, 0, 7); g.stroke(); }
  }
  if (p && p.vowel && p.to) { g.strokeStyle = CSS.air; g.lineWidth = 2; g.beginPath(); g.moveTo(X(p.b, p.h), Y(p.h)); g.lineTo(X(p.to[1], p.to[0]), Y(p.to[0])); g.stroke(); }
}
