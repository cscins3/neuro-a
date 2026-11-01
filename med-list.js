/*
 * 跨院所用藥整理
 * ------------------------------------------------------------
 * 規則式解析：藥名、劑量、頻次、院所。
 * 想加新的頻次寫法、單位或院所關鍵字，改下面的 FB / CFREQ_RE / UNIT / INST_KW。
 * 範例清單在 SAMPLE。
 */
(function () {
const UNK = '未註明院所';
const SAMPLE = [
  '衛生福利部臺中醫院',
  'Donepezil 5mg 1# HS',
  'Memantine 10mg 1# BID',
  'Clopidogrel 75mg QD',
  '',
  '中國附醫：Amlodipine 5mg QD、Atorvastatin 20mg 1# HS、Metformin 500mg 1# BID PC',
  'Aspirin 100mg QD 澄清醫院',
  'Lorazepam 0.5mg 1# HS PRN 仁愛診所',
  'Atorvastatin 40mg QD x28天 健康藥局'
].join('\n');

/* ---------- token patterns ---------- */
const toHalf = s => s.replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\u3000/g, ' ');
const UNIT = '(?:mg|mcg|µg|μg|ug|ng|gm|g|ml|cc|iu|u|units?|meq|mmol|tabs?|tablets?|caps?|capsules?|#|顆|粒|錠|包|片|支|滴|瓶|劑|匙|管|袋|貼片|貼|puffs?|inh|gtts?|drops?|amps?|ampoules?|vials?|pcs?|packs?|sachets?|patch(?:es)?|%)';
const NUMS = '(?:\\d+(?:\\.\\d+)?(?:\\/\\d+(?:\\.\\d+)?)?(?:\\s*[-~]\\s*\\d+(?:\\.\\d+)?)?|\\d*\\s*[½¼¾]|[一二兩三四五六七八九十半]+)';
const DOSE_RE = new RegExp('^' + NUMS + '\\s*' + UNIT + '(?:\\s*\\/\\s*(?:' + NUMS + '\\s*)?(?:' + UNIT + '|day|d|dose|kg|hr?|次|日|天))?$', 'i');
const UNIT_ONLY_RE = new RegExp('^' + UNIT + '$', 'i');
const FB = '(?:Q\\d+(?:\\.\\d+)?(?:-\\d+)?\\s*(?:H|HR|HRS|D|W|WK|M|MIN)|QD|QOD|QAM|QPM|QN|QHS|QW|QWK|QM|BIW|TIW|BID|TID|QID|HS|AC|PC|CC|PRN|STAT|ST|ONCE|TWICE|DAILY|QDAY|NOON|AM|PM|BEDTIME|WEEKLY)';
const FREQ_RE = new RegExp('^' + FB + '(?:\\s*[+&/.]?\\s*' + FB + ')*$', 'i');
const CFREQ_RE = /^(?:每[日天週周月晚早隔]|一[天日週周]|[一二兩三四五六七1-7]?[天日週周]?[一二兩三四五六1-6]次|早晚|早午晚|早中晚|早上|晚上|中午|睡前|飯前|飯後|餐前|餐後|三餐|需要時|必要時|疼痛時|不適時|發作時|隔[日天]|立即|頓服|空腹)/;
const DUR_RE = /^(?:(?:[x×*]\s*)?(?:\d+|[一二兩三四五六七八九十]+)\s*(?:天|日|days?|d|週|周|wks?|w|個月|月)(?:份|量)?|[x×*]\s*\d+)$/i;
const ROUTE_RE = /^(?:PO|IV|IM|SC|SQ|SL|IH|INH|TOP|TOPICAL|EXT|OU|OD|OS|AU|PR|NG|IVD|IVP|IVF|TD|口服|外用|吸入|舌下|舌下含|皮下|皮下注射|肌肉注射|肌注|靜脈注射|靜注|點眼|眼用|鼻用|外敷|塞劑|肛塞|含服|貼)$/i;
const INST_KW = /(醫院|醫學中心|診所|藥局|藥房|衛生所|分院|院區|醫療中心|健康中心|健康服務中心|門診|醫務室|護理之家|安養|長照|榮總|附醫|長庚|慈濟|馬偕|彰基|秀傳|童綜合|澄清|光田|林新|亞大|中榮|北榮|高榮|部立|署立|國泰|亞東|奇美|義大|聖馬爾定|臺大|台大|成大|北醫|萬芳|雙和|新光|振興)/;
const INST_EN = /^(?:hospital|clinic|pharmacy|center|centre|vgh|tcvgh|tvgh|ntuh|cmuh|csmuh|cch)$/i;
const JUNK_RE = /^(?:rx|rp|℞|sig|處方|處方箋|用藥|藥物|藥品)$/i;
const RANK = {none: 0, tab: 1, soft: 2, hard: 3};

function isInst(t) {
  if (t.length > 40) return false;
  return INST_KW.test(t) || INST_EN.test(t) || /(?:^|[^a-z])(?:hospital|clinic|pharmacy)$/i.test(t);
}

function classify(t) {
  if (/^\d{6,}$/.test(t) || JUNK_RE.test(t)) return 'junk';
  if (DUR_RE.test(t)) return 'dur';
  if (DOSE_RE.test(t)) return 'dose';
  if (FREQ_RE.test(t)) return 'freq';
  if (ROUTE_RE.test(t)) return 'route';
  if (isInst(t)) return 'inst';
  if (CFREQ_RE.test(t)) return 'freq';
  if (/^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.test(t)) return 'num';
  if (/[A-Za-z\u4e00-\u9fff]/.test(t)) return 'name';
  return 'junk';
}

function prep(line) {
  let s = toHalf(line);
  s = s.replace(/^\s*(?:\d{1,3}[.)、](?!\d)|[-*•●・‧]|\(\d{1,3}\))\s*/, '');
  s = s.replace(/([;,、])\s*(?:\d{1,3}[.)](?!\d)|\(\d{1,3}\))\s*/g, '$1 ');
  s = s.replace(/[【】\[\]「」『』〔〕《》<>(){}]/g, ' ');
  s = s.replace(/([A-Za-z]{3,})(?=\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g))/gi, '$1 ');
  s = s.replace(/([\u4e00-\u9fff])(?=\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|#|顆|粒|錠|包|片|tab|cap))/gi, '$1 ');
  s = s.replace(/((?:\d|[一二兩三四半])\s*(?:顆|粒|錠|包|片|支|滴|匙))(?=[\u4e00-\u9fff])/g, '$1 ');
  s = s.replace(/(\d(?:\.\d+)?\s*(?:mg|mcg|ml|g|tabs?|caps?|#))(?=(?:QD|QOD|QN|QHS|QW|QAM|QPM|Q\d|BID|TID|QID|HS|PRN|STAT|AC|PC))/gi, '$1 ');
  s = s.replace(/#(?=[A-Za-z])/g, '# ');
  s = s.replace(/\b(QD|QOD|QN|QHS|BID|TID|QID|HS|PRN|AC|PC)(?=[\dx×*])/gi, '$1 ');
  s = s.replace(/([\u4e00-\u9fff])(?=[A-Za-z])/g, '$1 ').replace(/([A-Za-z#%])(?=[\u4e00-\u9fff])/g, '$1 ');
  return s;
}

function tokenize(line) {
  const parts = prep(line).split(/(\t|[,;、|:]|[ \u00a0\f\v]+)/);
  const out = [];
  let brk = 'none';
  const bump = b => { if (RANK[b] > RANK[brk]) brk = b; };
  for (const p of parts) {
    if (!p) continue;
    if (p === '\t') { bump('tab'); continue; }
    if (/^[ \u00a0\f\v]+$/.test(p)) continue;
    if (p === ';') { bump('hard'); continue; }
    if (/^[,、|:]$/.test(p)) { bump('soft'); continue; }
    const t = p.replace(/^[-–—~.@/\\=_]+|[-–—~.@/\\=_]+$/g, '');
    if (!t) { bump('soft'); continue; }
    out.push({t, brk});
    brk = 'none';
  }
  for (let i = 0; i < out.length - 1; i++) {
    if (/^(?:\d+(?:\.\d+)?(?:\/\d+)?|[一二兩三四半]+)$/.test(out[i].t) && out[i + 1].brk === 'none' && UNIT_ONLY_RE.test(out[i + 1].t)) {
      const u = out[i + 1].t;
      out[i].t += (/^[#%]$/.test(u) || /[\u4e00-\u9fff]/.test(u)) ? u : ' ' + u;
      out.splice(i + 1, 1);
    }
  }
  return out.map(o => ({...o, c: classify(o.t)}));
}

/* pull "衛生福利部 臺中醫院" / "Taichung Veterans General Hospital" into one institution token */
function mergeInst(toks) {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].c !== 'inst') continue;
    const cjk = /[\u4e00-\u9fff]/.test(toks[i].t);
    let j = i - 1;
    while (j >= 0 && toks[j + 1].brk === 'none' && toks[j].c === 'name' &&
      (cjk ? /^[\u4e00-\u9fff·]+$/.test(toks[j].t) : /^[A-Z][A-Za-z.'&-]*$/.test(toks[j].t))) j--;
    if (j < i - 1) {
      const parts = toks.slice(j + 1, i + 1);
      toks.splice(j + 1, i - j, {t: parts.map(p => p.t).join(cjk ? '' : ' '), brk: parts[0].brk, c: 'inst'});
      i = j + 1;
    }
  }
  return toks;
}

const cleanInst = t => t.replace(/\s*\d{6,}\s*$/, '').replace(/^[\s:\-–—]+|[\s:\-–—]+$/g, '').trim();
const upLatin = t => /^[\x20-\x7e]+$/.test(t) ? t.toUpperCase() : t;

function finalize(items) {
  let di = -1;
  for (let i = items.length - 1; i >= 0; i--) if (items[i].c === 'dose') { di = i; break; }
  if (di < 0) for (let i = items.length - 1; i > 0; i--) if (items[i].c === 'num') { di = i; break; }
  return {
    name: items.filter((x, i) => i !== di && (x.c === 'name' || x.c === 'num' || x.c === 'dose')).map(x => x.t).join(' '),
    dose: di >= 0 ? items[di].t : '',
    freq: items.filter(x => x.c === 'freq' || x.c === 'route').map(x => upLatin(x.t)).join(' ')
  };
}

function parseLine(line, ctx) {
  const isTab = line.includes('\t');
  const toks = mergeInst(tokenize(line));
  const recs = [];
  let cur = null, linePrefix = '';
  const has = r => r.n || r.d || r.f;
  const open = () => { cur = {items: [], own: '', prefix: ctx.sticky, linePrefix, n: false, d: false, f: false}; };
  const close = () => { if (cur && has(cur)) recs.push(cur); cur = null; };
  for (const tk of toks) {
    if (tk.c === 'junk' || tk.c === 'dur') continue;
    if (tk.c === 'inst') {
      const name = cleanInst(tk.t);
      if (!name) continue;
      if (!cur || !has(cur)) {
        ctx.sticky = name; linePrefix = name;
        if (cur) { cur.prefix = name; cur.linePrefix = name; }
      } else if (!cur.own) cur.own = name;
      else { close(); ctx.sticky = name; linePrefix = name; }
      continue;
    }
    if (cur && tk.brk === 'hard' && has(cur)) close();
    if (cur && tk.c === 'name' && !isTab && (cur.f || cur.own || (tk.brk === 'soft' && cur.n))) close();
    if (!cur) open();
    cur.items.push(tk);
    if (tk.c === 'name') cur.n = true;
    else if (tk.c === 'dose') cur.d = true;
    else if (tk.c === 'freq') cur.f = true;
  }
  close();
  return recs.map((r, i) => {
    let inst = r.own || r.linePrefix;
    if (!inst) { const nx = recs.slice(i + 1).find(x => x.own); if (nx) inst = nx.own; }
    if (!inst) inst = r.prefix || '';
    return {...finalize(r.items), inst, src: line.trim()};
  });
}

/* header row from Excel / 雲端藥歷 */
const HDR = {
  name: /藥名|品名|商品名|^藥品$|^drugs?$|^drug ?name|medication|medicine/i,
  dose: /劑量|每次|單次|^用量$|^dose|^dosage$/i,
  freq: /頻次|頻率|用法|^freq|^sig$/i,
  inst: /院所|醫院|藥局|來源|機構|^hospital|^clinic|^pharmacy|^source$|^facility/i
};
function detectHeader(line) {
  const tab = line.includes('\t');
  const cells = (tab ? line.split('\t') : toHalf(line).split(/[,，、|]|\s+/)).map(c => c.trim());
  if (cells.some(c => c && ['dose', 'freq'].includes(classify(c)))) return null;
  const map = {};
  let hits = 0;
  cells.forEach((c, i) => {
    if (!c) return;
    for (const k of ['name', 'dose', 'freq', 'inst']) if (map[k] == null && HDR[k].test(c)) { map[k] = i; hits++; break; }
  });
  if (map.name == null) cells.forEach((c, i) => { if (map.name == null && /成分|學名|generic/i.test(c)) { map.name = i; hits++; } });
  return hits >= 2 ? {map, tab} : null;
}

function parseCols(line, map, ctx) {
  const cells = line.split('\t').map(c => toHalf(c).trim());
  const get = k => map[k] != null ? (cells[map[k]] || '') : '';
  let name = get('name'), dose = get('dose'), freq = get('freq'), inst = cleanInst(get('inst'));
  if (inst) ctx.sticky = inst;
  if (!name && !dose && !freq) return null;
  if (!dose && freq) {
    const tk = tokenize(freq);
    const d = tk.filter(t => t.c === 'dose'), f = tk.filter(t => t.c === 'freq' || t.c === 'route');
    if (d.length && f.length) { dose = d.map(t => t.t).join(' '); freq = f.map(t => upLatin(t.t)).join(' '); }
  } else if (freq) {
    freq = tokenize(freq).map(t => (t.c === 'freq' || t.c === 'route') ? upLatin(t.t) : t.t).join(' ');
  }
  return {name, dose, freq, inst: inst || ctx.sticky || '', src: line.replace(/\t+/g, ' · ').trim()};
}

let uid = 0;
function parseAll(text) {
  const ctx = {sticky: ''};
  const rows = [];
  let col = null, first = true;
  for (const raw of String(text).split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (first) {
      first = false;
      const h = detectHeader(raw);
      if (h) { col = h.tab ? h.map : null; continue; }
    }
    if (col && raw.includes('\t')) { const r = parseCols(raw, col, ctx); if (r) rows.push(r); continue; }
    rows.push(...parseLine(raw, ctx));
  }
  return rows.map(r => ({...r, id: ++uid}));
}

/* ---------- grouping, duplicates, output ---------- */
const gk = r => (r.inst || '').trim() || UNK;
function groupRows(rows) {
  const map = new Map();
  rows.forEach(r => { const k = gk(r); if (!map.has(k)) map.set(k, []); map.get(k).push(r); });
  const keys = [...map.keys()].filter(k => k !== UNK);
  if (map.has(UNK)) keys.push(UNK);
  return keys.map(k => ({inst: k, unk: k === UNK, rows: map.get(k)}));
}

function drugKey(name) {
  const w = String(name).toLowerCase().split(/[\s/+,]+/).map(x => x.replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')).filter(Boolean);
  if (!w.length) return '';
  let k = w[0];
  if (k.length <= 3 && w[1] && !/^\d/.test(w[1])) k += ' ' + w[1];
  if (/^[a-z]/.test(k) ? k.length < 3 : k.length < 2) return '';
  return k;
}

function dupInfo(rows) {
  const m = new Map();
  rows.forEach(r => {
    const k = drugKey(r.name);
    if (!k) return;
    if (!m.has(k)) m.set(k, {label: r.name.split(/[\s/+]+/)[0], rows: []});
    m.get(k).rows.push(r);
  });
  for (const [k, v] of m) if (v.rows.length < 2) m.delete(k);
  return m;
}

function buildOutput(rows, o) {
  const sep = o.sep === 'tab' ? '\t' : o.sep === 'fw' ? '，' : ', ';
  const lines = [];
  groupRows(rows).forEach((g, gi) => {
    if (gi && o.gap) lines.push('');
    lines.push(o.head === 'quote' ? `"${g.inst}"` : o.head === 'bracket' ? `【${g.inst}】` : g.inst);
    g.rows.forEach((r, i) => {
      const f = [r.name, r.dose, r.freq].map(x => (x || '').trim());
      lines.push((o.num ? `${i + 1}. ` : '') + (o.sep === 'tab' ? f : f.filter(Boolean)).join(sep));
    });
  });
  return lines.join('\n');
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseAll, buildOutput, dupInfo, groupRows };
} else {
  /* ---------- 介面 ---------- */
  const NA = window.NeuroA;
  const $ = (id) => document.getElementById(id);
  const esc = NA.esc;
  const state = { rows: [], opts: Object.assign({ head: 'quote', sep: 'comma', num: false, gap: true }, NA.store.get('medlist-opts', {})) };
  const saveOpts = () => NA.store.set('medlist-opts', state.opts);
  const src = $('src'), out = $('out'), tb = $('tb');

  function renderTable() {
    if (!state.rows.length) {
      tb.innerHTML = '<tr class="empty"><td colspan="7">貼上藥物清單後，這裡會逐筆列出解析結果，可直接修正。</td></tr>';
      return;
    }
    tb.innerHTML = groupRows(state.rows).map((g, gi) => `
      <tr class="grp${g.unk ? ' unk' : ''}"><th colspan="7"><div class="grp-in">
        <input id="grp-${gi}" class="grp-name" data-grp="${esc(g.inst)}" value="${g.unk ? '' : esc(g.inst)}" placeholder="${g.unk ? '未註明院所：在此輸入院所名稱' : ''}" aria-label="院所名稱（整組）">
        <span class="grp-count">${g.rows.length} 筆</span></div></th></tr>
      ${g.rows.map((r, i) => `<tr data-id="${r.id}">
        <td class="idx" title="原文：${esc(r.src)}">${i + 1}</td>
        <td><input id="n-${r.id}" data-k="name" value="${esc(r.name)}" aria-label="藥名"></td>
        <td><input id="d-${r.id}" class="mono" data-k="dose" value="${esc(r.dose)}" aria-label="劑量"></td>
        <td><input id="f-${r.id}" class="mono" data-k="freq" value="${esc(r.freq)}" aria-label="頻次"></td>
        <td><input id="i-${r.id}" data-k="inst" value="${esc(r.inst)}" placeholder="${UNK}" aria-label="院所"></td>
        <td class="flags" id="fl-${r.id}"></td>
        <td class="act"><button type="button" class="del" data-del="${r.id}" aria-label="刪除這筆">×</button></td>
      </tr>`).join('')}`).join('');
  }

  function updateDerived() {
    const rows = state.rows;
    const dups = dupInfo(rows);
    let need = 0;
    rows.forEach((r) => {
      const fl = [];
      if (!r.name.trim()) fl.push(['warn', '缺藥名']);
      if (!r.dose.trim()) fl.push(['warn', '缺劑量']);
      if (!r.freq.trim()) fl.push(['warn', '缺頻次']);
      if (fl.length) need++;
      if (dups.has(drugKey(r.name))) fl.push(['crit', '重複']);
      const el = $('fl-' + r.id);
      if (el) el.innerHTML = fl.length ? fl.map(([c, t]) => `<span class="chip ${c}">${t}</span>`).join(' ') : '<span class="okmark" aria-label="完整">✓</span>';
    });
    const groups = groupRows(rows);
    const unk = groups.find((g) => g.unk);
    $('summary').innerHTML = rows.length ? [
      `<span class="chip">${groups.filter((g) => !g.unk).length} 個院所</span>`,
      `<span class="chip">${rows.length} 筆</span>`,
      need ? `<span class="chip warn">${need} 筆待確認</span>` : '',
      unk ? `<span class="chip warn">${unk.rows.length} 筆未註明院所</span>` : '',
      dups.size ? `<span class="chip crit">${dups.size} 種藥重複</span>` : ''
    ].join('') : '';
    const dn = $('dupnote');
    if (dups.size) {
      dn.innerHTML = '重複出現：' + [...dups.values()].map((v) => {
        const c = new Map();
        v.rows.forEach((r) => c.set(gk(r), (c.get(gk(r)) || 0) + 1));
        return `<b>${esc(v.label)}</b>（${[...c].map(([k, n]) => esc(k) + (n > 1 ? ` ×${n}` : '')).join('、')}）`;
      }).join('；');
      dn.hidden = false;
    } else dn.hidden = true;
    out.value = buildOutput(rows, state.opts);
    fitOut();
  }

  function fitOut() {
    out.style.height = 'auto';
    out.style.height = Math.max(out.scrollHeight + 2, src.offsetHeight) + 'px';
  }

  function reparse() {
    state.rows = parseAll(src.value);
    $('sample-tag').hidden = src.value !== SAMPLE;
    renderTable();
    updateDerived();
  }

  let timer;
  src.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reparse, 160); });
  $('btn-sample').addEventListener('click', () => { src.value = SAMPLE; reparse(); });
  $('btn-clear').addEventListener('click', () => { src.value = ''; reparse(); src.focus(); });

  tb.addEventListener('input', (e) => {
    const t = e.target;
    const tr = t.closest('tr[data-id]');
    if (!tr || !t.dataset.k) return;
    const r = state.rows.find((x) => x.id === +tr.dataset.id);
    if (r) { r[t.dataset.k] = t.value; updateDerived(); }
  });
  tb.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.k === 'inst') { renderTable(); updateDerived(); }
    else if (t.classList.contains('grp-name')) {
      const old = t.dataset.grp, nv = t.value.trim();
      state.rows.forEach((r) => { if (gk(r) === old) r.inst = nv; });
      renderTable(); updateDerived();
    }
  });
  tb.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) e.target.blur(); });
  tb.addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    state.rows = state.rows.filter((r) => r.id !== +b.dataset.del);
    renderTable(); updateDerived();
  });

  const oHead = $('o-head'), oSep = $('o-sep'), oNum = $('o-num'), oGap = $('o-gap');
  oHead.value = state.opts.head; oSep.value = state.opts.sep; oNum.checked = !!state.opts.num; oGap.checked = !!state.opts.gap;
  const syncOpts = () => {
    state.opts = { head: oHead.value, sep: oSep.value, num: oNum.checked, gap: oGap.checked };
    saveOpts(); updateDerived();
  };
  [oHead, oSep, oNum, oGap].forEach((el) => el.addEventListener('change', syncOpts));
  $('btn-copy').addEventListener('click', () => { if (out.value) NA.copy(out.value, out); });

  window.addEventListener('resize', fitOut);
  src.value = SAMPLE;
  reparse();
}
})();
