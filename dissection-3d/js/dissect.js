// Dissection 3D: layer-by-layer dissection of the larynx, oral cavity & pharynx, ear & temporal bone and brain,
// with tap-to-name, isolate / hide, peel slider and spotter test (from the shared lab tools).
import { createLab, THREE, V, CSS, COL, std, solid, shellMat, tube, $ } from '../../lab3d/engine.js';

const R = new URLSearchParams(location.search).get('r') || 'larynx';
const M = (hex, o) => () => std(hex, { roughness: 0.45, ...o });
const SH = (hex, p = 2.2) => () => shellMat(hex, p);
const muscle = 0xc9646e, nerveC = 0xe2b84d, boneC = 0xe8dcc0, cart = 0xbfe3ee;

const REGIONS = {
  larynx: {
    title: 'Larynx & Neck Dissection', sub: 'Cartilages, intrinsic and extrinsic muscles, nerves and the pharynx, layer by layer',
    model: 'models/larynx.glb',
    groups: { skin: SH(0x7fa6c4), superficial: M(0xb55a5f), strap: M(0xd9727a), suprahyoid: M(0xe07d6a), cartilage: M(cart, { roughness: 0.3 }), hyoid: M(boneC), membrane: M(0xe8f0f4, { opacity: 0.8 }),
      intrinsic: M(0xff6b7d, { emissive: 0x3a0a10 }), pharynx: M(0xc98a8a), gland: M(0xd9a441), nerve: M(nerveC, { emissive: 0x3a2800 }), vessel: M(0xd8485a), bone: M(boneC) },
    chapters: [
      { k: 'Overview', t: 'The larynx in the neck', cam: [V(-190, -60, 200), V(0, -100, 15)],
        vis: { skin: 0.18, superficial: 0.35, strap: 0.5, suprahyoid: 0.6, cartilage: 1, hyoid: 1, membrane: 0.6, intrinsic: 0.8, pharynx: 0.35, nerve: 0.8, vessel: 0.5, bone: 0.5 },
        body: '<p>The larynx sits at C3–C6, suspended from the <b>hyoid</b> and continuous with the <b>trachea</b>. It has three jobs: <b>airway protection</b> (the most primitive), <b>respiration</b> and <b>phonation</b>. Use <b>Dissect</b> to peel the layers, tap any structure for its name and function, then try the <b>Spotter test</b>.</p>',
        facts: [['C3 · C4–5 · C6', 'hyoid · thyroid · cricoid levels'], ['9', 'cartilages: 3 single, 3 paired']] },
      { k: 'Superficial', t: 'Superficial layer: platysma, SCM and vessels', cam: [V(-210, -70, 150), V(-10, -110, 10)],
        vis: { skin: 0.12, superficial: 1, strap: 0.4, suprahyoid: 0.5, cartilage: 0.5, hyoid: 0.6, vessel: 1, nerve: 0.8, bone: 0.4 },
        body: '<p><b>Platysma</b> lies just under the skin. <b>Sternocleidomastoid</b> (XI) divides the neck into anterior and posterior triangles and covers the <b>carotid sheath</b> (common carotid artery, internal jugular vein, vagus nerve). These are the landmarks for neck dissection in head and neck cancer, which can leave fibrosis and lymphoedema that affect swallowing and voice.</p>' },
      { k: 'Extrinsic', t: 'Extrinsic muscles: moving the larynx', cam: [V(-190, -70, 170), V(0, -100, 20)],
        vis: { skin: 0.06, strap: 1, suprahyoid: 1, cartilage: 0.8, hyoid: 1, membrane: 0.5, pharynx: 0.25, bone: 0.5 },
        body: '<p><b>Suprahyoid</b> muscles (mylohyoid, geniohyoid, anterior and posterior digastric, stylohyoid) pull the hyoid <b>up and forward</b>: the hyolaryngeal excursion that tips the epiglottis and opens the UES in swallowing. <b>Infrahyoid (strap)</b> muscles (sternohyoid, sternothyroid, thyrohyoid, omohyoid) depress and stabilise it.</p><p class="note">Clinical link: Shaker head lift and chin-tuck-against-resistance target the suprahyoids; reduced excursion → vallecular and pyriform residue.</p>' },
      { k: 'Framework', t: 'Cartilages, hyoid and membranes', cam: [V(-120, -80, 140), V(0, -100, 15)],
        vis: { cartilage: 1, hyoid: 1, membrane: 0.85, pharynx: 0.1, bone: 0.35 },
        body: '<p>Single cartilages: <b>thyroid</b> (shield), <b>cricoid</b> (complete ring, foundation), <b>epiglottis</b>. Paired: <b>arytenoids</b> (vocal process for the vocal ligament, muscular process for PCA/LCA), <b>corniculates</b>, <b>cuneiforms</b>. The <b>thyrohyoid membrane</b> suspends the larynx; the <b>cricothyroid membrane</b> continues upward as the conus elasticus and vocal ligament; the <b>quadrangular membrane</b> forms the aryepiglottic and false folds.</p>',
        facts: [['Cricothyroid joint', 'pitch: tilting lengthens the folds'], ['Cricoarytenoid joint', 'rocking and gliding: open / close']] },
      { k: 'Intrinsic', t: 'Intrinsic muscles: opening, closing, tensing', cam: [V(-80, -80, -130), V(0, -106, 10)],
        vis: { cartilage: 0.45, hyoid: 0.4, membrane: 0.2, intrinsic: 1, nerve: 0.7 },
        body: '<ul class="mg"><li><b>Posterior cricoarytenoid</b>: the only <b>abductor</b> (breathing).</li><li><b>Lateral cricoarytenoid</b> and <b>interarytenoids</b> (transverse, oblique): <b>adductors</b>.</li><li><b>Thyroarytenoid</b> (with vocalis): shortens and thickens the folds, lowers pitch.</li><li><b>Cricothyroid</b>: lengthens and tenses, raises pitch (external SLN).</li><li>All others: <b>recurrent laryngeal nerve</b>.</li></ul><p class="note">This view is from behind so the PCA is visible. Rotate to see the cricothyroid from the front.</p>' },
      { k: 'Pharynx', t: 'Pharynx, UES and oesophagus', cam: [V(-160, -110, -150), V(0, -110, 5)],
        vis: { cartilage: 0.6, hyoid: 0.6, pharynx: 0.95, intrinsic: 0.3, bone: 0.5, suprahyoid: 0.2 },
        body: '<p>The <b>superior, middle and inferior constrictors</b> overlap like stacked cups and squeeze the bolus downward. The lowest part of the inferior constrictor, <b>cricopharyngeus</b>, is the <b>upper oesophageal sphincter</b>, attached to the cricoid. The <b>pyriform sinuses</b> lie either side of the larynx, the <b>valleculae</b> between tongue base and epiglottis: the two main residue sites on VFSS and FEES.</p>' },
      { k: 'Nerves', t: 'Nerves and vessels of the larynx', cam: [V(-200, -130, 150), V(-5, -140, 5)],
        vis: { cartilage: 0.6, hyoid: 0.6, nerve: 1, vessel: 0.7, pharynx: 0.2, intrinsic: 0.5, bone: 0.35 },
        body: '<p>The <b>vagus (X)</b> descends in the carotid sheath. The <b>superior laryngeal nerve</b> splits into an <b>internal branch</b> (pierces the thyrohyoid membrane: sensation above the folds) and an <b>external branch</b> (cricothyroid). The <b>recurrent laryngeal nerve</b> loops under the subclavian (right) or aortic arch (left) and ascends in the tracheo-oesophageal groove. The left RLN is longer and more often injured (thyroid and cardiac surgery, lung tumours) → unilateral fold paralysis, breathy voice, aspiration risk.</p><p class="note">The yellow SLN and RLN paths are schematic; the vagus, carotids and jugular veins are real meshes.</p>' },
    ],
    extra(ctx) { // schematic SLN and RLN on both sides
      const m = std(nerveC, { emissive: 0x5a4000, emissiveIntensity: 0.5 });
      for (const sx of [-1, 1]) {
        const x = (v) => v * sx;
        const sln = tube([V(x(28), -55, -5), V(x(24), -72, 6), V(x(19), -84, 18)], 0.55, m); // internal branch
        const ext = tube([V(x(24), -72, 6), V(x(17), -100, 20), V(x(11), -116, 20)], 0.4, m);
        const rln = tube([V(x(30), sx < 0 ? -205 : -240, sx < 0 ? 2 : -10), V(x(16), -185, -2), V(x(12), -150, -4), V(x(10), -126, -1), V(x(8), -114, 2)], 0.55, m);
        for (const t of [sln, ext, rln]) { t.userData.schematic = true; ctx.scene.add(t); ctx.W.schem.push(t); }
      }
    },
    extraVisible: [6],
    labels: [['Thyroid cartilage', [1, 3, 5, 6]], ['Cricoid cartilage', [3, 5]], ['Epiglottis', [0, 3, 5]], ['Hyoid bone', [0, 2, 3, 6]], ['Arytenoid cartilage.r', [3, 4]], ['Posterior crico-arytenoid muscle.r', [4]], ['Lateral crico-arytenoid muscle.r', [4]], ['Transverse arytenoid muscle', [4]], ['Straight part of cricothyroid muscle.r', [4]],
      ['Geniohyoid muscle.r', [2]], ['Sternohyoid muscle.r', [2]], ['Thyrohyoid muscle.r', [2]], ['Posterior belly of digastric muscle.r', [2]], ['Sternocleidomastoid muscle.r', [1]], ['Platysma.r', [1]], ['Internal jugular vein.r', [1, 6]], ['Right common carotid artery', [1, 6]], ['Vagus nerve (X).r', [6]],
      ['Inferior pharyngeal constrictor.r', [5]], ['Middle pharyngeal constrictor.r', [5]], ['Oesophagus', [5]], ['Trachea', [0, 5]], ['Median thyrohyoid ligament', [3]]],
  },
  oral: {
    title: 'Oral Cavity & Pharynx Dissection', sub: 'Lips, cheeks, jaw, tongue, palate, glands, teeth and nerves for speech and swallowing',
    model: 'models/oral.glb',
    groups: { skin: SH(0x7fa6c4), facial: M(0xc75d68), mastication: M(0xa84a55), tmj: M(0xe8f0f4), gland: M(0xe8c07a), tongue: M(0xe07a82), tonguem: M(0xd06070), floor: M(0xd9727a), palate: M(0xf09aa4),
      pharynx: M(0xc98a8a), teeth: M(0xfbf6ea, { roughness: 0.25 }), bone: M(boneC), nerve: M(nerveC, { emissive: 0x3a2800 }), vessel: M(0xd8485a) },
    chapters: [
      { k: 'Overview', t: 'The oral mechanism', cam: [V(-230, -10, 150), V(0, -40, 45)],
        vis: { skin: 0.18, facial: 0.7, mastication: 0.5, gland: 0.6, tongue: 0.9, tonguem: 0.6, floor: 0.6, palate: 0.9, pharynx: 0.4, teeth: 1, bone: 0.45, nerve: 0.8, vessel: 0.5 },
        body: '<p>Everything an SLP examines in an <b>oral peripheral mechanism examination</b>: lips, cheeks, jaw, teeth, tongue, hard and soft palate, fauces and pharynx, with their cranial nerves (V, VII, IX, X, XII). Peel the layers with <b>Dissect</b>, tap to name, and test yourself with the <b>Spotter</b>.</p>',
        facts: [['5 cranial nerves', 'V, VII, IX, X, XII'], ['OPME', 'structure at rest, then function']] },
      { k: 'Face', t: 'Lips and facial muscles (VII)', cam: [V(-150, -30, 190), V(0, -45, 70)],
        vis: { skin: 0.1, facial: 1, teeth: 0.7, bone: 0.5, gland: 0.5, mastication: 0.3 },
        body: '<p><b>Orbicularis oris</b> closes and rounds the lips (/p b m w/, oral seal). <b>Zygomaticus, risorius, levator labii</b> and <b>levator anguli oris</b> spread and raise; <b>depressor anguli oris</b> and <b>mentalis</b> lower and protrude. All are supplied by the <b>facial nerve</b>. A <b>UMN</b> (central) lesion weakens the lower face only; a <b>LMN</b> (Bell\'s palsy) lesion weakens the whole side, including the forehead.</p>' },
      { k: 'Jaw', t: 'Jaw: mastication and TMJ (V3)', cam: [V(-220, 10, 90), V(-20, -30, 30)],
        vis: { skin: 0.05, mastication: 1, tmj: 1, bone: 0.8, teeth: 0.8, gland: 0.2 },
        body: '<p><b>Masseter, temporalis</b> and <b>medial pterygoid</b> close the jaw; <b>lateral pterygoid</b> protrudes and opens it (with the digastric and mylohyoid). All are supplied by the <b>mandibular nerve (V3)</b>. The <b>TMJ</b> hinges then glides forward on its disc. Jaw stability underlies graded tongue and lip movement (jaw grading in motor speech therapy); TMJ disorders can modulate tinnitus.</p>' },
      { k: 'Tongue', t: 'Tongue and floor of mouth (XII)', cam: [V(-190, -40, 110), V(0, -60, 50)],
        vis: { tongue: 0.55, tonguem: 1, floor: 1, bone: 0.5, teeth: 0.6, palate: 0.4, pharynx: 0.2 },
        body: '<p><b>Intrinsic</b> muscles (longitudinal, transverse, vertical) shape the tongue; <b>extrinsic</b> muscles move it: <b>genioglossus</b> (protrudes), <b>hyoglossus</b> (retracts, depresses), styloglossus (retracts, elevates), palatoglossus (X). All but palatoglossus are supplied by the <b>hypoglossal nerve</b>. The <b>mylohyoid</b> sling and <b>geniohyoid</b> form the floor of the mouth and elevate the hyoid in the swallow.</p><p class="note">LMN XII lesion: atrophy and fasciculations, tongue deviates to the weak side on protrusion.</p>' },
      { k: 'Palate', t: 'Palate, fauces and pharynx', cam: [V(-175, -25, 95), V(0, -42, 35)],
        vis: { palate: 1, tongue: 0.35, pharynx: 0.85, bone: 0.15, teeth: 0.2, floor: 0.2 },
        body: '<p>The <b>soft palate (velum)</b> elevates against the posterior pharyngeal wall for velopharyngeal closure (levator veli palatini, pharyngeal plexus X). The <b>palatoglossus</b> and <b>palatopharyngeus</b> form the anterior and posterior faucial pillars. The <b>superior constrictor</b> contributes Passavant\'s ridge. Velopharyngeal dysfunction → hypernasality, nasal emission and nasal regurgitation; cleft palate and submucous cleft are the classic causes.</p>' },
      { k: 'Glands', t: 'Salivary glands', cam: [V(-210, -20, 110), V(-20, -50, 40)],
        vis: { skin: 0.08, gland: 1, bone: 0.6, mastication: 0.3, teeth: 0.5, nerve: 0.5 },
        body: '<p><b>Parotid</b> (serous, IX via otic ganglion; the facial nerve runs through it; Stensen\'s duct opens opposite the upper second molar), <b>submandibular</b> (mixed, most resting saliva, VII) and <b>sublingual</b> (mucous, VII). Radiotherapy for head and neck cancer reduces saliva (<b>xerostomia</b>): slower oral transit, residue, dental decay and taste change.</p>' },
      { k: 'Teeth', t: 'Teeth and bony framework', cam: [V(-130, -30, 200), V(0, -45, 60)],
        vis: { teeth: 1, bone: 0.9, tmj: 0.5, palate: 0.3 },
        body: '<p>Upper incisors are the articulatory contact for <b>labiodental</b> (/f v/) and <b>dental</b> sounds; the alveolar ridge behind them is the target for /t d n s z l/. <b>Malocclusion</b> (open bite, Class III) and missing incisors can distort sibilants; <b>maxillectomy</b> and <b>mandibulectomy</b> change resonance, articulation and chewing, often managed with a <b>palatal obturator</b> or prosthesis.</p>' },
      { k: 'Nerves', t: 'Nerves and vessels', cam: [V(-210, -30, 120), V(-10, -50, 30)],
        vis: { nerve: 1, vessel: 0.8, bone: 0.35, teeth: 0.4, tongue: 0.25, gland: 0.2 },
        body: '<ul class="mg"><li><b>V (trigeminal)</b>: sensation of face and mouth; V3 motor to mastication, mylohyoid, anterior digastric, tensor veli palatini.</li><li><b>VII</b>: facial expression, taste anterior 2/3, submandibular / sublingual glands.</li><li><b>IX</b>: pharyngeal sensation, taste posterior 1/3, stylopharyngeus, parotid.</li><li><b>X</b>: palate, pharynx, larynx.</li><li><b>XII</b>: tongue.</li></ul>' },
    ],
    labels: [['Orbicularis oris muscle.r', [0, 1]], ['Zygomaticus major muscle.r', [1]], ['Risorius muscle.r', [1]], ['Depressor anguli oris.r', [1]], ['Mentalis muscle.r', [1]], ['Superficial part of masseter.r', [2]], ['Temporalis muscle.r', [2]], ['Medial pterygoid muscle.r', [2]], ['Articular disc of temporomandibular joint.r', [2]],
      ['Tongue', [0, 3, 4]], ['Genioglossus muscle.r', [3]], ['Hyoglossus muscle.r', [3]], ['Mylohyoid muscle.r', [3]], ['Geniohyoid muscle.r', [3]], ['Soft palate', [0, 4]], ['Uvula of palate', [4]], ['Palatopharyngeus muscle.r', [4]], ['Superior pharyngeal constrictor.r', [4]],
      ['Parotid gland.r', [5]], ['Submandibular gland.r', [5]], ['Sublingual gland.r', [5]], ['Parotid duct.r', [5]], ['Mandible', [6]], ['Maxilla.r', [6]], ['Upper medial incisor.r', [6]], ['Lower first molar tooth.r', [6]],
      ['Facial nerve (VII).r', [7]], ['Hypoglossal nerve (XII).r', [7]], ['Lingual nerve.r', [7]], ['Glossopharyngeal nerve (IX).r', [7]], ['Facial artery.r', [7]]],
  },
  ear: {
    title: 'Ear & Temporal Bone Dissection', sub: 'Outer, middle and inner ear with the facial nerve, vessels and central auditory relays',
    model: 'models/earx.glb',
    groups: { skin: SH(0x7fa6c4), auricle: M(0xd49a86), bone: SH(0xd9c9a2, 2.6), ossicle: M(0xf1e4c2), tm: M(0xcfe6f6, { opacity: 0.85 }), labyrinth: M(0xe3eef7, { emissive: 0x7d95ff, emissiveIntensity: 0.12 }),
      tube: M(0x9fc6e0), nerve: M(nerveC, { emissive: 0x3a2800 }), vessel: M(0xd8485a), muscle: M(muscle), gland: M(0xe8c07a), brainstem: SH(0xd79dab, 1.7), nucleus: M(0xff5c8a, { emissive: 0xff2d6f, emissiveIntensity: 0.3 }), acortex: M(0x7fe0c8, { emissive: 0x1f7a66, emissiveIntensity: 0.3 }) },
    chapters: [
      { k: 'Overview', t: 'The ear inside the temporal bone', cam: [V(-230, 40, 110), V(-40, 0, -5)],
        vis: { skin: 0.18, auricle: 1, bone: 0.2, ossicle: 1, tm: 0.8, labyrinth: 1, tube: 0.6, nerve: 0.9, vessel: 0.5, muscle: 0.3, gland: 0.4, brainstem: 0.3, nucleus: 0.8, acortex: 0.6 },
        body: '<p>The <b>temporal bone</b> houses the middle and inner ear, the <b>facial nerve</b> canal and the internal acoustic meatus. Peel it away with <b>Dissect</b> to see how close the ossicles, cochlea, facial nerve, carotid artery and jugular bulb are to each other: the basis of many otological complications.</p>' },
      { k: 'Outer', t: 'Outer ear', cam: [V(-190, 20, 60), V(-60, 0, -5)],
        vis: { skin: 0.25, auricle: 1, bone: 0.3, tm: 1, gland: 0.6, muscle: 0.3 },
        body: '<p>The <b>auricle</b> (helix, antihelix, concha, tragus, lobule) funnels sound and adds spectral cues for localisation; the <b>concha</b> and the <b>ear canal</b> (≈ 2.5 cm, quarter-wave resonance ≈ 2.7 kHz) boost 2–5 kHz by 10–20 dB. The canal ends at the <b>tympanic membrane</b>. Hearing-aid earmoulds and receivers sit here; the parotid gland lies just in front.</p>' },
      { k: 'Middle', t: 'Middle ear: eardrum, ossicles, Eustachian tube', cam: [V(-120, 25, 55), V(-44, 1, -4)],
        vis: { bone: 0.08, ossicle: 1, tm: 0.7, tube: 1, labyrinth: 0.6, nerve: 0.8 },
        body: '<p><b>Malleus</b> (on the drum), <b>incus</b>, <b>stapes</b> (in the oval window). The area ratio of drum to footplate (~17:1) and the ossicular lever (~1.3:1) recover ~25–30 dB lost at the air–fluid boundary. The <b>Eustachian tube</b> ventilates the middle ear. The <b>chorda tympani</b> crosses behind the drum.</p><p class="note">Otosclerosis fixes the stapes; OME fills the space with fluid; cholesteatoma erodes the ossicles.</p>' },
      { k: 'Inner', t: 'Inner ear: cochlea and vestibule', cam: [V(-100, 30, 50), V(-40, 1, -4)],
        vis: { ossicle: 0.6, labyrinth: 1, nerve: 1, bone: 0.05, vessel: 0.3 },
        body: '<p>The <b>cochlea</b> (2¾ turns) is tonotopic: high frequencies at the base near the oval window, low at the apex. The <b>vestibule</b> holds the utricle and saccule and opens into the three <b>semicircular canals</b>. Both share the perilymph and endolymph spaces, which is why Ménière\'s disease and labyrinthitis affect hearing and balance together.</p>' },
      { k: 'Nerves', t: 'VIII and VII in the temporal bone', cam: [V(-150, 50, 70), V(-25, 5, -5)],
        vis: { labyrinth: 0.8, nerve: 1, brainstem: 0.4, nucleus: 0.8, ossicle: 0.5, gland: 0.4 },
        body: '<p>The <b>vestibulocochlear (VIII)</b> and <b>facial (VII)</b> nerves share the internal acoustic meatus. A <b>vestibular schwannoma</b> there causes asymmetric SNHL and tinnitus, and can compress VII (and V when large). VII then runs past the middle ear and down the mastoid, giving the <b>stapedius</b> branch (acoustic reflex) and the <b>chorda tympani</b>, before passing through the parotid.</p>' },
      { k: 'Vessels', t: 'Vessels: carotid and jugular', cam: [V(-180, -30, 90), V(-35, -20, -5)],
        vis: { labyrinth: 0.8, vessel: 1, bone: 0.1, ossicle: 0.6, muscle: 0.4 },
        body: '<p>The <b>internal carotid artery</b> climbs in front of the cochlea in the petrous bone; the <b>sigmoid sinus</b> and <b>jugular bulb</b> lie behind and below the middle ear. A dehiscent or high jugular bulb, sinus diverticulum or glomus tumour can cause <b>pulsatile tinnitus</b> and a vascular mass behind the drum.</p>' },
      { k: 'Central', t: 'Central auditory relays', cam: [V(-190, 120, 60), V(0, 25, -15)],
        vis: { brainstem: 0.4, nucleus: 1, acortex: 1, nerve: 0.8, labyrinth: 0.6 },
        body: '<p><b>Cochlear nuclei</b> → superior olivary complex (both sides, for localisation) → lateral lemniscus → <b>inferior colliculus</b> → <b>medial geniculate body</b> → <b>Heschl\'s gyrus</b>. The ABR waves I–V track this path; central lesions affect speech-in-noise and temporal processing more than the audiogram.</p>' },
    ],
    labels: [['Helix.r', [0, 1]], ['Tragus.r', [1]], ['Tympanic membrane.r', [1, 2]], ['Malleus.r', [2]], ['Incus.r', [2]], ['Stapes.r', [2, 3]], ['Auditory tube.r', [2]], ['Cochlea.r', [0, 3, 4]], ['Vestibule.r', [3]], ['Chorda tympani.r', [2, 4]],
      ['Facial nerve (VII).r', [4]], ['Vestibulocochlear nerve (VIII).r', [4]], ['Parotid gland.r', [1, 4]], ['Internal carotid artery.r', [5]], ['Internal jugular vein.r', [5]], ['Sigmoid sinus.r', [5]], ['Posterior cochlear nucleus.r', [6]], ['Inferior colliculus.r', [6]], ['Medial geniculate body.r', [6]], ['Transverse temporal gyri.r', [6]]],
  },
  brain: {
    title: 'Brain Dissection', sub: 'Lobes and gyri, deep nuclei, ventricles, brainstem, cerebellum, cranial nerves and arteries',
    model: 'models/brainx.glb',
    groups: { skin: SH(0x7fa6c4), bone: SH(0xd9c9a2, 2.6), cortex: M(0xb7aee6, { roughness: 0.6 }), deep: M(0x8a93b8), ventricle: M(0x5fc8f2, { opacity: 0.8 }), cerebellum: M(0xd6b27a), brainstem: M(0xd79dab),
      cn: M(nerveC, { emissive: 0x3a2800 }), artery: M(0xd8485a, { emissive: 0x400000 }) },
    chapters: [
      { k: 'Overview', t: 'The brain in the skull', cam: [V(-300, 140, 230), V(0, 40, -5)],
        vis: { skin: 0.15, bone: 0.15, cortex: 0.95, cerebellum: 0.9, brainstem: 0.9, cn: 0.8, artery: 0.6 },
        body: '<p>Frontal, parietal, temporal and occipital lobes, with the insula hidden in the lateral sulcus; cerebellum and brainstem below. Use <b>Dissect</b> to fade the cortex and reach the deep nuclei and ventricles, tap any gyrus to see what it does for speech, language, cognition or swallowing, and run the <b>Spotter test</b>.</p>' },
      { k: 'Lobes', t: 'Gyri and speech–language areas', cam: [V(260, 120, 170), V(20, 55, -5)],
        vis: { cortex: 1, cerebellum: 0.7, brainstem: 0.6 },
        body: '<p>Left hemisphere (shown): <b>Broca\'s area</b> (opercular and triangular parts of the inferior frontal gyrus), <b>precentral gyrus</b> (face and tongue motor), <b>superior temporal gyrus</b> and <b>planum temporale</b> (Wernicke\'s area), <b>supramarginal</b> and <b>angular</b> gyri, and <b>Heschl\'s gyrus</b> buried in the Sylvian fissure.</p>',
        facts: [['~95 %', 'of right-handers are left-dominant for language'], ['MCA', 'supplies most language cortex']] },
      { k: 'Deep', t: 'Basal ganglia, thalamus, hippocampus', cam: [V(-220, 150, 170), V(0, 45, 0)],
        vis: { cortex: 0.06, deep: 1, ventricle: 0.5, brainstem: 0.6, cerebellum: 0.3 },
        body: '<p><b>Caudate</b>, <b>putamen</b> and <b>globus pallidus</b> (basal ganglia) scale and select movements: dopamine loss → <b>hypokinetic dysarthria</b> (Parkinson\'s); excess movement → <b>hyperkinetic dysarthria</b> (Huntington\'s, dystonia). The <b>thalamus</b> relays to the cortex (thalamic aphasia is possible). The <b>hippocampus</b> forms new memories (early Alzheimer\'s).</p>' },
      { k: 'Ventricles', t: 'Ventricles and CSF', cam: [V(-200, 170, 160), V(0, 40, -10)],
        vis: { cortex: 0.04, ventricle: 1, deep: 0.35, brainstem: 0.5, cerebellum: 0.3 },
        body: '<p>Two <b>lateral ventricles</b>, the third and <b>fourth ventricle</b> (behind the pons and medulla), with the <b>choroid plexus</b> producing CSF. Enlarged ventricles in <b>normal-pressure hydrocephalus</b> give the triad of gait apraxia, cognitive decline and incontinence; hydrocephalus in children affects language and learning.</p>' },
      { k: 'Brainstem', t: 'Brainstem and cerebellum', cam: [V(-220, 40, -150), V(0, 5, -20)],
        vis: { cortex: 0.05, brainstem: 1, cerebellum: 0.95, cn: 0.9, deep: 0.2 },
        body: '<p><b>Midbrain</b> (III, IV), <b>pons</b> (V, VI, VII, VIII) and <b>medulla</b> (IX–XII, the swallowing central pattern generator). Brainstem strokes cause <b>flaccid</b> or mixed dysarthria and severe dysphagia (Wallenberg). The <b>cerebellum</b> coordinates timing: lesions → <b>ataxic dysarthria</b> (scanning speech, irregular DDK), nystagmus and imbalance.</p>' },
      { k: 'Nerves', t: 'Cranial nerves I–XII', cam: [V(-160, -90, 200), V(0, 10, 10)],
        vis: { cortex: 0.08, brainstem: 0.8, cn: 1, cerebellum: 0.3, artery: 0.3 },
        body: '<p>For speech and swallowing: <b>V</b> (jaw, sensation), <b>VII</b> (lips, face), <b>VIII</b> (hearing, balance), <b>IX</b> (pharyngeal sensation), <b>X</b> (palate, pharynx, larynx), <b>XI</b> (neck, shoulder) and <b>XII</b> (tongue). Viewed from below, they emerge in order from rostral to caudal.</p><p class="note">Mnemonic practice: tap each nerve and name its nucleus and function.</p>' },
      { k: 'Arteries', t: 'Circle of Willis and stroke territories', cam: [V(-150, -130, 180), V(0, 25, 5)],
        vis: { cortex: 0.1, brainstem: 0.5, artery: 1, cn: 0.3, cerebellum: 0.2 },
        body: '<p>Internal carotids and the <b>basilar</b> artery (from the vertebrals) join in the <b>circle of Willis</b>. The <b>MCA</b> supplies Broca\'s, Wernicke\'s, motor and auditory cortex (aphasia, dysarthria, dysphagia); the <b>ACA</b> the medial frontal lobe and SMA (transcortical motor aphasia); the <b>PCA</b> occipital lobe, thalamus and hippocampus; the vertebrobasilar system the brainstem, cerebellum and inner ear.</p>' },
    ],
    labels: [['Opercular part of inferior frontal gyrus.l', [1]], ['Triangular part of inferior frontal gyrus.l', [1]], ['Precentral gyrus.l', [1]], ['Superior temporal gyrus (Lateral part).l', [1]], ['Supramarginal gyrus.l', [1]], ['Angular gyrus.l', [1]],
      ['Caudate nucleus.r', [2]], ['Putamen.r', [2]], ['Thalamus.r', [2]], ['Hippocampus.r', [2]], ['Lateral ventricle.r', [3]], ['Fourth ventricle', [3]], ['Pons.r', [4]], ['Medulla oblongata.r', [4]], ['Midbrain.r', [4]], ['Flocculus.r', [4]],
      ['Trigeminal nerve (V).r', [5]], ['Facial nerve (VII).r', [5]], ['Vestibulocochlear nerve (VIII).r', [5]], ['Vagus nerve (X).r', [5]], ['Hypoglossal nerve (XII).r', [5]], ['Optic nerve (II).r', [5]],
      ['Middle cerebral artery (M1-segment).r', [6]], ['Anterior cerebral artery.r', [6]], ['Posterior cerebral artery.r', [6]], ['Basilar artery', [6]], ['Vertebral artery.r', [6]]],
  },
};

const RG = REGIONS[R] || REGIONS.larynx;
document.title = RG.title + ' · ASLP Anatomy Studio';
const h1 = document.querySelector('.brand h1'); if (h1) h1.textContent = RG.title;
const sub = document.querySelector('.brand .sub, .brand p'); if (sub) sub.textContent = RG.sub;

// group opacity arrays from each chapter's `vis` map (unlisted groups hidden)
const groups = {};
for (const [g, make] of Object.entries(RG.groups)) groups[g] = { make, op: RG.chapters.map((c) => c.vis[g] ?? 0) };

const S = {};
const lab = createLab({
  models: [{ url: RG.model }],
  state: S,
  share: [],
  dissectOpen: !matchMedia('(max-width: 900px)').matches,
  groups,
  chapters: RG.chapters.map((c) => ({ k: c.k, nav: c.k, t: c.t, sig: CSS.air, cam: c.cam, tour: 14, body: () => c.body, facts: c.facts ? () => c.facts : undefined })),
  build(ctx) {
    ctx.W.schem = [];
    RG.extra && RG.extra(ctx);
    for (const [n, chs] of RG.labels || []) if (ctx.byName[n]) { const p = ctx.centre(n); ctx.label(String(n).replace(/\.(r|l)$/, '').replace(/\*/g, ''), () => p, chs, { color: CSS.air }); }
  },
  update(ctx) { for (const t of ctx.W.schem || []) t.visible = (RG.extraVisible || []).includes(ctx.S.ch) || !!(ctx.tools && ctx.tools.dz.on); },
  renderPanels() {},
});
// region switcher
const tabs = $('regionTabs');
if (tabs) tabs.innerHTML = Object.entries(REGIONS).map(([k, r]) => `<a href="?r=${k}" class="${k === R ? 'on' : ''}" ${k === R ? 'aria-current="page"' : ''}>${r.title.replace(' Dissection', '').replace(' & Neck', '')}</a>`).join('');
void lab; void COL; void solid; void THREE;
