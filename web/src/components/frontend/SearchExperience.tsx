"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  SearchFilterData,
  SearchResponse,
  SearchResultItem,
} from "@/lib/frontend-data";
import { isCustomQuote, CUSTOM_QUOTE_LABEL } from "@/lib/tour-price";

/** Must stay in sync with SEARCH_MAX_LIMIT in frontend-queries.ts. */
const RESULT_LIMIT = 100;

interface InitialFilters {
  q: string;
  region: string;
  sub: string;
  tags: string[];
}

interface Props {
  facets: SearchFilterData;
  initialFilters: InitialFilters;
  initialResponse: SearchResponse;
}

/** Serialize filters into a query string (tags as repeated params). */
function buildQuery(f: InitialFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.region) p.set("region", f.region);
  if (f.region && f.sub) p.set("sub", f.sub);
  for (const t of f.tags) p.append("tags", t);
  return p.toString();
}

export default function SearchExperience({ facets, initialFilters, initialResponse }: Props) {
  const [q, setQ] = useState(initialFilters.q);
  const [region, setRegion] = useState(initialFilters.region);
  const [sub, setSub] = useState(initialFilters.sub);
  const [tags, setTags] = useState<string[]>(initialFilters.tags);
  const [response, setResponse] = useState<SearchResponse>(initialResponse);
  const [loading, setLoading] = useState(false);

  const skipFetch = useRef(true); // SSR already provided initialResponse

  const activeRegion = facets.regions.find((r) => r.slug === region) ?? null;
  const hasAnyFilter =
    q.trim().length > 0 || region !== "" || sub !== "" || tags.length > 0;

  // Fetch results + keep the URL shareable (shallow, no server round-trip)
  // whenever a filter changes. Internal state is the single source of truth;
  // external navigation to /search?... while this component is already mounted
  // remounts it via the server page's key (see search/page.tsx).
  useEffect(() => {
    const query = buildQuery({ q, region, sub, tags });

    const url = query ? `/search?${query}` : "/search";
    window.history.replaceState(window.history.state, "", url);

    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?${query}${query ? "&" : ""}limit=${RESULT_LIMIT}`,
          { signal: controller.signal },
        );
        const data: SearchResponse = await res.json();
        setResponse({ total: data.total ?? 0, results: data.results ?? [] });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResponse({ total: 0, results: [] });
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, region, sub, tags]);

  const selectRegion = useCallback((slug: string) => {
    setRegion((prev) => (prev === slug ? prev : slug));
    setSub(""); // sub-category belongs to a region — reset on region change
  }, []);

  const clearRegion = useCallback(() => {
    setRegion("");
    setSub("");
  }, []);

  const toggleTag = useCallback((name: string) => {
    setTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }, []);

  const clearAll = useCallback(() => {
    setQ("");
    setRegion("");
    setSub("");
    setTags([]);
  }, []);

  const { total, results } = response;

  return (
    <>
      {/* Section head */}
      <div className="fh-sec-head">
        <div className="mid">
          <h2 className="t">
            探索<em>所有旅程</em>
          </h2>
        </div>
        <div className="r">
          <span>依地區、分類、標籤或關鍵字篩選</span>
          <span>
            <b>{total}</b> 條路線
          </span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="fh-searchbox">
        {/* Keyword */}
        <div className="fh-filter-group">
          <label className="fh-filter-label" htmlFor="fh-adv-q">
            關鍵字
          </label>
          <input
            id="fh-adv-q"
            className="fh-adv-input"
            type="text"
            value={q}
            placeholder="行程名稱、目的地或關鍵字⋯"
            autoComplete="off"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Main category */}
        <div className="fh-filter-group">
          <span className="fh-filter-label">主分類</span>
          <nav className="fh-subtabs">
            <button
              className={region === "" ? "active" : ""}
              onClick={clearRegion}
            >
              全部
            </button>
            {facets.regions.map((r) => (
              <button
                key={r.slug}
                className={r.slug === region ? "active" : ""}
                onClick={() => selectRegion(r.slug)}
              >
                {r.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Sub category — only when a region is selected */}
        {activeRegion && activeRegion.subRegions.length > 0 && (
          <div className="fh-filter-group">
            <span className="fh-filter-label">次分類</span>
            <nav className="fh-subtabs">
              <button
                className={sub === "" ? "active" : ""}
                onClick={() => setSub("")}
              >
                全部
              </button>
              {activeRegion.subRegions.map((sr) => (
                <button
                  key={sr.slug}
                  className={sr.slug === sub ? "active" : ""}
                  onClick={() => setSub(sr.slug)}
                >
                  {sr.name}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Tags — multi-select */}
        {facets.tags.length > 0 && (
          <div className="fh-filter-group">
            <span className="fh-filter-label">標籤（可複選）</span>
            <div className="fh-tag-chips">
              {facets.tags.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`fh-tag-chip${on ? " on" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggleTag(t)}
                  >
                    {t === "hot" ? "熱門" : t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasAnyFilter && (
          <div className="fh-filter-actions">
            <button type="button" className="fh-clear-btn" onClick={clearAll}>
              清除全部條件
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {total > RESULT_LIMIT && (
        <p className="fh-result-note">
          符合條件的行程共 {total} 筆，顯示前 {RESULT_LIMIT} 筆，請縮小範圍。
        </p>
      )}

      {results.length === 0 ? (
        <div className="fh-empty">
          {hasAnyFilter
            ? "找不到符合條件的行程，試試調整或清除篩選。"
            : "選擇分類、標籤或輸入關鍵字，開始探索旅程。"}
        </div>
      ) : (
        <div className={`fh-tour-list${loading ? " is-loading" : ""}`}>
          {results.map((tour) => (
            <ResultCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </>
  );
}

function ResultCard({ tour }: { tour: SearchResultItem }) {
  return (
    <a href={`/tours/${tour.productId ?? tour.slug}`} className="fh-trow">
      <div className="t-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tour.thumbnail ?? "/images/tour-placeholder.svg"} alt={tour.name} />
      </div>
      <div className="t-body">
        <div className="t-tags">
          <span className="t-region">
            {tour.regionName} ・ {tour.subRegionName}
          </span>
          {tour.tags.map((tag) => (
            <span key={tag}>{tag === "hot" ? "熱門" : tag}</span>
          ))}
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
  );
}
