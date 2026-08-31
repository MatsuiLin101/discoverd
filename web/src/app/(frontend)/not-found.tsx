import Link from "next/link";
import SiteHeader from "@/components/frontend/SiteHeader";
import SiteFooter from "@/components/frontend/SiteFooter";

// Rendered whenever a frontend route calls `notFound()` (unknown region,
// sub-category, tour or preview slug). Wrapped by (frontend)/layout.tsx, so it
// inherits the `.fh-root` token layer, fonts and gradient background.
export default function FrontendNotFound() {
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
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
