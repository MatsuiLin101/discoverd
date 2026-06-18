# 部署／實作備忘：Oracle VPS + Cloudflare R2

**版本：** 1.0
**日期：** 2026-06-16
**適用對象：** 工程實作 / 部署維運
**範圍：** 主機由 AWS Lightsail 改為 Oracle Cloud（Ampere A1）；檔案儲存先採 Cloudflare R2，並保留未來切換至本機磁碟的能力。

---

## 1. 背景與目標

- 主機改用 Oracle Cloud Always Free（Ampere A1 ARM）取代 proposal-v4 規劃的 AWS Lightsail，固定月費由 US$5–12 降為 **免費**。
- 拓撲不變：單機同時承載 Nginx + Next.js + PostgreSQL，與原 Lightsail 自管方案相同。
- 檔案儲存採「**先 R2、超量或有感成本時再轉本機**」策略。關鍵在於**現在就把儲存層抽象化**，讓未來切換只改設定、不改架構。
- 注意：目前程式碼實際使用的是 **Cloudinary**（見 `web/package.json`、`web/.env.local.example`）。本次需將儲存實作改接 R2，並藉此導入儲存抽象層。

---

## 2. 部署架構總覽

```
Cloudflare DNS / SSL / CDN
├── app 網域  (yourdomain.com)        → Oracle VPS:Nginx → Next.js
└── 檔案網域 (files.yourdomain.com)    → Cloudflare R2（未來可改指向 VPS:Nginx）

Oracle Cloud — Ampere A1 (ARM, Always Free)
├── Nginx          反向代理 / TLS origin / 靜態快取
├── Next.js App    前台 + 後台 + API（PM2 或 Docker）
└── PostgreSQL     行程、分類、標籤、設定、操作日誌（同機自管）

Cloudflare R2      行程 PDF / 圖片 / 縮圖 / OG 圖
Gmail SMTP         諮詢表單 Email 通知
```

設計重點：**檔案一律透過自有網域 `files.yourdomain.com` 對外提供**。將來檔案從 R2 搬到本機，只需把這個網域改指向 VPS 的 Nginx，所有既有連結照常可開。

---

## 3. 主機：Oracle Cloud Ampere A1

### 3.1 建議規格

| 項目 | 建議 |
|------|------|
| Shape | VM.Standard.A1.Flex（ARM Ampere） |
| OCPU / RAM | 至少 2 OCPU / 12 GB；Always Free 上限 4 OCPU / 24 GB 可全給本專案 |
| 磁碟 | Boot volume 50 GB 起；可加掛 Block Volume（免費額度共 200 GB） |
| OS | Ubuntu 22.04 LTS (aarch64) 或 Oracle Linux |
| 出站流量 | 每月 10 TB 免費 |

> 避免選 AMD Micro（1/8 OCPU、1 GB RAM）：記憶體不足以順跑 `next build`。

### 3.2 注意事項（ARM / Always Free）

- **架構為 arm64**：Node、Next.js、Prisma、`postgres:16-alpine` 皆支援，但 build 與 Docker image 必須在 arm64 環境產出，勿用 x86 image。
- **容量搶不到**：熱門區域常無法開 A1 instance（Out of host capacity），可換區域或寫腳本重試。
- **閒置回收**：Always Free 算力閒置可能被回收；可改為 PAYG（用量仍落在免費額度內即不收費）以避免被回收。
- **防火牆雙層**：需同時開 Oracle VCN Security List 與 instance 內 `iptables`/`ufw`（Ubuntu image 預設 iptables 會擋埠，是常見踩雷點）。對外只開 80 / 443，SSH 限來源 IP。

### 3.3 系統元件

| 元件 | 作法 |
|------|------|
| Next.js | PM2 常駐（`next start`）或 Docker；建議 standalone build 降低記憶體 |
| PostgreSQL | 同機自管（apt 安裝或 Docker），資料目錄放在掛載的 Block Volume |
| Nginx | 反向代理至 Next.js（`127.0.0.1:3000`），處理 TLS origin 與靜態快取 |
| TLS | Cloudflare proxy（橘雲）+ Cloudflare Origin Certificate 安裝於 Nginx |

---

## 4. 儲存策略：先 R2、可切換本機

### 4.1 核心原則

1. **抽象化**：所有上傳 / 刪除 / 取 URL 一律走單一儲存模組，業務程式不直接呼叫任何 SDK。
2. **DB 只存 key**：資料庫存物件 key 或相對路徑，**不存完整絕對網址**；對外 URL 由可設定的 base URL 組出。
3. **自有網域**：檔案一律經 `files.yourdomain.com` 提供，與底層儲存解耦。

> 成本提醒：R2 免費 10 GB／月，超量約 US$0.015／GB-月，**出站免費**。50 GB ≈ 每月 ~US$0.6、100 GB ≈ ~US$1.35。實務上「超量轉本機」的觸發點建議設在費用或請求數有感時，而非一超過 10 GB 就搬。

### 4.2 儲存抽象層設計

新增 `web/src/lib/storage.ts`，定義單一介面，R2 與本機各自為一個 adapter，由環境變數 `STORAGE_DRIVER` 切換：

```typescript
// web/src/lib/storage.ts
export interface StorageDriver {
  /** Return upload authorization for direct client upload (R2: presigned PUT). */
  createUploadAuth(key: string, contentType: string): Promise<UploadAuth>;
  /** Server-side upload (used by local driver, or small server-side writes). */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Build the public URL from a stored key + configured base URL. */
  publicUrl(key: string): string;
}

// Selected at runtime: "r2" | "local"
export const storage: StorageDriver = createDriver(process.env.STORAGE_DRIVER);
```

設計要點：

- **DB 欄位存 `key`**（例如 `tours/2026/abc123.pdf`），對外網址一律由 `storage.publicUrl(key)` 產出，base 來自 `STORAGE_PUBLIC_BASE_URL`。
- **上傳流程差異要包在 driver 內**：
  - R2：前端取得 presigned PUT，**直接上傳到 R2**（不經 App，省頻寬，適合 10–20 MB 大檔）。
  - 本機：前端把檔案 POST 給 App，由 `put()` 寫入磁碟，再由 Nginx 對外提供。
  - 因此前端上傳元件需同時支援「先要授權再 PUT」與「直接 POST」兩種；或統一先呼叫 `createUploadAuth`，本機 driver 回傳一個指向 App route 的上傳端點，讓前端流程一致。
- 既有 Cloudinary 程式碼改為 R2 driver 的實作；移除 `next.config.ts` 中 `res.cloudinary.com` 的 `remotePatterns`，改加入 `files.yourdomain.com`。

### 4.3 為什麼這樣切換成本最低

未來 R2 → 本機，只需要：(1) 把檔案搬到 VPS、(2) `STORAGE_DRIVER=local` 並調整 base URL、(3) `files.yourdomain.com` 改指向 VPS Nginx。**DB 不需大量改資料**（因為只存 key），舊連結也因網域不變而續用。Cloudflare 仍可在前面對本機檔案做 CDN 快取。

---

## 5. 環境變數調整

在 `web/.env.local.example` 移除／停用 Cloudinary，新增以下（實際值放正式環境的 `.env`，勿入庫）：

```bash
# Storage
STORAGE_DRIVER=r2                      # r2 | local
STORAGE_PUBLIC_BASE_URL=https://files.yourdomain.com

# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=discovered
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com

# Local driver (only used when STORAGE_DRIVER=local)
LOCAL_STORAGE_DIR=/var/www/discovered/uploads

# Database (本機自管 Postgres)
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/discovered
DIRECT_URL=postgresql://USER:PASSWORD@localhost:5432/discovered

# 既有：JWT_SECRET / GMAIL_USER / GMAIL_APP_PASSWORD / NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_GTM_ID
```

---

## 6. 初次部署步驟（概要）

1. 開立 A1 instance（Ubuntu 22.04 aarch64），設定 SSH 金鑰。
2. 開放埠：Oracle VCN Security List 與 instance `ufw` 同時放行 80 / 443；SSH 限來源 IP。
3. 安裝 Node ≥20.16.0（react-pdf/pdfjs-dist 需求；亦可用 22.x）、PostgreSQL 16、Nginx、PM2（或 Docker + Compose）。
4. 建立 DB 與使用者，設定 `DATABASE_URL`。
5. `git clone` → `cd web` → `npm ci` → 設定 `.env` → `npx prisma migrate deploy` → `npm run db:seed`。
6. `npm run build`（standalone）→ PM2 啟動 `next start`。
7. 設定 Nginx 反向代理（`proxy_pass http://127.0.0.1:3000`）+ Cloudflare Origin Cert。
8. Cloudflare：`yourdomain.com` 指向 VPS（橘雲代理）；`files.yourdomain.com` 綁定 R2 bucket 的自訂網域。
9. 建立 R2 bucket、API token，填入 R2 環境變數，驗證上傳 / 讀取 / 刪除。
10. **設定 R2 bucket CORS**（見下節）：前台用 PDF.js 在瀏覽器抓取 PDF 逐頁渲染，檔案網域與站台網域不同源，bucket 必須放行站台來源的 `GET`。

### 6.1 R2 CORS（前台 PDF 渲染必要）

前台行程內容以 PDF.js（`react-pdf`）在瀏覽器端跨源抓取 PDF 並逐頁渲染成 canvas。因檔案在 `files.yourdomain.com`、站台在 `yourdomain.com`，屬跨來源請求，R2 bucket 需設定 CORS 放行站台來源的 `GET`，否則 PDF 會載入失敗（圖片以 `<img>` 顯示則不受影響）。

於 Cloudflare R2 bucket → Settings → CORS Policy 加入（正式網域請替換，本機開發可另加 `http://localhost:3000`）：

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

> 切換至本機磁碟（`STORAGE_DRIVER=local`）時，檔案與站台同源，無此 CORS 需求。

---

## 7. 備份與維運

| 項目 | 作法 |
|------|------|
| 資料庫備份 | 定期 `pg_dump`，備份檔上傳至 R2（或另一 bucket）；保留輪替 |
| 主機備份 | 啟用 Oracle Boot/Block Volume Backup |
| 程式部署 | `git pull` → `npm ci` → `prisma migrate deploy` → `build` → PM2 reload |
| 監控 | CPU / RAM / 磁碟 / 流量；R2 儲存量與請求數；達 80% 發 Email 通知 |
| 安全 | 定期套件更新、SSH 限制、僅開必要埠 |

---

## 8. 未來遷移 R2 → 本機 Checklist

觸發時機：R2 費用或請求數達到有感程度（非一超過免費額度就搬）。

- [ ] 在 VPS 建立 `LOCAL_STORAGE_DIR`（建議放在 Block Volume），設好權限。
- [ ] 將 R2 既有物件同步到該目錄（`rclone` R2 → 本機，保留相同 key 路徑）。
- [ ] 設定 Nginx 對 `LOCAL_STORAGE_DIR` 提供靜態檔，含快取標頭與大檔 `Range` 支援。
- [ ] `files.yourdomain.com` 由 R2 改指向 VPS Nginx（Cloudflare 仍可代理快取）。
- [ ] 設定 `STORAGE_DRIVER=local`，確認 `STORAGE_PUBLIC_BASE_URL` 不變。
- [ ] **（安全前置，必做）** 強化 `/api/admin/uploads/local` receiver：目前它只在 local driver 下啟用，且只檢查「key 屬於允許 folder + folder/role policy」，**但不驗證 key 是否由 presign 流程簽出**。在 R2production 下此 route 已被 404 停用而無風險；一旦改用 local driver 於 production，登入者即可對 allowed folders 提供任意 key 覆寫物件（繞過表單 / DB / 活動日誌）。遷移前應先要求 key 帶 presign 階段簽出的 HMAC／一次性 token，並驗證 folder／key／contentType／到期／角色一致。詳見 `docs/admin-rbac-change-2026-06-18-review-followup-2.md`。
- [ ] 驗證上傳（改走 App route）、讀取、刪除；確認後台與前台皆正常。
- [ ] 將本機 `uploads/` 納入備份計畫。
- [ ] 觀察一段時間無誤後，再停用 R2 bucket。

---

## 9. 風險與注意事項

- **單機單點故障**：檔案若放本機，與 App / DB 同機，主機故障即全部受影響；備份策略務必落實。
- **ARM 相容性**：少數原生套件需確認 arm64 binary；CI / build 須在 arm64 進行。
- **大檔上傳**：R2 走 presigned 直傳；本機走 App 轉傳會吃 App 記憶體與頻寬，需設定上傳大小上限與逾時。
- **local driver 上傳信任邊界（技術債）**：`/api/admin/uploads/local` 在 R2 下停用、僅 local driver 啟用，且不驗證 key 來源。本機開發可接受，但若 production 改用 local driver，須先補 presign 簽出的上傳 token（見 section 8 checklist）。
- **絕對禁止存完整網址進 DB**：否則切換網域 / driver 時需大量資料遷移，違背本設計初衷。
- **Cloudflare 快取**：檔案網域開啟快取可同時加速 R2 與本機；更新 / 刪除檔案時注意快取失效（用內容雜湊 key 可天然避免快取衝突）。
