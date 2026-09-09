# Anatomy mesh attribution

**Concept and designed by Hemaraja Nayaka. S**

ASLP Anatomy Studio does **not** use Elsevier Complete Anatomy assets.
Dissection meshes come from open scientific atlases.
The photoreal look is original tissue shading (triplanar maps + PBR) applied
in the viewer. It is not a photograph of a cadaver and not a copy of any
commercial anatomy product.

## Male reconstructed anatomy (default)

- **BodyParts3D** — Database Center for Life Science (DBCLS), Japan  
  Licence: CC BY-SA 2.1 JP
- **Z-Anatomy** — libre 3D atlas derived from BodyParts3D  
  Licence: CC BY-SA 4.0 — https://www.z-anatomy.com/
- **Anatria3D** GLB packaging (Draco-compressed glTF, TA2 labels)  
  Licence: CC BY-SA 4.0  
  Source files: https://github.com/Nurkan1/Anatria-3D

## Redistributed copies in this repository

`anatomy/` holds unmodified copies of the nine Draco-compressed GLB meshes the
17 modules reference, plus `manifest.json`, mirrored from the Anatria3D
repository above so the studio does not depend on a third-party host staying
online. That project's `LICENSE` and `NOTICE` are mirrored alongside them,
unchanged.

These meshes remain under **CC BY-SA 4.0**. Anyone redistributing them, with or
without changes, must keep this attribution and license them under the same
terms. Share-alike covers the meshes themselves; it does not extend to the
original tissue shaders, overlays, curriculum data, or interface code here.

`js/catalog.js` reads `./anatomy/` first and falls back to the jsDelivr and
raw.githubusercontent copies if a local file is unavailable.

## Tissue appearance

Albedo maps and shaders in this studio are original. They are generated and
written for educational rendering of the open meshes above. They do not
reproduce Elsevier, 3D4Medical, BioDigital, or Zygote artwork.

## What this is not

These models are educational reconstructions. They are not cadaver photographs,
not a surgical navigator, and not a substitute for temporal-bone dissection,
stroboscopy, or supervised clinical teaching.

## Advanced Atlas (open link-outs)

These are **not** bundled as Elsevier/Netter plate packs. The studio links to open educational resources:

- **SPL Head & Neck Atlas** and **SPL Inner Ear Atlas** — Open Anatomy Project / Surgical Planning Lab (and DKFZ for inner ear). Viewer pages: https://www.openanatomy.org/atlas-pages/
- **OpenEar** — temporal bone CT/3D teaching resource, **CC BY 4.0** — https://doi.org/10.5281/zenodo.1473724
- **MIDA head–neck model** — multimodal imaging-based anatomical model, **CC0** via IT'IS / collaborators — https://itis.swiss/virtual-population/regional-human-models/mida-model (paper: https://doi.org/10.1371/journal.pone.0124126)

## Pathology teaching cards

Pathology entries are curated classroom patterns with optional link-outs. Prefer open, attributable sources:

- Mass Eye and Ear Otopathology Laboratory educational resources — https://masseyeandear.org/otopathology-laboratory/resources
- The Cancer Imaging Archive (TCIA) public collections — https://www.cancerimagingarchive.net/
- OpenEar DOI above for temporal-bone CT teaching context

Pathology cards are **not for diagnosis**, staging, or clinical decision-making. No commercial anatomy plate libraries are redistributed here.


## Spatial linked views (diagram + teaching CT)

SVG diagrams and greyscale CT-style panes in the Spatial workspace are **original educational schematics** drawn for this studio. They are not patient DICOM, not diagnostic imaging, and not copied from commercial atlases. Structure labels are matched to BodyParts3D / Z-Anatomy mesh names where possible; some teaching callouts (planes, scalae, otolith organs, RLN) have no dedicated mesh and link only within diagram/CT panes.
