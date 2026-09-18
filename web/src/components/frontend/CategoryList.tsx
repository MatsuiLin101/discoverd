"use client";

import Link from "next/link";
import CroppedThumb from "./CroppedThumb";
import type { ThumbCrop } from "@/lib/crop";
import { trackEvent } from "@/lib/analytics";

export interface CategoryItem {
  href: string;
  name: string;
  count: string | number;
  img: string;
  crop?: ThumbCrop | null;
}

interface Props {
  title: string;
  stats: string[];
  categories: CategoryItem[];
  /**
   * Heading level for the section title. Defaults to "h2"; pages that use this
   * section as their primary heading (home, region listing) pass "h1" so each
   * page exposes a single top-level heading for SEO.
   */
  headingLevel?: "h1" | "h2";
}

const ArrowSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function CategoryList({ title, stats, categories, headingLevel = "h2" }: Props) {
  const Heading = headingLevel;
  return (
    <section className="fh-cats">
      <div className="fh-sec-head">
        <div className="mid">
          <Heading
            className="t"
            dangerouslySetInnerHTML={{ __html: title }}
          />
        </div>
        <div className="r">
          {stats.map((s, i) => (
            <span key={i} dangerouslySetInnerHTML={{ __html: s }} />
          ))}
        </div>
      </div>

      <div className="fh-cat-list">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            className="fh-cat-row"
            href={cat.href}
            onClick={() =>
              trackEvent("select_content", {
                content_type: "category",
                item_id: cat.name,
              })
            }
          >
            <div className="cat-txt">
              <span className="cat-nm">{cat.name}</span>
              <span className="cat-ct">{cat.count} 條路線</span>
            </div>
            <div className="cat-thumb">
              {cat.img ? (
                <CroppedThumb src={cat.img} alt={cat.name} crop={cat.crop} sizes="240px" />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "var(--line)" }} />
              )}
            </div>
            <span className="cat-arrow">
              <ArrowSvg />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
