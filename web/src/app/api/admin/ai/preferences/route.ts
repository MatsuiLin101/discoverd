import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { getSiteAiSetting } from "@/lib/ai/config";
import {
  DEFAULT_DESCRIPTION_MODEL,
  DEFAULT_DESCRIPTION_PROMPT,
  DEFAULT_THUMBNAIL_PROMPT,
  DEFAULT_THUMBNAIL_AGENT_PROFILE,
  MANUS_AGENT_PROFILES,
} from "@/lib/ai/prompts";

const schema = z.object({
  descriptionModel: z.string().max(100).optional(),
  descriptionPrompt: z.string().max(4000).optional(),
  thumbnailPrompt: z.string().max(4000).optional(),
  // "" clears the override (fall back to system default).
  thumbnailAgentProfile: z.enum(["", ...MANUS_AGENT_PROFILES]).optional(),
  // Personal keys: only stored when non-empty; empty means "leave unchanged".
  geminiApiKey: z.string().optional(),
  manusApiKey: z.string().optional(),
  clearGeminiKey: z.boolean().optional(),
  clearManusKey: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

  const [pref, site] = await Promise.all([
    db.userAiPreference.findUnique({ where: { userId: session.userId } }),
    getSiteAiSetting(),
  ]);

  return NextResponse.json({
    data: {
      descriptionModel: pref?.descriptionModel ?? "",
      descriptionPrompt: pref?.descriptionPrompt ?? "",
      thumbnailPrompt: pref?.thumbnailPrompt ?? "",
      thumbnailAgentProfile: pref?.thumbnailAgentProfile ?? "",
      hasGeminiKey: !!pref?.geminiApiKeyEnc,
      hasManusKey: !!pref?.manusApiKeyEnc,
      encryptionConfigured: isEncryptionConfigured(),
    },
    // What a blank field falls back to (system default, then built-in).
    systemDefaults: {
      descriptionModel: site.aiDescriptionModel || DEFAULT_DESCRIPTION_MODEL,
      descriptionPrompt: site.aiDescriptionPrompt || DEFAULT_DESCRIPTION_PROMPT,
      thumbnailPrompt: site.aiThumbnailPrompt || DEFAULT_THUMBNAIL_PROMPT,
      thumbnailAgentProfile: site.aiThumbnailAgentProfile || DEFAULT_THUMBNAIL_AGENT_PROFILE,
    },
    agentProfiles: MANUS_AGENT_PROFILES,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const norm = (v?: string) => (v && v.trim() ? v : null);
  const { geminiApiKey, manusApiKey, clearGeminiKey, clearManusKey } = parsed.data;
  const settingNewKey = (geminiApiKey && geminiApiKey.trim()) || (manusApiKey && manusApiKey.trim());
  if (settingNewKey && !isEncryptionConfigured()) {
    return NextResponse.json({ error: "伺服器未設定 AI_ENCRYPTION_KEY，無法加密儲存金鑰" }, { status: 500 });
  }

  const data: Record<string, unknown> = {
    descriptionModel: norm(parsed.data.descriptionModel),
    descriptionPrompt: norm(parsed.data.descriptionPrompt),
    thumbnailPrompt: norm(parsed.data.thumbnailPrompt),
    thumbnailAgentProfile: norm(parsed.data.thumbnailAgentProfile),
  };
  if (clearGeminiKey) data.geminiApiKeyEnc = null;
  else if (geminiApiKey && geminiApiKey.trim()) data.geminiApiKeyEnc = encryptSecret(geminiApiKey.trim());
  if (clearManusKey) data.manusApiKeyEnc = null;
  else if (manusApiKey && manusApiKey.trim()) data.manusApiKeyEnc = encryptSecret(manusApiKey.trim());

  const pref = await db.userAiPreference.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, ...data },
    update: data,
  });

  return NextResponse.json({
    data: {
      descriptionModel: pref.descriptionModel ?? "",
      descriptionPrompt: pref.descriptionPrompt ?? "",
      thumbnailPrompt: pref.thumbnailPrompt ?? "",
      thumbnailAgentProfile: pref.thumbnailAgentProfile ?? "",
      hasGeminiKey: !!pref.geminiApiKeyEnc,
      hasManusKey: !!pref.manusApiKeyEnc,
    },
  });
}
