import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { StudioAtlas } from "./atlas.js";
import { attachPhysiology } from "./physiology.js";
import { attachClinic } from "./clinic.js";
import { Tissue } from "./tissue.js";
import { explainPart } from "./glossary.js";
import { emptyStudy, selectPart, hidePart, partDisplay, readViews, VIEW_STORAGE_KEY, MAX_VIEWS } from "./study-state.js";
import { createSpatialController } from "./spatial.js";
import { createSectionsController } from "./sections.js";

window.THREE = THREE;

const data = window.STUDIO_DATA;
const layersState = {
  surface: true, bone: true, muscle: true, membrane: true,
  nerve: true, vessel: true, function: true, clinic: false, labels: true, cut: false
};

const els = {
  list: document.getElementById("moduleList"),
  search: document.getElementById("search"),
  title: document.getElementById("modTitle"),
  summary: document.getElementById("modSummary"),
  tags: document.getElementById("modTags"),
  side: document.getElementById("sideContent"),
  home: document.getElementById("home"),
  toast: document.getElementById("toast"),
  lite: document.getElementById("liteMode"),
  loader: document.getElementById("loader"),
  loaderBar: document.getElementById("loaderBar"),
  loaderText: document.getElementById("loaderText"),
  pickLabel: document.getElementById("pickLabel"),
  parts: document.getElementById("partsList")
};

let current = data.modules[6];
let renderer, scene, camera, root, clock, controls, playing = true, raycaster, pointer;
let composer, gtaoPass;
let selected = null;
let study = emptyStudy();
let sceneReady = false;
const materialDefaults = new WeakMap();
let side = "r";
let loadToken = 0;
let appearance = "photoreal";
let stageColor = 0x16110d;
let labTable, labGrid;
const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.02);
const clipSize = new THREE.Vector3();
const clipBox = new THREE.Box3();
const clipCorner = new THREE.Vector3();

let spatial = null;
let sections = null;

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.style.display = "block";
  setTimeout(() => { els.toast.style.display = "none"; }, 2600);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

function explainHtml(info) {
  const side = info.side ? `<span class="ex-chip">${esc(info.side)}</span>` : "";
  const papers = info.papers ? `<span class="ex-chip">${esc(info.papers)}</span>` : "";
  const aka = info.label && info.label !== info.title
    ? `<p class="explain-aka">Atlas name: ${esc(info.label)}</p>`
    : "";
  const mod = info.moduleNote
    ? `<p class="explain-mod"><b>${esc(info.moduleId || "")}.</b> ${esc(info.moduleNote)}</p>`
    : "";
  return `
    <button class="explain-close" type="button" aria-label="Close explanation">✕</button>
    <p class="explain-kicker">${esc(info.role)}</p>
    <h3>${esc(info.title)}</h3>
    <p class="explain-meta">${side}<span class="ex-chip">${esc(info.kind || "structure")}</span>${papers}</p>
    <p class="explain-fn">${esc(info.fn)}</p>
    <p class="explain-clinic"><b>Clinic.</b> ${esc(info.clinic)}</p>
    ${mod}${aka}`;
}

function showExplain(name, mesh) {
  const info = explainPart(name, mesh, current);
  const html = explainHtml(info);
  [els.pickLabel, document.getElementById("partExplain")].forEach((el) => {
    if (!el) return;
    el.innerHTML = html;
    el.hidden = false;
    el.classList.add("open");
    el.style.display = "block";
    const close = el.querySelector(".explain-close");
    if (close) close.onclick = (e) => { e.stopPropagation(); hideExplain(); };
  });
}

function hideExplain() {
  [els.pickLabel, document.getElementById("partExplain")].forEach((el) => {
    if (!el) return;
    el.hidden = true;
    el.classList.remove("open");
    el.style.display = "none";
    el.innerHTML = "";
  });
}

function setLoader(on, pct, text) {
  if (!els.loader) return;
  els.loader.style.display = on ? "flex" : "none";
  if (els.loaderBar) els.loaderBar.style.width = Math.round((pct || 0) * 100) + "%";
  if (els.loaderText) els.loaderText.textContent = text || "Loading dissection meshes…";
}

function renderList(filter) {
  const q = (filter || "").toLowerCase();
  els.list.innerHTML = "";
  data.modules.forEach((m) => {
    const hay = (m.id + m.title + m.papers + m.tags.join(" ")).toLowerCase();
    if (q && !hay.includes(q)) return;
    const b = document.createElement("button");
    b.className = "mod" + (current && current.id === m.id ? " active" : "");
    b.innerHTML = `<b>${m.id}</b> ${m.title}<small>${m.papers} · ${m.first}</small>`;
    b.onclick = () => select(m.id);
    els.list.appendChild(b);
  });
}

function renderParts() {
  if (!els.parts) return;
  syncStudyTools();
  const meshes = (root && root.userData.named) || [];
  if (!meshes.length) {
    els.parts.innerHTML = "<p class='muted'>Open a module to list dissection parts.</p>";
    const host = document.getElementById("worldLabels");
    if (host) host.innerHTML = "";
    return;
  }
  const unique = [...new Set(meshes.map((m) => m.userData.label).filter(Boolean))].sort();
  const query = (document.getElementById("partSearch").value || "").trim().toLowerCase();
  const matches = unique.filter((name) => name.toLowerCase().includes(query));
  document.getElementById("partCount").textContent = `${matches.length} of ${unique.length} structures · ${study.hidden.length} hidden`;
  els.parts.innerHTML = matches.map((name) => {
    const on = selected && selected.userData.label === name ? " on" : "";
    const mesh = meshes.find((m) => m.userData.label === name);
    const hidden = study.hidden.includes(name) || !layersState[mesh.userData.layer];
    return `<button class="part${on}${hidden ? " is-hidden" : ""}" type="button" aria-pressed="${!!on}" data-part="${encodeURIComponent(name)}">${esc(name)}${hidden ? "<small>Hidden · select to reveal</small>" : ""}</button>`;
  }).join("") || "<p class='muted'>No matching structures in this module.</p>";
  const host = document.getElementById("worldLabels");
  if (host) {
    host.innerHTML = unique.map((name) =>
      `<button class="wlab" type="button" data-part="${encodeURIComponent(name)}" title="Tap for a teaching note">${esc(name)}</button>`
    ).join("");
  }
}

function readPartName(el) {
  const btn = el && el.closest ? el.closest("[data-part]") : null;
  if (!btn) return "";
  const raw = btn.getAttribute("data-part") || "";
  try { return decodeURIComponent(raw); } catch (err) { return (btn.textContent || "").trim(); }
}

function bindLabelClicks() {
  const hit = (e) => {
    const btn = e.target.closest("[data-part]");
    if (!btn) return null;
    if (!btn.closest("#worldLabels, #partsList")) return null;
    return btn;
  };
  let last = 0;
  const go = (e) => {
    const btn = hit(e);
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - last < 350) return;
    last = now;
    const name = readPartName(btn);
    if (name) isolateByName(name);
  };
  document.addEventListener("pointerdown", (e) => {
    if (!hit(e)) return;
    e.stopPropagation();
  }, true);
  document.addEventListener("pointerup", go, true);
  document.addEventListener("click", go, true);
}

function applyLayers() {
  if (!root) return;
  root.traverse((obj) => {
    const layer = obj.userData && obj.userData.layer;
    if (!layer) return;
    if (layer === "labels" || layer === "cut") return;
    obj.visible = !!layersState[layer] && !(layer === "function" && study.mode === "isolate");
  });
  (root.userData.named || []).forEach((mesh) => {
    const display = partDisplay(study, mesh.userData.label, !!layersState[mesh.userData.layer]);
    mesh.visible = display.visible;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.filter(Boolean).forEach((material) => {
      if (!materialDefaults.has(material)) materialDefaults.set(material, {
        opacity: material.opacity, transparent: material.transparent,
        depthWrite: material.depthWrite, emissive: material.emissive?.clone()
      });
      const original = materialDefaults.get(material);
      const transparent = display.faded || original.transparent;
      if (material.transparent !== transparent) material.needsUpdate = true;
      material.transparent = transparent;
      material.opacity = display.faded ? Math.min(original.opacity, 0.12) : original.opacity;
      material.depthWrite = display.faded ? false : original.depthWrite;
      if (material.emissive && original.emissive) {
        material.emissive.copy(original.emissive);
        if (display.selected) material.emissive.setHex(0x3a2414);
      }
    });
  });
  document.querySelectorAll("[data-layer]").forEach((btn) => {
    const on = !!layersState[btn.dataset.layer];
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
  });
  document.getElementById("btnClinic").setAttribute("aria-pressed", String(layersState.clinic));
  if (renderer) renderer.clippingPlanes = layersState.cut ? [cutPlane] : [];
  const labelHost = document.getElementById("worldLabels");
  if (labelHost) labelHost.style.display = layersState.labels ? "block" : "none";
  updateClipBounds();
}

function syncLabels() {
  const host = document.getElementById("worldLabels");
  const svg = document.getElementById("labelLines");
  if (!host || !renderer || !root || !camera) return;
  if (!layersState.labels || (els.home && els.home.style.display !== "none")) {
    host.style.display = "none";
    if (svg) svg.style.display = "none";
    return;
  }
  host.style.display = "block";
  if (svg) svg.style.display = "block";

  const canvas = renderer.domElement;
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  const narrow = window.matchMedia("(max-width: 1040px)").matches;
  const phone = narrow && (w <= 520 || window.matchMedia("(max-width: 600px)").matches);

  const rowH = phone ? 24 : 27;
  const marginX = phone ? 8 : 14;
  // Measure the real chrome instead of guessing: the toolbar wraps to two rows
  // on narrow stages and the caption card is taller on long module titles.
  const stageRect = canvas.getBoundingClientRect();
  const clearOf = (sel, fallback) => {
    const el = document.querySelector(sel);
    if (!el || !el.offsetParent) return fallback;
    const r = el.getBoundingClientRect();
    if (!r.height) return fallback;
    return r;
  };
  const tb = clearOf(".stage .toolbar", null);
  const cap = clearOf(".stage .stage-caption", null);
  const topSafe = tb ? Math.max(0, tb.bottom - stageRect.top) + 10 : (phone ? 54 : 46);
  const bottomSafe = cap
    ? Math.max(0, stageRect.bottom - cap.top) + 10
    : (phone ? Math.min(150, h * 0.24) : Math.min(120, h * 0.17));
  const usable = Math.max(0, h - topSafe - bottomSafe);
  const perSide = Math.max(1, Math.floor(usable / rowH));
  const hardCap = phone ? 6 : (narrow ? 10 : perSide * 2);

  const tmp = new THREE.Vector3();
  const named = root.userData.named || [];
  const candidates = [];

  host.querySelectorAll("[data-part]").forEach((btn) => {
    const name = readPartName(btn);
    const mesh = named.find((m) => m.userData.label === name && m.visible);
    if (!mesh) { btn.style.display = "none"; return; }
    mesh.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) { btn.style.display = "none"; return; }
    box.getCenter(tmp).project(camera);
    if (tmp.z > 1 || tmp.x < -1 || tmp.x > 1 || tmp.y < -1 || tmp.y > 1) {
      btn.style.display = "none";
      return;
    }
    candidates.push({
      btn,
      name,
      ax: (tmp.x * 0.5 + 0.5) * w,
      ay: (-tmp.y * 0.5 + 0.5) * h,
      z: tmp.z,
      isSelected: !!(selected && selected.userData.label === name)
    });
  });

  // Nearest structures win a slot; the selected one always keeps its callout.
  candidates.sort((a, b) => {
    if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
    return a.z - b.z;
  });
  const keep = candidates.slice(0, hardCap);
  candidates.slice(hardCap).forEach((c) => { c.btn.style.display = "none"; });

  // Split into a left and a right gutter, then rebalance so one side cannot
  // overflow while the other sits empty.
  const mid = w * 0.5;
  keep.forEach((c) => { c.side = c.ax < mid ? "l" : "r"; });
  ["l", "r"].forEach((side) => {
    const over = keep.filter((c) => c.side === side);
    if (over.length <= perSide) return;
    const other = side === "l" ? "r" : "l";
    over.sort((a, b) => (side === "l" ? b.ax - a.ax : a.ax - b.ax));
    for (let i = 0; i < over.length - perSide; i++) {
      if (keep.filter((c) => c.side === other).length >= perSide) break;
      over[i].side = other;
    }
  });

  const parts = [];
  ["l", "r"].forEach((side) => {
    const col = keep.filter((c) => c.side === side).sort((a, b) => a.ay - b.ay);
    // Greedy top-down packing keeps vertical order, so leader lines rarely cross.
    let cursor = topSafe;
    col.forEach((c) => {
      if (cursor > h - bottomSafe) { c.drop = true; return; }
      c.ly = Math.max(cursor, Math.min(c.ay, h - bottomSafe));
      cursor = c.ly + rowH;
    });
    // Pull the stack back up if it ran past the bottom.
    const last = col.filter((c) => !c.drop).pop();
    if (last && last.ly > h - bottomSafe) {
      const shift = last.ly - (h - bottomSafe);
      col.forEach((c) => { if (!c.drop) c.ly = Math.max(topSafe, c.ly - shift); });
    }
    col.forEach((c) => {
      if (c.drop) { c.btn.style.display = "none"; return; }
      const btn = c.btn;
      btn.style.display = "block";
      btn.classList.toggle("on", c.isSelected);
      btn.classList.toggle("wlab-l", side === "l");
      btn.classList.toggle("wlab-r", side === "r");
      let lw = Number(btn.dataset.lw || 0);
      if (!lw || btn.dataset.lwName !== c.name) {
        btn.style.left = "-9999px";
        lw = btn.offsetWidth || 120;
        btn.dataset.lw = String(lw);
        btn.dataset.lwName = c.name;
      }
      const lx = side === "l" ? marginX : Math.max(marginX, w - marginX - lw);
      btn.style.left = lx + "px";
      btn.style.top = c.ly + "px";
      const edge = side === "l" ? lx + lw + 5 : lx - 5;
      let elbow = side === "l" ? edge + 16 : edge - 16;
      elbow = side === "l" ? Math.min(elbow, Math.max(edge + 4, c.ax - 6))
                           : Math.max(elbow, Math.min(edge - 4, c.ax + 6));
      parts.push(
        `<path d="M${edge.toFixed(1)} ${c.ly.toFixed(1)} L${elbow.toFixed(1)} ${c.ly.toFixed(1)} L${c.ax.toFixed(1)} ${c.ay.toFixed(1)}" class="ll${c.isSelected ? " on" : ""}"/>` +
        `<circle cx="${c.ax.toFixed(1)}" cy="${c.ay.toFixed(1)}" r="${c.isSelected ? 4 : 2.8}" class="ld${c.isSelected ? " on" : ""}"/>`
      );
    });
  });

  if (svg) {
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.innerHTML = parts.join("");
  }
}

function isolateByName(name) {
  if (!sceneReady || !root) return;
  const meshes = (root.userData.named || []).filter((m) => m.userData.label === name);
  selected = meshes[0] || null;
  if (!selected) return;
  study = selectPart(study, name);
  meshes.forEach((mesh) => { layersState[mesh.userData.layer] = true; });
  applyLayers();
  showExplain(name, selected);
  renderParts();
  if (spatial) spatial.onStudioSelection(name);
}

function resetIsolation() {
  selected = null;
  study = emptyStudy();
  applyLayers();
  hideExplain();
  if (els.pickLabel) els.pickLabel.style.display = "none";
  renderParts();
  if (spatial) spatial.onStudioSelection(null);
}

function syncStudyTools() {
  const active = sceneReady && !!selected;
  ["studyFocus", "studyIsolate", "studyFade", "studyHide"].forEach((id) => {
    document.getElementById(id).disabled = !active;
  });
  document.getElementById("studyRestore").disabled = !sceneReady;
  document.getElementById("viewSave").disabled = !sceneReady || els.home.style.display !== "none";
  document.getElementById("studyIsolate").setAttribute("aria-pressed", String(study.mode === "isolate"));
  document.getElementById("studyFade").setAttribute("aria-pressed", String(study.mode === "fade"));
  const mode = study.mode === "isolate" ? " · isolated" : study.mode === "fade" ? " · surrounding parts faded" : "";
  document.getElementById("studySelection").textContent = selected
    ? selected.userData.label + mode : "Select a structure on the model or in the list.";
}

function focusSelection() {
  if (!sceneReady || !selected) return;
  const meshes = root.userData.named.filter((m) => m.userData.label === selected.userData.label);
  const box = namedBox(meshes);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.02);
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfHorizontal = Math.atan(Math.tan(halfFov) * camera.aspect);
  const distance = Math.max(radius / Math.sin(Math.min(halfFov, halfHorizontal)) * 1.5, controls.minDistance);
  const direction = camera.position.clone().sub(controls.target).normalize();
  // Flush OrbitControls damping so a saved or focused view does not drift.
  controls.enableDamping = false;
  controls.update();
  controls.maxDistance = Math.max(controls.maxDistance, distance * 2);
  camera.position.copy(center).addScaledVector(direction, distance);
  controls.target.copy(center);
  controls.update();
  controls.enableDamping = true;
  syncLens();
  closeDrawers();
}

function getSavedViews() {
  try { return readViews(localStorage.getItem(VIEW_STORAGE_KEY), data.modules.map((m) => m.id)); }
  catch { return []; }
}

function writeSavedViews(views) {
  try { localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(views)); return true; }
  catch { toast("Views could not be saved. Browser storage may be full or unavailable."); return false; }
}

function renderSavedViews() {
  const views = getSavedViews();
  document.getElementById("viewCount").textContent = `(${views.length})`;
  document.getElementById("savedViewList").innerHTML = views.map((view) =>
    `<div class="saved-view"><button class="btn view-open" type="button" data-view-open="${esc(view.id)}">${esc(view.name)}<small>${esc(view.moduleId)} · ${view.side === "r" ? "Right" : "Left"} · ${esc(view.study.selected || "Full scene")}</small></button><button class="btn view-remove" type="button" data-view-remove="${esc(view.id)}" aria-label="Remove ${esc(view.name)}">×</button></div>`
  ).join("") || "<p>No saved views yet.</p>";
}

function restoreViewState(view) {
  const names = new Set(root.userData.named.map((m) => m.userData.label));
  study = {
    selected: names.has(view.study.selected) ? view.study.selected : null,
    mode: names.has(view.study.selected) ? view.study.mode : "all",
    hidden: view.study.hidden.filter((name) => names.has(name))
  };
  Object.keys(layersState).forEach((key) => {
    if (typeof view.layers[key] === "boolean") layersState[key] = view.layers[key];
  });
  selected = root.userData.named.find((m) => m.userData.label === study.selected) || null;
  applyLayers();
  controls.enableDamping = false;
  controls.update();
  camera.position.fromArray(view.camera);
  controls.target.fromArray(view.target);
  const distance = camera.position.distanceTo(controls.target);
  controls.maxDistance = Math.max(controls.maxDistance, distance * 2);
  controls.minDistance = Math.min(controls.minDistance, distance * 0.5);
  controls.update();
  controls.enableDamping = true;
  syncLens();
  playing = false;
  document.getElementById("btnPlay").innerHTML = `Play<span class="btn-rest"> physiology</span>`;
  if (selected) showExplain(study.selected, selected); else hideExplain();
  renderParts();
}

function bindStudyTools() {
  document.getElementById("partSearch").oninput = renderParts;
  document.getElementById("studyFocus").onclick = focusSelection;
  [["studyIsolate", "isolate"], ["studyFade", "fade"]].forEach(([id, mode]) => {
    document.getElementById(id).onclick = () => {
      if (!selected || !sceneReady) return;
      study.mode = study.mode === mode ? "all" : mode;
      applyLayers();
      renderParts();
      closeDrawers();
    };
  });
  document.getElementById("studyHide").onclick = () => {
    if (!selected || !sceneReady) return;
    study = hidePart(study);
    selected = null;
    applyLayers();
    hideExplain();
    renderParts();
  };
  document.getElementById("studyRestore").onclick = () => {
    if (!sceneReady) return;
    // Keep optional labels, cut plane and animation/device overlays as chosen.
    ["surface", "bone", "muscle", "membrane", "nerve", "vessel"].forEach((key) => { layersState[key] = true; });
    resetIsolation();
  };
  document.getElementById("viewSaveForm").onsubmit = (event) => {
    event.preventDefault();
    if (!sceneReady || els.home.style.display !== "none") return;
    const input = document.getElementById("viewName");
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const views = getSavedViews();
    if (views.length >= MAX_VIEWS) { toast(`You have ${MAX_VIEWS} views. Remove a view before saving another.`); return; }
    const view = {
      version: 1, id: crypto.randomUUID(), name, moduleId: current.id, side, appearance,
      camera: camera.position.toArray(), target: controls.target.toArray(),
      layers: { ...layersState }, study: { ...study, hidden: [...study.hidden] }
    };
    if (!writeSavedViews([view, ...views])) return;
    input.value = "";
    renderSavedViews();
    toast("Study view saved in this browser.");
  };
  document.getElementById("savedViewList").onclick = async (event) => {
    const open = event.target.closest("[data-view-open]");
    const remove = event.target.closest("[data-view-remove]");
    const views = getSavedViews();
    if (remove) {
      if (writeSavedViews(views.filter((v) => v.id !== remove.dataset.viewRemove))) renderSavedViews();
      return;
    }
    if (!open) return;
    const view = views.find((v) => v.id === open.dataset.viewOpen);
    if (!view) return;
    const reload = !sceneReady || current.id !== view.moduleId || side !== view.side || appearance !== view.appearance;
    side = view.side;
    appearance = view.appearance;
    document.getElementById("btnSide").innerHTML = `${side === "r" ? "Right" : "Left"}<span class="btn-rest"> side</span>`;
    applyLook();
    els.home.style.display = "none";
    closeDrawers();
    if (reload) await select(view.moduleId, view);
    else { restoreViewState(view); toast("Study view restored. Animation paused for study."); }
  };
  window.addEventListener("storage", (event) => { if (event.key === VIEW_STORAGE_KEY) renderSavedViews(); });
  renderSavedViews();
  syncStudyTools();
}

async function select(id, savedView = null) {
  closeDrawers();
  hideExplain();
  if (sections && sections.getSection() !== "core") {
    sections.setSection("core", { showHome: false });
  }
  sceneReady = false;
  selected = null;
  study = emptyStudy();
  document.getElementById("partSearch").value = "";
  syncStudyTools();
  current = data.modules.find((m) => m.id === id) || data.modules[0];
  els.home.style.display = "none";
  els.title.textContent = current.id + " · " + current.title;
  els.summary.textContent = current.summary;
  els.tags.innerHTML = current.tags.concat([current.first, appearance === "photoreal" ? "Photoreal tissue" : "Atlas colours"]).map((t) => `<span class="tag">${t}</span>`).join("");
  renderList(els.search.value);
  showTab("learn");
  const token = ++loadToken;
  const nextRoot = new THREE.Group();
  const moduleAtLoad = current;
  setLoader(true, 0.05, "Fetching BodyParts3D / Z-Anatomy meshes…");
  try {
    const result = await StudioAtlas.build(moduleAtLoad.scene, nextRoot, {
      side,
      appearance,
      lite: !!(els.lite && els.lite.checked),
      onProgress: (pct, file) => {
        if (token === loadToken) setLoader(true, pct, "Loading " + String(file).replace("_male.glb", "") + "…");
      }
    });
    if (token !== loadToken) { disposeStudyMaterials(nextRoot); return; }
    scene.remove(root);
    disposeStudyMaterials(root);
    root = nextRoot;
    scene.add(root);
    attachPhysiology(current.scene, root);
    attachClinic(current.scene, root, current.id);
    if (current.id === "M14" || current.id === "M16") {
      layersState.clinic = true;
      document.querySelector('[data-layer="clinic"]')?.classList.add("on");
    }
    sceneReady = true;
    applyLayers();
    hideExplain();
    if (els.pickLabel) els.pickLabel.style.display = "none";
    renderParts();
    fitCamera();
    if (savedView) restoreViewState(savedView);
    if (spatial) spatial.setModule(current.id);
    setLoader(false);
    toast(savedView ? "Study view restored. Animation paused for study." : (result.visible || 0) + " dissection parts ready. Select a structure.");
  } catch (err) {
    console.error(err);
    if (token !== loadToken) return;
    disposeStudyMaterials(nextRoot);
    if (window.StudioScenes) {
      window.StudioScenes.build(current.scene, root);
      window.StudioScenes.applyLayers(root, layersState);
      toast("Atlas download failed — schematic fallback is on.");
    } else {
      toast("Could not load dissection meshes. Check the network.");
    }
    renderParts();
    if (spatial) spatial.setModule(current.id);
    setLoader(false);
  }
}

function disposeStudyMaterials(group) {
  // Atlas geometry and textures are shared by the download cache.
  const materials = new Set();
  (group.userData.named || []).forEach((mesh) => {
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => { if (m) materials.add(m); });
  });
  materials.forEach((material) => material.dispose());
}

function namedBox(meshes) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  (meshes || []).forEach((mesh) => {
    if (!mesh || !mesh.visible || !mesh.geometry) return;
    mesh.updateWorldMatrix(true, false);
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    tmp.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    box.union(tmp);
  });
  return box;
}

function updateClipBounds() {
  if (!root) {
    clipBox.makeEmpty();
    return;
  }
  const box = namedBox(root.userData.named);
  if (box.isEmpty()) {
    clipBox.makeEmpty();
    return;
  }
  clipBox.copy(box);
  const pad = Math.max(box.getSize(clipCorner).length() * 0.04, 0.04);
  clipBox.expandByScalar(pad);
}

function fitCamera() {
  if (!controls || !root) return;
  root.updateWorldMatrix(true, true);
  updateClipBounds();
  const box = clipBox.isEmpty() ? namedBox(root.userData.named) : clipBox;
  if (box.isEmpty()) return;
  const sizeVec = box.getSize(new THREE.Vector3());
  const size = sizeVec.length();
  const radius = Math.max(size * 0.5, 0.2);
  const center = box.getCenter(new THREE.Vector3());
  // PerspectiveCamera.fov is vertical; on narrow/tall canvases the horizontal
  // FOV is smaller, so distance must be driven by max(fitV, fitH).
  const aspect = Math.max(0.05, camera.aspect || 1);
  const vHalf = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const fitV = radius / Math.tan(vHalf);
  const fitH = radius / Math.tan(hHalf);
  let fit = Math.max(fitV, fitH);
  // Leave room for in-stage chrome (toolbar + caption) on phone/tablet stages.
  let pad = 1.22;
  const stage = document.querySelector(".stage");
  if (stage) {
    const sw = stage.clientWidth || 0;
    const sh = stage.clientHeight || 0;
    if (sw > 0 && sh > 0 && (sw <= 1040 || aspect < 0.9)) {
      const topFrac = 56 / sh;
      const bottomFrac = Math.min(0.28, Math.max(0.14, 120 / sh));
      const usable = Math.max(0.48, 1 - topFrac - bottomFrac);
      pad = Math.max(pad, (1 / usable) * 0.98);
    }
  }
  controls.minDistance = Math.max(0.05, radius * 0.06);
  controls.maxDistance = Math.max(fit * pad * 4, radius * 8, 10);
  camera.position.copy(center).add(new THREE.Vector3(0.42, 0.18, 0.78).normalize().multiplyScalar(fit * pad));
  controls.target.copy(center);
  syncLens();
  controls.update();
  if (labTable) {
    labTable.position.y = box.min.y - 0.04;
    const span = Math.max(sizeVec.x, sizeVec.z, 1.2) * 1.8;
    labTable.scale.set(span / 4.8, 1, span / 4.8);
  }
}

// Ambient occlusion. Contact darkening in the creases is what separates a
// stack of separate meshes from something that reads as one specimen, and no
// amount of material tuning substitutes for it.
function buildComposer() {
  if (els.lite && els.lite.checked) { composer = null; gtaoPass = null; return; }
  try {
    const size = renderer.getSize(new THREE.Vector2());
    const w = Math.max(1, size.x);
    const h = Math.max(1, size.y);
    // MSAA is lost the moment we render into a target, so ask for a
    // multisampled one rather than shipping aliased edges.
    const target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: 4
    });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    // GTAOPass blends occlusion over whatever RenderPass already drew, so our
    // materials, clipping planes and the OutputPass tone mapping all survive.
    // SSAOPass cannot be used here: it renders its own beauty pass internally,
    // which bypasses OutputPass and comes out untonemapped.
    composer.addPass(new RenderPass(scene, camera));
    gtaoPass = new GTAOPass(scene, camera, w, h);
    gtaoPass.output = GTAOPass.OUTPUT.Default;
    gtaoPass.blendIntensity = aoTune.intensity;
    gtaoPass.updateGtaoMaterial({
      radius: aoTune.radius, distanceExponent: 1.0, thickness: 1.0,
      scale: 1.0, samples: 16, screenSpaceRadius: false
    });
    composer.addPass(gtaoPass);
    composer.addPass(new OutputPass());
  } catch (err) {
    console.warn("Ambient occlusion unavailable, falling back to direct render.", err);
    composer = null;
    gtaoPass = null;
  }
}

// Exposed so the Tweaks panel (and support) can turn occlusion off on weak
// hardware without a reload.
window.StudioRender = {
  aoActive: () => !!(composer && gtaoPass),
  camState: () => {
    if (!camera || !controls) return null;
    const size = new THREE.Vector3();
    if (!clipBox.isEmpty()) clipBox.getSize(size);
    return {
      near: camera.near, far: camera.far, aspect: camera.aspect,
      dist: camera.position.distanceTo(controls.target),
      minD: controls.minDistance, maxD: controls.maxDistance,
      clipEmpty: clipBox.isEmpty(), clipSize: size.toArray(),
      fogNear: scene.fog ? scene.fog.near : null,
      fogFar: scene.fog ? scene.fog.far : null,
      named: (root.userData.named || []).length,
      visible: (root.userData.named || []).filter((m) => m.visible).length
    };
  },
  aoRadius: (v) => {
    if (!gtaoPass) return null;
    if (typeof v === "number") gtaoPass.kernelRadius = v;
    return gtaoPass.kernelRadius;
  },
  // 0 = normal, 4 = raw AO buffer. For checking occlusion is really computing.
  aoDebug: (n) => {
    if (!gtaoPass) return null;
    gtaoPass.output = n | 0;
    return gtaoPass.output;
  },
  aoParams: (o) => { Object.assign(aoTune, o || {}); syncAO(); return { ...aoTune }; },
  setAO: (on) => {
    if (on && !composer) buildComposer();
    else if (!on && composer) disposeComposer();
    return !!composer;
  }
};

// SSAOPass copies cameraNear/cameraFar into its shader once, in the
// constructor, and never again -- only kernelRadius/minDistance/maxDistance are
// refreshed per frame. buildComposer runs before the first syncLens, so the
// shader was stuck on the camera's initial near 0.01 / far 400. The occlusion
// test compares a depth delta normalised over that range, so a real 0.1-unit
// gap came out at 0.00025, below minDistance, and every sample was rejected.
// That is why the AO buffer was blank at every kernel radius.
const aoTune = { radius: 0.25, intensity: 0.7 };

function syncAO() {
  if (!gtaoPass) return;
  gtaoPass.blendIntensity = aoTune.intensity;
  gtaoPass.updateGtaoMaterial({ radius: aoTune.radius });
}

function disposeComposer() {
  if (gtaoPass && gtaoPass.dispose) { try { gtaoPass.dispose(); } catch (e) {} }
  if (composer && composer.renderTarget1) {
    try { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); } catch (e) {}
  }
  composer = null;
  gtaoPass = null;
}

// The lab table only helps when the whole specimen is in frame. Close up it is
// just a grey wall behind the structure, which is what read as "clipped".
function stageFloorWanted() {
  if (!camera || !controls) return true;
  return camera.position.distanceTo(controls.target) > 1.6;
}

function syncStageFloor() {
  if (!labTable || !camera || !controls) return;
  const photo = appearance === "photoreal";
  const dist = camera.position.distanceTo(controls.target);
  const fade = THREE.MathUtils.clamp((dist - 1.6) / 1.4, 0, 1);
  labTable.visible = photo && fade > 0.01;
  labTable.material.opacity = fade;
  if (labGrid) labGrid.visible = !photo && fade > 0.01;
}

function syncLens() {
  if (!camera || !controls) return;
  camera.updateMatrixWorld(true);
  let zMin = Infinity;
  let zMax = -Infinity;
  if (!clipBox.isEmpty()) {
    const min = clipBox.min;
    const max = clipBox.max;
    const inv = camera.matrixWorldInverse;
    for (let i = 0; i < 8; i++) {
      clipCorner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(inv);
      const z = -clipCorner.z;
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
  } else {
    const dist = camera.position.distanceTo(controls.target);
    zMin = dist * 0.25;
    zMax = dist * 4;
  }
  const dist = camera.position.distanceTo(controls.target);
  // Scene radius, not controls.maxDistance: maxDistance is monotonic and used to
  // inflate far, which dragged near up with it and clipped close-up structures.
  const radius = clipBox.isEmpty() ? 2 : clipBox.getSize(clipSize).length() * 0.5;
  if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) {
    zMin = dist * 0.25;
    zMax = dist * 4;
  }
  // Keep near as far out as the geometry allows. A 0.0015 floor gave a
  // near/far ratio near 1:8000, and at that precision the depth buffer is flat
  // enough that GTAO reconstructs neighbouring samples to the same position and
  // finds no occlusion at all. controls.minDistance already stops the camera
  // well short of 0.01.
  let near = Math.min(zMin, dist) * 0.2;
  near = THREE.MathUtils.clamp(near, 0.01, 0.6);
  let far = Math.max(zMax * 1.6, dist + radius * 2.5, 12);
  // Keep the ratio inside a comfortable depth-buffer range by lifting far,
  // never by pushing near forward into the model.
  if (far / near > 20000) far = near * 20000;
  if (camera.near !== near || camera.far !== far) {
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  }
  if (scene && scene.fog) {
    // Fog must start beyond the specimen and always end after it starts, or the
    // whole model renders as flat background colour.
    const fogNear = Math.max(zMax * 2.4, dist + radius * 3, far * 0.72);
    const fogFar = Math.max(fogNear * 1.8, fogNear + radius * 6, far);
    scene.fog.near = fogNear;
    scene.fog.far = fogFar;
    if (camera.far < fogFar) {
      camera.far = fogFar;
      camera.updateProjectionMatrix();
    }
  }
}

function showTab(name) {
  const m = current;
  const html = {
    learn: `
      <div class="panel-block">
        <h3>Learning outcomes</h3>
        <p><b>Undergraduate</b></p>
        <ul>${m.outcomesUG.map((x) => `<li>${x}</li>`).join("")}</ul>
        <p><b>Postgraduate</b></p>
        <ul>${m.outcomesPG.map((x) => `<li>${x}</li>`).join("")}</ul>
      </div>
      <div class="panel-block">
        <h3>Structures</h3>
        <ul>${m.structures.map((x) => `<li>${x}</li>`).join("")}</ul>
      </div>
      <div class="panel-block">
        <h3>Physiology</h3>
        <p>${m.physiology}</p>
      </div>
      <div class="panel-block">
        <h3>Clinical correlation</h3>
        <p>${m.clinic}</p>
        <p>RCI papers: ${m.papers}</p>
      </div>`,
    workbook: `
      <div class="panel-block">
        <h3>Worksheet</h3>
        <ol>${m.worksheet.tasks.map((x) => `<li>${x}</li>`).join("")}</ol>
        <div class="qa">
          <label>Student note</label>
          <textarea id="note" rows="4" placeholder="Write identification notes here."></textarea>
          <label>Clinical sentence</label>
          <input id="clinicLine" placeholder="If this structure fails, the patient will…" />
        </div>
      </div>
      <div class="panel-block">
        <h3>Check items</h3>
        ${m.worksheet.mcq.map((item, i) => `
          <p><b>${i + 1}.</b> ${item.q}</p>
          <button class="btn" data-ans="${item.a}">Reveal answer</button>
        `).join("")}
      </div>`,
    activity: `
      <div class="panel-block">
        <h3>Classroom activity</h3>
        <p>${m.activity}</p>
      </div>
      <div class="panel-block">
        <h3>OSCE station (5 minutes)</h3>
        <p>${m.osce}</p>
        <ul>
          <li>Isolate the named structure on the dissection mesh.</li>
          <li>State innervation or pathway if applicable.</li>
          <li>Give one communication consequence of damage.</li>
        </ul>
      </div>
      <div class="panel-block">
        <h3>Faculty logbook rubric</h3>
        <p>3 marks: correct isolation. 3 marks: accurate label. 4 marks: clinical sentence linked to the RCI paper.</p>
      </div>`,
    exam: `
      <div class="panel-block">
        <h3>Viva frame</h3>
        <p>Identify the structure, give its innervation or pathway, and state one communication consequence of damage. Link the answer to ${m.papers}.</p>
      </div>
      <div class="panel-block">
        <h3>5-mark skeleton</h3>
        <ol>
          <li>Definition and location</li>
          <li>Anatomical relations</li>
          <li>Physiological role in communication</li>
          <li>Clinical test that depends on this structure</li>
          <li>One disorder and counselling line</li>
        </ol>
      </div>
      <div class="panel-block">
        <h3>Source</h3>
        <p>Dissection meshes from BodyParts3D / Z-Anatomy (CC BY-SA). Photoreal look is original tissue shading on those reconstructions — not cadaver photographs and not Elsevier Complete Anatomy. Educational use only. Not for surgical navigation.</p>
      </div>`
  };
  els.side.innerHTML = html[name] || html.learn;
  document.querySelectorAll(".tabs .btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  els.side.querySelectorAll("[data-ans]").forEach((btn) => {
    btn.onclick = () => { btn.textContent = btn.dataset.ans; };
  });
  const note = document.getElementById("note");
  const clinic = document.getElementById("clinicLine");
  const key = "aslp-" + m.id;
  if (note) {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    note.value = saved.note || "";
    if (clinic) clinic.value = saved.clinic || "";
    const persist = () => localStorage.setItem(key, JSON.stringify({ note: note.value, clinic: clinic ? clinic.value : "" }));
    note.oninput = persist;
    if (clinic) clinic.oninput = persist;
  }
}

function collectLogbook() {
  const notes = {};
  data.modules.forEach((m) => {
    const raw = localStorage.getItem("aslp-" + m.id);
    if (raw) notes[m.id] = JSON.parse(raw);
  });
  const liveNote = document.getElementById("note");
  const liveClinic = document.getElementById("clinicLine");
  if (current && (liveNote || liveClinic)) {
    notes[current.id] = {
      note: liveNote ? liveNote.value : (notes[current.id] && notes[current.id].note) || "",
      clinic: liveClinic ? liveClinic.value : (notes[current.id] && notes[current.id].clinic) || ""
    };
  }
  return {
    product: data.product.name,
    version: data.product.version,
    exportedAt: new Date().toISOString(),
    currentModule: current ? current.id : null,
    notes
  };
}

function pick(event) {
  if (!renderer || !root) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(root.userData.named || [], false);
  const hit = hits.find((h) => h.object.visible && h.object.userData.pickable);
  if (hit) isolateByName(hit.object.userData.label);
}

function applyLook() {
  if (!scene) return;
  const photo = appearance === "photoreal";
  scene.background = new THREE.Color(photo ? 0x16110d : stageColor);
  if (scene.fog) scene.fog.color.setHex(photo ? 0x16110d : stageColor);
  if (labTable) labTable.visible = photo && stageFloorWanted();
  if (labGrid) labGrid.visible = !photo;
  const btn = document.getElementById("btnLook");
  if (btn) btn.textContent = photo ? "Photoreal" : "Atlas colours";
  document.querySelector(".stage")?.classList.toggle("photo", photo);
}

function initThree() {
  const canvas = document.getElementById("view");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16110d);
  scene.fog = new THREE.Fog(0x16110d, 80, 220);
  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 400);
  camera.position.set(0.4, 0.2, 4.6);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !els.lite.checked, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(els.lite.checked ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = !els.lite.checked;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.clippingPlanes = [];

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xf7eee4, 0x3a322c, 0.85));
  const key = new THREE.DirectionalLight(0xfff6ea, 2.15);
  key.position.set(3.2, 7.2, 5.2);
  key.castShadow = !els.lite.checked;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight(0xb7cce0, 0.55);
  fill.position.set(-6, 2, -1);
  const rim = new THREE.DirectionalLight(0xffe2c4, 0.85);
  rim.position.set(-1.4, 3.8, -6);
  const bounce = new THREE.DirectionalLight(0x5a4a40, 0.32);
  bounce.position.set(0, -5, 2);
  scene.add(key, fill, rim, bounce);

  labGrid = new THREE.GridHelper(10, 20, 0x4a3d27, 0x2a2419);
  labGrid.position.y = -2.05;
  labGrid.visible = false;
  scene.add(labGrid);

  labTable = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.82, metalness: 0.22 })
  );
  labTable.rotation.x = -Math.PI / 2;
  labTable.position.y = -1.92;
  labTable.receiveShadow = true;
  labTable.material.transparent = true;
  scene.add(labTable);

  root = new THREE.Group();
  scene.add(root);

  buildComposer();

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.minDistance = 0.08;
  controls.maxDistance = 40;
  controls.screenSpacePanning = true;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (dx * dx + dy * dy < 16) pick(e);
  });

  clock = new THREE.Clock();
  let fitResizeTimer = 0;
  function resize() {
    const stage = document.querySelector(".stage");
    const canvas = renderer && renderer.domElement;
    // In Spatial mode the canvas is inset; size to the painted box, not the full stage.
    const spatialOn = document.body.classList.contains("spatial-on");
    let w = Math.max(1, stage.clientWidth || 800);
    let h = Math.max(1, stage.clientHeight || 600);
    if (spatialOn && canvas) {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw > 40 && ch > 40) {
        w = cw;
        h = ch;
      }
    }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    }
    // Re-fit after layout settles (mobile stack, dock, orientation, spatial toggle).
    if (root && root.userData && root.userData.named && root.userData.named.length) {
      clearTimeout(fitResizeTimer);
      fitResizeTimer = setTimeout(() => fitCamera(), 90);
    }
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) {
    const stage = document.querySelector(".stage");
    if (stage) new ResizeObserver(resize).observe(stage);
  }
  resize();
  applyLook();
  Tissue.preload();

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    controls.update();
    syncLens();
    syncStageFloor();
    if (playing && root.userData.animate) root.userData.animate(t);
    syncLabels();
    if (composer) { syncAO(); composer.render(); }
    else renderer.render(scene, camera);
  });
}

function bindDrawers() {
  const mask = document.getElementById("drawerMask");
  const modulesBtn = document.getElementById("btnModules");
  const learnBtn = document.getElementById("btnLearn");
  const dockHome = document.getElementById("btnDockHome");
  function closeDrawers() {
    document.body.classList.remove("drawer-rail", "drawer-side");
    if (mask) mask.hidden = true;
    if (modulesBtn) modulesBtn.setAttribute("aria-expanded", "false");
    if (learnBtn) learnBtn.setAttribute("aria-expanded", "false");
  }
  function setDrawer(which) {
    const already = document.body.classList.contains("drawer-" + which);
    closeDrawers();
    if (already) return;
    document.body.classList.add("drawer-" + which);
    if (mask) mask.hidden = false;
    if (which === "rail" && modulesBtn) modulesBtn.setAttribute("aria-expanded", "true");
    if (which === "side" && learnBtn) learnBtn.setAttribute("aria-expanded", "true");
  }
  window.closeDrawers = closeDrawers;
  if (modulesBtn) modulesBtn.onclick = () => setDrawer("rail");
  if (learnBtn) learnBtn.onclick = () => setDrawer("side");
  if (dockHome) {
    dockHome.onclick = () => {
      closeDrawers();
      hideExplain();
      if (sections) sections.setSection(sections.getSection() || "core");
      else els.home.style.display = "block";
      syncStudyTools();
    };
  }
  if (mask) mask.onclick = closeDrawers;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawers();
      hideExplain();
    }
  });
  window.matchMedia("(min-width: 1041px)").addEventListener("change", (e) => {
    if (e.matches) closeDrawers();
  });
}

function closeDrawers() {
  if (typeof window.closeDrawers === "function" && window.closeDrawers !== closeDrawers) {
    window.closeDrawers();
    return;
  }
  document.body.classList.remove("drawer-rail", "drawer-side");
  const mask = document.getElementById("drawerMask");
  if (mask) mask.hidden = true;
}

function exportLogbook() {
  const blob = new Blob([JSON.stringify(collectLogbook(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "aslp-anatomy-logbook.json";
  a.click();
  toast("Logbook exported.");
}

function zoomCamera(factor) {
  if (!controls || !camera) return;
  const dist = camera.position.distanceTo(controls.target);
  const next = Math.min(controls.maxDistance, Math.max(controls.minDistance, dist * factor));
  const dir = camera.position.clone().sub(controls.target).normalize();
  controls.enableDamping = false;
  controls.update();
  camera.position.copy(controls.target).addScaledVector(dir, next);
  controls.update();
  controls.enableDamping = true;
  syncLens();
}

function bind() {
  document.getElementById("openStudio").onclick = () => select("M06");
  document.getElementById("btnHome").onclick = () => {
    closeDrawers();
    hideExplain();
    if (sections) sections.setSection(sections.getSection() || "core");
    else els.home.style.display = "block";
    syncStudyTools();
  };
  document.getElementById("btnReset").onclick = () => { resetIsolation(); select(current.id); };
  document.getElementById("btnPlay").onclick = () => {
    playing = !playing;
    document.getElementById("btnPlay").innerHTML = playing
      ? `Pause<span class="btn-rest"> physiology</span>`
      : `Play<span class="btn-rest"> physiology</span>`;
    toast(playing ? "Physiology animation on." : "Animation paused.");
  };
  document.getElementById("btnClinic").onclick = () => {
    layersState.clinic = !layersState.clinic;
    applyLayers();
    toast(layersState.clinic ? "Clinic overlay visible." : "Clinic overlay hidden.");
  };
  document.getElementById("btnSide").onclick = () => {
    side = side === "r" ? "l" : "r";
    document.getElementById("btnSide").innerHTML = side === "r"
      ? `Right<span class="btn-rest"> side</span>`
      : `Left<span class="btn-rest"> side</span>`;
    if (els.home.style.display === "none") select(current.id);
  };
  const lookBtn = document.getElementById("btnLook");
  if (lookBtn) {
    lookBtn.onclick = () => {
      appearance = appearance === "photoreal" ? "atlas" : "photoreal";
      applyLook();
      if (root && root.userData.named && root.userData.named.length) {
        Tissue.repaint(root, { appearance, lite: !!(els.lite && els.lite.checked) });
        applyLayers();
        toast(appearance === "photoreal" ? "Photoreal dissection look." : "Teaching atlas colours.");
      }
    };
  }
  document.querySelectorAll("[data-export], #btnExport").forEach((btn) => {
    btn.onclick = exportLogbook;
  });
  els.search.oninput = () => renderList(els.search.value);
  document.querySelectorAll(".layer").forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.layer;
      layersState[key] = !layersState[key];
      btn.classList.toggle("on", layersState[key]);
      applyLayers();
      renderParts();
    };
  });
  document.querySelectorAll(".tabs .btn").forEach((b) => {
    b.onclick = () => showTab(b.dataset.tab);
  });
  const liteSheet = document.getElementById("liteModeSheet");
  const syncLite = (checked) => {
    if (els.lite) els.lite.checked = checked;
    if (liteSheet) liteSheet.checked = checked;
    toast("Reload after changing Lite mode.");
  };
  if (els.lite) els.lite.onchange = () => syncLite(els.lite.checked);
  if (liteSheet) liteSheet.onchange = () => syncLite(liteSheet.checked);
  document.getElementById("homeGrid").innerHTML = data.modules.map((m) =>
    `<button class="tile" data-id="${m.id}"><b>${m.id}</b>${m.title}<span>${m.papers}</span></button>`
  ).join("");
  document.getElementById("homeGrid").onclick = (e) => {
    const t = e.target.closest("[data-id]");
    if (t) select(t.dataset.id);
  };
  window.addEventListener("studio-stage-color", (e) => {
    stageColor = e.detail;
    if (!scene) return;
    if (appearance === "photoreal") return;
    scene.background = new THREE.Color(stageColor);
    if (scene.fog) scene.fog.color.setHex(stageColor);
  });
  document.querySelectorAll("[data-click]").forEach((btn) => {
    btn.onclick = () => document.getElementById(btn.dataset.click)?.click();
  });
  bindLabelClicks();
  bindDrawers();
  bindStudyTools();
  spatial = createSpatialController({
    getCurrentModuleId: () => current && current.id,
    getMeshLabels: () => [...new Set((root && root.userData.named || []).map((m) => m.userData.label).filter(Boolean))],
    selectByLabel: (name) => isolateByName(name),
    fitSpecimen: () => fitCamera(),
    focusSelected: () => focusSelection(),
    zoom3d: (factor) => zoomCamera(factor)
  });
  sections = createSectionsController({
    openModule: (id) => {
      if (spatial && spatial.isEnabled && spatial.isEnabled()) {
        /* keep spatial if user already on; module load refreshes maps */
      }
      select(id);
    },
    onShowHome: () => {
      hideExplain();
      syncStudyTools();
    },
    onSectionChange: () => {
      closeDrawers();
    }
  });
}

renderList("");
bind();
initThree();
