# 後台權限調整變更說明（2026-06-17）

> 供 code review 使用。本次變更目標：收緊後台 RBAC，讓「一般使用者（STAFF）」只能操作三項功能，其餘功能僅限「管理員（ADMIN）」。

## 1. 需求

後台原本除了 `users`（使用者管理）與 `logs`（操作日誌）限定 ADMIN 之外，其他功能（含 `hero-banners` 輪播圖、`settings` 社群連結）只要登入（不分角色）即可操作。

新規則：

| 功能 | 路由 | STAFF | ADMIN |
| --- | --- | :---: | :---: |
| 地區分類 | `/admin/regions` | ✅ | ✅ |
| 標籤管理 | `/admin/tags` | ✅ | ✅ |
| 行程管理 | `/admin/tours` | ✅ | ✅ |
| 輪播圖管理 | `/admin/hero-banners` | ❌ | ✅ |
| 社群連結 | `/admin/settings` | ❌ | ✅ |
| 操作日誌 | `/admin/logs` | ❌ | ✅ |
| 使用者管理 | `/admin/users` | ❌ | ✅ |

> `hero-banners` 與 `settings` 為本次新收緊的項目；`logs`／`users` 原本就已是 ADMIN only。

## 2. 設計：三層防護

權限以三個層級重複把關，前端隱藏只是 UX，真正的安全邊界在頁面 redirect 與 API 403。

1. **Sidebar（UX 隱藏）**：`components/admin/AdminSidebar.tsx`
2. **頁面層（Server Component redirect）**：非 ADMIN 直接 `redirect("/admin")`
3. **API 層（403）**：`if (!session || session.role !== "ADMIN")` 回 `403 權限不足`

實作沿用既有 `logs`／`users` 的慣例（`redirect("/admin")` 與 `{ error: "權限不足" }, { status: 403 }`），未引入新抽象，以維持程式碼一致性。

## 3. 變更檔案清單

共 9 檔修改 + 1 檔新增：

| 檔案 | 變更 |
| --- | --- |
| `components/admin/AdminSidebar.tsx` | `NavItem` 新增 `adminOnly`；標記輪播圖／社群連結；STAFF 過濾 item，空 group 整組隱藏 |
| `app/(admin-panel)/admin/hero-banners/page.tsx` | 加入 ADMIN redirect |
| `app/(admin-panel)/admin/hero-banners/new/page.tsx` | 加入 ADMIN redirect |
| `app/(admin-panel)/admin/hero-banners/[id]/page.tsx` | 加入 ADMIN redirect |
| `app/(admin-panel)/admin/settings/page.tsx` | 由 Client Component 改為 Server wrapper（做權限檢查）|
| `components/admin/settings/SettingsForm.tsx` | **新增**：原 settings client 表單邏輯搬移至此 |
| `app/api/admin/hero-banners/route.ts` | POST 改 ADMIN 檢查 |
| `app/api/admin/hero-banners/[id]/route.ts` | PUT／DELETE 改 ADMIN 檢查 |
| `app/api/admin/hero-banners/reorder/route.ts` | PATCH 改 ADMIN 檢查 |
| `app/api/admin/settings/route.ts` | GET／PUT 改 ADMIN 檢查 |

## 4. 關鍵實作細節

### 4.1 Sidebar：item 層級 `adminOnly` + 空群組隱藏

`NavItem` 原本只有 group 層級 `adminOnly`。本次新增 item 層級，因為「前台管理」群組同時含 STAFF 可見（regions/tags/tours）與 ADMIN only（hero-banners/settings）項目，無法整組標記。

```tsx
interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;   // 新增
}

// 渲染時
{navGroups.map((group, i) => {
  if (group.adminOnly && role !== "ADMIN") return null;
  const items =
    role === "ADMIN"
      ? group.items
      : group.items.filter((item) => !item.adminOnly);
  if (items.length === 0) return null;   // 過濾後空群組整組隱藏
  ...
})}
```

### 4.2 settings 由 Client 改為 Server wrapper

原 `settings/page.tsx` 是 `"use client"`，無法在伺服器端做角色守衛。改為：

- `settings/page.tsx`：Server Component，`getSession()` → 非 ADMIN `redirect("/admin")`，再渲染 `<SettingsForm />`
- `components/admin/settings/SettingsForm.tsx`：原樣搬移的 client 表單（邏輯未改，只是位置）

### 4.3 API 角色檢查

所有受限 API 一致改為：

```ts
const session = await getSession();
if (!session || session.role !== "ADMIN") {
  return NextResponse.json({ error: "權限不足" }, { status: 403 });
}
```

## 5. 刻意未改動 / 影響評估

- **`uploads`（local/presign）維持 session-only**：STAFF 上傳 tours／regions 圖片需要，不可限 ADMIN。
- **前台社群連結不受影響**：前台讀取走獨立公開路由 `app/api/settings/route.ts` 與 `components/frontend/SiteFooter.tsx` 直接查 DB，與被收緊的 `app/api/admin/settings` 無關。
- **`proxy.ts` 未改**：仍只驗證 JWT 有效性（登入與否），角色判斷交給頁面／API 層。

## 6. 驗證結果

已啟動本機 DB + dev server 實測（測試帳號：ADMIN `admin001` / STAFF `staff001`）：

- `tsc --noEmit` 通過、ESLint 通過。
- **STAFF**：admin-only 頁面全部 `307 → /admin`；admin-only API 全部 `403`；regions/tags/tours 頁面 `200`。
- **ADMIN**：所有頁面與 admin API 全部 `200`。
- **瀏覽器**：STAFF 側邊欄僅顯示「後台首頁／地區管理／標籤管理／旅遊方案」，輪播圖、社群連結、系統管理群組皆隱藏。

## 7. Reviewer 可重點關注

1. 三層防護是否有遺漏的 admin-only 端點（特別是 hero-banners 的子路由與任何 batch 操作）。
2. `AdminSidebar` 空群組隱藏邏輯是否正確（系統管理群組對 STAFF 應整組消失）。
3. settings 由 client 改 server wrapper 後，表單行為是否與原本一致（功能未變動）。
4. 「全域單一登入」限制（login 回 `409`）在此次無關，但測多角色時需先 logout。
