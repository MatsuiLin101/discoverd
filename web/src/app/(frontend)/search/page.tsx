import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";
import SearchExperience from "@/components/frontend/SearchExperience";
import { getSearchFilters, searchTours, SEARCH_MAX_LIMIT } from "@/lib/frontend-queries";
import type { SearchFilters } from "@/lib/frontend-data";

export const metadata: Metadata = {
  title: "搜尋行程 ／ 找到了旅遊 FOUND HOLIDAY",
  description: "依地區、分類與標籤篩選，或輸入關鍵字，快速找到最適合你的旅程。",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{
    q?: string;
    region?: string;
    sub?: string;
    tags?: string | string[];
  }>;
}

/** Split searchParams (string | string[] | comma-joined) into a clean list. */
function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;

  const filters: SearchFilters = {
    q: sp.q?.trim() || undefined,
    region: sp.region?.trim() || undefined,
    sub: sp.sub?.trim() || undefined,
    tags: toList(sp.tags),
  };

  const [facets, initial] = await Promise.all([
    getSearchFilters(),
    searchTours(filters, SEARCH_MAX_LIMIT),
  ]);

  // Re-key on the incoming URL so a fresh navigation to /search?… (e.g. the
  // header "檢視所有結果" button) remounts the client experience with the new
  // filters. Our own in-page shallow URL updates never reach the server, so
  // this key stays stable while the user interacts with the controls.
  const experienceKey = `${filters.q ?? ""}|${filters.region ?? ""}|${filters.sub ?? ""}|${(filters.tags ?? []).join(",")}`;

  return (
    <>
      <SiteHeader />

      <nav className="fh-page-bar">
        <div className="fh-page-bar-inner">
          <span className="crumb">
            <Link href="/">首頁</Link>
            <span className="sep">／</span>
            <span className="cur">搜尋行程</span>
          </span>
        </div>
      </nav>

      <section className="fh-listing">
        <Suspense fallback={null}>
          <SearchExperience
            key={experienceKey}
            facets={facets}
            initialFilters={{
              q: filters.q ?? "",
              region: filters.region ?? "",
              sub: filters.sub ?? "",
              tags: filters.tags ?? [],
            }}
            initialResponse={initial}
          />
        </Suspense>
      </section>

      <SiteFooter />
    </>
  );
}
