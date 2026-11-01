/*
 * CRS-R 內容資料（可直接編輯）
 * ------------------------------------------------------------
 * Coma Recovery Scale–Revised（Giacino, Kalmar & Whyte, 2004）
 *
 * levels 由高分排到低分。每一級：
 *   s     分數
 *   en    英文原名（病歷輸出用）
 *   zh    中文名稱
 *   cat   'reflex'（反射性／非意識行為） | 'mcs'（MCS 指標） | 'emcs'（脫離 MCS 指標）
 *   plus  true 表示屬於 MCS+ 的語言相關行為
 *   hint  簡要施測提示；完整流程請依 CRS-R Administration and Scoring Guidelines
 *
 * 診斷判讀（在 crsr.js）：
 *   任一子量表達到 emcs 等級 → eMCS
 *   否則任一達到 plus 等級   → MCS+
 *   否則任一達到 mcs 等級    → MCS−
 *   否則                     → UWS / VS（Arousal 0 時顯示符合昏迷表現）
 * MCS+ 的定義依 Thibaut et al., J Neurol 2020；如院內採用不同定義，改 plus 欄位即可。
 */
window.NeuroA = window.NeuroA || {};
NeuroA.data = NeuroA.data || {};

NeuroA.data.crsr = {
  title: 'Coma Recovery Scale–Revised',
  subscales: [
    {
      id: 'auditory', code: 'A', zh: '聽覺', en: 'Auditory', icon: 'ear',
      levels: [
        { s: 4, en: 'Consistent movement to command', zh: '持續遵從指令', cat: 'mcs', plus: true, hint: '指令遵從流程中所有試次都正確。' },
        { s: 3, en: 'Reproducible movement to command', zh: '可重複遵從指令', cat: 'mcs', plus: true, hint: '任一眼動或肢體指令，4 次試驗中至少 3 次明確正確。' },
        { s: 2, en: 'Localization to sound', zh: '聲音定位', cat: 'reflex', hint: '頭或眼轉向聲源。' },
        { s: 1, en: 'Auditory startle', zh: '聽覺驚嚇反應', cat: 'reflex', hint: '突然的聲響後立即眨眼或眼瞼顫動。' },
        { s: 0, en: 'None', zh: '無', cat: 'reflex' }
      ]
    },
    {
      id: 'visual', code: 'V', zh: '視覺', en: 'Visual', icon: 'eye',
      levels: [
        { s: 5, en: 'Object recognition', zh: '物品辨識', cat: 'mcs', plus: true, hint: '依指令看向或指出指定的物品。' },
        { s: 4, en: 'Object localization: reaching', zh: '物品定位：伸手', cat: 'mcs', hint: '伸手朝向物品的方向。' },
        { s: 3, en: 'Visual pursuit', zh: '視覺追蹤', cat: 'mcs', hint: '眼睛跟隨移動的鏡子 45° 而不失去固視，任一方向 4 次中 2 次。' },
        { s: 2, en: 'Fixation', zh: '固視', cat: 'mcs', hint: '眼睛轉向新目標並固視超過 2 秒。' },
        { s: 1, en: 'Visual startle', zh: '視覺驚嚇反應', cat: 'reflex', hint: '視覺威脅時眨眼。' },
        { s: 0, en: 'None', zh: '無', cat: 'reflex' }
      ]
    },
    {
      id: 'motor', code: 'M', zh: '運動', en: 'Motor', icon: 'hand',
      levels: [
        { s: 6, en: 'Functional object use', zh: '功能性使用物品', cat: 'emcs', hint: '正確使用兩種不同的物品（例如梳子、杯子）。' },
        { s: 5, en: 'Automatic motor response', zh: '自動化動作反應', cat: 'mcs', hint: '自發的習慣性動作，例如抓鼻子、抓床欄、揮手。' },
        { s: 4, en: 'Object manipulation', zh: '操作物品', cat: 'mcs', hint: '抓握並持握物品。' },
        { s: 3, en: 'Localization to noxious stimulation', zh: '痛刺激定位', cat: 'mcs', hint: '未受刺激的肢體移向並碰觸受刺激的部位。' },
        { s: 2, en: 'Flexion withdrawal', zh: '屈曲退縮', cat: 'reflex', hint: '痛刺激時肢體屈曲退縮。' },
        { s: 1, en: 'Abnormal posturing', zh: '異常姿勢', cat: 'reflex', hint: '去皮質或去大腦姿勢。' },
        { s: 0, en: 'None / flaccid', zh: '無／軟癱', cat: 'reflex' }
      ]
    },
    {
      id: 'oromotor', code: 'O', zh: '口語', en: 'Oromotor/Verbal', icon: 'mouth',
      levels: [
        { s: 3, en: 'Intelligible verbalization', zh: '可理解的言語', cat: 'mcs', plus: true, hint: '說出可辨識的字詞。' },
        { s: 2, en: 'Vocalization / oral movement', zh: '發聲／口部動作', cat: 'reflex', hint: '非反射性的發聲或口部動作。' },
        { s: 1, en: 'Oral reflexive movement', zh: '口部反射動作', cat: 'reflex', hint: '咬合、吸吮等反射動作。' },
        { s: 0, en: 'None', zh: '無', cat: 'reflex' }
      ]
    },
    {
      id: 'communication', code: 'C', zh: '溝通', en: 'Communication', icon: 'talk',
      levels: [
        { s: 2, en: 'Functional: accurate', zh: '功能性：正確', cat: 'emcs', hint: '情境定向是非題全部答對（6/6）。' },
        { s: 1, en: 'Non-functional: intentional', zh: '非功能性：有意圖', cat: 'mcs', plus: true, hint: '有可辨識的是非回應，不論對錯。' },
        { s: 0, en: 'None', zh: '無', cat: 'reflex' }
      ]
    },
    {
      id: 'arousal', code: 'Ar', zh: '清醒度', en: 'Arousal', icon: 'sun',
      levels: [
        { s: 3, en: 'Attention', zh: '專注', cat: 'reflex', hint: '整個評估過程中很少需要語言提示來維持反應。' },
        { s: 2, en: 'Eye opening without stimulation', zh: '無刺激下睜眼', cat: 'reflex' },
        { s: 1, en: 'Eye opening with stimulation', zh: '刺激後睜眼', cat: 'reflex' },
        { s: 0, en: 'Unarousable', zh: '無法喚醒', cat: 'reflex' }
      ]
    }
  ],

  notes: [
    '單次評估的誤診率高。Wannez et al.（Ann Neurol 2017）建議在短期內重複評估至少 5 次，取最佳反應作為診斷依據。',
    '評估中若病人無法維持睜眼或明顯警覺度下降，可執行 Arousal Facilitation Protocol 後再繼續。',
    '每個子量表記錄所觀察到的最高等級。'
  ]
};
