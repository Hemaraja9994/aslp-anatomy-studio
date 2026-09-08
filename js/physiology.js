import * as THREE from "three";

function findNamed(root, pattern) {
  const rx = new RegExp(pattern, "i");
  const out = [];
  (root.userData.named || []).forEach((mesh) => {
    const label = mesh.userData.label || mesh.name || "";
    if (rx.test(label)) out.push(mesh);
  });
  return out;
}

function addPulse(root, meshes, axis, amount, speed) {
  const bases = meshes.map((m) => m.scale[axis]);
  const prev = root.userData.animate;
  root.userData.animate = function (t) {
    if (prev) prev(t);
    meshes.forEach((m, i) => {
      m.scale[axis] = bases[i] * (1 + Math.sin(t * speed) * amount);
    });
  };
}

export function attachPhysiology(sceneName, root) {
  if (sceneName === "ear") {
    const tm = findNamed(root, "tympanic membrane");
    addPulse(root, tm, "z", 0.04, 6);
  }
  if (sceneName === "cochlea") {
    const coch = findNamed(root, "^cochlea");
    if (!coch.length) return;
    const box = new THREE.Box3();
    coch.forEach((m) => box.expandByObject(m));
    const wave = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x7ec8ff, emissive: 0x163c60 })
    );
    wave.userData.layer = "function";
    root.add(wave);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const prev = root.userData.animate;
    root.userData.animate = function (t) {
      if (prev) prev(t);
      const a = t * 1.6;
      wave.position.set(
        center.x + Math.cos(a) * size.x * 0.25,
        center.y + (a % 1) * size.y * 0.15 - size.y * 0.08,
        center.z + Math.sin(a) * size.z * 0.25
      );
    };
  }
  if (sceneName === "larynx") {
    const folds = findNamed(root, "thyro-arytenoid|transverse arytenoid");
    addPulse(root, folds, "x", 0.08, 8);
  }
  if (sceneName === "swallow") {
    const pathMeshes = findNamed(root, "tongue|oropharynx|laryngopharynx|oesophagus");
    const bolus = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2b15a })
    );
    bolus.userData.layer = "function";
    root.add(bolus);
    const pts = pathMeshes.slice(0, 4).map((m) => {
      const c = new THREE.Vector3();
      new THREE.Box3().setFromObject(m).getCenter(c);
      return c;
    });
    if (pts.length < 2) {
      pts.push(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
    }
    const prev = root.userData.animate;
    root.userData.animate = function (t) {
      if (prev) prev(t);
      const p = (t * 0.22) % 1;
      const i = Math.min(pts.length - 2, Math.floor(p * (pts.length - 1)));
      const f = p * (pts.length - 1) - i;
      bolus.position.lerpVectors(pts[i], pts[i + 1], f);
    };
  }
  if (sceneName === "brain") {
    const path = findNamed(root, "vestibulocochlear|cochlear nucle|inferior colliculus|medial geniculate|transverse temporal");
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf0d24a, emissive: 0x665200 })
    );
    pulse.userData.layer = "function";
    root.add(pulse);
    const pts = path.map((m) => {
      const c = new THREE.Vector3();
      new THREE.Box3().setFromObject(m).getCenter(c);
      return c;
    });
    if (!pts.length) return;
    const prev = root.userData.animate;
    root.userData.animate = function (t) {
      if (prev) prev(t);
      const i = Math.floor((t * 1.4) % pts.length);
      pulse.position.copy(pts[i]);
    };
  }
}
