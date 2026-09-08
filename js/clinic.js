import * as THREE from "three";

function findNamed(root, pattern) {
  const rx = new RegExp(pattern, "i");
  return (root.userData.named || []).filter((mesh) => rx.test(mesh.userData.label || mesh.name || ""));
}

function bounds(meshes) {
  const box = new THREE.Box3();
  meshes.forEach((m) => {
    m.updateWorldMatrix(true, false);
    box.expandByObject(m);
  });
  if (box.isEmpty()) return null;
  return {
    box,
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3())
  };
}

function deviceMat(color, emissive) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0.55,
    emissive: emissive || color,
    emissiveIntensity: 0.18,
    clearcoat: 0.4
  });
}

function tag(root, group, mesh, label) {
  mesh.userData.layer = "clinic";
  mesh.userData.pickable = true;
  mesh.userData.label = label;
  mesh.userData.kind = "clinic";
  mesh.castShadow = false;
  group.add(mesh);
  root.userData.named.push(mesh);
}

function spiral(center, size) {
  const pts = [];
  const r0 = Math.max(size.x, size.z) * 0.22;
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    const a = t * Math.PI * 2.6;
    const r = r0 * (1 - t * 0.72);
    pts.push(new THREE.Vector3(
      center.x + Math.cos(a) * r,
      center.y + (0.42 - t) * size.y * 0.4,
      center.z + Math.sin(a) * r
    ));
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function attachClinic(sceneName, root, moduleId) {
  const group = new THREE.Group();
  group.name = "clinic";
  root.add(group);
  const gold = deviceMat(0xc9a227, 0x4a3808);
  const teal = deviceMat(0x3db8b0, 0x0d3d3a);
  const steel = deviceMat(0x9aa7b5, 0x22303c);

  if (sceneName === "ear" || sceneName === "cochlea") {
    const coch = bounds(findNamed(root, "^cochlea"));
    if (coch) {
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(spiral(coch.center, coch.size), 48, Math.max(0.012, coch.size.x * 0.035), 8, false),
        teal
      );
      tag(root, group, tube, "CI array (scala tympani path)");
    }
    const mastoid = bounds(findNamed(root, "mastoid region|temporal bone"));
    if (mastoid) {
      const abutment = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 16), steel);
      abutment.position.copy(mastoid.center).add(new THREE.Vector3(mastoid.size.x * 0.35, mastoid.size.y * 0.1, mastoid.size.z * 0.35));
      tag(root, group, abutment, "Bone-conduction implant site");
    }
    const helix = bounds(findNamed(root, "^helix"));
    if (helix) {
      const aid = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.08, helix.size.y * 0.18), 0.025, 10, 18, Math.PI * 1.2), gold);
      aid.position.copy(helix.center).add(new THREE.Vector3(-helix.size.x * 0.15, helix.size.y * 0.05, helix.size.z * 0.2));
      aid.rotation.y = Math.PI / 2;
      tag(root, group, aid, "Behind-the-ear hearing aid");
    }
    const tm = bounds(findNamed(root, "tympanic membrane"));
    if (tm) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(0.05, tm.size.x * 0.45), Math.max(0.18, tm.size.z * 1.1), 16, 1, true),
        new THREE.MeshPhysicalMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      );
      cone.position.copy(tm.center);
      cone.rotation.x = Math.PI / 2;
      tag(root, group, cone, "Otoscope window");
    }
  }

  if (sceneName === "larynx") {
    const trach = bounds(findNamed(root, "^trachea$"));
    if (trach) {
      const stoma = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.06, trach.size.x * 0.18), 0.016, 10, 20), gold);
      stoma.position.copy(trach.center).add(new THREE.Vector3(0, -trach.size.y * 0.15, trach.size.z * 0.45));
      tag(root, group, stoma, "Laryngectomy stoma / TEP site");
    }
    const folds = bounds(findNamed(root, "thyro-arytenoid|arytenoid cartilage"));
    if (folds) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, Math.max(0.4, folds.size.z * 1.4), 8),
        new THREE.MeshPhysicalMaterial({ color: 0xffe08a, emissive: 0x665200, transparent: true, opacity: 0.55 })
      );
      beam.position.copy(folds.center);
      beam.rotation.x = Math.PI / 2;
      tag(root, group, beam, "Stroboscopy light path");
    }
  }

  if (sceneName === "swallow") {
    const pharynx = bounds(findNamed(root, "oropharynx|laryngopharynx"));
    if (pharynx) {
      const zone = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.12, pharynx.size.y * 0.28), 16, 12),
        new THREE.MeshPhysicalMaterial({ color: 0xd36b6b, transparent: true, opacity: 0.22, emissive: 0x5a1010 })
      );
      zone.position.copy(pharynx.center);
      tag(root, group, zone, "Aspiration risk zone");
    }
  }

  if (sceneName === "brain") {
    const cn = bounds(findNamed(root, "cochlear nucle"));
    if (cn) {
      const abi = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.12), teal);
      abi.position.copy(cn.center);
      tag(root, group, abi, "ABI paddle (cochlear nucleus)");
    }
    const mca = bounds(findNamed(root, "middle cerebral artery"));
    if (mca) {
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.2, mca.size.length() * 0.4), 16, 12),
        new THREE.MeshPhysicalMaterial({ color: 0xd36b6b, transparent: true, opacity: 0.14, emissive: 0x4a0808 })
      );
      halo.position.copy(mca.center);
      tag(root, group, halo, "MCA language territory");
    }
  }

  if (sceneName === "chest") {
    const lung = bounds(findNamed(root, "lobe of .* lung"));
    if (lung) {
      const vol = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.15, lung.size.x * 0.12), 12, 10),
        new THREE.MeshPhysicalMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.2 })
      );
      vol.position.copy(lung.center);
      tag(root, group, vol, "Speech-breathing volume");
    }
  }

  if (moduleId === "M14" || moduleId === "M16") group.visible = true;
  return group;
}
