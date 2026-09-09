// Teaching maps: mesh label matchers ↔ diagram region ids ↔ CT landmarks.
// Labels come from BodyParts3D / Z-Anatomy atlas names (see catalog scenePatterns).
// Every RCI module M00–M16 has a map; diagram/CT families are reused by scene.

function n(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\(left\)|\(right\)|\bleft\b|\bright\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @typedef {{ id: string, label: string, match: string[], role?: string }} SpatialStructure */

const SHARED_EAR = [
  { id: "helix", label: "Helix", match: ["helix"], role: "Pinna rim" },
  { id: "antihelix", label: "Antihelix", match: ["antihelix", "crura of antihelix"], role: "Pinna ridge" },
  { id: "tragus", label: "Tragus", match: ["tragus"], role: "Canal landmark" },
  { id: "antitragus", label: "Antitragus", match: ["antitragus"], role: "Intertragic notch" },
  { id: "concha", label: "Concha", match: ["concha of auricle", "concha"], role: "Pinna bowl" },
  { id: "lobule", label: "Lobule", match: ["lobule of auricle", "lobule"], role: "Soft pinna tip" },
  { id: "eac", label: "External auditory canal", match: ["external acoustic", "external auditory", "auditory canal", "eac"], role: "Canal" },
  { id: "tm", label: "Tympanic membrane", match: ["tympanic membrane"], role: "Eardrum" },
  { id: "malleus", label: "Malleus", match: ["malleus"], role: "Ossicle" },
  { id: "incus", label: "Incus", match: ["incus"], role: "Ossicle" },
  { id: "stapes", label: "Stapes", match: ["stapes"], role: "Ossicle" },
  { id: "auditory_tube", label: "Auditory tube", match: ["auditory tube", "eustachian", "pharyngotympanic"], role: "Pressure valve" },
  { id: "mastoid", label: "Mastoid", match: ["mastoid"], role: "Air cells / BAHA site" },
  { id: "temporal", label: "Temporal bone", match: ["temporal bone"], role: "Skull base" },
  { id: "cochlea", label: "Cochlea", match: ["cochlea"], role: "Hearing end-organ" },
  { id: "vestibule", label: "Vestibule", match: ["vestibule"], role: "Bony labyrinth" },
  { id: "facial", label: "Facial nerve (VII)", match: ["facial nerve"], role: "CN VII" },
  { id: "cn8", label: "Vestibulocochlear nerve", match: ["vestibulocochlear", "cochlear nerve", "vestibular nerve"], role: "CN VIII" }
];

const COCHLEA_EXTRA = [
  { id: "cochlear_nerve", label: "Cochlear nerve", match: ["cochlear nerve"], role: "Afferent VIII" },
  { id: "vestibular_nerve", label: "Vestibular nerve", match: ["vestibular nerve"], role: "Balance VIII" },
  { id: "cochlear_nuclei", label: "Cochlear nuclei", match: ["cochlear nucle"], role: "Brainstem relay" },
  { id: "inferior_colliculus", label: "Inferior colliculus", match: ["inferior colliculus"], role: "Midbrain hub" },
  { id: "mgb", label: "Medial geniculate", match: ["medial geniculate"], role: "Auditory thalamus" },
  { id: "scc", label: "Semicircular canals", match: ["semicircular canal", "semicircular"], role: "Angular acceleration" },
  { id: "utricle", label: "Utricle", match: ["utricle"], role: "Otolith" },
  { id: "saccule", label: "Saccule", match: ["saccule"], role: "Otolith" },
  { id: "scala_tympani", label: "Scala tympani", match: ["scala tympani", "scala"], role: "CI array path" },
  { id: "modiolus", label: "Modiolus", match: ["modiolus"], role: "Central axis" }
];

const ORIENTATION_POOL = [
  { id: "sagittal", label: "Median / sagittal plane", match: ["sagittal", "median plane"], role: "Left–right divide" },
  { id: "coronal", label: "Coronal plane", match: ["coronal", "frontal plane"], role: "Anterior–posterior" },
  { id: "transverse", label: "Transverse plane", match: ["transverse", "axial plane", "horizontal plane"], role: "Superior–inferior" },
  { id: "frontal", label: "Frontal bone", match: ["frontal bone"], role: "Calvarium" },
  { id: "temporal", label: "Temporal bone", match: ["temporal bone"], role: "Otology landmark" },
  { id: "mandible", label: "Mandible", match: ["mandible"], role: "Lower jaw" },
  { id: "hyoid", label: "Hyoid bone", match: ["hyoid bone", "hyoid"], role: "Floating neck bone" },
  { id: "maxilla", label: "Maxilla", match: ["maxilla"], role: "Midface" },
  { id: "superior", label: "Superior", match: ["superior"], role: "Toward head" },
  { id: "anterior", label: "Anterior", match: ["anterior"], role: "Toward face" }
];

const EMBRYO_POOL = [
  { id: "arch1", label: "First pharyngeal arch", match: ["malleus", "incus", "mandible", "maxilla", "helix", "tragus"], role: "Meckel / pinna hillocks" },
  { id: "arch2", label: "Second pharyngeal arch", match: ["stapes", "hyoid", "antihelix", "lobule"], role: "Reichert / pinna" },
  { id: "otic", label: "Otic placode / otocyst", match: ["cochlea", "vestibule"], role: "Inner ear primordium" },
  { id: "pouch1", label: "First pharyngeal pouch", match: ["auditory tube", "eustachian", "tympanic membrane"], role: "Tubotympanic recess" },
  { id: "pinna", label: "Developing pinna", match: ["helix", "antihelix", "tragus", "concha", "lobule"], role: "Hillocks of His" },
  { id: "palate", label: "Palatal shelves", match: ["maxilla", "soft palate", "hard palate", "palate"], role: "Secondary palate" },
  { id: "tm", label: "Tympanic membrane", match: ["tympanic membrane"], role: "Eardrum" },
  { id: "temporal", label: "Temporal bone", match: ["temporal bone"], role: "Ossifying capsule" }
];

const CHEST_POOL = [
  { id: "diaphragm", label: "Diaphragm", match: ["diaphragm"], role: "Principal inspiratory" },
  { id: "lung_l", label: "Left lung", match: ["left lung", "superior lobe of left", "inferior lobe of left"], role: "Speech air reservoir" },
  { id: "lung_r", label: "Right lung", match: ["right lung", "superior lobe of right", "middle lobe", "inferior lobe of right"], role: "Speech air reservoir" },
  { id: "trachea", label: "Trachea", match: ["trachea"], role: "Airway" },
  { id: "sternum", label: "Sternum", match: ["sternum", "manubrium", "body of sternum"], role: "Anterior chest wall" },
  { id: "intercostal", label: "Intercostal muscles", match: ["intercostal"], role: "Rib motion" },
  { id: "ribs", label: "Rib cage", match: ["sternum", "intercostal", "manubrium"], role: "Thoracic cage" },
  { id: "abdomen", label: "Abdominal wall", match: ["abdominal", "rectus abdominis", "oblique"], role: "Checked expiration" }
];

const LARYNX_POOL = [
  { id: "thyroid", label: "Thyroid cartilage", match: ["thyroid cartilage"], role: "Shield" },
  { id: "cricoid", label: "Cricoid cartilage", match: ["cricoid cartilage", "cricoid"], role: "Signet ring" },
  { id: "arytenoid", label: "Arytenoid cartilage", match: ["arytenoid cartilage", "arytenoid"], role: "Vocal process" },
  { id: "epiglottis", label: "Epiglottis", match: ["epiglottis"], role: "Airway guard" },
  { id: "folds", label: "Vocal folds", match: ["thyro-arytenoid", "thyroarytenoid", "vocal"], role: "Glottis" },
  { id: "pca", label: "Posterior cricoarytenoid", match: ["posterior crico"], role: "Only abductor" },
  { id: "lca", label: "Lateral cricoarytenoid", match: ["lateral crico"], role: "Adductor" },
  { id: "ct", label: "Cricothyroid", match: ["cricothyroid"], role: "Pitch tensor · SLN" },
  { id: "hyoid", label: "Hyoid bone", match: ["hyoid bone", "hyoid"], role: "Laryngeal scaffold" },
  { id: "trachea", label: "Trachea", match: ["trachea"], role: "Subglottic airway" },
  { id: "rln", label: "Recurrent laryngeal nerve", match: ["vagus", "recurrent"], role: "RLN · CN X" }
];

const SWALLOW_POOL = [
  { id: "lips", label: "Lips / oral seal", match: ["mandible", "maxilla", "orbicularis"], role: "Oral competence" },
  { id: "tongue", label: "Tongue", match: ["tongue", "genioglossus", "hyoglossus"], role: "Bolus driver" },
  { id: "hard_palate", label: "Hard palate", match: ["maxilla", "palate", "hard palate"], role: "Oral roof" },
  { id: "velum", label: "Soft palate / velum", match: ["soft palate", "uvula", "palatopharyngeus", "levator"], role: "VP valve" },
  { id: "nasopharynx", label: "Nasopharynx", match: ["nasopharynx"], role: "Nasal airway" },
  { id: "oropharynx", label: "Oropharynx", match: ["oropharynx", "pharyngeal constrictor"], role: "Bolus path" },
  { id: "laryngopharynx", label: "Laryngopharynx", match: ["laryngopharynx", "hypopharynx"], role: "Hypopharynx" },
  { id: "epiglottis", label: "Epiglottis", match: ["epiglottis"], role: "Airway protection" },
  { id: "hyoid", label: "Hyoid–larynx complex", match: ["hyoid bone", "hyoid", "thyroid cartilage"], role: "Elevation" },
  { id: "ues", label: "UES / pharyngo-oesophageal", match: ["oesophagus", "cricoid", "cricopharyngeus"], role: "UES" },
  { id: "oesophagus", label: "Oesophagus", match: ["oesophagus"], role: "Transport" },
  { id: "mandible", label: "Mandible", match: ["mandible"], role: "Jaw" }
];

const BRAIN_POOL = [
  { id: "cn8", label: "CN VIII", match: ["vestibulocochlear", "cochlear nerve", "vestibular nerve"], role: "Auditory nerve" },
  { id: "cochlear_nuclei", label: "Cochlear nuclei", match: ["cochlear nucle"], role: "Brainstem entry" },
  { id: "soc", label: "Superior olivary complex", match: ["olivary", "superior olive"], role: "Binaural" },
  { id: "ll", label: "Lateral lemniscus", match: ["lateral lemniscus", "lemniscus"], role: "Ascending tract" },
  { id: "ic", label: "Inferior colliculus", match: ["inferior colliculus"], role: "Midbrain hub" },
  { id: "mgb", label: "Medial geniculate", match: ["medial geniculate"], role: "Auditory thalamus" },
  { id: "heschl", label: "Heschl / transverse temporal", match: ["transverse temporal", "superior temporal"], role: "A1" },
  { id: "stg", label: "Superior temporal gyrus", match: ["superior temporal", "middle temporal"], role: "Auditory association" },
  { id: "ifg", label: "Inferior frontal gyrus", match: ["inferior frontal"], role: "Speech planning" },
  { id: "smg", label: "Supramarginal gyrus", match: ["supramarginal", "angular"], role: "Phonology / reading" },
  { id: "precentral", label: "Precentral gyrus", match: ["precentral"], role: "Motor" },
  { id: "basal", label: "Basal ganglia", match: ["putamen", "caudate"], role: "Motor loops" },
  { id: "cerebellum", label: "Cerebellum", match: ["cerebellum"], role: "Coordination" },
  { id: "brainstem", label: "Brainstem", match: ["pons", "medulla oblongata"], role: "CANS / CN nuclei" },
  { id: "trigeminal", label: "Trigeminal (V)", match: ["trigeminal"], role: "CN V" },
  { id: "facial", label: "Facial (VII)", match: ["facial nerve"], role: "CN VII" },
  { id: "glossopharyngeal", label: "Glossopharyngeal (IX)", match: ["glossopharyngeal"], role: "CN IX" },
  { id: "vagus", label: "Vagus (X)", match: ["vagus nerve", "vagus"], role: "CN X" },
  { id: "accessory", label: "Accessory (XI)", match: ["accessory nerve"], role: "CN XI" },
  { id: "hypoglossal", label: "Hypoglossal (XII)", match: ["hypoglossal"], role: "CN XII" },
  { id: "mca", label: "Middle cerebral artery", match: ["middle cerebral"], role: "Language territory" },
  { id: "ica", label: "Internal carotid", match: ["internal carotid", "carotid artery"], role: "Anterior circulation" },
  { id: "willis", label: "Circle of Willis", match: ["basilar artery", "circle of willis", "communicating artery"], role: "Anastomosis" },
  { id: "ventricle", label: "Lateral ventricle / CSF", match: ["lateral ventricle", "ventricle"], role: "CSF" },
  { id: "meninges", label: "Meninges / tentorium", match: ["tentorium", "dura"], role: "Coverings" },
  { id: "insula", label: "Insula", match: ["insula"], role: "Deep cortex" }
];

const DEVICE_POOL = [
  { id: "scala_tympani", label: "Scala tympani (CI path)", match: ["scala tympani", "scala"], role: "CI array" },
  { id: "cochlea", label: "Cochlea", match: ["cochlea"], role: "Implant target" },
  { id: "modiolus", label: "Modiolus", match: ["modiolus"], role: "Perimodiolar" },
  { id: "cn8", label: "CN VIII", match: ["vestibulocochlear", "cochlear nerve"], role: "Nerve integrity" },
  { id: "cochlear_nuclei", label: "Cochlear nucleus (ABI)", match: ["cochlear nucle"], role: "ABI site" },
  { id: "mastoid", label: "Mastoid implant site", match: ["mastoid", "temporal bone"], role: "Receiver / BAHA" },
  { id: "temporal", label: "Temporal bone", match: ["temporal bone"], role: "Surgical field" },
  { id: "stapes", label: "Stapes / oval window", match: ["stapes"], role: "Middle-ear path" }
];

const CLINICAL_POOL = [
  { id: "tm", label: "Tympanic membrane", match: ["tympanic membrane"], role: "Otoscopy" },
  { id: "malleus", label: "Handle of malleus", match: ["malleus"], role: "TM landmark" },
  { id: "eac", label: "External auditory canal", match: ["external acoustic", "external auditory", "eac"], role: "Scope path" },
  { id: "cone", label: "Cone of light (AIQ)", match: ["tympanic membrane"], role: "Anteroinferior" },
  { id: "folds", label: "Glottis from above", match: ["thyro-arytenoid", "arytenoid", "epiglottis"], role: "Stroboscopy" },
  { id: "velum", label: "Velum (nasendoscopy)", match: ["soft palate", "uvula", "nasopharynx"], role: "Nasendoscopy" },
  { id: "helix", label: "Pinna landmarks", match: ["helix", "tragus", "concha"], role: "Exam approach" },
  { id: "temporal", label: "Temporal bone", match: ["temporal bone"], role: "Context" }
];

function structuresFor(ids, pool) {
  const byId = new Map(pool.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/** Axial teaching CT landmark positions in normalised 0–1 view space (origin top-left). */
function earAxialLandmarks(focus = "middle") {
  const base = [
    { id: "temporal", x: 0.52, y: 0.48, r: 0.28, slice: 1 },
    { id: "mastoid", x: 0.78, y: 0.58, r: 0.12, slice: 1 },
    { id: "eac", x: 0.62, y: 0.55, r: 0.05, slice: 1 },
    { id: "tm", x: 0.54, y: 0.52, r: 0.035, slice: 1 },
    { id: "malleus", x: 0.50, y: 0.48, r: 0.028, slice: 1 },
    { id: "incus", x: 0.47, y: 0.46, r: 0.026, slice: 1 },
    { id: "stapes", x: 0.44, y: 0.45, r: 0.022, slice: 2 },
    { id: "cochlea", x: 0.38, y: 0.50, r: 0.07, slice: 2 },
    { id: "vestibule", x: 0.42, y: 0.42, r: 0.045, slice: 2 },
    { id: "facial", x: 0.46, y: 0.40, r: 0.025, slice: 2 },
    { id: "cn8", x: 0.32, y: 0.44, r: 0.04, slice: 2 },
    { id: "auditory_tube", x: 0.48, y: 0.62, r: 0.04, slice: 0 },
    { id: "helix", x: 0.88, y: 0.42, r: 0.06, slice: 0 },
    { id: "concha", x: 0.82, y: 0.50, r: 0.05, slice: 0 },
    { id: "tragus", x: 0.74, y: 0.52, r: 0.03, slice: 0 },
    { id: "cone", x: 0.56, y: 0.56, r: 0.03, slice: 1 }
  ];
  if (focus === "cochlea") {
    return base.map((l) => {
      if (l.id === "cochlea") return { ...l, x: 0.46, y: 0.50, r: 0.11, slice: 1 };
      if (l.id === "vestibule") return { ...l, x: 0.54, y: 0.40, r: 0.06, slice: 1 };
      if (l.id === "cn8" || l.id === "cochlear_nerve") return { ...l, id: l.id === "cn8" ? "cochlear_nerve" : l.id, x: 0.34, y: 0.48, r: 0.05, slice: 1 };
      if (l.id === "stapes") return { ...l, x: 0.58, y: 0.46, r: 0.03, slice: 1 };
      return l;
    }).concat([
      { id: "cochlear_nerve", x: 0.34, y: 0.48, r: 0.05, slice: 1 },
      { id: "vestibular_nerve", x: 0.34, y: 0.40, r: 0.04, slice: 1 },
      { id: "scala_tympani", x: 0.48, y: 0.56, r: 0.05, slice: 1 },
      { id: "modiolus", x: 0.46, y: 0.48, r: 0.035, slice: 1 }
    ]);
  }
  if (focus === "vestibular") {
    return [
      { id: "vestibule", x: 0.48, y: 0.48, r: 0.08, slice: 1 },
      { id: "scc", x: 0.52, y: 0.36, r: 0.09, slice: 1 },
      { id: "utricle", x: 0.46, y: 0.50, r: 0.04, slice: 1 },
      { id: "saccule", x: 0.44, y: 0.54, r: 0.035, slice: 1 },
      { id: "cochlea", x: 0.38, y: 0.54, r: 0.07, slice: 1 },
      { id: "cn8", x: 0.32, y: 0.46, r: 0.045, slice: 1 },
      { id: "vestibular_nerve", x: 0.34, y: 0.40, r: 0.04, slice: 1 },
      { id: "facial", x: 0.42, y: 0.38, r: 0.03, slice: 2 },
      { id: "temporal", x: 0.52, y: 0.48, r: 0.28, slice: 0 },
      { id: "stapes", x: 0.56, y: 0.48, r: 0.025, slice: 2 }
    ];
  }
  return base;
}

function orientationLandmarks() {
  return [
    { id: "sagittal", x: 0.50, y: 0.48, r: 0.04, slice: 1 },
    { id: "coronal", x: 0.50, y: 0.42, r: 0.04, slice: 0 },
    { id: "transverse", x: 0.50, y: 0.55, r: 0.04, slice: 2 },
    { id: "frontal", x: 0.50, y: 0.28, r: 0.08, slice: 0 },
    { id: "temporal", x: 0.72, y: 0.48, r: 0.07, slice: 1 },
    { id: "mandible", x: 0.50, y: 0.72, r: 0.08, slice: 2 },
    { id: "hyoid", x: 0.50, y: 0.78, r: 0.04, slice: 2 },
    { id: "maxilla", x: 0.50, y: 0.58, r: 0.06, slice: 1 },
    { id: "superior", x: 0.50, y: 0.18, r: 0.05, slice: 0 },
    { id: "anterior", x: 0.50, y: 0.40, r: 0.05, slice: 0 }
  ];
}

function chestLandmarks() {
  return [
    { id: "sternum", x: 0.50, y: 0.42, r: 0.05, slice: 0 },
    { id: "lung_r", x: 0.32, y: 0.45, r: 0.14, slice: 1 },
    { id: "lung_l", x: 0.68, y: 0.46, r: 0.13, slice: 1 },
    { id: "trachea", x: 0.50, y: 0.32, r: 0.035, slice: 0 },
    { id: "diaphragm", x: 0.50, y: 0.72, r: 0.16, slice: 2 },
    { id: "intercostal", x: 0.22, y: 0.48, r: 0.05, slice: 1 },
    { id: "ribs", x: 0.18, y: 0.40, r: 0.06, slice: 0 },
    { id: "abdomen", x: 0.50, y: 0.84, r: 0.1, slice: 2 }
  ];
}

function larynxLandmarks() {
  return [
    { id: "epiglottis", x: 0.50, y: 0.28, r: 0.06, slice: 0 },
    { id: "hyoid", x: 0.50, y: 0.22, r: 0.05, slice: 0 },
    { id: "thyroid", x: 0.50, y: 0.42, r: 0.1, slice: 1 },
    { id: "folds", x: 0.50, y: 0.48, r: 0.05, slice: 1 },
    { id: "arytenoid", x: 0.50, y: 0.52, r: 0.04, slice: 1 },
    { id: "cricoid", x: 0.50, y: 0.62, r: 0.07, slice: 2 },
    { id: "trachea", x: 0.50, y: 0.78, r: 0.06, slice: 2 },
    { id: "pca", x: 0.58, y: 0.56, r: 0.035, slice: 1 },
    { id: "lca", x: 0.40, y: 0.50, r: 0.03, slice: 1 },
    { id: "ct", x: 0.62, y: 0.48, r: 0.035, slice: 1 },
    { id: "rln", x: 0.68, y: 0.68, r: 0.03, slice: 2 }
  ];
}

function swallowLandmarks() {
  return [
    { id: "lips", x: 0.72, y: 0.28, r: 0.04, slice: 0 },
    { id: "tongue", x: 0.58, y: 0.38, r: 0.08, slice: 0 },
    { id: "hard_palate", x: 0.55, y: 0.26, r: 0.06, slice: 0 },
    { id: "velum", x: 0.42, y: 0.32, r: 0.05, slice: 0 },
    { id: "nasopharynx", x: 0.34, y: 0.28, r: 0.05, slice: 0 },
    { id: "oropharynx", x: 0.40, y: 0.48, r: 0.06, slice: 1 },
    { id: "epiglottis", x: 0.48, y: 0.52, r: 0.04, slice: 1 },
    { id: "hyoid", x: 0.55, y: 0.58, r: 0.04, slice: 1 },
    { id: "laryngopharynx", x: 0.42, y: 0.62, r: 0.05, slice: 1 },
    { id: "ues", x: 0.42, y: 0.72, r: 0.04, slice: 2 },
    { id: "oesophagus", x: 0.40, y: 0.84, r: 0.05, slice: 2 },
    { id: "mandible", x: 0.68, y: 0.48, r: 0.06, slice: 0 }
  ];
}

function brainLandmarks(focus = "cans") {
  const base = [
    { id: "ifg", x: 0.28, y: 0.42, r: 0.05, slice: 1 },
    { id: "stg", x: 0.30, y: 0.55, r: 0.05, slice: 1 },
    { id: "heschl", x: 0.34, y: 0.52, r: 0.035, slice: 1 },
    { id: "smg", x: 0.38, y: 0.48, r: 0.04, slice: 1 },
    { id: "precentral", x: 0.36, y: 0.36, r: 0.04, slice: 0 },
    { id: "insula", x: 0.42, y: 0.48, r: 0.04, slice: 1 },
    { id: "basal", x: 0.46, y: 0.50, r: 0.045, slice: 1 },
    { id: "ventricle", x: 0.50, y: 0.46, r: 0.05, slice: 1 },
    { id: "mca", x: 0.40, y: 0.46, r: 0.06, slice: 1 },
    { id: "ica", x: 0.48, y: 0.62, r: 0.035, slice: 2 },
    { id: "willis", x: 0.50, y: 0.58, r: 0.05, slice: 2 },
    { id: "brainstem", x: 0.50, y: 0.68, r: 0.06, slice: 2 },
    { id: "cerebellum", x: 0.50, y: 0.78, r: 0.08, slice: 2 },
    { id: "cn8", x: 0.58, y: 0.70, r: 0.035, slice: 2 },
    { id: "cochlear_nuclei", x: 0.56, y: 0.66, r: 0.03, slice: 2 },
    { id: "soc", x: 0.50, y: 0.64, r: 0.03, slice: 2 },
    { id: "ic", x: 0.48, y: 0.58, r: 0.035, slice: 1 },
    { id: "mgb", x: 0.46, y: 0.54, r: 0.03, slice: 1 },
    { id: "trigeminal", x: 0.54, y: 0.62, r: 0.03, slice: 2 },
    { id: "facial", x: 0.56, y: 0.68, r: 0.028, slice: 2 },
    { id: "glossopharyngeal", x: 0.54, y: 0.74, r: 0.028, slice: 2 },
    { id: "vagus", x: 0.52, y: 0.76, r: 0.028, slice: 2 },
    { id: "hypoglossal", x: 0.50, y: 0.80, r: 0.028, slice: 2 },
    { id: "accessory", x: 0.58, y: 0.78, r: 0.028, slice: 2 },
    { id: "meninges", x: 0.50, y: 0.30, r: 0.12, slice: 0 },
    { id: "ll", x: 0.50, y: 0.60, r: 0.03, slice: 2 }
  ];
  if (focus === "vascular") {
    return base.map((l) => (l.id === "mca" ? { ...l, r: 0.09, slice: 1 } : l));
  }
  return base;
}

const MAPS = {
  M00: {
    id: "M00",
    title: "Orientation & anatomical language",
    ctTitle: "Teaching axial · head planes (schematic)",
    scene: "orientation",
    family: "orientation",
    structures: structuresFor(
      ["sagittal", "coronal", "transverse", "frontal", "temporal", "mandible", "hyoid", "maxilla", "superior", "anterior"],
      ORIENTATION_POOL
    ),
    diagram: "orientation",
    ct: {
      kind: "orientation_axial",
      slices: ["Coronal emphasis", "Mid-axial / sagittal cut", "Transverse / mandible"],
      defaultSlice: 1,
      landmarks: orientationLandmarks()
    }
  },
  M01: {
    id: "M01",
    title: "Embryology of communication systems",
    ctTitle: "Teaching axial · developing ear field (schematic)",
    scene: "ear",
    family: "embryology",
    structures: structuresFor(
      ["arch1", "arch2", "otic", "pouch1", "pinna", "palate", "tm", "temporal"],
      EMBRYO_POOL
    ),
    diagram: "embryology",
    ct: {
      kind: "temporal_axial",
      slices: ["Pinna / arch field", "Tubotympanic recess", "Otic capsule"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("external").concat([
        { id: "arch1", x: 0.70, y: 0.48, r: 0.08, slice: 0 },
        { id: "arch2", x: 0.75, y: 0.58, r: 0.06, slice: 0 },
        { id: "otic", x: 0.40, y: 0.48, r: 0.07, slice: 2 },
        { id: "pouch1", x: 0.50, y: 0.58, r: 0.05, slice: 1 },
        { id: "pinna", x: 0.84, y: 0.46, r: 0.07, slice: 0 },
        { id: "palate", x: 0.42, y: 0.70, r: 0.05, slice: 0 }
      ])
    }
  },
  M02: {
    id: "M02",
    title: "Respiratory system for speech",
    ctTitle: "Teaching coronal · chest (schematic)",
    scene: "chest",
    family: "chest",
    structures: structuresFor(
      ["diaphragm", "lung_l", "lung_r", "trachea", "sternum", "intercostal", "ribs", "abdomen"],
      CHEST_POOL
    ),
    diagram: "chest",
    ct: {
      kind: "chest_coronal",
      slices: ["Anterior wall / sternum", "Mid-lung / trachea", "Diaphragm / abdomen"],
      defaultSlice: 1,
      landmarks: chestLandmarks()
    }
  },
  M03: {
    id: "M03",
    title: "Larynx and phonation",
    ctTitle: "Teaching axial · larynx (schematic)",
    scene: "larynx",
    family: "larynx",
    structures: structuresFor(
      ["thyroid", "cricoid", "arytenoid", "epiglottis", "folds", "pca", "lca", "ct", "hyoid", "trachea", "rln"],
      LARYNX_POOL
    ),
    diagram: "larynx",
    ct: {
      kind: "larynx_axial",
      slices: ["Hyoid / epiglottis", "Glottis / folds", "Cricoid / trachea"],
      defaultSlice: 1,
      landmarks: larynxLandmarks()
    }
  },
  M04: {
    id: "M04",
    title: "Articulators and resonators",
    ctTitle: "Teaching sagittal · VP / articulators (schematic)",
    scene: "swallow",
    family: "articulators",
    structures: structuresFor(
      ["lips", "tongue", "hard_palate", "velum", "nasopharynx", "oropharynx", "mandible", "epiglottis"],
      SWALLOW_POOL
    ),
    diagram: "articulators",
    ct: {
      kind: "swallow_sagittal",
      slices: ["Oral / nasal cavities", "Velopharyngeal port", "Oropharynx"],
      defaultSlice: 1,
      landmarks: swallowLandmarks()
    }
  },
  M05: {
    id: "M05",
    title: "Swallowing",
    ctTitle: "Teaching sagittal · swallow path (schematic)",
    scene: "swallow",
    family: "swallow",
    structures: structuresFor(
      ["tongue", "oropharynx", "laryngopharynx", "epiglottis", "hyoid", "ues", "oesophagus", "velum"],
      SWALLOW_POOL
    ),
    diagram: "swallow",
    ct: {
      kind: "swallow_sagittal",
      slices: ["Oral stage", "Pharyngeal stage", "UES / oesophageal"],
      defaultSlice: 1,
      landmarks: swallowLandmarks()
    }
  },
  M06: {
    id: "M06",
    title: "External ear & temporal bone",
    ctTitle: "Teaching axial · temporal bone (schematic)",
    scene: "ear",
    family: "ear_external",
    structures: structuresFor(
      ["helix", "antihelix", "tragus", "antitragus", "concha", "lobule", "eac", "tm", "mastoid", "temporal", "malleus", "cochlea", "facial"],
      SHARED_EAR
    ),
    diagram: "external_ear",
    ct: {
      kind: "temporal_axial",
      slices: ["Canal / pinna plane", "Mesotympanum", "Labyrinthine"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("external")
    }
  },
  M07: {
    id: "M07",
    title: "Middle ear transformer",
    ctTitle: "Teaching axial · middle ear (schematic)",
    scene: "ear",
    family: "ear_middle",
    structures: structuresFor(
      ["tm", "malleus", "incus", "stapes", "auditory_tube", "mastoid", "temporal", "cochlea", "vestibule", "facial", "eac"],
      SHARED_EAR
    ),
    diagram: "middle_ear",
    ct: {
      kind: "temporal_axial",
      slices: ["Protympanum / tube", "Ossicular chain", "Oval window / labyrinth"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("middle")
    }
  },
  M08: {
    id: "M08",
    title: "Cochlea & travelling wave",
    ctTitle: "Teaching axial · cochlea (schematic)",
    scene: "cochlea",
    family: "cochlea",
    structures: structuresFor(
      ["cochlea", "vestibule", "stapes", "tm", "malleus", "incus", "cn8", "cochlear_nerve", "vestibular_nerve", "facial", "temporal", "cochlear_nuclei", "inferior_colliculus", "mgb"],
      [...SHARED_EAR, ...COCHLEA_EXTRA]
    ),
    diagram: "cochlea",
    ct: {
      kind: "cochlea_axial",
      slices: ["Basal turn", "Modiolar / mid-modiolar", "Apical / IAM"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("cochlea")
    }
  },
  M09: {
    id: "M09",
    title: "Vestibular labyrinth",
    ctTitle: "Teaching axial · vestibular labyrinth (schematic)",
    scene: "cochlea",
    family: "vestibular",
    structures: structuresFor(
      ["scc", "utricle", "saccule", "vestibule", "vestibular_nerve", "cn8", "cochlea", "facial", "temporal", "stapes"],
      [...SHARED_EAR, ...COCHLEA_EXTRA]
    ),
    diagram: "vestibular",
    ct: {
      kind: "vestibular_axial",
      slices: ["Canal plane overview", "Vestibule / otoliths", "IAM / nerves"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("vestibular")
    }
  },
  M10: {
    id: "M10",
    title: "Auditory nerve and CANS",
    ctTitle: "Teaching axial · brainstem / CANS (schematic)",
    scene: "brain",
    family: "cans",
    structures: structuresFor(
      ["cn8", "cochlear_nuclei", "soc", "ll", "ic", "mgb", "heschl", "stg", "brainstem"],
      BRAIN_POOL
    ),
    diagram: "cans",
    ct: {
      kind: "brain_axial",
      slices: ["Cortex / Heschl", "Thalamus / IC", "Brainstem relays"],
      defaultSlice: 2,
      landmarks: brainLandmarks("cans")
    }
  },
  M11: {
    id: "M11",
    title: "Cranial nerves for communication",
    ctTitle: "Teaching axial · CN exits (schematic)",
    scene: "brain",
    family: "cranial_nerves",
    structures: structuresFor(
      ["trigeminal", "facial", "cn8", "glossopharyngeal", "vagus", "accessory", "hypoglossal", "brainstem", "cerebellum"],
      BRAIN_POOL
    ),
    diagram: "cranial_nerves",
    ct: {
      kind: "brain_axial",
      slices: ["Midbrain", "Pons / CN V–VIII", "Medulla / IX–XII"],
      defaultSlice: 2,
      landmarks: brainLandmarks("cn")
    }
  },
  M12: {
    id: "M12",
    title: "Brain for language and motor speech",
    ctTitle: "Teaching axial · language network (schematic)",
    scene: "brain",
    family: "language",
    structures: structuresFor(
      ["ifg", "stg", "smg", "heschl", "basal", "cerebellum", "precentral", "insula", "mca"],
      BRAIN_POOL
    ),
    diagram: "language",
    ct: {
      kind: "brain_axial",
      slices: ["Superior peri-Sylvian", "Insula / basal ganglia", "Cerebellum"],
      defaultSlice: 1,
      landmarks: brainLandmarks("language")
    }
  },
  M13: {
    id: "M13",
    title: "Vascular supply and CSF",
    ctTitle: "Teaching axial · MCA / Willis (schematic)",
    scene: "brain",
    family: "vascular",
    structures: structuresFor(
      ["mca", "ica", "willis", "ventricle", "meninges", "ifg", "stg", "basal", "brainstem"],
      BRAIN_POOL
    ),
    diagram: "vascular",
    ct: {
      kind: "brain_axial",
      slices: ["Convexity / meninges", "MCA territory", "Circle of Willis"],
      defaultSlice: 1,
      landmarks: brainLandmarks("vascular")
    }
  },
  M14: {
    id: "M14",
    title: "Devices and surgical anatomy",
    ctTitle: "Teaching axial · CI / implant path (schematic)",
    scene: "cochlea",
    family: "devices",
    structures: structuresFor(
      ["scala_tympani", "cochlea", "modiolus", "cn8", "cochlear_nuclei", "mastoid", "temporal", "stapes"],
      [...DEVICE_POOL, ...SHARED_EAR, ...COCHLEA_EXTRA]
    ),
    diagram: "devices",
    ct: {
      kind: "cochlea_axial",
      slices: ["Mastoid receiver site", "Scala tympani trajectory", "ABI / cochlear nucleus"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("cochlea").concat([
        { id: "mastoid", x: 0.78, y: 0.55, r: 0.08, slice: 0 },
        { id: "cochlear_nuclei", x: 0.28, y: 0.52, r: 0.04, slice: 2 }
      ])
    }
  },
  M15: {
    id: "M15",
    title: "Lifespan and diversity",
    ctTitle: "Teaching axial · infant vs adult larynx (schematic)",
    scene: "larynx",
    family: "lifespan",
    structures: structuresFor(
      ["thyroid", "cricoid", "epiglottis", "folds", "hyoid", "trachea", "arytenoid"],
      LARYNX_POOL
    ),
    diagram: "lifespan",
    ct: {
      kind: "larynx_axial",
      slices: ["Higher infant larynx", "Adult glottal plane", "Ageing fold / subglottis"],
      defaultSlice: 0,
      landmarks: larynxLandmarks()
    }
  },
  M16: {
    id: "M16",
    title: "Clinical windows",
    ctTitle: "Teaching axial · otoscopy / TM window (schematic)",
    scene: "ear",
    family: "clinical",
    structures: structuresFor(
      ["tm", "malleus", "eac", "cone", "folds", "velum", "helix", "temporal"],
      [...CLINICAL_POOL, ...SHARED_EAR, ...LARYNX_POOL, ...SWALLOW_POOL]
    ),
    diagram: "clinical",
    ct: {
      kind: "temporal_axial",
      slices: ["Otoscope approach", "TM quadrants", "Middle-ear depth"],
      defaultSlice: 1,
      landmarks: earAxialLandmarks("external")
    }
  }
};

export const SPATIAL_MAPPED_MODULES = Object.keys(MAPS).sort();

/** Scene → default diagram family (for docs / routing). */
export const SCENE_MAP_FAMILY = {
  orientation: "orientation",
  ear: "ear_external",
  chest: "chest",
  larynx: "larynx",
  swallow: "swallow",
  cochlea: "cochlea",
  brain: "brain"
};

export function hasSpatialMap(moduleId) {
  return !!MAPS[moduleId];
}

export function getSpatialMap(moduleId) {
  return MAPS[moduleId] || null;
}

export function normalizeLabel(label) {
  return n(label);
}

function matchScore(key, mk) {
  if (!key || !mk) return 0;
  if (key === mk) return 1000 + mk.length;
  // Prefer the pattern as a contained token/phrase in the label.
  if (key.includes(mk)) return 500 + mk.length * 2;
  // Only allow pattern-contains-key when the key is almost as long (avoids helix⊂antihelix).
  if (mk.includes(key) && key.length >= Math.max(4, Math.ceil(mk.length * 0.7))) {
    return 200 + key.length;
  }
  return 0;
}

export function structureIdForLabel(label, map) {
  if (!map || !label) return null;
  const key = n(label);
  if (!key) return null;
  let best = null;
  let bestScore = 0;
  for (const s of map.structures) {
    for (const m of s.match) {
      const score = matchScore(key, n(m));
      if (score > bestScore) {
        best = s.id;
        bestScore = score;
      }
    }
  }
  return best;
}

export function findMeshLabelForStructure(structureId, map, meshLabels) {
  if (!structureId || !map) return null;
  const s = map.structures.find((x) => x.id === structureId);
  if (!s) return null;
  const labels = meshLabels || [];
  let best = null;
  let bestScore = 0;
  for (const label of labels) {
    const key = n(label);
    for (const m of s.match) {
      const score = matchScore(key, n(m));
      if (score > bestScore) {
        best = label;
        bestScore = score;
      }
    }
  }
  return best;
}

export function structureById(map, id) {
  return map && map.structures ? map.structures.find((s) => s.id === id) || null : null;
}

/** Residual gap helper: structure ids whose match strings are intentionally broad / fuzzy. */
export const FUZZY_STRUCTURE_NOTES = {
  sagittal: "Plane callout — usually no mesh; diagram/CT only.",
  coronal: "Plane callout — usually no mesh; diagram/CT only.",
  transverse: "Plane callout — usually no mesh; diagram/CT only.",
  superior: "Directional callout — usually no mesh; diagram/CT only.",
  anterior: "Directional callout — usually no mesh; diagram/CT only.",
  folds: "Atlas uses thyro-arytenoid / related muscle names rather than 'vocal folds'.",
  rln: "RLN rarely labelled separately; may fall back to vagus when present.",
  soc: "SOC is a teaching station; pons is the nearest packaged mesh.",
  ll: "Lateral lemniscus is tract-level; linked via pons / IC when present.",
  utricle: "Otolith organs often share vestibule mesh in BodyParts3D packs.",
  saccule: "Otolith organs often share vestibule mesh in BodyParts3D packs.",
  scc: "Semicircular canals may resolve to vestibule if canals are not separate meshes.",
  scala_tympani: "Scala compartments are teaching labels on the cochlea mesh.",
  modiolus: "Modiolus is a teaching callout on the cochlea mesh.",
  cone: "Cone of light is an otoscopy teaching mark on the TM.",
  lips: "Lips may lack a dedicated mesh; mandible/maxilla used as oral-seal proxies.",
  abdomen: "Abdominal wall proxied via diaphragm landmark in chest packs.",
  arch1: "Embryology fields map to adult derivatives (ossicles / pinna / mandible).",
  arch2: "Embryology fields map to adult derivatives (stapes / hyoid / pinna).",
  otic: "Otic placode maps to adult cochlea / vestibule meshes.",
  pouch1: "First pouch maps to auditory tube / TM derivatives.",
  palate: "Palatal shelves map to maxilla / soft palate when loaded."
};
