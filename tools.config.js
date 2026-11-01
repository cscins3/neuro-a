/*
 * Neuro-A 工具登錄表
 * ------------------------------------------------------------
 * 首頁卡片與頂端「工具」選單都由這份清單產生。
 *
 * 新增工具：
 *   1. 複製 tools/template/ 成新資料夾，例如 tools/gcs/
 *   2. 在下面 tools 陣列加一筆，path 指向該資料夾
 *
 * 欄位：
 *   id      英文代號，不可重複
 *   name    顯示名稱（卡片大標）
 *   zh      中文名稱
 *   desc    一句話說明
 *   path    相對於網站根目錄的路徑，結尾加 /
 *   icon    圖示名稱，見 assets/js/neuro-a.js 的 ICONS；沒有就用 'tool'
 *   group   分組，需出現在下面 groups 陣列
 *   status  'ready' 可用 | 'beta' 試用中 | 'planned' 規劃中（卡片不能點）
 *   needs   選填，例如 ['camera']，卡片上會標示
 */
window.NeuroA = window.NeuroA || {};

NeuroA.site = {
  name: 'Neuro-A',
  tagline: '神經科臨床工具箱',
  version: '0.1.0'
};

NeuroA.groups = ['評估量表', '眼動檢查', '臨床作業'];

NeuroA.tools = [
  {
    id: 'nihss',
    name: 'NIHSS',
    zh: 'NIH 中風量表',
    desc: '15 項逐項圖示評分，含刺激圖卡、昏迷規則與病歷格式輸出。',
    path: 'tools/nihss/',
    icon: 'nihss',
    group: '評估量表',
    status: 'ready'
  },
  {
    id: 'crs-r',
    name: 'CRS-R',
    zh: '昏迷恢復量表修訂版',
    desc: '六個子量表階梯圖，自動判讀 UWS / MCS− / MCS+ / eMCS，可累積多次評估。',
    path: 'tools/crs-r/',
    icon: 'crsr',
    group: '評估量表',
    status: 'ready'
  },
  {
    id: 'okn',
    name: 'OKN',
    zh: '視動性眼振刺激',
    desc: '全螢幕移動條紋與 OKN 膠帶，可調方向、速度（°/s），並紀錄各方向反應。',
    path: 'tools/okn/',
    icon: 'okn',
    group: '眼動檢查',
    status: 'ready'
  },
  {
    id: 'nystagmus',
    name: 'Nystagmogram',
    zh: '攝影眼振圖',
    desc: '用鏡頭或影片追蹤虹膜，畫出眼位軌跡，估算快相方向、頻率與慢相速度。',
    path: 'tools/nystagmus/',
    icon: 'nystagmus',
    group: '眼動檢查',
    status: 'beta',
    needs: ['camera']
  },
  {
    id: 'med-list',
    name: '藥單整理',
    zh: '跨院所用藥整理',
    desc: '貼上藥名、劑量、頻次與院所，依院所分組輸出，並標示重複用藥。',
    path: 'tools/med-list/',
    icon: 'pill',
    group: '臨床作業',
    status: 'ready'
  }
];
