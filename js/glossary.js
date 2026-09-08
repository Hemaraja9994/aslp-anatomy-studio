function n(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\(left\)|\(right\)|\bleft\b|\bright\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KIND = {
  muscle: { role: "Muscle", fn: "Contracts to move a speech, swallow or respiratory structure.", clinic: "Weakness or spasticity changes articulation, voice or swallow." },
  bone: { role: "Bone", fn: "Gives rigid form, protection and landmarks for examination or surgery.", clinic: "Fracture, dysplasia or surgical exposure is read from these surfaces." },
  cartilage: { role: "Cartilage", fn: "Keeps an airway or pinna patent while still allowing movement.", clinic: "Calcification, trauma or reconstruction alters voice and airway." },
  nerve: { role: "Nerve", fn: "Carries sensory, motor or special-sense signals for communication.", clinic: "Lesion produces dysarthria, dysphagia, facial palsy or hearing loss." },
  vessel: { role: "Vessel", fn: "Supplies or drains the communication brain and neck.", clinic: "Stroke in this territory can suddenly remove language or motor speech." },
  membrane: { role: "Membrane", fn: "A thin vibrating or lining surface (fold, fascia or mucosa).", clinic: "Stiffness, perforation or inflammation changes sound or swallow." },
  brain: { role: "Brain", fn: "Computes language, hearing or motor-speech programmes.", clinic: "Focal injury here is the anatomy of aphasia, AOS or central deafness." },
  mucosa: { role: "Mucosa", fn: "Moist lining that vibrates, lubricates and senses the aerodigestive tract.", clinic: "Inflammation or dryness changes voice and swallow comfort." },
  skin: { role: "Surface", fn: "Outer landmark used in examination, earmould work and counselling.", clinic: "Inspection starts here before any deeper window." },
  clinic: { role: "Clinic overlay", fn: "A teaching device or clinical window placed on the dissection.", clinic: "Use it to relate the 3D organ to what the clinician actually sees or fits." }
};

const E = [
  [["helix"], "Helix", "Outer rim of the pinna", "Folds and reflects high-frequency sound; a landmark for earmould helix lock.", "Helix crus and rim must be cleared in impression work; microtia often starts here."],
  [["antihelix", "crura of antihelix"], "Antihelix", "Inner ridge of the pinna", "Splits into superior and inferior crura, shaping conchal acoustics.", "Antihelix form guides open-fit vs custom earmould choice."],
  [["tragus"], "Tragus", "Cartilage flap anterior to the canal", "Partly shields the meatus and is a landmark for insert phones and impressions.", "Pressing the tragus occludes the canal in bedside tests."],
  [["antitragus"], "Antitragus", "Small eminence opposite the tragus", "Bounds the intertragic notch used when seating an earmould.", "Notch shape affects mould comfort and slit-leak."],
  [["concha of auricle", "concha"], "Concha", "Bowl of the pinna", "Collects sound into the canal; resonance contributes to the pinna cue.", "Concha depth decides RIC vs custom shell and venting."],
  [["lobule of auricle", "lobule"], "Lobule", "Fleshy inferior pinna", "No cartilage; a soft landmark, not an acoustic collector.", "Piercings and keloid are counselled here; not used for transducer seat."],
  [["apex of auricle", "auricular tubercle"], "Pinna apex / Darwin tubercle", "Superior pinna landmark", "Variant cartilage used in pinna orientation, not a separate organ.", "Note laterality when describing congenital anomalies."],
  [["external acoustic", "external auditory", "eac", "auditory canal"], "External auditory canal", "Skin-lined tube to the drum", "Resonates near 2.5–3 kHz in adults; S-shaped path to the TM.", "Insert phones sit here; debris and stenosis change thresholds and moulds."],
  [["tympanic membrane"], "Tympanic membrane", "Eardrum", "Converts air pressure to ossicular motion; cone of light is anteroinferior.", "OME, perforation and tympanosclerosis are read on otoscopy."],
  [["malleus"], "Malleus", "Hammer ossicle", "Handle visible through the TM; first lever of the transformer.", "Handle position is an otoscopy landmark; fixation stiffens the chain."],
  [["incus"], "Incus", "Anvil ossicle", "Long process delivers lever advantage to the stapes.", "Erosion in CSOM disconnects the transformer."],
  [["stapes"], "Stapes", "Stirrup ossicle", "Footplate in the oval window; last air-to-fluid coupler.", "Otosclerosis fixes the footplate; stapedius inserts on the neck."],
  [["auditory tube", "eustachian", "pharyngotympanic"], "Auditory (Eustachian) tube", "Middle-ear pressure valve", "Opens from nasopharynx to equalise pressure and drain the cleft.", "ETD and infant tube angle raise OME risk."],
  [["mastoid"], "Mastoid", "Air-cell process of temporal bone", "A pneumatic reservoir behind the canal; bone-conduction and BAHA site.", "Mastoiditis, cortical mastoidectomy and implant abutments live here."],
  [["temporal bone"], "Temporal bone", "Skull base housing the ear", "Contains EAC, middle ear, cochlea, vestibule and facial canal.", "Trauma, atresia and surgical approaches are temporal-bone anatomy."],
  [["cochlea"], "Cochlea", "Hearing end-organ", "Spiral of three scalae; place-frequency map from base (high f) to apex (low f).", "Ototoxicity, Meniere disease and CI arrays are cochlear problems."],
  [["vestibule"], "Vestibule", "Central bony labyrinth", "Connects cochlea to canals; contains utricle (and opens to saccule).", "Surgical landmark between oval window and canals."],
  [["cochlear nerve"], "Cochlear nerve", "Auditory division of CN VIII", "IHC afferents through the modiolus and IAM to cochlear nuclei.", "If the nerve is absent, CI fails and ABI is considered."],
  [["vestibular nerve"], "Vestibular nerve", "Balance division of CN VIII", "Canal and otolith afferents; joins cochlear nerve in the IAM.", "Schwannoma and vestibular neuritis present here."],
  [["vestibulocochlear"], "Vestibulocochlear nerve (CN VIII)", "Special sensory nerve of the ear", "Hearing and balance root from labyrinth to brainstem.", "ABR Wave I is distal nerve; large IAM lesions threaten both functions."],
  [["facial nerve"], "Facial nerve (CN VII)", "Motor nerve of the face and stapedius", "Gives stapedius, then muscles of facial expression; taste via chorda.", "LMN palsy, acoustic-reflex decay and IAM tumours."],
  [["trigeminal"], "Trigeminal nerve (CN V)", "Face sensation and mastication", "Mandibular division motors tensor tympani and jaw; sensation for oral mucosa.", "Jaw weakness and facial numbness in dysarthria work-up."],
  [["glossopharyngeal"], "Glossopharyngeal nerve (CN IX)", "Pharynx and taste", "Stylopharyngeus, gag afferent, parotid parasympathetic.", "Loss of gag and palatal sensation; tested with CN X."],
  [["vagus nerve", "vagus"], "Vagus nerve (CN X)", "Voice and swallow valve nerve", "RLN and SLN motor the larynx; pharyngeal plexus motors constrictors.", "Unilateral RLN injury: breathy voice and aspiration risk."],
  [["hypoglossal"], "Hypoglossal nerve (CN XII)", "Tongue motor nerve", "All intrinsic tongue muscles and most extrinsics except palatoglossus.", "LMN: ipsilateral wasting and deviation to the weak side."],
  [["accessory nerve"], "Accessory nerve (CN XI)", "Sternomastoid and trapezius", "Turns the head and shrugs; not a speech nerve but a neck-exam partner.", "Shoulder drop after neck dissection."],
  [["cochlear nucle"], "Cochlear nuclei", "First brainstem auditory relay", "Tonotopic dorsal and ventral nuclei; start of CANS.", "ABI paddle is placed here when the nerve cannot be stimulated."],
  [["inferior colliculus"], "Inferior colliculus", "Midbrain auditory hub", "Integrates timing and spectrum before thalamus; ABR Wave V neighbourhood.", "Lesions are rare but central hearing tests can flag the midbrain."],
  [["medial geniculate"], "Medial geniculate body", "Auditory thalamus", "Last relay before Heschl’s gyrus.", "Thalamic stroke may mute or distort sound without a cochlear loss."],
  [["transverse temporal", "heschl"], "Heschl’s gyrus (transverse temporal)", "Primary auditory cortex", "First cortical map of sound; buried in the sylvian fissure.", "Bilateral lesions can cause cortical deafness; unilateral often compensated."],
  [["superior temporal sulcus", "superior temporal"], "Superior temporal gyrus / sulcus", "Auditory association and Wernicke neighbourhood", "Maps sound to meaning on the language-dominant side.", "Posterior STG injury is the classical fluent aphasia field — use with dual-stream caution."],
  [["middle temporal gyrus"], "Middle temporal gyrus", "Lateral temporal association cortex", "Supports lexical and semantic processing with STG and angular gyrus.", "Ventral-stream language signs after temporal stroke."],
  [["inferior frontal gyrus"], "Inferior frontal gyrus", "Broca neighbourhood (pars opercularis / triangularis)", "Speech planning and syntax on the language-dominant side; not ‘the speech muscle’.", "Non-fluent aphasia and AOS risk; classical maps oversimplify."],
  [["supramarginal"], "Supramarginal gyrus", "Inferior parietal language cortex", "Phonological working memory and dorsal-stream mapping.", "Conduction-like errors and repetition difficulty after parietal stroke."],
  [["angular gyrus"], "Angular gyrus", "Parieto-temporal association", "Reading, naming and semantic access with the ventral stream.", "Alexia and anomia in inferior parietal lesions."],
  [["precentral gyrus"], "Precentral gyrus", "Primary motor cortex", "Corticobulbar upper motor neurons for face, tongue and larynx sit laterally.", "UMN dysarthria: spastic, effortful speech with brisk reflexes."],
  [["postcentral gyrus"], "Postcentral gyrus", "Primary somatosensory cortex", "Face and oral sensation used in articulation feedback.", "Oral sensory loss degrades fine consonants."],
  [["insula"], "Insula", "Cortex in the sylvian depth", "Contributes to apraxia of speech, swallow and interoception.", "Opercular / insular stroke is a frequent AOS neighbour."],
  [["thalamus"], "Thalamus", "Relay and gating nuclei", "MGB is the auditory relay; other nuclei support language initiation.", "Thalamic aphasia is real but variable — do not over-map."],
  [["putamen"], "Putamen", "Lateral basal ganglion", "Motor-speech programme scaling with caudate and globus pallidus.", "Hypokinetic or hyperkinetic dysarthria after basal-ganglia disease."],
  [["caudate nucleus"], "Caudate nucleus", "Medial basal ganglion", "Loops with frontal cortex for initiation and inhibition of speech.", "With putamen, the anatomy of hypokinetic dysarthria."],
  [["pons"], "Pons", "Middle brainstem", "Houses nuclei and fibres for V, VI, VII, VIII and lock-in pathways.", "Pontine stroke: dysarthria, facial palsy, internuclear signs."],
  [["medulla oblongata"], "Medulla oblongata", "Caudal brainstem", "Nucleus ambiguus (IX, X) and hypoglossal nucleus live here.", "Lateral medullary syndrome: dysphagia and palatal palsy."],
  [["cerebellum"], "Cerebellum", "Timing and coordination of speech", "Scales force and timing of articulators; not a language cortex.", "Ataxic dysarthria: irregular AMRs and scanning speech."],
  [["corpus callosum"], "Corpus callosum", "Interhemispheric white matter", "Lets the non-dominant hemisphere share language and motor plans.", "Callosal injury can disconnect praxis or reading paths."],
  [["lateral ventricle"], "Lateral ventricle", "CSF space beside language cortex", "A radiology landmark, not a speech organ.", "Shift or dilatation flags mass effect near perisylvian language areas."],
  [["hypothalamus"], "Hypothalamus", "Autonomic and endocrine floor of diencephalon", "Not a speech centre; sits below thalamus on this dissection.", "Mention only to keep diencephalic relations honest."],
  [["tentorium"], "Tentorium cerebelli", "Dural shelf over cerebellum", "Separates occipital lobes from cerebellum; a herniation plane.", "Raised ICP and posterior-fossa masses are read against it."],
  [["middle cerebral artery", "mca"], "Middle cerebral artery", "Lateral-fissure artery", "Supplies perisylvian language cortex on the dominant side.", "MCA infarct is the common anatomy of sudden aphasia."],
  [["basilar artery"], "Basilar artery", "Ventral brainstem artery", "Feeds pons, midbrain and posterior circulation including AICA to the labyrinth.", "Brainstem stroke and sudden bilateral hearing loss territory."],
  [["internal carotid"], "Internal carotid artery", "Anterior circulation stem", "Becomes MCA and ACA after the circle of Willis.", "ICA disease can throw emboli into language cortex."],
  [["thyroid cartilage"], "Thyroid cartilage", "Shield of the larynx", "Houses the vocal folds; laryngeal prominence is a neck landmark.", "Fracture, laryngectomy and pitch surgery alter this box."],
  [["cricoid cartilage"], "Cricoid cartilage", "Only complete laryngeal ring", "Foundation for arytenoids; keeps the subglottis patent.", "Cricoid pressure and subglottic stenosis live here."],
  [["arytenoid cartilage"], "Arytenoid cartilage", "Pyramid on the cricoid", "Rocks and glides to abduct or adduct the vocal folds.", "Dislocation and ankylosis fix the glottis."],
  [["corniculate"], "Corniculate cartilage", "Apex of the arytenoid", "Extends the aryepiglottic fold; a small landmark, not a motor.", "Seen on endoscopy as the aryepiglottic mound."],
  [["epiglottis"], "Epiglottis", "Leaf cartilage of the larynx", "Inverts during swallow to help cover the airway.", "Failure of inversion raises aspiration risk."],
  [["hyoid bone"], "Hyoid bone", "Floating neck bone", "Suspends the larynx; hyolaryngeal excursion is a swallow event.", "Reduced excursion is a VFSS / FEES finding in dysphagia."],
  [["posterior crico arytenoid", "posterior crico-arytenoid"], "Posterior crico-arytenoid", "Sole vocal-fold abductor", "Opens the glottis for breathing; recurrent laryngeal nerve.", "Bilateral PCA palsy is an airway emergency."],
  [["lateral crico arytenoid", "lateral crico-arytenoid"], "Lateral crico-arytenoid", "Adductor of the vocal fold", "Closes the glottis for phonation and airway protection.", "Unilateral loss: breathy voice, weak cough."],
  [["transverse arytenoid"], "Transverse arytenoid", "Interarytenoid adductor", "Closes the posterior glottis with the obliques.", "Posterior glottic gap if weak."],
  [["thyro arytenoid", "thyro-arytenoid"], "Thyro-arytenoid (vocalis)", "Body of the vocal fold", "Shortens and thickens the fold; cover–body source of voice.", "Body stiffness changes register and nodule risk."],
  [["cricothyroid"], "Cricothyroid", "Pitch muscle of the larynx", "Lengthens the folds; external branch of SLN.", "SLN injury flattens pitch range."],
  [["quadrangular membrane"], "Quadrangular membrane", "Upper laryngeal membrane", "From epiglottis to arytenoids; free edge is the aryepiglottic fold.", "Defines the vestibule seen on endoscopy."],
  [["thyrohyoid"], "Thyrohyoid", "Strap that shortens hyoid–thyroid gap", "Assists hyolaryngeal elevation in swallow.", "Strap weakness reduces airway protection."],
  [["sternohyoid"], "Sternohyoid", "Infrahyoid strap", "Depresses the hyoid after swallow and during pitch change.", "One of the straps examined in neck and voice clinics."],
  [["tongue"], "Tongue", "Principal oral articulator", "Shapes vowels and consonants; also the oral-stage bolus driver.", "Glossectomy, XII palsy and ankyloglossia change speech and swallow."],
  [["genioglossus"], "Genioglossus", "Tongue protruder", "Draws the tongue forward; keeps the airway open.", "Unilateral XII: tongue deviates to the weak side on protrusion."],
  [["hyoglossus"], "Hyoglossus", "Tongue depressor / retractor", "Pulls the tongue down and back; a XII muscle.", "Contributes to /k, g, ŋ/ and bolus posteriorisation."],
  [["mylohyoid"], "Mylohyoid", "Oral-diaphragm floor", "Elevates the floor of mouth and hyoid in the oral stage (V3).", "Floor-of-mouth surgery weakens hyoid elevation."],
  [["geniohyoid"], "Geniohyoid", "Hyoid puller", "Draws hyoid up and forward (C1 via XII sheath).", "A key muscle of hyolaryngeal excursion."],
  [["soft palate"], "Soft palate (velum)", "Velopharyngeal valve", "Elevates to separate nose from mouth for pressure consonants.", "VPI and cleft speech: hypernasality and nasal emission."],
  [["uvula of palate", "uvula"], "Uvula", "Midline velar tip", "A landmark of palatal symmetry, not the main closer.", "Deviation and bifidity flag palatal palsy or submucous cleft."],
  [["nasopharynx"], "Nasopharynx", "Post-nasal airway", "Adenoid and ET ostia; the nasal side of VP closure.", "Nasendoscopy views the velum from here."],
  [["oropharynx"], "Oropharynx", "Swallow and resonance cavity", "From palatal plane to hyoid; constrictors drive the bolus.", "Residue here is an aspiration risk if the airway is unprotected."],
  [["laryngopharynx", "hypopharynx"], "Laryngopharynx", "Hypopharynx", "Pyriform fossae and post-cricoid region lead to the UES.", "Pyriform residue and silent aspiration are scored here."],
  [["pharyngeal constrictor"], "Pharyngeal constrictor", "Circular swallow muscle", "Superior, middle and inferior constrictors strip the bolus down.", "Weakness leaves residue; inferior part includes cricopharyngeus (UES)."],
  [["palatopharyngeus"], "Palatopharyngeus", "Faucial-pillar muscle", "Depresses the velum and narrows the pharynx; a VP-pattern muscle.", "One of the four muscles named in VP closure patterns."],
  [["oesophagus", "esophagus"], "Oesophagus", "Food tube below the UES", "Oesophageal stage is not voluntary speech anatomy but completes swallow.", "CP bar and oesophageal dysphagia are referred, not treated as dysarthria."],
  [["mandible"], "Mandible", "Lower jaw", "Moves for speech and mastication; houses the tongue.", "Trismus, fracture and V3 motor loss limit articulation."],
  [["maxilla"], "Maxilla", "Upper jaw / hard-palate bone", "Floor of the nose and roof of the mouth.", "Cleft and maxillectomy destroy the oral–nasal partition."],
  [["frontal bone"], "Frontal bone", "Forehead skull", "Roof of the orbits; orientation landmark, not a speech organ.", "Used to teach superior / anterior on the skull."],
  [["parietal bone"], "Parietal bone", "Lateral cranial vault", "Covers parietal language-association cortex.", "A radiology landmark for the language convexity."],
  [["occipital bone"], "Occipital bone", "Posterior cranial vault", "Houses the cerebellum beneath the tentorium.", "Orientation: posterior skull."],
  [["sphenoid bone"], "Sphenoid bone", "Central skull-base bone", "Foramina for CN II–VI; sella and pterygoid processes.", "Skull-base tumours here can take cranial nerves of speech."],
  [["ethmoid bone"], "Ethmoid bone", "Midline nasal skull", "Cribriform plate and perpendicular plate; smell, not speech.", "Orientation of the nasal cavity roof."],
  [["zygomatic bone"], "Zygomatic bone", "Cheekbone", "Lateral face contour; a laterality landmark.", "Fracture changes face form, not the vocal folds."],
  [["nasal bone"], "Nasal bone", "Bridge of the nose", "External nose landmark for resonance teaching.", "Does not open or close the VP port."],
  [["vomer"], "Vomer", "Midline nasal septum bone", "Splits the nasal cavity; a resonance wall.", "Septal deviation changes nasal airflow, not language."],
  [["diaphragm"], "Diaphragm", "Primary inspiratory muscle", "Descends to draw air in; speech then uses checked expiration.", "Weakness shortens phrases and loudness."],
  [["intercostal"], "Intercostal muscles", "Rib-cage wall", "Externals aid inspiration; internals help controlled expiration for speech.", "Chest-wall restriction flattens intensity contours."],
  [["superior lobe", "inferior lobe", "middle lobe", "lung"], "Lung", "Respiratory bellows", "Provides the air supply; speech needs stable subglottal pressure, not tidal quiet breathing.", "COPD, tracheostomy and flaccid trunk weakness cut phrase length."],
  [["manubrium of sternum", "body of sternum", "sternum"], "Sternum", "Breastbone", "Anterior chest landmark for respiratory teaching.", "Sternal stability is part of the speech-breathing cage."],
  [["trachea"], "Trachea", "Windpipe", "Airway below the cricoid; not a phonatory source.", "Stoma after laryngectomy and tracheostomy sit on this tube."],
  [["ci array", "scala tympani path"], "CI array (scala tympani path)", "Cochlear-implant electrode teaching overlay", "A conventional array is aimed along scala tympani from base toward apex.", "Counsel that the device codes place and rate; it is not a new cochlea."],
  [["bone conduction implant", "bone-conduction"], "Bone-conduction implant site", "Mastoid / temporal coupling overlay", "Vibrates the skull so the cochlea is driven, bypassing the outer and middle ear.", "BAHA and similar devices need a clean implant seat and a working cochlea."],
  [["behind the ear", "hearing aid"], "Behind-the-ear hearing aid", "Pinna-worn aid overlay", "Microphone and receiver sit on the helix; sound is led to the canal.", "Helix lock and tubing are fitted to these landmarks."],
  [["otoscope window"], "Otoscope window", "Clinical view overlay", "The drum is seen down the canal, not as a whole 3D organ.", "Cone of light and handle of malleus are the first two landmarks."],
  [["laryngectomy stoma", "tep site"], "Laryngectomy stoma / TEP site", "Alaryngeal airway overlay", "After total laryngectomy the trachea opens at the neck; TEP sits in the party wall.", "Voice options: electrolarynx, oesophageal speech, TEP."],
  [["stroboscopy"], "Stroboscopy light path", "Voice-clinic overlay", "Strobe samples vocal-fold vibration that the eye cannot resolve in real time.", "A window, not a diagnosis — mucosa, closure and symmetry are scored."],
  [["aspiration risk"], "Aspiration risk zone", "Pharyngeal residue overlay", "If the airway is open while bolus is here, material can enter the larynx.", "Hyolaryngeal elevation, epiglottic inversion and fold closure protect this zone."],
  [["abi paddle"], "ABI paddle (cochlear nucleus)", "Auditory brainstem implant overlay", "Used when the nerve cannot take a CI; the paddle sits on the cochlear nucleus.", "Outcomes are more limited than CI — counsel honestly."],
  [["mca language territory"], "MCA language territory", "Stroke overlay", "Dominant MCA supplies the perisylvian language network.", "Sudden aphasia is this artery until proven otherwise."],
  [["speech breathing volume"], "Speech-breathing volume", "Respiratory overlay", "Speech uses a deeper inspiration and a longer, checked expiration than quiet breathing.", "Loudness and phrase length fail when this volume cannot be controlled."]
];

const ENTRIES = E.map(([keys, title, role, fn, clinic]) => ({
  keys: keys.map(n),
  title, role, fn, clinic
}));

function laterality(label) {
  const s = " " + String(label || "").toLowerCase() + " ";
  if (/\(left\)|\bleft\b|\.l\b/.test(s)) return "Left";
  if (/\(right\)|\bright\b|\.r\b/.test(s)) return "Right";
  return "";
}

function lookup(label) {
  const q = n(label);
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  for (const e of ENTRIES) {
    for (const key of e.keys) {
      let score = 0;
      if (q === key) score = 2000 + key.length;
      else if (q.includes(key)) score = 200 + key.length;
      else if (key.includes(q) && q.length >= 6) score = 50 + q.length;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
  }
  return best;
}

export function explainPart(label, mesh, module) {
  const hit = lookup(label);
  const kindKey = (mesh && mesh.userData && mesh.userData.kind) || "";
  const kind = KIND[kindKey] || KIND.bone;
  const side = laterality(label);
  const title = hit ? hit.title : String(label || "Structure");
  const role = hit ? hit.role : kind.role;
  const fn = hit ? hit.fn : kind.fn;
  const clinic = hit ? hit.clinic : kind.clinic;
  const layer = (mesh && mesh.userData && mesh.userData.layer) || kindKey || "structure";
  let moduleNote = "";
  if (module) {
    const struct = (module.structures || []).find((s) => n(label).includes(n(s)) || n(s).includes(n(label)));
    moduleNote = (struct ? struct + ". " : "") + (module.physiology || "");
  }
  return {
    label: String(label || ""),
    title,
    role,
    fn,
    clinic,
    side,
    kind: kindKey || "structure",
    layer,
    moduleId: module && module.id,
    moduleTitle: module && module.title,
    papers: module && module.papers,
    moduleNote
  };
}
