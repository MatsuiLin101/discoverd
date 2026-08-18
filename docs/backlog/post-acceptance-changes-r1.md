# Backlog — 驗收後變更需求 R1（甲方 2026-08）

> 來源：v3 合約驗收後，甲方（找到了旅行社）提出的一批修改與新增需求，經雙方整理確認。
> 用途：作為後續實作的工作清單，供獨立 session 接手。實作前請先讀 `CLAUDE.md` 與 `memory/` 內的專案架構、CRUD 慣例。
>
> 商務歸類（不影響實作，僅供背景）：項次 1–5 為保固／免費調整，項次 6–7 為追加收費開發（合計 NT$10,000）。收費細節見 `docs/contracts/quotation-supplement-v1.md`。

## 專案座標速查

- 專案根目錄：`web/`（Next.js 16 App Router）。
- 前台：`web/src/app/(frontend)/`，共用樣式 `web/src/app/(frontend)/frontend.css`。
- 後台：`web/src/app/(admin-panel)/admin/`，元件 `web/src/components/admin/**`，表單為各模組 `*Form.tsx`。
- 儲存抽象：`web/src/lib/storage.ts`（R2 / local 雙 driver），前端上傳 `web/src/lib/upload-client.ts`，API `web/src/app/api/admin/uploads/{presign,local}`。
- Prisma schema：`web/prisma/schema.prisma`（改 schema 後需 migrate、重啟 dev server 讓 client 重生）。
- 目前**沒有**任何 Excel/xlsx 套件，項次 7 需自行引入（建議 `exceljs`）。

---

## 已鎖定的決策（實作時直接照做，不用再問）

- 卡片版面（#2）：桌機每列 **3 張**、平板 2 張、手機 1 張；**只改行程列表頁**，主分類（region）與次分類（subRegion）頁不動。
- 預覽圖比例（#4/#6）：後台同時提供 **4:3（顯示 400×300）** 與 **16:9（顯示 400×225）** 供參考，預設傾向 4:3；上傳原圖建議最小 1200×900。**裁切只記錄範圍座標、不重壓圖，之後可重新編輯**；套用範圍為**縮圖與預覽圖兩者**。
- 發布預設（#5）：新增行程 `published` 預設改為 **true**；「隱藏」＝設為未發布，未發布之行程在前台列表、搜尋、`/tours/[slug]` 永久頁均不顯示（＝現有 unpublished 行為，無「隱形賣場／可用連結直達」這種第三狀態）。
- 字數提示（#3）：所有文字輸入欄位加**即時字數**，上限沿用現有 Zod 設定；目前無上限者提合理值待確認。

---

## 任務清單

### #1 — 行程介紹內文換行〔BUG／保固〕
- **問題**：行程描述（`description`）內的換行在前台未呈現。
- **狀態**：甲方端測試 `white-space: pre-wrap` 已可解，僅需正式套用。
- **驗收**：描述中的換行在下列三處都正確呈現：行程列表卡片、行程詳情 Modal、`/tours/[tourSlug]` 永久頁。
- **檔案**：`web/src/app/(frontend)/frontend.css`（`.t-lede` 等描述樣式）；渲染處 `web/src/components/frontend/TourSection.tsx`、`web/src/app/(frontend)/tours/[tourSlug]/page.tsx`、`TourMediaGallery` 相關。
- **備註**：純顯示調整，優先做、風險低。

### #2 — 行程列表改卡片式版面〔調整／免費〕
- **需求**：桌機版由目前的「橫向長條（左圖 300px＋右文）」改為**多欄直式卡片**。
- **現況**：`.fh-tour-list` 為單欄 grid（gap 20px）；`.fh-trow` 為 `grid-template-columns: 300px 1fr`，手機（`max-width` 斷點）才變 `1fr` 直式。容器 `--max: 1320px`、`--gutter: 48px`（桌機內容寬約 1224px）。
- **驗收**：
  - 桌機（≥ ~1080px）每列 3 張；平板（768–1080）2 張；手機（<768）1 張。
  - 卡片內含：圖、標籤、標題、簡述、價格、CTA；hover 效果比照現有。
  - 圖片比例採 #4 選定之固定比例（預設 4:3）。
  - **只影響行程列表頁**（`(frontend)/regions/[slug]/[subSlug]` 透過 `TourSection`）；region、subRegion 分類頁不動。
- **檔案**：`web/src/components/frontend/TourSection.tsx`、`web/src/app/(frontend)/frontend.css`（`.fh-tour-list` 改為 responsive grid `repeat(3,1fr)` 系列，重寫 `.fh-trow` 為直式卡片）。
- **待確認**：若甲方要「型錄感」的每列 4 張，需縮短簡述、縮小圖（見開放問題）。

### #3 — 後台欄位即時字數提示〔小增修／免費〕
- **需求**：所有文字輸入欄位顯示即時字數（如 `12 / 50`）。
- **驗收**：各表單的 text/textarea 欄位即時顯示已輸入字數與上限；達上限時有視覺提示。
- **範圍檔案**：`web/src/components/admin/**/*Form.tsx` —
  `tours/TourForm.tsx`、`regions/RegionForm.tsx`、`regions/SubRegionForm.tsx`、`tags/TagForm.tsx`、`hero-banners/HeroBannerForm.tsx`、`settings/SettingsForm.tsx`、`users/UserCreateForm.tsx`、`users/UserEditForm.tsx`。
- **作法建議**：抽一個共用受控 input/textarea 元件（含字數顯示），逐表單替換，避免每個欄位重刻。
- **待確認**：目前 Zod 未設上限的欄位（如部分 SEO 欄位），需補一組合理上限給甲方確認。

### #4 — 行程預覽圖固定顯示尺寸〔調整／免費〕
- **需求**：預覽圖以固定尺寸顯示，不再隨原圖比例變動。
- **驗收**：縮圖與預覽圖在前台以固定比例框顯示（預設 4:3 / 400×300），`object-fit: cover` 裁齊。
- **檔案**：前台顯示處樣式（`frontend.css` 的 `.t-img` 等）；與 #2、#6 綁在一起處理最省事。
- **備註**：這是 #6 裁切功能的顯示基礎，先把固定框定下來。

### #5 — 發布狀態預設「已發布」〔調整／免費〕
- **需求**：新增行程預設即為「已發布」，需隱藏時手動改為未發布。
- **驗收**：新建行程 `published` 預設 true；後台表單發布切換預設為「已發布」。
- **檔案**：`web/prisma/schema.prisma`（`Tour.published @default(true)`；注意既有資料不受影響）＋ `web/src/components/admin/tours/TourForm.tsx`（新建預設值）。
- **備註**：無「隱形賣場」需求，未發布＝完全不顯示（現況即如此）。工作量極小。

### #6 — 預覽圖區塊裁切／縮放工具〔新功能／收費〕
- **需求**：後台上傳預覽圖後，提供裁切視窗（如甲方附圖），可框選區塊並縮放，自訂在固定框內實際顯示的範圍；**即時預覽**。
- **驗收**：
  - 後台可對縮圖與預覽圖框選＋縮放，套用後前台一致呈現。
  - **只儲存裁切範圍（座標／縮放值），不重新壓圖**；原圖保留，之後可重新開啟裁切器編輯。
  - 提供 4:3、16:9 兩種比例即時預覽供參考。
- **檔案／資料**：
  - Schema：`Tour.thumbnailKey` 旁需新增裁切中繼資料欄位（例如 `thumbnailCrop Json?`，存 `{x,y,w,h,scale,ratio}`）；預覽圖檔（`TourFile`）若也要裁切，需在 `TourFile` 加對應欄位。
  - UI：`web/src/components/admin/tours/TourForm.tsx`、`TourFileList.tsx` 內接裁切器（建議 `react-easy-crop` 之類）。
  - 前台：套用 crop 值渲染（CSS `object-position`／`transform` 或包一層裁切容器）。
- **待確認**：最終比例（單一全站 or 每行程可選）；裁切套用是縮圖、預覽圖或兩者的細節優先序。

### #7 — Excel 匯入匯出套件（地區／標籤／旅遊方案）〔新功能／收費〕
- **需求**：三個模組支援 Excel 匯入與匯出；匯入以商品編號（Product ID）判定：**無編號＝新增、有編號＝修改（upsert）**。附可直接套用的範例 Excel。
- **對應資料模型**：`Region` + `SubRegion`（兩層）、`Tag`、`Tour`（欄位多、含 subRegion／tags 關聯）。
- **Product ID 編碼（甲方建議規則，待最終確認）**：地區 3 碼（101–199）＋次分類 2 碼（01–99）＋旅遊方案 8 碼（西元年月日序號，例 `26081001`），組合如 `1010126081001`。
- **驗收（初版，細節待甲方確認後補）**：
  - 匯入：上傳 Excel → 逐列驗證 → upsert；回報成功筆數與失敗列（含原因）。
  - 匯出：三模組資料各可匯出為 Excel，欄位與匯入格式對應。
  - 產生／解析 Product ID，作為匯入比對依據。
  - 提供匯入用範例樣板與欄位說明。
- **檔案（新增）**：
  - 套件：`exceljs`（`npm i exceljs`）。
  - API：`web/src/app/api/admin/{regions,tags,tours}/import`、`.../export`（或集中於 `api/admin/excel/*`）。
  - UI：各列表頁加「匯入 / 匯出」入口，匯入結果回報畫面。
  - 若採 Product ID：`Tour`（及 `Region`/`SubRegion`）需存放或計算編號，考慮唯一性與既有資料回填。
- **時程**：預估約 2 週，**自甲方確認「Excel 欄位定義＋Product ID 編碼規則」後起算**。
- **可分批**：地區＋標籤（單純）可先出；旅遊方案（最複雜）隨後。

---

## 待甲方確認的開放問題（會影響 #6、#7 的做法，實作前需回答）

1. **預覽圖比例**：4:3 與 16:9 擇一作全站固定，或每個行程各自可選？（後者裁切器與版面都要支援兩種）
2. **卡片密度**：行程列表每列維持 3 張，或改 4 張型錄感（需縮短簡述、縮小圖）？
3. **Excel 欄位對應**：地區、次分類、標籤在匯入時用「名稱」還是「編號」；填了不存在的值要自動新增還是報錯。
4. **Excel 其他**：標籤多值的分隔方式；價格格式；發布狀態是否納入欄位；PDF／圖片檔無法內嵌於 Excel，確認匯入只處理文字欄位、檔案仍走後台上傳。
5. **匯入錯誤處理**：整批停止 vs 跳過錯誤列繼續。
6. **地區兩層結構**：匯入用「同一張表含地區＋次分類兩欄」還是「分頁」。
7. **Product ID 編碼邊界**：日期取建立日？序號每日重置？地區超過 99、單日方案超過 99 筆如何處理？既有行程是否回填編號？
8. **#3 字數上限**：目前無上限之欄位要採用的上限值。

---

## 建議實作順序

1. **先清免費／低風險項**：#1 換行 → #5 發布預設 → #4 固定尺寸 → #3 字數提示 → #2 卡片版面。（可快速交付、讓甲方有感）
2. **#6 裁切工具**：待比例確認後做（與 #2/#4 的固定框一起收斂）。
3. **#7 Excel 匯入匯出**：待甲方回覆欄位與編碼規則後開工；地區＋標籤先行、旅遊方案隨後。
