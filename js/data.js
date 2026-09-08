window.STUDIO_DATA = {
  product: {
    name: "ASLP Anatomy Studio",
    version: "1.2.0",
    note: "Photoreal tissue shading on reconstructed dissection meshes. Not a surgical navigator."
  },
  modules: [
    {
      id: "M00",
      title: "Orientation and anatomical language",
      scene: "orientation",
      first: "Semester 1",
      papers: "B1.3, B1.4",
      tags: ["Foundation", "UG + PG"],
      summary: "Planes, positions, tissue types and the language used throughout the speech and hearing curriculum.",
      outcomesUG: [
        "Name the principal anatomical planes and positions.",
        "Distinguish cell and tissue types relevant to speech and hearing.",
        "Use studio controls: isolate, fade, cut and label."
      ],
      outcomesPG: [
        "Relate plane of section to clinical imaging used in neurology and otology.",
        "Explain why directional language must stay consistent in reports."
      ],
      structures: [
        "Median / sagittal plane",
        "Coronal plane",
        "Transverse plane",
        "Epithelium, muscle, cartilage, bone, neural tissue"
      ],
      physiology: "No unique physiology. This module establishes spatial language for every later animation.",
      clinic: "Incorrect plane language produces unusable operative and diagnostic notes.",
      worksheet: {
        tasks: [
          "Label superior, inferior, anterior, posterior, medial and lateral on the orientation box.",
          "Write one sentence locating the vocal folds in three planes.",
          "State whether an axial CT of the cochlea is closer to a transverse or a sagittal cut."
        ],
        mcq: [
          { q: "A cut dividing the body into anterior and posterior parts is:", a: "Coronal (frontal)." },
          { q: "The vocal folds lie in which general plane within the larynx?", a: "They occupy a nearly horizontal (transverse) plane at rest, with a sagittal glottal opening." }
        ]
      },
      activity: "In pairs, one student names a structure from B1.3 or B1.4; the other must state the plane in which it would be sectioned for teaching.",
      osce: "Identify three planes on the model in 90 seconds and give one clinical use for each."
    },
    {
      id: "M01",
      title: "Embryology of communication systems",
      scene: "ear",
      first: "Semester 1",
      papers: "B1.3 Unit 1, B1.4 Unit 1",
      tags: ["Embryology", "Congenital"],
      summary: "Branchial arches, otic placode and palatal shelves as the origin of later clinical anomalies.",
      outcomesUG: [
        "List five embryonic anomalies affecting speech or language.",
        "List five embryonic anomalies affecting the auditory system."
      ],
      outcomesPG: [
        "Connect first-arch and first-pouch derivatives to middle-ear and palatal comorbidity."
      ],
      structures: ["Branchial arches 1–6", "Hillocks of His", "Otic placode / otocyst", "Palatal shelves"],
      physiology: "Critical periods determine why an early insult becomes a structural disorder rather than a later functional one.",
      clinic: "Cleft lip/palate, microtia, congenital ossicular fixation, Mondini dysplasia.",
      worksheet: {
        tasks: [
          "Map Hillocks of His to pinna landmarks.",
          "Name the pouch that contributes to the middle-ear cavity and Eustachian tube."
        ],
        mcq: [{ q: "The first pharyngeal pouch contributes to:", a: "Tubotympanic recess: middle-ear cavity and Eustachian tube." }]
      },
      activity: "Draw a five-week timeline on paper and pin each anomaly to a week.",
      osce: "Given a child with microtia and conductive loss, name the embryologic field likely involved."
    },
    {
      id: "M02",
      title: "Respiratory system for speech",
      scene: "larynx",
      first: "Semester 1",
      papers: "B1.3, B5.1, B5.2, B6.2",
      tags: ["Speech breathing"],
      summary: "Rib cage, diaphragm and speech-breathing pattern versus quiet breathing.",
      outcomesUG: ["Describe speech breathing and the role of posture."],
      outcomesPG: ["Relate subglottal pressure to loudness and phrase length in dysarthria."],
      structures: ["Diaphragm", "Intercostals", "Abdominal wall", "Lungs"],
      physiology: "Quiet breathing is diaphragmatic and slightly expiratory-passive. Speech requires checked expiration and stable subglottal pressure.",
      clinic: "Reduced breath support in flaccid or hypokinetic dysarthria; professional voice load.",
      worksheet: {
        tasks: ["Contrast tidal and speech breathing in a four-row table."],
        mcq: [{ q: "Speech expiration is primarily:", a: "Checked / controlled expiration against elastic recoil." }]
      },
      activity: "Time maximum phonation duration on three classmates and discuss respiratory contribution.",
      osce: "Point to the principal inspiratory muscle and explain one speech consequence of weakness."
    },
    {
      id: "M03",
      title: "Larynx and phonation",
      scene: "larynx",
      first: "Semester 1 / 5",
      papers: "B1.3, B2.4, B5.1",
      tags: ["Voice", "Hero scene"],
      summary: "Cartilages, intrinsic muscles, cover–body structure and the aerodynamic–myoelastic theory.",
      outcomesUG: ["Identify thyroid, cricoid, arytenoid and epiglottis.", "Name PCA, LCA, IA, TA and CT with functions."],
      outcomesPG: ["Explain cover–body mechanics and registers.", "Map RLN / SLN injury to voice and swallow risk."],
      structures: ["Thyroid", "Cricoid", "Arytenoids", "Epiglottis", "True folds", "RLN", "SLN"],
      physiology: "Subglottal pressure, Bernoulli effect and tissue elasticity sustain cyclic opening and closing of the glottis.",
      clinic: "Nodules, paralysis, puberphonia, laryngectomy, phonosurgery landmarks.",
      worksheet: {
        tasks: [
          "Complete an intrinsic-muscle table: muscle, innervation, action on the glottis.",
          "Write the counselling line after unilateral RLN injury."
        ],
        mcq: [{ q: "The only intrinsic abductor is:", a: "Posterior cricoarytenoid." }]
      },
      activity: "Step through a schematic glottal cycle using the Play physiology control.",
      osce: "Isolate the arytenoids and state the effect of PCA paralysis."
    },
    {
      id: "M04",
      title: "Articulators and resonators",
      scene: "swallow",
      first: "Semester 1 / 4",
      papers: "B1.3, B1.5, B2.3, B4.1",
      tags: ["Cleft", "Resonance"],
      summary: "Tongue, palate, velum and velopharyngeal closure patterns.",
      outcomesUG: ["Perform an OPME-oriented identification of articulators."],
      outcomesPG: ["Classify VP closure patterns and relate them to cleft speech."],
      structures: ["Lips", "Tongue", "Hard palate", "Velum", "Pharyngeal walls"],
      physiology: "VP closure separates oral and nasal cavities during pressure consonants and vowels that require oral resonance.",
      clinic: "Cleft, VPI, glossectomy, mandibulectomy.",
      worksheet: {
        tasks: ["Name four VP closure patterns.", "Link one pattern to hypernasality risk."],
        mcq: [{ q: "Levator veli palatini primarily:", a: "Elevates the velum." }]
      },
      activity: "Complete a paper striped-Y classification from three drawings.",
      osce: "Identify velum and state two muscles of elevation."
    },
    {
      id: "M05",
      title: "Swallowing",
      scene: "swallow",
      first: "Semester 1 / 5 / 6",
      papers: "B1.3, B5.2, B6.2, B4.3",
      tags: ["Dysphagia"],
      summary: "Oral, pharyngeal and oesophageal stages with airway protection.",
      outcomesUG: ["Name the stages of swallowing and the role of hyolaryngeal excursion."],
      outcomesPG: ["Relate cranial-nerve failure to residue and aspiration risk."],
      structures: ["Oral cavity", "Pharynx", "UES", "Oesophagus", "Hyoid–larynx complex"],
      physiology: "A timed sequence of valve events moves the bolus while the airway is closed.",
      clinic: "Pediatric feeding, neurogenic dysphagia, bedside swallow.",
      worksheet: {
        tasks: ["List four stages and one protective event in each of the last two."],
        mcq: [{ q: "Airway protection during the pharyngeal stage depends on:", a: "Hyolaryngeal elevation, epiglottic inversion and vocal-fold closure." }]
      },
      activity: "Watch the bolus animation and pause at the risk point for aspiration.",
      osce: "Point to the UES region and name two nerves relevant to swallow."
    },
    {
      id: "M06",
      title: "External ear and temporal bone",
      scene: "ear",
      first: "Semester 1",
      papers: "B1.4, B1.6, B2.4",
      tags: ["Audiology", "Hero scene"],
      summary: "Pinna, canal, tympanic membrane and temporal-bone parts used in testing and earmould work.",
      outcomesUG: [
        "Identify helix, antihelix, tragus, concha, lobule and EAC.",
        "Place supra-aural, insert and bone transducers conceptually."
      ],
      outcomesPG: ["Relate pinna cues and head-shadow to localisation."],
      structures: ["Pinna", "EAC", "Tympanic membrane", "Mastoid", "Petrous bone"],
      physiology: "The pinna and canal shape incoming spectra; the canal has a resonant peak near 2.5–3 kHz in adults.",
      clinic: "Otoscopy, earmould impression landmarks, BAHA abutment region, temporal-bone trauma.",
      worksheet: {
        tasks: [
          "Label six pinna landmarks.",
          "State why insert phones change standing-wave error compared with supra-aural phones."
        ],
        mcq: [{ q: "Adult ear-canal resonance is typically near:", a: "Approximately 2.7 kHz (range about 2.5–3 kHz)." }]
      },
      activity: "On a classmate, point to tragus and mastoid without touching the canal.",
      osce: "Isolate the tympanic membrane and name the transducer that sits lateral to it versus in the canal."
    },
    {
      id: "M07",
      title: "Middle ear transformer",
      scene: "ear",
      first: "Semester 1 / 2 / 4",
      papers: "B1.4, B2.4, B4.2",
      tags: ["Immittance", "ENT"],
      summary: "Ossicles, windows, muscles and impedance matching.",
      outcomesUG: ["Name malleus, incus, stapes, oval and round windows, tensor tympani and stapedius."],
      outcomesPG: ["Quantify area and lever ratios and interpret a type B tympanogram anatomically."],
      structures: ["Malleus", "Incus", "Stapes", "Oval window", "Round window", "Eustachian tube"],
      physiology: "Area ratio, lever ratio and TM buckling raise pressure at the oval window and match air to cochlear fluid.",
      clinic: "OME, CSOM, otosclerosis, ETD, acoustic reflex.",
      worksheet: {
        tasks: ["Sketch the reflex arc from cochlea to stapedius.", "Predict tympanogram type in middle-ear effusion."],
        mcq: [{ q: "Stapedius is innervated by:", a: "Facial nerve (CN VII)." }]
      },
      activity: "Play ossicular motion and pause at footplate movement.",
      osce: "Trace sound from TM to oval window and name one muscle that stiffens the chain."
    },
    {
      id: "M08",
      title: "Cochlea and travelling wave",
      scene: "cochlea",
      first: "Semester 1",
      papers: "B1.4, B2.2, B6.3",
      tags: ["Hero scene", "OAE", "CI"],
      summary: "Scala compartments, organ of Corti and frequency place.",
      outcomesUG: ["Identify scala vestibuli, media and tympani and the helicotrema."],
      outcomesPG: ["Explain IHC versus OHC roles, cochlear potentials and dead regions."],
      structures: ["Modiolus", "Scala vestibuli", "Scala media", "Scala tympani", "Basilar membrane", "Hair cells"],
      physiology: "A travelling wave peaks at a place determined by stiffness and mass. OHCs amplify; IHCs provide the afferent code.",
      clinic: "Ototoxicity, presbycusis, Meniere disease, cochlear implantation trajectory.",
      worksheet: {
        tasks: ["Mark base as high frequency and apex as low frequency.", "State why OAEs require functional OHCs."],
        mcq: [{ q: "Endocochlear potential is generated mainly by:", a: "Stria vascularis." }]
      },
      activity: "Run the travelling-wave animation at two frequencies.",
      osce: "Point to the base and state the frequency region encoded there."
    },
    {
      id: "M09",
      title: "Vestibular labyrinth",
      scene: "cochlea",
      first: "Semester 1 / 4",
      papers: "B1.4, B2.4, B4.2",
      tags: ["Balance"],
      summary: "Semicircular canals, otolith organs and VOR overview.",
      outcomesUG: ["Name the five vestibular end-organs."],
      outcomesPG: ["Relate canal plane to Dix-Hallpike and roll tests."],
      structures: ["SCC", "Utricle", "Saccule", "Vestibular nerve"],
      physiology: "Canals detect angular acceleration; otoliths detect linear acceleration and tilt. VOR keeps gaze stable.",
      clinic: "BPPV screening, vestibular schwannoma context.",
      worksheet: {
        tasks: ["Match posterior canal to Dix-Hallpike."],
        mcq: [{ q: "Dix-Hallpike primarily stresses:", a: "Posterior semicircular canal." }]
      },
      activity: "Perform a dry-run verbalisation of Romberg and Fukuda steps.",
      osce: "Identify one canal and one otolith organ."
    },
    {
      id: "M10",
      title: "Auditory nerve and CANS",
      scene: "brain",
      first: "Semester 1 / 4",
      papers: "B1.4 Unit 5, B4.2, B4.3, B6.3",
      tags: ["ABR", "CAPD"],
      summary: "CN VIII through brainstem relay nuclei to auditory cortex.",
      outcomesUG: ["Order the stations: nerve, CN, SOC, LL, IC, MGB, cortex."],
      outcomesPG: ["Map ABR waves to probable generators and state that assignments are partly debated."],
      structures: ["CN VIII", "Cochlear nuclei", "SOC", "Inferior colliculus", "MGB", "Heschl’s gyrus"],
      physiology: "Temporal and spectral information is extracted and integrated binaurally before cortical analysis.",
      clinic: "ABR, CAPD, ABI candidacy.",
      worksheet: {
        tasks: ["Fill an ABR wave-to-site table and mark debated cells."],
        mcq: [{ q: "Wave I of the click ABR arises from:", a: "Distal auditory nerve." }]
      },
      activity: "Play the generator sequence and pause on Wave V.",
      osce: "Order four CANS stations from periphery to cortex."
    },
    {
      id: "M11",
      title: "Cranial nerves for communication",
      scene: "brain",
      first: "Semester 4 / 5 / 6",
      papers: "B2.4, B4.3, B5.2, B6.2",
      tags: ["Motor speech"],
      summary: "Cranial nerves V, VII, VIII, IX, X, XI and XII.",
      outcomesUG: ["State one speech or swallow function for each listed nerve."],
      outcomesPG: ["Separate UMN and LMN facial and tongue signs."],
      structures: ["Trigeminal", "Facial", "Vestibulocochlear", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"],
      physiology: "Lower motor neurons execute the last common path for articulation, phonation and swallow valves.",
      clinic: "Facial palsy, flaccid dysarthria, bedside CN examination.",
      worksheet: {
        tasks: ["Complete a seven-row nerve–foramen–function table."],
        mcq: [{ q: "Tongue protrusion is supplied by:", a: "Hypoglossal nerve (CN XII)." }]
      },
      activity: "Demonstrate a non-invasive CN screen on a consenting classmate.",
      osce: "Name the nerve for stapedius and the nerve for tongue protrusion."
    },
    {
      id: "M12",
      title: "Brain for language and motor speech",
      scene: "brain",
      first: "Semester 4 / 6",
      papers: "B4.3, B6.1, B6.2",
      tags: ["Aphasia"],
      summary: "Perisylvian language network, basal ganglia and cerebellum.",
      outcomesUG: ["Identify inferior frontal and superior temporal language-related cortex."],
      outcomesPG: ["Use dual-stream reasoning and list limitations of classical Broca/Wernicke maps."],
      structures: ["Inferior frontal gyrus", "Superior temporal gyrus", "Supramarginal gyrus", "Basal ganglia", "Cerebellum"],
      physiology: "Dorsal and ventral streams support mapping sound to articulation and sound to meaning.",
      clinic: "Aphasia, AOS, dysarthria, RHD.",
      worksheet: {
        tasks: ["Label language areas on the hemisphere model.", "Write one limitation of the classical connectionist diagram."],
        mcq: [{ q: "MCA infarction commonly threatens:", a: "Perisylvian language cortex in the language-dominant hemisphere." }]
      },
      activity: "Match three short video descriptions (not supplied here) to likely lesion loci.",
      osce: "Point to inferior frontal gyrus and state one associated clinical syndrome, with caution."
    },
    {
      id: "M13",
      title: "Vascular supply and CSF",
      scene: "brain",
      first: "Semester 4 / 6",
      papers: "B4.3, B6.1",
      tags: ["Stroke"],
      summary: "Circle of Willis, MCA language territory, meninges and CSF.",
      outcomesUG: ["Name the artery most often implicated in aphasia after stroke."],
      outcomesPG: ["Distinguish cortical MCA language signs from brainstem vascular syndromes."],
      structures: ["Internal carotid", "MCA", "Circle of Willis", "Meninges"],
      physiology: "Neurons fail within minutes of ischaemia; oedema and raised ICP add secondary injury.",
      clinic: "Stroke-related aphasia and dysarthria.",
      worksheet: {
        tasks: ["Shade MCA territory on a printed lateral brain."],
        mcq: [{ q: "The vessel most associated with classical perisylvian aphasia is:", a: "Middle cerebral artery." }]
      },
      activity: "Build a one-page stroke-to-communication table.",
      osce: "Identify the lateral fissure and name the artery in its depth."
    },
    {
      id: "M14",
      title: "Devices and surgical anatomy",
      scene: "cochlea",
      first: "Semester 5 / 6",
      papers: "B5.1, B6.3",
      tags: ["CI", "Laryngectomy"],
      summary: "Hearing-aid coupling, implantable devices and alaryngeal voice paths.",
      outcomesUG: ["Locate scala tympani as the usual CI array path."],
      outcomesPG: ["Contrast CI, ABI, bone-conduction implant and TEP anatomically."],
      structures: ["Scala tympani", "Cochlear nucleus (ABI)", "Mastoid implant site", "Stoma", "TEP tract"],
      physiology: "Devices restore a code or a sound path; they do not recreate a normal organ.",
      clinic: "Candidacy counselling and post-operative communication options.",
      worksheet: {
        tasks: ["State why ABI is considered when the nerve is not stimulable.", "List three alaryngeal options."],
        mcq: [{ q: "A conventional CI array is intended for:", a: "Scala tympani." }]
      },
      activity: "Role-play a five-minute candidacy explanation using the model only as a map.",
      osce: "Point to the intended CI scala and name one structure that must remain uninjured if possible."
    },
    {
      id: "M15",
      title: "Lifespan and diversity",
      scene: "larynx",
      first: "All semesters",
      papers: "B1.3, B5.1, B5.3",
      tags: ["Development"],
      summary: "Infant, adult and geriatric differences in larynx, ear and swallow.",
      outcomesUG: ["State two age-related differences in the larynx and one in the ear canal."],
      outcomesPG: ["Explain why infant ET orientation changes middle-ear risk."],
      structures: ["Infant larynx position", "Ageing vocal fold", "Paediatric EAC"],
      physiology: "Growth changes resonance, canal acoustics and swallow geometry.",
      clinic: "Pediatric audiology, ageing voice, paediatric dysphagia.",
      worksheet: {
        tasks: ["Compare infant and adult laryngeal height."],
        mcq: [{ q: "The infant larynx sits:", a: "Higher in the neck than the adult larynx." }]
      },
      activity: "Listen to age-contrasted voice samples from the B5.1 practicum list and name anatomical contributors.",
      osce: "Give one paediatric and one geriatric anatomical fact that changes assessment."
    },
    {
      id: "M16",
      title: "Clinical windows",
      scene: "ear",
      first: "Practicals",
      papers: "B1.5, B1.6, B4.2, B5.1",
      tags: ["Otoscopy", "OPME"],
      summary: "What the clinician actually sees: otoscopy, nasendoscopy path, stroboscopy view, OPME.",
      outcomesUG: ["Relate the 3D model to the view obtained with an otoscope."],
      outcomesPG: ["State limitations of each window."],
      structures: ["TM quadrants", "Glottis from above", "Velum from nasendoscopy"],
      physiology: "A clinical window is a projection, not the whole organ.",
      clinic: "Everyday diagnostics.",
      worksheet: {
        tasks: ["Draw TM quadrants and mark the cone of light."],
        mcq: [{ q: "The cone of light is typically seen in:", a: "The anteroinferior quadrant of a normal TM." }]
      },
      activity: "Switch clinic overlay and describe the view in one sentence.",
      osce: "Identify the handle of malleus on the TM view."
    }
  ]
};
