# 實作規劃 — #6 縮圖裁切／縮放工具

> 對應 `docs/backlog/post-acceptance-changes-r1.md` 第 6 點。
> 本文為可交接的實作規劃，實作前請先讀 `CLAUDE.md`、`web/AGENTS.md` 與 `memory/` 內的架構與 CRUD 慣例。
> 狀態：規劃完成、**尚未動工**。

---

## 1. 定案摘要（已與甲方確認，直接照做）

- **範圍＝三個「縮圖」**：行程卡片縮圖、主分類（Region）縮圖、次分類（SubRegion）縮圖。
- **明確排除**：行程詳情 Modal / 永久頁的 `gallery`（`TourFile` 圖片與 PDF）。→ 不動 `TourFile`、不加 file API、不處理 PDF 裁切。
- **比例（固定、不讓使用者選）**：
  - 行程縮圖 → **4:3**（顯示框 `.t-img` 就是 `aspect-ratio: 4/3`）。
  - 主分類、次分類縮圖 → **16:9**（顯示框 `.cat-thumb` 桌機 240×132、平板 180×104、手機滿版 ≈190px 高，跨斷點都落在 1.7–1.9，中心即 16:9）。
- **只存裁切範圍座標，不重壓圖**：原圖保留、可重新開啟裁切器編輯；前台以純 CSS 還原。
- 每個縮圖只對應「它自己的顯示框」，因此每張都能**像素級精準**，不需要跨比例的 cover 折衷。
- 無 crop 值時 fallback 回現有 `object-fit: cover`，**既有資料完全相容、視覺不變**。

---

## 2. 核心原理：crop 中繼資料 → 純 CSS 還原

`react-easy-crop` 的 `onCropComplete(croppedArea, croppedAreaPixels)` 會回傳 `croppedArea`，其 `{x, y, width, height}` 已是**相對原圖的百分比（0–100）**。除以 100 即為正規化 0–1 值，與原圖解析度無關，可直接存 DB。

儲存格式（`Json?`）：

```jsonc
{ "x": 0.12, "y": 0.08, "w": 0.66, "h": 0.50 }
// 皆為 0..1；x,y = 裁切框左上角占原圖比例；w,h = 裁切框寬高占原圖比例
```

> 比例（4:3 / 16:9）由「哪個表單」決定並寫死，**不存進 JSON**（顯示框比例已固定，w/h 搭配下面的 CSS 一定能精準還原）。

前台還原（顯示框自身已有 `aspect-ratio`，只要把原圖放大定位）：

```css
/* 容器：沿用各自的 .t-img（4:3）或 .cat-thumb（16:9），加 position/overflow 即可 */
.thumb-crop { position: relative; overflow: hidden; }
.thumb-crop > img {
  position: absolute; max-width: none;
  width:  calc(100% / var(--cw));            /* 容器寬 / w  */
  height: calc(100% / var(--ch));            /* 容器高 / h  */
  left:   calc(-100% * var(--cx) / var(--cw));
  top:    calc(-100% * var(--cy) / var(--ch));
}
```

以 inline style 帶入 `--cx=x, --cy=y, --cw=w, --ch=h`。因裁切器強制的比例＝顯示框比例，此還原對該框為像素級精準。**無 crop 時不套用這組 class，退回原本的 `object-fit: cover`。**

---

## 3. 資料模型（`web/prisma/schema.prisma`）

三個模型各加一個 nullable `Json?` 欄位（既有資料不受影響）：

```prisma
model Tour      { /* … */ thumbnailCrop Json? }
model Region    { /* … */ thumbnailCrop Json? }
model SubRegion { /* … */ thumbnailCrop Json? }
```

改完 schema 後：`migrate` + 重啟 dev server 讓 Prisma client 重生（見 memory `project_admin_crud_pattern`）。

---

## 4. 共用元件（新增）

### 4.1 後台 `ImageCropper`（`web/src/components/admin/ImageCropper.tsx`）
- 依賴 `react-easy-crop`。
- Props：`src`（原圖 URL / objectURL）、`aspect`（`4/3` 或 `16/9`）、`value`（既有 crop 或 null）、`onApply(crop)`、`onCancel()`。
- 以 Modal 呈現（可比照 `components/admin/regions/ImageLightbox.tsx` 的遮罩結構）。
- 內含拖曳定位、滑桿／滾輪縮放；`onCropComplete` 取 `croppedArea` → 除以 100 → `{x,y,w,h}`。
- 「套用」回傳 crop、「取消」關閉。
- **比例固定**（由呼叫端傳入），不提供比例切換 UI。

### 4.2 前台 `CroppedThumb`（`web/src/components/frontend/CroppedThumb.tsx`）
- Props：`src`、`alt`、`crop`（`{x,y,w,h}` 或 null）、`sizes?`、`className?`。
- 有 crop：外層 `.thumb-crop` + inline CSS 變數 + `<img>`（或 `next/image` 搭配 `fill`）。
- 無 crop：維持現行 `next/image` + `object-fit: cover`。
- 三個顯示點共用，避免各自重刻。

### 4.3 樣式
- 於 `web/src/app/(frontend)/frontend.css` 新增 `.thumb-crop`／`.thumb-crop > img` 規則。
- `.t-img`、`.cat-thumb` 已有 `position: relative; overflow: hidden`，容器不需大改，只需讓內部改用 `CroppedThumb`。

---

## 5. 逐檔改動清單

### 5.1 Schema（1）
- `web/prisma/schema.prisma`：`Tour` / `Region` / `SubRegion` 各加 `thumbnailCrop Json?`。

### 5.2 後台表單（3）
於既有縮圖區塊旁加「調整裁切」按鈕（僅在已有縮圖／已選新圖時可用），開 `ImageCropper`；新增 state `thumbnailCrop`；submit 時 `fd.append("thumbnailCrop", JSON.stringify(crop))`（清空時送空字串或 `clearThumbnailCrop`）。上傳新圖時**重置 crop**（座標對不上新圖）。

- `web/src/components/admin/tours/TourForm.tsx`（縮圖區塊 L318–359；比例傳 `4/3`）。
- `web/src/components/admin/regions/RegionForm.tsx`（縮圖區塊 L172–212；比例傳 `16/9`）。
- `web/src/components/admin/regions/SubRegionForm.tsx`（結構同 RegionForm；比例傳 `16/9`）。

後台縮圖預覽格建議直接用 crop 呈現（所見即所得），讓管理者存檔前即看到裁切結果。

### 5.3 後台 API（6：3 組 POST + PUT）
各路由讀 `thumbnailCrop`、以 Zod 驗證後寫入；PUT 需支援更新與「換新圖時重置 crop」。**新增 Zod schema**：

```ts
const cropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
}).refine(c => c.x + c.w <= 1.001 && c.y + c.h <= 1.001, "裁切範圍超出圖片");
// 從 fd.get("thumbnailCrop") 取字串 → JSON.parse → cropSchema.safeParse
```

- `web/src/app/api/admin/tours/route.ts`（POST，create data 加 `thumbnailCrop`）。
- `web/src/app/api/admin/tours/[id]/route.ts`（PUT；換圖 / 清圖時 `thumbnailCrop = null`）。
- `web/src/app/api/admin/regions/route.ts`（POST）。
- `web/src/app/api/admin/regions/[id]/route.ts`（PUT）。
- `web/src/app/api/admin/regions/[id]/subs/route.ts`（POST）。
- `web/src/app/api/admin/regions/[id]/subs/[subId]/route.ts`（PUT）。

規則：`clearThumbnail` 或上傳 `newThumbnailKey` 時，一律把 `thumbnailCrop` 設為 `null`（沿用現有 thumbnail 分支邏輯，見 tours `[id]/route.ts` L53–63）。

### 5.4 前台資料查詢（帶出 crop）
- `web/src/lib/frontend-queries.ts`：三個 function 的 `select` 補 `thumbnailCrop`，回傳物件補 `crop`。
  - `getRegionList` → `RegionListItem.crop`
  - `getRegionDetail` → `region.crop` 與 `subRegions[].crop`
  - `getRegionTours` → `tours[].crop`
- `web/src/app/api/regions/[slug]/tours/route.ts`、`web/src/app/api/search/route.ts`、`web/src/app/api/regions/route.ts`：若前端該路徑要顯示縮圖，同步帶出 `thumbnailCrop`。

### 5.5 前台型別（`web/src/lib/frontend-data.ts`）
新增共用型別 `type ThumbCrop = { x: number; y: number; w: number; h: number } | null;`，並於 `RegionListItem`、`SubRegionListItem`、`RegionDetail`、`TourItem` 補 `crop: ThumbCrop`。

### 5.6 前台渲染點（改用 `CroppedThumb`）
- 行程卡片：`web/src/components/frontend/TourSection.tsx` 的 `.t-img`（L130）。
- 主分類 / 次分類：`web/src/components/frontend/CategoryList.tsx` 的 `.cat-thumb`（L47）；`CategoryItem` 介面加 `crop?: ThumbCrop`。
  - 對應兩處 map：`app/(frontend)/page.tsx`（主分類，L34–38 加 `crop: r.crop`）、`app/(frontend)/regions/[slug]/page.tsx`（次分類，L34–37 加 `crop: sr.crop`）。
- （次要，可選）搜尋下拉 `.fh-sr-thumb`（`SiteHeader.tsx`）顯示的是行程縮圖，若要一致可同法套用；非甲方明確需求，列為 nice-to-have。

---

## 6. 套件

```bash
cd web && npm i react-easy-crop
```

- 純前端互動元件，**不需 `sharp`／伺服器影像處理**（因不重壓圖）。
- 只在後台 `ImageCropper`（client component）引用；前台還原是純 CSS，不引此套件。

---

## 7. 邊界情況與相容性

- **既有資料**：`thumbnailCrop` 為 null → 一律走 `object-fit: cover`，與現況一致。
- **換圖**：上傳新縮圖必定清掉舊 crop（前後端都要保險）。
- **清除縮圖**：crop 一併設 null。
- **原圖過小**：建議上傳最小 1200×900（行程）／16:9 對應尺寸（分類）；不強制擋，僅 UI 提示。
- **驗證**：座標一律伺服器端 `cropSchema` 驗證，避免存入畸形值造成前台 CSS 破版。
- **手機主分類滿版**：`.cat-thumb` 手機為滿版 banner（比例偏 1.9），16:9 crop 仍以 cover 疊在容器上；因 `.thumb-crop > img` 用 `width/height` 放大定位，容器比例略偏時邊緣會多切一點點，屬可接受範圍（仍優於現行純 cover 的無焦點裁切）。

---

## 8. 工作拆解（建議順序）

1. **PoC（關鍵驗證）**：先只做行程卡片 4:3 這條主線——schema 加 `Tour.thumbnailCrop`、`ImageCropper`、`CroppedThumb`、TourForm + tours POST/PUT + `getRegionTours` + `TourSection`。目的：驗證「裁切器所見」與「前台 CSS 還原」像素級一致。
2. 主分類 16:9：`Region.thumbnailCrop` + RegionForm + regions POST/PUT + `getRegionList`/`getRegionDetail` + `page.tsx` + `CategoryList`。
3. 次分類 16:9：`SubRegion.thumbnailCrop` + SubRegionForm + subs POST/PUT + `regions/[slug]/page.tsx`（共用 `CategoryList`，前台幾乎零額外工）。
4. 收尾：後台縮圖預覽即時套用 crop、字數／提示文案、（可選）搜尋下拉一致化。

里程碑 1 完成即可交付第一條可見成果讓甲方確認手感，再往分類擴散。

---

## 9. 測試要點

- 裁切→存檔→重開，crop 值正確回填、裁切器回到上次位置。
- 前台卡片 / 主分類 / 次分類三處顯示與後台裁切結果一致。
- 換新圖後舊 crop 不殘留。
- 無 crop 的既有行程 / 分類顯示不變（回歸測試）。
- 座標越界（手動竄改 payload）被 API 擋下。
- R2 與 local 兩種 driver 皆正常（見 memory `project_frontend_pdf_rendering` 對 R2 CORS 的註記；本功能為 `<img>`／CSS，不涉 canvas，CORS 風險低）。
- 依 `web/AGENTS.md`：改任何 Next.js 行為前，先查 `node_modules/next/dist/docs/` 對應章節。

---

## 10. 風險

- **唯一關鍵風險**：`react-easy-crop` 的 `croppedArea` 正規化後，用第 2 節 CSS 還原是否與裁切器所見完全對齊。→ 以里程碑 1 的 PoC 先行驗證，通過再擴散，其餘皆為既有模式（file input、`Json?` 欄位、共用元件）延伸，風險可控。
- 次要：手機主分類滿版比例偏離 16:9 的邊緣多切，屬視覺可接受；如甲方在意，再評估手機專用 crop（不建議，成本不成比例）。
