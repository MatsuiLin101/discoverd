# 後台 RBAC 第二輪 Follow-up Code Review（2026-06-18）

Review 目標：檢視 Claude 針對 `docs/admin-rbac-change-2026-06-17-followup-code-review.md` 的修補結果，對照 `docs/admin-rbac-change-2026-06-18-review-followup-2.md`，判斷是否仍需調整，或是否可以 commit。

## 結論

可以 commit。以目前部署策略「production 使用 R2、local driver 主要供本機或未來遷移」為前提，本輪修補已解掉前次 P2：`/api/admin/uploads/local` 在 R2 driver 下會於最前端直接回 404，不再是可被登入使用者濫用的 server-side write proxy。

本次 review 未發現阻擋 commit 的新問題。

## Findings

無 blocking findings。

## 已確認項目

- `web/src/app/api/admin/uploads/local/route.ts` 在進行 session、key、content-type 檢查前，先以 `isLocalStorageDriver` 判斷 active driver；非 local driver 時一律回 404。
- `web/src/lib/storage.ts` 的 `isLocalStorageDriver = storage instanceof LocalDriver` 在同一 module 內判斷 active driver instance，能區分 R2 與 local driver。
- R2 driver 的正常上傳流程仍走 `presign` 回傳的 R2 signed URL，不依賴 `/api/admin/uploads/local`。
- local driver 下仍保留 receiver，並沿用上一輪新增的 folder allowlist 與 `hero-banners` ADMIN-only policy。
- `getSession()` 以 DB user role 作為授權來源的修補仍在，目前未看到與本輪修改衝突。

## 仍需共識的點

目前主要不是程式碼衝突，而是「local receiver 的安全邊界」要用哪個部署前提來定義。

### 已達成的共識

- R2 production 下，`/api/admin/uploads/local` 不應存在為可用寫入入口。
- 停用 local receiver 是比導入 HMAC 更小、更直接的修法，符合目前 R2 direct-upload 設計。
- `hero-banners` 屬 ADMIN-only folder，presign 與 local receiver 都要套用相同 folder/role policy。

### 還需要產品/部署決策的部分

- 如果 production 長期使用 R2：本次修補足夠，可以 commit。
- 如果未來真的把 `STORAGE_DRIVER=local` 用在 production：目前 local receiver 仍允許已登入使用者對 allowed folders 提供任意 key 寫入。這對本機開發可接受，但對 production 資產完整性仍偏弱，屆時應先補 HMAC／一次性 upload token，或至少把 local production 的 receiver 做成只能接受 presign 階段簽出的 key。

建議把這件事作為後續部署決策或技術債記錄，而不要阻擋本次 RBAC commit：本次需求的 production 風險已被 R2 404 guard 解掉。

## Commit 建議

可以 commit，但 commit message 建議涵蓋完整 RBAC 與上傳安全修補，例如：

```text
fix(admin): restrict admin-only RBAC and upload paths
```

若想拆 commit，較乾淨的切法是：

```text
fix(admin): restrict hero banner and settings access
fix(upload): enforce role-aware upload folder policy
fix(auth): authorize sessions with live user role
```

## 測試

- 未執行自動化測試；本次為靜態 code review。
- 參考 Claude 記錄：`tsc --noEmit`、ESLint、R2/local driver runtime 驗證皆通過。
