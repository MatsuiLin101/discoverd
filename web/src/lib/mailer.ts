import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

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

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log("[email mock]", { subject, text });
    return;
  }

  const transporter = createTransport();
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject,
    text,
  });
}
