"use client";

import { useState } from "react";
import TourInquiryModal from "./TourInquiryModal";
import FooterStaffModal from "./FooterStaffModal";

export default function FooterContactActions() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  return (
    <div className="fh-footer-col">
      <h5>聯絡</h5>
      <ul>
        <li>
          <button type="button" className="fh-footer-link" onClick={() => setInquiryOpen(true)}>
            線上諮詢
          </button>
        </li>
        <li>
          <button type="button" className="fh-footer-link" onClick={() => setStaffOpen(true)}>
            聯絡資訊
          </button>
        </li>
      </ul>

      <TourInquiryModal
        tourId={null}
        tourName=""
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
      />
      <FooterStaffModal isOpen={staffOpen} onClose={() => setStaffOpen(false)} />
    </div>
  );
}
