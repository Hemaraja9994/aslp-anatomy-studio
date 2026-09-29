// Teaching tools shared by every 3D lab: shareable links, class (projector) mode with a laser pointer,
// dissection (peel layers, per-layer visibility, tap-to-name, isolate / hide), spotter test and chapter quizzes.
import { GROUP_NAMES, infoFor, pretty, baseName } from './anatomy-info.js';

// ------------------------------------------------------------------ links
export function readHash(cfg) {
  const out = {}; const h = location.hash.slice(1); if (!h) return out;
  const q = new URLSearchParams(h);
  if (q.has('ch')) out.ch = Math.max(0, parseInt(q.get('ch'), 10) || 0);
  if (q.has('cam')) { const a = q.get('cam').split(',').map(Number); if (a.length === 6 && a.every(Number.isFinite)) out.cam = a; }
  const st = cfg.state || {};
  for (const k of cfg.share || []) {
    if (!q.has(k) || !(k in st)) continue;
    const v = q.get(k), t = typeof st[k];
    st[k] = t === 'number' ? (Number.isFinite(+v) ? +v : st[k]) : t === 'boolean' ? v === '1' : v;
  }
  if (q.has('class')) out.cls = true;
  return out;
}

const OUTER = ['skin', 'auricle', 'superficial', 'facial', 'lips', 'gland', 'bone', 'tbone', 'mastication', 'tmj', 'muscle', 'strap', 'suprahyoid', 'floor', 'teeth',
  'cortex', 'cortexL', 'cortexR', 'acortex', 'auditoryCortex', 'vessel', 'artery', 'cerebellum', 'constrictor', 'pharynx', 'airway'];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function installTools(ctx) {
  const { THREE, S, cfg, stage } = ctx;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const getOp = (m) => (m.material.uniforms && m.material.uniforms.uOpacity ? m.material.uniforms.uOpacity.value : m.material.opacity);

  // ---------------------------------------------------------------- toast
  const toast = el('div', 'toast'); toast.setAttribute('role', 'status'); document.body.append(toast);
  function say(html, ms = 2800) { toast.innerHTML = html; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), ms); }

  // ---------------------------------------------------------------- dock buttons
  const row = el('div', 'dock-row wrap tools');
  const mk = (id, txt, title) => { const b = el('button', 'tool', txt); b.type = 'button'; b.id = id; b.title = title; b.setAttribute('aria-pressed', 'false'); row.append(b); return b; };
  const bDis = mk('tDissect', 'Dissect', 'Peel layers, tap any structure to name it, spotter test (D)');
  const bQuiz = mk('tQuiz', 'Quiz', 'Chapter quiz and flashcards (Q)'); bQuiz.hidden = true;
  const bShare = mk('tShare', 'Share view', 'Copy a link that opens this exact chapter and view');
  const bClass = mk('tClass', 'Class mode', 'Full screen with large text and a laser pointer (C)');
  const dock = document.querySelector('.dock'); if (dock) dock.append(row);

  // ---------------------------------------------------------------- shareable links
  const share = cfg.share || [];
  function hashStr(withCam) {
    const q = new URLSearchParams(); q.set('ch', S.ch);
    for (const k of share) { const v = cfg.state[k]; if (v == null || typeof v === 'object') continue; q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : v); }
    if (withCam) { const c = ctx.camera.position, t = ctx.controls.target; q.set('cam', [c.x, c.y, c.z, t.x, t.y, t.z].map((v) => Math.round(v)).join(',')); }
    return q.toString();
  }
  let lastHash = '';
  setInterval(() => { if (!ctx.ready) return; const h = hashStr(false); if (h !== lastHash) { lastHash = h; try { history.replaceState(null, '', '#' + h); } catch (e) { /* sandboxed */ } } }, 700);
  bShare.addEventListener('click', async () => {
    const url = location.origin + location.pathname + location.search + '#' + hashStr(true);
    try {
      if (navigator.share && ctx.MOBILE) { await navigator.share({ title: document.title, url }); return; }
      await navigator.clipboard.writeText(url); say('Link copied. It opens this exact chapter, condition and view.');
    } catch (e) { say(`Copy this link:<br><input class="copy" value="${esc(url)}" readonly onclick="this.select()">`, 9000); }
  });
  const prevReady = ctx.onReady;
  ctx.onReady = () => {
    prevReady && prevReady();
    const H = ctx.HASH || {};
    if (H.cam) { ctx.camera.position.set(H.cam[0], H.cam[1], H.cam[2]); ctx.controls.target.set(H.cam[3], H.cam[4], H.cam[5]); ctx.controls.update(); }
    if (H.cls) setClass(true);
    if (cfg.dissectOpen) setDissect(true);
  };

  // ---------------------------------------------------------------- class mode + laser pointer
  const laser = el('div', 'laser'); stage.append(laser);
  function setClass(on) {
    document.body.classList.toggle('class-mode', on); bClass.setAttribute('aria-pressed', String(on)); bClass.textContent = on ? 'Exit class mode' : 'Class mode';
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => ctx.resize && ctx.resize(), 350);
  }
  bClass.addEventListener('click', () => setClass(!document.body.classList.contains('class-mode')));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('class-mode')) setClass(false); });
  stage.addEventListener('pointermove', (e) => {
    if (!document.body.classList.contains('class-mode') || e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect(); laser.style.transform = `translate(${e.clientX - r.left}px,${e.clientY - r.top}px)`; laser.style.opacity = '1';
    clearTimeout(laser.t); laser.t = setTimeout(() => { laser.style.opacity = '0'; }, 1600);
  });

  // ---------------------------------------------------------------- dissection state
  const dz = { on: false, op: {}, peel: 0, hidden: new Set(), iso: null };
  const baseOp = ctx.opFor;
  const isShell = (g) => { const m = (ctx.meshes[g] || [])[0]; return !!(m && m.material.uniforms); };
  const groupsNow = () => Object.keys(ctx.meshes).filter((g) => (ctx.meshes[g] || []).some((m) => !m.userData.skip));
  const peelOrder = () => { const gs = groupsNow(); return gs.filter((g) => OUTER.includes(g)).sort((a, b) => OUTER.indexOf(a) - OUTER.indexOf(b)); };
  function initDz() {
    for (const g of groupsNow()) {
      if (dz.op[g]) continue;
      // start from what the current chapter shows, so chapters still steer the dissection
      const arr = (cfg.groups[g] && cfg.groups[g].op) || [0.8]; let mx = Math.max(...arr); if (!(mx > 0)) mx = 0.8;
      const cur = baseOp(g), def = isShell(g) ? Math.min(0.3, mx) : Math.min(1, Math.max(0.65, mx));
      dz.op[g] = { vis: cur > 0.02, op: cur > 0.02 ? Math.round(cur * 20) / 20 : def };
    }
  }
  ctx.opFor = (g) => {
    if (!dz.on) return baseOp(g);
    const d = dz.op[g]; if (!d) return baseOp(g);
    if (!d.vis) return 0;
    const pi = peelOrder().indexOf(g); if (pi >= 0 && pi < dz.peel) return 0;
    return d.op;
  };
  ctx.meshTarget = (m, tg) => {
    const n = m.userData.name;
    if (dz.hidden.size && dz.hidden.has(n)) return 0;
    if (dz.iso) return n === dz.iso ? Math.max(tg, 0.95) : Math.min(tg, 0.05);
    return tg;
  };

  // ---------------------------------------------------------------- selection overlay
  let selMesh = null, selOverlay = null;
  function select(m, card = true) {
    if (selOverlay) { selOverlay.parent && selOverlay.parent.remove(selOverlay); selOverlay.material.dispose(); selOverlay = null; }
    selMesh = m || null;
    if (!m) { pick.hidden = true; return; }
    const mat = new THREE.MeshBasicMaterial({ color: 0x5fe3f2, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    if (m.material.clippingPlanes) mat.clippingPlanes = m.material.clippingPlanes;
    selOverlay = new THREE.Mesh(m.geometry, mat); selOverlay.renderOrder = 9; selOverlay.raycast = () => {}; m.add(selOverlay);
    if (card) showPick(m); else pick.hidden = true;
  }
  // gentle pulse of the selection
  (function pulse() { if (selOverlay) selOverlay.material.opacity = 0.24 + 0.1 * Math.sin(performance.now() / 420); requestAnimationFrame(pulse); })();

  // ---------------------------------------------------------------- tap to name
  const pick = el('div', 'pick'); pick.hidden = true; stage.append(pick);
  function showPick(m) {
    const n = m.userData.name, g = m.userData.grp, info = infoFor(n);
    pick.innerHTML = `<button type="button" class="x" data-pk="close" aria-label="Close">✕</button><div class="pk-g">${esc(GROUP_NAMES[g] || g)}</div><h4>${esc(pretty(m.userData.en || n))}</h4>${info ? `<p>${esc(info)}</p>` : ''}
      <div class="pk-a"><button type="button" data-pk="iso" aria-pressed="${dz.iso === n}">${dz.iso === n ? 'Show others' : 'Isolate'}</button><button type="button" data-pk="hide">Hide</button>${dz.hidden.size || dz.iso ? '<button type="button" data-pk="all">Show all</button>' : ''}<button type="button" data-pk="fly">Zoom to</button></div>`;
    pick.hidden = false;
  }
  pick.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pk]'); if (!b) return; const a = b.dataset.pk, n = selMesh && selMesh.userData.name;
    if (a === 'close') { select(null); return; }
    if (a === 'iso' && n) { dz.iso = dz.iso === n ? null : n; showPick(selMesh); }
    if (a === 'hide' && n) { dz.hidden.add(n); if (dz.iso === n) dz.iso = null; select(null); say(`Hidden: ${esc(pretty(n))} · tap “Show all” in Dissect to restore`); renderDz(); }
    if (a === 'all') { dz.hidden.clear(); dz.iso = null; if (selMesh) showPick(selMesh); renderDz(); }
    if (a === 'fly' && selMesh) frame(selMesh);
  });
  const ray = new THREE.Raycaster(); let down = null;
  stage.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  stage.addEventListener('pointerup', (e) => {
    if (!down || !ctx.ready) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (d > 7 || dt > 450 || e.target.closest('.pick')) return;
    if (spot.on) return; // no names during a spotter test
    pickAt(e.clientX, e.clientY);
  });
  function pickAt(x, y) {
    const r = ctx.renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), ctx.camera);
    const cands = []; for (const g in ctx.meshes) for (const m of ctx.meshes[g]) if (m.visible && !m.userData.skip && getOp(m) > 0.04) cands.push(m);
    const hits = ray.intersectObjects(cands, false).filter((h) => { const cp = h.object.material.clippingPlanes; return !cp || cp.every((p) => p.distanceToPoint(h.point) >= -0.5); });
    if (!hits.length) { select(null); return; }
    const solidHit = hits.find((h) => !h.object.material.uniforms && getOp(h.object) > 0.3);
    select((solidHit || hits[0]).object);
  }
  function frame(m, dur = 1.3) {
    const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), rad = Math.max(4, b.getSize(new THREE.Vector3()).length() / 2);
    const dir = ctx.camera.position.clone().sub(ctx.controls.target).normalize();
    ctx.flyTo(c.clone().add(dir.multiplyScalar(Math.max(45, rad * 3.4))), c, dur);
  }

  // ---------------------------------------------------------------- dissection panel
  const dzp = el('section', 'panel dz'); dzp.hidden = true;
  const side = document.querySelector('.side'); if (side) side.prepend(dzp);
  function renderDz() {
    if (!dz.on) { dzp.hidden = true; return; }
    initDz(); dzp.hidden = false;
    const po = peelOrder(), gs = groupsNow();
    const peelTxt = dz.peel ? po.slice(0, dz.peel).map((g) => GROUP_NAMES[g] || g).join(' → ') + ' removed' : 'all layers present';
    dzp.innerHTML = `<div class="panel-head"><h3>Dissection</h3><button type="button" class="x" data-dz="close" aria-label="Close dissection">✕</button></div>
      ${po.length ? `<label class="peel" for="dzPeel"><span>Peel layers</span><input type="range" id="dzPeel" min="0" max="${po.length}" step="1" value="${dz.peel}"></label><p class="note" id="dzPeelTxt">${esc(peelTxt)}</p>` : ''}
      <div class="dz-list">${gs.map((g) => `<div class="dz-row"><label><input type="checkbox" data-g="${g}" ${dz.op[g].vis ? 'checked' : ''}> ${esc(GROUP_NAMES[g] || g)}</label><input type="range" data-go="${g}" min="0" max="1" step="0.05" value="${dz.op[g].op}" aria-label="${esc(GROUP_NAMES[g] || g)} opacity"></div>`).join('')}</div>
      <div class="dz-a"><button type="button" data-dz="all">Show all${dz.hidden.size ? ` (${dz.hidden.size} hidden)` : ''}</button><button type="button" data-dz="spot" class="hot">Spotter test</button></div>
      <div id="dzSpot"></div>
      <p class="note">Tap or click any structure to see its name and function. Isolate or hide it from that card.</p>`;
    if (spot.on) renderSpot();
  }
  function setDissect(on) {
    dz.on = on; bDis.setAttribute('aria-pressed', String(on)); bDis.textContent = on ? 'Close dissect' : 'Dissect';
    if (!on) { dz.iso = null; spot.on = false; }
    renderDz(); if (on && ctx.MOBILE) dzp.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  bDis.addEventListener('click', () => setDissect(!dz.on));
  let lastCh = S.ch;
  setInterval(() => { if (S.ch !== lastCh) { lastCh = S.ch; dz.op = {}; dz.peel = 0; if (dz.on) renderDz(); } }, 300);
  dzp.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'dzPeel') { dz.peel = +t.value; const po = peelOrder(); $('dzPeelTxt').textContent = dz.peel ? po.slice(0, dz.peel).map((g) => GROUP_NAMES[g] || g).join(' → ') + ' removed' : 'all layers present'; }
    if (t.dataset.go) { dz.op[t.dataset.go].op = +t.value; dz.op[t.dataset.go].vis = true; const cb = dzp.querySelector(`[data-g="${t.dataset.go}"]`); if (cb) cb.checked = true; }
  });
  dzp.addEventListener('change', (e) => { const t = e.target; if (t.dataset.g) dz.op[t.dataset.g].vis = t.checked; });
  dzp.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dz],[data-sp]'); if (!b) return;
    const a = b.dataset.dz;
    if (a === 'close') setDissect(false);
    if (a === 'all') { dz.hidden.clear(); dz.iso = null; dz.peel = 0; for (const g in dz.op) dz.op[g].vis = true; renderDz(); }
    if (a === 'spot') startSpot();
    if (b.dataset.sp != null) answerSpot(b.dataset.sp);
    if (a === 'next') nextSpot();
    if (a === 'endspot') { spot.on = false; select(null); renderDz(); }
  });

  // ---------------------------------------------------------------- spotter test
  const spot = { on: false, i: 0, n: 10, score: 0, missed: [], cur: null, opts: [], done: false, used: new Set() };
  function spotPool() {
    const out = new Map();
    for (const g in ctx.meshes) {
      if (/^skin$/.test(g)) continue;
      for (const m of ctx.meshes[g]) {
        const n = m.userData.name; if (!n || m.userData.skip || /region|Eyebrow|Philtrum|triangle|sulcus|commissure/i.test(n)) continue;
        if (!(ctx.opFor(g) > 0.05)) continue;
        const b = new THREE.Box3().setFromObject(m); if (b.isEmpty() || b.getSize(new THREE.Vector3()).length() < 2.5) continue;
        const k = baseName(n); if (!out.has(k)) out.set(k, { k, m, g });
      }
    }
    return [...out.values()];
  }
  function startSpot() {
    const pool = spotPool();
    if (pool.length < 4) { say('Show more layers first: the spotter needs at least four visible structures.'); return; }
    Object.assign(spot, { on: true, i: 0, score: 0, missed: [], done: false, used: new Set(), n: Math.min(10, pool.length) });
    nextSpot();
  }
  function nextSpot() {
    const pool = spotPool().filter((p) => !spot.used.has(p.k));
    if (spot.i >= spot.n || !pool.length) { spot.done = true; select(null); renderSpot(); return; }
    const t = pool[(Math.random() * pool.length) | 0]; spot.used.add(t.k);
    const all = spotPool().filter((p) => p.k !== t.k);
    const same = shuffle(all.filter((p) => p.g === t.g)), other = shuffle(all.filter((p) => p.g !== t.g));
    spot.cur = t; spot.opts = shuffle([t.k, ...[...same, ...other].slice(0, 3).map((p) => p.k)]); spot.ans = null; spot.i++;
    select(t.m, false); frame(t.m, 1.1); renderSpot();
  }
  function answerSpot(v) {
    if (spot.ans != null || !spot.cur) return; spot.ans = spot.opts[+v];
    if (spot.ans === spot.cur.k) spot.score++; else spot.missed.push(spot.cur.k);
    renderSpot();
  }
  function renderSpot() {
    const box = $('dzSpot'); if (!box) return;
    if (!spot.on) { box.innerHTML = ''; return; }
    if (spot.done) {
      box.innerHTML = `<div class="spot"><h4>Spotter score: ${spot.score} / ${spot.n}</h4>${spot.missed.length ? `<p class="note">Revise: ${spot.missed.map(esc).join(' · ')}</p>` : '<p class="note">All correct. Excellent.</p>'}<div class="dz-a"><button type="button" data-dz="spot" class="hot">Try again</button><button type="button" data-dz="endspot">Done</button></div></div>`;
      return;
    }
    const c = spot.cur, info = infoFor(c.m.userData.name);
    box.innerHTML = `<div class="spot"><div class="pk-g">Spotter ${spot.i} / ${spot.n} · score ${spot.score}</div><h4>Name the highlighted structure</h4>
      <div class="spot-o">${spot.opts.map((o, i) => { const st = spot.ans == null ? '' : o === c.k ? 'ok' : o === spot.ans ? 'bad' : ''; return `<button type="button" data-sp="${i}" class="${st}">${esc(o)}</button>`; }).join('')}</div>
      ${spot.ans != null ? `<p class="note"><b>${spot.ans === c.k ? 'Correct.' : `It is the ${esc(c.k)}.`}</b> ${esc(info)}</p><div class="dz-a"><button type="button" data-dz="next" class="hot">${spot.i >= spot.n ? 'See score' : 'Next'}</button><button type="button" data-dz="endspot">Stop</button></div>` : ''}</div>`;
  }

  // ---------------------------------------------------------------- quizzes
  let QZ = null;
  fetch('./quiz.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.chapters) { QZ = j; bQuiz.hidden = false; ctx.renderCard && ctx.renderCard(); } }).catch(() => {});
  ctx.afterCard = () => {
    const qs = QZ && QZ.chapters[String(S.ch)]; if (!qs || !qs.length) return;
    const b = el('button', 'quiz-cta', `Test yourself · ${qs.length} questions`); b.type = 'button'; b.addEventListener('click', () => openQuiz('ch', 'quiz'));
    $('card').append(b);
  };
  const qz = el('div', 'qz'); qz.hidden = true; qz.setAttribute('role', 'dialog'); qz.setAttribute('aria-modal', 'true'); document.body.append(qz);
  const Q = { list: [], i: 0, score: 0, ans: null, mode: 'quiz', scope: 'ch', flip: false, wrong: [] };
  function openQuiz(scope, mode) {
    if (!QZ) return;
    let list;
    if (scope === 'lab') list = shuffle(Object.values(QZ.chapters).flat()).slice(0, 10);
    else list = (QZ.chapters[String(S.ch)] || []).slice();
    if (!list.length) { say('No questions for this chapter yet.'); return; }
    Object.assign(Q, { list: list.map((q) => ({ ...q, ord: shuffle(q.o.map((_, i) => i)) })), i: 0, score: 0, ans: null, mode, scope, flip: false, wrong: [] });
    qz.hidden = false; renderQuiz(); qz.querySelector('button') && qz.querySelector('button').focus();
  }
  function renderQuiz() {
    const title = Q.scope === 'lab' ? `${esc(QZ.title || document.title)} · lab test` : `${esc(ctx.cfg.chapters[S.ch].nav || ctx.cfg.chapters[S.ch].k)} · chapter quiz`;
    const head = `<div class="qz-head"><div><div class="pk-g">${title}</div></div><div class="seg"><button type="button" data-qm="quiz" aria-pressed="${Q.mode === 'quiz'}">Quiz</button><button type="button" data-qm="cards" aria-pressed="${Q.mode === 'cards'}">Flashcards</button></div><button type="button" class="x" data-qz="x" aria-label="Close quiz">✕</button></div>`;
    const scope = `<div class="qz-scope"><button type="button" data-qs="ch" aria-pressed="${Q.scope === 'ch'}">This chapter</button><button type="button" data-qs="lab" aria-pressed="${Q.scope === 'lab'}">Whole lab · 10</button></div>`;
    let body = '';
    if (Q.mode === 'quiz' && Q.i >= Q.list.length) {
      body = `<h3>Score ${Q.score} / ${Q.list.length}</h3>${Q.wrong.length ? `<p class="note">Review:</p><ul class="mg">${Q.wrong.map((q) => `<li>${esc(q.q)} <b>→ ${esc(q.o[q.a])}</b></li>`).join('')}</ul>` : '<p class="note">All correct.</p>'}<div class="dz-a"><button type="button" data-qz="again" class="hot">Try again</button><button type="button" data-qz="x">Close</button></div>`;
    } else if (Q.mode === 'quiz') {
      const q = Q.list[Q.i];
      body = `<div class="pk-g">Question ${Q.i + 1} / ${Q.list.length} · score ${Q.score}</div><h3>${esc(q.q)}</h3><div class="qz-o">${q.ord.map((oi) => { const st = Q.ans == null ? '' : oi === q.a ? 'ok' : oi === Q.ans ? 'bad' : ''; return `<button type="button" data-qa="${oi}" class="${st}">${esc(q.o[oi])}</button>`; }).join('')}</div>
        ${Q.ans != null ? `<p class="note"><b>${Q.ans === q.a ? 'Correct.' : 'Not quite.'}</b> ${esc(q.e || '')}</p><div class="dz-a"><button type="button" data-qz="next" class="hot">${Q.i + 1 >= Q.list.length ? 'See score' : 'Next'}</button></div>` : ''}`;
    } else {
      const q = Q.list[Math.min(Q.i, Q.list.length - 1)];
      body = `<div class="pk-g">Card ${Math.min(Q.i, Q.list.length - 1) + 1} / ${Q.list.length} · tap the card to flip</div><button type="button" class="card-flip ${Q.flip ? 'back' : ''}" data-qz="flip">${Q.flip ? `<b>${esc(q.o[q.a])}</b><span>${esc(q.e || '')}</span>` : `<span>${esc(q.q)}</span>`}</button><div class="dz-a"><button type="button" data-qz="prev">‹ Previous</button><button type="button" data-qz="nextc" class="hot">Next ›</button></div>`;
    }
    qz.innerHTML = `<div class="qz-box">${head}${scope}<div class="qz-body">${body}</div></div>`;
  }
  qz.addEventListener('click', (e) => {
    if (e.target === qz) { qz.hidden = true; return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.qz === 'x') qz.hidden = true;
    if (b.dataset.qm) { Q.mode = b.dataset.qm; Q.i = 0; Q.ans = null; Q.flip = false; Q.score = 0; Q.wrong = []; renderQuiz(); }
    if (b.dataset.qs) openQuiz(b.dataset.qs, Q.mode);
    if (b.dataset.qa != null && Q.ans == null) { const q = Q.list[Q.i]; Q.ans = +b.dataset.qa; if (Q.ans === q.a) Q.score++; else Q.wrong.push(q); renderQuiz(); }
    if (b.dataset.qz === 'next') { Q.i++; Q.ans = null; renderQuiz(); }
    if (b.dataset.qz === 'again') openQuiz(Q.scope, 'quiz');
    if (b.dataset.qz === 'flip') { Q.flip = !Q.flip; renderQuiz(); }
    if (b.dataset.qz === 'nextc') { Q.i = (Q.i + 1) % Q.list.length; Q.flip = false; renderQuiz(); }
    if (b.dataset.qz === 'prev') { Q.i = (Q.i - 1 + Q.list.length) % Q.list.length; Q.flip = false; renderQuiz(); }
  });
  bQuiz.addEventListener('click', () => openQuiz(QZ && (QZ.chapters[String(S.ch)] || []).length ? 'ch' : 'lab', 'quiz'));

  // ---------------------------------------------------------------- keys
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.key === 'Escape') { if (!qz.hidden) qz.hidden = true; else if (selMesh) select(null); }
    const k = e.key.toLowerCase();
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'c') setClass(!document.body.classList.contains('class-mode'));
    if (k === 'd') setDissect(!dz.on);
    if (k === 'q' && QZ) openQuiz('ch', 'quiz');
  });
  ctx.tools = { setDissect, setClass, select, openQuiz, say, dz };
}
