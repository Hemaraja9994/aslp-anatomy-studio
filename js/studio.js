(function () {
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
    lite: document.getElementById("liteMode")
  };

  let current = data.modules[6];
  let renderer, scene, camera, root, clock, playing = true, raf;

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

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.style.display = "block";
    setTimeout(() => { els.toast.style.display = "none"; }, 2400);
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

  function select(id) {
    current = data.modules.find((m) => m.id === id) || data.modules[0];
    els.home.style.display = "none";
    els.title.textContent = current.id + " · " + current.title;
    els.summary.textContent = current.summary;
    els.tags.innerHTML = current.tags.concat([current.first]).map((t) => `<span class="tag">${t}</span>`).join("");
    renderList(els.search.value);
    window.StudioScenes.build(current.scene, root);
    window.StudioScenes.applyLayers(root, layersState);
    showTab("learn");
    camera.position.set(0, 0.4, 6.2);
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
            <li>Isolate the named structure.</li>
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
          <h3>Disclaimer</h3>
          <p>Educational schematic model. Not for surgical navigation.</p>
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

  function initThree() {
    const canvas = document.getElementById("view");
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.4, 6.2);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !els.lite.checked, alpha: false });
    renderer.setPixelRatio(els.lite.checked ? 1 : Math.min(window.devicePixelRatio, 2));

    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x1a140c, 1.05);
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 8, 6);
    const fill = new THREE.DirectionalLight(0x7ec8ff, 0.35);
    fill.position.set(-6, 2, -2);
    scene.add(hemi, key, fill);

    const grid = new THREE.GridHelper(12, 24, 0x1e334f, 0x15243a);
    grid.position.y = -2.3;
    scene.add(grid);

    root = new THREE.Group();
    scene.add(root);

    const controls = { dragging: false, lx: 0, ly: 0, rotY: 0.4, rotX: 0.2, dist: 6.2 };
    canvas.addEventListener("pointerdown", (e) => { controls.dragging = true; controls.lx = e.clientX; controls.ly = e.clientY; });
    window.addEventListener("pointerup", () => { controls.dragging = false; });
    window.addEventListener("pointermove", (e) => {
      if (!controls.dragging) return;
      controls.rotY += (e.clientX - controls.lx) * 0.005;
      controls.rotX += (e.clientY - controls.ly) * 0.005;
      controls.rotX = Math.max(-0.9, Math.min(0.9, controls.rotX));
      controls.lx = e.clientX; controls.ly = e.clientY;
    });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      controls.dist = Math.max(3.2, Math.min(12, controls.dist + e.deltaY * 0.01));
    }, { passive: false });

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

    function tick() {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      camera.position.x = Math.sin(controls.rotY) * controls.dist;
      camera.position.z = Math.cos(controls.rotY) * controls.dist;
      camera.position.y = 0.35 + controls.rotX * 3;
      camera.lookAt(0, 0, 0);
      if (playing && root.userData.animate) root.userData.animate(t);
      renderer.render(scene, camera);
    }
    tick();
  }

  function bind() {
    document.getElementById("openStudio").onclick = () => select("M06");
    document.getElementById("btnHome").onclick = () => { els.home.style.display = "block"; };
    document.getElementById("btnReset").onclick = () => select(current.id);
    document.getElementById("btnPlay").onclick = () => {
      playing = !playing;
      document.getElementById("btnPlay").textContent = playing ? "Pause physiology" : "Play physiology";
      toast(playing ? "Physiology animation on." : "Animation paused.");
    };
    document.getElementById("btnClinic").onclick = () => {
      layersState.clinic = !layersState.clinic;
      window.StudioScenes.applyLayers(root, layersState);
      toast(layersState.clinic ? "Clinic overlay visible." : "Clinic overlay hidden.");
    };
    document.getElementById("btnExport").onclick = () => {
      const blob = new Blob([JSON.stringify(collectLogbook(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aslp-anatomy-logbook.json";
      a.click();
      toast("Logbook exported.");
    };
    els.search.oninput = () => renderList(els.search.value);
    document.querySelectorAll(".layer").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.layer;
        layersState[key] = !layersState[key];
        btn.classList.toggle("on", layersState[key]);
        window.StudioScenes.applyLayers(root, layersState);
      };
    });
    document.querySelectorAll(".tabs .btn").forEach((b) => {
      b.onclick = () => showTab(b.dataset.tab);
    });
    els.lite.onchange = () => toast("Reload the page after changing Lite mode for renderer changes to apply fully.");
    document.getElementById("homeGrid").innerHTML = data.modules.map((m) =>
      `<button class="tile" data-id="${m.id}"><b>${m.id}</b>${m.title}<span>${m.papers}</span></button>`
    ).join("");
    document.getElementById("homeGrid").onclick = (e) => {
      const t = e.target.closest("[data-id]");
      if (t) select(t.dataset.id);
    };
  }

  if (typeof THREE === "undefined") {
    toast("3D library failed to load. Check the network and reload.");
    renderList("");
    return;
  }
  renderList("");
  bind();
  initThree();
})();
