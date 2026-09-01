"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { SubRegionWithTours, TourItem, TourModalData } from "@/lib/frontend-data";
import TourDetailModal from "./TourDetailModal";
import CroppedThumb from "./CroppedThumb";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";

interface Props {
  parent: { name: string };
  regionSlug: string;
  regions: SubRegionWithTours[];
  initialSlug: string;
}

export default function TourSection({ parent, regionSlug, regions, initialSlug }: Props) {
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<TourModalData | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeRegion = regions.find((r) => r.slug === activeSlug) ?? regions[0];

  // Build the shared-modal payload from a listing tour + its sub-region name.
  function toModalData(tour: TourItem, subRegionName: string): TourModalData {
    return {
      id: tour.id,
      slug: tour.slug,
      productId: tour.productId,
      name: tour.name,
      thumbnail: tour.thumbnail,
      price: tour.price,
      description: tour.description,
      tags: tour.tags,
      media: tour.media,
      regionName: parent.name,
      subRegionName,
    };
  }

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
    setActiveSlug(slug);
    router.push(`/regions/${regionSlug}/${slug}`, { scroll: false });
  }

  // Open modal when ?tour= query param is present (e.g. navigated from the
  // header quick-search dropdown).
  useEffect(() => {
    const tourSlug = searchParams.get("tour");
    if (!tourSlug) return;
    for (const region of regions) {
      const tour = region.tours.find((t) => t.productId === tourSlug || t.slug === tourSlug);
      if (tour) {
        setModalData(toModalData(tour, region.name));
        setModalOpen(true);
        router.replace(pathname, { scroll: false });
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, regions, pathname, router]);

  function openModal(tour: TourItem) {
    setModalData(toModalData(tour, activeRegion.name));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalData(null);
  }

  return (
    <>
      {/* Section head */}
      <div className="fh-sec-head">
        <div className="mid">
          <h2 className="t">
            遇見<em>旅程</em>的每一種可能
          </h2>
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
            <a
              key={i}
              href={`/tours/${tour.productId ?? tour.slug}`}
              className="fh-trow"
              onClick={(e) => { e.preventDefault(); openModal(tour); }}
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
            </a>
          ))
        )}
      </div>

      {/* Tour detail modal */}
      <TourDetailModal tour={modalData} isOpen={modalOpen} onClose={closeModal} />
    </>
  );
}
