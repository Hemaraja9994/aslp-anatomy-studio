(function (global) {
  const THREE = global.THREE;

  function mat(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color, roughness: 0.45, metalness: 0.08
    }, extra || {}));
  }

  function addLabel(group, text, position) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(8,16,30,0.75)";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#3db8b0";
    ctx.strokeRect(4, 4, 504, 120);
    ctx.fillStyle = "#e8eef8";
    ctx.font = "36px sans-serif";
    ctx.fillText(text, 24, 80);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(1.8, 0.45, 1);
    sprite.position.copy(position);
    sprite.userData.layer = "labels";
    group.add(sprite);
    return sprite;
  }

  function groupNamed(name, layer) {
    const g = new THREE.Group();
    g.name = name;
    g.userData.layer = layer;
    return g;
  }

  function orientationScene(root) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.4), mat(0x2c4c68, { transparent: true, opacity: 0.35 }));
    box.userData.layer = "surface";
    root.add(box);

    const axes = [
      { dir: [0, 1.9, 0], color: 0x7ec8ff, label: "Superior", pos: [0, 2.2, 0] },
      { dir: [0, -1.9, 0], color: 0x7ec8ff, label: "Inferior", pos: [0, -2.2, 0] },
      { dir: [0, 0, 1.2], color: 0x3db8b0, label: "Anterior", pos: [0, 0, 1.5] },
      { dir: [1.6, 0, 0], color: 0xe2b15a, label: "Lateral", pos: [1.9, 0, 0] }
    ];
    axes.forEach((a) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 12), mat(a.color));
      mesh.position.set(a.dir[0] * 0.4, a.dir[1] * 0.4, a.dir[2] * 0.4);
      if (Math.abs(a.dir[0]) > 0) mesh.rotation.z = Math.PI / 2;
      if (Math.abs(a.dir[2]) > 0) mesh.rotation.x = Math.PI / 2;
      mesh.userData.layer = "surface";
      root.add(mesh);
      addLabel(root, a.label, new THREE.Vector3(...a.pos));
    });

    const sag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), mat(0x7ec8ff, { transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    sag.userData.layer = "cut";
    root.add(sag);
    const cor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), mat(0x3db8b0, { transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    cor.rotation.y = Math.PI / 2;
    cor.userData.layer = "cut";
    root.add(cor);
  }

  function earScene(root) {
    const temporal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 1.6), mat(0xc9b08a));
    temporal.position.set(0.2, 0, -0.4);
    temporal.userData.layer = "bone";
    root.add(temporal);
    addLabel(root, "Temporal bone", new THREE.Vector3(0.2, 1.5, -0.2));

    const pinnaShape = new THREE.Shape();
    pinnaShape.absellipse(0, 0, 0.7, 1.05, 0, Math.PI * 2, false, 0);
    const pinna = new THREE.Mesh(new THREE.ExtrudeGeometry(pinnaShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04 }), mat(0xe0b7a4));
    pinna.position.set(-1.7, 0.15, 0.5);
    pinna.userData.layer = "surface";
    root.add(pinna);
    addLabel(root, "Pinna", new THREE.Vector3(-1.7, 1.5, 0.6));

    const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 18), mat(0xd4a090));
    canal.rotation.z = Math.PI / 2;
    canal.position.set(-0.7, 0.05, 0.45);
    canal.userData.layer = "surface";
    root.add(canal);
    addLabel(root, "EAC", new THREE.Vector3(-0.6, 0.7, 0.9));

    const tm = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), mat(0x8eb4c8, { side: THREE.DoubleSide }));
    tm.position.set(0.05, 0.05, 0.45);
    tm.userData.layer = "membrane";
    root.add(tm);
    addLabel(root, "Tympanic membrane", new THREE.Vector3(0.2, 0.85, 1.0));

    const ossicles = groupNamed("ossicles", "bone");
    const malleus = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.28, 4, 8), mat(0xf0e2b8));
    malleus.position.set(0.18, 0.16, 0.45);
    const incus = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 4, 8), mat(0xe6d39a));
    incus.position.set(0.34, 0.08, 0.42);
    incus.rotation.z = 0.6;
    const stapes = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), mat(0xddc57e));
    stapes.position.set(0.5, -0.02, 0.38);
    ossicles.add(malleus, incus, stapes);
    root.add(ossicles);
    addLabel(root, "Ossicles", new THREE.Vector3(0.55, 0.7, 0.9));

    const cochlea = groupNamed("cochleaPreview", "membrane");
    const helix = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 12, 40), mat(0xd36b8c));
    helix.position.set(0.95, -0.15, 0.15);
    helix.rotation.x = 0.6;
    cochlea.add(helix);
    root.add(cochlea);
    addLabel(root, "Cochlea", new THREE.Vector3(1.3, 0.4, 0.3));

    const nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 10), mat(0xf0d24a));
    nerve.rotation.x = 1.05;
    nerve.position.set(1.15, -0.7, -0.35);
    nerve.userData.layer = "nerve";
    root.add(nerve);

    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), mat(0xc44545));
    vessel.position.set(0.3, -0.9, -0.1);
    vessel.rotation.z = 0.4;
    vessel.userData.layer = "vessel";
    root.add(vessel);

    root.userData.animate = function (t) {
      ossicles.rotation.z = Math.sin(t * 3) * 0.05;
      tm.scale.setScalar(1 + Math.sin(t * 6) * 0.03);
    };
  }

  function cochleaScene(root) {
    const bone = new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 24), mat(0xc9b08a, { transparent: true, opacity: 0.18, wireframe: true }));
    bone.userData.layer = "bone";
    root.add(bone);

    const turns = groupNamed("turns", "membrane");
    const curve = [];
    for (let i = 0; i <= 220; i += 1) {
      const a = i * 0.08;
      const r = 0.25 + a * 0.085;
      curve.push(new THREE.Vector3(Math.cos(a) * r, a * 0.09 - 1.1, Math.sin(a) * r));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 220, 0.09, 12, false), mat(0xc45c78));
    turns.add(tube);
    root.add(turns);
    addLabel(root, "Cochlear spiral (base → apex)", new THREE.Vector3(0, 1.6, 0));

    const sv = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 40), mat(0x7ec8ff));
    sv.position.y = -0.15;
    sv.userData.layer = "surface";
    root.add(sv);
    addLabel(root, "Base / high frequency", new THREE.Vector3(1.3, -0.15, 0.2));
    addLabel(root, "Apex / low frequency", new THREE.Vector3(-0.2, 1.15, 0.2));

    const ihc = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), mat(0x6fbf8a));
    ihc.position.set(0.7, -0.2, 0.15);
    ihc.userData.layer = "surface";
    root.add(ihc);
    const ohc = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), mat(0x3db8b0));
    ohc.position.set(0.82, -0.12, 0.22);
    ohc.userData.layer = "surface";
    root.add(ohc);
    addLabel(root, "Hair-cell field", new THREE.Vector3(1.35, 0.35, 0.4));

    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12), mat(0xf0d24a));
    n.rotation.x = 0.6;
    n.position.set(0, -0.9, -0.7);
    n.userData.layer = "nerve";
    root.add(n);
    addLabel(root, "CN VIII", new THREE.Vector3(0.2, -1.6, -0.4));

    const wave = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), mat(0x7ec8ff, { emissive: 0x163c60 }));
    wave.userData.layer = "function";
    root.add(wave);
    const electrode = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), mat(0xb9c4ce, { metalness: 0.6 }));
    electrode.rotation.x = 1.1;
    electrode.position.set(0.15, -0.35, 0.05);
    electrode.userData.layer = "clinic";
    root.add(electrode);
    addLabel(root, "CI path (scala tympani)", new THREE.Vector3(-1.4, -0.6, 0.3));

    root.userData.animate = function (t) {
      const i = Math.floor((t * 40) % curve.length);
      const p = curve[i];
      wave.position.copy(p);
    };
  }

  function larynxScene(root) {
    const thyroid = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 10, 24, Math.PI * 1.3), mat(0xd7c4a3));
    thyroid.rotation.x = Math.PI / 2;
    thyroid.position.y = 0.35;
    thyroid.userData.layer = "bone";
    root.add(thyroid);
    addLabel(root, "Thyroid cartilage", new THREE.Vector3(-1.5, 0.9, 0.2));

    const cricoid = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 10, 24), mat(0xcbb48d));
    cricoid.rotation.x = Math.PI / 2;
    cricoid.position.y = -0.25;
    cricoid.userData.layer = "bone";
    root.add(cricoid);
    addLabel(root, "Cricoid", new THREE.Vector3(-1.3, -0.4, 0.2));

    const aryL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 8), mat(0xc4aa7a));
    aryL.position.set(-0.18, 0.2, -0.28);
    const aryR = aryL.clone();
    aryR.position.x = 0.18;
    aryL.userData.layer = aryR.userData.layer = "bone";
    root.add(aryL, aryR);
    addLabel(root, "Arytenoids", new THREE.Vector3(0.9, 0.55, -0.2));

    const epi = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.3), mat(0xe0b7a4));
    epi.position.set(0, 1.05, 0.05);
    epi.userData.layer = "surface";
    root.add(epi);

    const foldL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.08), mat(0xc45c6a));
    foldL.position.set(-0.22, 0.05, 0.02);
    const foldR = foldL.clone();
    foldR.position.x = 0.22;
    foldL.userData.layer = foldR.userData.layer = "membrane";
    root.add(foldL, foldR);
    addLabel(root, "Vocal folds", new THREE.Vector3(1.2, 0.05, 0.3));

    const recL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8), mat(0xf0d24a));
    recL.position.set(-0.55, -0.7, -0.15);
    recL.rotation.z = 0.25;
    recL.userData.layer = "nerve";
    root.add(recL);
    addLabel(root, "Recurrent laryngeal n.", new THREE.Vector3(-1.5, -1.1, 0));

    const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.3, 16), mat(0xe8d3b0, { transparent: true, opacity: 0.7 }));
    trachea.position.y = -1.05;
    trachea.userData.layer = "surface";
    root.add(trachea);

    root.userData.animate = function (t) {
      const g = 0.16 + Math.abs(Math.sin(t * 8)) * 0.12;
      foldL.position.x = -g;
      foldR.position.x = g;
    };
  }

  function swallowScene(root) {
    const oral = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 16), mat(0xe0b7a4, { transparent: true, opacity: 0.45 }));
    oral.position.set(0, 1.1, 0.35);
    oral.scale.set(1.2, 0.7, 0.9);
    oral.userData.layer = "surface";
    root.add(oral);
    addLabel(root, "Oral cavity", new THREE.Vector3(-1.5, 1.4, 0.4));

    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), mat(0xc45c6a));
    tongue.position.set(0, 0.95, 0.2);
    tongue.scale.set(1.4, 0.6, 0.8);
    tongue.userData.layer = "muscle";
    root.add(tongue);
    addLabel(root, "Tongue", new THREE.Vector3(1.3, 1.2, 0.3));

    const pharynx = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 1.8, 18), mat(0xd4a090, { transparent: true, opacity: 0.55 }));
    pharynx.position.set(0, 0.05, -0.05);
    pharynx.userData.layer = "surface";
    root.add(pharynx);
    addLabel(root, "Pharynx", new THREE.Vector3(1.2, 0.2, -0.1));

    const larynx = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 16), mat(0xcbb48d));
    larynx.rotation.x = Math.PI / 2;
    larynx.position.set(0, -0.35, 0.18);
    larynx.userData.layer = "bone";
    root.add(larynx);

    const eso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.3, 12), mat(0xb97878));
    eso.position.set(0, -1.35, -0.12);
    eso.userData.layer = "membrane";
    root.add(eso);
    addLabel(root, "Oesophagus", new THREE.Vector3(1.15, -1.35, 0));

    const bolus = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), mat(0xe2b15a));
    bolus.userData.layer = "function";
    root.add(bolus);

    root.userData.animate = function (t) {
      const p = (t * 0.25) % 1;
      let y, z;
      if (p < 0.25) { y = 1.05 - p * 1.2; z = 0.25; }
      else if (p < 0.6) { y = 0.75 - (p - 0.25) * 2.2; z = 0.05; }
      else { y = -0.02 - (p - 0.6) * 3.2; z = -0.12; }
      bolus.position.set(0, y, z);
    };
  }

  function brainScene(root) {
    const L = new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 24), mat(0xe0c4b0));
    L.scale.set(0.85, 1, 1.05);
    L.position.x = -0.55;
    const R = L.clone();
    R.position.x = 0.55;
    L.userData.layer = R.userData.layer = "surface";
    root.add(L, R);
    addLabel(root, "Language-dominant hemisphere", new THREE.Vector3(-1.8, 1.3, 0.4));

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.3, 14), mat(0xd2aa96));
    stem.position.set(0, -1.15, -0.15);
    stem.userData.layer = "surface";
    root.add(stem);
    addLabel(root, "Brainstem / CANS", new THREE.Vector3(1.3, -1.1, 0));

    const cereb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), mat(0xc9a090));
    cereb.position.set(0, -1.15, -0.75);
    cereb.userData.layer = "surface";
    root.add(cereb);

    const ifg = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat(0x3db8b0));
    ifg.position.set(-1.15, 0.15, 0.55);
    ifg.userData.layer = "function";
    root.add(ifg);
    addLabel(root, "Inferior frontal", new THREE.Vector3(-1.9, 0.15, 0.8));

    const stg = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat(0x7ec8ff));
    stg.position.set(-1.2, -0.15, 0.35);
    stg.userData.layer = "function";
    root.add(stg);
    addLabel(root, "Superior temporal", new THREE.Vector3(-1.95, -0.5, 0.6));

    const mca = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 8, 30, Math.PI), mat(0xc44545));
    mca.position.set(-0.55, 0, 0.15);
    mca.rotation.y = 0.4;
    mca.userData.layer = "vessel";
    root.add(mca);

    const viii = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), mat(0xf0d24a));
    viii.position.set(0.35, -1.35, 0.35);
    viii.rotation.x = 0.8;
    viii.userData.layer = "nerve";
    root.add(viii);

    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), mat(0xf0d24a, { emissive: 0x665200 }));
    pulse.userData.layer = "function";
    root.add(pulse);
    const path = [
      new THREE.Vector3(0.35, -1.55, 0.5),
      new THREE.Vector3(0.2, -1.25, 0.1),
      new THREE.Vector3(0.05, -0.85, -0.05),
      new THREE.Vector3(-0.1, -0.4, 0.05),
      new THREE.Vector3(-0.8, -0.1, 0.25)
    ];
    root.userData.animate = function (t) {
      const i = Math.floor((t * 1.5) % path.length);
      pulse.position.copy(path[i]);
    };
  }

  const builders = {
    orientation: orientationScene,
    ear: earScene,
    cochlea: cochleaScene,
    larynx: larynxScene,
    swallow: swallowScene,
    brain: brainScene
  };

  global.StudioScenes = {
    build(name, root) {
      root.clear();
      root.userData.animate = null;
      const fn = builders[name] || builders.orientation;
      fn(root);
    },
    applyLayers(root, layers) {
      root.traverse((obj) => {
        const layer = obj.userData && obj.userData.layer;
        if (!layer) return;
        obj.visible = !!layers[layer];
      });
    }
  };
})(window);
