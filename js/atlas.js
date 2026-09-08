import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { Tissue } from "./tissue.js";

const cache = new Map();
let loader;
let organsCache = null;

function getLoader() {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

function layerFor(o) {
  return Tissue.layerOf(Tissue.kindFor(o));
}

async function loadOrgans() {
  if (organsCache) return organsCache;
  const cat = window.ATLAS_CATALOG;
  if (cat.organs && cat.organs.length) {
    organsCache = cat.organs;
    return organsCache;
  }
  let man;
  let lastErr;
  for (const base of cat.cdn || []) {
    try {
      const res = await fetch(base + "manifest.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      man = await res.json();
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!man) throw lastErr || new Error("Atlas manifest missing");
  const compiled = {};
  Object.entries(cat.scenePatterns || {}).forEach(([k, v]) => {
    compiled[k] = new RegExp(v, "i");
  });
  const out = [];
  (man.organs || []).forEach((o) => {
    const name = o.name_en || "";
    const tags = [];
    Object.entries(compiled).forEach(([sc, rx]) => {
      if (!rx.test(name)) return;
      if (o.system === "cardiovascular" && sc !== "brain") return;
      if (o.system === "cardiovascular" && !/middle cerebral|basilar artery$/.test(name.toLowerCase())) return;
      tags.push(sc);
    });
    if (!tags.length) return;
    out.push({
      id: o.organ_id,
      name,
      node: o.node,
      file: o.mesh_file,
      system: o.system,
      kind: Tissue.kindFor(o),
      layer: layerFor(o),
      scenes: tags
    });
  });
  organsCache = out;
  return out;
}

function loadGLB(file, onProgress) {
  if (cache.has(file)) return cache.get(file);
  const bases = (window.ATLAS_CATALOG && window.ATLAS_CATALOG.cdn) || [];
  const pending = (async () => {
    let lastErr;
    for (const base of bases) {
      try {
        return await new Promise((resolve, reject) => {
          getLoader().load(base + file, resolve, onProgress, reject);
        });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("Could not load " + file);
  })();
  cache.set(file, pending);
  return pending;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function lateralityOf(name) {
  const n = " " + String(name || "").toLowerCase() + " ";
  if (/\(left\)|\.l\b| left /.test(n)) return "l";
  if (/\(right\)|\.r\b| right /.test(n)) return "r";
  const id = String(name || "").toLowerCase();
  if (/_l$/.test(id)) return "l";
  if (/_r$/.test(id)) return "r";
  return "m";
}

function namedBox(meshes) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  meshes.forEach((mesh) => {
    if (!mesh || !mesh.visible || !mesh.geometry) return;
    mesh.updateWorldMatrix(true, false);
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    tmp.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    box.union(tmp);
  });
  return box;
}

function matchOrgan(obj, wanted) {
  const keys = [obj.name, obj.userData && obj.userData.name, obj.parent && obj.parent.name];
  for (const k of keys) {
    const rec = wanted.get(norm(k));
    if (rec) return rec;
  }
  const n = norm(obj.name);
  if (!n) return null;
  for (const [key, rec] of wanted) {
    if (n === key || n.startsWith(key + " ") || key.startsWith(n + " ")) return rec;
  }
  return null;
}

export const StudioAtlas = {
  lateralityOf,
  async build(sceneName, root, opts = {}) {
    await Tissue.preload();
    const organs = (await loadOrgans()).filter((o) => o.scenes.includes(sceneName));
    const files = [...new Set(organs.map((o) => o.file))];
    const side = opts.side || "r";
    const wanted = new Map();
    organs.forEach((o) => {
      const lat = lateralityOf(o.name + " " + o.node + " " + o.id);
      if (sceneName !== "chest" && lat !== "m" && lat !== side) return;
      wanted.set(norm(o.node), o);
      wanted.set(norm(o.name), o);
    });

    root.clear();
    root.userData.animate = null;
    root.userData.named = [];
    const holder = new THREE.Group();
    holder.name = "atlas";
    root.add(holder);

    let done = 0;
    for (const file of files) {
      const gltf = await loadGLB(file, (ev) => {
        if (opts.onProgress && ev.total) {
          opts.onProgress((done + ev.loaded / ev.total) / files.length, file);
        }
      });
      done += 1;
      const cloned = gltf.scene.clone(true);
      cloned.traverse((obj) => {
        if (!obj.isMesh) return;
        const rec = matchOrgan(obj, wanted);
        if (!rec) {
          obj.visible = false;
          obj.userData.pickable = false;
          return;
        }
        obj.visible = true;
        obj.userData.pickable = true;
        obj.userData.kind = rec.kind || Tissue.kindFor(rec);
        obj.userData.layer = rec.layer || Tissue.layerOf(obj.userData.kind);
        obj.userData.organ = rec;
        obj.userData.label = rec.name;
        Tissue.paint(obj, obj.userData.kind, {
          appearance: opts.appearance || "photoreal",
          lite: !!opts.lite
        });
        root.userData.named.push(obj);
      });
      holder.add(cloned);
    }

    const box = namedBox(root.userData.named);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = 3.4 / maxDim;
      holder.scale.setScalar(s);
      holder.position.copy(center).multiplyScalar(-s);
      holder.updateWorldMatrix(true, true);
    }
    if (opts.onProgress) opts.onProgress(1, "ready");
    return { files, visible: root.userData.named.length };
  }
};
