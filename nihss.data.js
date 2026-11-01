/*
 * NIHSS 內容資料（可直接編輯）
 * ------------------------------------------------------------
 * 文字改這裡就好，畫面會自動更新；不需要動 nihss.js。
 *
 * items[].fig     對應 nihss.js 裡的圖示函式名稱（不想要圖可刪掉這個欄位）
 * items[].figArg  傳給圖示函式的額外參數
 * options[].s     分數；'UN' 表示無法評估（不計入總分）
 * options[].t     中文說明（顯示在選項上）
 * options[].en    英文簡述（複製到病歷時使用）
 * hint            施測重點（點「施測說明」展開）
 *
 * stimuli         語言與構音項目用的刺激材料。
 *                 目前放的是原版英文句子與詞彙；若院內使用中文版，
 *                 直接把 sentences / words 換成中文版內容即可。
 */
window.NeuroA = window.NeuroA || {};
NeuroA.data = NeuroA.data || {};

NeuroA.data.nihss = {
  title: 'NIH Stroke Scale',
  severity: [
    { max: 0, label: '無中風症狀', en: 'No stroke symptoms', tone: 'ok' },
    { max: 4, label: '輕度', en: 'Minor', tone: 'ok' },
    { max: 15, label: '中度', en: 'Moderate', tone: 'warn' },
    { max: 20, label: '中重度', en: 'Moderate to severe', tone: 'crit' },
    { max: 42, label: '重度', en: 'Severe', tone: 'crit' }
  ],

  /* 1a = 3（昏迷）時，NIHSS 說明中明訂的預設分數 */
  comaDefaults: { '1b': 2, '1c': 2, '7': 0, '8': 2, '9': 3 },

  items: [
    {
      id: '1a', title: '意識程度', en: 'Level of Consciousness', chart: 'LOC',
      fig: 'loc',
      hint: '即使有氣管內管、語言隔閡、口腔外傷或包紮，仍必須選一個分數。只有在疼痛刺激下除了反射性姿勢外完全沒有動作時，才給 3 分。',
      options: [
        { s: 0, t: '清醒，反應敏銳', en: 'Alert' },
        { s: 1, t: '嗜睡，輕微刺激即可喚醒並遵從、回答或反應', en: 'Not alert, arousable by minor stimulation' },
        { s: 2, t: '需反覆刺激才能保持注意，或遲鈍、需強烈或疼痛刺激才有（非刻板）動作', en: 'Requires repeated/strong stimulation' },
        { s: 3, t: '只有反射性動作或自主神經反應，或完全無反應、軟癱、無反射', en: 'Reflex responses only / unresponsive' }
      ]
    },
    {
      id: '1b', title: '意識程度：提問', en: 'LOC Questions', chart: 'LOC questions',
      fig: 'tasks', figArg: ['現在幾月', '幾歲'],
      hint: '問現在的月份和病人年齡，答案必須完全正確，接近的答案不給分，也不能提示。只計第一次回答。失語或昏睡而無法理解問題者給 2 分；因氣管插管、口腔外傷、任何原因的嚴重構音障礙、語言隔閡等非失語原因而無法說話者給 1 分。',
      options: [
        { s: 0, t: '兩題都答對', en: 'Both correct' },
        { s: 1, t: '答對一題', en: 'One correct' },
        { s: 2, t: '兩題都答錯', en: 'Neither correct' }
      ]
    },
    {
      id: '1c', title: '意識程度：指令', en: 'LOC Commands', chart: 'LOC commands',
      fig: 'tasks', figArg: ['睜眼閉眼', '握拳放開'],
      hint: '請病人睜眼再閉眼，然後用非癱瘓側的手握拳再放開。有明確嘗試但因無力未完成仍算正確。對口頭指令無反應時可示範（pantomime）。只計第一次嘗試。',
      options: [
        { s: 0, t: '兩項都正確完成', en: 'Both tasks correct' },
        { s: 1, t: '完成一項', en: 'One task correct' },
        { s: 2, t: '兩項都未完成', en: 'Neither task correct' }
      ]
    },
    {
      id: '2', title: '最佳凝視', en: 'Best Gaze', chart: 'Gaze',
      fig: 'gaze',
      hint: '只測水平眼球運動。可用自主或反射性（頭眼反射）眼動評估，不做冷水試驗。可被克服的共軛偏移給 1 分。單一周邊動眼神經麻痺（III、IV 或 VI）給 1 分。',
      options: [
        { s: 0, t: '正常', en: 'Normal' },
        { s: 1, t: '部分凝視麻痺：單眼或雙眼凝視異常，但沒有強迫偏移或完全凝視麻痺', en: 'Partial gaze palsy' },
        { s: 2, t: '強迫偏移，或完全凝視麻痺且頭眼反射無法克服', en: 'Forced deviation / total gaze paresis' }
      ]
    },
    {
      id: '3', title: '視野', en: 'Visual', chart: 'Visual',
      fig: 'field',
      hint: '以對照法測上下象限，可用數手指或視覺威脅。明確不對稱（含象限盲）給 1 分。任何原因的全盲給 3 分。接著做雙側同時刺激，若有 extinction 給 1 分，並把結果用在第 11 項。',
      options: [
        { s: 0, t: '無視野缺損', en: 'No visual loss' },
        { s: 1, t: '部分偏盲', en: 'Partial hemianopia' },
        { s: 2, t: '完全偏盲', en: 'Complete hemianopia' },
        { s: 3, t: '雙側偏盲（全盲，含皮質盲）', en: 'Bilateral hemianopia' }
      ]
    },
    {
      id: '4', title: '面部麻痺', en: 'Facial Palsy', chart: 'Facial palsy',
      fig: 'face',
      hint: '請病人露齒、抬眉、用力閉眼（可示範）。反應差或無法理解者，以疼痛刺激觀察表情的對稱性。',
      options: [
        { s: 0, t: '動作正常對稱', en: 'Normal' },
        { s: 1, t: '輕微麻痺：鼻唇溝變平、微笑時不對稱', en: 'Minor paralysis' },
        { s: 2, t: '部分麻痺：下半臉完全或接近完全麻痺', en: 'Partial paralysis' },
        { s: 3, t: '完全麻痺：單側或雙側上下臉都沒有動作', en: 'Complete paralysis' }
      ]
    },
    {
      id: '5a', title: '上肢運動・左', en: 'Motor Arm — Left', chart: 'Motor arm L',
      fig: 'arm',
      hint: '掌心向下，坐姿舉到 90°、仰臥舉到 45°，數 10 秒。從非癱瘓側開始，每側分開評估。',
      options: [
        { s: 0, t: '無偏移：維持 90°（或 45°）滿 10 秒', en: 'No drift' },
        { s: 1, t: '偏移：10 秒內下垂，但沒碰到床或支撐物', en: 'Drift' },
        { s: 2, t: '部分抗重力：無法舉到或維持角度，落到床上但有抗重力的努力', en: 'Some effort against gravity' },
        { s: 3, t: '無法抗重力，肢體直接落下', en: 'No effort against gravity' },
        { s: 4, t: '完全沒有動作', en: 'No movement' },
        { s: 'UN', t: '截肢或關節融合（請註明）', en: 'Amputation / joint fusion' }
      ]
    },
    {
      id: '5b', title: '上肢運動・右', en: 'Motor Arm — Right', chart: 'Motor arm R',
      fig: 'arm', sameAs: '5a'
    },
    {
      id: '6a', title: '下肢運動・左', en: 'Motor Leg — Left', chart: 'Motor leg L',
      fig: 'leg',
      hint: '仰臥，把腿抬到 30°，數 5 秒。每側分開評估。',
      options: [
        { s: 0, t: '無偏移：維持 30° 滿 5 秒', en: 'No drift' },
        { s: 1, t: '偏移：5 秒內下垂，但沒碰到床', en: 'Drift' },
        { s: 2, t: '部分抗重力：5 秒內落到床上，但有抗重力的努力', en: 'Some effort against gravity' },
        { s: 3, t: '無法抗重力，立即落到床上', en: 'No effort against gravity' },
        { s: 4, t: '完全沒有動作', en: 'No movement' },
        { s: 'UN', t: '截肢或關節融合（請註明）', en: 'Amputation / joint fusion' }
      ]
    },
    {
      id: '6b', title: '下肢運動・右', en: 'Motor Leg — Right', chart: 'Motor leg R',
      fig: 'leg', sameAs: '6a'
    },
    {
      id: '7', title: '肢體運動失調', en: 'Limb Ataxia', chart: 'Limb ataxia',
      fig: 'ataxia',
      hint: '雙側做指鼻與跟膝脛測試，睜眼進行；有視野缺損時在完好的視野內測。只有在失調程度明顯超過無力時才計分。無法理解指令或癱瘓者給 0 分。',
      options: [
        { s: 0, t: '無', en: 'Absent' },
        { s: 1, t: '一個肢體有', en: 'Present in one limb' },
        { s: 2, t: '兩個肢體有', en: 'Present in two limbs' },
        { s: 'UN', t: '截肢或關節融合（請註明）', en: 'Amputation / joint fusion' }
      ]
    },
    {
      id: '8', title: '感覺', en: 'Sensory', chart: 'Sensory',
      fig: 'sensory',
      hint: '用針刺測試，只計與中風相關的感覺缺失，測多處（手臂、腿、軀幹、臉）以確認半側感覺缺失。昏迷（1a = 3）自動給 2 分；腦幹中風雙側感覺喪失給 2 分；無反應且四肢癱瘓給 2 分。',
      options: [
        { s: 0, t: '正常，無感覺缺失', en: 'Normal' },
        { s: 1, t: '輕到中度：患側針刺感較鈍，或失去淺層痛覺但仍知道被碰觸', en: 'Mild-to-moderate loss' },
        { s: 2, t: '重度到完全：不知道臉、手臂、腿被碰觸', en: 'Severe to total loss' }
      ]
    },
    {
      id: '9', title: '最佳語言', en: 'Best Language', chart: 'Language',
      fig: 'language',
      hint: '請病人描述圖片、命名圖卡、朗讀句子（見「刺激圖卡」）。插管者請其書寫。昏迷（1a = 3）自動給 3 分。',
      stimuli: ['sentences', 'naming'],
      options: [
        { s: 0, t: '無失語，正常', en: 'No aphasia' },
        { s: 1, t: '輕到中度失語：流暢度或理解力明顯下降，但表達的意念與形式沒有明顯受限', en: 'Mild-to-moderate aphasia' },
        { s: 2, t: '嚴重失語：溝通都是片段，聽者需大量推測、詢問與猜測', en: 'Severe aphasia' },
        { s: 3, t: '啞口、全面失語：沒有可用的語言或聽理解', en: 'Mute / global aphasia' }
      ]
    },
    {
      id: '10', title: '構音障礙', en: 'Dysarthria', chart: 'Dysarthria',
      fig: 'dysarthria',
      hint: '請病人朗讀或複誦字詞表（見「刺激圖卡」）。嚴重失語者以自發語言的清晰度評估。不要告訴病人為什麼要測試。',
      stimuli: ['words'],
      options: [
        { s: 0, t: '正常', en: 'Normal' },
        { s: 1, t: '輕到中度：部分字詞含糊，最差時仍可勉強理解', en: 'Mild-to-moderate dysarthria' },
        { s: 2, t: '重度：含糊到無法理解（與失語不成比例），或啞口、無法構音', en: 'Severe dysarthria' },
        { s: 'UN', t: '插管或其他物理障礙（請註明）', en: 'Intubated / physical barrier' }
      ]
    },
    {
      id: '11', title: '忽略與消失', en: 'Extinction and Inattention', chart: 'Extinction/inattention',
      fig: 'extinction',
      hint: '前面各項通常已提供足夠資訊。嚴重視力缺損但皮膚刺激正常者算正常。失語但看起來能注意兩側者算正常。有視覺空間忽略或病覺缺失（anosognosia）可作為異常的證據。',
      options: [
        { s: 0, t: '無異常', en: 'No abnormality' },
        { s: 1, t: '單一感覺模式的忽略，或雙側同時刺激時出現 extinction（視、觸、聽、空間或自身）', en: 'Inattention/extinction, one modality' },
        { s: 2, t: '嚴重偏側忽略或多種感覺模式的 extinction；不認得自己的手或只注意一側空間', en: 'Profound hemi-inattention' }
      ]
    }
  ],

  stimuli: {
    sentences: {
      title: '朗讀句子',
      note: '請病人朗讀以下句子（第 9 項）。',
      lines: [
        'You know how.',
        'Down to earth.',
        'I got home from work.',
        'Near the table in the dining room.',
        'They heard him speak on the radio last night.'
      ]
    },
    words: {
      title: '字詞表',
      note: '請病人朗讀或複誦（第 10 項）。',
      lines: ['MAMA', 'TIP – TOP', 'FIFTY – FIFTY', 'THANKS', 'HUCKLEBERRY', 'BASEBALL PLAYER']
    },
    naming: {
      title: '命名圖卡',
      note: '請病人說出每個物品的名稱（第 9 項）。圖片描述請使用正式 NIHSS 圖卡。',
      items: [
        { id: 'glove', zh: '手套', en: 'glove' },
        { id: 'key', zh: '鑰匙', en: 'key' },
        { id: 'cactus', zh: '仙人掌', en: 'cactus' },
        { id: 'chair', zh: '椅子', en: 'chair' },
        { id: 'hammock', zh: '吊床', en: 'hammock' },
        { id: 'feather', zh: '羽毛', en: 'feather' }
      ]
    }
  }
};
