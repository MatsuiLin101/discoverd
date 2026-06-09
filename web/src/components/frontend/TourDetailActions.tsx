"use client";

import { useState } from "react";
import TourInquiryModal from "./TourInquiryModal";
import { useSocialLinks } from "@/hooks/useSocialLinks";

interface Props {
  tourId: string;
  tourName: string;
}

export default function TourDetailActions({ tourId, tourName }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const { lineUrl } = useSocialLinks();

  return (
    <>
      <div className="m-actions">
        {lineUrl ? (
          <a className="m-line" href={lineUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.16.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.18.9.79.49 1-.41 5.36-3.16 7.31-5.41 1.34-1.48 1.71-2.99 1.71-4.25 0-4-4-7.2-9-7.2z" />
            </svg>
            加 LINE 諮詢
          </a>
        ) : (
          <button className="m-line" type="button" disabled>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.16.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.18.9.79.49 1-.41 5.36-3.16 7.31-5.41 1.34-1.48 1.71-2.99 1.71-4.25 0-4-4-7.2-9-7.2z" />
            </svg>
            加 LINE 諮詢
          </button>
        )}
        <button
          className="m-form"
          type="button"
          onClick={() => setFormOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4h6a2 2 0 0 1 2 2v0M9 4a2 2 0 0 0-2 2v0M9 4V3m6 1V3M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 13h6M9 17h4" />
          </svg>
          填寫諮詢單
        </button>
      </div>

      <TourInquiryModal
        tourId={tourId}
        tourName={tourName}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}
