# 操作日誌功能測試計畫

## 前置條件

- 啟動 dev server：`cd web && npm run dev`
- 測試帳號（ADMIN）：`admin@email.com` / `zxcv1234`
- 日誌頁入口：`http://localhost:3000/admin/logs`
- 每個測試執行後，進入日誌頁查看最新一筆，核對下表所列欄位

## 如何讀取驗證點

- **✓** 表示該欄位須存在且有合理值
- **thumbnailChange** 可能值：`added` / `replaced` / `removed` / `unchanged`
- **hadThumbnail** 可能值：`true` / `false`
- REORDER 的 detail 只有 `count`，無 ID 陣列

---

## 第 1 章：登入功能

### T-01 以 ADMIN 帳號登入

**步驟：** 前往 `/admin/login`，輸入帳密後點「登入」

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | LOGIN |
| resource | AUTH |
| resourceName | admin@email.com |
| detail | — |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-02 登出

**步驟：** 在後台側邊欄點「登出」按鈕

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | LOGOUT |
| resource | AUTH |
| resourceName | admin@email.com |
| detail | — |

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 2 章：主分類（REGION）

### T-03 新增主分類（不上傳縮圖）

**步驟：** `/admin/regions` → 新增地區 → 填名稱與 slug，不選縮圖 → 送出

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | REGION |
| resourceName | （輸入的名稱） |
| detail 要點 | id ✓、name ✓、slug ✓、thumbnail: null |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-04 新增主分類（上傳縮圖）

**步驟：** 同上，額外選取圖片上傳

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | REGION |
| detail 要點 | id ✓、name ✓、slug ✓、thumbnail: （Cloudinary URL） |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-05 修改主分類名稱/slug（縮圖不動）

**步驟：** 進入既有主分類編輯頁 → 只改名稱或 slug → 不動縮圖 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | REGION |
| detail 要點 | id ✓、name ✓（新值）、slug ✓、thumbnailChange: unchanged |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-06 修改主分類並上傳第一張縮圖

**步驟：** 編輯一個目前沒有縮圖的主分類 → 上傳縮圖 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | REGION |
| detail 要點 | thumbnailChange: added |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-07 修改主分類並替換縮圖

**步驟：** 編輯一個已有縮圖的主分類 → 選擇新圖片上傳 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | REGION |
| detail 要點 | thumbnailChange: replaced |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-08 修改主分類並刪除縮圖

**步驟：** 編輯一個已有縮圖的主分類 → 點「刪除縮圖」（清除）→ 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | REGION |
| detail 要點 | thumbnailChange: removed |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-09 拖曳主分類排序

**步驟：** `/admin/regions` → 進入排序模式 → 拖曳改變順序 → 儲存排序

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | REORDER |
| resource | REGION |
| resourceName | 主分類排序 |
| detail 要點 | count: （排序的項目數）、無 order 陣列 |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-10 刪除主分類（無次分類）

**步驟：** 刪除一個沒有次分類的主分類

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | REGION |
| detail 要點 | id ✓、name ✓、hadThumbnail ✓、cascadeDeletedSubRegions: [] |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-11 刪除主分類（含 2 個次分類）

**步驟：** 建立一個有 2 個次分類（且無行程）的主分類 → 刪除該主分類

**預期日誌：** 應出現 **3 筆**新記錄：

1. REGION DELETE：`cascadeDeletedSubRegions` 含 2 項，每項有 `id`/`name`/`hadThumbnail`
2. SUB_REGION DELETE ×2：各自的 `detail.cascadeFrom` = 剛刪除的主分類名稱

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 3 章：次分類（SUB_REGION）

### T-12 新增次分類（不上傳縮圖）

**步驟：** 進入主分類編輯頁 → 新增次分類 → 填名稱與 slug，不選縮圖

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | SUB_REGION |
| detail 要點 | id ✓、name ✓、slug ✓、parentRegion ✓、thumbnail: null |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-13 新增次分類（上傳縮圖）

**步驟：** 同上，額外選取圖片上傳

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | SUB_REGION |
| detail 要點 | id ✓、name ✓、slug ✓、parentRegion ✓、thumbnail: （URL） |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-14 修改次分類名稱/slug（縮圖不動）

**步驟：** 編輯次分類 → 只改名稱或 slug → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | SUB_REGION |
| detail 要點 | id ✓、name ✓、slug ✓、thumbnailChange: unchanged |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-15 修改次分類並上傳第一張縮圖

**步驟：** 編輯無縮圖的次分類 → 上傳縮圖 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | SUB_REGION |
| detail 要點 | thumbnailChange: added |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-16 修改次分類並替換縮圖

**步驟：** 編輯已有縮圖的次分類 → 上傳新圖 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | SUB_REGION |
| detail 要點 | thumbnailChange: replaced |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-17 修改次分類並刪除縮圖

**步驟：** 編輯已有縮圖的次分類 → 點「刪除縮圖」→ 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | SUB_REGION |
| detail 要點 | thumbnailChange: removed |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-18 拖曳次分類排序

**步驟：** 主分類編輯頁 → 次分類排序 → 拖曳 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | REORDER |
| resource | SUB_REGION |
| detail 要點 | count: （排序的項目數）、無 order 陣列 |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-19 刪除次分類（無縮圖）

**步驟：** 刪除一個沒有縮圖的次分類（且無行程）

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | SUB_REGION |
| detail 要點 | id ✓、name ✓、hadThumbnail: false |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-20 刪除次分類（有縮圖）

**步驟：** 刪除一個有縮圖的次分類（且無行程）

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | SUB_REGION |
| detail 要點 | id ✓、name ✓、hadThumbnail: true |

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 4 章：標籤（TAG）

### T-21 新增標籤

**步驟：** `/admin/tags` → 新增標籤 → 填名稱 → 送出

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | TAG |
| resourceName | （輸入的名稱） |
| detail 要點 | id ✓、name ✓ |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-22 修改標籤名稱

**步驟：** 點擊標籤「編輯」→ 改名稱 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TAG |
| resourceName | （新名稱） |
| detail 要點 | id ✓、name（新值）✓ |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-23 刪除標籤

**步驟：** 點「刪除」→ 確認

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | TAG |
| detail 要點 | id ✓、name ✓ |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-24 拖曳標籤排序

**步驟：** `/admin/tags` → 進入排序模式 → 拖曳 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | REORDER |
| resource | TAG |
| detail 要點 | count ✓、無 order 陣列 |

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 5 章：行程（TOUR）

### T-25 新增行程（不上傳縮圖）

**步驟：** `/admin/tours` → 新增行程 → 填欄位，不選縮圖 → 送出

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | TOUR |
| detail 要點 | id ✓、name ✓、price ✓、subRegionId ✓、published ✓、thumbnail: null |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-26 新增行程（上傳縮圖）

**步驟：** 同上，額外選取縮圖上傳

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | TOUR |
| detail 要點 | thumbnail: （URL） |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-27 修改行程（縮圖不動）

**步驟：** 編輯行程 → 只改名稱/價格等欄位 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | id ✓、name ✓、thumbnailChange: unchanged |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-28 修改行程並新增縮圖

**步驟：** 編輯無縮圖的行程 → 上傳縮圖 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | thumbnailChange: added |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-29 修改行程並替換縮圖

**步驟：** 編輯已有縮圖的行程 → 上傳新縮圖 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | thumbnailChange: replaced |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-30 修改行程並移除縮圖

**步驟：** 編輯已有縮圖的行程 → 點「清除縮圖」→ 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | thumbnailChange: removed |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-31 刪除行程（無縮圖）

**步驟：** 刪除一個沒有縮圖的行程

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | TOUR |
| detail 要點 | id ✓、name ✓、hadThumbnail: false |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-32 刪除行程（有縮圖）

**步驟：** 刪除一個有縮圖的行程

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | TOUR |
| detail 要點 | id ✓、name ✓、hadThumbnail: true |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-33 拖曳行程排序

**步驟：** `/admin/tours` → 進入排序模式 → 拖曳 → 儲存

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | REORDER |
| resource | TOUR |
| detail 要點 | count ✓、無 order 陣列 |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-34 批量刪除（選 3 筆行程）

**步驟：** 勾選 3 筆行程 → 批量刪除 → 確認

**預期日誌：** **1 筆**新記錄
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | TOUR |
| resourceId | batch |
| detail 要點 | count: 3、items 含 3 個 {id, name} |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-35 批量發布（選 2 筆行程）

**步驟：** 勾選 2 筆未發布行程 → 批量發布

**預期日誌：** **1 筆**新記錄
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | count: 2、published: true、items 含 {id, name} |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-36 批量取消發布（選 2 筆行程）

**步驟：** 勾選 2 筆已發布行程 → 批量取消發布

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | count: 2、published: false |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-37 批量新增標籤（2 筆行程）

**步驟：** 勾選 2 筆行程 → 批量新增標籤 → 選擇標籤 → 確認

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | tagAction: add、tags 含標籤名稱、items 含 {id, name} |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-38 批量移除標籤（2 筆行程）

**步驟：** 勾選 2 筆行程 → 批量移除標籤 → 選擇標籤 → 確認

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | tagAction: remove |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-39 批量移動到其他次分類（2 筆行程）

**步驟：** 勾選 2 筆行程 → 批量移動地區 → 選擇目標次分類 → 確認

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | UPDATE |
| resource | TOUR |
| detail 要點 | targetSubRegion: （目標次分類名稱）、items 含 {id, name} |

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 6 章：行程附件（TOUR_FILE）

### T-40 上傳行程附件

**步驟：** 進入行程編輯頁 → 附件區域 → 上傳 1 個檔案（圖片或 PDF）

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | CREATE |
| resource | TOUR_FILE |
| resourceName | （檔案名稱） |
| detail 要點 | tourId ✓、tourName ✓、filename ✓、mimeType ✓ |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-41 刪除行程附件

**步驟：** 在行程附件清單點「刪除」→ 確認

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | DELETE |
| resource | TOUR_FILE |
| detail 要點 | tourId ✓、filename ✓ |

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-42 拖曳行程附件排序

**步驟：** 在行程編輯頁拖曳附件改變順序

**預期日誌：**
| 欄位 | 預期值 |
|------|--------|
| action | REORDER |
| resource | TOUR_FILE |
| detail 要點 | tourId ✓、count ✓、無 order 陣列 |

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 7 章：日誌頁篩選

### T-43 依資源類型篩選

**步驟：** 日誌頁 → 資源類型選「標籤」→ 套用篩選

**預期結果：** 只顯示 TAG 記錄，共 X 筆（與 TAG 操作次數吻合）

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-44 依動作篩選

**步驟：** 動作選「新增」→ 套用篩選

**預期結果：** 只顯示 CREATE 記錄

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-45 依日期篩選

**步驟：** 開始日期和結束日期都選今天 → 套用篩選

**預期結果：** 只顯示今天產生的記錄

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-46 重設篩選

**步驟：** 在任何篩選狀態下點「重設」

**預期結果：** 所有篩選條件清空，顯示全部記錄

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 第 8 章：權限控制

### T-47 未登入存取 API

**步驟：** 登出後在瀏覽器開啟開發者工具，執行：
```javascript
fetch('/api/admin/logs?page=1').then(r => r.json()).then(console.log)
```

**預期結果：** HTTP 403、回應 `{"error":"權限不足"}`

**結果：** ☐ Pass　☐ Fail　備註：___

---

### T-48 STAFF 帳號限制

**步驟：** 以 STAFF 帳號登入（若有），或直接訪問 `http://localhost:3000/admin/logs`

**預期結果：**
- 側邊欄「系統管理」群組不顯示「操作日誌」
- 直接訪問 `/admin/logs` → 導向 `/admin`

**結果：** ☐ Pass　☐ Fail　備註：___

---

## 測試後收尾

執行完測試後，建議刪除本次測試建立的假資料（主分類、次分類、標籤、行程），避免污染正式資料庫。
