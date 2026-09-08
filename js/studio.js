import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { StudioAtlas } from "./atlas.js";
import { attachPhysiology } from "./physiology.js";
import { attachClinic } from "./clinic.js";
import { Tissue } from "./tissue.js";

window.THREE = THREE;

const data = window.STUDIO_DATA;
const layersState = {
  surface: true, bone: true, muscle: true, membrane: true,
  nerve: true, vessel: true, function: true, clinic: false, labels: true, cut: true
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
let selected = null;
let side = "r";
let loadToken = 0;
let appearance = "photoreal";
let stageColor = 0x16110d;
let labTable, labGrid;
const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.02);

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.style.display = "block";
  setTimeout(() => { els.toast.style.display = "none"; }, 2600);
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
  const meshes = (root && root.userData.named) || [];
  if (!meshes.length) {
    els.parts.innerHTML = "<p class='muted'>Open a module to list dissection parts.</p>";
    const host = document.getElementById("worldLabels");
    if (host) host.innerHTML = "";
    return;
  }
  const unique = [...new Set(meshes.map((m) => m.userData.label).filter(Boolean))].sort();
  els.parts.innerHTML = unique.map((name) =>
    `<button class="part${selected && selected.userData.label === name ? " on" : ""}" data-part="${name}">${name}</button>`
  ).join("");
  els.parts.querySelectorAll("[data-part]").forEach((btn) => {
    btn.onclick = () => isolateByName(btn.dataset.part);
  });
  const host = document.getElementById("worldLabels");
  if (host) {
    host.innerHTML = unique.map((name) => `<button class="wlab" data-part="${name}">${name}</button>`).join("");
    host.querySelectorAll("[data-part]").forEach((btn) => {
      btn.onclick = () => isolateByName(btn.dataset.part);
    });
  }
}

function applyLayers() {
  if (!root) return;
  root.traverse((obj) => {
    const layer = obj.userData && obj.userData.layer;
    if (!layer) return;
    if (layer === "labels" || layer === "cut") return;
    obj.visible = !!layersState[layer];
  });
  if (renderer) renderer.clippingPlanes = layersState.cut ? [cutPlane] : [];
  const labelHost = document.getElementById("worldLabels");
  if (labelHost) labelHost.style.display = layersState.labels ? "block" : "none";
}

function syncLabels() {
  const host = document.getElementById("worldLabels");
  if (!host || !renderer || !root || !camera) return;
  if (!layersState.labels || (els.home && els.home.style.display !== "none")) {
    host.style.display = "none";
    return;
  }
  host.style.display = "block";
  const canvas = renderer.domElement;
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  const tmp = new THREE.Vector3();
  host.querySelectorAll("[data-part]").forEach((btn) => {
    const mesh = (root.userData.named || []).find((m) => m.userData.label === btn.dataset.part && m.visible);
    if (!mesh) {
      btn.style.display = "none";
      return;
    }
    mesh.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) {
      btn.style.display = "none";
      return;
    }
    box.getCenter(tmp).project(camera);
    if (tmp.z > 1) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = "block";
    btn.style.left = ((tmp.x * 0.5 + 0.5) * w) + "px";
    btn.style.top = ((-tmp.y * 0.5 + 0.5) * h) + "px";
    btn.classList.toggle("on", !!(selected && selected.userData.label === btn.dataset.part));
  });
}

function clearHighlight() {
  if (!root) return;
  (root.userData.named || []).forEach((m) => {
    if (m.material && m.material.emissive) m.material.emissive.setHex(0x000000);
    if (m.material) {
      const membrane = m.userData.kind === "membrane" || m.userData.layer === "membrane";
      m.material.transparent = membrane;
      m.material.opacity = membrane ? 0.86 : 1;
    }
  });
}

function isolateByName(name) {
  const meshes = (root.userData.named || []).filter((m) => m.userData.label === name);
  if (!meshes.length) return;
  selected = meshes[0];
  if (selected.userData.layer === "clinic") {
    layersState.clinic = true;
    document.querySelector('[data-layer="clinic"]')?.classList.add("on");
  }
  clearHighlight();
  (root.userData.named || []).forEach((m) => {
    const on = m.userData.label === name;
    if (m.material) {
      m.material.transparent = true;
      m.material.opacity = on ? 1 : 0.07;
      if (on && m.material.emissive) m.material.emissive.setHex(appearance === "atlas" ? 0x3d2611 : 0x3a2414);
    }
  });
  if (els.pickLabel) {
    els.pickLabel.style.display = "block";
    els.pickLabel.textContent = name;
  }
  renderParts();
  toast(name);
}

function resetIsolation() {
  selected = null;
  clearHighlight();
  applyLayers();
  if (els.pickLabel) els.pickLabel.style.display = "none";
  renderParts();
}

async function select(id) {
  closeDrawers();
  current = data.modules.find((m) => m.id === id) || data.modules[0];
  els.home.style.display = "none";
  els.title.textContent = current.id + " · " + current.title;
  els.summary.textContent = current.summary;
  els.tags.innerHTML = current.tags.concat([current.first, appearance === "photoreal" ? "Photoreal tissue" : "Atlas colours"]).map((t) => `<span class="tag">${t}</span>`).join("");
  renderList(els.search.value);
  showTab("learn");
  const token = ++loadToken;
  setLoader(true, 0.05, "Fetching BodyParts3D / Z-Anatomy meshes…");
  try {
    const result = await StudioAtlas.build(current.scene, root, {
      side,
      appearance,
      lite: !!(els.lite && els.lite.checked),
      onProgress: (pct, file) => {
        setLoader(true, pct, "Loading " + String(file).replace("_male.glb", "") + "…");
      }
    });
    if (token !== loadToken) return;
    attachPhysiology(current.scene, root);
    attachClinic(current.scene, root, current.id);
    if (current.id === "M14" || current.id === "M16") {
      layersState.clinic = true;
      document.querySelector('[data-layer="clinic"]')?.classList.add("on");
    }
    applyLayers();
    selected = null;
    if (els.pickLabel) els.pickLabel.style.display = "none";
    renderParts();
    fitCamera();
    setLoader(false);
    toast((result.visible || 0) + " dissection parts ready. Click a structure.");
  } catch (err) {
    console.error(err);
    if (token !== loadToken) return;
    if (window.StudioScenes) {
      window.StudioScenes.build(current.scene, root);
      window.StudioScenes.applyLayers(root, layersState);
      toast("Atlas download failed — schematic fallback is on.");
    } else {
      toast("Could not load dissection meshes. Check the network.");
    }
    renderParts();
    setLoader(false);
  }
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

function fitCamera() {
  if (!controls || !root) return;
  root.updateWorldMatrix(true, true);
  const box = namedBox(root.userData.named);
  if (box.isEmpty()) return;
  const sizeVec = box.getSize(new THREE.Vector3());
  const size = sizeVec.length();
  const center = box.getCenter(new THREE.Vector3());
  controls.minDistance = Math.max(0.35, size * 0.4);
  controls.maxDistance = Math.max(8, size * 8);
  camera.position.copy(center).add(new THREE.Vector3(size * 0.42, size * 0.18, size * 0.78));
  controls.target.copy(center);
  controls.update();
  if (labTable) {
    labTable.position.y = box.min.y - 0.04;
    const span = Math.max(sizeVec.x, sizeVec.z, 1.2) * 1.8;
    labTable.scale.set(span / 4.8, 1, span / 4.8);
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
        <p>Concept and designed by Hemaraja Nayaka. S.</p>
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
  if (labTable) labTable.visible = photo;
  if (labGrid) labGrid.visible = !photo;
  const btn = document.getElementById("btnLook");
  if (btn) btn.textContent = photo ? "Photoreal" : "Atlas colours";
  document.querySelector(".stage")?.classList.toggle("photo", photo);
}

function initThree() {
  const canvas = document.getElementById("view");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16110d);
  scene.fog = new THREE.Fog(0x16110d, 18, 40);
  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 80);
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
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0008;
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
  scene.add(labTable);

  root = new THREE.Group();
  scene.add(root);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

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
  function resize() {
    const stage = document.querySelector(".stage");
    const w = stage.clientWidth || 800;
    const h = stage.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  resize();
  applyLook();
  Tissue.preload();

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    controls.update();
    if (playing && root.userData.animate) root.userData.animate(t);
    syncLabels();
    renderer.render(scene, camera);
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
      els.home.style.display = "block";
    };
  }
  if (mask) mask.onclick = closeDrawers;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawers();
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

function bind() {
  document.getElementById("openStudio").onclick = () => select("M06");
  document.getElementById("btnHome").onclick = () => {
    closeDrawers();
    els.home.style.display = "block";
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
        if (selected) isolateByName(selected.userData.label);
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
  bindDrawers();
}

renderList("");
bind();
initThree();
