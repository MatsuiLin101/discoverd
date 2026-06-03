"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { SubRegionWithTours, TourItem } from "@/lib/frontend-data";

interface Props {
  parent: { name: string };
  regions: SubRegionWithTours[];
  initialSlug: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
}

export default function TourSection({ parent, regions, initialSlug }: Props) {
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTour, setModalTour] = useState<TourItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const lineRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

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

  // Escape key to close modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (formOpen) {
          setFormOpen(false);
        } else if (modalOpen) {
          closeModal();
        }
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
    setFormSubmitted(false);
  }

  function openForm() {
    setFormSubmitted(false);
    setErrors({});
    setSubmitError(null);
    if (nameRef.current) nameRef.current.value = "";
    if (phoneRef.current) phoneRef.current.value = "";
    if (emailRef.current) emailRef.current.value = "";
    if (lineRef.current) lineRef.current.value = "";
    if (messageRef.current) messageRef.current.value = "";
    setFormOpen(true);
    setTimeout(() => nameRef.current?.focus(), 60);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: FormErrors = {};
    const name = nameRef.current?.value.trim() ?? "";
    const phone = phoneRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const message = messageRef.current?.value.trim() ?? "";

    if (!name) newErrors.name = "請填寫聯絡人姓名";
    const digits = phone.replace(/\D/g, "");
    if (!phone || digits.length < 8) newErrors.phone = "請填寫正確的行動電話號碼";
    if (!message) newErrors.message = "請填寫諮詢內容";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "電子郵件格式有誤";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0] as keyof FormErrors;
      if (firstKey === "name") nameRef.current?.focus();
      else if (firstKey === "phone") phoneRef.current?.focus();
      else if (firstKey === "email") emailRef.current?.focus();
      else if (firstKey === "message") messageRef.current?.focus();
      return;
    }

    setSubmitError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: modalTour?.id ?? null,
          name: nameRef.current!.value.trim(),
          phone: phoneRef.current!.value.trim(),
          email: emailRef.current?.value.trim() || null,
          lineId: lineRef.current?.value.trim() || null,
          content: messageRef.current!.value.trim(),
        }),
      });
      if (res.status === 201) {
        setFormSubmitted(true);
      } else {
        setSubmitError("提交失敗，請稍後再試");
      }
    } catch {
      setSubmitError("提交失敗，請稍後再試");
    }
  }

  const galleryImgs: string[] = modalTour
    ? modalTour.images.length > 0
      ? modalTour.images
      : modalTour.thumbnail
        ? [modalTour.thumbnail]
        : []
    : [];

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
            <article
              key={i}
              className="fh-trow"
              onClick={() => openModal(tour)}
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
            </article>
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
          <div className="fh-modal-gallery">
            <div className="fh-gallery-scroll">
              {galleryImgs.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={modalTour?.name ?? ""} />
              ))}
            </div>
          </div>

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
              <h3 className="m-name">{modalTour?.name}</h3>
              {modalTour?.description && (
                <p className="m-lede">{modalTour.description}</p>
              )}
              <div className="m-tags">
                {modalTour?.tags.map((tag) => (
                  <span key={tag}>{tag === "hot" ? "熱門" : tag}</span>
                ))}
              </div>
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
                <button className="m-line">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.16.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.18.9.79.49 1-.41 5.36-3.16 7.31-5.41 1.34-1.48 1.71-2.99 1.71-4.25 0-4-4-7.2-9-7.2z" />
                  </svg>
                  加 LINE 諮詢
                </button>
                <button
                  className="m-form"
                  onClick={(e) => {
                    e.stopPropagation();
                    openForm();
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

      {/* Inquiry form modal */}
      <div
        className={`fh-form-overlay${formOpen ? " open" : ""}`}
        aria-hidden={!formOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setFormOpen(false);
        }}
      >
        <div className="fh-form-modal" role="dialog" aria-modal="true">
          <button className="fh-form-x" onClick={() => setFormOpen(false)} aria-label="關閉">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="fh-form-head">
            <div className="fh-form-eyebrow">線上諮詢</div>
            <h3 className="fh-form-title">填寫諮詢單</h3>
            <p className="fh-form-trip">
              關於 <b>{modalTour?.name ?? "—"}</b>
            </p>
          </div>

          {formSubmitted ? (
            <div className="fh-form-success show">
              <span className="tick">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h3>已收到您的諮詢單</h3>
              <p>
                謝謝您的填寫！我們的旅遊專員將於{" "}
                <b>一個工作天內</b> 透過電話或 LINE 與您聯繫，為您安排專屬行程。
              </p>
              <button
                type="button"
                className="done-btn"
                onClick={() => setFormOpen(false)}
              >
                完成
              </button>
            </div>
          ) : (
            <form
              className="fh-form-body"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className={`fh-f-field${errors.name ? " invalid" : ""}`}>
                <span className="fh-f-label">
                  聯絡人 <em>*</em>
                </span>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="您的姓名"
                  autoComplete="name"
                  onChange={() => setErrors((e) => ({ ...e, name: undefined }))}
                />
                <span className="fh-f-error">{errors.name}</span>
              </div>

              <div className={`fh-f-field${errors.phone ? " invalid" : ""}`}>
                <span className="fh-f-label">
                  行動電話 <em>*</em>
                </span>
                <input
                  ref={phoneRef}
                  type="tel"
                  placeholder="09xx-xxx-xxx"
                  autoComplete="tel"
                  onChange={() => setErrors((e) => ({ ...e, phone: undefined }))}
                />
                <span className="fh-f-error">{errors.phone}</span>
              </div>

              <div className={`fh-f-field${errors.email ? " invalid" : ""}`}>
                <span className="fh-f-label">
                  電子郵件 <span className="opt">（選填）</span>
                </span>
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  onChange={() => setErrors((e) => ({ ...e, email: undefined }))}
                />
                <span className="fh-f-error">{errors.email}</span>
              </div>

              <div className="fh-f-field">
                <span className="fh-f-label">
                  LINE ID <span className="opt">（選填）</span>
                </span>
                <input ref={lineRef} type="text" placeholder="您的 LINE ID" />
                <span className="fh-f-error" />
              </div>

              <div className={`fh-f-field${errors.message ? " invalid" : ""}`}>
                <span className="fh-f-label">
                  諮詢內容 <em>*</em>
                </span>
                <textarea
                  ref={messageRef}
                  placeholder="想詢問的出發日期、人數、預算或其他需求⋯"
                  onChange={() => setErrors((e) => ({ ...e, message: undefined }))}
                />
                <span className="fh-f-error">{errors.message}</span>
              </div>

              <div className="fh-form-foot">
                {submitError && (
                  <p className="text-sm text-rose-600">{submitError}</p>
                )}
                <button
                  type="button"
                  className="fh-form-cancel"
                  onClick={() => setFormOpen(false)}
                >
                  取消
                </button>
                <button type="submit" className="fh-form-submit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  送出諮詢
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
