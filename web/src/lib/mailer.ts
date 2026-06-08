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

function formatTaipeiTime(date: Date): string {
  return date.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export async function sendInquiryNotification(inquiry: {
  name: string;
  phone: string;
  email?: string | null;
  lineId?: string | null;
  content: string;
  tourName?: string | null;
  tourSlug?: string | null;
}) {
  const subject = inquiry.tourName
    ? `新諮詢：${inquiry.tourName}`
    : "新諮詢來自官網";

  const tourUrl =
    inquiry.tourSlug && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/tours/${inquiry.tourSlug}`
      : null;

  const lines = [
    `送出時間：${formatTaipeiTime(new Date())}`,
    tourUrl
      ? `詢問行程：${inquiry.tourName ?? ""} ( ${tourUrl} )`
      : inquiry.tourName
        ? `詢問行程：${inquiry.tourName}`
        : "詢問行程：未指定",
    "",
    `姓名：${inquiry.name}`,
    `手機：${inquiry.phone}`,
    `Email：${inquiry.email ?? "（未填寫）"}`,
    `LINE ID：${inquiry.lineId ?? "（未填寫）"}`,
    "",
    `諮詢內容：\n${inquiry.content}`,
  ];

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
