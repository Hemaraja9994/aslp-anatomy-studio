/* Faculty workspace: lesson plans, RCI outcome mapping, printable class sheets.
   Reads window.STUDIO_DATA. Does not touch the 3D engine. */
(function () {
  const KEY = "aslp-faculty-setup";
  const CREDENTIAL = {
    name: "Mr. Hemaraja Nayaka S",
    role: "Associate Professor | MSc (SLP), Dip. in HA & ET - AIISH, PGDBEME",
    dept: "Dept. of Audiology & Speech-Language Pathology",
    college: "Yenepoya Medical College Hospital, Mangaluru",
    phone: "T: 0824-2204667 (Ext 2229) | M: 9449499659",
    reg: "RCI: A30294 | ISHA: L-13072161",
    site: "https://s.hemarajanayaka.workers.dev/"
  };

  let data, el, sheet, tab = "plan", planId = null;

  function setup() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }
  function saveSetup(patch) {
    localStorage.setItem(KEY, JSON.stringify(Object.assign(setup(), patch)));
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
  function mod(id) { return data.modules.find((m) => m.id === id) || data.modules[0]; }
  function currentId() {
    const active = document.querySelector(".mod.active");
    return (active && active.querySelector("b") && active.querySelector("b").textContent.trim()) || data.modules[6].id;
  }
  function papersOf(m) { return String(m.papers).split(/[,;]\s*/).filter(Boolean); }
  function allPapers() {
    const set = new Set();
    data.modules.forEach((m) => papersOf(m).forEach((p) => set.add(p.trim())));
    return [...set].sort();
  }
  function blanks(n) {
    let out = "";
    for (let i = 1; i <= n; i++) out += `<div class="blank"><span>${i}.</span><i></i></div>`;
    return out;
  }

  /* ── Lesson plan ───────────────────────────────────── */
  function lessonPlan(m, s) {
    const layers = ["Surface", "Bone / cartilage", "Muscle", "Membrane", "Nerve", "Vessel"];
    return `
      <div class="fac-grid">
        <div class="panel-block">
          <h3>Session plan — ${esc(m.id)} · ${esc(m.title)}</h3>
          <p class="fac-meta">${esc(m.papers)} · first taught: ${esc(m.first)} · ${esc(s.batch || "batch not set")}</p>
          <table class="fac-table plan">
            <thead><tr><th>Min</th><th>Phase</th><th>Faculty action in the studio</th><th>Student output</th></tr></thead>
            <tbody>
              <tr><td>0–5</td><td>Recall</td><td>Open ${esc(m.id)} with all layers on, Photoreal look.</td><td>Name three structures from memory.</td></tr>
              <tr><td>5–20</td><td>Identification</td><td>Isolate each structure in turn: ${esc(m.structures.slice(0, 4).join(", "))}.</td><td>Label on the printed sheet.</td></tr>
              <tr><td>20–32</td><td>Physiology</td><td>Toggle Physiology layer and press Play physiology.</td><td>Describe the mechanism in one sentence.</td></tr>
              <tr><td>32–42</td><td>Clinical link</td><td>Turn on Clinic / device overlay.</td><td>Relate the device or lesion site to the structure.</td></tr>
              <tr><td>42–52</td><td>Activity</td><td>${esc(m.activity)}</td><td>Pair work, one answer per pair.</td></tr>
              <tr><td>52–60</td><td>Assessment</td><td>Run the OSCE station on the projector.</td><td>Worksheet submitted, logbook entry.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="panel-block">
          <h3>Learning outcomes</h3>
          <p><b>Undergraduate</b></p>
          <ul>${m.outcomesUG.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <p><b>Postgraduate</b></p>
          <ul>${m.outcomesPG.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
        <div class="panel-block">
          <h3>Studio setup for this session</h3>
          <p><b>Layers on</b></p>
          <div class="tags">${layers.map((l) => `<span class="tag">${l}</span>`).join("")}</div>
          <p style="margin-top:10px"><b>Look</b></p>
          <div class="tags"><span class="tag">Photoreal for identification</span><span class="tag">Atlas colours for viva</span></div>
          <p style="margin-top:10px"><b>Physiology</b></p>
          <p>${esc(m.physiology)}</p>
          <p><b>Clinical correlation</b></p>
          <p>${esc(m.clinic)}</p>
        </div>
        <div class="panel-block">
          <h3>Assessment blueprint</h3>
          <table class="fac-table">
            <thead><tr><th>Tool</th><th>Marks</th><th>Maps to</th></tr></thead>
            <tbody>
              <tr><td>Labelling sheet</td><td>10</td><td>${esc(m.papers)} — identification</td></tr>
              <tr><td>Worksheet (${m.worksheet.tasks.length} tasks, ${m.worksheet.mcq.length} check items)</td><td>10</td><td>Applied anatomy</td></tr>
              <tr><td>OSCE station (5 min)</td><td>10</td><td>Clinical reasoning</td></tr>
              <tr><td>Viva frame</td><td>5</td><td>Integration</td></tr>
            </tbody>
          </table>
          <p style="margin-top:10px">OSCE station: ${esc(m.osce)}</p>
        </div>
      </div>`;
  }

  /* ── RCI mapping ───────────────────────────────────── */
  function mapping(filter) {
    const rows = data.modules
      .filter((m) => !filter || papersOf(m).some((p) => p.trim() === filter))
      .map((m) => `
        <tr>
          <td class="code">${esc(m.id)}</td>
          <td>${esc(m.title)}<div class="sub">${esc(m.tags.join(" · "))}</div></td>
          <td>${papersOf(m).map((p) => `<span class="tag">${esc(p.trim())}</span>`).join(" ")}</td>
          <td>${esc(m.first)}</td>
          <td><ul class="tight">${m.outcomesUG.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></td>
          <td><ul class="tight">${m.outcomesPG.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></td>
          <td>Labelling · Worksheet · OSCE · Viva</td>
        </tr>`).join("");
    return `
      <div class="panel-block">
        <h3>Learning outcomes mapped to the RCI syllabus</h3>
        <p class="fac-meta">${data.modules.length} modules · B.ASLP (RCI 2024-25) and postgraduate. Filter by paper, then print for the department file.</p>
        <div class="fac-filters">
          <button class="btn${filter ? "" : " primary"}" data-paper="">All papers</button>
          ${allPapers().map((p) => `<button class="btn${filter === p ? " primary" : ""}" data-paper="${esc(p)}">${esc(p)}</button>`).join("")}
        </div>
        <div class="fac-scroll">
          <table class="fac-table map">
            <thead><tr><th>Module</th><th>Topic</th><th>RCI paper</th><th>Semester</th><th>UG outcomes</th><th>PG outcomes</th><th>Assessment</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ── Print sheets ──────────────────────────────────── */
  function sheetHeader(title, m, s) {
    return `
      <div class="ps-head">
        <div>
          <div class="ps-kicker">Audiology &amp; Speech-Language Pathology — Anatomy Studio</div>
          <h1>${esc(title)}</h1>
          <div class="ps-sub">${esc(m.id)} · ${esc(m.title)} — ${esc(m.papers)}</div>
        </div>
        <div class="ps-meta">
          <div>${esc(s.college || CREDENTIAL.college)}</div>
          <div>${esc(s.dept || CREDENTIAL.dept)}</div>
          <div>Faculty: ${esc(s.faculty || CREDENTIAL.name)}</div>
          <div>${esc(s.batch || "Batch: ____________")} · Date: ${esc(s.date || "____________")}</div>
        </div>
      </div>
      <div class="ps-fields">
        <div class="blank wide"><span>Name</span><i></i></div>
        <div class="blank"><span>Roll no.</span><i></i></div>
        <div class="blank"><span>Marks</span><i></i></div>
      </div>`;
  }

  function labelPins(limit) {
    const canvas = document.getElementById("view");
    const host = document.getElementById("worldLabels");
    if (!canvas || !host) return { img: "", pins: [] };
    let img = "";
    try { img = canvas.toDataURL("image/png"); } catch (e) { img = ""; }
    const rect = canvas.getBoundingClientRect();
    const all = [...host.querySelectorAll("[data-part]")].filter((b) => b.style.display !== "none");
    const step = Math.max(1, Math.floor(all.length / limit));
    const pins = all.filter((_, i) => i % step === 0).slice(0, limit).map((b, i) => ({
      n: i + 1,
      name: (b.textContent || "").trim() || b.dataset.part,
      x: (parseFloat(b.style.left) / (rect.width || 1)) * 100,
      y: (parseFloat(b.style.top) / (rect.height || 1)) * 100
    }));
    return { img, pins };
  }

  function buildSheet(kind, opts) {
    const s = setup();
    const m = mod(planId || currentId());
    const answers = !!opts.answers;
    let body = "";

    if (kind === "label") {
      const { img, pins } = labelPins(opts.count || 12);
      body = `
        ${sheetHeader("Labelling sheet", m, s)}
        <p class="ps-instr">Write the name of each numbered structure. Spelling counts. One mark per correct label.</p>
        <div class="ps-label-wrap">
          <div class="ps-figure">
            ${img ? `<img src="${img}" alt="Studio view" />` : `<div class="ps-noimg">Open a module in the studio, orbit to the view you want, then print this sheet — the 3D view is captured automatically.</div>`}
            ${pins.map((p) => `<span class="ps-pin" style="left:${p.x}%;top:${p.y}%">${p.n}</span>`).join("")}
          </div>
          <ol class="ps-answers">
            ${pins.length ? pins.map((p) => `<li>${answers ? esc(p.name) : "<i></i>"}</li>`).join("") : blanks(opts.count || 12)}
          </ol>
        </div>`;
    } else if (kind === "worksheet") {
      body = `
        ${sheetHeader("Dissection worksheet", m, s)}
        <h2>Tasks in the studio</h2>
        <ol class="ps-tasks">${m.worksheet.tasks.map((t) => `<li>${esc(t)}<i></i></li>`).join("")}</ol>
        <h2>Check items</h2>
        <ol class="ps-tasks">${m.worksheet.mcq.map((q) => `<li>${esc(q.q)}${answers ? `<div class="ps-ans">Answer: ${esc(q.a)}</div>` : "<i></i>"}</li>`).join("")}</ol>
        <h2>Clinical sentence</h2>
        <p class="ps-instr">If this structure fails, the patient will…</p>
        ${blanks(3)}
        <h2>Structures to identify</h2>
        <div class="ps-cols">${m.structures.map((x) => `<div class="blank"><span>▢</span><i>${answers ? esc(x) : ""}</i></div>`).join("")}</div>`;
    } else if (kind === "osce") {
      body = `
        ${sheetHeader("OSCE station card (5 minutes)", m, s)}
        <h2>Station brief</h2>
        <p>${esc(m.osce)}</p>
        <h2>Candidate instructions</h2>
        <ol class="ps-tasks tight">
          <li>Isolate the named structure on the dissection mesh.</li>
          <li>State its innervation or pathway.</li>
          <li>Give one communication consequence of damage.</li>
        </ol>
        <h2>Examiner checklist</h2>
        <table class="fac-table print">
          <thead><tr><th>Item</th><th>Marks</th><th>Awarded</th></tr></thead>
          <tbody>
            <tr><td>Correct isolation on the mesh</td><td>3</td><td></td></tr>
            <tr><td>Accurate anatomical label</td><td>3</td><td></td></tr>
            <tr><td>Clinical sentence linked to ${esc(m.papers)}</td><td>4</td><td></td></tr>
            <tr><td><b>Total</b></td><td><b>10</b></td><td></td></tr>
          </tbody>
        </table>
        <h2>Examiner notes</h2>
        ${blanks(4)}`;
    } else if (kind === "plan") {
      body = `${sheetHeader("Lesson plan", m, s)}${lessonPlan(m, s)}`;
    } else if (kind === "mapping") {
      body = `
        <div class="ps-head">
          <div>
            <div class="ps-kicker">Audiology &amp; Speech-Language Pathology — Anatomy Studio</div>
            <h1>Learning outcomes mapped to the RCI syllabus</h1>
            <div class="ps-sub">B.ASLP (RCI 2024-25) and postgraduate · ${data.modules.length} modules</div>
          </div>
          <div class="ps-meta">
            <div>${esc(s.college || CREDENTIAL.college)}</div>
            <div>${esc(s.dept || CREDENTIAL.dept)}</div>
            <div>Prepared by: ${esc(s.faculty || CREDENTIAL.name)}</div>
            <div>Date: ${esc(s.date || "____________")}</div>
          </div>
        </div>
        ${mapping(opts.paper || "")}`;
    } else if (kind === "attendance") {
      let rows = "";
      for (let i = 1; i <= 24; i++) rows += `<tr><td>${i}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
      body = `
        ${sheetHeader("Skill checklist / attendance", m, s)}
        <table class="fac-table print">
          <thead><tr><th>#</th><th>Student name</th><th>Roll no.</th><th>Labelling /10</th><th>Worksheet /10</th><th>OSCE /10</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    sheet.innerHTML = `<div class="print-sheet">${body}
      <div class="ps-foot">
        <div><b>${esc(CREDENTIAL.name)}</b> — ${esc(CREDENTIAL.role)}</div>
        <div>${esc(CREDENTIAL.dept)} · ${esc(CREDENTIAL.college)}</div>
        <div>${esc(CREDENTIAL.phone)} · ${esc(CREDENTIAL.reg)} · ${esc(CREDENTIAL.site)}</div>
        <div>Meshes: BodyParts3D / Z-Anatomy (CC BY-SA). Educational use only — not for surgical navigation.</div>
      </div></div>`;
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => document.body.classList.remove("printing"), 400);
  }

  function sheetsPanel() {
    const s = setup();
    const cards = [
      ["label", "Labelling sheet", "Captures the current 3D view, drops numbered pins on the visible structures and prints a blank answer list beside it."],
      ["worksheet", "Dissection worksheet", "Module tasks, check items, clinical sentence and a structure tick-list."],
      ["osce", "OSCE station card", "Station brief, candidate instructions and a 10-mark examiner checklist."],
      ["plan", "Lesson plan", "The 60-minute plan for the selected module, with the studio setup for each phase."],
      ["mapping", "RCI outcome mapping", "The full module-to-paper matrix for the department file."],
      ["attendance", "Skill checklist", "24-row marks sheet for labelling, worksheet and OSCE."]
    ];
    return `
      <div class="panel-block">
        <h3>Class setup</h3>
        <p class="fac-meta">Printed on every sheet header. Saved in this browser.</p>
        <div class="fac-fields">
          <label>Faculty<input data-setup="faculty" value="${esc(s.faculty || CREDENTIAL.name)}" /></label>
          <label>Department<input data-setup="dept" value="${esc(s.dept || CREDENTIAL.dept)}" /></label>
          <label>Institution<input data-setup="college" value="${esc(s.college || CREDENTIAL.college)}" /></label>
          <label>Batch / semester<input data-setup="batch" placeholder="B.ASLP II semester, 2024-25" value="${esc(s.batch || "")}" /></label>
          <label>Date<input data-setup="date" type="date" value="${esc(s.date || "")}" /></label>
        </div>
      </div>
      <div class="panel-block">
        <h3>Sheet options</h3>
        <div class="fac-fields inline">
          <label>Pins on the labelling sheet<input id="facCount" type="number" min="4" max="24" value="12" /></label>
          <label class="check"><input id="facAnswers" type="checkbox" /> Print the answer key</label>
        </div>
      </div>
      <div class="fac-sheets">
        ${cards.map(([k, t, d]) => `
          <div class="fac-card">
            <b>${t}</b>
            <p>${d}</p>
            <button class="btn primary" data-print="${k}">Print</button>
          </div>`).join("")}
      </div>`;
  }

  /* ── Shell ─────────────────────────────────────────── */
  function render() {
    const s = setup();
    const m = mod(planId || currentId());
    el.innerHTML = `
      <div class="fac-wrap">
        <div class="fac-top">
          <div>
            <p class="eyebrow">Faculty workspace</p>
            <h2>Lesson plans, RCI mapping and printable class sheets</h2>
            <p class="fac-meta">${esc(s.faculty || CREDENTIAL.name)} · ${esc(s.dept || CREDENTIAL.dept)} · ${esc(s.college || CREDENTIAL.college)}</p>
          </div>
          <div class="fac-top-actions">
            <label class="fac-select">Module
              <select id="facModule">
                ${data.modules.map((x) => `<option value="${x.id}"${x.id === m.id ? " selected" : ""}>${x.id} · ${x.title}</option>`).join("")}
              </select>
            </label>
            <button class="btn" id="facClose">Back to studio</button>
          </div>
        </div>
        <div class="tabs fac-tabs">
          <button class="btn${tab === "plan" ? " active" : ""}" data-fac="plan">Lesson plan</button>
          <button class="btn${tab === "map" ? " active" : ""}" data-fac="map">RCI outcome mapping</button>
          <button class="btn${tab === "sheets" ? " active" : ""}" data-fac="sheets">Print sheets</button>
        </div>
        <div class="fac-body">
          ${tab === "plan" ? lessonPlan(m, s) : tab === "map" ? mapping(el.dataset.paper || "") : sheetsPanel()}
        </div>
      </div>`;

    el.querySelector("#facClose").onclick = () => close();
    el.querySelector("#facModule").onchange = (e) => { planId = e.target.value; render(); };
    el.querySelectorAll("[data-fac]").forEach((b) => { b.onclick = () => { tab = b.dataset.fac; render(); }; });
    el.querySelectorAll("[data-paper]").forEach((b) => { b.onclick = () => { el.dataset.paper = b.dataset.paper; render(); }; });
    el.querySelectorAll("[data-setup]").forEach((i) => { i.oninput = () => saveSetup({ [i.dataset.setup]: i.value }); });
    el.querySelectorAll("[data-print]").forEach((b) => {
      b.onclick = () => {
        const count = parseInt((el.querySelector("#facCount") || {}).value, 10) || 12;
        const answers = !!(el.querySelector("#facAnswers") || {}).checked;
        buildSheet(b.dataset.print, { count, answers, paper: el.dataset.paper || "" });
      };
    });
  }

  function open(which) {
    tab = which || tab;
    document.body.classList.add("faculty-on");
    el.style.display = "block";
    render();
  }
  function close() {
    el.style.display = "none";
    document.body.classList.remove("faculty-on");
  }

  function init() {
    data = window.STUDIO_DATA;
    if (!data) return;
    el = document.getElementById("faculty");
    sheet = document.getElementById("printSheet");
    if (!el || !sheet) return;
    const btn = document.getElementById("btnFaculty");
    if (btn) btn.onclick = () => (el.style.display === "block" ? close() : open());
    const quick = document.getElementById("btnSheets");
    if (quick) quick.onclick = () => open("sheets");
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el.style.display === "block") close();
    });
    window.StudioFaculty = { open, close, print: (k, o) => buildSheet(k, o || {}) };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
