"use client";

import { useState, useEffect, type CSSProperties } from "react";
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
  heroRatio = "auto",
}: {
  slides: Slide[];
  mobileRatio?: string;
  layoutMode?: string;
  maxHeight?: number;
  heroRatio?: string;
}) {
  const [current, setCurrent] = useState(0);
  // In the ratio-scaled modes ("fit" and "boxed") the container sizes to the
  // carousel aspect ratio: a fixed heroRatio when set, otherwise the first
  // image's natural ratio (measured once it loads; 2:1 fallback until then).
  const [fitRatio, setFitRatio] = useState<number | null>(null);
  // Auto-advance pauses while the carousel is hovered/focused, and is disabled
  // entirely when the viewer prefers reduced motion.
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const multiple = slides.length > 1;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // "fit" and "boxed" both scale the carousel by ratio and cap the height.
  const isRatio = layoutMode === "fit" || layoutMode === "boxed";
  // A fixed heroRatio ("16/9" etc.) overrides the measured image ratio.
  const fixedRatio = heroRatio !== "auto" ? heroRatio.replace("/", " / ") : null;
  // On mobile (original mode), "cover" keeps the full-bleed crop; any
  // aspect-ratio value switches to a fixed-ratio container that shows the whole
  // image. Desktop is unaffected (see .fh-carousel in frontend.css). The ratio
  // is fed to the mobile media query as a CSS variable so it stays data-driven.
  const contain = mobileRatio !== "cover";

  let carouselStyle: CSSProperties | undefined;
  if (isRatio) {
    // Cap the carousel height at maxHeight; beyond the cap the image is
    // contained (letterboxed) on the dark background.
    carouselStyle = {
      width: "100%",
      aspectRatio: fixedRatio ?? (fitRatio ? String(fitRatio) : "2 / 1"),
      height: "auto",
      minHeight: 0,
      maxHeight: `${maxHeight}px`,
    };
  } else if (contain) {
    carouselStyle = { "--m-ratio": mobileRatio.replace("/", " / ") } as CSSProperties;
  }
  const dataFit = isRatio ? undefined : contain ? "contain" : "cover";

  function go(n: number) {
    setCurrent((n + slides.length) % slides.length);
  }

  // Auto-advance every 6s. Depending on `current` restarts the timer whenever
  // the slide changes, so manual navigation also resets the countdown. Off for
  // a single slide, while paused (hover/focus), or under reduced motion.
  const autoplay = multiple && !paused && !reducedMotion;
  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [autoplay, current, slides.length]);

  // When the ratio is "auto", measure the first slide's natural aspect ratio so
  // the container can size to it. A dedicated Image() loader is used (instead of
  // onLoad) so it also resolves for an already-cached image. Skipped when a
  // fixed heroRatio is set.
  const firstSrc = slides[0]?.img;
  useEffect(() => {
    if (!isRatio || fixedRatio || !firstSrc) return;
    const probe = new window.Image();
    const apply = () => {
      if (probe.naturalWidth && probe.naturalHeight) {
        setFitRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.onload = apply;
    probe.src = firstSrc;
    if (probe.complete) apply();
  }, [isRatio, fixedRatio, firstSrc]);

  function handlePrev() {
    go(current - 1);
  }

  function handleNext() {
    go(current + 1);
  }

  function handleDot(i: number) {
    go(i);
  }

  return (
    <section className="fh-hero">
      <div
        className="fh-carousel"
        data-fit={dataFit}
        data-mode={isRatio ? "fit" : undefined}
        style={carouselStyle}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
        }}
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

        {multiple && (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}
