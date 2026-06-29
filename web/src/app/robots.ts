import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin panel lives behind a secret ADMIN_PATH prefix and the
        // physical /admin route returns 404, so it is intentionally not listed
        // here (listing the secret prefix would defeat the purpose).
        disallow: ["/tour-preview"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
