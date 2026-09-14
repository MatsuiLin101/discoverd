import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getAiKeys } from "@/lib/ai/config";
import { testGeminiKey } from "@/lib/ai/gemini";
import { testManusKey } from "@/lib/ai/manus";

const schema = z.object({
  provider: z.enum(["gemini", "manus"]),
  // Optional: test a freshly typed key before saving; otherwise test the stored one.
  apiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { provider, apiKey } = parsed.data;

  const typed = apiKey?.trim();
  const stored = await getAiKeys();
  const key = typed || (provider === "gemini" ? stored.gemini : stored.manus);
  if (!key) {
    return NextResponse.json({ data: { ok: false, message: "尚未設定金鑰，請先輸入或儲存後再測試" } });
  }

  const result = provider === "gemini" ? await testGeminiKey(key) : await testManusKey(key);
  return NextResponse.json({ data: result });
}
