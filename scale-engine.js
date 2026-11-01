/*
 * 通用量表引擎
 * ------------------------------------------------------------
 * 只要寫一份資料檔（NeuroA.data.scale = {...}），就會自動產生：
 *   逐項選項、總分、分級、病歷文字、複製按鈕
 * 用法見 tools/template/，說明見 docs/新增工具.md
 *
 * 資料格式：
 *   title, en, intro
 *   items: [{ id, code, title, en, hint, options: [{ s: 分數 或 'NT', t: 中文, en: 英文 }] }]
 *   bands: [{ max: 分數上限, label, en, tone: 'ok'|'warn'|'crit' }]   選填
 *   format(scores, total, ctx)  選填，自訂病歷文字；scores = { 項目id: 分數 }
 */
(function () {
  const NA = window.NeuroA;
  const D = NA.data.scale;
  const $ = (id) => document.getElementById(id);
  const esc = NA.esc;
  let sc = {};

  const isNum = (v) => typeof v === 'number';
  const total = () => D.items.reduce((a, it) => a + (isNum(sc[it.id]) ? sc[it.id] : 0), 0);
  const maxTotal = () => D.items.reduce((a, it) => a + Math.max(...it.options.map((o) => (isNum(o.s) ? o.s : 0))), 0);
  const done = () => D.items.filter((it) => sc[it.id] != null).length;
  const band = (t) => (D.bands || []).find((b) => t <= b.max);

  function defaultFormat(s, t) {
    const parts = D.items.map((it) => `${it.code || it.id}${s[it.id] == null ? '–' : s[it.id]}`).join(' ');
    const b = band(t);
    return `${D.en || D.title} ${t}${D.showMax === false ? '' : '/' + maxTotal()} (${parts})${b && b.en ? ' — ' + b.en : ''}`;
  }

  function render() {
    $('scale-title').innerHTML = `${esc(D.title)}${D.en ? ` <small>${esc(D.en)}</small>` : ''}`;
    $('scale-intro').textContent = D.intro || '';
    document.title = `${D.title} · Neuro-A`;
    $('items').innerHTML = D.items.map((it) => `<section class="card item" id="item-${esc(it.id)}">
      <div class="item-head">
        <span class="code mono">${esc(it.code || it.id)}</span>
        <div class="ttl"><h2>${esc(it.title)}</h2>${it.en ? `<span>${esc(it.en)}</span>` : ''}</div>
        <span class="item-score mono" id="sc-${esc(it.id)}">–</span>
      </div>
      ${it.hint ? `<p class="item-hint">${esc(it.hint)}</p>` : ''}
      <div class="opts" role="radiogroup" aria-label="${esc(it.title)}">
        ${it.options.map((o) => `<button type="button" class="opt" role="radio" aria-checked="false" data-id="${esc(it.id)}" data-v="${esc(o.s)}">
          <span class="opt-s mono">${esc(o.s)}</span><span class="opt-t">${esc(o.t)}${o.en ? `<small>${esc(o.en)}</small>` : ''}</span></button>`).join('')}
      </div></section>`).join('');
  }

  function update() {
    D.items.forEach((it) => {
      const v = sc[it.id];
      document.querySelectorAll(`.opt[data-id="${it.id}"]`).forEach((b) => b.setAttribute('aria-checked', String(v != null && String(b.dataset.v) === String(v))));
      const el = $('sc-' + it.id);
      el.textContent = v == null ? '–' : v;
      el.classList.toggle('set', v != null);
    });
    const t = total();
    $('total').textContent = t;
    $('total-max').textContent = D.showMax === false ? '' : '/ ' + maxTotal();
    const b = band(t);
    $('band').innerHTML = b ? `<span class="chip ${b.tone || ''}">${esc(b.label)}</span>` : '';
    $('progress').textContent = `已評 ${done()} / ${D.items.length} 項`;
    const ctx = { items: D.items, done: done() === D.items.length };
    $('out').value = (typeof D.format === 'function' ? D.format(sc, t, ctx) : defaultFormat(sc, t)) +
      (done() < D.items.length ? ' (incomplete)' : '');
  }

  render();
  $('items').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    const id = b.dataset.id, raw = b.dataset.v;
    const v = isNaN(Number(raw)) ? raw : Number(raw);
    if (sc[id] === v) delete sc[id]; else sc[id] = v;
    update();
  });
  $('copy').addEventListener('click', () => NA.copy($('out').value, $('out')));
  $('reset').addEventListener('click', () => { sc = {}; update(); });
  update();
})();
