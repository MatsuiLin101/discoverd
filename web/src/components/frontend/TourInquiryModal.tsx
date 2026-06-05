"use client";

import { useState, useRef, useEffect } from "react";

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
}

interface Props {
  tourId: string | null;
  tourName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TourInquiryModal({ tourId, tourName, isOpen, onClose }: Props) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const lineRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormSubmitted(false);
    setErrors({});
    setSubmitError(null);
    if (nameRef.current) nameRef.current.value = "";
    if (phoneRef.current) phoneRef.current.value = "";
    if (emailRef.current) emailRef.current.value = "";
    if (lineRef.current) lineRef.current.value = "";
    if (messageRef.current) messageRef.current.value = "";
    setTimeout(() => nameRef.current?.focus(), 60);
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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
          tourId: tourId ?? null,
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

  return (
    <div
      className={`fh-form-overlay${isOpen ? " open" : ""}`}
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fh-form-modal" role="dialog" aria-modal="true">
        <button className="fh-form-x" onClick={onClose} aria-label="關閉">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="fh-form-head">
          <div className="fh-form-eyebrow">線上諮詢</div>
          <h3 className="fh-form-title">填寫諮詢單</h3>
          <p className="fh-form-trip">
            關於 <b>{tourName || "—"}</b>
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
            <button type="button" className="done-btn" onClick={onClose}>
              完成
            </button>
          </div>
        ) : (
          <form className="fh-form-body" noValidate onSubmit={handleSubmit}>
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
              <button type="button" className="fh-form-cancel" onClick={onClose}>
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
  );
}
