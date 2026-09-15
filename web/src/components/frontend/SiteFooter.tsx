import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import FooterContactActions from "./FooterContactActions";
import LineIcon from "./LineIcon";
import LineCommunityIcon from "./LineCommunityIcon";

export default async function SiteFooter() {
  // This footer reads site settings from the DB. Some routes that render it are
  // not otherwise dynamic (notably the not-found boundaries → /_not-found), so
  // without this they'd be prerendered at build where the DB is unreachable,
  // failing the production image build. `connection()` defers rendering to
  // request time, exactly like `export const dynamic = "force-dynamic"` does for
  // the homepage — but it works from inside this shared component, including the
  // special not-found file where route segment config isn't honored.
  await connection();
  const setting = await db.siteSetting.findUnique({ where: { id: "singleton" } });

  return (
    <footer className="fh-footer">
      <div className="fh-footer-inner">
        <div className="fh-footer-grid">
          <div className="fh-footer-brand">
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
            <p className="company-name">找到了旅行社股份有限公司</p>
            <p className="company-meta">
              綜合旅行社 │ 交觀綜字222700號
              <br />
              旅行業品質保障協會北2738號
              <br />
              統一編號 00161819 │ 負責人 艾施鴻
              <br />
              網站負責人 周柏廷
            </p>
            <p className="company-addr">台北市內湖區內湖路一段120巷15弄25號3、7樓</p>
          </div>

          <FooterContactActions />

          {(setting?.facebookUrl || setting?.instagramUrl || setting?.lineUrl || setting?.lineCommunityUrl) && (
            <div className="fh-footer-col">
              <h5>追蹤我們</h5>
              <div className="fh-footer-social">
                {setting.facebookUrl && (
                  <a href={setting.facebookUrl} aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.5 21v-7.4h2.5l.37-2.88H13.5V8.88c0-.83.23-1.4 1.43-1.4h1.53V4.9a20.5 20.5 0 0 0-2.23-.11c-2.2 0-3.71 1.34-3.71 3.81v2.12H8v2.88h2.52V21z" />
                    </svg>
                  </a>
                )}
                {setting.instagramUrl && (
                  <a href={setting.instagramUrl} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="4" width="16" height="16" rx="5" />
                      <circle cx="12" cy="12" r="3.6" />
                      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                )}
                {setting.lineUrl && (
                  <a href={setting.lineUrl} aria-label="LINE" target="_blank" rel="noopener noreferrer">
                    <LineIcon />
                  </a>
                )}
                {setting.lineCommunityUrl && (
                  <a href={setting.lineCommunityUrl} aria-label="LINE 社群" target="_blank" rel="noopener noreferrer">
                    <LineCommunityIcon />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fh-footer-bottom">
        <span>© 2026 找到了旅行社股份有限公司 ／ 版權所有</span>
      </div>
    </footer>
  );
}
