"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SubRegionWithTours } from "@/lib/frontend-data";
import CroppedThumb from "./CroppedThumb";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";
import { trackEvent } from "@/lib/analytics";

interface Props {
  parent: { name: string };
  regionSlug: string;
  regions: SubRegionWithTours[];
  initialSlug: string;
  /**
   * Heading level for the section title. Defaults to "h2". The standalone
   * sub-region page passes "h1" (this section is its primary heading); the
   * tour page keeps "h2" because the open tour card already owns the h1.
   */
  headingLevel?: "h1" | "h2";
}

export default function TourSection({ parent, regionSlug, regions, initialSlug, headingLevel = "h2" }: Props) {
  const Heading = headingLevel;
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const router = useRouter();

  const activeRegion = regions.find((r) => r.slug === activeSlug) ?? regions[0];

  // Keep the active sub-category in sync with the URL so the breadcrumb (rendered
  // by the server page from the URL) and this list always match — including on
  // browser back/forward navigation between sub-categories.
  useEffect(() => {
    setActiveSlug(initialSlug);
  }, [initialSlug]);

  // Switch sub-category: update the list instantly (optimistic local state) and
  // push the new URL so the breadcrumb and shareable address stay in sync.
  function selectSub(slug: string) {
    if (slug === activeSlug) return;
    const picked = regions.find((r) => r.slug === slug);
    trackEvent("select_content", {
      content_type: "sub_category",
      item_id: picked?.name ?? slug,
    });
    setActiveSlug(slug);
    router.push(`/regions/${regionSlug}/${slug}`, { scroll: false });
  }

  return (
    <>
      {/* Section head */}
      <div className="fh-sec-head">
        <div className="mid">
          <Heading className="t">
            遇見<em>旅程</em>的每一種可能
          </Heading>
        </div>
        <div className="r">
          <span>
            {parent.name} ・ {activeRegion.name}
          </span>
          <span>
            <b>{activeRegion.tours.length}</b> 條路線
          </span>
        </div>
      </div>

      {/* Sub-category tabs */}
      <nav className="fh-subtabs">
        {regions.map((r) => (
          <button
            key={r.slug}
            className={r.slug === activeSlug ? "active" : ""}
            onClick={() => selectSub(r.slug)}
          >
            {r.name}
          </button>
        ))}
      </nav>

      {/* Tour list */}
      <div className="fh-tour-list">
        {activeRegion.tours.length === 0 ? (
          <div className="fh-empty">這個分類的行程正在籌備中，敬請期待。</div>
        ) : (
          activeRegion.tours.map((tour, i) => (
            <Link
              key={i}
              href={`/tours/${tour.productId ?? tour.slug}`}
              className="fh-trow"
            >
              <div className="t-img">
                <CroppedThumb
                  src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
                  alt={tour.name}
                  crop={tour.thumbnail ? tour.crop : null}
                  sizes="(max-width: 767px) 100vw, (max-width: 1080px) 50vw, 33vw"
                />
              </div>
              <div className="t-body">
                <div className="t-tags">
                  {tour.tags.map((tag) =>
                    tag === "hot" ? (
                      <span key={tag}>熱門</span>
                    ) : (
                      <span key={tag}>{tag}</span>
                    )
                  )}
                </div>
                <h3 className="t-name">{tour.name}</h3>
                {tour.description && <p className="t-lede">{tour.description}</p>}
                <div className="t-foot">
                  <span className="t-amt">
                    {isCustomQuote(tour.price) ? (
                      <span className="custom-quote">{CUSTOM_QUOTE_LABEL}</span>
                    ) : (
                      <>
                        <span className="cur">$</span>
                        <span className="num">{tour.price.toLocaleString("zh-TW")}</span>
                        <span className="unit">起</span>
                      </>
                    )}
                  </span>
                  <span className="t-cta">查看行程 →</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
