"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface Slide {
  img: string;
  alt: string;
}

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      <div className="fh-carousel">
        {slides.map((slide, i) => (
          <div key={i} className={`fh-slide${i === current ? " active" : ""}`}>
            <Image
              className="slide-img"
              src={slide.img}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              style={{ objectFit: "cover" }}
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
