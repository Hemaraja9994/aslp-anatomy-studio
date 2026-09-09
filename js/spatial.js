import {
  hasSpatialMap,
  getSpatialMap,
  structureIdForLabel,
  findMeshLabelForStructure,
  structureById,
  SPATIAL_MAPPED_MODULES
} from "./spatial-maps.js";

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/** View transform for 2D panes (diagram / CT). */
function makeView2D() {
  return { scale: 1, x: 0, y: 0 };
}

function applyViewTransform(el, view) {
  if (!el) return;
  el.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

function bindPanZoom(viewport, content, view, onChange) {
  let dragging = false;
  let last = null;
  let pointers = new Map();

  const emit = () => {
    applyViewTransform(content, view);
    if (onChange) onChange(view);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const prev = view.scale;
    const next = clamp(prev * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.55, 4.5);
    const k = next / prev;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.scale = next;
    emit();
  };

  viewport.addEventListener("wheel", onWheel, { passive: false });

  viewport.addEventListener("pointerdown", (e) => {
    if (e.target.closest("[data-spatial-id], button, a")) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      viewport.setPointerCapture(e.pointerId);
    }
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prevPt = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      // Approximate pinch using previous midpoint distance stored on viewport.
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dNow = dist(pts[0], pts[1]);
      const dPrev = viewport._pinchDist || dNow;
      const rect = viewport.getBoundingClientRect();
      const cx = mid.x - rect.left;
      const cy = mid.y - rect.top;
      if (dPrev > 8) {
        const next = clamp(view.scale * (dNow / dPrev), 0.55, 4.5);
        const k = next / view.scale;
        view.x = cx - (cx - view.x) * k;
        view.y = cy - (cy - view.y) * k;
        view.scale = next;
        emit();
      }
      viewport._pinchDist = dNow;
      dragging = false;
      return;
    }

    if (!dragging || !last) return;
    view.x += e.clientX - last.x;
    view.y += e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    emit();
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) viewport._pinchDist = 0;
    if (pointers.size === 0) {
      dragging = false;
      last = null;
    }
  };
  viewport.addEventListener("pointerup", end);
  viewport.addEventListener("pointercancel", end);
  viewport.addEventListener("lostpointercapture", end);

  return { reset() { view.scale = 1; view.x = 0; view.y = 0; emit(); }, emit };
}

function svgShell(title, aria, viewBox, body) {
  return `
<svg viewBox="${viewBox}" class="spatial-svg" role="img" aria-label="${aria}">
  <rect width="100%" height="100%" fill="#1a1511"/>
  <text x="16" y="28" class="spatial-svg-title">${title}</text>
  ${body}
</svg>`;
}

const LABEL_STYLE = `fill="#e8dcc8" font-size="11" font-family="Archivo, system-ui, sans-serif"`;

function diagramSvg(kind, map) {
  if (kind === "external_ear") {
    return svgShell("External ear (schematic)", "External ear schematic", "0 0 320 360", `
  <g fill="none" stroke="#c4a882" stroke-width="2.2">
    <path data-spatial-id="helix" class="spatial-region" d="M210 48c48 12 70 70 62 128-6 44-34 78-78 96" />
    <path data-spatial-id="antihelix" class="spatial-region" d="M188 96c28 18 40 48 34 84-4 28-22 48-48 58" />
    <path data-spatial-id="concha" class="spatial-region" d="M150 150c28-6 48 10 52 34s-14 42-40 46c-30 4-52-18-48-42 4-22 18-34 36-38z" fill="#2a221c" stroke="#d7b48a"/>
    <path data-spatial-id="tragus" class="spatial-region" d="M118 168c8-16 22-18 30-8 6 8 2 22-10 28-14 6-24-4-20-20z" fill="#3a2f26"/>
    <path data-spatial-id="antitragus" class="spatial-region" d="M168 214c12 2 20 14 14 24-8 10-22 8-28-2-6-10 2-24 14-22z" fill="#3a2f26"/>
    <path data-spatial-id="lobule" class="spatial-region" d="M150 268c18 4 34 22 28 42-8 18-34 22-48 8-12-14-6-40 20-50z" fill="#4a352c"/>
    <path data-spatial-id="eac" class="spatial-region" d="M96 176h44" stroke-width="6" stroke-linecap="round"/>
  </g>
  <circle data-spatial-id="tm" class="spatial-region" cx="78" cy="176" r="14" fill="#5a4030" stroke="#e2b15a" stroke-width="2"/>
  <path data-spatial-id="mastoid" class="spatial-region" d="M54 200c-18 20-16 54 8 70 18 12 40 6 48-12" fill="none" stroke="#8a7a62" stroke-width="2"/>
  <path data-spatial-id="temporal" class="spatial-region" d="M40 90c-20 40-18 110 10 150" fill="none" stroke="#6a5a48" stroke-width="1.6" stroke-dasharray="4 3"/>
  <g ${LABEL_STYLE}>
    <text x="232" y="70">Helix</text><text x="210" y="130">Antihelix</text><text x="188" y="178">Concha</text>
    <text x="96" y="152">Tragus</text><text x="188" y="246">Antitragus</text><text x="168" y="320">Lobule</text>
    <text x="108" y="200">EAC</text><text x="40" y="170">TM</text><text x="20" y="260">Mastoid</text>
  </g>`);
  }

  if (kind === "middle_ear") {
    return svgShell("Middle ear transformer (schematic)", "Middle ear schematic", "0 0 340 320", `
  <g stroke="#c4a882" stroke-width="2" fill="none">
    <ellipse data-spatial-id="tm" class="spatial-region" cx="70" cy="160" rx="18" ry="42" fill="#5a4030" stroke="#e2b15a"/>
    <path data-spatial-id="malleus" class="spatial-region" d="M78 130l36 18-8 44" stroke-width="5" stroke-linecap="round" stroke="#f0e2b8"/>
    <path data-spatial-id="incus" class="spatial-region" d="M112 148l28 8 4 36" stroke-width="4.5" stroke-linecap="round" stroke="#e8d4a0"/>
    <path data-spatial-id="stapes" class="spatial-region" d="M144 190h22m-22 0l8-10m14 10l-8-10m-6 10v14" stroke-width="3.2" stroke="#ddc57e"/>
    <ellipse data-spatial-id="cochlea" class="spatial-region" cx="210" cy="200" rx="36" ry="28" fill="#3a2a28" stroke="#d08a7a"/>
    <circle data-spatial-id="vestibule" class="spatial-region" cx="178" cy="168" r="16" fill="#2e3438" stroke="#7ec8ff"/>
    <path data-spatial-id="auditory_tube" class="spatial-region" d="M90 210c40 30 90 40 140 28" stroke="#8ab4a0" stroke-dasharray="5 4"/>
    <path data-spatial-id="facial" class="spatial-region" d="M160 120c20-10 40-8 54 8" stroke="#f2c9a4"/>
    <path data-spatial-id="eac" class="spatial-region" d="M20 160h32" stroke-width="8" stroke-linecap="round"/>
    <path data-spatial-id="mastoid" class="spatial-region" d="M100 230c10 30 4 50-16 60" stroke="#8a7a62"/>
    <rect data-spatial-id="temporal" class="spatial-region" x="40" y="70" width="240" height="200" rx="18" stroke="#6a5a48" stroke-dasharray="5 4" fill="rgba(40,32,26,.35)"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="48" y="108">TM</text><text x="96" y="118">Malleus</text><text x="130" y="140">Incus</text>
    <text x="150" y="220">Stapes</text><text x="196" y="246">Cochlea</text><text x="150" y="158">Vestibule</text>
    <text x="150" y="270">Auditory tube</text><text x="190" y="112">VII</text>
  </g>`);
  }

  if (kind === "cochlea") {
    return svgShell("Cochlea (schematic · unrolled place map)", "Cochlea schematic", "0 0 340 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <path data-spatial-id="cochlea" class="spatial-region" d="M170 170m-10,0 a10,10 0 1,0 20,0 a16,16 0 1,0 -32,0 a24,24 0 1,0 48,0 a34,34 0 1,0 -68,0 a46,46 0 1,0 92,0" stroke="#d08a7a" stroke-width="3.5" fill="rgba(80,40,36,.25)"/>
    <circle data-spatial-id="vestibule" class="spatial-region" cx="112" cy="150" r="22" fill="#2e3438" stroke="#7ec8ff"/>
    <path data-spatial-id="stapes" class="spatial-region" d="M86 150h18m0 0l-6-8m6 8l-6 8" stroke="#ddc57e" stroke-width="3"/>
    <path data-spatial-id="cochlear_nerve" class="spatial-region" d="M170 170c-40 8-70 4-96-10" stroke="#f2c9a4" stroke-width="3.2"/>
    <path data-spatial-id="cn8" class="spatial-region" d="M70 150c-28-4-48-2-58 10" stroke="#e8dcc8" stroke-width="2.4"/>
    <path data-spatial-id="facial" class="spatial-region" d="M96 120c-20-16-40-18-58-10" stroke="#c9a882"/>
    <rect data-spatial-id="temporal" class="spatial-region" x="48" y="70" width="240" height="200" rx="16" stroke="#6a5a48" stroke-dasharray="5 4" fill="rgba(40,32,26,.28)"/>
    <path data-spatial-id="cochlear_nuclei" class="spatial-region" d="M36 200h28v24H36z" fill="#3a2f4a" stroke="#b7a0e0"/>
    <circle data-spatial-id="inferior_colliculus" class="spatial-region" cx="48" cy="250" r="12" fill="#2a3840" stroke="#7ec8ff"/>
    <circle data-spatial-id="mgb" class="spatial-region" cx="48" cy="280" r="10" fill="#2a3840" stroke="#9ad0ff"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="186" y="120">Cochlea · base = high f</text><text x="186" y="138">apex = low f</text>
    <text x="88" y="140">Vestibule</text><text x="100" y="188">Cochlear n.</text>
    <text x="16" y="190">VIII</text><text x="70" y="108">VII</text>
    <text x="70" y="216">Nuclei</text><text x="66" y="254">IC</text><text x="64" y="284">MGB</text>
  </g>`);
  }

  if (kind === "orientation") {
    return svgShell("Anatomical planes (schematic)", "Orientation planes schematic", "0 0 340 340", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <rect data-spatial-id="frontal" class="spatial-region" x="110" y="50" width="120" height="50" rx="8" fill="rgba(60,80,100,.35)" stroke="#7ec8ff"/>
    <ellipse data-spatial-id="temporal" class="spatial-region" cx="230" cy="150" rx="28" ry="40" fill="rgba(90,70,50,.4)" stroke="#d7b48a"/>
    <path data-spatial-id="maxilla" class="spatial-region" d="M140 170h60v36h-60z" fill="rgba(80,60,50,.35)" stroke="#c4a882"/>
    <path data-spatial-id="mandible" class="spatial-region" d="M130 220h80l-10 40h-60z" fill="rgba(70,55,45,.4)" stroke="#c4a882"/>
    <circle data-spatial-id="hyoid" class="spatial-region" cx="170" cy="280" r="14" fill="rgba(90,80,60,.4)" stroke="#e2b15a"/>
    <line data-spatial-id="sagittal" class="spatial-region" x1="170" y1="40" x2="170" y2="300" stroke="#7ec8ff" stroke-width="3" stroke-dasharray="6 4"/>
    <line data-spatial-id="coronal" class="spatial-region" x1="80" y1="150" x2="260" y2="150" stroke="#3db8b0" stroke-width="3" stroke-dasharray="6 4"/>
    <line data-spatial-id="transverse" class="spatial-region" x1="90" y1="200" x2="250" y2="200" stroke="#e2b15a" stroke-width="3" stroke-dasharray="6 4"/>
    <circle data-spatial-id="superior" class="spatial-region" cx="170" cy="36" r="10" fill="#7ec8ff"/>
    <circle data-spatial-id="anterior" class="spatial-region" cx="270" cy="150" r="10" fill="#3db8b0"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="16" y="80">Frontal</text><text x="250" y="120">Temporal</text>
    <text x="16" y="160">Sagittal</text><text x="16" y="210">Transverse</text>
    <text x="250" y="170">Coronal</text><text x="200" y="300">Hyoid</text>
    <text x="140" y="24">Superior</text><text x="278" y="154">Anterior</text>
  </g>`);
  }

  if (kind === "embryology") {
    return svgShell("Embryology · arches & otocyst (schematic)", "Embryology schematic", "0 0 340 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <path data-spatial-id="arch1" class="spatial-region" d="M60 80c40 10 70 40 80 90" stroke="#e2b15a" stroke-width="8" stroke-linecap="round"/>
    <path data-spatial-id="arch2" class="spatial-region" d="M60 120c36 14 60 44 68 84" stroke="#d08a7a" stroke-width="7" stroke-linecap="round"/>
    <ellipse data-spatial-id="otic" class="spatial-region" cx="220" cy="140" rx="36" ry="28" fill="rgba(80,40,60,.35)" stroke="#d08a7a"/>
    <path data-spatial-id="pouch1" class="spatial-region" d="M140 160c40 20 70 24 100 10" stroke="#8ab4a0" stroke-dasharray="5 4"/>
    <path data-spatial-id="pinna" class="spatial-region" d="M280 100c20 10 28 40 18 70-8 22-30 34-48 28" stroke="#c4a882"/>
    <rect data-spatial-id="palate" class="spatial-region" x="100" y="230" width="140" height="28" rx="8" fill="rgba(60,50,40,.4)" stroke="#c4a882"/>
    <circle data-spatial-id="tm" class="spatial-region" cx="170" cy="170" r="12" fill="#5a4030" stroke="#e2b15a"/>
    <rect data-spatial-id="temporal" class="spatial-region" x="160" y="90" width="120" height="110" rx="14" stroke="#6a5a48" stroke-dasharray="5 4" fill="rgba(40,32,26,.2)"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="16" y="70">Arch 1</text><text x="16" y="130">Arch 2</text>
    <text x="200" y="120">Otic placode</text><text x="150" y="210">1st pouch / tube</text>
    <text x="250" y="90">Pinna hillocks</text><text x="130" y="280">Palatal shelves</text>
  </g>`);
  }

  if (kind === "chest") {
    return svgShell("Chest · speech breathing (schematic)", "Chest respiratory schematic", "0 0 340 340", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <path data-spatial-id="ribs" class="spatial-region" d="M70 60c-20 40-24 100-10 150M270 60c20 40 24 100 10 150" stroke="#8a7a62"/>
    <path data-spatial-id="sternum" class="spatial-region" d="M160 50v120" stroke="#e2b15a" stroke-width="6" stroke-linecap="round"/>
    <ellipse data-spatial-id="lung_r" class="spatial-region" cx="110" cy="140" rx="48" ry="70" fill="rgba(90,50,50,.35)" stroke="#d08a7a"/>
    <ellipse data-spatial-id="lung_l" class="spatial-region" cx="230" cy="140" rx="44" ry="68" fill="rgba(90,50,50,.35)" stroke="#d08a7a"/>
    <path data-spatial-id="trachea" class="spatial-region" d="M170 40v70" stroke="#7ec8ff" stroke-width="5" stroke-linecap="round"/>
    <path data-spatial-id="diaphragm" class="spatial-region" d="M70 230c40-40 160-40 200 0" stroke="#3db8b0" stroke-width="4"/>
    <path data-spatial-id="intercostal" class="spatial-region" d="M78 100h24M78 130h28M78 160h24" stroke="#c4a882"/>
    <ellipse data-spatial-id="abdomen" class="spatial-region" cx="170" cy="290" rx="70" ry="28" fill="rgba(50,40,35,.35)" stroke="#a89070"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="150" y="36">Trachea</text><text x="70" y="120">R lung</text><text x="230" y="120">L lung</text>
    <text x="150" y="180">Sternum</text><text x="120" y="250">Diaphragm</text>
    <text x="40" y="150">Intercostals</text><text x="140" y="310">Abdomen</text>
  </g>`);
  }

  if (kind === "larynx" || kind === "lifespan") {
    const title = kind === "lifespan"
      ? "Lifespan larynx (schematic · infant higher)"
      : "Larynx & phonation (schematic)";
    return svgShell(title, "Larynx schematic", "0 0 340 340", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <ellipse data-spatial-id="hyoid" class="spatial-region" cx="170" cy="50" rx="50" ry="12" fill="rgba(90,80,60,.35)" stroke="#e2b15a"/>
    <path data-spatial-id="epiglottis" class="spatial-region" d="M170 70c-8 24-6 40 0 52c6-12 8-28 0-52z" fill="rgba(200,150,130,.35)" stroke="#e0b7a4"/>
    <path data-spatial-id="thyroid" class="spatial-region" d="M110 110c20-20 100-20 120 0v50c-20 24-100 24-120 0z" fill="rgba(90,75,55,.35)" stroke="#d7c4a3"/>
    <rect data-spatial-id="folds" class="spatial-region" x="130" y="145" width="80" height="14" rx="4" fill="#c45c6a" stroke="#e2b15a"/>
    <circle data-spatial-id="arytenoid" class="spatial-region" cx="150" cy="165" r="10" fill="#c4aa7a"/><circle data-spatial-id="arytenoid" class="spatial-region" cx="190" cy="165" r="10" fill="#c4aa7a"/>
    <ellipse data-spatial-id="cricoid" class="spatial-region" cx="170" cy="210" rx="42" ry="22" fill="rgba(80,70,50,.35)" stroke="#cbb48d"/>
    <path data-spatial-id="trachea" class="spatial-region" d="M150 235h40v70h-40z" fill="rgba(200,180,150,.2)" stroke="#e8d3b0"/>
    <path data-spatial-id="pca" class="spatial-region" d="M200 170c16 8 22 20 18 34" stroke="#3db8b0" stroke-width="3"/>
    <path data-spatial-id="lca" class="spatial-region" d="M140 155c-14 6-20 16-16 28" stroke="#7ec8ff" stroke-width="3"/>
    <path data-spatial-id="ct" class="spatial-region" d="M230 130c20 20 24 40 10 60" stroke="#f2c9a4" stroke-width="3"/>
    <path data-spatial-id="rln" class="spatial-region" d="M240 250c-20-30-30-60-20-90" stroke="#f0d24a" stroke-width="2.5"/>
    ${kind === "lifespan" ? '<text x="16" y="320" fill="#e2b15a" font-size="11" font-family="Archivo, system-ui, sans-serif">Infant larynx sits higher in the neck</text>' : ""}
  </g>
  <g ${LABEL_STYLE}>
    <text x="230" y="54">Hyoid</text><text x="210" y="100">Epiglottis</text>
    <text x="16" y="140">Thyroid</text><text x="16" y="158">Folds</text>
    <text x="16" y="220">Cricoid</text><text x="200" y="280">Trachea</text>
    <text x="250" y="190">PCA</text><text x="250" y="240">RLN</text>
  </g>`);
  }

  if (kind === "articulators" || kind === "swallow") {
    const title = kind === "articulators"
      ? "Articulators & VP port (schematic)"
      : "Swallow stages (schematic)";
    return svgShell(title, "Swallow / articulators schematic", "0 0 360 340", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <ellipse data-spatial-id="lips" class="spatial-region" cx="280" cy="90" rx="18" ry="22" fill="rgba(200,140,130,.4)" stroke="#e0b7a4"/>
    <ellipse data-spatial-id="tongue" class="spatial-region" cx="210" cy="140" rx="55" ry="28" fill="rgba(180,70,80,.35)" stroke="#c45c6a"/>
    <path data-spatial-id="hard_palate" class="spatial-region" d="M160 70h100" stroke="#d7b48a" stroke-width="5" stroke-linecap="round"/>
    <path data-spatial-id="velum" class="spatial-region" d="M150 78c-20 8-30 28-22 48" stroke="#3db8b0" stroke-width="4"/>
    <ellipse data-spatial-id="nasopharynx" class="spatial-region" cx="120" cy="70" rx="24" ry="20" fill="rgba(60,80,90,.3)" stroke="#7ec8ff"/>
    <path data-spatial-id="oropharynx" class="spatial-region" d="M140 120c-10 30-8 60 0 90" stroke="#d4a090" stroke-width="10" stroke-linecap="round"/>
    <path data-spatial-id="laryngopharynx" class="spatial-region" d="M145 210c-4 24 0 40 8 55" stroke="#c49080" stroke-width="8" stroke-linecap="round"/>
    <path data-spatial-id="epiglottis" class="spatial-region" d="M170 200c-6 16-4 28 4 36" stroke="#e0b7a4" stroke-width="3"/>
    <circle data-spatial-id="hyoid" class="spatial-region" cx="190" cy="220" r="12" fill="rgba(90,80,60,.4)" stroke="#e2b15a"/>
    <ellipse data-spatial-id="ues" class="spatial-region" cx="155" cy="270" rx="16" ry="10" fill="rgba(120,60,60,.4)" stroke="#d08a7a"/>
    <path data-spatial-id="oesophagus" class="spatial-region" d="M155 280v40" stroke="#b97878" stroke-width="6" stroke-linecap="round"/>
    <path data-spatial-id="mandible" class="spatial-region" d="M220 160h70v30h-50z" fill="rgba(70,55,45,.35)" stroke="#c4a882"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="270" y="70">Lips</text><text x="200" y="130">Tongue</text>
    <text x="180" y="60">Hard palate</text><text x="70" y="100">Velum</text>
    <text x="40" y="70">NP</text><text x="40" y="170">OP</text>
    <text x="40" y="240">LP</text><text x="180" y="250">Hyoid</text>
    <text x="180" y="280">UES</text><text x="170" y="330">Oesophagus</text>
  </g>`);
  }

  if (kind === "vestibular") {
    return svgShell("Vestibular labyrinth (schematic)", "Vestibular labyrinth schematic", "0 0 340 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <circle data-spatial-id="vestibule" class="spatial-region" cx="170" cy="160" r="36" fill="#2e3438" stroke="#7ec8ff"/>
    <ellipse data-spatial-id="scc" class="spatial-region" cx="170" cy="100" rx="40" ry="18" stroke="#9ad0ff" stroke-width="5"/>
    <ellipse data-spatial-id="scc" class="spatial-region" cx="120" cy="150" rx="18" ry="40" stroke="#7ec8ff" stroke-width="4"/>
    <ellipse data-spatial-id="scc" class="spatial-region" cx="220" cy="150" rx="18" ry="40" stroke="#7ec8ff" stroke-width="4"/>
    <circle data-spatial-id="utricle" class="spatial-region" cx="160" cy="150" r="12" fill="rgba(126,200,255,.25)" stroke="#9ad0ff"/>
    <circle data-spatial-id="saccule" class="spatial-region" cx="180" cy="175" r="10" fill="rgba(126,200,255,.2)" stroke="#7ec8ff"/>
    <ellipse data-spatial-id="cochlea" class="spatial-region" cx="240" cy="200" rx="28" ry="22" fill="rgba(80,40,36,.3)" stroke="#d08a7a"/>
    <path data-spatial-id="vestibular_nerve" class="spatial-region" d="M140 160c-40 0-70 10-90 30" stroke="#f2c9a4" stroke-width="3"/>
    <path data-spatial-id="cn8" class="spatial-region" d="M130 180c-36 8-60 20-78 40" stroke="#e8dcc8" stroke-width="2.5"/>
    <path data-spatial-id="facial" class="spatial-region" d="M150 120c-30-20-60-24-90-10" stroke="#c9a882"/>
    <path data-spatial-id="stapes" class="spatial-region" d="M200 150h24" stroke="#ddc57e" stroke-width="3"/>
    <rect data-spatial-id="temporal" class="spatial-region" x="60" y="60" width="240" height="200" rx="16" stroke="#6a5a48" stroke-dasharray="5 4" fill="rgba(40,32,26,.2)"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="150" y="80">SCCs</text><text x="150" y="155">Utricle</text>
    <text x="170" y="195">Saccule</text><text x="230" y="230">Cochlea</text>
    <text x="16" y="200">VIII vest.</text><text x="16" y="120">VII</text>
  </g>`);
  }

  if (kind === "cans") {
    return svgShell("CANS pathway (schematic)", "Central auditory pathway schematic", "0 0 360 340", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <circle data-spatial-id="cn8" class="spatial-region" cx="300" cy="280" r="14" fill="#f0d24a" stroke="#e2b15a"/>
    <rect data-spatial-id="cochlear_nuclei" class="spatial-region" x="250" y="230" width="40" height="28" rx="4" fill="#3a2f4a" stroke="#b7a0e0"/>
    <rect data-spatial-id="soc" class="spatial-region" x="200" y="200" width="36" height="24" rx="4" fill="#2a3840" stroke="#7ec8ff"/>
    <path data-spatial-id="ll" class="spatial-region" d="M218 200v-40" stroke="#9ad0ff" stroke-width="3"/>
    <circle data-spatial-id="ic" class="spatial-region" cx="218" cy="140" r="16" fill="#2a3840" stroke="#7ec8ff"/>
    <circle data-spatial-id="mgb" class="spatial-region" cx="170" cy="110" r="14" fill="#2a3840" stroke="#9ad0ff"/>
    <ellipse data-spatial-id="heschl" class="spatial-region" cx="100" cy="90" rx="36" ry="18" fill="rgba(126,200,255,.25)" stroke="#7ec8ff"/>
    <ellipse data-spatial-id="stg" class="spatial-region" cx="90" cy="130" rx="40" ry="20" fill="rgba(60,100,120,.3)" stroke="#7ec8ff"/>
    <ellipse data-spatial-id="brainstem" class="spatial-region" cx="230" cy="240" rx="50" ry="70" fill="rgba(80,60,50,.2)" stroke="#c4a882"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="280" y="310">CN VIII</text><text x="250" y="220">CN</text>
    <text x="200" y="190">SOC</text><text x="230" y="160">LL</text>
    <text x="230" y="144">IC</text><text x="150" y="100">MGB</text>
    <text x="70" y="70">Heschl</text><text x="40" y="150">STG</text>
  </g>`);
  }

  if (kind === "cranial_nerves") {
    return svgShell("Cranial nerves V–XII (schematic)", "Cranial nerves schematic", "0 0 340 340", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <ellipse data-spatial-id="brainstem" class="spatial-region" cx="170" cy="170" rx="40" ry="90" fill="rgba(80,60,50,.3)" stroke="#c4a882"/>
    <ellipse data-spatial-id="cerebellum" class="spatial-region" cx="170" cy="280" rx="70" ry="30" fill="rgba(100,70,60,.3)" stroke="#c9a090"/>
    <path data-spatial-id="trigeminal" class="spatial-region" d="M170 120h80" stroke="#f0d24a" stroke-width="3"/>
    <path data-spatial-id="facial" class="spatial-region" d="M170 150h90" stroke="#e2b15a" stroke-width="3"/>
    <path data-spatial-id="cn8" class="spatial-region" d="M170 170h85" stroke="#f2c9a4" stroke-width="3"/>
    <path data-spatial-id="glossopharyngeal" class="spatial-region" d="M170 195h75" stroke="#d08a7a" stroke-width="3"/>
    <path data-spatial-id="vagus" class="spatial-region" d="M170 215h70" stroke="#c45c6a" stroke-width="3"/>
    <path data-spatial-id="accessory" class="spatial-region" d="M170 235h65" stroke="#b97878" stroke-width="3"/>
    <path data-spatial-id="hypoglossal" class="spatial-region" d="M170 255h60" stroke="#a89070" stroke-width="3"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="260" y="124">V</text><text x="270" y="154">VII</text>
    <text x="265" y="174">VIII</text><text x="255" y="200">IX</text>
    <text x="250" y="220">X</text><text x="245" y="240">XI</text>
    <text x="240" y="260">XII</text><text x="140" y="100">Brainstem</text>
  </g>`);
  }

  if (kind === "language") {
    return svgShell("Language & motor speech network", "Language brain schematic", "0 0 360 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <ellipse cx="160" cy="150" rx="120" ry="90" fill="rgba(80,60,50,.25)" stroke="#c4a882"/>
    <circle data-spatial-id="ifg" class="spatial-region" cx="90" cy="130" r="22" fill="#3db8b0" stroke="#e2b15a"/>
    <circle data-spatial-id="stg" class="spatial-region" cx="200" cy="170" r="22" fill="#7ec8ff" stroke="#e2b15a"/>
    <circle data-spatial-id="heschl" class="spatial-region" cx="180" cy="150" r="12" fill="#9ad0ff"/>
    <circle data-spatial-id="smg" class="spatial-region" cx="230" cy="130" r="18" fill="rgba(126,200,255,.35)" stroke="#7ec8ff"/>
    <circle data-spatial-id="precentral" class="spatial-region" cx="120" cy="90" r="16" fill="rgba(61,184,176,.35)" stroke="#3db8b0"/>
    <circle data-spatial-id="insula" class="spatial-region" cx="150" cy="150" r="14" fill="rgba(100,80,70,.4)" stroke="#c4a882"/>
    <circle data-spatial-id="basal" class="spatial-region" cx="150" cy="180" r="16" fill="rgba(90,50,50,.4)" stroke="#d08a7a"/>
    <ellipse data-spatial-id="cerebellum" class="spatial-region" cx="160" cy="270" rx="50" ry="22" fill="rgba(100,70,60,.3)" stroke="#c9a090"/>
    <path data-spatial-id="mca" class="spatial-region" d="M100 150c40-10 80-10 120 5" stroke="#c44545" stroke-width="3"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="70" y="120">IFG</text><text x="190" y="200">STG</text>
    <text x="220" y="120">SMG</text><text x="100" y="80">Precentral</text>
    <text x="130" y="210">Basal g.</text><text x="130" y="300">Cerebellum</text>
    <text x="140" y="140">Insula</text>
  </g>`);
  }

  if (kind === "vascular") {
    return svgShell("Vascular supply & CSF (schematic)", "Brain vascular schematic", "0 0 340 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <ellipse data-spatial-id="meninges" class="spatial-region" cx="170" cy="140" rx="120" ry="95" stroke="#a89070" stroke-dasharray="4 3" fill="rgba(40,32,26,.2)"/>
    <path data-spatial-id="mca" class="spatial-region" d="M80 140c50-30 110-30 160 0" stroke="#c44545" stroke-width="5"/>
    <circle data-spatial-id="willis" class="spatial-region" cx="170" cy="180" r="28" stroke="#c44545" stroke-width="3" fill="rgba(180,40,40,.15)"/>
    <path data-spatial-id="ica" class="spatial-region" d="M170 260v-50" stroke="#c44545" stroke-width="4"/>
    <ellipse data-spatial-id="ventricle" class="spatial-region" cx="170" cy="120" rx="36" ry="18" fill="rgba(126,200,255,.2)" stroke="#7ec8ff"/>
    <circle data-spatial-id="ifg" class="spatial-region" cx="90" cy="120" r="14" fill="rgba(61,184,176,.3)" stroke="#3db8b0"/>
    <circle data-spatial-id="stg" class="spatial-region" cx="230" cy="150" r="14" fill="rgba(126,200,255,.3)" stroke="#7ec8ff"/>
    <circle data-spatial-id="basal" class="spatial-region" cx="150" cy="150" r="12" fill="rgba(90,50,50,.35)" stroke="#d08a7a"/>
    <ellipse data-spatial-id="brainstem" class="spatial-region" cx="170" cy="240" rx="24" ry="36" fill="rgba(80,60,50,.3)" stroke="#c4a882"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="140" y="50">Meninges</text><text x="120" y="100">Ventricle / CSF</text>
    <text x="40" y="130">MCA</text><text x="150" y="185">Willis</text>
    <text x="180" y="270">ICA</text><text x="60" y="110">IFG</text>
  </g>`);
  }

  if (kind === "devices") {
    return svgShell("Devices · CI / ABI path (schematic)", "Implant devices schematic", "0 0 340 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <ellipse data-spatial-id="cochlea" class="spatial-region" cx="180" cy="160" rx="50" ry="40" fill="rgba(80,40,36,.3)" stroke="#d08a7a"/>
    <path data-spatial-id="scala_tympani" class="spatial-region" d="M140 180c20 10 50 14 80 0" stroke="#b9c4ce" stroke-width="5"/>
    <circle data-spatial-id="modiolus" class="spatial-region" cx="180" cy="160" r="10" fill="#e2b15a"/>
    <rect data-spatial-id="mastoid" class="spatial-region" x="250" y="100" width="50" height="50" rx="8" fill="rgba(90,80,60,.4)" stroke="#e2b15a"/>
    <path data-spatial-id="cn8" class="spatial-region" d="M130 160c-40 0-70 20-90 40" stroke="#f0d24a" stroke-width="3"/>
    <rect data-spatial-id="cochlear_nuclei" class="spatial-region" x="30" y="200" width="40" height="28" rx="4" fill="#3a2f4a" stroke="#b7a0e0"/>
    <rect data-spatial-id="temporal" class="spatial-region" x="70" y="70" width="220" height="180" rx="16" stroke="#6a5a48" stroke-dasharray="5 4" fill="rgba(40,32,26,.2)"/>
    <path data-spatial-id="stapes" class="spatial-region" d="M120 140h24" stroke="#ddc57e" stroke-width="3"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="160" y="120">Cochlea</text><text x="140" y="200">Scala tympani · CI</text>
    <text x="250" y="90">Mastoid Rx</text><text x="16" y="190">ABI · CN</text>
    <text x="16" y="230">Cochlear n. / VIII</text>
  </g>`);
  }

  if (kind === "clinical") {
    return svgShell("Clinical windows · TM / scopes", "Clinical windows schematic", "0 0 340 320", `
  <g stroke="#c4a882" fill="none" stroke-width="2">
    <circle data-spatial-id="tm" class="spatial-region" cx="170" cy="150" r="70" fill="#5a4030" stroke="#e2b15a" stroke-width="3"/>
    <line x1="170" y1="80" x2="170" y2="220" stroke="rgba(232,220,200,.25)"/>
    <line x1="100" y1="150" x2="240" y2="150" stroke="rgba(232,220,200,.25)"/>
    <path data-spatial-id="malleus" class="spatial-region" d="M170 100l-8 70" stroke="#f0e2b8" stroke-width="4" stroke-linecap="round"/>
    <path data-spatial-id="cone" class="spatial-region" d="M170 150l40 40" stroke="#f5e6c8" stroke-width="3"/>
    <path data-spatial-id="eac" class="spatial-region" d="M40 150h60" stroke="#d4a090" stroke-width="10" stroke-linecap="round"/>
    <path data-spatial-id="helix" class="spatial-region" d="M40 80c20-20 40-20 50 0" stroke="#c4a882"/>
    <ellipse data-spatial-id="folds" class="spatial-region" cx="280" cy="80" rx="30" ry="16" fill="rgba(196,92,106,.35)" stroke="#c45c6a"/>
    <path data-spatial-id="velum" class="spatial-region" d="M260 200c20 10 40 8 50-6" stroke="#3db8b0" stroke-width="3"/>
    <rect data-spatial-id="temporal" class="spatial-region" x="90" y="60" width="160" height="180" rx="14" stroke="#6a5a48" stroke-dasharray="5 4" fill="rgba(40,32,26,.15)"/>
  </g>
  <g ${LABEL_STYLE}>
    <text x="150" y="50">TM quadrants</text><text x="190" y="210">Cone of light</text>
    <text x="16" y="140">EAC</text><text x="250" y="70">Glottis view</text>
    <text x="240" y="230">Velum · nasendo</text><text x="150" y="130">Malleus</text>
  </g>`);
  }

  // Fallback: generic labelled list for unknown kinds
  const items = (map && map.structures) || [];
  const rows = items.slice(0, 12).map((s, i) => {
    const y = 60 + i * 22;
    return `<rect data-spatial-id="${s.id}" class="spatial-region" x="40" y="${y - 12}" width="260" height="18" rx="4" fill="rgba(60,50,40,.45)" stroke="#c4a882"/><text x="50" y="${y}" ${LABEL_STYLE}>${s.label}</text>`;
  }).join("");
  return svgShell((map && map.title) || "Schematic", "Module schematic", "0 0 340 340", rows);
}

function fillTeachingBg(ctx, w, h) {
  const g = ctx.createRadialGradient(w * 0.48, h * 0.5, w * 0.08, w * 0.5, h * 0.5, w * 0.62);
  g.addColorStop(0, "#6e6e6e");
  g.addColorStop(0.45, "#3a3a3a");
  g.addColorStop(1, "#141414");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = i % 2 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawCtKind(ctx, w, h, kind, sliceIndex) {
  if (kind === "chest_coronal") {
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(w * 0.18, h * 0.12, w * 0.64, h * 0.7);
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.ellipse(w * 0.34, h * 0.42, w * 0.14, h * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.66, h * 0.42, w * 0.13, h * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.12);
    ctx.lineTo(w * 0.5, h * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.68);
    ctx.quadraticCurveTo(w * 0.5, h * 0.58, w * 0.8, h * 0.68);
    ctx.strokeStyle = "#9a9a9a";
    ctx.stroke();
    return;
  }
  if (kind === "larynx_axial") {
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.48, w * 0.22, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4a4a4a";
    ctx.fill();
    ctx.strokeStyle = "#7a7a7a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(w * 0.42, h * 0.45, w * 0.16, h * 0.04);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.62, w * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "#3a3a3a";
    ctx.fill();
    if (sliceIndex === 0) {
      ctx.fillStyle = "#5a5a5a";
      ctx.fillRect(w * 0.35, h * 0.28, w * 0.3, h * 0.06);
    }
    return;
  }
  if (kind === "swallow_sagittal") {
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.moveTo(w * 0.7, h * 0.15);
    ctx.quadraticCurveTo(w * 0.85, h * 0.35, w * 0.65, h * 0.45);
    ctx.quadraticCurveTo(w * 0.45, h * 0.55, w * 0.4, h * 0.85);
    ctx.lineTo(w * 0.3, h * 0.85);
    ctx.quadraticCurveTo(w * 0.35, h * 0.5, w * 0.5, h * 0.35);
    ctx.quadraticCurveTo(w * 0.55, h * 0.2, w * 0.7, h * 0.15);
    ctx.fill();
    ctx.strokeStyle = "#7a7a7a";
    ctx.stroke();
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.38, w * 0.1, h * 0.06, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.55);
    ctx.lineTo(w * 0.4, h * 0.9);
    ctx.stroke();
    return;
  }
  if (kind === "brain_axial") {
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.45, w * 0.32, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4a4a4a";
    ctx.fill();
    ctx.strokeStyle = "#7a7a7a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.44, w * 0.06, h * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.58, h * 0.44, w * 0.06, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.72, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3a3a3a";
    ctx.fill();
    if (sliceIndex >= 1) {
      ctx.strokeStyle = "#a55";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.55, w * 0.08, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    return;
  }
  if (kind === "orientation_axial") {
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.48, w * 0.28, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4a4a4a";
    ctx.fill();
    ctx.strokeStyle = "#7ec8ff";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.15);
    ctx.lineTo(w * 0.5, h * 0.85);
    ctx.stroke();
    ctx.strokeStyle = "#3db8b0";
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.48);
    ctx.lineTo(w * 0.8, h * 0.48);
    ctx.stroke();
    ctx.strokeStyle = "#e2b15a";
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.62);
    ctx.lineTo(w * 0.78, h * 0.62);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  // temporal / cochlea / vestibular default skull-base axial
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.34, h * 0.30, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#4a4a4a";
  ctx.fill();
  ctx.strokeStyle = "#7a7a7a";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(w * 0.58, h * 0.54, w * 0.07, h * 0.045, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();
  ctx.fillStyle = "#2c2c2c";
  for (let i = 0; i < 8; i++) {
    const ang = i * 0.7;
    ctx.beginPath();
    ctx.arc(w * 0.76 + Math.cos(ang) * 12, h * 0.58 + Math.sin(ang) * 10, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === "cochlea_axial" || kind === "vestibular_axial" || sliceIndex >= 1) {
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx = kind === "cochlea_axial" ? w * 0.46 : w * 0.38;
    const cy = h * 0.5;
    for (let t = 0; t < Math.PI * 3.2; t += 0.15) {
      const r = 6 + t * 3.2;
      const x = cx + Math.cos(t) * r;
      const y = cy + Math.sin(t) * r * 0.72;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  if (kind === "vestibular_axial") {
    ctx.strokeStyle = "#aaa";
    ctx.beginPath();
    ctx.ellipse(w * 0.48, h * 0.4, w * 0.08, h * 0.04, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.46);
  ctx.quadraticCurveTo(w * 0.30, h * 0.5, w * 0.22, h * 0.56);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTeachingCT(canvas, map, sliceIndex, selectedId, crosshair) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 320;
  const cssH = canvas.clientHeight || 280;
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = cssW;
  const h = cssH;

  fillTeachingBg(ctx, w, h);
  drawCtKind(ctx, w, h, map.ct.kind, sliceIndex);

  const landmarks = (map.ct.landmarks || []).filter((l) => l.slice === sliceIndex || Math.abs(l.slice - sliceIndex) <= 1);
  landmarks.forEach((l) => {
    const x = l.x * w;
    const y = l.y * h;
    const r = Math.max(6, l.r * Math.min(w, h));
    const on = selectedId && l.id === selectedId;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = on ? "rgba(226,177,90,0.45)" : "rgba(180,180,180,0.12)";
    ctx.fill();
    ctx.strokeStyle = on ? "#e2b15a" : "rgba(220,220,220,0.35)";
    ctx.lineWidth = on ? 2.4 : 1;
    ctx.stroke();
    if (on) {
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "600 12px Archivo, system-ui, sans-serif";
      const s = structureById(map, l.id);
      ctx.fillText(s ? s.label : l.id, x + r + 4, y + 4);
    }
  });

  if (crosshair && Number.isFinite(crosshair.x) && Number.isFinite(crosshair.y)) {
    const x = crosshair.x * w;
    const y = crosshair.y * h;
    ctx.strokeStyle = "rgba(126,200,255,0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(w, y);
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, h - 36, w, 36);
  ctx.fillStyle = "#f0d9a8";
  ctx.font = "600 11px Archivo, system-ui, sans-serif";
  ctx.fillText("TEACHING SCHEMATIC — not a real patient CT · not for diagnosis", 10, h - 14);
}

export function createSpatialController(api) {
  const root = {
    enabled: false,
    moduleId: null,
    map: null,
    selectedId: null,
    slice: 1,
    mobileTab: "diagram",
    diagramView: makeView2D(),
    ctView: makeView2D(),
    crosshair: null
  };

  const els = {
    btn: document.getElementById("btnSpatial"),
    shell: document.getElementById("spatialShell"),
    diagramHost: document.getElementById("spatialDiagram"),
    ctHost: document.getElementById("spatialCt"),
    ctCanvas: document.getElementById("spatialCtCanvas"),
    ctLabel: document.getElementById("spatialCtLabel"),
    sliceLabel: document.getElementById("spatialSliceLabel"),
    fallback: document.getElementById("spatialFallback"),
    status: document.getElementById("spatialStatus")
  };

  let diagramBinder = null;
  let ctBinder = null;
  const stageEl = document.querySelector(".stage");
  const frame3d = document.querySelector(".spatial-3d-frame");
  const viewCanvas = document.getElementById("view");
  let canvasHome = viewCanvas ? viewCanvas.parentElement : null;

  function placeCanvas(inSpatial) {
    if (!viewCanvas || !frame3d || !canvasHome) return;
    if (inSpatial) {
      // Keep the live Three.js canvas; only reparent for layout.
      if (viewCanvas.parentElement !== frame3d) frame3d.appendChild(viewCanvas);
      viewCanvas.classList.add("spatial-live-canvas");
    } else if (viewCanvas.parentElement !== canvasHome) {
      // Restore original stage order: canvas first among stage children.
      canvasHome.insertBefore(viewCanvas, canvasHome.firstChild);
      viewCanvas.classList.remove("spatial-live-canvas");
    }
  }

  function meshLabels() {
    return (api.getMeshLabels && api.getMeshLabels()) || [];
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text;
  }

  function syncButton() {
    if (!els.btn) return;
    els.btn.classList.toggle("active", root.enabled);
    els.btn.setAttribute("aria-pressed", String(root.enabled));
  }

  function renderDiagram() {
    if (!els.diagramHost) return;
    if (!root.map) {
      els.diagramHost.innerHTML = `<div class="spatial-empty"><p>Select any Core module (M00–M16) for a linked region diagram.</p></div>`;
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "spatial-zoom-content";
    wrap.innerHTML = diagramSvg(root.map.diagram, root.map);
    els.diagramHost.innerHTML = "";
    const viewport = document.createElement("div");
    viewport.className = "spatial-zoom-viewport";
    viewport.appendChild(wrap);
    els.diagramHost.appendChild(viewport);
    applyViewTransform(wrap, root.diagramView);
    diagramBinder = bindPanZoom(viewport, wrap, root.diagramView);
    viewport.querySelectorAll("[data-spatial-id]").forEach((node) => {
      node.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectStructure(node.getAttribute("data-spatial-id"), "diagram");
      });
    });
    highlightDiagram();
  }

  function highlightDiagram() {
    if (!els.diagramHost) return;
    els.diagramHost.querySelectorAll("[data-spatial-id]").forEach((node) => {
      const on = root.selectedId && node.getAttribute("data-spatial-id") === root.selectedId;
      node.classList.toggle("is-selected", !!on);
    });
  }

  function renderCt() {
    if (!els.ctCanvas || !els.ctHost) return;
    if (!root.map) {
      if (els.fallback) els.fallback.hidden = false;
      els.ctCanvas.style.display = "none";
      return;
    }
    if (els.fallback) els.fallback.hidden = true;
    els.ctCanvas.style.display = "block";
    if (els.ctLabel) els.ctLabel.textContent = root.map.ctTitle;
    if (els.sliceLabel) {
      const names = root.map.ct.slices || [];
      els.sliceLabel.textContent = `Slice ${root.slice + 1}/${names.length}: ${names[root.slice] || ""}`;
    }
    drawTeachingCT(els.ctCanvas, root.map, root.slice, root.selectedId, root.crosshair);
  }

  function ensureCtBinder() {
    const viewport = document.getElementById("spatialCtViewport");
    const content = document.getElementById("spatialCtContent");
    if (!viewport || !content || ctBinder) return;
    applyViewTransform(content, root.ctView);
    ctBinder = bindPanZoom(viewport, content, root.ctView, () => {});
    viewport.addEventListener("click", (e) => {
      if (!root.map) return;
      const rect = els.ctCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) return;
      // Hit nearest landmark on current / adjacent slice
      let best = null;
      let bestD = 0.09;
      (root.map.ct.landmarks || []).forEach((l) => {
        if (Math.abs(l.slice - root.slice) > 1) return;
        const d = Math.hypot(l.x - x, l.y - y);
        if (d < bestD) { bestD = d; best = l; }
      });
      if (best) selectStructure(best.id, "ct");
    });
  }

  function updateCrosshairForSelection() {
    if (!root.map || !root.selectedId) {
      root.crosshair = null;
      return;
    }
    const hit = (root.map.ct.landmarks || []).find((l) => l.id === root.selectedId);
    if (hit) {
      root.crosshair = { x: hit.x, y: hit.y };
      root.slice = hit.slice;
    } else {
      root.crosshair = null;
    }
  }

  function selectStructure(structureId, source) {
    if (!structureId || !root.map) return;
    root.selectedId = structureId;
    updateCrosshairForSelection();
    highlightDiagram();
    renderCt();
    const label = findMeshLabelForStructure(structureId, root.map, meshLabels());
    const s = structureById(root.map, structureId);
    setStatus((s ? s.label : structureId) + (source ? ` · from ${source}` : "") + (label ? "" : " · (no matching mesh in this scene)"));
    if (label && api.selectByLabel) api.selectByLabel(label);
  }

  function onStudioSelection(label) {
    if (!root.enabled || !root.map) return;
    const id = structureIdForLabel(label, root.map);
    root.selectedId = id;
    updateCrosshairForSelection();
    highlightDiagram();
    renderCt();
    if (id) {
      const s = structureById(root.map, id);
      setStatus((s ? s.label : id) + " · linked");
    }
  }

  function setModule(moduleId) {
    root.moduleId = moduleId;
    root.map = hasSpatialMap(moduleId) ? getSpatialMap(moduleId) : null;
    root.selectedId = null;
    root.crosshair = null;
    root.slice = root.map ? (root.map.ct.defaultSlice || 1) : 0;
    root.diagramView = makeView2D();
    root.ctView = makeView2D();
    diagramBinder = null;
    ctBinder = null;
    if (root.enabled) refresh();
  }

  function refresh() {
    if (!els.shell) return;
    document.body.classList.toggle("spatial-on", root.enabled);
    els.shell.hidden = !root.enabled;
    syncButton();
    placeCanvas(root.enabled);
    if (!root.enabled) {
      window.dispatchEvent(new Event("resize"));
      return;
    }
    const mapped = !!root.map;
    document.body.classList.toggle("spatial-mapped", mapped);
    document.body.classList.toggle("spatial-fallback", !mapped);
    if (els.fallback) {
      els.fallback.hidden = mapped;
      if (!mapped) {
        els.fallback.innerHTML = `<p><b>No Spatial map for this module.</b> Maps exist for ${SPATIAL_MAPPED_MODULES.join(", ")}. Use 3D dissection meanwhile.</p>`;
      }
    }
    renderDiagram();
    ensureCtBinder();
    renderCt();
    setStatus(mapped
      ? `Linked views for ${root.moduleId}. Click a structure in diagram, CT or 3D.`
      : `Spatial on · ${root.moduleId || "module"} uses 3D only until a map is added.`);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      renderCt();
    });
  }

  function setEnabled(on) {
    root.enabled = !!on;
    if (root.enabled && api.getCurrentModuleId) setModule(api.getCurrentModuleId());
    else refresh();
    if (root.enabled) refresh();
    else {
      document.body.classList.remove("spatial-on", "spatial-mapped", "spatial-fallback");
      if (els.shell) els.shell.hidden = true;
      placeCanvas(false);
      syncButton();
      window.dispatchEvent(new Event("resize"));
    }
  }

  function zoom2d(which, factor) {
    const view = which === "ct" ? root.ctView : root.diagramView;
    const binder = which === "ct" ? ctBinder : diagramBinder;
    const prev = view.scale;
    view.scale = clamp(prev * factor, 0.55, 4.5);
    // Zoom toward centre of viewport
    const k = view.scale / prev;
    view.x = 160 - (160 - view.x) * k;
    view.y = 140 - (140 - view.y) * k;
    if (binder) binder.emit();
  }

  function bindChrome() {
    if (els.btn) {
      els.btn.addEventListener("click", () => setEnabled(!root.enabled));
    }
    document.getElementById("spatialFit")?.addEventListener("click", () => {
      if (api.fitSpecimen) api.fitSpecimen();
      root.diagramView = makeView2D();
      root.ctView = makeView2D();
      if (diagramBinder) diagramBinder.reset();
      if (ctBinder) ctBinder.reset();
      renderDiagram();
      ensureCtBinder();
      renderCt();
    });
    document.getElementById("spatialFocus")?.addEventListener("click", () => {
      if (api.focusSelected) api.focusSelected();
      updateCrosshairForSelection();
      renderCt();
    });
    document.getElementById("spatialZoomIn")?.addEventListener("click", () => {
      if (api.zoom3d) api.zoom3d(1 / 1.18);
      zoom2d("diagram", 1.18);
      zoom2d("ct", 1.18);
    });
    document.getElementById("spatialZoomOut")?.addEventListener("click", () => {
      if (api.zoom3d) api.zoom3d(1.18);
      zoom2d("diagram", 1 / 1.18);
      zoom2d("ct", 1 / 1.18);
    });
    document.getElementById("spatialSlicePrev")?.addEventListener("click", () => {
      if (!root.map) return;
      root.slice = (root.slice + root.map.ct.slices.length - 1) % root.map.ct.slices.length;
      renderCt();
    });
    document.getElementById("spatialSliceNext")?.addEventListener("click", () => {
      if (!root.map) return;
      root.slice = (root.slice + 1) % root.map.ct.slices.length;
      renderCt();
    });
    document.querySelectorAll("[data-spatial-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.mobileTab = btn.getAttribute("data-spatial-tab");
        document.body.dataset.spatialTab = root.mobileTab;
        document.querySelectorAll("[data-spatial-tab]").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-spatial-tab") === root.mobileTab);
        });
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
          renderCt();
        });
      });
    });
    window.addEventListener("resize", () => {
      if (root.enabled) renderCt();
    });
  }

  bindChrome();
  document.body.dataset.spatialTab = root.mobileTab;

  return {
    setEnabled,
    isEnabled: () => root.enabled,
    setModule,
    onStudioSelection,
    refresh,
    mappedModules: SPATIAL_MAPPED_MODULES
  };
}
