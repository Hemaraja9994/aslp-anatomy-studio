import * as THREE from "three";
import { TISSUE_MAPS } from "./maps.js";

const KIND_ID = {
  muscle: 0, bone: 1, cartilage: 2, nerve: 3, vessel: 4,
  membrane: 5, brain: 6, mucosa: 7, skin: 8
};

const MAP_FOR = {
  muscle: "muscle", bone: "bone", cartilage: "cartilage", nerve: "nerve",
  vessel: "mucosa", membrane: "mucosa", brain: "brain", mucosa: "mucosa", skin: "skin"
};

const PHOTO = {
  muscle:    { color: 0x8a2e32, roughness: 0.42, clearcoat: 0.38, clearcoatRoughness: 0.32, sheen: 0.5, sheenColor: 0x4a1018, sheenRoughness: 0.4, env: 0.45 },
  bone:      { color: 0xe4d3b4, roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.6, sheen: 0.08, sheenColor: 0xdcc8a0, sheenRoughness: 0.7, env: 0.35 },
  cartilage: { color: 0xd9d0c2, roughness: 0.22, clearcoat: 0.58, clearcoatRoughness: 0.18, sheen: 0.22, sheenColor: 0xc8d0cc, sheenRoughness: 0.35, env: 0.7 },
  nerve:     { color: 0xe6d6a0, roughness: 0.38, clearcoat: 0.28, clearcoatRoughness: 0.4, sheen: 0.32, sheenColor: 0xf0e6b8, sheenRoughness: 0.45, env: 0.5 },
  vessel:    { color: 0x7a1e28, roughness: 0.28, clearcoat: 0.48, clearcoatRoughness: 0.28, sheen: 0.18, sheenColor: 0x4a0810, sheenRoughness: 0.35, env: 0.55 },
  membrane:  { color: 0xd2b09c, roughness: 0.18, clearcoat: 0.62, clearcoatRoughness: 0.16, sheen: 0.28, sheenColor: 0xc08070, sheenRoughness: 0.3, env: 0.65, opacity: 0.86, transparent: true },
  brain:     { color: 0xc49a8c, roughness: 0.36, clearcoat: 0.42, clearcoatRoughness: 0.28, sheen: 0.3, sheenColor: 0x8a5048, sheenRoughness: 0.4, env: 0.5 },
  mucosa:    { color: 0xc46a62, roughness: 0.26, clearcoat: 0.55, clearcoatRoughness: 0.2, sheen: 0.35, sheenColor: 0x9a3030, sheenRoughness: 0.32, env: 0.55 },
  skin:      { color: 0xd4a07c, roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.55, sheen: 0.48, sheenColor: 0xb04838, sheenRoughness: 0.45, env: 0.55 }
};

const ATLAS = {
  muscle:    { color: 0x8c3a3c, roughness: 0.48, clearcoat: 0.22 },
  bone:      { color: 0xe8d7b4, roughness: 0.52, clearcoat: 0.1 },
  cartilage: { color: 0xd8cfc0, roughness: 0.28, clearcoat: 0.35 },
  nerve:     { color: 0xe8d56a, roughness: 0.32, clearcoat: 0.28 },
  vessel:    { color: 0x9e2e36, roughness: 0.28, clearcoat: 0.4 },
  membrane:  { color: 0xd7c4b0, roughness: 0.22, clearcoat: 0.45, opacity: 0.78, transparent: true },
  brain:     { color: 0xc9a090, roughness: 0.4, clearcoat: 0.18 },
  mucosa:    { color: 0xc47a72, roughness: 0.34, clearcoat: 0.3 },
  skin:      { color: 0xddb49c, roughness: 0.44, clearcoat: 0.16 }
};

const LAYER_OF = {
  muscle: "muscle", bone: "bone", cartilage: "bone", nerve: "nerve",
  vessel: "vessel", membrane: "membrane", brain: "surface", mucosa: "surface", skin: "surface"
};

const textures = {};
let preloadPromise = null;

function ensureUv(mesh) {
  const geo = mesh.geometry;
  if (!geo || geo.attributes.uv) return;
  const count = geo.attributes.position ? geo.attributes.position.count : 0;
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
}

function loadOne(name, url) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    const apply = (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      textures[name] = tex;
      resolve(tex);
    };
    loader.load("./textures/" + name + ".jpg", apply, undefined, () => {
      loader.load(url, apply, undefined, () => resolve(null));
    });
  });
}

function patchPhotoreal(material, kind) {
  const id = KIND_ID[kind] ?? 8;
  material.defines = Object.assign(material.defines || {}, { TISSUE_KIND: id });
  material.customProgramCacheKey = () => "aslp-photo-v3-" + kind;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 vWp; varying vec3 vWn;\n" + shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWn = normalize(mat3(modelMatrix) * objectNormal);`
    );
    shader.fragmentShader = `
      varying vec3 vWp; varying vec3 vWn;
      float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float vn(vec3 p){
        vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(
          mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
          mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y),
          f.z);
      }
      float fbm(vec3 p){ return vn(p)*0.55 + vn(p*2.07)*0.28 + vn(p*4.13)*0.17; }
    ` + shader.fragmentShader
      .replace("#include <map_fragment>", `
        #ifdef USE_MAP
        {
          vec3 wp = vWp * 1.85;
          vec3 bn = abs(normalize(vWn));
          bn = pow(bn, vec3(4.0));
          bn /= (bn.x + bn.y + bn.z + 1e-5);
          vec4 mx = texture2D(map, wp.yz);
          vec4 my = texture2D(map, wp.xz);
          vec4 mz = texture2D(map, wp.xy);
          vec4 sampledDiffuseColor = mx * bn.x + my * bn.y + mz * bn.z;
          diffuseColor *= mix(vec4(1.0), sampledDiffuseColor, 0.82);
        }
        #endif
      `)
      .replace("#include <color_fragment>", `
        #include <color_fragment>
        {
          vec3 wp = vWp * 2.2;
          vec3 Nn = normalize(vWn);
          float m = fbm(wp);
          float m2 = fbm(wp * 3.1 + 7.2);
          vec3 fiber = normalize(cross(Nn, vec3(0.0, 1.0, 0.15)));
          if (length(fiber) < 0.2) fiber = normalize(cross(Nn, vec3(1.0, 0.0, 0.0)));
          float str = sin(dot(wp, fiber) * 36.0 + m * 4.0) * 0.5 + 0.5;
          vec3 col = diffuseColor.rgb;
          #if TISSUE_KIND == 0
            vec3 dark = col * vec3(0.52, 0.32, 0.34);
            vec3 light = col * vec3(1.22, 0.96, 0.9);
            col = mix(dark, light, str);
            col = mix(col, vec3(0.72, 0.54, 0.36), smoothstep(0.74, 0.96, m2) * 0.22);
            col *= 0.88 + 0.18 * m;
          #elif TISSUE_KIND == 1
            col *= 0.9 + 0.14 * m;
            col = mix(col, col * vec3(0.84, 0.7, 0.52), m2 * 0.32);
            col *= 0.92 + 0.12 * vn(wp * 22.0);
          #elif TISSUE_KIND == 2
            col *= 0.92 + 0.12 * m;
            col = mix(col, vec3(0.8, 0.86, 0.84), m2 * 0.18);
          #elif TISSUE_KIND == 3
            col *= mix(0.82, 1.14, str);
            col = mix(col, vec3(0.93, 0.86, 0.62), m * 0.18);
          #elif TISSUE_KIND == 4
            col *= 0.84 + 0.28 * str;
            col = mix(col, vec3(0.28, 0.05, 0.07), m2 * 0.22);
          #elif TISSUE_KIND == 5
            col *= 0.9 + 0.16 * m;
          #elif TISSUE_KIND == 6
            col = mix(col, col * vec3(0.74, 0.54, 0.5), m * 0.38);
            col = mix(col, vec3(0.45, 0.12, 0.14), smoothstep(0.78, 0.93, vn(wp * 9.0)) * 0.32);
          #elif TISSUE_KIND == 7
            col *= 0.88 + 0.2 * m;
            col = mix(col, vec3(0.72, 0.26, 0.3), m2 * 0.16);
          #else
            col *= 0.9 + 0.14 * m;
            col = mix(col, vec3(0.62, 0.22, 0.2), m2 * 0.15);
          #endif
          diffuseColor.rgb = col;
        }
      `)
      .replace("#include <roughnessmap_fragment>", `
        #include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (0.84 + 0.26 * fbm(vWp * 5.0)) - 0.07 * sin(dot(vWp, vec3(2.1, 5.3, 1.7))), 0.08, 0.94);
      `);
  };
  material.needsUpdate = true;
}

function makeMaterial(kind, appearance, lite) {
  const photo = appearance !== "atlas";
  const src = photo ? (PHOTO[kind] || PHOTO.skin) : (ATLAS[kind] || ATLAS.skin);
  const mat = new THREE.MeshPhysicalMaterial({
    color: src.color,
    roughness: src.roughness,
    metalness: 0,
    clearcoat: src.clearcoat || 0,
    clearcoatRoughness: src.clearcoatRoughness ?? 0.45,
    sheen: src.sheen || 0,
    sheenRoughness: src.sheenRoughness ?? 0.5,
    sheenColor: new THREE.Color(src.sheenColor || src.color),
    envMapIntensity: src.env ?? 0.45,
    transparent: !!src.transparent,
    opacity: src.opacity ?? 1,
    side: THREE.DoubleSide
  });
  if (photo && !lite && src.transmission) {
    mat.transmission = src.transmission;
    mat.thickness = src.thickness || 0.4;
    mat.ior = src.ior || 1.4;
    if (src.attenuationColor) mat.attenuationColor = new THREE.Color(src.attenuationColor);
  }
  if (photo) {
    const mapName = MAP_FOR[kind] || "skin";
    if (textures[mapName]) mat.map = textures[mapName];
    patchPhotoreal(mat, kind);
  }
  return mat;
}

export const Tissue = {
  layerOf(kind) {
    return LAYER_OF[kind] || "surface";
  },
  kindFor(o) {
    const n = String(o.name_en || o.name || "").toLowerCase();
    const sys = o.system;
    if (/helix|antihelix|tragus|antitragus|concha of auricle|lobule of auricle|apex of auricle|crura of antihelix|auricular tubercle|pinna/.test(n)) return "skin";
    if (/tympanic membrane|quadrangular/.test(n)) return "membrane";
    if (/gyrus|sulcus|insula|thalamus|putamen|caudate|pons|medulla|colliculus|geniculate|nucle|cerebellum|callosum|ventricle|hypothalamus|tentorium/.test(n)) return "brain";
    if (/tongue|palate|uvula|pharynx|oesophagus/.test(n) && sys !== "muscular") return "mucosa";
    if (/cartilage|epiglottis/.test(n)) return "cartilage";
    if (/incus|malleus|stapes|hyoid/.test(n)) return "bone";
    if (sys === "skeletal") return /cartilage/.test(n) ? "cartilage" : "bone";
    if (sys === "muscular") return "muscle";
    if (sys === "nervous") return "nerve";
    if (sys === "cardiovascular") return "vessel";
    if (sys === "articular") return "membrane";
    if (sys === "integumentary") return "skin";
    if (sys === "respiratory" && /trachea|epiglottis/.test(n)) return "cartilage";
    if (sys === "digestive") return "mucosa";
    return "skin";
  },
  preload() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = Promise.all(
      Object.keys(TISSUE_MAPS).map((name) => loadOne(name, TISSUE_MAPS[name]))
    );
    return preloadPromise;
  },
  paint(mesh, kind, opts = {}) {
    const appearance = opts.appearance || "photoreal";
    const lite = !!opts.lite;
    if (mesh.material && mesh.material.dispose && mesh.material !== mesh.userData._shared) {
      try { mesh.material.dispose(); } catch (e) { /* keep going */ }
    }
    ensureUv(mesh);
    mesh.material = makeMaterial(kind, appearance, lite);
    mesh.userData.kind = kind;
    mesh.userData.layer = LAYER_OF[kind] || "surface";
    mesh.castShadow = appearance === "photoreal" && !lite;
    mesh.receiveShadow = false;
  },
  repaint(root, opts = {}) {
    (root.userData.named || []).forEach((mesh) => {
      this.paint(mesh, mesh.userData.kind || "skin", opts);
    });
  }
};
