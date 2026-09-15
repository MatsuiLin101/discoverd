import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import {
  DEFAULT_DESCRIPTION_MODEL,
  DEFAULT_DESCRIPTION_PROMPT,
  DEFAULT_THUMBNAIL_PROMPT,
  DEFAULT_THUMBNAIL_AGENT_PROFILE,
} from "./prompts";

/** Load (or create) the singleton SiteSetting row. */
export async function getSiteAiSetting() {
  return db.siteSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

/** Decrypt, swallowing errors (bad key / tampered value) into null. */
function safeDecrypt(enc: string | null): string | null {
  if (!enc) return null;
  try {
    return decryptSecret(enc);
  } catch {
    return null;
  }
}

/** Decrypted shared API keys (server-only; never send to the client). */
export async function getAiKeys(): Promise<{ gemini: string | null; manus: string | null }> {
  const s = await getSiteAiSetting();
  return {
    gemini: safeDecrypt(s.geminiApiKeyEnc),
    manus: safeDecrypt(s.manusApiKeyEnc),
  };
}

/** Decrypted personal API keys for a user (null when not configured). */
export async function getUserAiKeys(userId: string): Promise<{ gemini: string | null; manus: string | null }> {
  const pref = await db.userAiPreference.findUnique({ where: { userId } });
  return {
    gemini: safeDecrypt(pref?.geminiApiKeyEnc ?? null),
    manus: safeDecrypt(pref?.manusApiKeyEnc ?? null),
  };
}

/**
 * Effective per-user AI settings: personal override, then system default, then
 * the built-in default. Empty strings are treated as "unset" and fall through.
 */
export async function getEffectiveAiSettings(userId: string) {
  const [s, pref] = await Promise.all([
    getSiteAiSetting(),
    db.userAiPreference.findUnique({ where: { userId } }),
  ]);
  return {
    descriptionModel:
      pref?.descriptionModel || s.aiDescriptionModel || DEFAULT_DESCRIPTION_MODEL,
    descriptionPrompt:
      pref?.descriptionPrompt || s.aiDescriptionPrompt || DEFAULT_DESCRIPTION_PROMPT,
    thumbnailPrompt:
      pref?.thumbnailPrompt || s.aiThumbnailPrompt || DEFAULT_THUMBNAIL_PROMPT,
    thumbnailAgentProfile:
      pref?.thumbnailAgentProfile || s.aiThumbnailAgentProfile || DEFAULT_THUMBNAIL_AGENT_PROFILE,
  };
}
