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

function diagramSvg(kind, map) {
  if (kind === "external_ear") {
    return `
<svg viewBox="0 0 320 360" class="spatial-svg" role="img" aria-label="External ear schematic">
  <rect width="320" height="360" fill="#1a1511"/>
  <text x="16" y="28" class="spatial-svg-title">External ear (schematic)</text>
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
  <g class="spatial-callouts" fill="#e8dcc8" font-size="11" font-family="Archivo, system-ui, sans-serif">
    <text x="232" y="70">Helix</text>
    <text x="210" y="130">Antihelix</text>
    <text x="188" y="178">Concha</text>
    <text x="96" y="152">Tragus</text>
    <text x="188" y="246">Antitragus</text>
    <text x="168" y="320">Lobule</text>
    <text x="108" y="200">EAC</text>
    <text x="40" y="170">TM</text>
    <text x="20" y="260">Mastoid</text>
  </g>
</svg>`;
  }

  if (kind === "middle_ear") {
    return `
<svg viewBox="0 0 340 320" class="spatial-svg" role="img" aria-label="Middle ear schematic">
  <rect width="340" height="320" fill="#1a1511"/>
  <text x="16" y="28" class="spatial-svg-title">Middle ear transformer (schematic)</text>
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
  <g fill="#e8dcc8" font-size="11" font-family="Archivo, system-ui, sans-serif">
    <text x="48" y="108">TM</text>
    <text x="96" y="118">Malleus</text>
    <text x="130" y="140">Incus</text>
    <text x="150" y="220">Stapes</text>
    <text x="196" y="246">Cochlea</text>
    <text x="150" y="158">Vestibule</text>
    <text x="150" y="270">Auditory tube</text>
    <text x="190" y="112">VII</text>
  </g>
</svg>`;
  }

  // cochlea
  return `
<svg viewBox="0 0 340 320" class="spatial-svg" role="img" aria-label="Cochlea schematic">
  <rect width="340" height="320" fill="#1a1511"/>
  <text x="16" y="28" class="spatial-svg-title">Cochlea (schematic · unrolled place map)</text>
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
  <g fill="#e8dcc8" font-size="11" font-family="Archivo, system-ui, sans-serif">
    <text x="186" y="120">Cochlea · base = high f</text>
    <text x="186" y="138">apex = low f</text>
    <text x="88" y="140">Vestibule</text>
    <text x="100" y="188">Cochlear n.</text>
    <text x="16" y="190">VIII</text>
    <text x="70" y="108">VII</text>
    <text x="70" y="216">Nuclei</text>
    <text x="66" y="254">IC</text>
    <text x="64" y="284">MGB</text>
  </g>
</svg>`;
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

  // Grayscale educational background — clearly not a patient DICOM.
  const g = ctx.createRadialGradient(w * 0.48, h * 0.5, w * 0.08, w * 0.5, h * 0.5, w * 0.62);
  g.addColorStop(0, "#6e6e6e");
  g.addColorStop(0.45, "#3a3a3a");
  g.addColorStop(1, "#141414");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft noise
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = i % 2 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Temporal bone oval
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.34, h * 0.30, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#4a4a4a";
  ctx.fill();
  ctx.strokeStyle = "#7a7a7a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Air-filled canal / middle ear cleft
  ctx.beginPath();
  ctx.ellipse(w * 0.58, h * 0.54, w * 0.07, h * 0.045, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  // Mastoid air-cell hint
  ctx.fillStyle = "#2c2c2c";
  for (let i = 0; i < 8; i++) {
    const ang = i * 0.7;
    ctx.beginPath();
    ctx.arc(w * 0.76 + Math.cos(ang) * 12, h * 0.58 + Math.sin(ang) * 10, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // Cochlear spiral hint on labyrinthine / cochlea maps
  if (map.ct.kind === "cochlea_axial" || sliceIndex >= 1) {
    ctx.strokeStyle = "#9a9a9a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx = map.ct.kind === "cochlea_axial" ? w * 0.46 : w * 0.38;
    const cy = h * 0.5;
    for (let t = 0; t < Math.PI * 3.2; t += 0.15) {
      const r = 6 + t * 3.2;
      const x = cx + Math.cos(t) * r;
      const y = cy + Math.sin(t) * r * 0.72;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // IAM notch
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.46);
  ctx.quadraticCurveTo(w * 0.30, h * 0.5, w * 0.22, h * 0.56);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.stroke();

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

  // Watermark / disclaimer band
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
      els.diagramHost.innerHTML = `<div class="spatial-empty"><p>Open M06–M08 for linked ear / cochlea diagrams.</p></div>`;
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
        els.fallback.innerHTML = `<p><b>Diagram / CT map coming.</b> Spatial linking is strongest for ${SPATIAL_MAPPED_MODULES.join(", ")} (ear / middle ear / cochlea). Use the orientation schematic in 3D, or open one of those modules.</p>`;
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
