import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEffectiveAiSettings } from "@/lib/ai/config";
import { MANUS_AGENT_PROFILES } from "@/lib/ai/prompts";

/**
 * The current user's effective (personal ?? system ?? built-in) AI model and
 * Manus agent profile. Used by the tour form to pre-fill the per-generation
 * override selectors.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "請先登入" }, { status: 403 });

  const s = await getEffectiveAiSettings(session.userId);
  return NextResponse.json({
    data: {
      descriptionModel: s.descriptionModel,
      thumbnailAgentProfile: s.thumbnailAgentProfile,
    },
    agentProfiles: MANUS_AGENT_PROFILES,
  });
}
