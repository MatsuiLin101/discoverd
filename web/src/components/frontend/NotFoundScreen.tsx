import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import NotFoundRedirect from "./NotFoundRedirect";

// Shared body for the branded 404 page. Used both by the (frontend) route
// group's not-found boundary (already inside `.fh-root` via its layout) and by
// the root-level not-found, which supplies its own `.fh-root` wrapper.
export default function NotFoundScreen() {
  return (
    <>
      <SiteHeader />

      <main className="fh-error">
        <div className="fh-error-inner">
          <p className="fh-error-code">404</p>
          <h1 className="fh-error-title">找不到這個頁面</h1>
          <p className="fh-error-desc">
            您要找的頁面可能已被移除、更名,或暫時無法瀏覽。
          </p>
          <div className="fh-error-actions">
            <Link className="fh-error-btn primary" href="/">
              回到首頁
            </Link>
          </div>
          <NotFoundRedirect seconds={5} href="/" />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
