import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectiveAiSettings, getUserAiKeys } from "@/lib/ai/config";
import { MANUS_AGENT_PROFILES } from "@/lib/ai/prompts";

/**
 * The current user's effective (personal ?? system ?? built-in) AI model and
 * Manus agent profile, plus whether they have a personal key per provider.
 * Used by the tour form to pre-fill the per-generation override selectors and
 * to decide whether to show the personal/shared quota choice.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

  const [s, personal] = await Promise.all([
    getEffectiveAiSettings(session.userId),
    getUserAiKeys(session.userId),
  ]);
  return NextResponse.json({
    data: {
      descriptionModel: s.descriptionModel,
      thumbnailAgentProfile: s.thumbnailAgentProfile,
      hasPersonalGeminiKey: !!personal.gemini,
      hasPersonalManusKey: !!personal.manus,
    },
    agentProfiles: MANUS_AGENT_PROFILES,
  });
}
