// Open Advanced Atlas + Pathology teaching cards.
// Explicitly excludes Netter / Elsevier / commercial anatomy assets.

export const ADVANCED_SECTIONS = [
  {
    id: "ear",
    title: "Ear & temporal bone",
    blurb: "Open CT/3D temporal-bone and inner-ear atlases for deeper otology teaching alongside RCI Core Spatial views."
  },
  {
    id: "larynx",
    title: "Larynx & airway",
    blurb: "Head–neck open atlases that include larynx, trachea and related soft tissue — use with Core larynx modules."
  },
  {
    id: "nose",
    title: "Nose & sinuses",
    blurb: "Placeholder teaching cards until a dedicated open sinus mesh set is wired locally. Link-outs only."
  },
  {
    id: "pharynx",
    title: "Pharynx / neck",
    blurb: "Open head–neck models covering pharynx, glands and neck vessels for swallow and oncology context."
  }
];

export const ADVANCED_CARDS = [
  {
    id: "spl-hn",
    section: "ear",
    also: ["larynx", "pharynx", "nose"],
    title: "SPL Head & Neck Atlas",
    source: "Open Anatomy Project · Surgical Planning Lab",
    license: "3D Slicer License (section B) — open educational atlas",
    summary: "CT-based atlas of skull, mandible, neck muscles, cartilage, vessels and glands. Launch the Open Anatomy browser for labelled 3D exploration.",
    teaching: [
      "Orient temporal bone within the whole head–neck CT volume.",
      "Relate mastoid, mandible and neck vessels before zooming to Core M06–M08 Spatial views."
    ],
    href: "https://www.openanatomy.org/atlas-pages/atlas-spl-head-and-neck.html",
    cta: "Open SPL Head & Neck",
    relatedModules: ["M06", "M00", "M05"]
  },
  {
    id: "spl-ear",
    section: "ear",
    title: "SPL Inner Ear Atlas",
    source: "Open Anatomy Project · DKFZ + SPL",
    license: "3D Slicer License (section B)",
    summary: "High-resolution flat-panel CT inner-ear atlas (~140 µm) with label maps and 3D models — joint DKFZ / SPL work.",
    teaching: [
      "Compare labyrinthine geometry with Core M08 cochlea Spatial schematic.",
      "Use as a CT↔3D bridge before discussing CI trajectory concepts."
    ],
    href: "https://www.openanatomy.org/atlas-pages/atlas-spl-inner-ear.html",
    cta: "Open SPL Inner Ear",
    relatedModules: ["M08", "M07", "M09"]
  },
  {
    id: "openear",
    section: "ear",
    title: "OpenEar temporal bone",
    source: "OpenEar project",
    license: "CC BY 4.0",
    summary: "Open temporal-bone CT/3D teaching resource for otology and audiology. Cite the Zenodo deposit when you reuse meshes or figures in class.",
    teaching: [
      "Walk axial temporal-bone landmarks against Core Spatial teaching CT (M06–M07).",
      "Attribute OpenEar (CC BY 4.0) on any exported slide that includes their figures."
    ],
    href: "https://doi.org/10.5281/zenodo.1473724",
    cta: "OpenEar on Zenodo (DOI)",
    relatedModules: ["M06", "M07", "M08"]
  },
  {
    id: "mida",
    section: "pharynx",
    also: ["larynx", "nose", "ear"],
    title: "MIDA head–neck model",
    source: "IT'IS Foundation / FDA collaborators (Iacono et al., PLOS ONE)",
    license: "CC0 (public domain dedication)",
    summary: "Multimodal imaging-based detailed anatomical model of the human head and neck (voxel + surface). No Netter/Elsevier content — open computational anatomy.",
    teaching: [
      "Use for whole-head context (muscles, vessels, nerves, glands) around Core swallow and larynx modules.",
      "Download from IT'IS; keep classroom use attributable to the MIDA paper / DOI."
    ],
    href: "https://itis.swiss/virtual-population/regional-human-models/mida-model",
    secondaryHref: "https://doi.org/10.1371/journal.pone.0124126",
    secondaryCta: "PLOS ONE paper",
    cta: "MIDA model (IT'IS)",
    relatedModules: ["M05", "M03", "M04"]
  },
  {
    id: "larynx-placeholder",
    section: "larynx",
    title: "Larynx open meshes (local set planned)",
    source: "ASLP Studio roadmap",
    license: "—",
    summary: "Placeholder: dedicated open larynx/airway advanced card pack will land here. Until then use RCI Core larynx modules plus SPL Head & Neck / MIDA link-outs.",
    teaching: [
      "Core M03–M04 for photoreal larynx dissection.",
      "SPL Head & Neck for CT soft-tissue context."
    ],
    href: null,
    relatedModules: ["M03", "M04"],
    placeholder: true
  },
  {
    id: "nose-placeholder",
    section: "nose",
    title: "Nose & sinuses (link-out pack planned)",
    source: "ASLP Studio roadmap",
    license: "—",
    summary: "Placeholder subsection for open sinus CT teaching. No commercial atlas art. Use MIDA / SPL Head & Neck for regional orientation today.",
    teaching: [
      "Keep sinus teaching on open CT atlases only.",
      "Do not import Netter plates or Elsevier Complete Anatomy assets."
    ],
    href: null,
    relatedModules: ["M00"],
    placeholder: true
  }
];

export const PATHOLOGY_SECTIONS = [
  {
    id: "otology",
    title: "Ear / otology",
    blurb: "Teaching cases for middle-ear, cochlear and temporal-bone disease patterns — educational only."
  },
  {
    id: "larynx",
    title: "Larynx / voice",
    blurb: "Voice and airway pathology patterns linked to Core larynx anatomy."
  },
  {
    id: "nose",
    title: "Nose / sinus",
    blurb: "Sinonasal teaching pointers using open references (no commercial plate packs)."
  },
  {
    id: "oncology",
    title: "Throat / H&N oncology examples",
    blurb: "De-identified teaching sketches of communication-relevant oncology anatomy — not staging tools."
  }
];

export const PATHOLOGY_CASES = [
  {
    id: "ome-type-b",
    section: "otology",
    title: "OME and the type B tympanogram",
    structures: ["Tympanic membrane", "Middle-ear cleft", "Auditory tube"],
    points: [
      "Fluid fills the cleft → reduced admittance and a flat (type B) tympanogram.",
      "Relate to Core M07 transformer anatomy and Spatial middle-ear schematic.",
      "Teaching only — not a substitute for otoscopy or immittance on a patient."
    ],
    source: "ASLP Studio teaching sketch + RCI Core M07",
    href: null,
    openModule: "M07",
    schematic: "middle-ear-effusion"
  },
  {
    id: "otosclerosis-footplate",
    section: "otology",
    title: "Otosclerosis — fixed stapes footplate (teaching)",
    structures: ["Stapes", "Oval window", "Cochlea"],
    points: [
      "Footplate fixation stiffens the chain; air–bone gap with typically preserved speech discrimination early on.",
      "Use Core M07 isolate on stapes + Spatial CT landmark near oval window.",
      "De-identified conceptual case — not radiographic diagnosis."
    ],
    source: "ASLP Studio teaching sketch",
    href: null,
    openModule: "M07",
    schematic: "stapes-fixation"
  },
  {
    id: "meei-otopath",
    section: "otology",
    title: "Mass Eye & Ear otopathology educational resources",
    structures: ["Temporal bone", "Cochlea", "Ossicles"],
    points: [
      "Link-out to Mass Eye and Ear Otopathology Laboratory educational freeware and 3D temporal-bone teaching models.",
      "Use for histology ↔ 3D correlation after Core Spatial sessions.",
      "Follow their site terms; educational use only."
    ],
    source: "Mass Eye and Ear Otopathology Laboratory",
    href: "https://masseyeandear.org/otopathology-laboratory/resources",
    cta: "Open MEEI otopathology resources",
    openModule: "M06"
  },
  {
    id: "openear-path-note",
    section: "otology",
    title: "OpenEar / temporal-bone CT reading notes",
    structures: ["Mastoid", "EAC", "Labyrinth"],
    points: [
      "OpenEar (CC BY 4.0) supports classroom CT landmark drills.",
      "Pair with Core Spatial teaching CT disclaimer: schematic ≠ patient scan.",
      "Cite Zenodo DOI 10.5281/zenodo.1473724 when reusing."
    ],
    source: "OpenEar (CC BY 4.0)",
    href: "https://doi.org/10.5281/zenodo.1473724",
    cta: "OpenEar DOI",
    openModule: "M06"
  },
  {
    id: "tcia-note",
    section: "otology",
    title: "TCIA public imaging collections (link-out)",
    structures: ["Head and neck CT/MR (collection-dependent)"],
    points: [
      "The Cancer Imaging Archive hosts public, often de-identified research imaging collections.",
      "Use only collections licensed for education; never treat classroom review as clinical reporting.",
      "Prefer curated teaching sets over raw clinical dumps for B.ASLP labs."
    ],
    source: "The Cancer Imaging Archive (TCIA)",
    href: "https://www.cancerimagingarchive.net/",
    cta: "Browse TCIA",
    openModule: null
  },
  {
    id: "unilateral-vfp",
    section: "larynx",
    title: "Unilateral vocal-fold paralysis (teaching pattern)",
    structures: ["Recurrent laryngeal nerve territory", "Thyro-arytenoid", "Glottis"],
    points: [
      "Breathy voice, weak cough; paramedian/intermediate fold on endoscopy (pattern varies).",
      "Map to Core larynx modules; discuss aspiration risk in swallow clinics.",
      "Conceptual case — not a real patient record."
    ],
    source: "ASLP Studio teaching sketch",
    href: null,
    openModule: "M03",
    schematic: "vfp"
  },
  {
    id: "nodules-teaching",
    section: "larynx",
    title: "Vocal-fold nodules — cover–body reminder",
    structures: ["Vocal fold cover", "Thyro-arytenoid body"],
    points: [
      "Bilateral mid-membranous swellings from phonotrauma — teaching stereotype only.",
      "Tie to Core physiology of cover–body vibration.",
      "Not for diagnosing a singer; send to ENT/voice clinic pathways."
    ],
    source: "ASLP Studio teaching sketch",
    href: null,
    openModule: "M03",
    schematic: "nodules"
  },
  {
    id: "crs-orientation",
    section: "nose",
    title: "Chronic rhinosinusitis — anatomic orientation only",
    structures: ["Ostiomeatal unit (conceptual)", "Nasal airway"],
    points: [
      "Classroom orientation to why nasal obstruction and post-nasal drip matter for resonance and sleep.",
      "No commercial sinus plate packs; use open head CT atlases for bone landmarks.",
      "Teaching only — not radiology reporting."
    ],
    source: "ASLP Studio orientation card",
    href: null,
    openModule: "M00",
    schematic: "sinus-orientation",
    placeholder: true
  },
  {
    id: "partial-glossectomy",
    section: "oncology",
    title: "Partial glossectomy — speech/swallow consequence map",
    structures: ["Tongue", "CN XII", "Floor of mouth"],
    points: [
      "Reduced bolus control and alveolar consonant precision — structure the counselling conversation.",
      "Open Core tongue/swallow modules; keep oncology staging out of this studio.",
      "De-identified teaching pattern, not a case chart."
    ],
    source: "ASLP Studio teaching sketch",
    href: null,
    openModule: "M05",
    schematic: "glossectomy"
  },
  {
    id: "total-laryngectomy-tep",
    section: "oncology",
    title: "Total laryngectomy & TEP window (teaching)",
    structures: ["Larynx (removed)", "Tracheostoma", "TEP tract (clinic overlay)"],
    points: [
      "No laryngeal voice; alaryngeal options include TEP, electrolarynx, oesophageal speech.",
      "Use Core clinic overlay modules where available; stress multidisciplinary care.",
      "Educational pattern only."
    ],
    source: "ASLP Studio + clinic overlay",
    href: null,
    openModule: "M14",
    schematic: "laryngectomy"
  }
];

export const LIBRARY_DISCLAIMER = {
  advanced: "Advanced Atlas cards are open educational link-outs and placeholders. No Netter, Elsevier Complete Anatomy, or other commercial plate packs are bundled.",
  pathology: "Pathology cards are curated teaching patterns for classroom use. They are not for diagnosis, staging, or clinical decision-making. Prefer de-identified, openly attributable sources."
};
