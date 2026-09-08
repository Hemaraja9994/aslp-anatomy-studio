import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

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
  const n = String(o.name_en || o.name || "").toLowerCase();
  const sys = o.system;
  if (n.includes("tympanic membrane") || n.includes("quadrangular")) return "membrane";
  if (n.includes("cartilage") || /hyoid|incus|malleus|stapes/.test(n)) return "bone";
  if (sys === "skeletal") return "bone";
  if (sys === "muscular") return "muscle";
  if (sys === "nervous") return "nerve";
  if (sys === "cardiovascular") return "vessel";
  if (sys === "articular") return "membrane";
  return "surface";
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

const PALETTE = {
  bone: { color: 0xe8d7b4, roughness: 0.52, metalness: 0.04, clearcoat: 0.1 },
  muscle: { color: 0x8c3a3c, roughness: 0.48, metalness: 0.0, clearcoat: 0.22 },
  nerve: { color: 0xe8d56a, roughness: 0.32, metalness: 0.04, clearcoat: 0.28 },
  vessel: { color: 0x9e2e36, roughness: 0.28, metalness: 0.08, clearcoat: 0.4 },
  membrane: { color: 0xd7c4b0, roughness: 0.22, metalness: 0.0, opacity: 0.78, transparent: true, clearcoat: 0.45 },
  surface: { color: 0xddb49c, roughness: 0.44, metalness: 0.0, clearcoat: 0.16 }
};

function paint(mesh, layer) {
  const p = PALETTE[layer] || PALETTE.surface;
  mesh.material = new THREE.MeshPhysicalMaterial({
    color: p.color,
    roughness: p.roughness,
    metalness: p.metalness || 0,
    clearcoat: p.clearcoat || 0,
    clearcoatRoughness: 0.45,
    sheen: 0.18,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(p.color),
    transparent: !!p.transparent,
    opacity: p.opacity ?? 1,
    side: THREE.DoubleSide
  });
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
    const organs = (await loadOrgans()).filter((o) => o.scenes.includes(sceneName));
    const files = [...new Set(organs.map((o) => o.file))];
    const side = opts.side || "r";
    const wanted = new Map();
    organs.forEach((o) => {
      const lat = lateralityOf(o.name + " " + o.node + " " + o.id);
      if (lat !== "m" && lat !== side) return;
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
        obj.userData.layer = rec.layer;
        obj.userData.organ = rec;
        obj.userData.label = rec.name;
        paint(obj, rec.layer);
        root.userData.named.push(obj);
      });
      holder.add(cloned);
    }

    const box = new THREE.Box3();
    holder.updateWorldMatrix(true, true);
    holder.traverse((o) => {
      if (o.isMesh && o.visible) box.expandByObject(o);
    });
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      holder.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      holder.scale.setScalar(3.4 / maxDim);
    }
    if (opts.onProgress) opts.onProgress(1, "ready");
    return { files, visible: root.userData.named.length };
  }
};
