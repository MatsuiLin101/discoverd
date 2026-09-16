import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeLog } from "@/lib/log";
import { syncGeminiPrices, getLastGeminiSyncAt } from "@/lib/ai/gemini-price-sync";

/** Calendar day in Asia/Taipei, e.g. "2026-09-16", for the once-a-day limit. */
function twDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

/** Manually trigger a Gemini price sync. Admin only, at most once per day. */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const last = await getLastGeminiSyncAt();
  if (last && twDay(last) === twDay(new Date())) {
    return NextResponse.json(
      { error: "今天已更新過，每天僅限更新一次", lastSyncedAt: last },
      { status: 429 },
    );
  }

  if (!process.env.GOOGLE_CLOUD_API_KEY) {
    return NextResponse.json({ error: "伺服器未設定 GOOGLE_CLOUD_API_KEY" }, { status: 400 });
  }

  try {
    const result = await syncGeminiPrices();
    if (result.inserted === 0) {
      return NextResponse.json(
        { error: `更新失敗：未取得任何價格${result.errors.length ? `（${result.errors[0]}）` : ""}` },
        { status: 502 },
      );
    }
    void writeLog({
      userId: session.userId,
      userAccount: session.username,
      action: "UPDATE",
      resource: "AI_SETTING",
      resourceId: "gemini-prices",
      resourceName: "Gemini 價格",
      detail: { models: result.models, inserted: result.inserted },
    });
    return NextResponse.json({
      data: { models: result.models, inserted: result.inserted, ranAt: result.ranAt, errors: result.errors },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `更新失敗：${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }
}
