# 規格 — Excel 匯入／匯出（地區・標籤・旅遊方案）〔backlog #7〕

> 對應 `docs/backlog/post-acceptance-changes-r1.md` 第 7 項的落地規格。
> 本文為**已與甲方／專案負責人確認的定案**，供獨立 session 接手實作。
> 實作前請先讀 `CLAUDE.md`、`web/AGENTS.md`（Next.js 16 有 breaking changes，寫 code 前先查 `node_modules/next/dist/docs/`）與 `memory/` 的架構與 CRUD 慣例。

## 背景與定位

- 三個後台模組支援**瀏覽器內匯入／匯出**：標籤（Tag）、地區（Region + SubRegion 兩層）、旅遊方案（Tour）。
- 匯入以 **Product ID** 判定新增或修改；匯入**只處理文字欄位**，縮圖與內容檔仍走後台上傳。
- 與既有維運腳本 `web/scripts/import-tours.sh` **並存但定位不同**：
  - 腳本：以 (主分類, 次分類, 行程名稱) 判定、冪等，適合甲方那份無編號的大批匯入檔。
  - 本功能：以 productId 判定，走「匯出 → 編輯 → 匯入」的正式流程。
  - 兩者只共用純工具函式（欄位正規化等），**不共用識別層**。

---

## 一、識別機制：Product ID（凍結式）

三個代碼一經指派即**凍結**，排序調整不影響其值。

| 欄位 | 規則 |
|------|------|
| `Region.code` | 3 碼字串，`101` 起跳，全域唯一，凍結 |
| `SubRegion.code` | 2 碼字串，於所屬 region 內 `01` 起跳，凍結（`@@unique([regionId, code])`）|
| `Tour.productId` | 字串，全域唯一，凍結。建立當下組成：`regionCode(3) + subCode(2) + YYMMDD(6) + 當日序號(2)`，共 13 碼，例：`101` + `01` + `260810` + `01` = `1010126081001` |

### Product ID 產生規則

- `YYMMDD`：取**建立當下**時間，時區 **UTC+8（Asia/Taipei）**。
- **當日序號**：同一組 (主分類, 次分類)、同一日期，序號 `01 ~ 99`。
  - 取號方式：該 (regionCode+subCode+YYMMDD) 前綴目前最大序號 + 1。
  - 超過 `99` → **該列跳過不新增**，回報「今日此分類編號已用完，明天再新增」。
- productId 一旦指派即凍結；行程日後搬到其他次分類**不重算**（它是身分，不是即時指標）。
- **配發邏輯放共用層**，匯入與**後台手動新建行程共用同一套**。手動新建若當日序號已滿，同樣擋下並提示。

### 匯入時的識別判定（純看 productId，不比名稱）

| 情況 | 行為 |
|------|------|
| productId 有值，且 DB 已存在 | **修改**該行程 |
| productId 有值，但 DB 不存在 | **當新行程**建立，忽略填入值、**重新配發**合法 productId，報告標註「你填的編號不存在，已配新號」|
| productId 無值 | **當新行程**建立並配發新 productId |

> 明確不再比對 (主分類, 次分類, 行程名稱) 作為識別。名稱僅用於下方「防呆」的軟提醒。

---

## 二、Schema 變更

`web/prisma/schema.prisma`：

- `Region` 新增 `code String? @unique`
- `SubRegion` 新增 `code String?` + `@@unique([regionId, code])`
- `Tour` 新增 `productId String? @unique`
- 新增 `ImportLog` model（**一表三用：兩段式暫存 + MD5 稽核 + 匯入紀錄**）：

```prisma
enum ImportModule { TAG REGION TOUR }
enum ImportStatus { PENDING COMMITTED }

model ImportLog {
  id            String       @id @default(cuid())
  module        ImportModule
  filename      String
  md5           String
  status        ImportStatus @default(PENDING)
  payload       Json         // 解析並正規化後的列（供 token commit 使用）
  summary       Json         // 預覽摘要：created/updated/skipped/errors/duplicates
  createdCount  Int          @default(0)
  updatedCount  Int          @default(0)
  skippedCount  Int          @default(0)
  userId        String?
  user          User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt     DateTime     @default(now())
  committedAt   DateTime?
}
```

- 遷移後需 `prisma migrate dev` + **重啟 dev server**（memory 已記錄的 Turbopack + Prisma singleton 坑）。
- `LogResource` 視需要新增 `IMPORT`（或沿用既有 resource）。

### 既有資料回填（backfill 腳本）

- 依現有 `sortOrder` 給 4 個 region 配 `101, 102, …`；每個 region 下的 sub 依 sortOrder 配 `01, 02, …`。
- 18 筆既有 tour 依 `createdAt`（轉 UTC+8）組 productId，當日序號依 (subRegion, 日期) 分組編。
- 放 `web/scripts/`（比照 `seed.ts` 慣例，dotenv-expand + `@/generated/prisma/client`）。

---

## 三、兩段式匯入（有狀態 / token）

1. **上傳 → 試算（不寫入）**
   - 算檔案 MD5、用 exceljs 解析、逐列驗證、比對重複。
   - 將正規化後的列寫入 `ImportLog(status=PENDING)`，取得 `token`（= ImportLog.id），payload **15 分鐘過期**。
   - 回傳預覽：預計 新增/修改/跳過、逐列錯誤（列號＋原因）、⚠️ 疑似重複清單、MD5 命中提醒。
2. **確定匯入**
   - 憑 token 取 PENDING 批次，驗證：擁有者相符、未過期、未 commit。
   - 在 **transaction** 內套用有效列、配發 productId → 更新 `status=COMMITTED`、筆數、`committedAt`。
   - 回報**實際結果**。做到「預覽看到什麼，就 commit 什麼」。

---

## 四、防呆

- **列級疑似重複（主防線）**：對**無 productId** 的列，預覽時比對「DB 既有」與「同檔案其他列」是否已有相同 (主分類, 次分類, 行程名稱) 組合。命中則在預覽標 ⚠️「疑似重複」並列出既有行程資訊，由使用者決定是否仍要匯入。**軟提醒、不自動配對**；使用者確定匯入就當新行程、配新號。
- **MD5（次防線）**：確定匯入時記錄檔案 MD5；下次上傳若**位元組完全相同**，提示「這個檔案先前匯入過」。
  - 侷限：Excel 重存即改變位元組，故只擋「原封不動重傳」，擋不住「改一點再傳」——真正保護靠列級提醒。

---

## 五、後端

沿用既有 route 慣例：`getSession()` 認證、Zod 驗證、`writeLog()` 記錄、`.issues[0].message` 回錯。

| 端點 | 權限 | 作用 |
|------|------|------|
| `POST /api/admin/{tags,regions,tours}/import/preview` | ADMIN | 上傳 → 解析驗證 → 建 PENDING ImportLog → 回 `{token, preview}` |
| `POST /api/admin/{...}/import/commit` | ADMIN | 憑 token → transaction 套用 → 回實際結果 |
| `GET  /api/admin/{...}/export` | 登入即可 | 產生 xlsx 下載（`Content-Disposition: attachment`），欄位含 code / productId |
| `GET  /api/admin/{...}/export?template=1` | 登入即可 | 空白範本（表頭＋示範列）下載 |

- **套件**：`exceljs`（`npm i exceljs`），server 端讀寫，不進前端 bundle。
- **共用層** `web/src/lib/excel/`：exceljs 讀寫封裝、欄位正規化（標籤逗號切、價格容錯 `88,888`/`.0`）、檔案內去重、productId 配發、重複偵測。**API 與後台手動新建共用配發邏輯**。
- 下載為同源已登入 GET，前端一般連結即可觸發。
- Next.js 16 route handler 回檔案／讀 multipart 前，先查 `node_modules/next/dist/docs/`。

---

## 六、前端

- 各列表頁工具列加「**匯入 / 匯出 / 下載範本**」入口（tours 掛在既有 `TourListClient` 工具列；tags/regions 比照）。
- 匯入面板：選檔 → 上傳試算 → 顯示**預覽表**（新增/修改/跳過、逐列錯誤、⚠️ 疑似重複、MD5 提醒）→「確定匯入」→ 結果回報。
- 樣式沿用後台慣例（主色 `#D12351`、`text-rose-600` 錯誤字、`file:` 偽元素 input）。

---

## 七、各模組欄位定義

> 匯入匯出欄位對齊；表頭第 1 列，匯入時跳過。地區用**單一工作表**、每列含主/次分類兩欄。

**「發布」欄規則（Tour）**：用 `Y` / `N` 控制，**預設發布**。判定時去空白、不分大小寫——值為 `N`（含 `n`、` N `）才**未發布**，其餘（空白、`Y`、其他任何值）一律當**發布**。匯出反向輸出 `Y` / `N`，維持往返一致。

**標籤（Tag）**：`名稱`（identity：name 唯一）

**地區（Region + SubRegion，單一工作表）**：
`主分類代碼(code) | 主分類名稱 | 次分類代碼(code) | 次分類名稱 | SEO標題 | SEO描述`
- 僅主分類的列可留次分類欄空白。
- identity：code 有值用 code、無值則以 name 新建配次一號；不存在的父地區自動建立。

**旅遊方案（Tour）**：
`ProductID | 主分類 | 次分類 | 標籤 | 行程名稱 | 價格 | 行程簡介 | 發布(Y/N) | SEO標題 | SEO描述`
- identity：見第一節判定表。
- 不存在的主/次分類、標籤 → 自動建立（預覽標示為新建）。
- 縮圖與內容檔不在 Excel 內，匯入後於後台補。

---

## 八、分階段實作順序

1. **地基**：schema（code / productId / ImportLog）+ migration + backfill + `lib/excel/` 骨架與 productId 配發（含後台手動新建接上）。
2. **標籤**：最單純（僅 name），先打通 preview/commit/export/template 全流程。
3. **地區（兩層）**：單一工作表、region+sub 兩欄、自動建立父地區。
4. **旅遊方案**：最複雜，含關聯、productId 判定、列級疑似重複、當日序號上限。
5. **範本、欄位說明文件、測試**（沿用 `web/scripts/fixtures/README.md` 模式）。

---

## 九、已確認的決策摘要

| 主題 | 決策 |
|------|------|
| 識別 | 凍結式 Product ID，純 productId 判定，不比名稱 |
| productId 有值但不存在 | 當新行程、忽略填入值、配新號、報告標註 |
| 當日序號 | (主分類,次分類) 每日 01~99，UTC+8，超過跳過並提示 |
| 手動新建 | 也配發 productId，走共用層 |
| 匯入權限 | ADMIN only；匯出登入即可 |
| 防呆 | 列級疑似重複警示（主）+ MD5/ImportLog（次，兼稽核）|
| 兩段式 | 有狀態 token，PENDING→COMMITTED，15 分鐘過期 |
| published | 「發布」欄用 `Y`/`N`，**預設發布**；去空白不分大小寫，非 `N` 一律發布；匯出輸出 `Y`/`N` |
| 地區結構 | 單一工作表含兩層欄 |
| 套件 | exceljs（讀寫皆用）|
| 既有腳本 | `import-tours.sh` 維持獨立，只共用純工具函式 |

---

## 十、相關現有檔案（實作參考）

- Schema：`web/prisma/schema.prisma`
- Tour CRUD：`web/src/app/api/admin/tours/route.ts`、`.../tours/[id]/route.ts`（欄位約束、slug 產生、writeLog）
- Region/Tag：`web/src/app/api/admin/regions/route.ts`、`.../tags/route.ts`
- 列表頁與工具列：`web/src/app/(admin-panel)/admin/tours/page.tsx`、`web/src/components/admin/tours/TourListClient.tsx`
- 慣例：`memory/project_admin_crud_pattern.md`、`memory/project_architecture.md`
- 既有腳本與 fixtures：`web/scripts/import-tours.{sh,ts}`、`web/scripts/fixtures/README.md`
