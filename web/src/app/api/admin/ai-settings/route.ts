import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeLog } from "@/lib/log";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { getSiteAiSetting } from "@/lib/ai/config";
import { getCurrentGeminiPrices, getLastGeminiSyncAt } from "@/lib/ai/gemini-price-sync";
import {
  DEFAULT_DESCRIPTION_MODEL,
  DEFAULT_DESCRIPTION_PROMPT,
  DEFAULT_THUMBNAIL_PROMPT,
  DEFAULT_THUMBNAIL_AGENT_PROFILE,
  MANUS_AGENT_PROFILES,
} from "@/lib/ai/prompts";

const SINGLETON_ID = "singleton";

const schema = z.object({
  // Only stored when non-empty; empty string means "leave unchanged".
  geminiApiKey: z.string().optional(),
  manusApiKey: z.string().optional(),
  clearGeminiKey: z.boolean().optional(),
  clearManusKey: z.boolean().optional(),
  aiDescriptionModel: z.string().min(1, "請輸入簡介模型名稱").max(100),
  aiDescriptionPrompt: z.string().max(4000).optional(),
  aiThumbnailPrompt: z.string().max(4000).optional(),
  aiThumbnailAgentProfile: z.enum(MANUS_AGENT_PROFILES).optional(),
  aiManusPersonalThreshold: z.number().int().min(0).optional(),
  // Cost estimate unit prices (NT$); null/undefined clears.
  aiManusPricePerCredit: z.number().min(0).nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const s = await getSiteAiSetting();
  const [geminiPrices, lastGeminiSyncAt, usedModels] = await Promise.all([
    getCurrentGeminiPrices(),
    getLastGeminiSyncAt(),
    db.aiUsageLog.findMany({
      where: { provider: "gemini", model: { not: null } },
      distinct: ["model"],
      select: { model: true },
    }),
  ]);
  // Gemini models that appear in usage logs but have no synced price yet — their
  // cost can't be computed until an admin adds their SKUs to MODEL_SKU_MAP.
  const pricedModels = new Set(geminiPrices.map((p) => p.model));
  const unpricedModels = usedModels
    .map((u) => u.model)
    .filter((m): m is string => !!m && !pricedModels.has(m));
  return NextResponse.json({
    geminiPrices,
    lastGeminiSyncAt,
    unpricedModels,
    data: {
      hasGeminiKey: !!s.geminiApiKeyEnc,
      hasManusKey: !!s.manusApiKeyEnc,
      aiDescriptionModel: s.aiDescriptionModel,
      aiDescriptionPrompt: s.aiDescriptionPrompt ?? "",
      aiThumbnailPrompt: s.aiThumbnailPrompt ?? "",
      aiThumbnailAgentProfile: s.aiThumbnailAgentProfile,
      aiManusPersonalThreshold: s.aiManusPersonalThreshold,
      aiManusPricePerCredit: s.aiManusPricePerCredit,
      encryptionConfigured: isEncryptionConfigured(),
    },
    defaults: {
      descriptionModel: DEFAULT_DESCRIPTION_MODEL,
      descriptionPrompt: DEFAULT_DESCRIPTION_PROMPT,
      thumbnailPrompt: DEFAULT_THUMBNAIL_PROMPT,
      thumbnailAgentProfile: DEFAULT_THUMBNAIL_AGENT_PROFILE,
    },
    agentProfiles: MANUS_AGENT_PROFILES,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const {
    geminiApiKey,
    manusApiKey,
    clearGeminiKey,
    clearManusKey,
    aiDescriptionModel,
    aiDescriptionPrompt,
    aiThumbnailPrompt,
    aiThumbnailAgentProfile,
    aiManusPersonalThreshold,
    aiManusPricePerCredit,
  } = parsed.data;

  const settingNewKey = (geminiApiKey && geminiApiKey.trim()) || (manusApiKey && manusApiKey.trim());
  if (settingNewKey && !isEncryptionConfigured()) {
    return NextResponse.json(
      { error: "伺服器未設定 AI_ENCRYPTION_KEY，無法加密儲存金鑰" },
      { status: 500 },
    );
  }

  // Build a partial update: keys are only touched when set/cleared.
  const data: Record<string, unknown> = {
    aiDescriptionModel,
    aiDescriptionPrompt: aiDescriptionPrompt?.trim() ? aiDescriptionPrompt : null,
    aiThumbnailPrompt: aiThumbnailPrompt?.trim() ? aiThumbnailPrompt : null,
    ...(aiThumbnailAgentProfile ? { aiThumbnailAgentProfile } : {}),
    ...(aiManusPersonalThreshold != null ? { aiManusPersonalThreshold } : {}),
    aiManusPricePerCredit: aiManusPricePerCredit ?? null,
  };
  if (clearGeminiKey) data.geminiApiKeyEnc = null;
  else if (geminiApiKey && geminiApiKey.trim()) data.geminiApiKeyEnc = encryptSecret(geminiApiKey.trim());
  if (clearManusKey) data.manusApiKeyEnc = null;
  else if (manusApiKey && manusApiKey.trim()) data.manusApiKeyEnc = encryptSecret(manusApiKey.trim());

  const s = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "AI_SETTING",
    resourceId: SINGLETON_ID,
    resourceName: "AI 設定",
    // Never log key values — only which keys changed.
    detail: {
      aiDescriptionModel,
      geminiKeyChanged: !!clearGeminiKey || !!(geminiApiKey && geminiApiKey.trim()),
      manusKeyChanged: !!clearManusKey || !!(manusApiKey && manusApiKey.trim()),
    },
  });

  return NextResponse.json({
    data: {
      hasGeminiKey: !!s.geminiApiKeyEnc,
      hasManusKey: !!s.manusApiKeyEnc,
      aiDescriptionModel: s.aiDescriptionModel,
      aiDescriptionPrompt: s.aiDescriptionPrompt ?? "",
      aiThumbnailPrompt: s.aiThumbnailPrompt ?? "",
    },
  });
}
