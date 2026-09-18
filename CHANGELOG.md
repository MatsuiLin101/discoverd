# Changelog

本專案的所有重要變更皆記錄於此檔案。
格式參考 [Keep a Changelog](https://keepachangelog.com/)，版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [1.5.0] - 2026-09-19

全站 SEO 優化：結構化資料、meta／OG、sitemap、相關行程內部連結、前台資料快取，以及後台「SEO 設定」頁。

### ✨ 新功能

- **後台「SEO 設定」頁**（所有登入者可用）：品牌名稱、預設網站標題／描述、預設 OG 分享圖上傳、Google Search Console 驗證碼、公司資訊（電話／地址／價格範圍）、「相關行程」顯示開關。
- **相關行程推薦**：行程頁自動列出同地區其他行程（同子地區優先、排除自己），置於圖片／PDF 捲動內容末端以強化站內連結；可於後台開關。
- **結構化資料（JSON-LD）**：全站 `TravelAgency`（含社群 `sameAs`、電話、地址、價格範圍、圖片）與 `WebSite`（含站內搜尋 `SearchAction`）；行程頁 `Product`（含 TWD 價格）與 `BreadcrumbList`；地區／子地區 `BreadcrumbList`。

### 🔧 SEO 強化

- 每頁單一 `h1`（首頁、地區、子地區）。
- `canonical`：首頁、地區、子地區（行程頁沿用 ProductID）。
- `sitemap` 每筆加入 `lastModified`。
- Twitter `summary_large_image` 卡片（各頁沿用自身標題／描述／OG 圖）。
- 站台級預設 OG 圖（可後台上傳，內建 1200×630 墊底圖）與品牌／標題／描述預設值（可後台覆蓋，留空用內建值）。
- 自動描述斷句與空白正規化、標題縮短品牌後綴；OG 圖在無圖時 fallback 到站台預設圖。
- `www` → 非-www 由 Cloudflare 301 轉址（正式站設定）。

### ⚡ 效能

- 前台讀取（行程／地區／搜尋／輪播／站台設定／sitemap）以 `unstable_cache` + 標籤快取,後台儲存時以 `revalidateTag` 即時更新,降低 DB 負載、改善 TTFB；頁面維持動態渲染以避開 build 期 DB 連線。

### 🗄️ 資料庫

- `SiteSetting` 新增 SEO 相關欄位：`seoSiteName`、`seoDefaultTitle`、`seoDefaultDescription`、`ogImageKey`、`googleSiteVerification`、`showRelatedTours`、`orgTelephone`、`orgAddress`、`orgPriceRange`（需執行 `prisma migrate deploy`）。

## [1.4.0] - 2026-09-18

後台首頁改為網站數據總覽：以 GA4 Data API 呈現前台流量與行為分析。

### ✨ 新功能

- **後台儀表板 GA 分析**：後台首頁改為顯示 GA4 網站分析（不再列功能連結，功能連結保留於側邊選單）。資料以服務帳戶於伺服器端讀取 GA4 Data API、記憶體快取 15 分鐘、以 Suspense 串流載入；未設定環境變數時自動隱藏，所有登入者皆可檢視。
- **概覽指標**：使用者、工作階段、頁面瀏覽、諮詢送出、LINE／社群點擊（各含近 7 天）。
- **每日趨勢圖**：近 30 天每日使用者／諮詢，以 Recharts 長條圖呈現（座標軸 + 互動 tooltip）。
- **細分報表**：熱門行程、熱門搜尋詞、流量來源（管道）、熱門地區（對照 DB 顯示中文名）、LINE／社群點擊平台細分、裝置、城市、新舊訪客。

### 🧰 維運工具 / 設定

- 新增環境變數 `GA4_PROPERTY_ID`、`GA_SA_CLIENT_EMAIL`、`GA_SA_PRIVATE_KEY`（GA4 Data API 服務帳戶，需為 GA4 資源的檢視者；留空則隱藏面板）。
- 新增相依套件 `@google-analytics/data`、`recharts`（僅後台載入）。

## [1.3.0] - 2026-09-18

前台 GTM／GA4 分析追蹤：GTM 改為僅在前台載入，並埋入關鍵使用者事件（GA4 於 GTM 後台設定，程式碼不含 GA 追蹤碼）。

### ✨ 新功能

- **GTM 僅前台生效**：Google Tag Manager 改為只在前台（公開）頁面載入，後台管理介面不再被追蹤；未設定 `NEXT_PUBLIC_GTM_ID` 時完全不載入。
- **前台事件追蹤**：新增下列使用者事件（推送至 GTM dataLayer，再由 GTM 轉送 GA4）：
  - `view_item`：瀏覽行程（獨立頁與 modal 皆計一次），帶行程 ID／名稱／地區／標籤。
  - `select_content`：點擊主分類（首頁）／次分類（地區頁）。
  - `search`：站內搜尋（header 快搜與進階搜尋），帶關鍵字／篩選條件／結果數。
  - `inquiry_open`／`inquiry_submit`：開啟／送出行程諮詢單，帶行程資訊。
  - `share`：複製分享行程連結。
  - `contact_click`：點擊社群／LINE 聯絡連結，以 `data-contact` 標記，連結網址變更也不影響追蹤。

### 🧰 維運工具 / 設定

- 新增環境變數 `NEXT_PUBLIC_GTM_ID`（GTM 容器 ID；留空則停用前台 GTM）。
- 可於 GTM 後台以 Page Hostname 分流，將 dev／正式流量送往不同 GA4 資源，避免測試資料污染正式報表。

## [1.2.0] - 2026-09-17

後台 AI 行程生成（簡介／縮圖）操作體驗優化。

### ✨ 新功能

- **AI 生成可選擇是否附帶 PDF**：簡介（Gemini）與縮圖（Manus）生成各自新增獨立的「一併送出已上傳的 PDF」開關（預設開啟）；取消勾選則僅依行程名稱、地區、標籤等文字生成，不讀取 PDF。
- **簡介候選兩欄排版**：多個 AI 簡介候選改為兩欄並排、過長內容可展開／收合全文，方便左右對照。
- **目前套用／目前選擇標示**：候選卡片即時區分「目前套用」（已儲存、前台生效中）與「目前選擇」（本次選的、尚未儲存），選用後即時高亮並標示版本。
- **選用後儲存提醒**：選用 AI 生成的簡介或縮圖後，畫面底部固定顯示「尚未儲存」提示，捲動到任何位置都看得到。
- **縮圖候選放大預覽**：AI 縮圖候選可點擊以 lightbox 全尺寸預覽。
- **刪除前確認**：刪除 AI 生成的簡介／縮圖候選前會跳出確認視窗，避免誤刪。

### 🐛 修正

- **預覽提示詞可正常關閉**：修正提示詞預覽面板可能被底部提示條蓋住而關不掉的問題（新增右上角關閉鈕，「預覽提示詞」按鈕亦可切換收合）。
- **標籤搜尋忽略輸入法組字 Enter**：於標籤搜尋欄以輸入法（如中文）選字按 Enter 時，不再誤觸新增／選取標籤。

## [1.1.0] - 2026-09-17

AI 用量成本追蹤與 Manus 縮圖生成修正。

### ✨ 新功能

- **Gemini 費用同步**：從 Google Cloud Pricing API 同步 Gemini token 單價（USD／TWD），存為可追溯的歷史（append，不覆蓋）。後台「AI 設定」提供手動「更新價格」按鈕（每天限一次）、顯示目前價格與最後更新時間。
- **成本快照**：每次 AI 生成在當下計算成本並凍結於使用紀錄（Gemini 依同步價、Manus 依每 credit 單價），日後調價不影響歷史數字。
- **Manus 縮圖附加 PDF**：縮圖生成會將行程 PDF 一併附加給 Manus 任務（與網頁手動上傳一致），而非僅送文字提示詞。
- **AI 使用紀錄強化**：顯示 Manus 實際 credits、Manus 實際執行模型（如 `manus-1.6-lite`）、每筆與總成本（NT$／US$），並標示「使用過但尚未收錄價格」的模型。

### 🐛 修正

- **Manus 任務輪詢金鑰**：改用建立任務時的金鑰輪詢，修正個人金鑰產生的縮圖出現「task not found」而誤判失敗的問題。
- **Manus 用量改用真實值**：credits 與執行模型改讀 Manus `task.detail` 回報的真實數據，取代原本依 agent profile 的估算。
- **模型欄位清空 fallback**：行程生成時清空「模型」欄位改回退至系統預設值（而非個人偏好），可擺脫錯誤的個人偏好模型。

### 🧰 維運工具

- `scripts/sync-gemini-prices.ts`：手動同步 Gemini 價格。
- `scripts/find-gemini-sku.ts`：依關鍵字查詢 Gemini 價格 SKU，方便擴充模型。
- `scripts/backfill-manus-credits.ts`：回填歷史 Manus credits／模型（支援 `--overwrite`）。
- 新增環境變數 `GOOGLE_CLOUD_API_KEY`（Cloud Billing Pricing API，公開 SKU 僅需 API key）。

### 🗑️ 移除

- 後台「Manus 每級估算 credits」與「Gemini 手動單價」設定，改由真實 API 數據取代。

## [1.0.0] - 2026-09-15

首次正式發布 🎉 — 旅遊行程網站（前台）與後台管理系統的完整上線版本。

### ✨ 前台網站（Frontend）

- **行程瀏覽**：首頁、地區／子地區分類、行程列表以固定比例卡片呈現。
- **行程詳情**：詳情頁與彈窗（Modal）透過 intercepting routes 統一，分享連結可直接以彈窗開啟於列表之上。
- **PDF 行程渲染**：前台以逐頁 lazy load 方式渲染 PDF 行程檔。
- **搜尋功能**：
  - Header 快速搜尋列串接 `/api/search`。
  - `/search` 進階搜尋結果頁（可以彈窗開啟），支援標籤篩選與 any/all 比對模式切換、標籤搜尋框與空狀態提示。
  - 進階搜尋標籤依文字（zh-Hant）排序。
- **分享**：以 ProductID 產生行程分享短網址，一鍵複製並顯示 toast。
- **價格顯示**：價格為 0 時顯示「客製化報價」。
- **輪播圖（Hero Carousel）**：資料庫驅動、支援單張模式、hover 暫停、reduced-motion 無障礙、行動版斷點 768px。
- **版面**：套用盒裝（boxed）全站版面。
- **頁尾**：重新設計，含公司資訊與聯絡彈窗；社群連結採用官方 LINE 品牌標誌。
- **錯誤頁**：自訂 404／500 錯誤頁，404 倒數後自動導回首頁。
- **SEO**：metadata、sitemap、robots.txt 與公開行程詳情頁。

### 🛠️ 後台管理系統（Admin）

- **登入與權限**：路由保護的後台登入、全站單一登入、心跳（heartbeat）機制的 session 過期、多帳號可同時登入；角色權限（admin／staff）。
- **後台網址前綴**：透過 `ADMIN_PATH` 環境變數設定。
- **行程管理**：CRUD、篩選、拖曳排序（含篩選狀態下）、批次發佈／刪除／變更地區、批次標籤管理、分頁。
- **標籤管理**：CRUD、拖曳排序、chip 樣式選擇器、可搜尋並直接新增、toast 通知。
- **地區管理**：地區／子地區 CRUD、拖曳排序、縮圖清除。
- **使用者管理**：CRUD，displayName 必填且唯一。
- **輪播圖與版面**：Hero Banner 管理、fit／boxed 顯示模式、可設定最大高度與比例、行動版比例、pause-on-hover、版面設定即時預覽（桌機／行動切換）。
- **業務團隊資訊**：可拖曳排序的卡片（限 admin）。
- **縮圖裁切**：行程／地區／子地區縮圖的裁切／縮放工具，後台列表縮圖亦套用裁切。
- **SEO 編輯**：地區、子地區、行程的 metadata 編輯。
- **操作紀錄**：所有後台操作的活動日誌。
- **表單體驗**：即時字數統計、響應式版面、後台專屬 500 錯誤邊界。

### 🤖 AI 行程生成（AI）

- **內容生成**：行程簡介（Gemini）與縮圖（Manus）生成端點，候選結果可儲存、預覽、編輯 prompt 後再生成。
- **表單整合**：行程表單內建 AI 生成按鈕與候選挑選器，可從編輯中的表單值直接生成（免先儲存），並提供「儲存草稿」。
- **金鑰與設定**：AI 設定頁（金鑰加密儲存、金鑰測試）、成本單價設定、Manus agent profile 與逐次覆寫模型／profile。
- **配額與個人金鑰**：個人 API 金鑰（含配額 fallback）、逐次選擇個人／共用配額、Manus 個人點數門檻設定。
- **用量統計**：AiUsageLog 記錄每次生成，角色範圍的用量頁（篩選＋成本彙總）。
- **個人偏好**：per-user AI 偏好頁，可覆寫系統預設。

### 📥 Excel 匯入／匯出（Import/Export）

- 旅遊行程、地區／子地區、標籤的 Excel 匯入／匯出。
- 行程凍結式 ProductID 基礎、依地區分頁多 sheet 匯出、地區篩選匯出。
- 腳本式批次行程匯入器、匯入預覽（sheet 分頁、列選取、豐富欄位）。

### 🔌 基礎建設（Infrastructure）

- **儲存**：以 R2 儲存抽象層取代 Cloudinary。
- **Email**：以 Gmail SMTP 取代 Resend 發送詢問通知，通知內容含時間、行程連結與完整欄位。
- **分析**：Google Tag Manager 基礎建設。
- **技術棧**：Next.js 開發環境、Prisma schema 與 migrations、資料庫 seed 腳本與部署文件。

### 🐛 主要修正（Fixes）

- 修正地區管理排序順序 bug。
- 修正 AI 描述在長文字下的儲存（依候選 id 追蹤採用的描述）。
- 修正 Gemini `maxOutputTokens` 過低導致描述被截斷。
- 修正上傳、詢問表單、驗證與分析等相關問題。

[1.0.0]: https://github.com/MatsuiLin101/discoverd/releases/tag/v1.0.0
