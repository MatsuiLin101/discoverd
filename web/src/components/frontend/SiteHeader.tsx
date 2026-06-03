"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";

interface SearchResult {
  id: string;
  name: string;
  thumbnail: string | null;
  price: number;
  tags: string[];
  regionName: string;
  regionSlug: string;
  subRegionSlug: string;
}

function highlight(name: string, q: string): string {
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return name;
  return (
    name.slice(0, i) +
    `<mark>${name.slice(i, i + q.length)}</mark>` +
    name.slice(i + q.length)
  );
}

export default function SiteHeader() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setMatches([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data: SearchResult[] = await res.json();
        setMatches(data);
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand */}
        <Link className="brand" href="/">
          <span className="brand-logo">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 21.1l-1.4-1.3C5.4 15.1 2 12 2 8.3 2 5.3 4.4 3 7.4 3c1.7 0 3.4.8 4.6 2.1C13.2 3.8 14.9 3 16.6 3 19.6 3 22 5.3 22 8.3c0 3.7-3.4 6.8-8.6 11.5L12 21.1z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">
              找到了<em>旅遊</em>
            </span>
          </span>
        </Link>

        {/* Search */}
        <div className="fh-search" ref={containerRef}>
          <form
            className="search-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
          >
            <input
              type="text"
              value={query}
              placeholder="搜尋目的地、行程關鍵字⋯"
              onChange={(e) => {
                setQuery(e.target.value);
                search(e.target.value);
              }}
              onFocus={() => {
                if (query.trim()) search(query);
              }}
              onKeyDown={handleKeyDown}
            />
            <button className="search-btn" type="submit" aria-label="搜尋">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
          </form>

          {open && query.trim() && (
            <div className="fh-search-results">
              {loading ? (
                <div className="fh-sr-empty">搜尋中⋯</div>
              ) : matches.length === 0 ? (
                <div className="fh-sr-empty">
                  找不到符合「<span className="k">{query}</span>」的行程
                  <br />
                  試試「日本」「極光」「海島」等關鍵字
                </div>
              ) : (
                <>
                  <div className="fh-sr-head">
                    <span>搜尋結果</span>
                    <span>
                      <b>{matches.length}</b> 筆
                    </span>
                  </div>
                  {matches.map((m, i) => (
                    <Link
                      key={m.id}
                      href={`/regions/${m.regionSlug}/${m.subRegionSlug}`}
                      className={`fh-sr-item${i === activeIndex ? " sr-active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setOpen(false)}
                    >
                      <div className="fh-sr-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.thumbnail ?? ""} alt="" />
                      </div>
                      <div className="fh-sr-txt">
                        <div
                          className="fh-sr-nm"
                          dangerouslySetInnerHTML={{
                            __html: highlight(m.name, query),
                          }}
                        />
                        <div className="fh-sr-tags">
                          {m.tags.map((t) => (
                            <span key={t} className="fh-sr-chip">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="fh-sr-price">
                        <span className="cur">$</span>
                        <span className="num">{m.price.toLocaleString()}</span>
                        <span className="unit">起</span>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Social */}
        <div className="fh-social">
          <a href="#" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 21v-7.4h2.5l.37-2.88H13.5V8.88c0-.83.23-1.4 1.43-1.4h1.53V4.9a20.5 20.5 0 0 0-2.23-.11c-2.2 0-3.71 1.34-3.71 3.81v2.12H8v2.88h2.52V21z" />
            </svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="4" width="16" height="16" rx="5" />
              <circle cx="12" cy="12" r="3.6" />
              <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a href="#" aria-label="LINE">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.16.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.18.9.79.49 1-.41 5.36-3.16 7.31-5.41 1.34-1.48 1.71-2.99 1.71-4.25 0-4-4-7.2-9-7.2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
