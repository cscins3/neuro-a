/*
 * 眼振訊號分析（純計算，不碰畫面；可在 Node 測試）
 * ------------------------------------------------------------
 * 輸入：[{ t: 秒, h: 水平角度(°，右為正), v: 垂直角度(°，上為正) }]，可含 NaN（眨眼、追蹤失敗）
 * 流程：
 *   1. 重新取樣成等間隔（短缺口線性內插，超過 maxGap 的缺口保留為 NaN）
 *   2. 3 點中位數濾波去除單格雜訊
 *   3. 中央差分求速度；|速度| 超過門檻的連續樣本視為快相
 *   4. 快相之間的片段為慢相，以線性迴歸斜率估計慢相速度（SPV）
 *   5. 另以頻譜（1–8 Hz）找主要振盪頻率，用來提示可能的擺動型（pendular）眼振
 * 方向命名依快相方向：水平 + = 右跳（right-beating），垂直 + = 上跳（up-beating）
 */
(function (root) {
  const A = {};

  A.defaults = {
    fs: 0,              // 0 = 依輸入的平均取樣率
    maxGap: 0.12,       // 秒；較長的缺口不內插
    stepWin: 0.067,     // 秒；比較前後各這麼長的平均位置來偵測快相（30 fps 約 2 格）
    madK: 5,            // 門檻 = max(minFastAmp, |median| + madK × MAD)，單位為度
    minFastAmp: 0.6,    // °；快相最小幅度
    maxFastDur: 0.2,    // 秒；超過的高速段不算快相（多半是掃視或頭動）
    minSlowDur: 0.08,   // 秒；慢相片段最短長度
    minBeats: 5,        // 判定為眼振的最少拍數
    minRate: 0.3,       // 拍／秒
    minConsistency: 0.7,// 同方向快相所占比例
    minSpv: 1.0,        // °/s；慢相速度低於此值不判定為跳型眼振
    pendularRatio: 25,  // 頻譜主峰／平均功率，超過才提示擺動型振盪
    pendularRms: 0.4,   // °；振盪 RMS 下限
    minSlowAgree: 0.7,  // 慢相方向與快相相反的片段比例
    maxChance: 0.05     // 快相／慢相方向一致性由隨機雜訊造成的機率上限（兩者都要低於）
  };

  const finite = (a) => Array.prototype.filter.call(a, Number.isFinite);
  const median = (arr) => {
    const a = finite(arr).slice().sort((x, y) => x - y);
    if (!a.length) return NaN;
    const m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const mean = (arr) => { const a = finite(arr); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN; };
  A.median = median;

  A.estimateFs = function (samples) {
    const dts = [];
    for (let i = 1; i < samples.length; i++) {
      const d = samples[i].t - samples[i - 1].t;
      if (d > 0 && d < 0.5) dts.push(d);
    }
    const m = median(dts);
    return Number.isFinite(m) && m > 0 ? 1 / m : 30;
  };

  A.resample = function (samples, fs, maxGap) {
    if (!samples.length) return { t: [], h: [], v: [], fs };
    const valid = samples.filter((x) => Number.isFinite(x.t) && Number.isFinite(x.h) && Number.isFinite(x.v));
    const t0 = samples[0].t, t1 = samples[samples.length - 1].t;
    const n = Math.max(0, Math.floor((t1 - t0) * fs + 1e-9) + 1);
    const T = new Float64Array(n), H = new Float64Array(n).fill(NaN), V = new Float64Array(n).fill(NaN);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i / fs;
      T[i] = i / fs;
      if (valid.length < 2) continue;
      while (j < valid.length - 2 && valid[j + 1].t <= t) j++;
      const a = valid[j], b = valid[j + 1];
      if (t < a.t - 1e-9 || t > b.t + 1e-9 || b.t - a.t > maxGap) {
        if (Math.abs(a.t - t) < 1e-6) { H[i] = a.h; V[i] = a.v; }
        else if (Math.abs(b.t - t) < 1e-6) { H[i] = b.h; V[i] = b.v; }
        continue;
      }
      const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      H[i] = a.h + f * (b.h - a.h);
      V[i] = a.v + f * (b.v - a.v);
    }
    return { t: T, h: H, v: V, fs };
  };

  A.median3 = function (x) {
    const y = Float64Array.from(x);
    for (let i = 1; i < x.length - 1; i++) {
      const a = x[i - 1], b = x[i], c = x[i + 1];
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) y[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
    return y;
  };

  A.velocity = function (x, fs) {
    const v = new Float64Array(x.length).fill(NaN);
    for (let i = 1; i < x.length - 1; i++) {
      if (Number.isFinite(x[i + 1]) && Number.isFinite(x[i - 1])) v[i] = (x[i + 1] - x[i - 1]) * fs / 2;
    }
    return v;
  };

  function binomTail(n, m) {
    if (!n) return 1;
    let p = 0, c = 1;
    for (let j = 0; j <= n; j++) {
      if (j > 0) c = c * (n - j + 1) / j;
      if (j >= m) p += c;
    }
    return Math.min(1, 2 * p / Math.pow(2, n));
  }

  function slope(x, i0, i1, fs) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = i0; i <= i1; i++) {
      if (!Number.isFinite(x[i])) return NaN;
      const t = i / fs;
      n++; sx += t; sy += x[i]; sxx += t * t; sxy += t * x[i];
    }
    const d = n * sxx - sx * sx;
    return n >= 3 && d !== 0 ? (n * sxy - sx * sy) / d : NaN;
  }

  /* 單一軸：找快相與慢相 */
  A.analyzeAxis = function (raw, fs, o) {
    const x = A.median3(raw);
    const vel = A.velocity(x, fs);
    const n = x.length;
    /* 步階統計量：d[i] = 第 i 格之後 k 格的平均 − 之前 k 格（含 i）的平均。
       快相在 d 上是一個明顯的峰；慢相只造成小的偏移（由中位數扣除）。 */
    const k = Math.max(2, Math.round(o.stepWin * fs));
    const avg = (a, b) => {
      let s = 0;
      for (let m = a; m <= b; m++) { if (!Number.isFinite(x[m])) return NaN; s += x[m]; }
      return s / (b - a + 1);
    };
    const d = new Float64Array(n).fill(NaN);
    for (let i = k - 1; i < n - k; i++) d[i] = avg(i + 1, i + k) - avg(i - k + 1, i);
    const dv = finite(d);
    const med = median(dv);
    /* 雜訊估計用二階差分：可消去慢相的線性漂移，快相只影響少數樣本，中位數不受影響 */
    const d2 = [];
    for (let m = 1; m < n - 1; m++) if (Number.isFinite(x[m - 1]) && Number.isFinite(x[m]) && Number.isFinite(x[m + 1])) d2.push(x[m + 1] - 2 * x[m] + x[m - 1]);
    const m2 = median(d2);
    const sigma = median(d2.map((y) => Math.abs(y - m2))) * 1.4826 / Math.sqrt(6);
    const sd = (Number.isFinite(sigma) ? sigma : 0) * Math.sqrt(2 / k);
    const thr = Math.max(o.minFastAmp, o.madK * sd);
    const dd = Array.from(d, (y) => (Number.isFinite(y) ? y - med : NaN));
    const events = [];
    let i = 0;
    while (i < n) {
      if (Number.isFinite(dd[i]) && Math.abs(dd[i]) > thr) {
        const sgn = Math.sign(dd[i]);
        let j = i, best = i;
        while (j + 1 < n && Number.isFinite(dd[j + 1]) && Math.sign(dd[j + 1]) === sgn && Math.abs(dd[j + 1]) > thr * 0.5) {
          j++;
          if (Math.abs(dd[j]) > Math.abs(dd[best])) best = j;
        }
        /* 以峰值位置為中心，快相起訖取前後 k 格內的位置極值 */
        const a = Math.max(0, best - k + 1), b = Math.min(n - 1, best + k);
        const amp = avg(best + 1, Math.min(n - 1, best + k)) - avg(Math.max(0, best - k + 1), best);
        const dur = (j - i + 1) / fs;
        let peak = 0;
        for (let m = a; m <= b; m++) if (Number.isFinite(vel[m]) && Math.abs(vel[m]) > Math.abs(peak)) peak = vel[m];
        if (Number.isFinite(amp) && Math.abs(amp) >= o.minFastAmp && Math.sign(amp) === sgn && dur <= o.maxFastDur + 2 * k / fs) {
          const ev = { i0: best, i1: best + 1, t: (best + 0.5) / fs, dir: sgn, amp, peakVel: peak };
          const prev = events[events.length - 1];
          /* 同方向且相距太近（< 2k 格或 0.1 秒）視為同一個快相 */
          if (prev && prev.dir === sgn && best - prev.i0 < Math.max(2 * k, Math.round(0.1 * fs))) {
            if (Math.abs(amp) > Math.abs(prev.amp)) events[events.length - 1] = ev;
          } else events.push(ev);
        }
        i = j + 1;
      } else i++;
    }
    const slow = [];
    const minLen = Math.max(3, Math.round(o.minSlowDur * fs));
    const margin = Math.max(1, Math.round(0.035 * fs));
    for (let e = 0; e < events.length - 1; e++) {
      const s0 = events[e].i1 + margin, s1 = events[e + 1].i0 - margin;
      if (s1 - s0 + 1 < minLen) continue;
      const sl = slope(raw, s0, s1, fs);
      if (Number.isFinite(sl)) slow.push({ i0: s0, i1: s1, spv: sl });
    }

    const validN = finite(x).length;
    const validDur = validN / fs;
    const pos = events.filter((e) => e.dir > 0).length;
    const neg = events.length - pos;
    const domDir = pos >= neg ? 1 : -1;
    const consistency = events.length ? Math.max(pos, neg) / events.length : 0;
    const rate = validDur > 0 ? events.length / validDur : 0;
    const domEvents = events.filter((e) => e.dir === domDir);
    const spvMed = median(slow.map((s) => s.spv));
    const slowAgree = slow.length ? slow.filter((s) => Math.sign(s.spv) === -domDir).length / slow.length : 0;
    /* 快相方向一致性是否可能只是巧合：雙尾二項檢定（p = 0.5） */
    const pChance = binomTail(events.length, Math.max(pos, neg));
    const pSlow = binomTail(slow.length, Math.round(slowAgree * slow.length));
    const ampMean = mean(domEvents.map((e) => Math.abs(e.amp)));

    const jerk = events.length >= o.minBeats && rate >= o.minRate && consistency >= o.minConsistency &&
      Number.isFinite(spvMed) && Math.sign(spvMed) === -domDir && Math.abs(spvMed) >= o.minSpv && slowAgree >= o.minSlowAgree && pChance < o.maxChance && pSlow < o.maxChance;

    /* 頻譜：找 1–8 Hz 的主峰（缺口以 0 填補，先去平均與線性趨勢） */
    const spec = A.spectralPeak(x, fs);
    const rms = (() => {
      const m = mean(x);
      const a = finite(x).map((y) => (y - m) * (y - m));
      return a.length ? Math.sqrt(a.reduce((s, y) => s + y, 0) / a.length) : NaN;
    })();
    const pendular = !jerk && !!spec && spec.freq >= 1.5 && spec.ratio > o.pendularRatio && rms > o.pendularRms;

    return {
      thr, events, slow, vel, x,
      beats: events.length, pos, neg, rate, consistency, slowAgree, pChance, pSlow, domDir,
      spv: Number.isFinite(spvMed) ? spvMed : NaN,
      spvAbs: Number.isFinite(spvMed) ? Math.abs(spvMed) : NaN,
      amp: ampMean,
      jerk, pendular, spec, rms, validDur,
      meanPos: mean(x)
    };
  };

  A.spectralPeak = function (x, fs) {
    const idx = [], val = [];
    for (let i = 0; i < x.length; i++) if (Number.isFinite(x[i])) { idx.push(i); val.push(x[i]); }
    if (val.length < fs * 2) return null;
    const n = val.length, mi = mean(idx), mv = mean(val);
    let num = 0, den = 0;
    for (let k = 0; k < n; k++) { num += (idx[k] - mi) * (val[k] - mv); den += (idx[k] - mi) * (idx[k] - mi); }
    const b = den ? num / den : 0;
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = Number.isFinite(x[i]) ? x[i] - mv - b * (i - mi) : 0;
    const fMax = Math.min(8, fs / 2 - 0.5);
    let best = null, total = 0, cnt = 0;
    for (let f = 1; f <= fMax; f += 0.05) {
      let re = 0, im = 0;
      const w = 2 * Math.PI * f / fs;
      for (let i = 0; i < y.length; i++) { re += y[i] * Math.cos(w * i); im -= y[i] * Math.sin(w * i); }
      const p = re * re + im * im;
      total += p; cnt++;
      if (!best || p > best.p) best = { f, p };
    }
    return best ? { freq: best.f, ratio: cnt ? best.p / (total / cnt) : 0 } : null;
  };

  A.analyze = function (samples, opts) {
    const o = Object.assign({}, A.defaults, opts || {});
    if (!samples || samples.length < 4) return null;
    const fs = o.fs || Math.min(120, Math.max(10, Math.round(A.estimateFs(samples))));
    const r = A.resample(samples, fs, o.maxGap);
    const validFrac = finite(r.h).length / Math.max(1, r.h.length);
    return {
      fs,
      duration: r.t.length / fs,
      validFrac,
      t: r.t,
      h: A.analyzeAxis(r.h, fs, o),
      v: A.analyzeAxis(r.v, fs, o)
    };
  };

  const DIRN = { h: { 1: 'right', '-1': 'left' }, v: { 1: 'up', '-1': 'down' } };
  const DIRZH = { h: { 1: '右', '-1': '左' }, v: { 1: '上', '-1': '下' } };
  const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '–');

  A.describeAxis = function (ax, key, lang) {
    const zh = lang === 'zh';
    if (ax.jerk) {
      const d = zh ? DIRZH[key][ax.domDir] : DIRN[key][ax.domDir];
      return zh
        ? `${d}跳型眼振，${f1(ax.rate)} 拍/秒，慢相速度 ${f1(ax.spvAbs)}°/s，快相幅度 ${f1(ax.amp)}°（${ax.beats} 拍）`
        : `${d}-beating, ${f1(ax.rate)} beats/s, mean SPV ${f1(ax.spvAbs)}°/s, fast-phase amplitude ${f1(ax.amp)}° (${ax.beats} beats)`;
    }
    if (ax.pendular) {
      return zh
        ? `未見跳型眼振；有約 ${f1(ax.spec.freq)} Hz 的規律振盪（RMS ${f1(ax.rms)}°），請以影像確認是否為擺動型眼振`
        : `no jerk nystagmus; regular ~${f1(ax.spec.freq)} Hz oscillation (RMS ${f1(ax.rms)}°), check video for pendular nystagmus`;
    }
    if (ax.beats >= 3) {
      return zh
        ? `未見一致的跳型眼振（${ax.beats} 次快速眼動，方向不一致或不符合慢相）`
        : `no consistent jerk nystagmus (${ax.beats} fast movements, inconsistent direction or slow phase)`;
    }
    return zh ? '未偵測到眼振' : 'no nystagmus detected';
  };

  A.summary = function (res, meta, lang) {
    const zh = lang === 'zh';
    const m = meta || {};
    const head = zh
      ? `攝影眼振圖（${m.condition || '未標記'}，${f1(res.duration)} 秒，${Math.round(res.fs)} Hz，有效 ${Math.round(res.validFrac * 100)}%${m.calibrated ? '，已校正' : '，角度為估計值'}）`
      : `Video nystagmogram (${m.conditionEn || m.condition || 'unlabeled'}, ${f1(res.duration)} s, ${Math.round(res.fs)} Hz, ${Math.round(res.validFrac * 100)}% valid${m.calibrated ? ', calibrated' : ', angles estimated'}${m.eye ? ', ' + m.eye : ''})`;
    return zh
      ? `${head}\n水平：${A.describeAxis(res.h, 'h', 'zh')}\n垂直：${A.describeAxis(res.v, 'v', 'zh')}`
      : `${head}\nHorizontal: ${A.describeAxis(res.h, 'h')}\nVertical: ${A.describeAxis(res.v, 'v')}`;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = A;
  else { root.NeuroA = root.NeuroA || {}; root.NeuroA.nystagmus = A; }
})(typeof window !== 'undefined' ? window : globalThis);
