/*
 * Neuro-A 共用函式
 * ------------------------------------------------------------
 * 每一頁都載入：tools.config.js → neuro-a.js → 該工具自己的 js
 * 頁面 <html data-root="../../" data-tool="nihss"> 告訴這支程式：
 *   data-root  回到網站根目錄的相對路徑（首頁是 "./"）
 *   data-tool  目前工具的 id（對應 tools.config.js）
 * 頁面放 <header id="na-header"></header> 和 <footer id="na-footer"></footer>，
 * 這支程式會自動填入頁首選單與頁尾。
 */
(function () {
  const NA = (window.NeuroA = window.NeuroA || {});
  NA.data = NA.data || {};
  const html = document.documentElement;
  NA.root = html.dataset.root || './';
  NA.toolId = html.dataset.tool || '';

  /* ---------- 圖示（24×24 線條） ---------- */
  const ICONS = {
    logo: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/><path d="M4 21h5.5L15 7.5 20.5 21H28M11.6 16h6.8" fill="none" stroke="var(--accent-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    nihss: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5h6v2.5H9z"/><path d="M8 13h2l1.5-3 2 6 1.5-3h1.5"/></svg>',
    crsr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5h4v-4h4v-4h4v-4h5"/><circle cx="18.5" cy="4.8" r="1.6"/></svg>',
    okn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4v12M10 4v12M15 4v12M20 4v12"/><path d="M6 20.5h12m-3-2.5 3 2.5-3 2.5"/></svg>',
    nystagmus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 9.5C5 5.5 8.5 4 12 4s7 1.5 9.5 5.5C19 13.5 15.5 15 12 15S5 13.5 2.5 9.5z"/><circle cx="12" cy="9.5" r="2.6"/><path d="M3 21l4-3v3l4-3v3l4-3v3l4-3"/></svg>',
    pill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.8" y="8.2" width="18.4" height="7.6" rx="3.8" transform="rotate(-35 12 12)"/><path d="M9.6 8.5l4.8 7"/></svg>',
    tool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.3"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.3"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.3"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.3"/></svg>',
    'theme-system': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    'theme-light': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
    'theme-dark': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14"/></svg>',
    ear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 3.2-2.6 4-3.3 6.4-.6 2.1-1.6 4.1-3.9 4.1A3 3 0 0 1 7.3 17"/><path d="M9.5 9.3a2.5 2.5 0 0 1 5 0c0 1.5-1.6 1.8-1.6 3.2"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12C5 7.5 8.5 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-6 6.5-9.5 6.5S5 16.5 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12.5V5.8a1.4 1.4 0 0 1 2.8 0V11m0-6.6a1.4 1.4 0 0 1 2.8 0V11m0-5.4a1.4 1.4 0 0 1 2.8 0V11.5m0-3.6a1.4 1.4 0 0 1 2.8 0v6.3a6.8 6.8 0 0 1-6.8 6.8h-.7a6 6 0 0 1-4.6-2.2L4.6 15a1.5 1.5 0 0 1 2.2-2z"/></svg>',
    mouth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5c2.5-2.5 5-3.5 6.5-2.5L12 10l2.5-1c1.5-1 4 0 6.5 2.5-2.5 3.5-5.5 5-9 5s-6.5-1.5-9-5z"/><path d="M3 11.5h18"/></svg>',
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v10H11l-4.5 4v-4H4z"/><path d="M8.5 10.5l2 2 4-4"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 15.5a8 8 0 0 1 16 0"/><path d="M2.5 15.5h19M12 3.5v2.5M5.2 6.7l1.7 1.7M18.8 6.7l-1.7 1.7M8.5 19.5h7"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5h4l1.5-2h6l1.5 2h4v11h-17z"/><circle cx="12" cy="13" r="3.3"/></svg>'
  };
  NA.icon = (name) => ICONS[name] || ICONS.tool;
  NA.icons = ICONS;

  /* ---------- 小工具 ---------- */
  NA.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NA.$ = (sel, root) => (root || document).querySelector(sel);
  NA.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  NA.fmtDate = (d, withTime = true) => {
    d = d instanceof Date ? d : new Date(d);
    const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
  };
  NA.localInputValue = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  NA.stamp = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

  /* ---------- 本機儲存（只存在這台裝置、這個瀏覽器） ---------- */
  const PREFIX = 'neuroa:';
  NA.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) {} }
  };

  /* ---------- 提示訊息 ---------- */
  let toastEl, toastTimer;
  NA.toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'na-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  };

  /* ---------- 複製 ---------- */
  NA.copy = (text, fallbackEl) => {
    const fallback = () => {
      let ok = false;
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (!ok && fallbackEl && fallbackEl.select) { fallbackEl.focus(); fallbackEl.select(); }
      NA.toast(ok ? '已複製' : '請手動複製（Ctrl+C）');
    };
    try {
      navigator.clipboard.writeText(text).then(() => NA.toast('已複製'), fallback);
    } catch (e) { fallback(); }
  };

  /* ---------- 下載 ---------- */
  NA.download = (filename, data, mime = 'text/plain;charset=utf-8') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  NA.csv = (rows) => '﻿' + rows.map((r) => r.map((c) => {
    const s = c == null ? '' : String(c);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');

  /* ---------- 主題 ---------- */
  const THEMES = ['system', 'light', 'dark'];
  const THEME_LABEL = { system: '跟隨系統', light: '淺色', dark: '深色' };
  NA.getTheme = () => NA.store.get('theme', 'system');
  NA.setTheme = (t) => {
    if (t === 'system') delete html.dataset.theme; else html.dataset.theme = t;
    NA.store.set('theme', t);
    const b = document.getElementById('na-theme');
    if (b) { b.innerHTML = NA.icon('theme-' + t) + `<span class="lbl">${THEME_LABEL[t]}</span>`; b.title = '配色：' + THEME_LABEL[t]; }
    document.dispatchEvent(new CustomEvent('neuroa:theme', { detail: t }));
  };
  /* 讀取 CSS token 的實際顏色（給 canvas 用） */
  NA.cssVar = (name) => getComputedStyle(html).getPropertyValue(name).trim();

  /* ---------- 頁首／頁尾 ---------- */
  function renderHeader() {
    const host = document.getElementById('na-header');
    if (!host) return;
    const site = NA.site || { name: 'Neuro-A' };
    const tools = NA.tools || [];
    const cur = tools.find((t) => t.id === NA.toolId);
    const groups = NA.groups || [...new Set(tools.map((t) => t.group))];
    const menu = groups.map((g) => {
      const items = tools.filter((t) => t.group === g && t.status !== 'planned');
      if (!items.length) return '';
      return `<div class="na-menu-group">${NA.esc(g)}</div>` + items.map((t) =>
        `<a href="${NA.root}${t.path}"${t.id === NA.toolId ? ' aria-current="page"' : ''}>${NA.icon(t.icon)}<span>${NA.esc(t.name)}</span><small>${NA.esc(t.zh)}</small></a>`
      ).join('');
    }).join('');
    host.className = 'na-header';
    host.innerHTML = `<div class="na-header-in">
      <a class="na-brand" href="${NA.root}index.html" aria-label="${NA.esc(site.name)} 首頁">${NA.icon('logo')}<span>Neuro-<b>A</b></span></a>
      ${cur ? `<div class="na-crumb"><span>${NA.esc(cur.name)}</span></div>` : ''}
      <div class="na-actions">
        <details class="na-menu"><summary class="na-iconbtn" aria-label="工具選單">${NA.icon('menu')}<span class="lbl">工具</span></summary>
          <nav class="na-menu-panel">${menu}</nav></details>
        <button type="button" class="na-iconbtn na-themebtn" id="na-theme"></button>
      </div></div>`;
    const det = host.querySelector('.na-menu');
    document.addEventListener('click', (e) => { if (det.open && !det.contains(e.target)) det.open = false; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') det.open = false; });
    document.getElementById('na-theme').addEventListener('click', () => {
      const t = NA.getTheme();
      NA.setTheme(THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
    });
    NA.setTheme(NA.getTheme());
  }

  function renderFooter() {
    const host = document.getElementById('na-footer');
    if (!host) return;
    const site = NA.site || {};
    host.className = 'na-footer';
    host.innerHTML = `<div class="na-footer-in">
      <span>臨床輔助工具，不取代正式評估與臨床判斷。資料只在本機瀏覽器處理。</span>
      <span class="mono">${NA.esc(site.name || 'Neuro-A')} v${NA.esc(site.version || '')}</span></div>`;
  }

  renderHeader();
  renderFooter();
})();
