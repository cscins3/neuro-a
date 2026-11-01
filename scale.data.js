/*
 * 範本量表資料：Glasgow Coma Scale
 * ------------------------------------------------------------
 * 複製整個 tools/template/ 資料夾、改這個檔案，就是一個新的量表。
 * 欄位說明見 assets/js/scale-engine.js 開頭與 docs/新增工具.md。
 */
window.NeuroA = window.NeuroA || {};
NeuroA.data = NeuroA.data || {};

NeuroA.data.scale = {
  title: '昏迷指數',
  en: 'GCS',
  intro: '範本頁：示範只寫資料檔就能產生一個量表。分數為各項最佳反應。',
  items: [
    {
      id: 'E', code: 'E', title: '睜眼反應', en: 'Eye opening',
      options: [
        { s: 4, t: '自發睜眼', en: 'Spontaneous' },
        { s: 3, t: '聲音刺激睜眼', en: 'To sound' },
        { s: 2, t: '壓力刺激睜眼', en: 'To pressure' },
        { s: 1, t: '無反應', en: 'None' },
        { s: 'NT', t: '無法評估（例如眼瞼腫脹）', en: 'Not testable' }
      ]
    },
    {
      id: 'V', code: 'V', title: '語言反應', en: 'Verbal response',
      options: [
        { s: 5, t: '定向正確', en: 'Oriented' },
        { s: 4, t: '混亂', en: 'Confused' },
        { s: 3, t: '可說出字詞', en: 'Words' },
        { s: 2, t: '只能發出聲音', en: 'Sounds' },
        { s: 1, t: '無反應', en: 'None' },
        { s: 'NT', t: '無法評估（例如插管）', en: 'Not testable' }
      ]
    },
    {
      id: 'M', code: 'M', title: '運動反應', en: 'Motor response',
      options: [
        { s: 6, t: '遵從指令', en: 'Obeys commands' },
        { s: 5, t: '可定位', en: 'Localising' },
        { s: 4, t: '正常屈曲', en: 'Normal flexion' },
        { s: 3, t: '異常屈曲', en: 'Abnormal flexion' },
        { s: 2, t: '伸直', en: 'Extension' },
        { s: 1, t: '無反應', en: 'None' },
        { s: 'NT', t: '無法評估', en: 'Not testable' }
      ]
    }
  ],
  bands: [
    { max: 8, label: '重度', en: 'severe', tone: 'crit' },
    { max: 12, label: '中度', en: 'moderate', tone: 'warn' },
    { max: 15, label: '輕度', en: 'mild', tone: 'ok' }
  ],
  showMax: true,
  /* 自訂病歷文字（選填）。這裡輸出 E4V5M6 = 15 的慣用寫法；有 NT 時不加總。 */
  format(s) {
    const part = (k) => (s[k] === 'NT' ? (k === 'V' ? 'VT' : k + 'NT') : k + (s[k] == null ? '–' : s[k]));
    const nums = ['E', 'V', 'M'].map((k) => s[k]);
    const sum = nums.every((v) => typeof v === 'number') ? ` = ${nums.reduce((a, b) => a + b, 0)}` : '';
    return `GCS ${part('E')}${part('V')}${part('M')}${sum}`;
  }
};
