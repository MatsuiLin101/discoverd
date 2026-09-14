import Link from "next/link";
import { Suspense } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import TourSection from "./TourSection";
import type { RegionTours } from "@/lib/frontend-data";

interface Props {
  data: RegionTours;
  regionSlug: string;
  /** Active sub-region slug (already validated against data.subRegions). */
  activeSlug: string;
  /** Display name of the active sub-region, shown in the breadcrumb. */
  activeName: string;
}

/**
 * The sub-region tour listing (header + breadcrumb + tour grid + footer).
 * Shared by the sub-region page and the standalone tour page, so a shared
 * tour link opens the modal over exactly the same listing as an in-site click.
 */
export default function SubRegionListing({ data, regionSlug, activeSlug, activeName }: Props) {
  return (
    <>
      <SiteHeader />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <Link href={`/regions/${regionSlug}`}>{data.region.name}</Link>
            <span className="sep">／</span>
            <span className="cur">{activeName}</span>
          </span>
        </div>
      </nav>

      <section className="fh-listing">
        <Suspense fallback={null}>
          <TourSection
            parent={{ name: data.region.name }}
            regionSlug={regionSlug}
            regions={data.subRegions}
            initialSlug={activeSlug}
          />
        </Suspense>
      </section>

      <SiteFooter />
    </>
  );
}
