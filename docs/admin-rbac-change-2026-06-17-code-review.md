# 後台 RBAC 調整 Code Review（2026-06-17）

Review 目標：檢視 `docs/admin-rbac-change-2026-06-17.md` 所描述的後台 RBAC 收緊變更，確認 STAFF 僅能操作地區分類、標籤管理、行程管理，其餘功能應限 ADMIN。

## Findings

### P1：STAFF 仍可透過上傳 API 寫入輪播圖儲存路徑

- 位置：
  - `web/src/app/api/admin/uploads/presign/route.ts:5`
  - `web/src/app/api/admin/uploads/presign/route.ts:17`
  - `web/src/app/api/admin/uploads/local/route.ts:11`
  - `web/src/app/api/admin/uploads/local/route.ts:14`
  - `web/src/app/(frontend)/page.tsx:23`
- 問題：
  本次變更把 `hero-banners` 頁面與 CRUD API 改成 ADMIN only，但 generic upload API 仍只要求登入。`presign` 的 `ALLOWED_FOLDERS` 仍包含 `"hero-banners"`，因此 STAFF 可以自行呼叫 `/api/admin/uploads/presign` 取得 `hero-banners/...` 的上傳授權。

  更嚴重的是 `/api/admin/uploads/local` 只檢查 session 與 key 基本格式，沒有驗證 key 是否來自 presign、也沒有依 role 限制 folder；任何已登入 STAFF 都可直接 `PUT /api/admin/uploads/local?key=hero-banners/...`。該 route 會呼叫目前設定的 `storage.put`，即使 production 使用 R2 driver，這條 route 仍可把 request body 寫進 R2。

  前台首頁會將 DB 中的 `heroBanner.imageKey` 轉成公開 URL 顯示；若 STAFF 從前台公開 URL 得知既有 key，便可能覆寫實際輪播素材。即使不知道既有 key，也仍可在 ADMIN-only 的 `hero-banners` namespace 建立檔案，與「STAFF 只能操作三項功能」的邊界不一致。
- 建議：
  上傳 API 也需要納入 RBAC。至少應讓非 ADMIN 不能使用 `hero-banners` folder；`local` receiver 應只接受由 presign 流程簽出的 key，或改成在 receiver 端重新解析 key prefix 並套用同一份 folder/role policy。

### P2：角色判斷仍信任 JWT payload，角色異動後既有 session 可能保留舊權限

- 位置：
  - `web/src/lib/auth.ts:51`
  - `web/src/lib/auth.ts:52`
  - `web/src/lib/auth.ts:57`
- 問題：
  `getSession()` 會驗證 JWT 並確認 DB session 尚未過期，但回傳的 `role` 來自 JWT payload，而不是目前 DB user row。若使用者在登入後被降權，既有 session 仍會帶著舊 role 通過本次新增的 ADMIN-only 頁面與 API 檢查，直到該 session 失效或使用者重新登入。

  這個問題不是本次 diff 新增的，但本次 RBAC 收緊把更多安全邊界建立在 `session.role !== "ADMIN"` 上，因此需要一起處理或明確接受此限制。
- 建議：
  `getSession()` 查 DB session 時一併 select user role，並以 DB 中的目前角色作為授權來源；或在管理員調整使用者角色時，同步刪除該使用者既有 session。

## 已確認項目

- `AdminSidebar` 對 `hero-banners` 與 `settings` 增加 item-level `adminOnly`，並會在 STAFF 過濾後隱藏空群組，符合需求。
- `hero-banners` 三個頁面已補上非 ADMIN redirect。
- `settings/page.tsx` 已改成 server wrapper，先檢查 session 與 role，再載入 client form。
- `hero-banners` 的 POST、PUT、DELETE、reorder PATCH 皆已改成 ADMIN only。
- `admin/settings` 的 GET 與 PUT 皆已改成 ADMIN only。
- 前台讀取社群連結走公開 `app/api/settings/route.ts` 或 server component 直接查 DB，未受到 `admin/settings` 收緊影響。

## 測試

- 未執行自動化測試；本次為靜態 code review。
