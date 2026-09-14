/**
 * Minimal client for Google's Generative Language (Gemini) REST API.
 * Docs: https://ai.google.dev/api/generate-content
 *
 * We only need two things:
 *  - `testGeminiKey`   : cheap validity check (list models).
 *  - `generateDescription`: multimodal generateContent with optional PDF parts
 *    (Gemini reads PDFs natively via inline_data, so no PDF parsing lib needed).
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiPdfPart {
  /** Base64-encoded PDF bytes. */
  data: string;
  mimeType?: string;
}

/** Validate an API key by listing models. Returns a friendly result. */
export async function testGeminiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${BASE}/models?pageSize=1`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (res.ok) return { ok: true, message: "Gemini API 金鑰有效" };
    const body = await res.json().catch(() => null);
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: `Gemini 金鑰無效：${detail}` };
  } catch (e) {
    return { ok: false, message: `無法連線 Gemini：${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Generate a tour description. `prompt` is the full assembled text prompt
 * (persona template + tour data + hint); `pdfs` are attached content files.
 */
export interface GeminiUsage {
  inputTokens?: number;
  outputTokens?: number;
  thoughtsTokens?: number;
  totalTokens?: number;
}

export interface GeminiResult {
  text: string;
  usage: GeminiUsage;
}

export async function generateDescription(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  pdfs?: GeminiPdfPart[];
}): Promise<GeminiResult> {
  const { apiKey, model, prompt, pdfs = [] } = opts;

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const pdf of pdfs) {
    parts.push({ inline_data: { mime_type: pdf.mimeType ?? "application/pdf", data: pdf.data } });
  }

  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      // gemini-3.x flash is a thinking model: "thoughts" consume the output
      // budget (~1k tokens), so keep this well above the description length or
      // the text gets truncated (finishReason: MAX_TOKENS).
      generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Gemini 生成失敗：${detail}`);
  }

  const data = await res.json();
  const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini 沒有回傳內容，請調整提示詞後再試");

  const m = data?.usageMetadata ?? {};
  const usage: GeminiUsage = {
    inputTokens: m.promptTokenCount,
    outputTokens: m.candidatesTokenCount,
    thoughtsTokens: m.thoughtsTokenCount,
    totalTokens: m.totalTokenCount,
  };
  return { text, usage };
}
