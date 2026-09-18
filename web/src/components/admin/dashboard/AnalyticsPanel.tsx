import { getDashboardStats, isGaConfigured, type RankedItem } from "@/lib/ga";

const fmt = (n: number) => n.toLocaleString("zh-TW");

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-800">{fmt(value)}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function RankedList({ title, items, emptyText }: { title: string; items: RankedItem[]; emptyText: string }) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0) || 1;
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <p className="mb-3 text-sm font-medium text-gray-700">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-gray-700">
                  <span className="mr-1.5 text-xs text-gray-400">{i + 1}.</span>
                  {item.label}
                </span>
                <span className="shrink-0 font-medium text-gray-800">{fmt(item.count)}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-gray-100">
                <div className="h-1 rounded-full bg-indigo-400" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function AnalyticsPanel() {
  // Not configured: show a quiet setup hint instead of the panel.
  if (!isGaConfigured()) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">網站分析</h2>
        <div className="p-4 text-xs text-gray-400 border border-gray-200 border-dashed rounded-xl bg-gray-50">
          GA 報表尚未設定。請於環境變數填入 <code>GA4_PROPERTY_ID</code>、
          <code>GA_SA_CLIENT_EMAIL</code>、<code>GA_SA_PRIVATE_KEY</code>（服務帳戶需為 GA4 資源的檢視者）。
        </div>
      </section>
    );
  }

  let stats;
  try {
    stats = await getDashboardStats();
  } catch {
    return (
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">網站分析</h2>
        <div className="p-4 text-xs text-rose-500 border border-rose-200 rounded-xl bg-rose-50">
          無法載入 GA 報表，請稍後再試或確認服務帳戶權限與資源 ID。
        </div>
      </section>
    );
  }
  if (!stats) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-500">網站分析（近 30 天）</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="使用者" value={stats.last30.activeUsers} sub={`近 7 天 ${fmt(stats.last7.activeUsers)}`} />
        <StatCard label="工作階段" value={stats.last30.sessions} sub={`近 7 天 ${fmt(stats.last7.sessions)}`} />
        <StatCard label="頁面瀏覽" value={stats.last30.pageViews} sub={`近 7 天 ${fmt(stats.last7.pageViews)}`} />
        <StatCard label="諮詢送出" value={stats.inquiries} sub="inquiry_submit" />
        <StatCard label="LINE／社群點擊" value={stats.contactClicks} sub="contact_click" />
      </div>

      <div className="grid grid-cols-1 gap-3 mt-3 lg:grid-cols-2">
        <RankedList title="熱門行程 Top 10（瀏覽）" items={stats.topTours} emptyText="近 30 天尚無行程瀏覽資料。" />
        <RankedList title="熱門搜尋詞 Top 10" items={stats.topSearches} emptyText="近 30 天尚無搜尋資料。" />
      </div>
    </section>
  );
}

export function AnalyticsPanelSkeleton() {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-500">網站分析（近 30 天）</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="w-16 h-3 bg-gray-100 rounded" />
            <div className="w-12 h-6 mt-2 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 mt-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 bg-white border border-gray-200 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
