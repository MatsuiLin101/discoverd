import Link from "next/link";

export default function SiteFooter() {
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
            <p>
              找到了旅遊股份有限公司
              <br />
              10688 台北市大安區忠孝東路四段 137 號 2 樓
              <br />
              營業時間 ／ 週一至週六 10:00–20:00
            </p>
            <div className="lic">交觀甲 9876 ・ 品保中 0123</div>
          </div>

          <div className="fh-footer-col">
            <h5>瀏覽</h5>
            <ul>
              <li>
                <Link href="/regions/japan">日本行程</Link>
              </li>
              <li>
                <Link href="/regions/europe">歐洲行程</Link>
              </li>
              <li>
                <Link href="/">編輯精選</Link>
              </li>
              <li>
                <Link href="/">關於我們</Link>
              </li>
            </ul>
          </div>

          <div className="fh-footer-col">
            <h5>聯絡</h5>
            <ul>
              <li>
                <a href="tel:0277290001">02 7729 0001</a>
              </li>
              <li>
                <a href="mailto:hello@foundholiday.tw">hello@foundholiday.tw</a>
              </li>
              <li>線上諮詢</li>
              <li>門市資訊</li>
            </ul>
          </div>

          <div className="fh-footer-col">
            <h5>追蹤我們</h5>
            <div className="fh-footer-social">
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 21v-7.4h2.5l.37-2.88H13.5V8.88c0-.83.23-1.4 1.43-1.4h1.53V4.9a20.5 20.5 0 0 0-2.23-.11c-2.2 0-3.71 1.34-3.71 3.81v2.12H8v2.88h2.52V21z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="4" width="16" height="16" rx="5" />
                  <circle cx="12" cy="12" r="3.6" />
                  <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="#" aria-label="LINE">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.16.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.18.9.79.49 1-.41 5.36-3.16 7.31-5.41 1.34-1.48 1.71-2.99 1.71-4.25 0-4-4-7.2-9-7.2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="fh-footer-bottom">
        <span>© 2026 找到了旅遊股份有限公司 ／ 版權所有</span>
        <span>隱私權 ・ 服務條款 ・ 使用須知</span>
      </div>
    </footer>
  );
}
