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
- **Spatial** workspace (student toolbar): linked diagram + educational CT schematic + live 3D for M06–M08 (ear / middle ear / cochlea), with shared selection and Fit / Focus / Zoom tools

## How students use it

1. Open a module. The first load downloads atlas meshes (a few megabytes).
2. Orbit with drag, zoom with the wheel, click a structure to isolate it.
3. Toggle **Photoreal** for teaching colours, **Clinic overlay** for devices, **Labels** for names on the mesh.
4. Use **Right side / Left side** for paired organs.
5. Workbook / OSCE / Exam panels sit on the right.
6. Toggle **Spatial** for linked schematic diagram and teaching CT beside the same 3D canvas (strongest on M06–M08). CT panes are labelled as educational schematics — not real patient scans.

On a phone or tablet the 3D stage stays full-screen. Use the bottom bar: **Modules**, **Home**, **Learn**. Type and spacing scale with the viewport; layer and part buttons are sized for touch.

Printed familiarity booklets (live screenshots):

- [Student guide (PDF)](./guides/ASLP-Student-Guide.pdf)
- [Faculty guide (PDF)](./guides/ASLP-Faculty-Guide.pdf)


## Source of the 3D meshes

See [ATTRIBUTION.md](./ATTRIBUTION.md). Geometry is streamed from the Anatria3D / Z-Anatomy packaging of BodyParts3D. Tissue appearance and device overlays are original to this studio.

## Deploy

Static files. Vercel / Cloudflare: no build command, output `.`
