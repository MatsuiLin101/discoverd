import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import TourSection from "@/components/frontend/TourSection";
import { REGIONS } from "@/lib/frontend-data";

interface Props {
  params: Promise<{ slug: string; subSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subSlug } = await params;
  const region = REGIONS.find((r) => r.slug === slug);
  const sub = region?.subRegions.find((sr) => sr.slug === subSlug);
  if (!region || !sub) return {};
  return {
    title: `${sub.zh} ／ ${region.zh} — 找到了旅遊 FOUND HOLIDAY`,
  };
}

export default async function ToursPage({ params }: Props) {
  const { slug, subSlug } = await params;
  const region = REGIONS.find((r) => r.slug === slug);
  if (!region) notFound();

  const validSlug = region.subRegions.some((sr) => sr.slug === subSlug)
    ? subSlug
    : region.subRegions[0]?.slug ?? "";

  const currentSub = region.subRegions.find((sr) => sr.slug === validSlug);
  if (!currentSub) notFound();

  return (
    <>
      <SiteHeader />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${slug}`}>{region.zh}</Link>
            <span className="sep">／</span>
            <span className="cur">{currentSub.zh}</span>
          </span>
        </div>
      </nav>

      <section className="fh-listing">
        <TourSection
          parent={{ zh: region.zh, en: region.en }}
          regions={region.subRegions}
          initialSlug={validSlug}
        />
      </section>

      <SiteFooter />
    </>
  );
}
