# 後台 RBAC Code Review 處理結果（2026-06-17）

> 對應 review 文件：`docs/admin-rbac-change-2026-06-17-code-review.md`
> 原始變更說明：`docs/admin-rbac-change-2026-06-17.md`

## 結論

Codex 提出的 **P1、P2 兩項 finding 全部採納並修正**。已通過 `tsc`、ESLint，以及本機 DB + dev server 的 runtime 驗證（含 STAFF/ADMIN 上傳權限與「降權即時生效」情境）。

| Finding | 嚴重度 | 決定 | 狀態 |
| --- | --- | --- | --- |
| P1 上傳 API 未納入 RBAC，STAFF 可寫入 `hero-banners` namespace | P1 | 採納 | ✅ 已修正並驗證 |
| P2 授權信任 JWT payload role，降權後舊 session 保留舊權限 | P2 | 採納 | ✅ 已修正並驗證 |

---

## P1：上傳 API 納入 folder/role 政策

### 問題
`hero-banners` 頁面與 CRUD API 已收緊為 ADMIN，但 generic upload API 仍只檢查登入：
- `presign` 的 `ALLOWED_FOLDERS` 含 `hero-banners` → STAFF 可取得 `hero-banners/...` 上傳授權。
- `local` receiver 完全不驗證 folder，任何登入者可 `PUT ?key=hero-banners/...` 直接寫檔（R2 driver 下亦可寫進 R2）。

### 修法
將 folder 政策集中到 `lib/storage.ts`，兩個 route 共用，避免重複定義：

```ts
// lib/storage.ts（新增匯出）
export const ALLOWED_UPLOAD_FOLDERS = new Set([
  "tour-files", "tours", "regions", "hero-banners",
  "seo-og/tours", "seo-og/regions", "seo-og/subregions",
]);
export const ADMIN_ONLY_UPLOAD_FOLDERS = new Set(["hero-banners"]);

/** 由 key 反推所屬 folder，不屬於任何允許 folder 則回 null */
export function matchUploadFolder(key: string): string | null {
  for (const folder of ALLOWED_UPLOAD_FOLDERS) {
    if (key.startsWith(`${folder}/`)) return folder;
  }
  return null;
}
```

- **presign**：改用共用的 `ALLOWED_UPLOAD_FOLDERS`，並在 folder 屬 `ADMIN_ONLY_UPLOAD_FOLDERS` 時要求 `session.role === "ADMIN"`，否則 403。
- **local receiver**：不再盲目信任 key，先用 `matchUploadFolder(key)` 反推 folder（順帶修正原本「任何 key 都可寫」的問題：非允許 folder 一律 400），再套用同一份 admin-only/role 政策。

> 設計取捨：採用 review 建議的「receiver 端重新解析 key prefix 並套用同一政策」。完整的「key 必須由 presign 簽出（HMAC）」屬更大範圍的強化，本次未納入；receiver 仍信任 key 來源是既有設計限制，但 STAFF 跨越 RBAC 邊界寫入 `hero-banners` 的問題已堵住。

### 影響評估
- STAFF 仍可正常上傳 `tours`、`tour-files`、`regions`、`seo-og/*`（皆為 STAFF 可操作功能所需），未受影響。
- ADMIN 上傳 `hero-banners` 不受影響。

---

## P2：以 DB 的 user role 作為授權來源

### 問題
`getSession()` 回傳的 `role` 取自 JWT payload，而非當前 DB user row。使用者被降權後，既有 session 仍帶舊 role 通過 ADMIN-only 檢查，直到 session 失效或重新登入。本次 RBAC 把更多邊界建在 `session.role` 上，需一併處理。

### 修法
`getSession()` 查 DB session 時一併 `select` user 的 `role`，並以 **DB 的 role** 作為回傳授權依據（JWT payload 不再被信任為授權來源）：

```ts
const session = await db.session.findUnique({
  where: { token },
  include: { user: { select: { username: true, displayName: true, role: true } } },
});
if (!session || session.expiresAt < new Date()) return null;
// Authorize off the live DB role, not the JWT payload, so role changes
// (e.g. demotion) take effect immediately for existing sessions.
return { userId: payload.userId, role: session.user.role, username: session.user.username, displayName: session.user.displayName };
```

採此根本修法（而非「改 role 時刪 session」），因為它涵蓋所有情境且讓 DB 成為單一授權真實來源；不需額外在 user 更新流程加 side effect。

### 影響評估
- `getSession().role` 由 `string` 變為 Prisma `Role` enum；所有呼叫端皆以 `session.role !== "ADMIN"` 字串比較或 `as` 轉型，`tsc` 通過、無破壞。
- 額外多 select 一個欄位，無額外查詢，效能影響可忽略。

---

## 驗證結果

環境：本機 Postgres + dev server（測試期間暫用 `STORAGE_DRIVER=local` 以實測上傳，測後已還原為 `r2`）；帳號 ADMIN `admin001`、STAFF `staff001`。

### 靜態
- `tsc --noEmit`：通過
- ESLint（變更檔）：通過

### P1 — 上傳 folder/role 政策
| 角色 | 操作 | 預期 | 實測 |
| --- | --- | --- | --- |
| STAFF | presign `hero-banners` | 403 | ✅ 403 |
| STAFF | presign `tours` / `seo-og/tours` | 200 | ✅ 200 |
| STAFF | local PUT `key=hero-banners/...` | 403 | ✅ 403 |
| STAFF | local PUT `key=tours/...` | 200 | ✅ 200 |
| STAFF | local PUT `key=evil/...`（非允許 folder）| 400 | ✅ 400 |
| ADMIN | presign `hero-banners` | 200 | ✅ 200 |
| ADMIN | local PUT `key=hero-banners/...` | 200 | ✅ 200 |

### P2 — DB role 即時生效（同一 session cookie 全程不變）
| 步驟 | 預期 | 實測 |
| --- | --- | --- |
| staff001=STAFF，GET `/api/admin/settings` | 403 | ✅ 403 |
| DB 將 staff001 改為 ADMIN 後（同 cookie） | 200 | ✅ 200 |
| DB 將 staff001 改回 STAFF 後（同 cookie） | 403 | ✅ 403 |

### 回歸（getSession 改動後）
- STAFF：admin-only 頁面（settings/hero-banners/logs/users）皆 `307 → /admin`；regions/tags/tours 及後台首頁皆 `200`；公開 `api/regions` `200`。無破壞。

---

## 本輪新增/異動檔案

| 檔案 | 變更 |
| --- | --- |
| `web/src/lib/storage.ts` | 新增匯出 `ALLOWED_UPLOAD_FOLDERS`、`ADMIN_ONLY_UPLOAD_FOLDERS`、`matchUploadFolder()` |
| `web/src/app/api/admin/uploads/presign/route.ts` | 改用共用 folder 集合 + admin-only folder 的 role 檢查 |
| `web/src/app/api/admin/uploads/local/route.ts` | 由 key 反推 folder，套用同一 folder/role 政策（非允許 folder 回 400） |
| `web/src/lib/auth.ts` | `getSession()` 以 DB user role 作為授權來源 |

## 未納入（記錄供後續評估）
- upload `local` receiver 的 key 仍未強制「必須由 presign 簽出」（HMAC 簽章）；屬既有設計限制，與本次 RBAC 邊界無直接衝突，列為後續可選強化。
