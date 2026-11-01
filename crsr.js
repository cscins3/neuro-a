/*
 * CRS-R 互動頁面
 * 內容在 crsr.data.js；這支負責階梯圖、判讀與紀錄。
 */
(function () {
  const NA = window.NeuroA;
  const D = NA.data.crsr;
  const SUBS = D.subscales;
  const $ = (id) => document.getElementById(id);
  const esc = NA.esc;
  const MAX = SUBS.reduce((a, s) => a + Math.max(...s.levels.map((l) => l.s)), 0);

  let sc = {};
  let fmt = NA.store.get('crsr-fmt', 'compact');
  const RKEY = 'crsr-records';

  const DX = {
    emcs: { label: 'eMCS', en: 'eMCS', tone: 'indigo', desc: '已脫離最小意識狀態' },
    plus: { label: 'MCS+', en: 'MCS+', tone: 'accent', desc: '最小意識狀態，有語言相關行為' },
    minus: { label: 'MCS−', en: 'MCS-', tone: 'accent', desc: '最小意識狀態，無語言相關行為' },
    uws: { label: 'UWS / VS', en: 'UWS/VS', tone: 'warn', desc: '無反應覺醒症候群／植物狀態' },
    coma: { label: 'Coma', en: 'Coma', tone: 'crit', desc: '無法喚醒，符合昏迷表現' },
    none: { label: '未完成', en: 'incomplete', tone: '', desc: '尚未評完六個子量表' }
  };
  const RANK = { none: 0, coma: 1, uws: 2, minus: 3, plus: 4, emcs: 5 };

  const levelOf = (sub, v) => sub.levels.find((l) => l.s === v);
  const totalOf = (s) => SUBS.reduce((a, sub) => a + (typeof s[sub.id] === 'number' ? s[sub.id] : 0), 0);
  const complete = (s) => SUBS.every((sub) => typeof s[sub.id] === 'number');

  function diagnose(s) {
    const t = { emcs: [], plus: [], mcs: [] };
    SUBS.forEach((sub) => {
      const v = s[sub.id];
      if (typeof v !== 'number') return;
      const lv = levelOf(sub, v);
      if (!lv) return;
      const tag = { sub, lv };
      if (lv.cat === 'emcs') t.emcs.push(tag);
      if (lv.cat === 'mcs') { t.mcs.push(tag); if (lv.plus) t.plus.push(tag); }
    });
    let key;
    if (t.emcs.length) key = 'emcs';
    else if (t.plus.length) key = 'plus';
    else if (t.mcs.length) key = 'minus';
    else if (!complete(s)) key = 'none';
    else key = s.arousal === 0 ? 'coma' : 'uws';
    const trig = key === 'emcs' ? t.emcs : key === 'plus' ? t.plus : key === 'minus' ? t.mcs : [];
    return { key, trig, all: t };
  }

  /* ---------- 階梯圖 ---------- */
  function renderLadders() {
    const showHints = $('hints').checked;
    $('ladders').innerHTML = SUBS.map((sub) => {
      const v = sc[sub.id];
      const max = Math.max(...sub.levels.map((l) => l.s));
      return `<section class="card ladder" data-sub="${sub.id}">
        <div class="ladder-head">
          <span class="lic">${NA.icon(sub.icon)}</span>
          <div class="lt"><b>${esc(sub.zh)}</b><span>${esc(sub.en)}</span></div>
          <span class="ls mono"><b>${v == null ? '–' : v}</b>/${max}</span>
        </div>
        <div class="levels" role="radiogroup" aria-label="${esc(sub.en)}">
          ${sub.levels.map((lv) => {
            const sel = v === lv.s;
            const ach = typeof v === 'number' && lv.s <= v;
            return `<button type="button" class="lv cat-${lv.cat}${sel ? ' sel' : ''}${ach ? ' ach' : ''}" role="radio" aria-checked="${sel}" data-sub="${sub.id}" data-v="${lv.s}">
              <span class="stripe"></span>
              <span class="lv-s mono">${lv.s}</span>
              <span class="lv-t"><span class="zh">${esc(lv.zh)}${lv.plus ? '<i class="plus" title="MCS+ 行為">+</i>' : ''}</span><span class="en">${esc(lv.en)}</span>${showHints && lv.hint ? `<span class="hint">${esc(lv.hint)}</span>` : ''}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`;
    }).join('');
  }

  function shortCode() { return SUBS.map((sub) => `${sub.code}${sc[sub.id] == null ? '–' : sc[sub.id]}`).join(' '); }

  function buildOutput() {
    const d = diagnose(sc);
    const t = totalOf(sc);
    const when = $('when').value ? NA.fmtDate(new Date($('when').value)) : '';
    const meta = [when, $('label').value.trim()].filter(Boolean).join(', ');
    const dxText = d.key === 'none' ? 'incomplete' : DX[d.key].en;
    const signs = d.trig.map(({ sub, lv }) => `${sub.en} ${lv.s} (${lv.en})`).join('; ');
    if (fmt === 'detailed') {
      return [`CRS-R total: ${t}/${MAX} — ${dxText}${meta ? ` [${meta}]` : ''}`]
        .concat(SUBS.map((sub) => {
          const v = sc[sub.id];
          const lv = typeof v === 'number' ? levelOf(sub, v) : null;
          return `${sub.en}: ${v == null ? '–' : v}${lv ? ` — ${lv.en}` : ''}`;
        }))
        .concat(signs ? [`Key behavior: ${signs}`] : []).join('\n');
    }
    return `CRS-R ${t}/${MAX} (${shortCode()}) — ${dxText}${meta ? ` [${meta}]` : ''}` + (signs ? `\nKey behavior: ${signs}` : '');
  }

  function update() {
    renderLadders();
    const d = diagnose(sc);
    const t = totalOf(sc);
    $('total').textContent = t;
    $('total-max').textContent = '/ ' + MAX;
    const dx = DX[d.key];
    $('dx').className = 'dx tone-' + (dx.tone || 'none');
    $('dx').innerHTML = `<b>${esc(dx.label)}</b><span>${esc(dx.desc)}</span>`;
    const n = SUBS.filter((s) => typeof sc[s.id] === 'number').length;
    $('prog').textContent = `已評 ${n} / ${SUBS.length} 個子量表`;
    $('trig').innerHTML = d.trig.length
      ? '<span class="faint">依據：</span>' + d.trig.map(({ sub, lv }) => `<span class="chip ${lv.cat === 'emcs' ? 'indigo' : 'accent'}">${esc(sub.zh)} ${lv.s}・${esc(lv.zh)}</span>`).join('')
      : (d.key === 'uws' || d.key === 'coma' ? '<span class="faint">未觀察到 MCS 指標行為。</span>' : '');
    $('out').value = buildOutput();
  }

  /* ---------- 連續紀錄 ---------- */
  const records = () => NA.store.get(RKEY, []);
  function renderRecords() {
    const all = records();
    const cs = $('case').value.trim();
    const codes = [...new Set(all.map((r) => r.case || ''))].filter(Boolean).sort();
    $('case-list').innerHTML = codes.map((c) => `<option value="${esc(c)}"></option>`).join('');
    const list = all.filter((r) => (r.case || '') === cs).sort((a, b) => new Date(a.t) - new Date(b.t));
    $('rec-count').textContent = `${list.length} 次評估`;
    if (!list.length) {
      $('rec-table').innerHTML = `<tbody><tr><td class="empty">${cs ? `個案「${esc(cs)}」` : '未填個案代號的評估'}還沒有紀錄。評完後按「儲存」，就會出現在這裡。</td></tr></tbody>`;
      $('rec-best').innerHTML = '';
      return;
    }
    const best = list.reduce((b, r) => (RANK[diagnose(r.sc).key] > RANK[diagnose(b.sc).key] ? r : b), list[0]);
    const bk = diagnose(best.sc).key;
    $('rec-best').innerHTML = `<span>累積最佳診斷</span><span class="chip ${DX[bk].tone}">${esc(DX[bk].label)}</span><span class="faint">${esc(NA.fmtDate(best.t, false))}</span>` +
      (list.length < 5 ? `<span class="chip warn">建議至少 5 次（目前 ${list.length}）</span>` : '');
    const head = `<thead><tr><th>子量表</th>${list.map((r) => `<th class="col"><span class="mono">${esc(NA.fmtDate(r.t).slice(5))}</span>${r.label ? `<small>${esc(r.label)}</small>` : ''}</th>`).join('')}</tr></thead>`;
    const rows = SUBS.map((sub) => `<tr><th>${esc(sub.zh)} <span class="faint">${esc(sub.code)}</span></th>${list.map((r) => {
      const v = r.sc[sub.id];
      const lv = typeof v === 'number' ? levelOf(sub, v) : null;
      return `<td class="num cat-${lv ? lv.cat : 'none'}">${v == null ? '–' : v}</td>`;
    }).join('')}</tr>`).join('');
    const tot = `<tr class="tot"><th>總分</th>${list.map((r) => `<td class="num">${totalOf(r.sc)}</td>`).join('')}</tr>`;
    const dxr = `<tr><th>診斷</th>${list.map((r) => { const k = diagnose(r.sc).key; return `<td><span class="chip ${DX[k].tone}">${esc(DX[k].label)}</span></td>`; }).join('')}</tr>`;
    const act = `<tr class="act"><th></th>${list.map((r) => `<td><button type="button" class="btn small ghost" data-load="${r.id}">載入</button><button type="button" class="btn small ghost danger" data-del="${r.id}">刪除</button></td>`).join('')}</tr>`;
    $('rec-table').innerHTML = head + `<tbody>${rows}${tot}${dxr}${act}</tbody>`;
  }

  function save() {
    if (!SUBS.some((s) => typeof sc[s.id] === 'number')) { NA.toast('還沒有任何評分'); return; }
    const all = records();
    const t = $('when').value ? new Date($('when').value) : new Date();
    all.push({ id: Date.now(), t: t.toISOString(), case: $('case').value.trim(), label: $('label').value.trim(), sc: { ...sc } });
    NA.store.set(RKEY, all);
    NA.store.set('crsr-case', $('case').value.trim());
    renderRecords();
    NA.toast('已儲存');
  }

  function exportCsv() {
    const all = records().sort((a, b) => (a.case || '').localeCompare(b.case || '') || new Date(a.t) - new Date(b.t));
    if (!all.length) { NA.toast('沒有可匯出的紀錄'); return; }
    const rows = [['case', 'datetime', 'label', ...SUBS.map((s) => s.en), 'total', 'diagnosis']];
    all.forEach((r) => rows.push([r.case || '', NA.fmtDate(r.t), r.label || '', ...SUBS.map((s) => r.sc[s.id] ?? ''), totalOf(r.sc), DX[diagnose(r.sc).key].en]));
    NA.download(`crs-r-${NA.stamp()}.csv`, NA.csv(rows), 'text/csv;charset=utf-8');
  }

  /* ---------- 事件 ---------- */
  $('when').value = NA.localInputValue();
  $('case').value = NA.store.get('crsr-case', '');
  $('hints').checked = NA.store.get('crsr-hints', false);
  $('notes').innerHTML = D.notes.map((n) => `<li>${esc(n)}</li>`).join('');
  document.querySelectorAll('#fmt [data-fmt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === fmt)));

  $('ladders').addEventListener('click', (e) => {
    const b = e.target.closest('.lv');
    if (!b) return;
    const id = b.dataset.sub, v = Number(b.dataset.v);
    if (sc[id] === v) delete sc[id]; else sc[id] = v;
    update();
    const again = document.querySelector(`.lv[data-sub="${id}"][data-v="${v}"]`);
    if (again) again.focus();
  });
  $('hints').addEventListener('change', () => { NA.store.set('crsr-hints', $('hints').checked); renderLadders(); });
  $('fmt').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]');
    if (!b) return;
    fmt = b.dataset.fmt;
    NA.store.set('crsr-fmt', fmt);
    document.querySelectorAll('#fmt [data-fmt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('out').value = buildOutput();
  });
  ['when', 'label'].forEach((id) => $(id).addEventListener('input', () => { $('out').value = buildOutput(); }));
  $('case').addEventListener('input', renderRecords);
  $('copy').addEventListener('click', () => NA.copy($('out').value, $('out')));
  $('save').addEventListener('click', save);
  $('csv').addEventListener('click', exportCsv);
  let armed = null;
  $('reset').addEventListener('click', () => {
    const b = $('reset');
    if (!armed) { b.textContent = '再按一次確認'; armed = setTimeout(() => { b.textContent = '重設'; armed = null; }, 3000); return; }
    clearTimeout(armed); armed = null; b.textContent = '重設';
    sc = {}; $('label').value = ''; $('when').value = NA.localInputValue();
    update();
  });
  $('rec-table').addEventListener('click', (e) => {
    const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
    const all = records();
    if (l) {
      const r = all.find((x) => String(x.id) === l.dataset.load);
      if (!r) return;
      sc = { ...r.sc };
      $('label').value = r.label || '';
      $('when').value = NA.localInputValue(new Date(r.t));
      update();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      NA.toast('已載入紀錄');
    }
    if (d) {
      NA.store.set(RKEY, all.filter((x) => String(x.id) !== d.dataset.del));
      renderRecords();
      NA.toast('已刪除');
    }
  });

  update();
  renderRecords();
})();
