/*
 * NIHSS 互動頁面
 * 內容（文字、選項、刺激材料）在 nihss.data.js；這支只負責圖示與互動。
 */
(function () {
  const NA = window.NeuroA;
  const D = NA.data.nihss;
  const $ = (id) => document.getElementById(id);
  const esc = NA.esc;

  /* ==========================================================
     圖示：每個函式回傳一段 SVG，參數是該選項的分數
     ========================================================== */
  const svg = (inner, vb = '0 0 120 64') => `<svg class="fig" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
  const ok = (x, y) => `<path class="ok" d="M${x - 6} ${y} l4.5 4.5 l8 -9"/>`;
  const cross = (x, y, r = 5) => `<path class="x" d="M${x - r} ${y - r} l${2 * r} ${2 * r} M${x + r} ${y - r} l${-2 * r} ${2 * r}"/>`;
  const nil = (x, y, r = 6) => `<circle class="s1" cx="${x}" cy="${y}" r="${r}"/><path class="s1" d="M${x - r * 0.75} ${y + r * 0.75} L${x + r * 0.75} ${y - r * 0.75}"/>`;
  const arrowDown = (x, y1, y2, cls = 'a') => `<path class="${cls}" d="M${x} ${y1} V${y2} m-4.5 -4.5 l4.5 4.5 l4.5 -4.5"/>`;
  const arrowUp = (x, y1, y2, cls = 'a') => `<path class="${cls}" d="M${x} ${y1} V${y2} m-4.5 4.5 l4.5 -4.5 l4.5 4.5"/>`;
  const un = (label) => svg(`<rect class="bg" x="30" y="8" width="60" height="40" rx="8"/><text x="60" y="35" text-anchor="middle" class="tb" style="font-size:18px;font-family:var(--f-mono)">UN</text><text x="60" y="60" text-anchor="middle">${esc(label)}</text>`);

  const FIG = {
    loc(s) {
      const open = '<path class="bg" d="M20 34 Q44 12 68 34 Q44 56 20 34Z"/><circle class="s" cx="44" cy="34" r="9"/><circle class="f" cx="44" cy="34" r="3.6"/>';
      const half = '<path class="bg" d="M20 34 Q44 54 68 34 Q44 27 20 34Z"/><path class="f" d="M36.5 31.6 Q44 46 51.5 31.6 Q44 30 36.5 31.6Z"/><path class="s" d="M20 34 Q44 27 68 34"/>';
      const closed = '<path class="s" d="M20 32 Q44 46 68 32"/><path class="s1" d="M28 38.5 l-3 5 M36 41.5 l-1.5 5.5 M44 42.6 v5.6 M52 41.5 l1.5 5.5 M60 38.5 l3 5"/>';
      const voice = '<path class="a" d="M84 26 q4 8 0 16 M91 21 q8 13 0 26"/>';
      const press = arrowDown(88, 8, 26) + arrowDown(103, 8, 26) + '<path class="a" d="M80 31 H110"/>';
      if (s === 0) return svg(open + '<path class="a" d="M80 18 l6 -6 M84 30 h9 M80 42 l6 6"/>');
      if (s === 1) return svg(half + voice);
      if (s === 2) return svg(closed + press + '<path class="s1" d="M78 50 q3 -3 6 0 t6 0 t6 0"/>');
      return svg(closed + press + nil(96, 50));
    },
    tasks(s, labels) {
      const marks = s === 0 ? [1, 1] : s === 1 ? [1, 0] : [0, 0];
      return svg([6, 64].map((x, i) =>
        `<rect class="bg" x="${x}" y="6" width="50" height="52" rx="7"/>` +
        `<text x="${x + 25}" y="26" text-anchor="middle" class="tb" style="font-size:10px">${esc(labels[i] || '')}</text>` +
        (marks[i] ? ok(x + 25, 40) : cross(x + 25, 42))
      ).join(''));
    },
    gaze(s) {
      const dx = s === 2 ? -11 : 0;
      const eyes = [34, 86].map((cx) =>
        `<path class="bg" d="M${cx - 20} 26 Q${cx} 9 ${cx + 20} 26 Q${cx} 43 ${cx - 20} 26Z"/>` +
        `<circle class="s" cx="${cx + dx}" cy="26" r="7"/><circle class="f" cx="${cx + dx}" cy="26" r="3"/>`
      ).join('');
      const headL = (x) => `M${x + 6} 49.5 L${x} 54 L${x + 6} 58.5`;
      const headR = (x) => `M${x - 6} 49.5 L${x} 54 L${x - 6} 58.5`;
      let arrows;
      if (s === 0) arrows = `<path class="a" d="M26 54 H94 ${headL(26)} ${headR(94)}"/>`;
      else if (s === 1) arrows = `<path class="a" d="M60 54 H26 ${headL(26)}"/><path class="a" d="M60 54 H74"/><path class="x" d="M78 48.5 V59.5"/>`;
      else arrows = `<path class="a" d="M94 54 H26 ${headL(26)}" style="stroke-width:3.2"/>` + cross(102, 54, 4);
      return svg(eyes + arrows);
    },
    field(s) {
      return svg([36, 84].map((cx) => {
        const cy = 29, r = 20;
        let shade = '';
        if (s === 1) shade = `<path class="shade" d="M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z"/>`;
        if (s === 2) shade = `<path class="shade" d="M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} Z"/>`;
        if (s === 3) shade = `<circle class="shade" cx="${cx}" cy="${cy}" r="${r}"/>`;
        return `<circle class="bg" cx="${cx}" cy="${cy}" r="${r}"/>${shade}<path class="s1" d="M${cx - r} ${cy} H${cx + r} M${cx} ${cy - r} V${cy + r}"/><circle class="s" cx="${cx}" cy="${cy}" r="${r}"/>`;
      }).join('') + '<text x="36" y="62" text-anchor="middle">左眼</text><text x="84" y="62" text-anchor="middle">右眼</text>');
    },
    face(s) {
      const browR = s === 3 ? 'M64 21 Q70 21.5 76 25' : 'M64 19 Q70 16.5 76 19.5';
      const eyeR = s === 3 ? '<circle class="f" cx="70" cy="28.5" r="2.4"/>' : '<circle class="f" cx="70" cy="26" r="2.4"/>';
      const foldR = s === 0 ? '<path class="s" d="M73 35 Q77 40 75 46" style="stroke-width:1.6"/>' : s === 1 ? '<path class="s1" d="M73 36 Q75 38.5 74.6 41"/>' : '';
      const mouth = s === 0 ? 'M47 44 Q60 51.5 73 44' : s === 1 ? 'M47 44 Q60 51.5 73 47' : 'M47 44 Q57 51.5 73 51.5';
      return svg(
        '<circle class="bg" cx="60" cy="32" r="27"/>' +
        '<path class="s" d="M44 19.5 Q50 16.5 56 19"/>' + `<path class="s" d="${browR}"/>` +
        '<circle class="f" cx="50" cy="26" r="2.4"/>' + eyeR +
        '<path class="s1" d="M60 27 L58 36 H62"/>' +
        '<path class="s" d="M47 35 Q43 40 45 46" style="stroke-width:1.6"/>' + foldR +
        `<path class="${s === 0 ? 's' : 'a'}" d="${mouth}"/>`
      );
    },
    arm(s) {
      if (s === 'UN') return un('截肢／關節融合');
      const angle = [0, 16, 23.5, 23.5, 23.5][s];
      const L = 78, sx = 16, sy = 22;
      const ex = sx + L * Math.cos(angle * Math.PI / 180), ey = sy + L * Math.sin(angle * Math.PI / 180);
      let extra = '';
      if (s === 0) extra = '<text x="56" y="13" text-anchor="middle" class="tb" style="font-family:var(--f-mono)">10 s</text>' + ok(106, 20);
      if (s === 1) extra = '<path class="s1" d="M100 23 Q104 31 99 39 m-1 -6 l1 6 l5 -3"/>';
      if (s === 2) extra = arrowUp(ex + 9, ey - 2, ey - 16);
      if (s === 3) extra = arrowDown(104, 14, 44, 's');
      if (s === 4) extra = nil(106, 40);
      return svg(
        '<path class="s1" d="M6 56 H114"/>' +
        '<circle class="s" cx="16" cy="11" r="6"/><path class="s" d="M16 17 V54"/>' +
        (s > 0 ? `<path class="dash" d="M${sx} ${sy} H${sx + L}"/>` : '') +
        `<path class="a" d="M${sx} ${sy} L${ex.toFixed(1)} ${ey.toFixed(1)}"/><circle class="af" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.2"/>` + extra
      );
    },
    leg(s) {
      if (s === 'UN') return un('截肢／關節融合');
      const angle = [30, 14, 0, 0, 0][s];
      const L = 64, hx = 44, hy = 48;
      const ex = hx + L * Math.cos(angle * Math.PI / 180), ey = hy - L * Math.sin(angle * Math.PI / 180);
      const gx = hx + L * Math.cos(Math.PI / 6), gy = hy - L * Math.sin(Math.PI / 6);
      let extra = '';
      if (s === 0) extra = '<text x="100" y="40" text-anchor="middle" class="tb" style="font-family:var(--f-mono)">5 s</text>' + ok(104, 50);
      if (s === 1) extra = '<path class="s1" d="M106 20 Q111 26 108 33 m-1.5 -5.5 l1.5 5.5 l4.5 -3.5"/>';
      if (s === 2) extra = arrowUp(100, 42, 26);
      if (s === 3) extra = arrowDown(100, 18, 40, 's');
      if (s === 4) extra = nil(100, 32);
      return svg(
        '<path class="s1" d="M4 56 H116"/>' +
        '<circle class="s" cx="12" cy="46" r="6"/><path class="s" d="M18 48 H44"/>' +
        (s > 0 ? `<path class="dash" d="M${hx} ${hy} L${gx.toFixed(1)} ${gy.toFixed(1)}"/>` : '') +
        `<path class="a" d="M${hx} ${hy} L${ex.toFixed(1)} ${ey.toFixed(1)}"/><circle class="af" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.2"/>` + extra
      );
    },
    body({ hl = [], half = 0 } = {}) {
      const parts = '<circle class="bg" cx="60" cy="12" r="7"/>' +
        '<rect class="bg" x="51.5" y="21" width="17" height="22" rx="3"/>' +
        '<rect class="bg" x="42" y="22" width="7.5" height="22" rx="3.5"/><rect class="bg" x="70.5" y="22" width="7.5" height="22" rx="3.5"/>' +
        '<rect class="bg" x="52" y="44" width="7.5" height="18" rx="3.5"/><rect class="bg" x="60.5" y="44" width="7.5" height="18" rx="3.5"/>';
      let over = '';
      if (half) {
        const c = half === 1 ? 'shade2' : 'shade3';
        over = `<path class="${c}" d="M60 5 A7 7 0 0 1 60 19 Z"/><rect class="${c}" x="60" y="21" width="8.5" height="22"/><rect class="${c}" x="70.5" y="22" width="7.5" height="22" rx="3.5"/><rect class="${c}" x="60.5" y="44" width="7.5" height="18" rx="3.5"/>`;
      }
      if (hl.includes('armR')) over += '<rect class="shade3" x="70.5" y="22" width="7.5" height="22" rx="3.5"/><path class="a" d="M84 33 q2 -3.5 4 0 t4 0 t4 0"/>';
      if (hl.includes('legR')) over += '<rect class="shade3" x="60.5" y="44" width="7.5" height="18" rx="3.5"/><path class="a" d="M74 55 q2 -3.5 4 0 t4 0 t4 0"/>';
      return svg(parts + over);
    },
    ataxia(s) {
      if (s === 'UN') return un('截肢／關節融合');
      return FIG.body({ hl: s === 0 ? [] : s === 1 ? ['armR'] : ['armR', 'legR'] });
    },
    sensory(s) { return FIG.body({ half: s }); },
    language(s) {
      const bubble = '<path class="bg" d="M20 6 H100 Q106 6 106 12 V40 Q106 46 100 46 H46 L32 58 L35 46 H20 Q14 46 14 40 V12 Q14 6 20 6 Z"/>';
      let inner = '';
      if (s === 0) inner = '<path class="s" d="M26 17 H94 M26 26 H90 M26 35 H76"/>';
      if (s === 1) inner = '<path class="s" style="stroke-dasharray:14 6" d="M26 17 H94 M26 26 H90 M26 35 H76"/>';
      if (s === 2) inner = '<path class="s" d="M28 18 H38 M54 26 H60 M72 34 H82"/>';
      if (s === 3) inner = cross(60, 26, 8);
      return svg(bubble + inner);
    },
    dysarthria(s) {
      if (s === 'UN') return svg('<path class="s" d="M28 8 Q28 46 58 46 H108" style="stroke-width:5"/><path class="bg" d="M28 8 Q28 46 58 46 H108" style="stroke-width:1;fill:none"/><ellipse class="s" cx="66" cy="46" rx="5" ry="9"/><text x="60" y="22" class="tb" style="font-family:var(--f-mono);font-size:15px">UN</text>');
      let seed = 7;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
      let d = '';
      for (let x = 12; x <= 108; x += 1.5) {
        let y;
        if (s === 0) y = 32 + 13 * Math.sin((x - 12) / 96 * Math.PI * 8);
        else if (s === 1) y = 32 + 12 * (0.5 + 0.5 * Math.abs(Math.sin(x * 0.07))) * Math.sin((x - 12) / 96 * Math.PI * 8) + rnd() * 5;
        else y = 32 + 4 * Math.sin(x * 0.5) + rnd() * 14;
        d += (d ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      return svg(`<path class="s1" d="M8 32 H112"/><path class="${s === 0 ? 's' : 'a'}" d="${d}"/>`);
    },
    extinction(s) {
      const rows = [{ y: 20, label: '觸覺' }, { y: 46, label: '視覺' }];
      return svg(rows.map((r, i) => {
        const gone = (s === 1 && i === 0) || s === 2;
        return `<text x="8" y="${r.y + 4}" class="tb" style="font-size:10px">${r.label}</text>` +
          `<circle class="af" cx="56" cy="${r.y}" r="7"/>` +
          `<path class="s1" d="M66 ${r.y} H84"/>` +
          (gone ? `<circle class="dash" cx="96" cy="${r.y}" r="7"/>` : `<circle class="af" cx="96" cy="${r.y}" r="7"/>`);
      }).join(''));
    }
  };

  /* 命名圖卡（自繪線條） */
  const NAMING = {
    key: '<circle class="bg" cx="28" cy="50" r="15"/><circle class="s" cx="28" cy="50" r="5"/><path class="s" d="M43 50 H88 M76 50 v11 M84 50 v8"/>',
    glove: '<rect class="bg" x="32" y="18" width="9" height="34" rx="4.5"/><rect class="bg" x="42" y="12" width="9" height="40" rx="4.5"/><rect class="bg" x="52" y="15" width="9" height="37" rx="4.5"/><rect class="bg" x="62" y="22" width="8" height="30" rx="4"/><path class="bg" d="M32 46 Q22 42 18 32 Q17 27 22 27 Q28 28 33 38"/><rect class="bg" x="31" y="38" width="40" height="34" rx="7"/><rect class="bg" x="31" y="72" width="40" height="16" rx="3"/><path class="s1" d="M31 79 H71"/>',
    cactus: '<rect class="bg" x="43" y="14" width="15" height="58" rx="7.5"/><path class="bg" d="M43 52 H35 Q30 52 30 47 V32 Q30 27 35 27 Q39 27 39 32 V44 H43"/><path class="bg" d="M58 44 H65 V26 Q65 21 69.5 21 Q74 21 74 26 V42 Q74 50 66 50 H58"/><path class="bg" d="M30 72 H70 L65 90 H35 Z"/><path class="s1" d="M48 24 v4 M53 34 v4 M48 46 v4 M53 58 v4"/>',
    chair: '<rect class="bg" x="30" y="10" width="38" height="42" rx="4"/><path class="s1" d="M37 18 H61 M37 26 H61"/><path class="bg" d="M25 52 H72 L79 62 H32 Z"/><path class="s" d="M32 62 V90 M79 62 V90 M27 56 V84 M72 56 V80"/>',
    hammock: '<path class="s" d="M12 18 V90 M88 18 V90 M4 90 H96"/><path class="s1" d="M12 30 L25 52 M88 30 L75 52"/><path class="bg" d="M25 52 Q50 80 75 52 Q50 66 25 52 Z"/>',
    feather: '<path class="bg" d="M84 10 Q94 40 60 70 Q44 80 30 78 Q30 58 50 38 Q66 20 84 10 Z"/><path class="s" d="M18 90 Q52 50 84 10"/><path class="s1" d="M44 59 L36 52 M52 50 L44 42 M60 41 L53 32 M50 61 L58 66 M58 51 L68 55 M66 41 L76 43"/>'
  };

  /* ==========================================================
     資料整理
     ========================================================== */
  const ITEMS = D.items.map((it) => {
    if (!it.sameAs) return it;
    const src = D.items.find((x) => x.id === it.sameAs);
    return { ...src, ...it, options: it.options || src.options, hint: it.hint || src.hint };
  });
  const IDS = ITEMS.map((i) => i.id);
  let scores = {};
  let fmt = NA.store.get('nihss-fmt', 'compact');

  const total = () => IDS.reduce((sum, id) => sum + (typeof scores[id] === 'number' ? scores[id] : 0), 0);
  const scoredCount = () => IDS.filter((id) => scores[id] != null).length;
  const severity = (t) => D.severity.find((s) => t <= s.max) || D.severity[D.severity.length - 1];

  /* ==========================================================
     畫面
     ========================================================== */
  function renderItems() {
    $('items').innerHTML = ITEMS.map((it) => {
      const figFn = it.fig && FIG[it.fig];
      const stim = (it.stimuli || []).map((k) => `<button type="button" class="btn small" data-stim="${k}">${esc(D.stimuli[k].title)}</button>`).join('');
      const unOpt = it.options.find((o) => o.s === 'UN');
      return `<section class="card item" id="item-${it.id}" data-id="${it.id}">
        <div class="item-head">
          <span class="code mono">${esc(it.id)}</span>
          <div class="ttl"><h2>${esc(it.title)}</h2><span>${esc(it.en)}</span></div>
          <span class="item-score mono" id="sc-${it.id}" aria-live="polite">–</span>
        </div>
        ${it.hint || stim ? `<details class="disclose item-hint"><summary>施測說明</summary><div class="hint-body"><p>${esc(it.hint || '')}</p>${stim ? `<div class="btn-row">${stim}</div>` : ''}</div></details>` : ''}
        <div class="opts" role="radiogroup" aria-label="${esc(it.id + ' ' + it.title)}">
          ${it.options.filter((o) => o.s !== 'UN').map((o) => `<button type="button" class="opt" role="radio" aria-checked="false" data-id="${it.id}" data-v="${o.s}">
            <span class="opt-s mono">${o.s}</span>
            ${figFn ? `<span class="opt-fig">${figFn(o.s, it.figArg)}</span>` : ''}
            <span class="opt-t">${esc(o.t)}</span>
          </button>`).join('')}
          ${unOpt ? `<button type="button" class="opt un" role="radio" aria-checked="false" data-id="${it.id}" data-v="UN"><span class="opt-s mono">UN</span><span class="opt-t">${esc(unOpt.t)}</span></button>` : ''}
        </div>
        ${it.id === '1a' ? '<div class="coma-note" id="coma-note" hidden></div>' : ''}
      </section>`;
    }).join('');
  }

  function renderGrid() {
    $('grid').innerHTML = ITEMS.map((it) => {
      const v = scores[it.id];
      return `<button type="button" class="cell${v == null ? ' empty' : ''}" data-jump="${it.id}" title="${esc(it.title)}"><span>${esc(it.id)}</span><b class="mono">${v == null ? '–' : v}</b></button>`;
    }).join('');
  }

  function itemLine(it, v, detailed) {
    const side = /— Left/.test(it.en) ? '(L)' : /— Right/.test(it.en) ? '(R)' : '';
    if (!detailed) return `${it.id}${side} ${v == null ? '–' : v}`;
    const opt = it.options.find((o) => String(o.s) === String(v));
    return `${it.id}. ${it.chart}: ${v == null ? '–' : v}${opt ? ` (${opt.en})` : ''}`;
  }

  function buildOutput() {
    const t = total();
    const n = scoredCount();
    const sev = severity(t);
    const when = $('when').value ? NA.fmtDate(new Date($('when').value)) : '';
    const label = $('label').value.trim();
    const meta = [when, label].filter(Boolean).join(', ');
    const missing = IDS.length - n;
    const inc = missing ? ` (incomplete: ${missing} item${missing > 1 ? 's' : ''} not scored)` : '';
    if (fmt === 'detailed') {
      return [`NIHSS total: ${t} — ${sev.en}${inc}${meta ? ` [${meta}]` : ''}`]
        .concat(ITEMS.map((it) => itemLine(it, scores[it.id], true))).join('\n');
    }
    return `NIHSS ${t}${inc}${meta ? ` [${meta}]` : ''}\n` + ITEMS.map((it) => itemLine(it, scores[it.id], false)).join(' | ');
  }

  function update() {
    ITEMS.forEach((it) => {
      const v = scores[it.id];
      document.querySelectorAll(`.opt[data-id="${it.id}"]`).forEach((b) => b.setAttribute('aria-checked', String(String(b.dataset.v) === String(v) && v != null)));
      const sc = $('sc-' + it.id);
      sc.textContent = v == null ? '–' : v;
      sc.classList.toggle('set', v != null);
    });
    const t = total(), n = scoredCount(), sev = severity(t);
    $('total').textContent = t;
    $('m-total').textContent = t;
    const chip = n ? `<span class="chip ${sev.tone}">${esc(sev.label)}</span>` : '<span class="chip">未評估</span>';
    $('sev').innerHTML = chip;
    $('m-sev').innerHTML = chip;
    $('progress').textContent = `已評 ${n} / ${IDS.length} 項`;
    $('m-progress').textContent = `${n}/${IDS.length}`;
    $('bar').style.width = (n / IDS.length * 100) + '%';
    renderGrid();
    const coma = scores['1a'] === 3;
    const note = $('coma-note');
    note.hidden = !coma;
    if (coma) {
      const pairs = IDS.filter((id) => id in D.comaDefaults).map((id) => [id, D.comaDefaults[id]]);
      const pending = pairs.filter(([k, v]) => scores[k] !== v);
      note.innerHTML = `<span>1a = 3：NIHSS 說明中，${pairs.map(([k, v]) => `${k} = ${v}`).join('、')}。</span>` +
        (pending.length ? '<button type="button" class="btn small" id="apply-coma">套用這些分數</button>' : '<span class="chip ok">已套用</span>');
    }
    $('out').value = buildOutput();
  }

  function setScore(id, v, fromClick) {
    const wasEmpty = scores[id] == null;
    if (scores[id] != null && String(scores[id]) === String(v) && fromClick) delete scores[id];
    else scores[id] = v === 'UN' ? 'UN' : Number(v);
    update();
    if (fromClick && wasEmpty && scores[id] != null && $('auto').checked) {
      const next = ITEMS.slice(IDS.indexOf(id) + 1).find((it) => scores[it.id] == null);
      if (next) {
        const el = $('item-' + next.id);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(() => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 120);
      }
    }
  }

  /* ---------- 紀錄（本機） ---------- */
  const HKEY = 'nihss-history';
  function renderHistory() {
    const list = NA.store.get(HKEY, []);
    $('hist').innerHTML = list.length ? list.map((r) => `<li>
        <div><b class="mono">${r.total}</b><span>${esc(NA.fmtDate(r.t))}${r.label ? '・' + esc(r.label) : ''}${r.complete ? '' : '・未完成'}</span></div>
        <div class="btn-row"><button type="button" class="btn small ghost" data-load="${r.id}">載入</button><button type="button" class="btn small ghost danger" data-del="${r.id}">刪除</button></div>
      </li>`).join('') : '<li class="empty">尚無紀錄。按「儲存」會存在這台裝置的瀏覽器中。</li>';
  }
  function saveRecord() {
    if (!scoredCount()) { NA.toast('還沒有任何評分'); return; }
    const list = NA.store.get(HKEY, []);
    const t = $('when').value ? new Date($('when').value) : new Date();
    list.unshift({ id: Date.now(), t: t.toISOString(), label: $('label').value.trim(), scores: { ...scores }, total: total(), complete: scoredCount() === IDS.length });
    NA.store.set(HKEY, list.slice(0, 30));
    renderHistory();
    NA.toast('已儲存');
  }

  /* ---------- 刺激圖卡 ---------- */
  function openStim(kind) {
    const dlg = $('stim');
    const S = D.stimuli;
    const tabs = Object.keys(S);
    const show = (k) => {
      dlg.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === k)));
      const s = S[k];
      let body = `<p class="note">${esc(s.note || '')}</p>`;
      if (s.lines) body += `<ol class="stim-lines${k === 'words' ? ' words' : ''}">${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`;
      if (s.items) body += `<div class="naming">${s.items.map((it) => `<figure>${NAMING[it.id] ? svg(NAMING[it.id], '0 0 100 100') : ''}<figcaption><span class="ans">${esc(it.zh)} ${esc(it.en)}</span></figcaption></figure>`).join('')}</div>
        <label class="check" style="margin-top:12px"><input type="checkbox" id="show-ans"> 顯示答案</label>`;
      $('stim-body').innerHTML = body;
      const sa = $('show-ans');
      if (sa) sa.addEventListener('change', () => $('stim-body').classList.toggle('reveal', sa.checked));
    };
    $('stim-tabs').innerHTML = tabs.map((k) => `<button type="button" data-tab="${k}">${esc(S[k].title)}</button>`).join('');
    $('stim-tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); };
    show(kind && S[kind] ? kind : tabs[0]);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  /* ==========================================================
     事件
     ========================================================== */
  renderItems();
  $('when').value = NA.localInputValue();
  $('auto').checked = NA.store.get('nihss-auto', true);
  document.querySelectorAll('#fmt [data-fmt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === fmt)));

  $('items').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (b) { setScore(b.dataset.id, b.dataset.v, true); return; }
    const s = e.target.closest('[data-stim]');
    if (s) { openStim(s.dataset.stim); return; }
    if (e.target.id === 'apply-coma') {
      Object.entries(D.comaDefaults).forEach(([k, v]) => { scores[k] = v; });
      update();
      NA.toast('已套用昏迷預設分數');
    }
  });
  $('items').addEventListener('keydown', (e) => {
    const b = e.target.closest('.opt');
    if (!b || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const sib = Array.from(b.parentElement.children);
    const i = sib.indexOf(b) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    if (sib[i]) { e.preventDefault(); sib[i].focus(); }
  });
  $('grid').addEventListener('click', (e) => {
    const c = e.target.closest('[data-jump]');
    if (c) $('item-' + c.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('fmt').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]');
    if (!b) return;
    fmt = b.dataset.fmt;
    NA.store.set('nihss-fmt', fmt);
    document.querySelectorAll('#fmt [data-fmt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  });
  ['when', 'label'].forEach((id) => $(id).addEventListener('input', update));
  $('auto').addEventListener('change', () => NA.store.set('nihss-auto', $('auto').checked));
  $('copy').addEventListener('click', () => NA.copy($('out').value, $('out')));
  $('m-copy').addEventListener('click', () => NA.copy($('out').value, $('out')));
  $('save').addEventListener('click', saveRecord);
  let resetArmed = null;
  $('reset').addEventListener('click', () => {
    const b = $('reset');
    if (!resetArmed) {
      b.textContent = '再按一次確認';
      resetArmed = setTimeout(() => { b.textContent = '重設'; resetArmed = null; }, 3000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null; b.textContent = '重設';
    scores = {};
    $('label').value = '';
    $('when').value = NA.localInputValue();
    update();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('hist').addEventListener('click', (e) => {
    const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
    const list = NA.store.get(HKEY, []);
    if (l) {
      const r = list.find((x) => String(x.id) === l.dataset.load);
      if (!r) return;
      scores = { ...r.scores };
      $('label').value = r.label || '';
      $('when').value = NA.localInputValue(new Date(r.t));
      update();
      NA.toast('已載入紀錄');
    }
    if (d) {
      NA.store.set(HKEY, list.filter((x) => String(x.id) !== d.dataset.del));
      renderHistory();
      NA.toast('已刪除');
    }
  });
  document.querySelectorAll('[data-open-stim]').forEach((b) => b.addEventListener('click', () => openStim()));
  $('stim-close').addEventListener('click', () => $('stim').close ? $('stim').close() : $('stim').removeAttribute('open'));
  $('m-sum').addEventListener('click', () => $('summary').scrollIntoView({ behavior: 'smooth', block: 'start' }));

  update();
  renderHistory();
})();
