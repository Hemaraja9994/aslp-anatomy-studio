import {
  ADVANCED_SECTIONS,
  ADVANCED_CARDS,
  PATHOLOGY_SECTIONS,
  PATHOLOGY_CASES,
  LIBRARY_DISCLAIMER
} from "./library-data.js";

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

function cardHtml(card, kind) {
  const tags = (card.relatedModules || []).map((id) => `<span class="tag">${esc(id)}</span>`).join("");
  const points = (card.teaching || card.points || []).map((p) => `<li>${esc(p)}</li>`).join("");
  const structures = card.structures
    ? `<p class="lib-structures"><b>Structures.</b> ${esc(card.structures.join(" · "))}</p>`
    : "";
  const links = [];
  if (card.href) {
    links.push(`<a class="btn primary" href="${esc(card.href)}" target="_blank" rel="noopener">${esc(card.cta || "Open resource")}</a>`);
  }
  if (card.secondaryHref) {
    links.push(`<a class="btn" href="${esc(card.secondaryHref)}" target="_blank" rel="noopener">${esc(card.secondaryCta || "Paper")}</a>`);
  }
  if (card.openModule) {
    links.push(`<button class="btn" type="button" data-open-module="${esc(card.openModule)}">Open in RCI Core · ${esc(card.openModule)}</button>`);
  }
  if (!links.length && card.placeholder) {
    links.push(`<span class="lib-pill">Placeholder · open link-outs above</span>`);
  }
  return `
    <article class="lib-card${card.placeholder ? " is-placeholder" : ""}" data-card="${esc(card.id)}">
      <header>
        <h4>${esc(card.title)}</h4>
        <p class="lib-meta">${esc(card.source || "")}${card.license ? ` · <span>${esc(card.license)}</span>` : ""}</p>
      </header>
      <p>${esc(card.summary || "")}</p>
      ${structures}
      ${points ? `<ul class="lib-points">${points}</ul>` : ""}
      ${tags ? `<div class="tags">${tags}</div>` : ""}
      <div class="lib-actions">${links.join("")}</div>
    </article>`;
}

function sectionBlock(section, cards, kind) {
  const list = cards.filter((c) => c.section === section.id || (c.also || []).includes(section.id));
  // Prefer primary section match first
  const primary = cards.filter((c) => c.section === section.id);
  const extras = list.filter((c) => c.section !== section.id);
  const ordered = [...primary, ...extras.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i && !primary.find((p) => p.id === c.id))];
  return `
    <section class="lib-section" id="lib-${kind}-${esc(section.id)}" data-lib-section="${esc(section.id)}">
      <div class="panel-head lib-section-head">
        <h3>${esc(section.title)}</h3>
        <span class="count">${ordered.length}</span>
      </div>
      <p class="lib-section-blurb">${esc(section.blurb)}</p>
      <div class="lib-grid">
        ${ordered.map((c) => cardHtml(c, kind)).join("") || `<p class="muted">Cards coming soon.</p>`}
      </div>
    </section>`;
}

export function createSectionsController(api) {
  const state = { section: "core" }; // core | advanced | pathology

  const els = {
    switches: [...document.querySelectorAll("[data-studio-section]")],
    home: document.getElementById("home"),
    corePanel: document.getElementById("homeCore"),
    advancedPanel: document.getElementById("homeAdvanced"),
    pathologyPanel: document.getElementById("homePathology"),
    railHint: document.getElementById("sectionRailHint"),
    subnavAdvanced: document.getElementById("advancedSubnav"),
    subnavPathology: document.getElementById("pathologySubnav")
  };

  function renderLibrary() {
    if (els.advancedPanel) {
      els.advancedPanel.innerHTML = `
        <div class="hero lib-hero">
          <p class="eyebrow">Advanced Atlas</p>
          <h2>Open head &amp; neck and ear resources</h2>
          <p>${esc(LIBRARY_DISCLAIMER.advanced)}</p>
          <p class="lib-ban">No Netter · No Elsevier Complete Anatomy · Open / attributable sources only.</p>
          <nav class="lib-subnav" id="advancedSubnavInline" aria-label="Advanced Atlas subsections">
            ${ADVANCED_SECTIONS.map((s) => `<a class="btn" href="#lib-advanced-${esc(s.id)}">${esc(s.title)}</a>`).join("")}
          </nav>
        </div>
        ${ADVANCED_SECTIONS.map((s) => sectionBlock(s, ADVANCED_CARDS, "advanced")).join("")}
      `;
    }
    if (els.pathologyPanel) {
      els.pathologyPanel.innerHTML = `
        <div class="hero lib-hero">
          <p class="eyebrow">Pathology</p>
          <h2>Curated teaching cases</h2>
          <p>${esc(LIBRARY_DISCLAIMER.pathology)}</p>
          <p class="lib-ban">Teaching only — not for diagnosis, staging, or surgical planning. De-identified patterns.</p>
          <nav class="lib-subnav" id="pathologySubnavInline" aria-label="Pathology subsections">
            ${PATHOLOGY_SECTIONS.map((s) => `<a class="btn" href="#lib-pathology-${esc(s.id)}">${esc(s.title)}</a>`).join("")}
          </nav>
        </div>
        ${PATHOLOGY_SECTIONS.map((s) => sectionBlock(s, PATHOLOGY_CASES, "pathology")).join("")}
      `;
    }
    if (els.subnavAdvanced) {
      els.subnavAdvanced.innerHTML = ADVANCED_SECTIONS.map((s) =>
        `<button type="button" class="mod" data-jump="lib-advanced-${esc(s.id)}"><b>Adv</b> ${esc(s.title)}</button>`
      ).join("");
    }
    if (els.subnavPathology) {
      els.subnavPathology.innerHTML = PATHOLOGY_SECTIONS.map((s) =>
        `<button type="button" class="mod" data-jump="lib-pathology-${esc(s.id)}"><b>Path</b> ${esc(s.title)}</button>`
      ).join("");
    }
  }

  function syncChrome() {
    document.body.dataset.studioSection = state.section;
    els.switches.forEach((btn) => {
      const on = btn.getAttribute("data-studio-section") === state.section;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    if (els.corePanel) els.corePanel.hidden = state.section !== "core";
    if (els.advancedPanel) els.advancedPanel.hidden = state.section !== "advanced";
    if (els.pathologyPanel) els.pathologyPanel.hidden = state.section !== "pathology";
    if (els.railHint) {
      els.railHint.textContent = state.section === "core"
        ? "RCI Core modules"
        : state.section === "advanced"
          ? "Advanced Atlas"
          : "Pathology cases";
    }
    const moduleList = document.getElementById("moduleList");
    const adv = document.getElementById("advancedSubnav");
    const path = document.getElementById("pathologySubnav");
    if (moduleList) moduleList.hidden = state.section !== "core";
    if (adv) adv.hidden = state.section !== "advanced";
    if (path) path.hidden = state.section !== "pathology";
    const search = document.getElementById("search");
    if (search) search.hidden = state.section !== "core";
  }

  function showHomeForSection() {
    if (els.home) els.home.style.display = "block";
    if (api.onShowHome) api.onShowHome();
    syncChrome();
    // Scroll library hero into view when switching
    requestAnimationFrame(() => {
      if (els.home) els.home.scrollTop = 0;
    });
  }

  function setSection(section, opts = {}) {
    if (!["core", "advanced", "pathology"].includes(section)) return;
    state.section = section;
    syncChrome();
    if (opts.showHome !== false) showHomeForSection();
    if (api.onSectionChange) api.onSectionChange(section);
  }

  function bind() {
    els.switches.forEach((btn) => {
      btn.addEventListener("click", () => setSection(btn.getAttribute("data-studio-section")));
    });
    document.addEventListener("click", (e) => {
      const jump = e.target.closest("[data-jump]");
      if (jump) {
        e.preventDefault();
        const id = jump.getAttribute("data-jump");
        const target = document.getElementById(id);
        if (els.home) els.home.style.display = "block";
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const openMod = e.target.closest("[data-open-module]");
      if (openMod) {
        e.preventDefault();
        const id = openMod.getAttribute("data-open-module");
        setSection("core", { showHome: false });
        if (api.openModule) api.openModule(id);
      }
    });
  }

  renderLibrary();
  bind();
  syncChrome();

  return {
    setSection,
    getSection: () => state.section,
    showHome: showHomeForSection,
    refresh: renderLibrary
  };
}
