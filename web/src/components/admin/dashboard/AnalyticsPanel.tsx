import { getDashboardStats, isGaConfigured, type RankedItem, type TrendPoint } from "@/lib/ga";

const fmt = (n: number) => n.toLocaleString("zh-TW");

const METHOD_LABELS: Record<string, string> = {
  line: "LINE",
  line_community: "LINE 社群",
  facebook: "Facebook",
  instagram: "Instagram",
};
const VISITOR_LABELS: Record<string, string> = { new: "新訪客", returning: "回訪" };

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-800">{fmt(value)}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function RankedList({
  title,
  items,
  emptyText,
  labelMap,
}: {
  title: string;
  items: RankedItem[];
  emptyText: string;
  labelMap?: Record<string, string>;
}) {
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
                  {labelMap?.[item.label] ?? item.label}
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

function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return <p className="mt-2 text-xs text-gray-400">資料不足</p>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = 100 / (points.length - 1);
  const line = points.map((p, i) => `${(i * step).toFixed(2)},${(30 - (p.value / max) * 28).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-12 mt-2 text-indigo-400" aria-hidden>
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TrendCard({ title, points }: { title: string; points: TrendPoint[] }) {
  const total = points.reduce((s, p) => s + p.value, 0);
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-400">近 30 天合計 {fmt(total)}</p>
      </div>
      <Sparkline points={points} />
    </div>
  );
}

function Notice({ tone, children }: { tone: "muted" | "error"; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "text-rose-500 border-rose-200 bg-rose-50"
      : "text-gray-400 border-gray-200 border-dashed bg-gray-50";
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-500">網站分析</h2>
      <div className={`p-4 text-xs border rounded-xl ${cls}`}>{children}</div>
    </section>
  );
}

export default async function AnalyticsPanel() {
  if (!isGaConfigured()) {
    return (
      <Notice tone="muted">
        GA 報表尚未設定。請於環境變數填入 <code>GA4_PROPERTY_ID</code>、<code>GA_SA_CLIENT_EMAIL</code>、
        <code>GA_SA_PRIVATE_KEY</code>（服務帳戶需為 GA4 資源的檢視者）。
      </Notice>
    );
  }

  let stats;
  try {
    stats = await getDashboardStats();
  } catch {
    return <Notice tone="error">無法載入 GA 報表，請稍後再試或確認服務帳戶權限與資源 ID。</Notice>;
  }
  if (!stats) return null;

  const conversion = stats.inquiryOpens > 0 ? Math.round((stats.inquiries / stats.inquiryOpens) * 100) : null;

  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-sm font-semibold text-gray-500">網站分析（近 30 天）</h2>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="使用者" value={stats.last30.activeUsers} sub={`近 7 天 ${fmt(stats.last7.activeUsers)}`} />
        <StatCard label="工作階段" value={stats.last30.sessions} sub={`近 7 天 ${fmt(stats.last7.sessions)}`} />
        <StatCard label="頁面瀏覽" value={stats.last30.pageViews} sub={`近 7 天 ${fmt(stats.last7.pageViews)}`} />
        <StatCard
          label="諮詢送出"
          value={stats.inquiries}
          sub={`開啟 ${fmt(stats.inquiryOpens)}${conversion !== null ? `・轉換 ${conversion}%` : ""}`}
        />
        <StatCard label="LINE／社群點擊" value={stats.contactClicks} sub="contact_click" />
      </div>

      {/* Daily trends */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TrendCard title="每日使用者" points={stats.dailyUsers} />
        <TrendCard title="每日諮詢送出" points={stats.dailyInquiries} />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RankedList title="熱門行程 Top 10（瀏覽）" items={stats.topTours} emptyText="近 30 天尚無行程瀏覽資料。" />
        <RankedList title="熱門搜尋詞 Top 10" items={stats.topSearches} emptyText="近 30 天尚無搜尋資料。" />
        <RankedList title="流量來源（管道）" items={stats.channels} emptyText="近 30 天尚無來源資料。" />
        <RankedList title="熱門地區（瀏覽）" items={stats.topRegions} emptyText="近 30 天尚無地區瀏覽資料。" />
        <RankedList title="LINE／社群點擊細分" items={stats.contactByMethod} emptyText="近 30 天尚無點擊資料。" labelMap={METHOD_LABELS} />
        <RankedList title="裝置" items={stats.devices} emptyText="近 30 天尚無裝置資料。" />
        <RankedList title="城市 Top" items={stats.cities} emptyText="近 30 天尚無城市資料。" />
        <RankedList title="新訪客 vs 回訪" items={stats.newVsReturning} emptyText="近 30 天尚無資料。" labelMap={VISITOR_LABELS} />
      </div>
    </section>
  );
}

export function AnalyticsPanelSkeleton() {
  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-sm font-semibold text-gray-500">網站分析（近 30 天）</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="w-16 h-3 bg-gray-100 rounded" />
            <div className="w-12 h-6 mt-2 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
