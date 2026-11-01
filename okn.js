/*
 * OKN 視動性眼振刺激
 * 速度以「度／秒」計算：px/° = (每公分像素) × 觀看距離(cm) × tan(1°)
 * 每公分像素用信用卡比對校正（存在本機）；未校正時以 96 dpi 估計。
 */
(function () {
  const NA = window.NeuroA;
  const $ = (id) => document.getElementById(id);

  const DEFAULTS = { pattern: 'bars', dir: 'R', speed: 20, width: 4, palette: 'bw', distance: 50 };
  const PALETTES = {
    bw: { bg: '#ffffff', fg: '#000000', label: '黑白' },
    rw: { bg: '#ffffff', fg: '#d0021b', label: '紅白' },
    low: { bg: '#8a8a8a', fg: '#6f6f6f', label: '低對比' }
  };
  const DIRS = { R: { zh: '向右', en: 'rightward', arrow: '→' }, L: { zh: '向左', en: 'leftward', arrow: '←' }, U: { zh: '向上', en: 'upward', arrow: '↑' }, D: { zh: '向下', en: 'downward', arrow: '↓' } };
  const CARD_MM = 85.6;

  const st = Object.assign({}, DEFAULTS, NA.store.get('okn-settings', {}));
  let cal = NA.store.get('okn-cal', null); // { pxPerCm }
  let running = false, offset = 0, last = 0, raf = 0, wake = null;

  const stage = $('stage'), canvas = $('cv'), ctx = canvas.getContext('2d');

  const pxPerCm = () => (cal && cal.pxPerCm) || 96 / 2.54;
  const pxPerDeg = () => pxPerCm() * st.distance * Math.tan(Math.PI / 180);
  const save = () => NA.store.set('okn-settings', st);

  /* ---------- 繪圖 ---------- */
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    const w = canvas.width / (ctx.getTransform().a || 1), h = canvas.height / (ctx.getTransform().d || 1);
    const pal = PALETTES[st.palette] || PALETTES.bw;
    const bw = Math.max(2, st.width * pxPerDeg());
    const period = bw * 2;
    const horiz = st.dir === 'L' || st.dir === 'R';
    const sign = st.dir === 'R' || st.dir === 'D' ? 1 : -1;
    const off = ((sign * offset) % period + period) % period;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pal.fg;
    const along = horiz ? w : h, across = horiz ? h : w;
    if (st.pattern === 'bars') {
      for (let p = off - period; p < along; p += period) {
        if (horiz) ctx.fillRect(p, 0, bw, h); else ctx.fillRect(0, p, w, bw);
      }
    } else {
      /* OKN 膠帶：方塊，沿移動方向等距排列，垂直方向也錯開排列 */
      const gap = period;
      const rows = Math.ceil(across / gap) + 1;
      const start = (across - (rows - 1) * gap - bw) / 2;
      for (let r = 0; r < rows; r++) {
        const q = start + r * gap;
        for (let p = off - period; p < along; p += period) {
          if (horiz) ctx.fillRect(p, q, bw, bw); else ctx.fillRect(q, p, bw, bw);
        }
      }
    }
  }

  function frame(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    offset += st.speed * pxPerDeg() * dt;
    if (offset > 1e7) offset = 0;
    draw();
    raf = requestAnimationFrame(frame);
  }

  async function lockWake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }

  function setRunning(on) {
    running = on;
    cancelAnimationFrame(raf);
    last = 0;
    if (on) raf = requestAnimationFrame(frame); else draw();
    lockWake(on);
    $('play').innerHTML = on ? '暫停' : '開始';
    $('fs-play').textContent = on ? '❚❚' : '▶';
    $('play').setAttribute('aria-pressed', String(on));
    stage.classList.toggle('running', on);
  }

  /* ---------- 介面同步 ---------- */
  function syncUI() {
    document.querySelectorAll('[data-dir]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dir === st.dir)));
    document.querySelectorAll('[data-pattern]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pattern === st.pattern)));
    document.querySelectorAll('[data-pal]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pal === st.palette)));
    $('speed').value = st.speed; $('speed-v').textContent = st.speed + ' °/s';
    $('width').value = st.width; $('width-v').textContent = st.width + ' °';
    $('dist').value = st.distance;
    $('cal-state').className = 'chip ' + (cal ? 'ok' : 'warn');
    $('cal-state').textContent = cal ? '已校正' : '未校正（以 96 dpi 估計）';
    const pxs = Math.round(st.speed * pxPerDeg());
    $('derived').textContent = `${pxPerDeg().toFixed(1)} px/° ・ ${pxs} px/s ・ 條紋週期 ${(st.width * 2).toFixed(1)}°`;
    $('hud').textContent = `${DIRS[st.dir].arrow} ${st.speed}°/s ・ ${st.width}°`;
    $('fs-info').textContent = `${DIRS[st.dir].arrow} ${st.speed}°/s`;
    $('expect').innerHTML = `條紋${DIRS[st.dir].zh}移動 → 正常反應為慢相${DIRS[st.dir].zh}追視、快相<b>${DIRS[{ R: 'L', L: 'R', U: 'D', D: 'U' }[st.dir]].zh}</b>跳回。`;
    draw();
  }

  function set(k, v) { st[k] = v; save(); syncUI(); }

  /* ---------- 全螢幕 ---------- */
  let hideTimer;
  const isFs = () => document.fullscreenElement === stage || document.webkitFullscreenElement === stage || stage.classList.contains('pseudo-fs');
  function pokeToolbar() {
    stage.classList.add('show-tools');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => stage.classList.remove('show-tools'), 2600);
  }
  async function enterFs() {
    try {
      if (stage.requestFullscreen) await stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      else throw new Error('no fs');
    } catch (e) {
      stage.classList.add('pseudo-fs');
      document.body.style.overflow = 'hidden';
      onFsChange();
    }
  }
  function exitFs() {
    if (stage.classList.contains('pseudo-fs')) {
      stage.classList.remove('pseudo-fs');
      document.body.style.overflow = '';
      onFsChange();
      return;
    }
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
  function onFsChange() {
    const fs = isFs();
    stage.classList.toggle('is-fs', fs);
    if (fs) { pokeToolbar(); if (!running) setRunning(true); }
    setTimeout(resize, 60);
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* ---------- 校正 ---------- */
  function openCal() {
    const dlg = $('cal');
    const range = $('cal-range');
    range.value = Math.round(pxPerCm() * CARD_MM / 10);
    const upd = () => {
      const w = Number(range.value);
      $('card').style.width = w + 'px';
      $('card').style.height = (w * 53.98 / 85.6) + 'px';
      $('cal-px').textContent = `${(w / (CARD_MM / 10)).toFixed(1)} px/cm`;
    };
    range.oninput = upd;
    upd();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  const closeCal = () => ($('cal').close ? $('cal').close() : $('cal').removeAttribute('open'));

  /* ---------- 紀錄 ---------- */
  const RESULTS = { normal: { zh: '正常', en: 'normal' }, reduced: { zh: '減弱', en: 'reduced' }, absent: { zh: '消失', en: 'absent' } };
  const findings = { R: null, L: null, U: null, D: null };
  function renderFindings() {
    $('findings').innerHTML = Object.keys(DIRS).map((d) => `<div class="frow">
      <span class="fdir"><b>${DIRS[d].arrow}</b> 條紋${DIRS[d].zh}</span>
      <div class="seg" data-frow="${d}">${Object.keys(RESULTS).map((k) => `<button type="button" data-res="${k}" aria-pressed="${findings[d] === k}">${RESULTS[k].zh}</button>`).join('')}</div>
    </div>`).join('');
    $('f-out').value = buildFindings();
  }
  function buildFindings() {
    const tested = Object.keys(DIRS).filter((d) => findings[d]);
    if (!tested.length) return '';
    const pat = st.pattern === 'bars' ? 'stripes' : 'OKN tape';
    const head = `OKN (${pat}, ${st.speed}°/s, ${st.width}° width, ${st.distance} cm${cal ? '' : ', uncalibrated'}):`;
    const lines = tested.map((d) => `${DIRS[d].en} stimulus — ${RESULTS[findings[d]].en}`);
    const note = $('f-note').value.trim();
    return head + ' ' + lines.join('; ') + '.' + (note ? ' ' + note : '');
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.dir) set('dir', t.dataset.dir);
    else if (t.dataset.pattern) set('pattern', t.dataset.pattern);
    else if (t.dataset.pal) set('palette', t.dataset.pal);
    else if (t.dataset.res) {
      const d = t.closest('[data-frow]').dataset.frow;
      findings[d] = findings[d] === t.dataset.res ? null : t.dataset.res;
      renderFindings();
    }
  });
  $('speed').addEventListener('input', (e) => set('speed', Number(e.target.value)));
  $('width').addEventListener('input', (e) => set('width', Number(e.target.value)));
  $('dist').addEventListener('change', (e) => { const v = Number(e.target.value); if (v >= 10 && v <= 300) set('distance', v); else syncUI(); });
  $('play').addEventListener('click', () => setRunning(!running));
  $('fs').addEventListener('click', enterFs);
  $('fs-exit').addEventListener('click', (e) => { e.stopPropagation(); exitFs(); });
  $('fs-play').addEventListener('click', (e) => { e.stopPropagation(); setRunning(!running); pokeToolbar(); });
  $('fs-slower').addEventListener('click', (e) => { e.stopPropagation(); set('speed', Math.max(2, st.speed - 5)); pokeToolbar(); });
  $('fs-faster').addEventListener('click', (e) => { e.stopPropagation(); set('speed', Math.min(90, st.speed + 5)); pokeToolbar(); });
  stage.addEventListener('pointermove', () => { if (isFs()) pokeToolbar(); });
  stage.addEventListener('click', (e) => {
    if (e.target.closest('.fs-tools')) return;
    if (isFs()) pokeToolbar(); else setRunning(!running);
  });
  $('reset').addEventListener('click', () => { Object.assign(st, DEFAULTS); save(); syncUI(); });
  $('open-cal').addEventListener('click', openCal);
  $('cal-cancel').addEventListener('click', closeCal);
  $('cal-ok').addEventListener('click', () => {
    cal = { pxPerCm: Number($('cal-range').value) / (CARD_MM / 10) };
    NA.store.set('okn-cal', cal);
    closeCal(); syncUI(); renderFindings();
    NA.toast('已儲存校正');
  });
  $('cal-clear').addEventListener('click', () => { cal = null; NA.store.remove('okn-cal'); closeCal(); syncUI(); NA.toast('已清除校正'); });
  $('f-note').addEventListener('input', () => { $('f-out').value = buildFindings(); });
  $('f-copy').addEventListener('click', () => { const v = buildFindings(); if (v) NA.copy(v, $('f-out')); else NA.toast('還沒有紀錄任何方向'); });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const map = { ArrowRight: 'R', ArrowLeft: 'L', ArrowUp: 'U', ArrowDown: 'D' };
    if (map[e.key]) { e.preventDefault(); set('dir', map[e.key]); if (isFs()) pokeToolbar(); }
    else if (e.key === ' ') { e.preventDefault(); setRunning(!running); }
    else if (e.key === '+' || e.key === '=') set('speed', Math.min(90, st.speed + 5));
    else if (e.key === '-' || e.key === '_') set('speed', Math.max(2, st.speed - 5));
    else if (e.key === ']') set('width', Math.min(15, st.width + 1));
    else if (e.key === '[') set('width', Math.max(1, st.width - 1));
    else if (e.key === 'f' || e.key === 'F') { isFs() ? exitFs() : enterFs(); }
    else if (e.key === 'Escape' && stage.classList.contains('pseudo-fs')) exitFs();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) setRunning(false); });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  syncUI();
  renderFindings();
  resize();
})();
