/* Tweaks: three expressive controls that reshape the studio's feel.
   Theme (shell + 3D stage), teaching mode (lecture / studio / focus), chrome (panel surfaces). */
(function () {
  const KEY = "aslp-tweaks";
  const DEF = { theme: "lab", mode: "studio", chrome: "glass" };
  const STAGE = { lab: 0x16110d, ink: 0x14110f, steel: 0x0a1015 };

  const CONTROLS = [
    ["theme", "Theme", [
      ["lab", "Cadaver lab", "Warm slate, copper selection"],
      ["ink", "Bone & ink", "Paper panels, dark specimen"],
      ["steel", "Radiology", "Cool steel, cyan and magenta"]
    ]],
    ["mode", "Teaching mode", [
      ["lecture", "Lecture", "Larger type and targets for projection"],
      ["studio", "Studio", "Balanced working density"],
      ["focus", "Focus", "Rails away, chrome fades, specimen only"]
    ]],
    ["chrome", "Chrome", [
      ["glass", "Glass", "Floating translucent panels"],
      ["solid", "Instrument", "Opaque, squared, high contrast"],
      ["bare", "Bare", "Borderless, hairlines only"]
    ]]
  ];

  let state;

  function load() {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return Object.assign({}, DEF); }
  }

  function apply() {
    const b = document.body;
    b.dataset.theme = state.theme;
    b.dataset.mode = state.mode;
    b.dataset.chrome = state.chrome;
    b.classList.toggle("rail-off", state.mode === "focus");
    b.classList.toggle("side-off", state.mode === "focus");
    window.dispatchEvent(new CustomEvent("studio-stage-color", { detail: STAGE[state.theme] }));
    window.dispatchEvent(new Event("resize"));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 240);
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function render(panel) {
    panel.innerHTML = `
      <div class="tw-head">
        <h2>Tweaks</h2>
        <button class="tw-close" id="twClose" aria-label="Close tweaks">✕</button>
      </div>
      ${CONTROLS.map(([key, label, opts]) => `
        <div class="tw-group">
          <span class="tw-label">${label}</span>
          <div class="tw-seg">
            ${opts.map(([v, t]) => `<button class="tw-opt${state[key] === v ? " on" : ""}" data-k="${key}" data-v="${v}">${t}</button>`).join("")}
          </div>
          <p class="tw-note">${opts.find((o) => o[0] === state[key])[2]}</p>
        </div>`).join("")}
      <button class="tw-reset" id="twReset">Reset to default</button>`;

    panel.querySelector("#twClose").onclick = () => toggle(false);
    panel.querySelector("#twReset").onclick = () => { state = Object.assign({}, DEF); apply(); render(panel); };
    panel.querySelectorAll(".tw-opt").forEach((b) => {
      b.onclick = () => { state[b.dataset.k] = b.dataset.v; apply(); render(panel); };
    });
  }

  function toggle(on) {
    const panel = document.getElementById("tweaks");
    const btn = document.getElementById("btnTweaks");
    const open = on === undefined ? !panel.classList.contains("open") : on;
    panel.classList.toggle("open", open);
    if (btn) btn.classList.toggle("active", open);
  }

  function init() {
    const panel = document.getElementById("tweaks");
    if (!panel) return;
    state = load();
    apply();
    render(panel);
    const btn = document.getElementById("btnTweaks");
    if (btn) btn.onclick = () => toggle();
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) toggle(false);
    });
    window.StudioTweaks = { set: (k, v) => { state[k] = v; apply(); render(panel); }, get: () => Object.assign({}, state) };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
