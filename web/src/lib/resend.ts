import { Resend } from "resend";

export async function sendInquiryNotification(inquiry: {
  name: string;
  phone: string;
  email?: string | null;
  lineId?: string | null;
  content: string;
  tourName?: string;
}) {
  const subject = inquiry.tourName
    ? `新諮詢：${inquiry.tourName}`
    : "新諮詢來自官網";

  const lines = [
    `姓名：${inquiry.name}`,
    `手機：${inquiry.phone}`,
    inquiry.email ? `Email：${inquiry.email}` : null,
    inquiry.lineId ? `LINE ID：${inquiry.lineId}` : null,
    `\n諮詢內容：\n${inquiry.content}`,
  ].filter(Boolean);

  const text = lines.join("\n");

  if (!process.env.RESEND_API_KEY) {
    console.log("[email mock]", { subject, text });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.ADMIN_NOTIFY_EMAIL!,
    subject,
    text,
  });
}
