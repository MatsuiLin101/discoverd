# 設計參考：找到了旅遊 · 忠孝復興門市

**來源網站：** https://discovered.tw/store/zhongxiao
**用途：** 供 Claude Design 開發新小組網站時參考視覺語言。
**原則：** 保留品牌質感，但版面配置須有明顯差異，不得複製現有佈局。

---

## 一、品牌色彩系統

| Token | 值 | 用途 |
|---|---|---|
| Primary | `#D12351` | 主色、按鈕、強調 |
| Primary Gradient | `linear-gradient(135deg, #D12351 0%, #E11D48 100%)` | Logo 背景、CTA 按鈕 |
| Background | `#fffcfd` | 全站底色（幾乎純白，帶極淡暖調） |
| Text Main | `#374151` | 正文、導覽列文字 |
| Rose-50 | `#fff1f2` | 按鈕 hover 背景、淡底色 |
| Rose-100 | `#ffe4e6` | 邊框、分隔線 |
| Rose-300 | `#fda4af` | 次要裝飾 |
| Rose-500 | `#f43f5e` | 次要文字強調 |
| Rose-600 | `#e11d48` | 價格、重要數字 |
| Line Green | `#06C755` | 如需 Line 按鈕 |

---

## 二、字型系統

- **字體家族：** `Noto Sans TC`（Google Fonts，支援繁體中文）
- **Heading 風格：** `font-light`（weight 300）、`letter-spacing: 0.15–0.25em`，追求優雅疏散感
- **Body：** `font-normal`（400），正常間距
- **Badge / Tag：** 極小字（8–9px），全大寫或半形，rose 色
- **價格數字：** `font-bold`，rose-600，搭配「TWD」前綴

---

## 三、導覽列

**現有設計（不要複製）：**
- 固定置頂（`fixed top-0`）
- 毛玻璃：`rgba(255,252,253,0.85)` + `backdrop-filter: blur(20px)`
- 底部有 `border-bottom: 1px solid rgba(#D12351, 0.04)`（極淡）
- 左側：Logo SVG + 品牌名稱 + 門市名稱 + 電話
- 右側：首頁連結 + 動態麵包屑 + 服務據點按鈕（`rounded-full`, `border-rose-100`, `text-rose-500`）

**差異化建議：**
- 深色導覽列（深灰或品牌深色底 + 白色文字）
- 或將社群連結放進導覽列
- 或使用不透明白底（取消毛玻璃效果）

---

## 四、搜尋列

- 緊接導覽列下方，全寬佈局
- 左側搜尋圖示 + placeholder 含使用示範（如「日本 半自助、北海道 破冰船」）
- Focus 時 border 轉為 `#D12351`
- 背景：白色，邊框圓角

---

## 五、首頁

**現有版面（不要複製）：**
```
[導覽列 + 搜尋欄]
Hero 文字區：「探索您的夢想旅程」（h1, font-light, letter-spacing 0.2em）
目的地大分類：4欄 Portrait 卡片（全版圖片 + 底部漸層 + 白色文字疊層）
```

**差異化建議（新站可參考的替代方向）：**
- 加入 Hero Banner 輪播（現有網站沒有）
- 加入精選行程區塊
- 改為 3 欄或 6 欄卡片網格
- 目的地卡片改為 Landscape 橫式
- 加入「主題分類」（暑期、連假、蜜月）橫向捲動選單
- 加入每月優惠 / 早鳥預售獨立區塊

---

## 六、目的地分類卡片（首頁）

**現有設計：**
- 比例：Portrait，約 2:3 高寬比
- 圓角：`rounded-2xl` 或 `rounded-3xl`
- 圖片：全版出血（object-cover）
- 疊層文字：底部半透明漸層（黑色，向上淡出）
- 小標：`Travel Collection`（rose 色，約 9px）
- 大標：目的地名稱（white，`font-bold`，h3）
- 連結：`Explore destinations →`（white，`text-xs`）

---

## 七、行程列表卡片（Listing）

**現有設計：**
- 比例：Landscape，約 4:3 寬高比
- 圖片：全版出血，頂部圓角，底部無圓角（或整體 `rounded-2xl`）
- Tag Badge：極小字（8–9px），玫瑰粉底或玫瑰色文字（如「熱門行程」、「超值行程」）
- 行程名稱：`font-medium`，深灰色
- 價格：`門市價` 小標 + `TWD XX,XXX 起`（rose-600，`font-bold`）
- 右下角：箭頭圖示（hover 時色彩轉換）

**點擊行為：** 開啟全螢幕 Modal，不跳轉頁面（SPA）

---

## 八、行程詳情（Modal）

**現有設計：**
- 全螢幕 modal（`fixed inset-0 z-100`）
- 主體：Google Drive iframe 嵌入（行程 PDF 或 Google Slides）
- 左上：關閉按鈕（`×`）
- 右上：放大 / 收合行程按鈕
- 右側欄（或底部）：
  - Tag Badge
  - 行程名稱（h3）
  - 分享此行程連結按鈕（Copy URL）
  - 建議售價 `TWD XX,XXX 含稅起`
  - QR Code（連結至 Google Drive 原檔）
  - 服務專線 + 門市名稱 + 電話
  - `※優惠方案及出發日期請洽專員`

---

## 九、服務據點（Modal）

**現有設計：**
- 白色卡片 modal（非全螢幕）
- 標題：「全台門市據點」/ `Our Locations`
- 關閉按鈕（右上）
- 各門市卡片：
  - 門市名稱（h4）
  - `目前服務中` 綠色 badge（當前門市）
  - 電話（帶圖示）
  - 地址（帶圖示）
  - 地圖導航按鈕（連到 Google Maps）
  - 切換門市按鈕（連到該門市的 URL）

---

## 十、頁尾（Footer）

**現有設計：**
- 白色底
- 三欄佈局：
  1. 公司中文名稱 + 英文名稱 + 地址
  2. 執照資訊（品保字號、交觀字號、統一編號、負責人）
  3. 代表號 + 傳真 + 版權聲明

**差異化建議：**
- 深色底（如深灰 `#1f2937` 或品牌深色）
- 加入社群媒體連結（Line / Facebook / Instagram）
- 加入快速連結選單

---

## 十一、動態與互動風格

- **Transition：** 所有互動均有 `transition-all`，約 200–300ms
- **Hover：** 文字 → rose 色，按鈕背景 → `rose-50` 或 `rose-500`
- **卡片 Hover：** 輕微位移上浮或陰影加深（`shadow-md` → `shadow-xl`）
- **Modal 開關：** fade-in / fade-out（opacity transition）
- **頁面切換：** SPA，無整頁重新載入，內容區平滑替換

---

## 十二、整體設計關鍵字（給 Claude Design 的提示詞參考）

```
clean, minimal, travel-luxury, rose-red accent, white space,
Noto Sans TC, light font weight, wide letter spacing,
photo-first cards, glass morphism nav, warm white background,
Traditional Chinese UI, mobile-first
```

---

## 十三、新站差異化方向摘要

| 項目 | 現有網站 | 新站建議方向 |
|---|---|---|
| 導覽列 | 白色毛玻璃 | 深色 或 品牌色底 |
| 首頁 Hero | 純文字 | 圖片 Banner 輪播 |
| 首頁區塊 | 只有目的地分類 | 加入精選行程、主題、優惠區塊 |
| 目的地卡片 | Portrait 4欄 | Landscape 3欄 或 其他比例 |
| 頁尾 | 白色 | 深色底 + 社群連結 |
| 浮動按鈕 | 無 | 加入電話、Line、FB |
| 社群連結 | 無 | 頁尾加入 |
