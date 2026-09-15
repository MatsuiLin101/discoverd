# Changelog

本專案的所有重要變更皆記錄於此檔案。
格式參考 [Keep a Changelog](https://keepachangelog.com/)，版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

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
