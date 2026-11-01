# Neuro-A

神經科臨床工具箱。純靜態網站：不需要安裝、不需要建置，放上 GitHub Pages 或 Netlify 就能用，手機、平板、電腦都可以開。

所有資料都在使用者的瀏覽器裡處理，不會上傳到任何伺服器。

## 工具

| 工具 | 路徑 | 說明 |
|---|---|---|
| NIHSS | `tools/nihss/` | 15 項逐項圖示評分；刺激圖卡（句子、字詞、命名）；1a = 3 時可一鍵套用昏迷預設分數；精簡或逐項英文病歷文字；本機紀錄 |
| CRS-R | `tools/crs-r/` | 六個子量表階梯圖；自動判讀 Coma / UWS / MCS− / MCS+ / eMCS 並列出依據；依個案代號累積多次評估，匯出 CSV |
| OKN | `tools/okn/` | 全螢幕條紋或 OKN 膠帶；方向、速度（°/s）、寬度可調；信用卡比對校正螢幕；各方向反應紀錄 |
| 攝影眼振圖 | `tools/nystagmus/` | 鏡頭或影片檔追蹤虹膜（MediaPipe），即時軌跡；錄製後分析快相方向、頻率、慢相速度；匯出 CSV 與圖檔 |
| 藥單整理 | `tools/med-list/` | 貼上藥名、劑量、頻次、院所，依院所分組輸出，標示重複用藥 |
| 範本 | `tools/template/` | 新工具範本（示範量表：GCS），不會出現在首頁 |

## 資料夾結構

```
neuro-a/
├── index.html                 首頁（工具卡片由 tools.config.js 自動產生）
├── manifest.webmanifest       加到手機主畫面用
├── netlify.toml               Netlify 設定（含鏡頭權限標頭）
├── assets/
│   ├── css/neuro-a.css        共用樣式與顏色
│   ├── js/tools.config.js     ★ 工具登錄表：新增工具改這裡
│   ├── js/neuro-a.js          共用功能：頁首選單、深淺色、複製、下載、本機儲存
│   ├── js/scale-engine.js     通用量表引擎（只寫資料檔就能做新量表）
│   └── img/                   圖示
├── tools/
│   ├── nihss/                 nihss.data.js ★ 文字內容　nihss.js 圖示與互動
│   ├── crs-r/                 crsr.data.js ★ 文字內容　crsr.js 判讀與紀錄
│   ├── okn/                   okn.js
│   ├── nystagmus/             nystagmus.js 追蹤與介面　nystagmus-analysis.js 訊號分析
│   ├── med-list/              med-list.js
│   └── template/              新工具範本
└── docs/
    └── 新增與編輯.md          新增工具、修改內容、自架模型的說明
```

標 ★ 的檔案是平常最可能要改的地方，詳見 [docs/新增與編輯.md](docs/新增與編輯.md)。

## 部署

### Netlify（建議）

1. 把這個資料夾推到 GitHub repo。
2. Netlify → Add new site → Import an existing project → 選這個 repo。
3. Build command 留空，Publish directory 填 `.`（`netlify.toml` 已經設定好）。
4. 之後每次 push，Netlify 會自動更新網站。

不想用 Git 也可以：Netlify 的 Deploys 頁面直接把整個資料夾拖進去。

### GitHub Pages

1. 推到 GitHub repo。
2. repo 的 Settings → Pages → Source 選 `Deploy from a branch`，branch 選 `main`，資料夾選 `/ (root)`。
3. 網址會是 `https://<帳號>.github.io/<repo 名稱>/`。

`.nojekyll` 已經放好，GitHub Pages 不會略過任何檔案。

### 在自己電腦上看

直接雙擊 `index.html` 就能開，大部分功能都能用。攝影眼振圖的鏡頭需要 `https` 或 `localhost`，要在本機測試可以：

```bash
cd neuro-a
python3 -m http.server 8000
# 打開 http://localhost:8000
```

## 外部資源

- 字型：Google Fonts（IBM Plex Sans、IBM Plex Mono、Noto Sans TC）。連不到時改用系統字型，功能不受影響。
- 攝影眼振圖：MediaPipe Tasks Vision 0.10.14（jsDelivr）與 Face Landmarker 模型（Google Cloud Storage）。院內網路擋外連時，可以改成自架，見 docs。

其他工具不需要任何外部資源。

## 資料與隱私

- 不使用任何伺服器或資料庫，沒有追蹤或分析程式。
- NIHSS、CRS-R 的「儲存」只存在該台裝置瀏覽器的 localStorage；清除瀏覽器資料就會消失，換裝置也看不到。重要資料請用 CSV 匯出。
- 標記與個案代號欄位請用不可識別病人的代碼。
- 攝影眼振圖的影像只在瀏覽器內處理，不會上傳；結果在重新整理頁面後消失。

## 免責聲明

本網站為臨床輔助工具，不是醫療器材，不取代正式評估與臨床判斷。量表內容以原始文獻與官方施測手冊為準。

## 參考

- NIH Stroke Scale：National Institute of Neurological Disorders and Stroke。
- Giacino JT, Kalmar K, Whyte J. The JFK Coma Recovery Scale–Revised. *Arch Phys Med Rehabil* 2004;85:2020–9.
- Thibaut A, et al. Minimally conscious state "plus": diagnostic criteria and relation to functional recovery. *J Neurol* 2020;267:1245–54.
- Wannez S, et al. The repetition of behavioral assessments in diagnosis of disorders of consciousness. *Ann Neurol* 2017;81:883–9.
