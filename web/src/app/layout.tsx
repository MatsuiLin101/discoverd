import "./globals.css";

// The root layout intentionally loads no webfont: public pages pull in Noto Sans
// / Noto Sans TC (see (frontend)/layout.tsx) and the admin panel pulls in Geist
// (see lib/admin-fonts.ts), so neither ships the other's font files.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
