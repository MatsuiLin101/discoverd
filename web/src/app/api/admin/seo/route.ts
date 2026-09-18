import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage, matchUploadFolder } from "@/lib/storage";
import { writeLog } from "@/lib/log";
import { revalidatePublic } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";

const SINGLETON_ID = "singleton";

// All admin-panel users may edit the site-wide SEO defaults (not ADMIN-only).
const schema = z.object({
  seoSiteName: z.string().max(100, "品牌名稱最多 100 字").or(z.literal("")).optional(),
  seoDefaultTitle: z.string().max(70, "標題最多 70 字").or(z.literal("")).optional(),
  seoDefaultDescription: z.string().max(160, "描述最多 160 字").or(z.literal("")).optional(),
  googleSiteVerification: z.string().max(200, "驗證碼過長").or(z.literal("")).optional(),
  // Object key returned by the upload flow; must live under the seo-og/site folder.
  ogImageKey: z
    .string()
    .refine((k) => matchUploadFolder(k) === "seo-og/site", "OG 圖片路徑不合法")
    .optional(),
  clearOgImage: z.boolean().optional(),
  showRelatedTours: z.boolean().optional(),
  orgTelephone: z.string().max(50, "電話過長").or(z.literal("")).optional(),
  orgAddress: z.string().max(200, "地址過長").or(z.literal("")).optional(),
  orgPriceRange: z.string().max(50, "價格範圍過長").or(z.literal("")).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
    select: {
      seoSiteName: true,
      seoDefaultTitle: true,
      seoDefaultDescription: true,
      googleSiteVerification: true,
      ogImageKey: true,
      showRelatedTours: true,
      orgTelephone: true,
      orgAddress: true,
      orgPriceRange: true,
    },
  });

  const ogImageUrl = setting.ogImageKey ? storage.publicUrl(setting.ogImageKey) : null;
  return NextResponse.json({ data: { ...setting, ogImageUrl } });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "請先登入" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const {
    seoSiteName,
    seoDefaultTitle,
    seoDefaultDescription,
    googleSiteVerification,
    ogImageKey,
    clearOgImage,
    showRelatedTours,
    orgTelephone,
    orgAddress,
    orgPriceRange,
  } = parsed.data;

  const data = {
    seoSiteName: seoSiteName || null,
    seoDefaultTitle: seoDefaultTitle || null,
    seoDefaultDescription: seoDefaultDescription || null,
    googleSiteVerification: googleSiteVerification || null,
    // Only touch ogImageKey when a new key is uploaded or an explicit clear is
    // requested; otherwise leave the stored image untouched.
    ...(ogImageKey ? { ogImageKey } : {}),
    ...(clearOgImage ? { ogImageKey: null } : {}),
    ...(showRelatedTours === undefined ? {} : { showRelatedTours }),
    ...(orgTelephone === undefined ? {} : { orgTelephone: orgTelephone || null }),
    ...(orgAddress === undefined ? {} : { orgAddress: orgAddress || null }),
    // priceRange is non-nullable (defaults to $$); empty input resets to $$.
    ...(orgPriceRange === undefined ? {} : { orgPriceRange: orgPriceRange || "$$" }),
  };

  const setting = await db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
    select: {
      seoSiteName: true,
      seoDefaultTitle: true,
      seoDefaultDescription: true,
      googleSiteVerification: true,
      ogImageKey: true,
      showRelatedTours: true,
      orgTelephone: true,
      orgAddress: true,
      orgPriceRange: true,
    },
  });

  void writeLog({
    userId: session.userId,
    userAccount: session.username,
    action: "UPDATE",
    resource: "SITE_SETTING",
    resourceId: SINGLETON_ID,
    resourceName: "SEO 設定",
    detail: data,
  });

  revalidatePublic(CACHE_TAGS.siteSetting);
  const ogImageUrl = setting.ogImageKey ? storage.publicUrl(setting.ogImageKey) : null;
  return NextResponse.json({ data: { ...setting, ogImageUrl } });
}
