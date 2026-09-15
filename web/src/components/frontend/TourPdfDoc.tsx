"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

/** Minimal shape of the page object react-pdf passes to onRenderSuccess. */
type RenderedPage = { originalWidth: number; originalHeight: number };

// pdf.js needs its worker; resolved by the bundler from the installed package.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/** A4 portrait height/width ratio, used to size pages not yet rendered. */
const DEFAULT_RATIO = 1.414;

/**
 * How many times to silently re-fetch a PDF that fails to load before showing
 * the fallback link. A just-uploaded file served through the Cloudflare-fronted
 * R2 public domain can miss on the first cross-origin fetch (edge read-after-write
 * propagation / a briefly negatively-cached response); retrying with a cache-busting
 * query param past that window usually succeeds — which is exactly what a manual
 * page refresh does today.
 */
const MAX_RETRIES = 3;

/** Base backoff between retries; the nth retry waits n × this. */
const RETRY_BASE_MS = 800;

/**
 * One PDF page that only mounts <Page> when near the viewport. Off-screen pages
 * keep their place with an equal-height placeholder so scrolling stays stable.
 */
function LazyPdfPage({
  pageNumber,
  width,
  ratio,
  onRatio,
}: {
  pageNumber: number;
  width: number;
  ratio: number;
  onRatio: (pageNumber: number, ratio: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The gallery scrolls inside `.fh-gallery-scroll`; observe against that
    // container so rootMargin pre-renders pages within it (a null/viewport root
    // would be clipped by the container with no margin).
    const root = el.closest(".fh-gallery-scroll");
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      // Pre-render pages within ~1.5 screens above/below the visible area.
      { root, rootMargin: "1500px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleRenderSuccess = useCallback(
    (page: RenderedPage) => onRatio(pageNumber, page.originalHeight / page.originalWidth),
    [pageNumber, onRatio]
  );

  return (
    <div
      ref={ref}
      className="fh-pdf-page"
      style={{ minHeight: width > 0 ? width * ratio : undefined }}
    >
      {visible && width > 0 && (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={handleRenderSuccess}
          loading={<div className="fh-pdf-loading">PDF 載入中…</div>}
        />
      )}
    </div>
  );
}

/** Render a single PDF page-by-page, virtualizing off-screen pages. */
export default function TourPdfDoc({
  url,
  filename,
}: {
  url: string;
  filename: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});

  // Load-retry state: `attempt` counts failed loads (0 = original url), and
  // `failed` gates the fallback once retries are exhausted.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [prevUrl, setPrevUrl] = useState(url);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset retry state whenever the source url changes (e.g. switching tours).
  // Adjusting state during render is React's recommended pattern for this.
  if (prevUrl !== url) {
    setPrevUrl(url);
    setAttempt(0);
    setFailed(false);
  }

  // What react-pdf actually fetches: the original url first, then a cache-busted
  // variant on each retry so it bypasses any edge-cached error / negative response.
  const fileUrl = attempt === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}r=${attempt}`;

  // Clear any pending retry timer on unmount.
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleLoadError = useCallback(() => {
    if (attempt >= MAX_RETRIES) {
      setFailed(true);
      return;
    }
    const next = attempt + 1;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => setAttempt(next), RETRY_BASE_MS * next);
  }, [attempt]);

  // Track the column width so each page renders at the right size (and reflows).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleRatio = useCallback((pageNumber: number, ratio: number) => {
    setRatios((prev) => (prev[pageNumber] === ratio ? prev : { ...prev, [pageNumber]: ratio }));
  }, []);

  // Pages share a size in practice; use page 1's ratio to size unrendered pages.
  const defaultRatio = ratios[1] ?? DEFAULT_RATIO;

  const fallback = (
    <a className="fh-pdf-fallback" href={url} target="_blank" rel="noopener noreferrer">
      無法載入 PDF，點此開啟{filename ? `：${filename}` : ""}
    </a>
  );

  return (
    <div ref={containerRef} className="fh-pdf">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={handleLoadError}
        loading={<div className="fh-pdf-loading">PDF 載入中…</div>}
        // While retries remain, keep showing the loading state instead of the
        // fallback; only surface the fallback once retries are exhausted.
        error={failed ? fallback : <div className="fh-pdf-loading">PDF 載入中…</div>}
      >
        {width > 0 &&
          Array.from({ length: numPages }, (_, i) => (
            <LazyPdfPage
              key={i}
              pageNumber={i + 1}
              width={width}
              ratio={ratios[i + 1] ?? defaultRatio}
              onRatio={handleRatio}
            />
          ))}
      </Document>
    </div>
  );
}
