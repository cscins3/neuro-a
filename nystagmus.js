/*
 * 攝影眼振圖（video nystagmogram）
 * ------------------------------------------------------------
 * 追蹤：MediaPipe Face Landmarker（478 點，含虹膜 468–477）
 * 每一格影像：
 *   眼裂軸 = 內外眼角連線；虹膜中心投影到這條軸 → 水平位置（以眼裂寬度正規化）
 *   垂直位置 = 虹膜中心到眼裂軸的垂直距離
 *   角度：未校正時以眼球模型估計（asin(位移 / 眼球半徑)）；校正後用線性增益
 * 分析：nystagmus-analysis.js
 *
 * 想改設定（例如自架 MediaPipe 檔案）：在 tools.config.js 加上
 *   NeuroA.config = { nystagmus: { mediapipeBase: '../../vendor/mediapipe', modelUrl: '../../vendor/mediapipe/face_landmarker.task' } };
 */
(function () {
  const NA = window.NeuroA;
  const A = NA.nystagmus;
  const $ = (id) => document.getElementById(id);
  const esc = NA.esc;

  const CONFIG = Object.assign({
    mediapipeVersion: '0.10.14',
    mediapipeBase: null,
    modelUrl: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    eyeWidthMm: 29,     // 內外眼角距離（成人約 28–30 mm）
    eyeRadiusMm: 12,    // 眼球旋轉半徑
    liveWindow: 10,     // 即時軌跡顯示秒數
    blinkRatio: 0.5     // 眼裂高度低於平常的這個比例視為眨眼
  }, (NA.config && NA.config.nystagmus) || {});
  const MP_BASE = CONFIG.mediapipeBase || `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${CONFIG.mediapipeVersion}`;

  const CONDITIONS = [
    { id: 'primary', zh: '正前方注視', en: 'primary gaze' },
    { id: 'right', zh: '向右凝視', en: 'right gaze' },
    { id: 'left', zh: '向左凝視', en: 'left gaze' },
    { id: 'up', zh: '向上凝視', en: 'up gaze' },
    { id: 'down', zh: '向下凝視', en: 'down gaze' },
    { id: 'dix-r', zh: 'Dix-Hallpike 右側', en: 'right Dix-Hallpike' },
    { id: 'dix-l', zh: 'Dix-Hallpike 左側', en: 'left Dix-Hallpike' },
    { id: 'roll-r', zh: '仰臥轉頭 右', en: 'supine roll right' },
    { id: 'roll-l', zh: '仰臥轉頭 左', en: 'supine roll left' },
    { id: 'hst', zh: '搖頭後（post-HSN）', en: 'post head-shaking' },
    { id: 'custom', zh: '自訂…', en: '' }
  ];
  const EYE_LABEL = { both: { zh: '雙眼平均', en: 'both eyes averaged' }, R: { zh: '右眼', en: 'right eye' }, L: { zh: '左眼', en: 'left eye' } };

  /* ---------- 狀態 ---------- */
  const video = $('video');
  const ov = $('ov'), octx = ov.getContext('2d');
  let landmarker = null, loading = null;
  let stream = null, source = null, active = false;
  let lastT = -Infinity, lastTs = 0;
  const live = [];
  const apHist = [];
  let zero = { h: 0, v: 0 };
  let calib = null;
  let calibBuf = null;
  let rec = null;
  const results = [];
  let fpsFrames = 0, fpsT0 = 0, fps = 0;
  let lastAnalyze = 0;
  const opt = Object.assign({ eye: 'both', scale: 10, mirror: true, flipped: false, dur: 20, cond: 'primary', rate: '0.5' }, NA.store.get('nys-opt', {}));
  const saveOpt = () => NA.store.set('nys-opt', opt);

  /* ---------- 小工具 ---------- */
  const finite = Number.isFinite;
  const med = A.median;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function status(msg, tone) {
    const el = $('status');
    el.className = 'note-box' + (tone ? ' ' + tone : '');
    el.innerHTML = msg;
  }
  const condLabel = () => {
    const c = CONDITIONS.find((x) => x.id === $('cond').value) || CONDITIONS[0];
    if (c.id === 'custom') { const v = $('cond-custom').value.trim() || '自訂'; return { zh: v, en: v }; }
    return c;
  };

  /* ---------- 色彩（canvas 用） ---------- */
  let COL = null;
  const readColors = () => {
    COL = { bg: NA.cssVar('--surface'), grid: NA.cssVar('--line-2'), axis: NA.cssVar('--line'), text: NA.cssVar('--ink-3'), ink: NA.cssVar('--ink-2'), h: NA.cssVar('--accent'), v: NA.cssVar('--series-2'), crit: NA.cssVar('--crit') };
  };
  const LIGHT = { bg: '#ffffff', grid: '#e6ecee', axis: '#cfd9dd', text: '#71838a', ink: '#41525a', h: '#08666e', v: '#bd5418', crit: '#ad2539' };
  readColors();
  document.addEventListener('neuroa:theme', () => setTimeout(() => { readColors(); redrawAll(); }, 30));
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(() => { readColors(); redrawAll(); }, 30));

  /* ---------- 模型 ---------- */
  async function loadModel() {
    if (landmarker) return landmarker;
    if (loading) return loading;
    status('正在載入追蹤模型（第一次約需數秒到十幾秒）…');
    loading = (async () => {
      const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      const make = (delegate) => vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: CONFIG.modelUrl, delegate },
        runningMode: 'VIDEO', numFaces: 1,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5
      });
      try { landmarker = await make('GPU'); } catch (e) { landmarker = await make('CPU'); }
      return landmarker;
    })();
    try { return await loading; }
    catch (e) {
      loading = null;
      status(`追蹤模型載入失敗：${esc(e.message || e)}。請確認網路可連到 cdn.jsdelivr.net 與 storage.googleapis.com，或依 docs 說明改成自架模型檔。`, 'crit');
      throw e;
    }
  }

  /* ---------- 眼睛幾何 ---------- */
  function eyeMetrics(outer, inner, upper, lower, iris, rightSign) {
    const dx = outer.x - inner.x, dy = outer.y - inner.y;
    const w = Math.hypot(dx, dy) || 1;
    let ux = dx / w, uy = dy / w;
    if (ux * rightSign < 0) { ux = -ux; uy = -uy; }     // u 指向受試者的右方
    let nx = -uy, ny = ux;
    if (ny > 0) { nx = -nx; ny = -ny; }                 // n 指向影像上方
    const cx = (outer.x + inner.x) / 2, cy = (outer.y + inner.y) / 2;
    const rx = iris.x - cx, ry = iris.y - cy;
    return {
      h: (rx * ux + ry * uy) / w,
      v: (rx * nx + ry * ny) / w,
      ap: Math.hypot(upper.x - lower.x, upper.y - lower.y) / w,
      w, cx, cy, ix: iris.x, iy: iris.y, outer, inner
    };
  }
  function toDeg(norm, axis, eye) {
    if (!finite(norm)) return NaN;
    let deg;
    if (calib && calib[eye]) deg = (norm - calib[eye].c[axis]) * calib[eye].gain;
    else {
      const r = Math.max(-1, Math.min(1, norm * CONFIG.eyeWidthMm / CONFIG.eyeRadiusMm));
      deg = Math.asin(r) * 180 / Math.PI;
    }
    return deg;
  }
  /* 樣本存的是未歸零的角度；顯示與分析時才扣掉 zero，歸零就不會讓資料出現斷層 */
  const pickRaw = (s, axis) => {
    const r = s[axis + 'R'], l = s[axis + 'L'];
    if (opt.eye === 'R') return r;
    if (opt.eye === 'L') return l;
    if (finite(r) && finite(l)) return (r + l) / 2;
    return finite(r) ? r : l;
  };
  const pick = (s, axis) => pickRaw(s, axis) - zero[axis];
  let autoZero = true;

  /* ---------- 每一格 ---------- */
  function processFrame(t) {
    if (!landmarker) return;
    let ts = performance.now();
    if (ts <= lastTs) ts = lastTs + 0.01;
    lastTs = ts;
    let res;
    try { res = landmarker.detectForVideo(video, ts); } catch (e) { return; }
    const lm = res && res.faceLandmarks && res.faceLandmarks[0];
    const W = video.videoWidth, H = video.videoHeight;
    const s = { t, hR: NaN, vR: NaN, hL: NaN, vL: NaN, ok: false, blink: false, face: !!lm };
    let eyes = null;
    if (lm && lm.length >= 478) {
      const P = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
      const rs = opt.flipped ? 1 : -1;
      const a = eyeMetrics(P(33), P(133), P(159), P(145), P(468), rs);
      const b = eyeMetrics(P(263), P(362), P(386), P(374), P(473), rs);
      /* 一般影像中，模型的 33/468 是受試者右眼；影像左右翻轉時兩眼對調 */
      const R = opt.flipped ? b : a, L = opt.flipped ? a : b;
      eyes = { R, L };
      const ap = (R.ap + L.ap) / 2;
      const base = apHist.length >= 10 ? med(apHist) : ap;
      const blink = ap < base * CONFIG.blinkRatio;
      if (!blink) { apHist.push(ap); if (apHist.length > 120) apHist.shift(); }
      s.blink = blink;
      s.hx = (R.cx + L.cx) / 2; s.hy = (R.cy + L.cy) / 2; s.iod = Math.hypot(R.cx - L.cx, R.cy - L.cy);
      if (!blink) {
        s.ok = true;
        s.nR = { h: R.h, v: R.v }; s.nL = { h: L.h, v: L.v };
        s.hR = toDeg(R.h, 'h', 'R'); s.vR = toDeg(R.v, 'v', 'R');
        s.hL = toDeg(L.h, 'h', 'L'); s.vL = toDeg(L.v, 'v', 'L');
        if (calibBuf) calibBuf.push({ R: s.nR, L: s.nL });
      }
    }
    live.push(s);
    while (live.length && live[0].t < t - CONFIG.liveWindow - 2) live.shift();
    if (autoZero && !calib) {
      const ok = live.filter((x) => x.ok);
      if (ok.length >= 15) {
        zero = { h: med(ok.map((x) => pickRaw(x, 'h'))), v: med(ok.map((x) => pickRaw(x, 'v'))) };
        autoZero = false;
      }
    }
    if (rec) {
      rec.samples.push(s);
      const el = t - rec.t0;
      $('rec-prog').style.width = Math.min(100, el / rec.dur * 100) + '%';
      $('rec-time').textContent = `${el.toFixed(1)} / ${rec.dur.toFixed(0)} s`;
      if (el >= rec.dur) finishRecording();
    }
    drawOverlay(eyes);
    drawZoom(eyes);
    drawLive(t);
    fpsFrames++;
    const now = performance.now();
    if (now - fpsT0 > 1000) {
      fps = fpsFrames * 1000 / (now - fpsT0); fpsFrames = 0; fpsT0 = now;
      const recent = live.filter((x) => x.t > t - 2);
      const q = recent.length ? recent.filter((x) => x.ok).length / recent.length : 0;
      $('fps').textContent = fps.toFixed(0);
      $('track').textContent = Math.round(q * 100) + '%';
      $('track').parentElement.className = 'chip ' + (q > 0.85 ? 'ok' : q > 0.5 ? 'warn' : 'crit');
      $('fps').parentElement.className = 'chip ' + (fps >= 50 ? 'ok' : fps >= 25 ? '' : 'warn');
    }
    if (now - lastAnalyze > 600) { lastAnalyze = now; liveReadout(t); }
  }

  let loopGen = 0;
  function loop(g) {
    if (!active || g !== loopGen) return;
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      video.requestVideoFrameCallback((now, meta) => {
        if (!active || g !== loopGen) return;
        const t = meta && finite(meta.mediaTime) ? meta.mediaTime : now / 1000;
        /* 分析影片檔時每一格先暫停、處理完再播放，確保不漏格（與電腦速度無關） */
        const step = source === 'file' && rec && !video.paused;
        if (step) video.pause();
        if (t > lastT) { lastT = t; processFrame(t); }
        if (step && rec) video.play().catch(() => {});
        loop(g);
      });
    } else {
      requestAnimationFrame(() => {
        if (!active || g !== loopGen) return;
        const t = source === 'file' ? video.currentTime : performance.now() / 1000;
        if (t > lastT && video.readyState >= 2) { lastT = t; processFrame(t); }
        loop(g);
      });
    }
  }

  function begin() {
    active = true; lastT = -Infinity; live.length = 0; apHist.length = 0;
    if (!calib) autoZero = true;
    fpsT0 = performance.now(); fpsFrames = 0;
    $('pv-empty').hidden = true;
    sizePreview();
    loop(++loopGen);
    updateButtons();
  }

  function stopAll() {
    active = false;
    if (rec) finishRecording();
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    video.pause();
    video.removeAttribute('src'); video.srcObject = null; video.load();
    source = null;
    $('pv-empty').hidden = false;
    octx.clearRect(0, 0, ov.width, ov.height);
    updateButtons();
  }

  /* ---------- 鏡頭 ---------- */
  async function startCamera() {
    if (!window.isSecureContext) { status('鏡頭需要在 https 網址（或 localhost）下使用。請把網站部署後再開啟。', 'crit'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('這個瀏覽器不支援鏡頭存取。', 'crit'); return; }
    try { await loadModel(); } catch (e) { return; }
    stopAll();
    const devId = $('cam').value;
    const base = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } };
    const video_c = devId ? Object.assign({ deviceId: { exact: devId } }, base) : Object.assign({ facingMode: 'user' }, base);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: video_c, audio: false });
    } catch (e) {
      const m = e.name === 'NotAllowedError' ? '未取得鏡頭權限。請在瀏覽器網址列旁的設定允許使用鏡頭後再試一次。'
        : e.name === 'NotFoundError' ? '找不到鏡頭。' : e.name === 'NotReadableError' ? '鏡頭正被其他程式使用中。' : `無法開啟鏡頭：${esc(e.message || e.name)}`;
      status(m, 'crit');
      return;
    }
    source = 'camera';
    video.srcObject = stream; video.muted = true; video.playsInline = true;
    await video.play().catch(() => {});
    await new Promise((r) => (video.readyState >= 2 ? r() : video.addEventListener('loadeddata', r, { once: true })));
    const set = stream.getVideoTracks()[0].getSettings ? stream.getVideoTracks()[0].getSettings() : {};
    status(`鏡頭已開啟（${video.videoWidth}×${video.videoHeight}${set.frameRate ? `，${Math.round(set.frameRate)} fps` : ''}）。讓病人眼睛清楚在畫面中、光線充足、頭部固定，再按「開始錄製」。`, '');
    listCameras(devId || set.deviceId);
    begin();
  }
  async function listCameras(current) {
    try {
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      if (!devs.length) return;
      $('cam').innerHTML = devs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || '鏡頭 ' + (i + 1))}</option>`).join('');
      if (current) $('cam').value = current;
    } catch (e) {}
  }

  /* ---------- 影片檔 ---------- */
  async function openFile(file) {
    if (!file) return;
    try { await loadModel(); } catch (e) { return; }
    stopAll();
    source = 'file';
    video.srcObject = null;
    video.src = URL.createObjectURL(file);
    video.muted = true; video.playsInline = true;
    await new Promise((r) => video.addEventListener('loadedmetadata', r, { once: true }));
    video.playbackRate = Number(opt.rate) || 1;
    status(`已載入影片「${esc(file.name)}」（${video.duration.toFixed(1)} 秒，${video.videoWidth}×${video.videoHeight}）。按「分析整段影片」從頭播放並分析；播放速度放慢可以讓每一格都被處理。`);
    begin();
    video.currentTime = 0;
  }
  async function analyzeFile() {
    if (source !== 'file') return;
    video.pause();
    video.currentTime = 0;
    await new Promise((r) => video.addEventListener('seeked', r, { once: true }));
    lastT = -Infinity; live.length = 0;
    video.playbackRate = Number(opt.rate) || 1;
    startRecording(video.duration);
    video.play().catch(() => {});
  }
  video.addEventListener('ended', () => { if (rec && source === 'file') finishRecording(); });

  /* ---------- 錄製 ---------- */
  function startRecording(dur) {
    if (!active) { NA.toast('請先開啟鏡頭或影片'); return; }
    const c = condLabel();
    rec = { t0: live.length ? live[live.length - 1].t : 0, dur: dur || Number($('dur').value) || 20, samples: [], cond: c, when: new Date() };
    if (source === 'file') rec.t0 = 0;
    $('rec-box').hidden = false;
    updateButtons();
  }
  function finishRecording() {
    const r = rec;
    rec = null;
    $('rec-box').hidden = true;
    updateButtons();
    if (!r || r.samples.length < 10) { NA.toast('錄到的資料太少'); return; }
    const t0 = r.samples[0].t;
    const eye = opt.eye;
    const ser = r.samples.map((s) => ({ t: s.t - t0, h: pick(s, 'h'), v: pick(s, 'v') }));
    const res = A.analyze(ser);
    if (!res) { NA.toast('無法分析這段資料'); return; }
    const heads = r.samples.filter((s) => finite(s.hx) && s.iod > 0);
    let headMove = 0;
    if (heads.length > 5) {
      const iod = med(heads.map((s) => s.iod));
      const xs = heads.map((s) => s.hx / iod), ys = heads.map((s) => s.hy / iod);
      headMove = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }
    const item = { id: Date.now(), cond: r.cond, when: r.when, eye, calibrated: !!calib, samples: r.samples, ser, res, headMove, lang: 'en' };
    results.unshift(item);
    renderResults();
    status('錄製完成，結果在下方。自動判讀僅供參考，請對照影像確認。', 'ok');
    if (source === 'file') video.pause();
  }

  /* ---------- 校正 ---------- */
  async function runCalibration() {
    if (!active) { NA.toast('請先開啟鏡頭或影片'); return; }
    const ang = Math.max(5, Math.min(40, Number($('cal-angle').value) || 15));
    const msg = $('calmsg');
    const steps = [
      { key: 'c', text: '請病人看正前方的目標' },
      { key: 'r', text: `請病人看「病人右側」${ang}° 的目標` },
      { key: 'l', text: `請病人看「病人左側」${ang}° 的目標` }
    ];
    const prevCal = calib, prevZero = zero;
    calib = null; zero = { h: 0, v: 0 }; autoZero = false;
    const out = {};
    msg.hidden = false;
    $('calib').disabled = true;
    try {
      for (const st of steps) {
        for (let c = 3; c > 0; c--) { msg.innerHTML = `${esc(st.text)}<b>${c}</b>`; await sleep(600); }
        msg.innerHTML = `${esc(st.text)}<b>量測中</b>`;
        calibBuf = [];
        await sleep(1200);
        const buf = calibBuf; calibBuf = null;
        if (buf.length < 8) throw new Error('量測期間追蹤不到眼睛');
        out[st.key] = {
          R: { h: med(buf.map((x) => x.R.h)), v: med(buf.map((x) => x.R.v)) },
          L: { h: med(buf.map((x) => x.L.h)), v: med(buf.map((x) => x.L.v)) }
        };
      }
      const mk = (e) => {
        const span = out.r[e].h - out.l[e].h;
        if (!(span > 0.02)) throw new Error('左右兩點差距太小或方向相反（若影片是自拍鏡像，請勾選「影像已左右翻轉」）');
        return { c: out.c[e], gain: (2 * ang) / span };
      };
      calib = { R: mk('R'), L: mk('L'), ang };
      msg.innerHTML = '校正完成';
      NA.toast('校正完成');
    } catch (e) {
      calib = prevCal; zero = prevZero; calibBuf = null;
      msg.innerHTML = `校正失敗：${esc(e.message)}`;
    }
    $('calib').disabled = false;
    updateCalState();
    setTimeout(() => { msg.hidden = true; }, 1800);
  }
  function updateCalState() {
    $('cal-state').className = 'chip ' + (calib ? 'ok' : 'warn');
    $('cal-state').textContent = calib ? `已校正（±${calib.ang}°）` : '未校正：角度為估計值';
  }
  function setZero() {
    const now = live.length ? live[live.length - 1].t : 0;
    const recent = live.filter((s) => s.ok && s.t > now - 1);
    if (recent.length < 5) { NA.toast('追蹤不到眼睛，無法歸零'); return; }
    zero = { h: med(recent.map((s) => pickRaw(s, 'h'))), v: med(recent.map((s) => pickRaw(s, 'v'))) };
    autoZero = false;
    NA.toast('已把目前眼位設為 0°');
  }

  /* ---------- 畫面：預覽疊圖、放大眼睛 ---------- */
  function sizePreview() {
    const W = video.videoWidth || 16, H = video.videoHeight || 9;
    $('pv').style.aspectRatio = `${W} / ${H}`;
    $('pv').classList.toggle('mirror', opt.mirror);
    const z = $('zooms');
    z.classList.toggle('mirror', opt.mirror);
  }
  function drawOverlay(eyes) {
    const W = video.videoWidth, H = video.videoHeight;
    if (!W) return;
    if (ov.width !== W || ov.height !== H) { ov.width = W; ov.height = H; }
    octx.clearRect(0, 0, W, H);
    if (!eyes) {
      octx.fillStyle = 'rgba(0,0,0,.55)';
      octx.fillRect(0, H - 40, W, 40);
      octx.save();
      if (opt.mirror) { octx.translate(W, 0); octx.scale(-1, 1); }
      octx.fillStyle = '#fff'; octx.font = `${Math.round(H / 26)}px sans-serif`; octx.textAlign = 'center';
      octx.fillText('找不到臉部，請調整位置與光線', W / 2, H - 14);
      octx.restore();
      return;
    }
    const lw = Math.max(1.5, W / 640);
    [eyes.R, eyes.L].forEach((e) => {
      octx.strokeStyle = 'rgba(255,255,255,.85)'; octx.lineWidth = lw;
      octx.beginPath(); octx.moveTo(e.outer.x, e.outer.y); octx.lineTo(e.inner.x, e.inner.y); octx.stroke();
      octx.fillStyle = '#18c3b5';
      octx.beginPath(); octx.arc(e.ix, e.iy, lw * 2.4, 0, Math.PI * 2); octx.fill();
    });
  }
  function drawZoom(eyes) {
    [['R', $('zR')], ['L', $('zL')]].forEach(([k, cv]) => {
      const ctx = cv.getContext('2d');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = cv.clientWidth || 200, ch = cv.clientHeight || 100;
      if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (!eyes) return;
      const e = eyes[k];
      const sw = e.w * 2.1, sh = sw * cv.height / cv.width;
      ctx.save();
      if (opt.mirror) { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
      try { ctx.drawImage(video, e.cx - sw / 2, e.cy - sh / 2, sw, sh, 0, 0, cv.width, cv.height); } catch (err) {}
      const sx = cv.width / sw;
      const px = (e.ix - (e.cx - sw / 2)) * sx, py = (e.iy - (e.cy - sh / 2)) * sx;
      ctx.strokeStyle = 'rgba(24,195,181,.95)'; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.moveTo(px - 10 * dpr, py); ctx.lineTo(px + 10 * dpr, py); ctx.moveTo(px, py - 10 * dpr); ctx.lineTo(px, py + 10 * dpr); ctx.stroke();
      ctx.restore();
    });
  }

  /* ---------- 軌跡 ---------- */
  function drawTrace(cv, d) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = d.cssW || cv.clientWidth || 600, H = d.cssH || cv.clientHeight || 200;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    const C = d.col || COL;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    const padL = 44, padR = 12, padT = d.title ? 34 : 26, padB = 22;
    const pw = W - padL - padR, ph = H - padT - padB;
    const span = Math.max(0.001, d.t1 - d.t0);
    const X = (t) => padL + (t - d.t0) / span * pw;
    const Y = (y) => padT + ph / 2 - (y / d.scale) * (ph / 2);
    c.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    c.textBaseline = 'middle';
    /* 格線 */
    const step = span > 60 ? 10 : span > 24 ? 5 : span > 12 ? 2 : 1;
    c.strokeStyle = C.grid; c.lineWidth = 1;
    c.beginPath();
    for (let s = Math.ceil(d.t0 / step) * step; s <= d.t1; s += step) { const x = Math.round(X(s)) + 0.5; c.moveTo(x, padT); c.lineTo(x, padT + ph); }
    [-1, -0.5, 0.5, 1].forEach((f) => { const y = Math.round(Y(f * d.scale)) + 0.5; c.moveTo(padL, y); c.lineTo(padL + pw, y); });
    c.stroke();
    c.strokeStyle = C.axis; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(padL, Math.round(Y(0)) + 0.5); c.lineTo(padL + pw, Math.round(Y(0)) + 0.5); c.stroke();
    c.fillStyle = C.text; c.textAlign = 'right';
    [[d.scale, `+${d.scale}°`], [0, '0'], [-d.scale, `−${d.scale}°`]].forEach(([v, l]) => c.fillText(l, padL - 6, Y(v)));
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (let s = Math.ceil(d.t0 / step) * step; s <= d.t1 + 1e-9; s += step) c.fillText(`${(s - (d.tLabel0 || 0)).toFixed(0)}s`, X(s), padT + ph + 5);
    /* 曲線 */
    c.save();
    c.beginPath(); c.rect(padL, padT, pw, ph); c.clip();
    d.series.forEach((sr) => {
      c.strokeStyle = C[sr.key]; c.lineWidth = sr.width || 1.6; c.lineJoin = 'round';
      c.beginPath();
      let pen = false;
      for (let i = 0; i < sr.t.length; i++) {
        const y = sr.y[i];
        if (!finite(y)) { pen = false; continue; }
        const px = X(sr.t[i]), py = Y(Math.max(-d.scale * 1.2, Math.min(d.scale * 1.2, y)));
        if (pen) c.lineTo(px, py); else { c.moveTo(px, py); pen = true; }
      }
      c.stroke();
    });
    (d.events || []).forEach((ev) => {
      const x = X(ev.t);
      const yb = ev.key === 'h' ? padT + 2 : padT + ph - 2;
      c.fillStyle = C[ev.key];
      c.beginPath();
      if (ev.key === 'h') { c.moveTo(x - 4, yb); c.lineTo(x + 4, yb); c.lineTo(x, yb + 7); }
      else { c.moveTo(x - 4, yb); c.lineTo(x + 4, yb); c.lineTo(x, yb - 7); }
      c.fill();
    });
    (d.gaps || []).forEach(([a, b]) => { c.fillStyle = 'rgba(128,128,128,.12)'; c.fillRect(X(a), padT, Math.max(1, X(b) - X(a)), ph); });
    c.restore();
    /* 標題與圖例 */
    c.textBaseline = 'middle';
    if (d.title) { c.textAlign = 'left'; c.fillStyle = C.ink; c.font = '600 13px "IBM Plex Sans", "Noto Sans TC", sans-serif'; c.fillText(d.title, padL, 16); }
    c.font = '11px "IBM Plex Sans", "Noto Sans TC", sans-serif';
    c.textAlign = 'right';
    const ly = d.title ? 16 : 12;
    let lx = W - padR;
    [['v', '垂直（上為正）'], ['h', '水平（右為正）']].forEach(([k, l]) => {
      c.fillStyle = C.text; c.fillText(l, lx, ly);
      const tw = c.measureText(l).width;
      c.strokeStyle = C[k]; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(lx - tw - 22, ly); c.lineTo(lx - tw - 6, ly); c.stroke();
      lx -= tw + 34;
    });
  }

  function drawLive(tNow) {
    const cv = $('trace');
    const t1 = tNow, t0 = tNow - CONFIG.liveWindow;
    const pts = live.filter((s) => s.t >= t0 - 0.1);
    drawTrace(cv, {
      t0, t1, tLabel0: t0, scale: opt.scale,
      series: [
        { key: 'v', t: pts.map((s) => s.t), y: pts.map((s) => pick(s, 'v')) },
        { key: 'h', t: pts.map((s) => s.t), y: pts.map((s) => pick(s, 'h')) }
      ]
    });
  }

  function liveReadout(tNow) {
    const pts = live.filter((s) => s.t > tNow - 6).map((s) => ({ t: s.t, h: pick(s, 'h'), v: pick(s, 'v') }));
    const el = $('live-read');
    if (pts.length < 30) { el.textContent = ''; return; }
    const r = A.analyze(pts);
    if (!r) return;
    const cur = pts.slice(-5);
    const ch = med(cur.map((p) => p.h)), cvv = med(cur.map((p) => p.v));
    const ax = (a, k) => a.jerk ? `<b>${k === 'h' ? (a.domDir > 0 ? '右跳' : '左跳') : (a.domDir > 0 ? '上跳' : '下跳')}</b> ${a.rate.toFixed(1)} 拍/秒，SPV ${a.spvAbs.toFixed(1)}°/s` : (a.pendular ? `規律振盪 ~${a.spec.freq.toFixed(1)} Hz` : '—');
    el.innerHTML = `<span>眼位 H ${finite(ch) ? ch.toFixed(1) : '–'}°・V ${finite(cvv) ? cvv.toFixed(1) : '–'}°</span><span>最近 6 秒：水平 ${ax(r.h, 'h')}・垂直 ${ax(r.v, 'v')}</span>`;
  }

  /* ---------- 結果 ---------- */
  function resultTitle(it) { return `${it.cond.zh}・${NA.fmtDate(it.when)}・${EYE_LABEL[it.eye].zh}`; }
  function gapsOf(res) {
    const g = []; let a = null;
    for (let i = 0; i < res.t.length; i++) {
      const bad = !finite(res.h.x[i]);
      if (bad && a == null) a = res.t[i];
      if (!bad && a != null) { g.push([a, res.t[i]]); a = null; }
    }
    if (a != null) g.push([a, res.t[res.t.length - 1]]);
    return g;
  }
  function traceData(it, col, title) {
    const r = it.res;
    const events = r.h.events.map((e) => ({ t: e.t, key: 'h' })).concat(r.v.events.map((e) => ({ t: e.t, key: 'v' })));
    return { t0: 0, t1: r.duration, scale: opt.scale, col, title, gaps: gapsOf(r), events,
      series: [{ key: 'v', t: r.t, y: r.v.x }, { key: 'h', t: r.t, y: r.h.x }] };
  }
  function summaryText(it) {
    return A.summary(it.res, { condition: it.cond.zh, conditionEn: it.cond.en, calibrated: it.calibrated, eye: EYE_LABEL[it.eye].en }, it.lang === 'zh' ? 'zh' : 'en')
      + (it.headMove > 0.15 ? (it.lang === 'zh' ? '\n註：錄製中頭部移動較多，結果可能受影響。' : '\nNote: noticeable head movement during recording.') : '');
  }
  function metricRow(label, a, k) {
    const dir = a.jerk ? (k === 'h' ? (a.domDir > 0 ? '右跳' : '左跳') : (a.domDir > 0 ? '上跳' : '下跳')) : (a.pendular ? `振盪 ${a.spec.freq.toFixed(1)} Hz` : '—');
    const f = (x, d = 1) => (finite(x) ? x.toFixed(d) : '–');
    return `<tr><th>${label}</th><td>${dir}</td><td class="num">${a.beats}</td><td class="num">${f(a.rate)}</td><td class="num">${f(a.spvAbs)}</td><td class="num">${f(a.amp)}</td><td class="num">${f(a.meanPos)}</td></tr>`;
  }
  function renderResults() {
    const host = $('results');
    if (!results.length) { host.innerHTML = ''; return; }
    host.innerHTML = `<h2 class="label" style="margin:4px 0 0">錄製結果</h2>` + results.map((it) => {
      const r = it.res;
      return `<section class="card result" data-id="${it.id}">
        <div class="card-head">
          <div class="rh"><b>${esc(it.cond.zh)}</b><span class="faint">${esc(NA.fmtDate(it.when))}・${r.duration.toFixed(1)} s・${Math.round(r.fs)} Hz・${esc(EYE_LABEL[it.eye].zh)}</span>
            <span class="chip ${r.validFrac > 0.85 ? 'ok' : r.validFrac > 0.6 ? 'warn' : 'crit'}">有效 ${Math.round(r.validFrac * 100)}%</span>
            ${it.calibrated ? '<span class="chip ok">已校正</span>' : '<span class="chip warn">角度為估計</span>'}
            ${it.headMove > 0.15 ? '<span class="chip warn">頭部移動較多</span>' : ''}</div>
          <button type="button" class="btn small ghost danger" data-act="del">刪除</button>
        </div>
        <div class="res-trace"><canvas class="rcv"></canvas></div>
        <div class="table-wrap"><table class="na-table"><thead><tr><th></th><th>型態</th><th class="num">快相數</th><th class="num">拍/秒</th><th class="num">SPV °/s</th><th class="num">快相幅度 °</th><th class="num">平均眼位 °</th></tr></thead>
          <tbody>${metricRow('水平', r.h, 'h')}${metricRow('垂直', r.v, 'v')}</tbody></table></div>
        <div class="card-body" style="display:grid;gap:8px">
          <div class="btn-row" style="justify-content:space-between">
            <div class="seg"><button type="button" data-lang="en" aria-pressed="${it.lang !== 'zh'}">English</button><button type="button" data-lang="zh" aria-pressed="${it.lang === 'zh'}">中文</button></div>
            <div class="btn-row">
              <button type="button" class="btn small primary" data-act="copy">複製摘要</button>
              <button type="button" class="btn small" data-act="png">下載圖</button>
              <button type="button" class="btn small" data-act="csv">下載 CSV</button>
            </div>
          </div>
          <textarea class="sum" readonly spellcheck="false" aria-label="摘要">${esc(summaryText(it))}</textarea>
        </div>
      </section>`;
    }).join('');
    host.querySelectorAll('.result').forEach((el) => {
      const it = results.find((x) => String(x.id) === el.dataset.id);
      drawTrace(el.querySelector('.rcv'), traceData(it));
    });
  }
  function redrawAll() {
    document.querySelectorAll('#results .result').forEach((el) => {
      const it = results.find((x) => String(x.id) === el.dataset.id);
      if (it) drawTrace(el.querySelector('.rcv'), traceData(it));
    });
    if (!active) drawLive(CONFIG.liveWindow);
  }
  $('results').addEventListener('click', (e) => {
    const card = e.target.closest('.result');
    if (!card) return;
    const it = results.find((x) => String(x.id) === card.dataset.id);
    if (!it) return;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.lang) { it.lang = b.dataset.lang; card.querySelectorAll('[data-lang]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); card.querySelector('.sum').value = summaryText(it); return; }
    const act = b.dataset.act;
    if (act === 'copy') NA.copy(summaryText(it), card.querySelector('.sum'));
    if (act === 'del') { results.splice(results.indexOf(it), 1); renderResults(); }
    if (act === 'csv') {
      const t0 = it.samples[0].t;
      const rows = [['time_s', 'h_deg', 'v_deg', 'h_right_eye', 'v_right_eye', 'h_left_eye', 'v_left_eye', 'blink', 'face_found']];
      it.samples.forEach((s, i) => rows.push([(s.t - t0).toFixed(4), fx(it.ser[i].h), fx(it.ser[i].v), fx(s.hR), fx(s.vR), fx(s.hL), fx(s.vL), s.blink ? 1 : 0, s.face ? 1 : 0]));
      NA.download(`nystagmogram-${it.cond.en.replace(/\W+/g, '-') || 'custom'}-${NA.stamp(it.when)}.csv`, NA.csv(rows), 'text/csv;charset=utf-8');
    }
    if (act === 'png') {
      const cv = document.createElement('canvas');
      drawTrace(cv, Object.assign(traceData(it, LIGHT, `${it.cond.en || it.cond.zh} · ${NA.fmtDate(it.when)} · ${EYE_LABEL[it.eye].en}${it.calibrated ? '' : ' · angles estimated'}`), { cssW: 1200, cssH: 380 }));
      cv.toBlob((blob) => NA.download(`nystagmogram-${NA.stamp(it.when)}.png`, blob), 'image/png');
    }
  });
  const fx = (x) => (finite(x) ? x.toFixed(3) : '');

  /* ---------- 介面 ---------- */
  function updateButtons() {
    const isCam = source === 'camera', isFile = source === 'file';
    $('cam-stop').hidden = !isCam;
    $('rec').disabled = !active || !!rec || isFile;
    $('rec-stop').hidden = !rec;
    $('analyze-file').disabled = !isFile || !!rec;
    $('zero').disabled = !active;
    $('calib').disabled = !active;
  }
  function setSource(kind) {
    document.querySelectorAll('[data-src]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.src === kind)));
    $('src-cam').hidden = kind !== 'camera';
    $('src-file').hidden = kind !== 'file';
  }

  $('cond').innerHTML = CONDITIONS.map((c) => `<option value="${c.id}">${esc(c.zh)}</option>`).join('');
  $('cond').value = opt.cond;
  $('cond-custom').hidden = opt.cond !== 'custom';
  $('dur').value = String(opt.dur);
  $('scale').value = String(opt.scale);
  $('rate').value = String(opt.rate);
  $('mirror').checked = opt.mirror;
  $('flipped').checked = opt.flipped;
  document.querySelectorAll('[data-eye]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eye === opt.eye)));

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.src) setSource(b.dataset.src);
    if (b.dataset.eye) {
      opt.eye = b.dataset.eye; saveOpt();
      document.querySelectorAll('[data-eye]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }
  });
  $('cam-start').addEventListener('click', startCamera);
  $('cam-stop').addEventListener('click', () => { stopAll(); status('鏡頭已關閉。'); });
  $('cam').addEventListener('change', () => { if (source === 'camera') startCamera(); });
  $('file').addEventListener('change', (e) => openFile(e.target.files[0]));
  $('analyze-file').addEventListener('click', analyzeFile);
  $('rec').addEventListener('click', () => startRecording());
  $('rec-stop').addEventListener('click', finishRecording);
  $('zero').addEventListener('click', setZero);
  $('calib').addEventListener('click', runCalibration);
  $('cond').addEventListener('change', () => { opt.cond = $('cond').value; saveOpt(); $('cond-custom').hidden = opt.cond !== 'custom'; });
  $('dur').addEventListener('change', () => { opt.dur = Number($('dur').value); saveOpt(); });
  $('scale').addEventListener('change', () => { opt.scale = Number($('scale').value); saveOpt(); redrawAll(); });
  $('rate').addEventListener('change', () => { opt.rate = $('rate').value; saveOpt(); if (source === 'file') video.playbackRate = Number(opt.rate); });
  $('mirror').addEventListener('change', () => { opt.mirror = $('mirror').checked; saveOpt(); sizePreview(); });
  $('flipped').addEventListener('change', () => { opt.flipped = $('flipped').checked; saveOpt(); live.length = 0; apHist.length = 0; });
  window.addEventListener('resize', () => { if (!active) drawLive(CONFIG.liveWindow); });

  setSource('camera');
  updateButtons();
  updateCalState();
  sizePreview();
  drawLive(CONFIG.liveWindow);
  if (!window.isSecureContext) status('目前不是 https 網址，鏡頭無法使用；影片檔分析仍可使用。部署到 Netlify 或 GitHub Pages 後鏡頭就能用。', 'warn');
  else status('選擇「鏡頭」或「影片檔」開始。第一次使用會下載追蹤模型（約 4 MB）。');
})();
