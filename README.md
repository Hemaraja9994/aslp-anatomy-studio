# ASLP Anatomy Studio

Browser-based 3D teaching studio for **B.ASLP (RCI 2024–25)** and postgraduate audiology / speech-language pathology.

Version 1.2 loads **reconstructed dissection meshes** (BodyParts3D / Z-Anatomy, CC BY-SA) and paints them with **photoreal tissue shaders** — wet muscle, cortical bone, hyaline cartilage, nerve, mucosa and pinna skin. Toggle **Photoreal / Atlas colours** for exam labelling.

This is not Elsevier Complete Anatomy, not cadaver photogrammetry, not a surgical navigator, and not a substitute for temporal-bone dissection or supervised clinical teaching.

## What is included

- 17 curriculum modules (M00–M16) mapped to RCI papers B1.3, B1.4, B2.4, B4.1–B4.3, B5.1–B5.3, B6.1–B6.3
- Selectable 3D parts: click a mesh or a name in **Dissection parts** to isolate it
- Layer toggles: surface, bone, muscle, membrane, nerve, vessel, physiology
- Left / right laterality
- Photoreal cadaver look (triplanar tissue maps + subsurface-style PBR) or teaching atlas colours
- Physiology overlays on the real anatomy (glottal cycle, travelling wave, bolus, CANS sequence)
- UG and PG outcomes, worksheets, OSCE stations, viva frames
- Student notes in the browser and exportable logbook JSON

## How students use it

1. Open a module. The first load downloads atlas meshes (a few megabytes).
2. Orbit with drag, zoom with the wheel, click a structure to isolate it.
3. Toggle **Photoreal** if you need labelled teaching colours for a viva.
4. Toggle layers. Use **Right side / Left side** for paired organs.
5. Workbook / OSCE / Exam panels sit on the right.

## Source of the 3D meshes

See [ATTRIBUTION.md](./ATTRIBUTION.md). Geometry is streamed from the Anatria3D / Z-Anatomy packaging of BodyParts3D. Tissue appearance is original shading in this studio, not Elsevier IP.

## Deploy

Static files. Vercel / Cloudflare: no build command, output `.`
