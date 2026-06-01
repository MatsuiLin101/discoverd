# Demo 實作計畫：行程內容編輯器

## 目的

讓客戶親手試用「方案 A · 行程圖片上傳」與「方案 B · Rich Text 編輯器」兩種內容管理方式，
體驗實際操作後再決定採用哪個方案。

---

## 技術選型

- **純 HTML + CDN**，不需 `npm install`，瀏覽器直接開啟即可執行
- **Tailwind CSS CDN**（`https://cdn.tailwindcss.com`）
- **Quill.js 1.3.7 CDN**（`cdn.jsdelivr.net`，Snow theme）
- **FileReader API**（原生，圖片轉 base64）
- **localStorage**（資料持久化，key: `demo_tours`）

---

## 檔案結構

```
demo/
├── PLAN.md         # 本文件
├── admin.html      # 後台：新增 / 編輯行程，可切換兩種編輯器
└── showcase.html   # 展示頁：行程列表 + 詳情 Modal
```

---

## 資料結構（localStorage）

```json
[
  {
    "id": "1748500000000",
    "name": "北海道 5 日溫泉之旅",
    "destination": "日本 · 北海道",
    "tags": ["熱門", "超值"],
    "price": 45800,
    "thumbnail": "data:image/jpeg;base64,...",
    "contentType": "image",
    "images": ["data:image/jpeg;base64,..."],
    "richText": ""
  }
]
```

- `contentType`: `"image"` | `"richtext"`
- `images`: base64 陣列（方案 A 用）
- `richText`: Quill 輸出的 HTML 字串（方案 B 用）

---

## admin.html 規格

### CDN
```html
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js"></script>
```

### 版面
```
[導覽列] Demo 後台 · 找到了旅遊                    [查看展示頁 →]

[Tab 切換]
  [ 方案 A · 行程圖片上傳 ]  [ 方案 B · Rich Text 編輯器 ]

[共用欄位]
  行程名稱（text）
  目的地分類（text）
  標籤（checkbox：熱門 / 超值 / 限時）
  門市價格（number）
  縮圖（file → FileReader → <img> 預覽）

[內容區域 — 依 Tab 切換]
  Tab A：多張圖片上傳 → 縮圖預覽列 → 可刪除單張
  Tab B：Quill.js 編輯器（H2/H3、粗體、清單、分隔線）

[儲存按鈕] → localStorage CRUD → 「儲存成功」提示

[已儲存行程列表]（表格）
  行程名稱 | 目的地 | 類型 | 價格 | [編輯] [刪除]
```

### 行為
- 切換 Tab 時，共用欄位不清空
- 點「編輯」：填回所有欄位，捲動至表單頂端
- 點「刪除」：直接從 localStorage 移除，重新渲染列表
- `id` 為時間戳，新增時產生，編輯時保留原 id

---

## showcase.html 規格

### 版面
```
[導覽列] 找到了旅遊 · 行程展示                     [前往後台 →]

[行程卡片列表] — 3 欄 Grid
  縮圖（object-cover）
  目的地（小標）
  行程名稱（標題）
  Tag badges（#D12351 底色）
  價格（粗體）
  類型 badge（右下角：圖片 / Rich Text）
  點擊卡片 → 開啟詳情 Modal

[詳情 Modal]（fixed inset-0，半透明黑色背景）
  左側 60%：
    contentType === 'image' → 垂直排列所有上傳圖片
    contentType === 'richtext' → 渲染 Quill HTML（套用 .ql-editor 樣式）
  右側 40%：
    目的地、行程名稱、Tag badges、門市價格
    [✕ 關閉]
```

### 行為
- 頁面載入讀取 localStorage；無資料時顯示「尚無行程，請前往後台新增」
- 點背景或按 ESC 可關閉 Modal
- Modal 開啟時 `body` 加 `overflow: hidden`
- 需引入 Quill Snow CSS 確保 `.ql-editor` 樣式正確渲染

---

## 品牌設計
- 主色：`#D12351`（導覽列底色、Tag、價格、按鈕）
- 字體：Noto Sans TC（Google Fonts）
- 背景：`#fffcfd`（暖白）
- 卡片：`rounded-2xl`、hover 陰影加深

---

## 實作順序

1. `admin.html`
   - HTML 骨架 + CDN 引入
   - 共用欄位 + 縮圖預覽
   - Tab 切換邏輯
   - 方案 A：多圖上傳 + FileReader + 預覽刪除
   - 方案 B：Quill 初始化 + 工具列
   - localStorage CRUD
   - 行程列表渲染 + 編輯 / 刪除

2. `showcase.html`
   - HTML 骨架 + CDN 引入
   - 讀取 localStorage，渲染卡片 Grid
   - Modal 開啟 / 關閉
   - 依 contentType 渲染圖片或 Rich Text

---

## 驗證步驟

1. 開啟 `demo/admin.html`（直接 file:// 或 `python3 -m http.server 8080`）
2. 切換到「方案 A」：上傳 2–3 張圖片，填妥欄位，按儲存
3. 切換到「方案 B」：輸入含格式文字（粗體、清單），按儲存
4. 開啟 `demo/showcase.html`，確認兩筆行程卡片出現
5. 點方案 A 卡片 → Modal 顯示多張圖片
6. 點方案 B 卡片 → Modal 顯示正確排版的 Rich Text
7. 回 admin 點「編輯」，確認欄位回填正確，修改後再存，showcase 同步更新
