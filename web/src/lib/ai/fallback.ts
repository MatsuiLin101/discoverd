import { GeminiHttpError, generateDescription } from "./gemini";
import type { GeminiPdfPart, GeminiResult } from "./gemini";
import { testManusKey } from "./manus";
import type { KeyOwner } from "./key-owner";

/**
 * Prefer the user's personal Gemini key; on ANY failure fall back to the shared
 * key so the task isn't interrupted. The keyOwner distinguishes a quota-exhausted
 * fallback (HTTP 429) from other errors (e.g. an invalid personal key).
 */
export async function generateDescriptionWithFallback(opts: {
  personalKey: string | null;
  sharedKey: string | null;
  model: string;
  prompt: string;
  pdfs?: GeminiPdfPart[];
}): Promise<{ result: GeminiResult; keyOwner: KeyOwner }> {
  const { personalKey, sharedKey, model, prompt, pdfs } = opts;

  if (personalKey) {
    try {
      const result = await generateDescription({ apiKey: personalKey, model, prompt, pdfs });
      return { result, keyOwner: "personal" };
    } catch (e) {
      if (!sharedKey) throw e; // nothing to fall back to — surface the error
      const is429 = e instanceof GeminiHttpError && e.status === 429;
      const result = await generateDescription({ apiKey: sharedKey, model, prompt, pdfs });
      return { result, keyOwner: is429 ? "fallback_quota" : "fallback_error" };
    }
  }

  if (!sharedKey) throw new Error("尚未設定 Gemini API 金鑰，請先於「AI 設定」填寫");
  const result = await generateDescription({ apiKey: sharedKey, model, prompt, pdfs });
  return { result, keyOwner: "shared" };
}

/**
 * Choose the Manus key to use. Personal is used only when its balance is at or
 * above the threshold (Manus cost per task isn't known until it runs); otherwise
 * the shared key is used, tagged by whether the personal key was valid.
 */
export async function selectManusKey(opts: {
  personalKey: string | null;
  sharedKey: string | null;
  threshold: number;
}): Promise<{ key: string | null; keyOwner: KeyOwner | null }> {
  const { personalKey, sharedKey, threshold } = opts;

  if (personalKey) {
    const check = await testManusKey(personalKey);
    const enough = check.ok && (check.credits ?? 0) >= threshold;
    if (enough) return { key: personalKey, keyOwner: "personal" };
    if (sharedKey) return { key: sharedKey, keyOwner: check.ok ? "fallback_quota" : "fallback_error" };
    // No shared key: use the personal key anyway if it's valid, else give up.
    if (check.ok) return { key: personalKey, keyOwner: "personal" };
    return { key: null, keyOwner: null };
  }

  if (sharedKey) return { key: sharedKey, keyOwner: "shared" };
  return { key: null, keyOwner: null };
}
