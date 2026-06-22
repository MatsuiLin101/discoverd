# 後台 RBAC Follow-up Code Review（2026-06-18）

Review 目標：檢視 Claude 依據 `docs/admin-rbac-change-2026-06-17-code-review.md` 所做的 follow-up 修補，並對照 `docs/admin-rbac-change-2026-06-17-review-followup.md` 的處理結果。

## Findings

### P2：`uploads/local` 仍是可公開呼叫的任意 key 寫入入口

- 位置：
  - `web/src/app/api/admin/uploads/local/route.ts:10`
  - `web/src/app/api/admin/uploads/local/route.ts:19`
  - `web/src/app/api/admin/uploads/local/route.ts:26`
  - `web/src/app/api/admin/uploads/local/route.ts:44`
  - `web/src/lib/storage.ts:110`
- 問題：
  本輪修補已阻止 STAFF 寫入 `hero-banners`，也會拒絕不在 allowlist 的 folder；這解掉前一輪 P1 的 admin-only namespace 問題。

  但 `uploads/local` route 仍然是所有已登入使用者可直接呼叫的 server-side write proxy。呼叫者只要提供任一允許 folder 底下的 key，例如 `tours/...`、`regions/...`、`tour-files/...` 或 `seo-og/...`，就會走到 `storage.put(key, body, contentType)`。在 R2 driver 下，這仍會透過伺服器端 credentials 對 R2 執行 `PutObjectCommand`，不需要經過 presign 產生的隨機 key，也不需要證明該 key 是本次上傳流程簽出的。

  因此 STAFF 雖然不能再跨到 `hero-banners`，但仍可覆寫已知的 tours/regions/SEO OG/tour-files 物件 key，繞過表單流程、DB 更新與活動日誌。這和 follow-up 文件中「local receiver 的 key 仍未強制必須由 presign 簽出」的未納入項目相同，但它不只是可選強化；因為 route 在 R2 production 也可被直接打到，仍然是資產完整性風險。
- 建議：
  優先讓 `uploads/local` 只在 local storage driver 時可用；R2 driver 下應拒絕此 route 或回 404/400。若仍要保留 receiver，應要求 key 帶有 presign 階段產生的 HMAC/一次性 token，並驗證 folder、key、contentType、到期時間與角色政策一致。

## 已確認修正

- 前一輪 P1 的核心問題已修正：`presign` 對 `hero-banners` 套用 ADMIN-only 檢查，`local` receiver 也會由 key 反推 folder 並拒絕 STAFF 寫入 `hero-banners`。
- `ALLOWED_UPLOAD_FOLDERS` 與 `ADMIN_ONLY_UPLOAD_FOLDERS` 集中到 `web/src/lib/storage.ts`，避免 `presign` 與 `local` route 重複維護不同政策。
- 前一輪 P2 已修正：`getSession()` 現在 select DB user role，並以 `session.user.role` 作為授權來源，角色異動可在既有 session 中立即反映。
- `matchUploadFolder()` 使用 `${folder}/` 前綴比對，避免 `hero-banners2/...` 這類相似 prefix 被誤判。

## 測試

- 未執行自動化測試；本次為靜態 code review。
