// Teaching maps: mesh label matchers ↔ diagram region ids ↔ CT landmarks.
// Labels come from BodyParts3D / Z-Anatomy atlas names (see catalog ear/cochlea patterns).

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
  { id: "mgb", label: "Medial geniculate", match: ["medial geniculate"], role: "Auditory thalamus" }
];

function structuresFor(ids, pool) {
  const byId = new Map(pool.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/** Axial teaching CT landmark positions in normalised 0–1 view space (origin top-left). */
function earAxialLandmarks(focus = "middle") {
  // Stylised right temporal bone axial (teaching schematic).
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
    { id: "tragus", x: 0.74, y: 0.52, r: 0.03, slice: 0 }
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
      { id: "vestibular_nerve", x: 0.34, y: 0.40, r: 0.04, slice: 1 }
    ]);
  }
  return base;
}

const MAPS = {
  M06: {
    id: "M06",
    title: "External ear & temporal bone",
    ctTitle: "Teaching axial · temporal bone (schematic)",
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
  }
};

export const SPATIAL_MAPPED_MODULES = Object.keys(MAPS);

export function hasSpatialMap(moduleId) {
  return !!MAPS[moduleId];
}

export function getSpatialMap(moduleId) {
  return MAPS[moduleId] || null;
}

export function normalizeLabel(label) {
  return n(label);
}

export function structureIdForLabel(label, map) {
  if (!map || !label) return null;
  const key = n(label);
  if (!key) return null;
  let best = null;
  let bestLen = 0;
  for (const s of map.structures) {
    for (const m of s.match) {
      const mk = n(m);
      if (!mk) continue;
      if (key === mk || key.includes(mk) || mk.includes(key)) {
        if (mk.length >= bestLen) {
          best = s.id;
          bestLen = mk.length;
        }
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
  let bestLen = 0;
  for (const label of labels) {
    const key = n(label);
    for (const m of s.match) {
      const mk = n(m);
      if (!mk) continue;
      if (key === mk || key.includes(mk) || mk.includes(key)) {
        if (mk.length >= bestLen) {
          best = label;
          bestLen = mk.length;
        }
      }
    }
  }
  return best;
}

export function structureById(map, id) {
  return map && map.structures ? map.structures.find((s) => s.id === id) || null : null;
}
