#!/usr/bin/env python3
"""Build Student and Faculty familiarity booklets from live studio screenshots."""
from __future__ import annotations

from pathlib import Path

from fpdf import FPDF
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / "shots"
FONTS = ROOT / "fonts"
CACHE = ROOT / "_img"
CACHE.mkdir(exist_ok=True)

URL = "https://aslp-anatomy-studio.vercel.app"
INK = (29, 26, 19)
COPPER = (168, 85, 31)
AMBER = (176, 122, 72)
CREAM = (247, 243, 234)
PAPER = (252, 249, 242)
MUTED = (92, 84, 72)
LINE = (214, 205, 188)
SOFT = (236, 229, 216)
WHITE = (255, 255, 255)


def jpeg(name: str, max_w: int = 1600, quality: int = 82) -> Path:
    src = SHOTS / name
    dst = CACHE / (Path(name).stem + f"-{max_w}.jpg")
    im = Image.open(src).convert("RGB")
    if im.width > max_w:
        h = int(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.Resampling.LANCZOS)
    im.save(dst, "JPEG", quality=quality, optimize=True)
    return dst


def cover_art(name: str, size=(1240, 1754)) -> Path:
    dst = CACHE / f"cover-{Path(name).stem}.jpg"
    src = Image.open(SHOTS / name).convert("RGB")
    tw, th = size
    scale = max(tw / src.width, th / src.height)
    src = src.resize((int(src.width * scale), int(src.height * scale)), Image.Resampling.LANCZOS)
    left = (src.width - tw) // 2
    top = max(0, (src.height - th) // 6)
    crop = src.crop((left, top, left + tw, min(top + th, src.height)))
    if crop.height < th:
        pad = Image.new("RGB", size, INK)
        pad.paste(crop, (0, 0))
        crop = pad
    crop = ImageEnhance.Brightness(crop).enhance(0.42)
    crop = ImageEnhance.Color(crop).enhance(0.85)
    overlay = Image.new("RGB", size, INK)
    crop = Image.blend(crop, overlay, 0.28)
    crop.save(dst, "JPEG", quality=86, optimize=True)
    return dst


class Guide(FPDF):
    def __init__(self, kind: str):
        super().__init__(format="A4", unit="mm")
        self.kind = kind
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(16, 16, 16)
        self.add_font("Spectral", "", str(FONTS / "Spectral-Regular.ttf"))
        self.add_font("Spectral", "B", str(FONTS / "Spectral-Bold.ttf"))
        self.add_font("Spectral", "I", str(FONTS / "Spectral-Italic.ttf"))
        self.add_font("SpecSB", "", str(FONTS / "Spectral-SemiBold.ttf"))
        self.add_font("Lato", "", str(FONTS / "Lato-Regular.ttf"))
        self.add_font("Lato", "B", str(FONTS / "Lato-Bold.ttf"))
        self.add_font("Lato", "I", str(FONTS / "Lato-Italic.ttf"))
        self.add_font("LatoL", "", str(FONTS / "Lato-Light.ttf"))
        title = "ASLP Anatomy Studio — " + ("Student guide" if kind == "student" else "Faculty guide")
        self.set_title(title)
        self.set_author("Hemaraja Nayaka S")
        self.set_creator("ASLP Anatomy Studio")
        self.set_lang("en")

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*PAPER)
        self.rect(0, 0, 210, 297, "F")
        self.set_y(8)
        self.set_font("Lato", "", 8)
        self.set_text_color(*MUTED)
        left = "ASLP Anatomy Studio"
        right = "Student guide" if self.kind == "student" else "Faculty guide"
        self.cell(self.epw / 2, 6, left)
        self.cell(self.epw / 2, 6, right, align="R")
        self.set_draw_color(*LINE)
        self.set_line_width(0.2)
        self.line(16, 15, 210 - 16, 15)
        self.set_y(20)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-14)
        self.set_draw_color(*LINE)
        self.line(16, self.get_y(), 210 - 16, self.get_y())
        self.set_y(-12)
        self.set_font("Lato", "", 8)
        self.set_text_color(*MUTED)
        self.cell(self.epw / 2, 6, "Dedicated to The Precision Clinicians — 2026  ·  Yenepoya")
        self.cell(self.epw / 2, 6, str(self.page_no()), align="R")

    def kicker(self, text: str):
        self.set_font("Lato", "B", 8.5)
        self.set_text_color(*COPPER)
        self.cell(0, 5, text.upper(), new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def h1(self, text: str):
        self.set_font("Spectral", "B", 22)
        self.set_text_color(*INK)
        self.multi_cell(0, 9, text)
        self.ln(2)

    def h2(self, text: str):
        need = 16
        if self.get_y() + need > self.h - 22:
            self.add_page()
        self.ln(2)
        self.set_font("SpecSB", "", 14)
        self.set_text_color(*INK)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text: str, size=10.5, leading=5.4):
        self.set_font("Lato", "", size)
        self.set_text_color(*INK)
        self.multi_cell(0, leading, text)
        self.ln(1.6)

    def italic(self, text: str):
        self.set_font("Lato", "I", 10.5)
        self.set_text_color(*MUTED)
        self.multi_cell(0, 5.4, text)
        self.ln(1.4)

    def bullets(self, items):
        self.set_font("Lato", "", 10.5)
        self.set_text_color(*INK)
        for it in items:
            x = self.l_margin
            y = self.get_y()
            if y > self.h - 24:
                self.add_page()
                y = self.get_y()
            self.set_fill_color(*COPPER)
            self.circle(x + 1.6, y + 2.4, 0.7, "F")
            self.set_xy(x + 5, y)
            self.multi_cell(self.epw - 5, 5.3, it)
            self.ln(0.6)
        self.ln(1.2)

    def callout(self, title: str, text: str):
        if self.get_y() > self.h - 42:
            self.add_page()
        y = self.get_y()
        self.set_fill_color(*SOFT)
        self.set_draw_color(*LINE)
        self.rect(self.l_margin, y, self.epw, 2, "F")  # placeholder height, redraw after
        self.set_xy(self.l_margin + 4, y + 3)
        self.set_font("Lato", "B", 9)
        self.set_text_color(*COPPER)
        self.multi_cell(self.epw - 8, 5, title)
        self.set_x(self.l_margin + 4)
        self.set_font("Lato", "", 10)
        self.set_text_color(*INK)
        self.multi_cell(self.epw - 8, 5.2, text)
        h = self.get_y() - y + 3
        # redraw filled box behind — draw then rewrite is messy; use a simple top bar
        self.set_draw_color(*COPPER)
        self.set_line_width(0.7)
        self.line(self.l_margin, y, self.l_margin, y + h)
        self.set_line_width(0.2)
        self.ln(3)

    def figure(self, name: str, caption: str, width=None, max_h=92):
        path = jpeg(name)
        im = Image.open(path)
        w = width or self.epw
        h = w * im.height / im.width
        if h > max_h:
            h = max_h
            w = h * im.width / im.height
        if self.get_y() + h + 12 > self.h - 18:
            self.add_page()
        x = self.l_margin + (self.epw - w) / 2
        y = self.get_y()
        self.set_fill_color(*INK)
        self.rect(x - 0.6, y - 0.6, w + 1.2, h + 1.2, "F")
        self.image(str(path), x, y, w, h)
        self.set_y(y + h + 2)
        self.set_font("Lato", "I", 8.5)
        self.set_text_color(*MUTED)
        self.multi_cell(0, 4.2, caption, align="C")
        self.ln(2.5)

    def figures_row(self, items, max_h=88):
        """items: list of (filename, caption)"""
        n = len(items)
        gap = 4
        col_w = (self.epw - gap * (n - 1)) / n
        # measure
        dims = []
        for name, _ in items:
            path = jpeg(name, max_w=900)
            im = Image.open(path)
            h = col_w * im.height / im.width
            if h > max_h:
                h = max_h
                w = h * im.width / im.height
            else:
                w = col_w
            dims.append((path, w, h))
        row_h = max(d[2] for d in dims)
        cap_h = 14
        if self.get_y() + row_h + cap_h > self.h - 18:
            self.add_page()
        y0 = self.get_y()
        x = self.l_margin
        for (path, w, h), (_, cap) in zip(dims, items):
            xx = x + (col_w - w) / 2
            self.set_fill_color(*INK)
            self.rect(xx - 0.4, y0 - 0.4, w + 0.8, h + 0.8, "F")
            self.image(str(path), xx, y0, w, h)
            self.set_xy(x, y0 + row_h + 1.5)
            self.set_font("Lato", "I", 8)
            self.set_text_color(*MUTED)
            self.multi_cell(col_w, 3.8, cap, align="C")
            x += col_w + gap
        self.set_y(y0 + row_h + cap_h)
        self.ln(1)

    def cover(self, shot: str, kicker: str, title: str, subtitle: str, blurb: str):
        self.set_auto_page_break(auto=False)
        self.add_page()
        self.set_fill_color(*INK)
        self.rect(0, 0, 210, 297, "F")
        self.set_text_color(*AMBER)
        self.set_font("Lato", "B", 8.5)
        self.set_xy(18, 14)
        self.cell(174, 5, "AUDIOLOGY  &  SPEECH-LANGUAGE PATHOLOGY")
        self.set_text_color(*WHITE)
        self.set_font("Spectral", "B", 34)
        self.set_xy(18, 24)
        self.multi_cell(174, 14, title)
        self.set_font("Spectral", "I", 12)
        self.set_text_color(230, 214, 190)
        self.set_xy(18, 42)
        self.multi_cell(174, 6, subtitle)
        self.set_font("Lato", "B", 8.5)
        self.set_text_color(*AMBER)
        self.set_xy(18, 58)
        self.cell(174, 5, kicker.upper())

        path = jpeg(shot, max_w=1800, quality=86)
        im = Image.open(path)
        w = 190
        h = w * im.height / im.width
        if h > 172:
            h = 172
            w = h * im.width / im.height
        x = (210 - w) / 2
        y = 68
        self.set_fill_color(12, 11, 9)
        self.rect(x - 1.2, y - 1.2, w + 2.4, h + 2.4, "F")
        self.image(str(path), x, y, w, h)

        fy = min(y + h + 8, 252)
        self.set_xy(18, fy)
        self.set_font("Lato", "", 9.5)
        self.set_text_color(198, 188, 172)
        self.multi_cell(174, 5, blurb)
        self.set_xy(18, fy + 16)
        self.set_font("Lato", "", 8.5)
        self.set_text_color(*AMBER)
        self.cell(174, 4.5, "Concept and design  ·  Hemaraja Nayaka S")
        self.set_xy(18, fy + 22)
        self.set_text_color(160, 150, 136)
        self.cell(174, 4.5, "Dedicated to The Precision Clinicians — 2026  ·  Yenepoya")
        self.set_auto_page_break(auto=True, margin=18)

    def toc_line(self, num: str, title: str):
        self.set_font("Lato", "B", 9)
        self.set_text_color(*COPPER)
        self.cell(10, 7, num)
        self.set_font("Lato", "", 11)
        self.set_text_color(*INK)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")


def student() -> Path:
    g = Guide("student")
    g.cover(
        "desktop-home.png",
        "Student guide  ·  Product familiarity",
        "Student guide",
        "How to use the Anatomy Studio — a browser atlas for speech, hearing and swallowing.",
        "B.ASLP and MASLP  ·  RCI 2024–25  ·  Seventeen curriculum modules  ·  Open on a laptop, tablet or phone.",
    )

    g.add_page()
    g.kicker("01  ·  Welcome")
    g.h1("This is your dissection table in a browser.")
    g.body(
        "ASLP Anatomy Studio is a teaching atlas for Audiology and Speech-Language Pathology. "
        "It is built around the RCI 2024–25 syllabus: seventeen modules covering orientation, "
        "embryology, respiration, larynx, articulators, swallowing, the ear, cochlea, vestibular "
        "labyrinth, CANS, cranial nerves, brain, vessels, devices and clinical windows."
    )
    g.body(
        "You do not install anything. Open the studio on college Wi-Fi, in the hostel, or on your phone "
        "between clinics. The first visit downloads the 3D meshes; after that, modules open faster."
    )
    g.callout(
        "What this is not",
        "It is an educational atlas, not a surgical navigator, not a cadaver photograph and not a substitute "
        "for temporal-bone dissection or supervised clinical teaching. Use it to see, name, and connect "
        "structure to function — then take that language into the lab and the clinic.",
    )
    g.h2("Open the studio")
    g.bullets([
        f"Go to {URL} in Chrome, Edge, Safari or Firefox.",
        "Stay on Student (top right). Faculty mode is for teachers.",
        "On a slow laptop, tick Lite mode before you enter a module.",
        "Your notes stay in this browser. Export the logbook if you change computers.",
    ])
    g.italic("Bookmark the address. There is no login.")

    g.add_page()
    g.kicker("02  ·  Curriculum home")
    g.h1("Start from the home, then enter a module.")
    g.figure(
        "desktop-home.png",
        "Curriculum home on a laptop. Seventeen modules sit as tiles; the left rail lists the same set for search.",
        max_h=86,
    )
    g.body(
        "The home is the map of the course. Each tile shows the module code (M00–M16), the topic, "
        "and the RCI papers it serves. Click a tile — or a row in the left rail — to load that dissection."
    )
    g.bullets([
        "Search the left rail if you remember a paper (B1.4, B5.1) rather than a module name.",
        "Enter temporal bone studio jumps straight into M06, a good first dissection.",
        "Curriculum home always brings you back to this map.",
        "The footer name is a profile link. The right of the footer names this year’s batch.",
    ])

    g.add_page()
    g.kicker("03  ·  The 3D stage")
    g.h1("Orbit, zoom, then click a structure.")
    g.figure(
        "desktop-studio-ear.png",
        "Temporal bone studio (M06). Layers on the right; modules on the left; the mesh in the middle.",
        max_h=84,
    )
    g.h2("Hands on the specimen")
    g.bullets([
        "Drag on the canvas to orbit. Scroll or pinch to zoom. The camera keeps the specimen in view as you go in.",
        "Click the mesh itself, a floating name, or a row under Dissection parts — all three select the same structure.",
        "Reset scene returns the camera if you get lost.",
        "Right side / Left side flips paired organs (ear, cortex, cranial nerves).",
        "Photoreal is the wet-tissue look for identification. Atlas colours are flatter, useful for viva.",
    ])

    g.add_page()
    g.kicker("04  ·  Teaching notes")
    g.h1("Every label opens a note.")
    g.figure(
        "desktop-explain.png",
        "Clicking stapes isolates the ossicle and opens a teaching card: what it is, what it does, why it matters clinically.",
        max_h=84,
    )
    g.body(
        "The card on the stage and the same text in the right panel are one note. Close it with the × or Escape. "
        "Use it as a short briefing before you write your own sentence in the workbook."
    )
    g.bullets([
        "If labels overlap, turn Labels off in Layers, then pick the name from Dissection parts.",
        "On a phone, fewer labels are shown on purpose so the mesh stays readable. Open Learn for the full list.",
        "The note is a teaching aid, not a journal article. Follow it with the worksheet tasks.",
    ])

    g.add_page()
    g.kicker("05  ·  Layers, physiology, clinic")
    g.h1("Peel the specimen the way a class would.")
    g.figure(
        "desktop-clinic.png",
        "Clinic overlay on the temporal bone — devices and windows sit on the same anatomy you just labelled.",
        max_h=80,
    )
    g.h2("Layer toggles (right panel)")
    g.bullets([
        "Surface, bone/cartilage, muscle, membrane, nerve, vessel — switch tissue types on and off.",
        "Physiology — then press Play physiology for travelling wave, glottal cycle, bolus, CANS or respiration, depending on the module.",
        "Clinic / device — cochlear implant path, BTE, BAHA site, otoscope window, TEP/stoma and related overlays.",
        "Labels and Cut planes — names on the mesh, and a sagittal cut when you need a section.",
    ])
    g.callout(
        "A useful order",
        "Identify in Photoreal with all layers on → isolate one part → Play physiology → turn on Clinic overlay → write the clinical sentence.",
    )

    g.add_page()
    g.kicker("06  ·  Learn, workbook, OSCE, exam")
    g.h1("The right panel is your lab book.")
    g.figures_row([
        ("desktop-workbook.png", "Workbook — tasks, your note, a clinical sentence, and reveal-answer checks."),
        ("desktop-osce.png", "OSCE — 5-minute station, isolation, innervation, communication consequence."),
    ], max_h=70)
    g.bullets([
        "Learn lists undergraduate and postgraduate outcomes, structures, physiology and the clinical link for this module.",
        "Workbook is what you write. Notes stay in this browser until you export.",
        "OSCE is the station you will meet in class: isolate, name, give one communication consequence.",
        "Exam is a viva frame and a 5-mark skeleton (definition, relations, function, test, disorder).",
        "Export logbook (top bar) downloads a JSON file of your notes for the portfolio or for faculty.",
    ])

    g.add_page()
    g.kicker("07  ·  Across devices")
    g.h1("The same studio on a laptop, tablet and phone.")
    g.figures_row([
        ("phone-home.png", "Phone — curriculum home. Use the bottom bar: Modules, Home, Learn."),
        ("phone-studio.png", "Phone — the 3D stage fills the screen. Orbit with one finger, pinch to zoom."),
        ("phone-learn.png", "Phone — Learn slides in as a sheet. Workbook, OSCE and Exam sit here."),
    ], max_h=78)
    g.body(
        "Below about 1040 pixels the side rails become drawers. You never lose the mesh. "
        "Landscape on a phone is a good way to present a structure in a small group."
    )
    g.figure(
        "phone-landscape.png",
        "Landscape phone. The specimen stays centred; chrome gets out of the way.",
        max_h=48,
    )
    g.body(
        "A tablet behaves like a tall phone: drawers for modules and Learn, the 3D stage remaining the largest surface. "
        "Use it in a tutorial of three or four. The address is the same."
    )

    g.add_page()
    g.kicker("08  ·  A first session")
    g.h1("Twenty minutes on the temporal bone.")
    g.body("Use this once, then repeat the pattern on larynx, swallowing or CANS.")
    g.bullets([
        "1. Open the studio → Enter temporal bone studio (M06).",
        "2. Wait for the loader. Orbit until you see pinna, canal and ossicles.",
        "3. Click stapes (or malleus, incus). Read the teaching note.",
        "4. Toggle Bone / cartilage off and on so you see what the ossicle is sitting in.",
        "5. Press Play physiology if the travelling-wave overlay is offered; watch, then pause.",
        "6. Turn on Clinic overlay. Relate the device path to the structure you just named.",
        "7. Open Workbook. Write one identification note and one sentence: “If this structure fails, the patient will…”",
        "8. Export logbook at the end of the week, not at the end of every click.",
    ])
    g.h2("When the machine is slow")
    g.bullets([
        "Tick Lite mode, then reload.",
        "Close other tabs. Prefer a laptop for the first load of a module; phones are fine afterwards.",
        "If a mesh fails to appear, refresh once. College proxy sometimes holds the first download.",
    ])
    g.h2("Good habits")
    g.bullets([
        "Name the structure out loud before you open the note.",
        "Always add the clinical sentence. Anatomy without consequence does not travel into clinic.",
        "Do not screenshot as a substitute for the logbook. Faculty can ask for the export.",
        "This atlas does not replace your dissection record or your supervisor.",
    ])
    g.ln(4)
    g.set_font("Spectral", "I", 12)
    g.set_text_color(*COPPER)
    g.multi_cell(0, 6, "Open it. Orbit. Name it. Write the sentence.")
    g.ln(2)
    g.set_font("Lato", "", 9)
    g.set_text_color(*MUTED)
    g.multi_cell(
        0,
        4.8,
        f"{URL}\nMeshes: BodyParts3D / Z-Anatomy (CC BY-SA). Photoreal shading original to this studio.\n"
        "Concept and design · Hemaraja Nayaka S  ·  Dedicated to The Precision Clinicians — 2026, Yenepoya.",
    )

    out = ROOT / "ASLP-Student-Guide.pdf"
    g.output(str(out))
    return out


def faculty() -> Path:
    g = Guide("faculty")
    g.cover(
        "desktop-faculty.png",
        "Faculty guide  ·  Classroom use",
        "Faculty guide",
        "Teaching with the Anatomy Studio — lesson plans, print sheets and projector setups.",
        "RCI 2024–25  ·  Seventeen modules mapped to papers  ·  Same studio your students open on their phones.",
    )

    g.add_page()
    g.kicker("01  ·  Place in the course")
    g.h1("A shared specimen, not a replacement for the lab.")
    g.body(
        "The studio is the department’s common 3D atlas. Students arrive having already orbited the temporal bone; "
        "you spend contact time on relations, physiology and clinical consequence rather than on “where is the stapes”."
    )
    g.body(
        "It is aligned to B.ASLP (RCI 2024–25) and postgraduate teaching. Each module carries undergraduate and "
        "postgraduate outcomes, a worksheet, an OSCE station and a viva frame. Geometry is BodyParts3D / Z-Anatomy "
        "(CC BY-SA). Tissue look, device overlays and the curriculum layer are original to this studio."
    )
    g.callout(
        "Boundaries",
        "Educational atlas only. Not for surgical navigation, not a cadaver photograph, not affiliated with Elsevier "
        "Complete Anatomy. Keep that sentence in the first class so expectations stay honest.",
    )
    g.h2("Three rooms it is built for")
    g.bullets([
        "Lecture hall — Faculty mode, Lecture size, projector. One specimen, everyone names it together.",
        "Skill lab — one browser per pair, print labelling sheet from the view on screen, 60-minute plan.",
        "Own device — students revise on phone or tablet with the same modules and the same notes.",
    ])
    g.body(f"Address: {URL}  ·  No login. Notes live in the browser until Export logbook.")

    g.add_page()
    g.kicker("02  ·  Faculty workspace")
    g.h1("Switch to Faculty for the session file.")
    g.figure(
        "desktop-faculty.png",
        "Faculty workspace for M06. Session plan with minute-by-minute actions, UG/PG outcomes, studio setup and assessment blueprint.",
        max_h=88,
    )
    g.bullets([
        "Student / Faculty is the switch in the top bar. Students should stay on Student.",
        "The plan is generated from the active module: recall → identify → physiology → clinic → activity → OSCE.",
        "Set batch name and date in the workspace; they print onto every sheet.",
        "RCI mapping is a filterable table of all seventeen modules against papers and outcomes — print for the department file.",
    ])

    g.add_page()
    g.kicker("03  ·  Print sheets")
    g.h1("Capture the view, then put paper on the bench.")
    g.figure(
        "desktop-sheets.png",
        "Print sheets for the current module: labelling (with a live capture of the 3D view), dissection worksheet, OSCE card, lesson plan, RCI map. Student or faculty answer keys.",
        max_h=86,
    )
    g.body("Open the module, orbit to the view you want, then print. The labelling sheet stamps numbered pins on that exact screenshot.")
    g.bullets([
        "Labelling sheet — identification. One mark per name. Print faculty copy for the key.",
        "Dissection worksheet — studio tasks, check items, “If this structure fails…”",
        "OSCE station card — 5 minutes, examiner checklist 3 + 3 + 4.",
        "Lesson plan — the 60-minute table for the file and for a guest lecturer.",
        "RCI mapping — outcomes by paper, for BOS / IQAC / inspection.",
    ])

    g.add_page()
    g.kicker("04  ·  A sixty-minute class")
    g.h1("Use the built-in clock. Do not invent another.")
    g.figure(
        "desktop-studio-larynx.png",
        "Larynx and phonation (M03) on the projector. Photoreal look, labels on, parts list ready to isolate in turn.",
        max_h=78,
    )
    g.bullets([
        "0–5 min  Recall. Module open, all layers on, Photoreal. Three names from memory, no notes.",
        "5–20 min  Identification. Isolate each listed structure. Students label the printed sheet.",
        "20–32 min  Physiology. Physiology layer + Play physiology. One sentence on mechanism.",
        "32–42 min  Clinical link. Clinic / device overlay. Relate device or lesion to the structure.",
        "42–52 min  Activity. The module’s pair task — one answer per pair.",
        "52–60 min  Assessment. OSCE station on the projector. Sheets in. Logbook reminder.",
    ])
    g.callout(
        "OSCE rubric already in the panel",
        "3 marks correct isolation  ·  3 marks accurate label  ·  4 marks clinical sentence linked to the RCI paper. Total 10. Do not rewrite this in a separate spreadsheet unless the Board asks.",
    )

    g.add_page()
    g.kicker("05  ·  Teaching on the mesh")
    g.h1("The same clicks the student uses, slower, out loud.")
    g.figure(
        "desktop-explain.png",
        "A clicked ossicle with the teaching card. On a projector this is the “stop and name” moment.",
        max_h=78,
    )
    g.bullets([
        "Click the mesh, the floating label or Dissection parts — the note is the same. Students should learn all three routes.",
        "Photoreal for identification; Atlas colours when the viva needs a diagram, not a wet look.",
        "Cut planes for “what would an axial CT show”.",
        "Laterality for paired organs. Say left/right every time; it is the habit you want in reports.",
        "Tweaks → Lecture enlarges type for projection. Focus hides rails so the specimen is the only object.",
        "Lite mode if the lecture-hall PC is old. Tick it, reload, continue.",
    ])
    g.figure(
        "desktop-tweaks.png",
        "Tweaks drawer: theme (lab / ink / steel), teaching mode (studio / lecture / focus), chrome. Lecture is the projector preset.",
        max_h=62,
    )

    g.add_page()
    g.kicker("06  ·  Assessment and logbook")
    g.h1("Workbook in class, OSCE on the clock, export at the door.")
    g.figures_row([
        ("desktop-workbook.png", "Student workbook — tasks, note, clinical sentence, reveal-answer checks."),
        ("desktop-osce.png", "OSCE station as the student sees it. Same rubric as the printed card."),
    ], max_h=68)
    g.bullets([
        "Students write in the browser. There is no cloud account. Export logbook produces a JSON file they can mail or upload to the LMS.",
        "Treat the export as the lab record for that week. Paper sheets still go in the file for inspection.",
        "UG vs PG: the Learn tab lists both outcome sets. In a mixed room, give PG the extra relation or imaging question from the PG list.",
        "Exam tab is a viva frame, not an auto-scored test. Use it as the last five minutes, or as homework.",
    ])
    g.h2("RCI papers touched by the studio")
    g.body(
        "B1.3, B1.4, B2.2, B2.4, B4.1–B4.3, B5.1–B5.3, B6.1–B6.3 — as tagged on each module. "
        "Filter the mapping table by paper when a visiting examiner asks “where is B4.2”."
    )

    g.add_page()
    g.kicker("07  ·  Devices in the room")
    g.h1("One URL. Three shapes of glass.")
    g.figures_row([
        ("phone-modules.png", "Phone — module drawer. Students pick M-codes without losing the mesh."),
        ("phone-learn.png", "Phone — Learn / Workbook sheet over the stage."),
        ("tablet-home.png", "Tablet — curriculum home, usable in a tutorial of four."),
    ], max_h=78)
    g.body(
        "On phones and tablets the rails become drawers and a bottom dock: Modules, Home, Learn. "
        "Labels thin out so the specimen stays readable. Ask students in a large class to follow on their own device "
        "while you isolate on the projector — they click the same name, they see the same note."
    )
    g.figure(
        "phone-landscape.png",
        "Landscape phone for a bedside or corridor recap. Not a replacement for the lab PC, but it is the same atlas.",
        max_h=50,
    )
    g.h2("Suggested kit")
    g.bullets([
        "Lecture: HDMI from a laptop that has already loaded M06 once (meshes cached).",
        "Lab: 1 browser per two students, printed labelling sheet, one faculty key.",
        "Revision week: students on phones, you on Faculty mapping table to call papers.",
        "Guest class: print the lesson plan with batch and date filled.",
    ])

    g.add_page()
    g.kicker("08  ·  House style")
    g.h1("Keep the credit quiet. Keep the batch visible.")
    g.body(
        "Concept and design sits once, in the footer, with a link to the faculty profile. "
        "The right of the footer is dedicated to The Precision Clinicians — 2026, Yenepoya — this year’s first batch. "
        "Do not add a third credit on slides; point at the footer if someone asks."
    )
    g.h2("If something fails in class")
    g.bullets([
        "Mesh not appearing — refresh once; Lite mode; avoid the college download filter on the first visit of the day.",
        "Labels covering the specimen on a phone — that is expected; use Dissection parts or Learn.",
        "Zoom clipping — current build keeps the near plane on the specimen. If an old tab is open, hard-refresh.",
        "Print sheet blank figure — open the module and wait until parts are listed, then print.",
    ])
    g.h2("What to tell students on day one")
    g.bullets([
        "Bookmark the URL. No password.",
        "Read the Student guide (same site, Guides).",
        "Name it, then read the card, then write the sentence.",
        "Export logbook on Friday, not during the demo.",
        "This is not surgery and not Complete Anatomy. It is our atlas.",
    ])
    g.ln(6)
    g.set_font("Spectral", "I", 12)
    g.set_text_color(*COPPER)
    g.multi_cell(0, 6, "Open the module. Isolate. Play physiology. Print the sheet. Collect the sentence.")
    g.ln(3)
    g.set_font("Lato", "", 9)
    g.set_text_color(*MUTED)
    g.multi_cell(
        0,
        4.8,
        f"{URL}\nHemaraja Nayaka S  ·  Associate Professor, Audiology and Speech-Language Pathology\n"
        "Yenepoya Medical College Hospital, Mangaluru  ·  Profile: https://s.hemarajanayaka.workers.dev/\n"
        "Meshes: BodyParts3D / Z-Anatomy (CC BY-SA). Educational use only.\n"
        "Dedicated to The Precision Clinicians — 2026, Yenepoya.",
    )

    out = ROOT / "ASLP-Faculty-Guide.pdf"
    g.output(str(out))
    return out


if __name__ == "__main__":
    s = student()
    f = faculty()
    print("wrote", s, s.stat().st_size)
    print("wrote", f, f.stat().st_size)
