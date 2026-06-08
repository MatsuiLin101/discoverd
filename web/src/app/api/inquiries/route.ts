import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendInquiryNotification } from "@/lib/mailer";

const InquirySchema = z.object({
  tourId: z.string().optional().nullable(),
  name: z.string().min(1, "請填寫姓名").max(50),
  phone: z
    .string()
    .min(1, "請填寫電話")
    .regex(/^[\d\-\+\(\)\s]{7,20}$/, "電話格式不正確"),
  email: z
    .union([
      z.string().email("Email 格式不正確"),
      z.literal("").transform(() => null),
    ])
    .optional()
    .nullable(),
  lineId: z
    .union([z.string().max(50), z.literal("").transform(() => null)])
    .optional()
    .nullable(),
  content: z.string().min(1, "請填寫詢問內容").max(2000),
  tourName: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "驗證失敗", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, phone, email, lineId, content, tourName } = parsed.data;

    await sendInquiryNotification({
      name,
      phone,
      email,
      lineId,
      content,
      tourName: tourName ?? undefined,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/inquiries]", e);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
