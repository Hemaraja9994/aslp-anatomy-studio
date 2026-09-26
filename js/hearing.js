'use strict';
(() => {
  const steps = JSON.parse(document.getElementById('lesson-data').textContent);
  const buttons = [...document.querySelectorAll('[data-step]')];
  let current = 0, timer = null;
  const play = document.getElementById('play');
  function render() {
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === current)));
    document.getElementById('step-count').textContent = `Stage ${current + 1} / ${steps.length} · ${steps[current][1]}`;
    document.getElementById('step-title').textContent = steps[current][0];
    document.getElementById('step-copy').textContent = steps[current][2];
    document.getElementById('signal-dot').style.left = `${current / (steps.length - 1) * 98}%`;
  }
  function stop() { clearInterval(timer); timer = null; play.textContent = 'Play sequence'; }
  buttons.forEach((b, i) => b.addEventListener('click', () => { stop(); current = i; render(); }));
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (current === steps.length - 1) current = 0;
    render(); play.textContent = 'Pause sequence';
    timer = setInterval(() => { current++; render(); if (current === steps.length - 1) stop(); }, 2600);
  });
  document.getElementById('reset').addEventListener('click', () => { stop(); current = 0; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.querySelectorAll('nav a').forEach(a => { if (a.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) a.setAttribute('aria-current', 'page'); });
  render();
  const styles = document.querySelector('.styles');
  if (!styles) return;
  const models = [
    ['BTE', 'Behind the ear', 'A case behind the pinna sends sound through tubing to an earmould.', '<path d="M129 66 Q96 70 112 132" fill="none" stroke-width="20"/><path d="M130 64 Q204 31 207 152" fill="none"/><rect x="195" y="150" width="28" height="23" rx="7"/>'],
    ['RIC', 'Receiver in canal', 'A fine wire connects the case to a receiver in the canal.', '<path d="M129 66 Q99 70 111 118" fill="none" stroke-width="14"/><path d="M130 64 Q206 35 232 160" fill="none" stroke-width="2"/><rect x="222" y="154" width="24" height="18" rx="6"/>'],
    ['ITE', 'In the ear', 'A custom shell occupies the outer-ear bowl.', '<ellipse cx="201" cy="145" rx="27" ry="37"/>'],
    ['ITC', 'In the canal', 'A smaller custom shell sits partly within the canal.', '<rect x="205" y="148" width="34" height="28" rx="10"/>'],
    ['CIC', 'Completely in canal', 'A compact shell fits deeper in the canal; handling and feature space can be limited.', '<rect x="245" y="153" width="23" height="20" rx="7"/>']
  ];
  function choose(i) {
    [...styles.children].forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
    document.getElementById('style-title').textContent = models[i][1];
    document.getElementById('style-copy').textContent = models[i][2];
    document.getElementById('device-title').textContent = `${models[i][1]} placement schematic`;
    document.getElementById('device-shape').innerHTML = models[i][3];
  }
  models.forEach((m,i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m[0]; b.addEventListener('click', () => choose(i)); styles.append(b); });
  choose(0);
})();
