# ASLP Anatomy Studio

Browser-based 3D teaching studio for **B.ASLP (RCI 2024–25)** and postgraduate audiology / speech-language pathology.

Version 1.0 uses **educational schematic models** so the product can be opened immediately in any modern browser. It is not a surgical navigator and not a substitute for Complete Anatomy, temporal-bone dissection, or cadaver teaching.

## What is included

- 17 curriculum modules (M00–M16) mapped to RCI papers B1.3, B1.4, B2.4, B4.1–B4.3, B5.1–B5.3, B6.1–B6.3
- Six interactive 3D scenes: orientation, ear / temporal bone, cochlea, larynx, swallow, brain / CANS
- Layer toggles: surface, bone, muscle, membrane, nerve, vessel, physiology, clinic / device, labels, cut planes
- Physiology animations (glottal cycle, travelling wave, bolus path, CANS sequence, ossicular motion)
- UG and PG outcomes, worksheets, classroom activities, OSCE stations, viva frames
- Student notes stored in the browser (`localStorage`) and exportable as a logbook JSON file

## Open locally

No build step. From this folder:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173

## Deploy

### Vercel

- Framework preset: Other
- Build command: leave empty
- Output directory: `.`
- Do not upload `node_modules`

### Cloudflare Pages

- Build command: empty
- Output directory: `/`

## How students use it

1. Choose a module from the left rail or the home grid.
2. Orbit with drag, zoom with the wheel, toggle layers on the right.
3. Press **Play physiology** to run the animation for that scene.
4. Use **Workbook** for tasks and notes, **OSCE** for station prompts, **Exam** for viva structure.
5. Export the logbook before leaving a shared computer.

## Honest limits of v1

Scenes are didactic geometry (boxes, tubes, spirals, labelled landmarks). They teach location, layering and physiology timing. They do not replace photoreal dissection atlases. A later version can load glTF temporal-bone and laryngeal meshes in the same studio shell.
