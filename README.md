# ASLP Anatomy Studio

**Concept and designed by Hemaraja Nayaka. S**

Browser-based 3D teaching studio for **B.ASLP (RCI 2024–25)** and postgraduate audiology / speech-language pathology.

Version 1.3 is the complete curriculum studio: **17 RCI modules**, photoreal tissue shading on BodyParts3D / Z-Anatomy meshes, physiology animation, clinic/device overlays (CI path, BTE aid, BAHA site, otoscope window, TEP/stoma, ABI, MCA territory), on-model labels, and UG/PG worksheets plus OSCE stations.

This is not Elsevier Complete Anatomy, not cadaver photogrammetry, not a surgical navigator, and not a substitute for temporal-bone dissection or supervised clinical teaching.

## What is included

- 17 curriculum modules (M00–M16) mapped to RCI papers B1.3, B1.4, B2.4, B4.1–B4.3, B5.1–B5.3, B6.1–B6.3
- Selectable 3D parts: click a mesh, a floating label, or a name in **Dissection parts**
- Layer toggles: surface, bone, muscle, membrane, nerve, vessel, physiology, clinic/device, labels, cut plane
- Left / right laterality and Photoreal / Atlas colours
- Physiology overlays (glottal cycle, travelling wave, bolus, CANS, diaphragm)
- Clinic overlays for devices and windows (toggle **Clinic overlay**)
- UG and PG outcomes, worksheets, OSCE stations, viva frames
- Student notes in the browser and exportable logbook JSON
- **Spatial** workspace (student toolbar): linked diagram + educational CT schematic + live 3D for **all 17 RCI modules (M00–M16)**, with region-specific schematics, shared selection, and Fit / Focus / Zoom tools

## Studio sections

Top tabs (kept alongside Student / Faculty):

1. **RCI Core** — the 17 curriculum modules, study tools, and **Spatial** linked diagram / teaching CT / 3D for every module (M00–M16).
2. **Advanced Atlas** — open head & neck / ear resources with subsections (*Ear & temporal bone*, *Larynx & airway*, *Nose & sinuses*, *Pharynx / neck*). Cards link out to SPL Open Anatomy atlases, OpenEar (CC BY 4.0, Zenodo DOI), and MIDA (CC0). **No Netter / Elsevier assets.**
3. **Pathology** — curated, de-identified teaching cases (otology, larynx/voice, nose/sinus, H&N oncology examples) with teaching points and open link-outs (e.g. Mass Eye & Ear otopathology resources, TCIA, OpenEar). Teaching only — not for diagnosis.

## Pinna to Cortex (`/hearing-3d/`)

3D journey of one sound through the auditory system on real Z-Anatomy meshes (`hearing-3d/ear.glb`, extracted from the studio's GLBs): sound source and wavefronts, auricle and concha, ear-canal resonance (pressure particles), eardrum and ossicular chain motion, acoustic reflex arc, magnified cochlear spiral with travelling wave, organ of Corti with OHC motility and K⁺ influx, then spikes through the VIII nerve, CN, SOC, LL, IC, MGB to Heschl's gyrus, synchronised with the ABR. Stimuli 250 Hz–8 kHz and click, 40–100 dB SPL. Conditions: impacted wax, TM perforation, OME, otosclerosis, presbycusis, NIHL, dead region, vestibular schwannoma, each with the expected test battery. Ten guided chapters; works on phones.

## Devices in 3D (`/devices-3d/`)

Hearing devices on the same 3D anatomy: BTE (hook, tubing, earmould), RIC (wire, receiver, open dome), custom ITE / ITC / CIC / IIC at their canal depths, bone-conduction device (percutaneous or transcutaneous, vibration to both cochleae), active middle-ear implant (FMT on the incus), cochlear implant (processor, coil, receiver–stimulator, lead to the round window, 12-contact array in scala tympani with interleaved pulses and place mismatch) and auditory brainstem implant (paddle on the cochlear nucleus). Each device shows its signal chain and processing (WDRC input–output or channel-to-electrode mapping). Fourteen diagnoses map to first choice / suitable / consider / not indicated for every device, and the nerve activity reflects how well the route suits that ear. Teaching summary, not a fitting or candidacy protocol.

## 3D Labs hub (`/lab3d/`)

All 3D labs share one engine (`lab3d/engine.js`, `lab3d/lab.css`) and models extracted from Z-Anatomy (`lab3d/models/head.glb`, `brain.glb`, `vest.glb`). Each lab has chapters, a guided tour, labels, and a stacked layout on phones.

- **Vestibular & Balance** (`/vestibular-3d/`): semicircular canals (push–pull pairs, Ewald's laws) and otoliths in a magnified labyrinth that follows the head; the VOR on real vestibular, abducens and oculomotor nuclei and recti via the MLF; nystagmus with a live VNG trace and afferent firing bars; head impulse test; right posterior-canal BPPV with Dix–Hallpike and Epley (otoconia moving in the canal); disorder explorer (vestibular neuritis, Ménière's, central/stroke with HINTS, SCDS, bilateral vestibulopathy, vestibular migraine) with vHIT, caloric, VEMP and audiogram findings; compensation and rehabilitation.
- **Tinnitus** (`/tinnitus-3d/`): magnified organ of Corti showing OHC/IHC loss and synaptopathy for seven hearing profiles (hidden loss, NIHL, presbycusis, Ménière's, sudden SNHL, vestibular schwannoma, pulsatile); central gain along DCN–IC–MGB–A1 with an input-versus-spontaneous-activity model; tonotopic reorganisation on Heschl's gyrus; Jastreboff model, thalamocortical dysrhythmia and the distress / gating networks; somatosensory (trigeminal, C2) modulation; pulsatile, myoclonic and patulous-tube tinnitus; assessment with EHF audiogram, pitch/loudness match and THI grading; evidence-based management toggles. A short low-volume "Listen" example uses WebAudio.
- **Swallowing** (`/swallow-3d/`): oral, pharyngeal and oesophageal phases with hyolaryngeal excursion, epiglottic inversion, UES opening and bolus flow; brainstem swallowing centre; ten conditions (LMCA stroke, Wallenberg, Parkinson's, ALS, myasthenia, glossectomy, chemoradiation, supraglottic and total laryngectomy) with PAS, Yale residue, FOIS and IDDSI levels; VFSS and FEES views; management.
- **Speech & Articulation** (`/speech-3d/`): articulator rig (jaw, tongue, lips, velum, glottis) for English and standard Kannada phonemes, palatograms, VOT (Kannada four-way stop contrast), vowel charts, word sequences, articulation errors and a place–manner map. Recorded audio can be added as `speech-3d/audio/kn/<id>.mp3` and `speech-3d/audio/en/<id>.mp3`; the Play button appears automatically when a file exists.
- **Brain, Speech & Language** (`/brain-3d/`): speech motor network (DIVA), dual-stream language model, cognitive networks; aphasia explorer with lesions and WAB-style profiles; Mayo dysarthria types with DDK patterns; apraxia of speech with a differential table; RHD, TBI and dementia/PPA.

Clinical values in all labs are teaching approximations, not diagnostic or treatment protocols.

## Travelling Wave Lab (`/cochlea/`)

Standalone interactive cochlear mechanics model: uncoiled basilar membrane with Greenwood place map, organ of Corti cross-section, IHC receptor potential and auditory nerve spikes, excitation patterns and BM input–output function. Stimuli: pure tone, click, tone burst, two-tone (DPOAE 2f1–f2, upward spread of masking), speech (/a/, /i/, /u/, /s/). Cochlear status: normal, presbycusis, NIHL 4 kHz notch, dead region. Single self-contained HTML file; works on phones.

## How students use it

1. Open a module. The first load downloads atlas meshes (a few megabytes).
2. Orbit with drag, zoom with the wheel, click a structure to isolate it.
3. Toggle **Photoreal** for teaching colours, **Clinic overlay** for devices, **Labels** for names on the mesh.
4. Use **Right side / Left side** for paired organs.
5. Workbook / OSCE / Exam panels sit on the right.
6. Toggle **Spatial** for linked schematic diagram and teaching CT beside the same 3D canvas (all M00–M16). CT panes are labelled as educational schematics — not real patient scans.

On a phone or tablet the 3D stage stays full-screen. Use the bottom bar: **Modules**, **Home**, **Learn**. Type and spacing scale with the viewport; layer and part buttons are sized for touch.

Printed familiarity booklets (live screenshots):

- [Student guide (PDF)](./guides/ASLP-Student-Guide.pdf)
- [Faculty guide (PDF)](./guides/ASLP-Faculty-Guide.pdf)


## Source of the 3D meshes

See [ATTRIBUTION.md](./ATTRIBUTION.md). Geometry is streamed from the Anatria3D / Z-Anatomy packaging of BodyParts3D. Tissue appearance and device overlays are original to this studio.

## Deploy

Static files. Vercel / Cloudflare: no build command, output `.`

## Hearing and device lessons

- `/hearing/`: staged sound transmission from outer ear to brain.
- `/hearing-aids/`: BTE, RIC, ITE, ITC and CIC placement schematics, use and acoustic amplification pathway.
- `/cochlear-implant/`: external/internal components, electrode schematic and electrical stimulation pathway.

Shared presentation and controls live in `css/hearing.css` and `js/hearing.js`. Lessons include manual stage selection, play/pause/reset, knowledge checks, source links, keyboard controls, responsive layouts and reduced-motion support. Diagrams are original conceptual SVGs, not anatomical or surgical models. No build or additional dependencies are required.
