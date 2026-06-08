import { Geist, Geist_Mono } from "next/font/google";
import { GTMNoScript, GTMScript } from "@/components/analytics/GoogleTagManager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gtmId = process.env.NEXT_PUBLIC_GTM_ID || undefined;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>{gtmId && <GTMScript gtmId={gtmId} />}</head>
      <body className="min-h-full flex flex-col">
        {gtmId && <GTMNoScript gtmId={gtmId} />}
        {children}
      </body>
    </html>
  );
}
