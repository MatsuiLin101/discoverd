"use client";

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import Image from "next/image";

interface Slide {
  img: string;
  alt: string;
}

export default function HeroCarousel({
  slides,
  mobileRatio = "cover",
  layoutMode = "original",
  maxHeight = 720,
}: {
  slides: Slide[];
  mobileRatio?: string;
  layoutMode?: string;
  maxHeight?: number;
}) {
  const [current, setCurrent] = useState(0);
  // In the ratio-scaled modes ("fit" and "boxed") the container sizes to the
  // image's natural aspect ratio (measured from the first slide once it loads)
  // so the whole image shows at full width. Until measured we fall back to 2:1.
  const [fitRatio, setFitRatio] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // "fit" and "boxed" both scale the carousel by the image ratio; only "fit"
  // caps the height (boxed is already bounded by the box width).
  const isRatio = layoutMode === "fit" || layoutMode === "boxed";
  // On mobile (original mode), "cover" keeps the full-bleed crop; any
  // aspect-ratio value switches to a fixed-ratio container that shows the whole
  // image. Desktop is unaffected (see .fh-carousel in frontend.css). The ratio
  // is fed to the mobile media query as a CSS variable so it stays data-driven.
  const contain = mobileRatio !== "cover";

  let carouselStyle: CSSProperties | undefined;
  if (isRatio) {
    // Both "fit" and "boxed" cap the carousel height at maxHeight; beyond the
    // cap the image is contained (letterboxed) on the dark background.
    carouselStyle = {
      width: "100%",
      aspectRatio: fitRatio ? String(fitRatio) : "2 / 1",
      height: "auto",
      minHeight: 0,
      maxHeight: `${maxHeight}px`,
    };
  } else if (contain) {
    carouselStyle = { "--m-ratio": mobileRatio.replace("/", " / ") } as CSSProperties;
  }
  const dataFit = isRatio ? undefined : contain ? "contain" : "cover";

  const go = useCallback(
    (n: number) => {
      setCurrent((n + slides.length) % slides.length);
    },
    [slides.length]
  );

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
  }, [slides.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // In "fit" mode, measure the first slide's natural aspect ratio so the
  // container can size to it. A dedicated Image() loader is used (instead of
  // onLoad) so it also resolves for an already-cached image.
  const firstSrc = slides[0]?.img;
  useEffect(() => {
    if (!isRatio || !firstSrc) return;
    const probe = new window.Image();
    const apply = () => {
      if (probe.naturalWidth && probe.naturalHeight) {
        setFitRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.onload = apply;
    probe.src = firstSrc;
    if (probe.complete) apply();
  }, [isRatio, firstSrc]);

  function handlePrev() {
    go(current - 1);
    resetTimer();
  }

  function handleNext() {
    go(current + 1);
    resetTimer();
  }

  function handleDot(i: number) {
    go(i);
    resetTimer();
  }

  return (
    <section className="fh-hero">
      <div
        className="fh-carousel"
        data-fit={dataFit}
        data-mode={isRatio ? "fit" : undefined}
        style={carouselStyle}
      >
        {slides.map((slide, i) => (
          <div key={i} className={`fh-slide${i === current ? " active" : ""}`}>
            <Image
              className="slide-img"
              src={slide.img}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}

        <button className="fh-car-nav fh-car-prev" onClick={handlePrev} aria-label="上一張">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="fh-car-nav fh-car-next" onClick={handleNext} aria-label="下一張">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="fh-car-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === current ? "active" : ""}
              onClick={() => handleDot(i)}
              aria-label={`第 ${i + 1} 張`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
