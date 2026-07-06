"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { SubRegionWithTours, TourItem } from "@/lib/frontend-data";
import TourInquiryModal from "./TourInquiryModal";
import TourShareButton from "./TourShareButton";
import TourMediaGallery from "./TourMediaGallery";
import LineIcon from "./LineIcon";
import { useSocialLinks } from "@/hooks/useSocialLinks";

interface Props {
  parent: { name: string };
  regions: SubRegionWithTours[];
  initialSlug: string;
}

export default function TourSection({ parent, regions, initialSlug }: Props) {
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTour, setModalTour] = useState<TourItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  const { lineUrl } = useSocialLinks();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeRegion = regions.find((r) => r.slug === activeSlug) ?? regions[0];

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  // Open modal when ?tour= query param is present (e.g. navigated from search)
  useEffect(() => {
    const tourSlug = searchParams.get("tour");
    if (!tourSlug) return;
    for (const region of regions) {
      const tour = region.tours.find((t) => t.slug === tourSlug);
      if (tour) {
        setModalTour(tour);
        setMobileCollapsed(false);
        setModalOpen(true);
        router.replace(pathname, { scroll: false });
        return;
      }
    }
  }, [searchParams, regions, pathname, router]);

  // Escape key to close tour detail modal (form ESC is handled inside TourInquiryModal)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && modalOpen && !formOpen) {
        closeModal();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [formOpen, modalOpen]);

  function openModal(tour: TourItem) {
    setModalTour(tour);
    setMobileCollapsed(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalTour(null);
    setFormOpen(false);
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
            onClick={() => setActiveSlug(r.slug)}
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
              href={`/tours/${tour.slug}`}
              className="fh-trow"
              onClick={(e) => { e.preventDefault(); openModal(tour); }}
            >
              <div className="t-img">
                <Image
                  src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
                  alt={tour.name}
                  fill
                  sizes="300px"
                  style={{ objectFit: "cover" }}
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
                    <span className="cur">$</span>
                    <span className="num">{tour.price.toLocaleString("zh-TW")}</span>
                    <span className="unit">起</span>
                  </span>
                  <span className="t-cta">查看行程 →</span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Tour detail modal */}
      <div
        className={`fh-modal-overlay${modalOpen ? " open" : ""}`}
        aria-hidden={!modalOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="fh-modal" role="dialog" aria-modal="true">
          <button className="fh-modal-x" onClick={closeModal} aria-label="關閉">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {/* Gallery */}
          {modalTour && (
            <TourMediaGallery
              media={modalTour.media}
              thumbnail={modalTour.thumbnail}
              alt={modalTour.name}
            />
          )}

          {/* Info side */}
          <aside className={`fh-modal-side${mobileCollapsed ? " collapsed" : ""}`}>
            <button
              className="fh-m-toggle"
              aria-expanded={!mobileCollapsed}
              aria-label="展開或收合說明"
              onClick={() => setMobileCollapsed((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="m-top">
              <div className="m-eyebrow">
                {parent.name} ・ {activeRegion.name}
              </div>
              <div className="m-name-row">
                <h3 className="m-name">{modalTour?.name}</h3>
                {modalTour && <TourShareButton key={modalTour.slug} slug={modalTour.slug} />}
              </div>
              <div className="m-tags">
                {modalTour?.tags.map((tag) => (
                  <span key={tag}>{tag === "hot" ? "熱門" : tag}</span>
                ))}
              </div>
              {modalTour?.description && (
                <p className="m-lede">{modalTour.description}</p>
              )}
            </div>

            <div className="m-bottom">
              <div>
                <div className="m-price">
                  <span className="cur">NT$</span>
                  <span className="num">{modalTour?.price.toLocaleString("zh-TW")}</span>
                  <span className="unit">起</span>
                </div>
                <p className="m-note">※ 優惠方案及出發日期請洽服務專員</p>
              </div>
              <div className="m-actions">
                {lineUrl ? (
                  <a className="m-line" href={lineUrl} target="_blank" rel="noopener noreferrer">
                    <LineIcon />
                    加 LINE 諮詢
                  </a>
                ) : (
                  <button className="m-line" type="button" disabled>
                    <LineIcon />
                    加 LINE 諮詢
                  </button>
                )}
                <button
                  className="m-form"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormOpen(true);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 4h6a2 2 0 0 1 2 2v0M9 4a2 2 0 0 0-2 2v0M9 4V3m6 1V3M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 13h6M9 17h4" />
                  </svg>
                  填寫諮詢單
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <TourInquiryModal
        tourId={modalTour?.id ?? null}
        tourName={modalTour?.name ?? ""}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}
