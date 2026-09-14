/**
 * Built-in default model + prompt templates for AI generation.
 *
 * Resolution order for the value actually used at generation time:
 *   personal override (UserAiPreference) ?? system default (SiteSetting) ?? these.
 *
 * The prompt templates below are the persona / style instructions only. The
 * concrete tour data (name, region, tags, price, attached PDFs) is appended by
 * the generation code, so editors can tweak tone without breaking the data feed.
 */

export const DEFAULT_DESCRIPTION_MODEL = "gemini-3.6-flash";

export const DEFAULT_DESCRIPTION_PROMPT = `你是一位專業的旅遊文案編輯。請根據提供的行程資訊（可能包含行程 PDF 內容），撰寫一段吸引人的繁體中文「行程簡介」。

要求：
- 約 150-200 字，最多不超過 500 字。
- 語氣專業、生動且具吸引力，突出行程特色、亮點與適合的旅客。
- 使用繁體中文，避免簡體字與過度浮誇的行銷用語。
- 只輸出簡介內容本身，不要加標題、項目符號或任何多餘說明。`;

export const DEFAULT_THUMBNAIL_PROMPT = `為以下旅遊行程產生一張吸引人的行程縮圖照片。

要求：
- 比例 4:3，橫向構圖。
- 風格明亮清新、具旅遊氛圍，呈現行程的代表性景點或風景。
- 畫面中不要出現任何文字、浮水印或人物臉部特寫。

行程資訊：`;
