# 後台 RBAC 第二輪 Code Review 處理結果（2026-06-18）

> 對應 review 文件：`docs/admin-rbac-change-2026-06-17-followup-code-review.md`
> 前次處理結果：`docs/admin-rbac-change-2026-06-17-review-followup.md`

## 結論

Codex 第二輪 review 提出 1 項 finding（`uploads/local` 在 R2 production 下仍是任意 key 的 server-side write proxy）。**已採納並修正**，通過 `tsc`、ESLint，以及 R2 / local 兩種 driver 的 runtime 驗證。

| Finding | 嚴重度 | 決定 | 狀態 |
| --- | --- | --- | --- |
| `uploads/local` 在 R2 driver 下仍可被任一登入者用來覆寫 allowed-folder 物件，繞過表單／DB／日誌 | P2（資產完整性風險）| 採納 | ✅ 已修正並驗證 |

---

## Finding：`uploads/local` 在 R2 下應停用

### 問題
`/api/admin/uploads/local` 原本是 **local disk driver 專用的接收端**（client 把檔案 body PUT 到這條 route 落地）。但它在任何 driver 下都存在；在 R2 production 下，已登入使用者只要提供任一 allowed folder 的 key（如 `tours/...`、`regions/...`、`tour-files/...`、`seo-og/...`），就會走到 `storage.put(key, body, contentType)`，透過伺服器端 R2 credentials 直接寫入 R2 —— 不需經過 presign、也無法保證 key 是本次流程簽出。

後果：STAFF 雖已無法跨入 `hero-banners`（前一輪 P1 修正），但仍可覆寫已知的 tours/regions/SEO/tour-files 物件，繞過表單流程、DB 更新與活動日誌，屬資產完整性風險。

### 採用的修法（Codex 優先建議）
讓 `uploads/local` **只在 local storage driver 下作用，R2 driver 下回 404**。

設計依據：R2 driver 的 `createUploadAuth()` 回傳的是直連 R2 的 presigned URL，client 在 R2 下**從不**呼叫此 route（只有 local driver 的 `createUploadAuth()` 把 `uploadUrl` 指向 `/api/admin/uploads/local`）。因此在 R2 下停用此 route 完全符合設計意圖，可直接消除這個 server-side write proxy 攻擊面，且不需引入更大工程的 HMAC／一次性 token 簽章機制。

實作：

```ts
// lib/storage.ts（新增匯出）
/**
 * True only when the active driver writes to local disk. The R2 driver uploads
 * directly to R2 via presigned URLs, so the server-side `/api/admin/uploads/local`
 * receiver must be disabled (404) under R2 to avoid an arbitrary-write proxy.
 */
export const isLocalStorageDriver = storage instanceof LocalDriver;
```

```ts
// app/api/admin/uploads/local/route.ts（PUT 最前端的 guard）
if (!isLocalStorageDriver) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

guard 置於 session 檢查之前，使 R2 下此 route 對所有人（含未認證、含 ADMIN）皆回 404，等同「此部署不存在這條 route」，不洩漏資訊。

### 為何不在本輪做 HMAC token
Codex 將 HMAC／一次性 token 列為「若仍要保留 receiver」的次要選項。由於 receiver 本質上只服務 local driver，R2 下停用即可根除風險；HMAC 方案複雜度高且對 local 開發無實益，故不納入。已在「未納入」記錄供未來若需在 R2 下保留 receiver 時參考。

---

## 驗證結果

環境：本機 Postgres + dev server；帳號 ADMIN `admin001`、STAFF `staff001`。為測試兩種 driver 行為，期間暫改 `.env.local`（R2 用 dummy 憑證讓 driver 可實例化／local driver），**測後已還原為原始內容**（與測試前備份逐位元相符）。

> 註：切換 driver/重啟多次後 Turbopack 會出現 stale 快取（部分路由誤判 404）；`rm -rf .next` 清快取重啟即恢復，與本次程式邏輯無關。

### 靜態
- `tsc --noEmit`：通過
- ESLint（變更檔）：通過

### Test A — R2 driver（dummy 憑證）：receiver 停用
| 請求 | 預期 | 實測 |
| --- | --- | --- |
| ADMIN PUT `local?key=hero-banners/...` | 404 | ✅ 404 |
| ADMIN PUT `local?key=tours/...` | 404 | ✅ 404 |
| 未認證 PUT `local?key=tours/...` | 404 | ✅ 404 |
| ADMIN presign `tours`（R2 上傳路徑正常）| 200 + 直連 R2 的 signed URL | ✅ 200 |

### Test B — local driver：receiver 正常 + 前輪 RBAC 完好
| 請求 | 預期 | 實測 |
| --- | --- | --- |
| STAFF PUT `local?key=tours/...` | 200 | ✅ 200 |
| STAFF PUT `local?key=hero-banners/...` | 403 | ✅ 403 |
| STAFF PUT `local?key=evil/...`（非允許 folder）| 400 | ✅ 400 |
| STAFF presign `tours` | 200 | ✅ 200 |
| STAFF presign `hero-banners` | 403 | ✅ 403 |
| ADMIN PUT `local?key=hero-banners/...` | 200 | ✅ 200 |

兩種 driver 行為皆符合預期：R2 下 receiver 完全停用；local 下 receiver 正常且 folder/role 政策不受影響。

---

## 本輪異動檔案

| 檔案 | 變更 |
| --- | --- |
| `web/src/lib/storage.ts` | 新增匯出 `isLocalStorageDriver`（`storage instanceof LocalDriver`）|
| `web/src/app/api/admin/uploads/local/route.ts` | PUT 最前端加入 `!isLocalStorageDriver → 404` guard |

## 累積已確認（截至本輪）
- Sidebar／頁面 redirect／API 三層 RBAC：STAFF 僅可操作 regions／tags／tours。
- 上傳 folder/role 政策集中於 `lib/storage.ts`，`hero-banners` 限 ADMIN。
- `getSession()` 以 DB user role 為授權來源（降權即時生效）。
- `uploads/local` 僅 local driver 可用，R2 下停用（本輪）。

## 未納入（記錄供後續評估）
- 若未來需在 R2 下保留 server-side receiver，應改為要求 presign 階段簽出的 HMAC／一次性 token，並驗證 folder／key／contentType／到期／角色一致。目前以「R2 下停用 receiver」根除風險，暫無此需求。
