# 旅遊行程批次匯入 — 檔案格式說明

本目錄放置批次匯入腳本（`web/scripts/import-tours.*`）使用的 Excel 資料。

## 檔案分類

| 檔案 | 是否進 git | 說明 |
|------|-----------|------|
| `tours-import-template.xlsx` | ✅ 進 git | 只含假資料的**格式範本**，供對照欄位定義。 |
| 其他 `*.xlsx`（如甲方提供的真實資料） | ❌ 不進 git | 含客戶真實產品與售價，屬敏感資料，僅留本機（見根目錄 `.gitignore`）。 |

> `.gitignore` 規則：`web/scripts/fixtures/*.xlsx` 全部忽略，唯獨 `!tours-import-template.xlsx` 例外。放真實資料進來時**不要**改成範本的檔名。

## 工作表（sheet）

- 一個 xlsx 可含**多張工作表**；每張表結構相同，匯入時可指定要匯入哪幾張。
- 空白工作表會自動略過。

## 欄位定義（每張表固定 A–G 欄，第 1 列為表頭，匯入時跳過）

| 欄 | 名稱 | 必填 | 說明 |
|----|------|------|------|
| A | 主分類(國家) | ✅ | 對應 `Region.name`。不存在會自動建立（slug 隨機，之後可後台改）。 |
| B | 次分類(地區) | ✅ | 對應 `SubRegion.name`（歸屬於同列的主分類下）。不存在會自動建立。 |
| C | 標籤 | 選填 | 以半形逗號 `,` 分隔；`標籤A,標籤B` 或 `標籤A, 標籤B` 皆可。不存在的標籤會自動建立。 |
| D | 行程名稱 | ✅ | 對應 `Tour.name`。空白的列會被跳過。 |
| E | 價格 | ✅ | 建議純文字整數（如 `88888`）。容錯：`88,888`、`2599.0` 也會被解析成整數；無法解析的列會記為錯誤並跳過。 |
| F | 行程簡介 | 選填 | 對應 `Tour.description`，換行與空格會原樣保留。 |
| G | 備註 | — | 參考用，**匯入時忽略**。 |

## 匯入行為重點

- **重複判定**：以 (主分類, 次分類, 行程名稱) 三者組合為唯一識別。
  - **同一檔案內**出現相同組合 → 只取第一筆，其餘跳過（範本第 4 列即示範此情況）。
  - **跨次匯入**同組合 → 視為同一筆行程，做覆蓋更新（冪等：同檔案匯入 N 次結果相同）。
- **預設不發佈**：新建行程 `published = false`（缺行程內容檔，需匯入後於後台補圖與內容檔再發佈）。
- **縮圖／內容檔**不在此 Excel 內，匯入後於後台編輯補充。

## 匯入腳本

實作於 `web/scripts/import-tours.sh`（進入點）與 `web/scripts/import-tours.ts`（實際解析 + upsert）。

```bash
web/scripts/import-tours.sh <xlsx 路徑> --list                     # 列出工作表與筆數
web/scripts/import-tours.sh <xlsx 路徑> --sheets "國旅,泰國" --dry-run  # 試跑不寫入
web/scripts/import-tours.sh <xlsx 路徑> --sheets all               # 匯入全部工作表
web/scripts/import-tours.sh <xlsx 路徑>                            # 互動式選擇工作表
```

其餘選項見 `web/scripts/import-tours.sh <xlsx 路徑> --help`。
