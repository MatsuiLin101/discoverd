import "server-only";
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";

type IRunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;
type IReport = protos.google.analytics.data.v1beta.IRunReportResponse;

// GA4 Data API access for the admin dashboard. Reads a service account and the
// numeric property ID from env; when any is missing the panel is simply hidden.
// See .env.local.example for how to obtain these.
const propertyId = process.env.GA4_PROPERTY_ID?.trim();
const clientEmail = process.env.GA_SA_CLIENT_EMAIL?.trim();
// The private key is stored on one line with literal "\n"; restore real newlines.
const privateKey = process.env.GA_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function isGaConfigured(): boolean {
  return Boolean(propertyId && clientEmail && privateKey);
}

let client: BetaAnalyticsDataClient | null = null;
function getClient(): BetaAnalyticsDataClient {
  if (!client) {
    client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey },
    });
  }
  return client;
}

const PROPERTY = () => `properties/${propertyId}`;

export interface OverviewStats {
  activeUsers: number;
  sessions: number;
  pageViews: number;
}
export interface RankedItem {
  label: string;
  count: number;
}
export interface TrendPoint {
  date: string;
  value: number;
}
export interface DashboardStats {
  last7: OverviewStats;
  last30: OverviewStats;
  inquiries: number; // inquiry_submit, last 30 days
  inquiries7: number; // inquiry_submit, last 7 days
  contactClicks: number; // contact_click, last 30 days
  contactClicks7: number; // contact_click, last 7 days
  topTours: RankedItem[]; // view_item by tour_name
  topSearches: RankedItem[]; // search by search_term
  channels: RankedItem[]; // sessions by default channel group
  contactByMethod: RankedItem[]; // contact_click by method
  topRegions: RankedItem[]; // view_item by region
  dailyUsers: TrendPoint[]; // activeUsers per day
  dailyInquiries: TrendPoint[]; // inquiry_submit per day
  devices: RankedItem[]; // activeUsers by device category
  cities: RankedItem[]; // activeUsers by city
  newVsReturning: RankedItem[]; // activeUsers by new/returning
}

const num = (v: string | null | undefined) => Number(v ?? 0) || 0;
const R30 = [{ startDate: "30daysAgo", endDate: "today" }];
const R7 = [{ startDate: "7daysAgo", endDate: "today" }];
const OVERVIEW_METRICS = [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }];
const forEvent = (name: string) => ({
  filter: { fieldName: "eventName", stringFilter: { value: name } },
});
// Report that ranks an event-scoped custom dimension for one event.
const paramReport = (eventName: string, param: string, limit = 10): IRunReportRequest => ({
  dateRanges: R30,
  dimensions: [{ name: `customEvent:${param}` }],
  metrics: [{ name: "eventCount" }],
  dimensionFilter: forEvent(eventName),
  orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  limit,
});

// Run many reports with at most 5 per batchRunReports call (its cap), keeping
// order so callers can read results by index.
async function runReports(requests: IRunReportRequest[]): Promise<IReport[]> {
  const c = getClient();
  const out: IReport[] = [];
  for (let i = 0; i < requests.length; i += 5) {
    const [res] = await c.batchRunReports({ property: PROPERTY(), requests: requests.slice(i, i + 5) });
    out.push(...((res.reports ?? []) as IReport[]));
  }
  return out;
}

const overviewOf = (r: IReport): OverviewStats => {
  const m = r.rows?.[0]?.metricValues;
  return { activeUsers: num(m?.[0]?.value), sessions: num(m?.[1]?.value), pageViews: num(m?.[2]?.value) };
};
const rankedOf = (r: IReport): RankedItem[] =>
  (r.rows ?? [])
    .map((row) => ({ label: row.dimensionValues?.[0]?.value ?? "", count: num(row.metricValues?.[0]?.value) }))
    .filter((x) => x.label && x.label !== "(not set)");
const trendOf = (r: IReport): TrendPoint[] =>
  (r.rows ?? []).map((row) => ({ date: row.dimensionValues?.[0]?.value ?? "", value: num(row.metricValues?.[0]?.value) }));
const eventMapOf = (r: IReport): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const row of r.rows ?? []) out[row.dimensionValues?.[0]?.value ?? ""] = num(row.metricValues?.[0]?.value);
  return out;
};

// Simple in-memory TTL cache so repeated dashboard loads don't hit the API (and
// its quota) on every request. Per server instance, which is plenty here.
const TTL_MS = 15 * 60 * 1000;
let cache: { at: number; data: DashboardStats } | null = null;

export async function getDashboardStats(): Promise<DashboardStats | null> {
  if (!isGaConfigured()) return null;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const requests: IRunReportRequest[] = [
    /* 0 */ { dateRanges: R7, metrics: OVERVIEW_METRICS },
    /* 1 */ { dateRanges: R30, metrics: OVERVIEW_METRICS },
    /* 2 */ {
      dateRanges: R30,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: ["inquiry_submit", "contact_click"] } } },
    },
    /* 3 */ paramReport("view_item", "tour_name"),
    /* 4 */ paramReport("search", "search_term"),
    /* 5 */ {
      dateRanges: R30,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 6,
    },
    /* 6 */ paramReport("contact_click", "method"),
    /* 7 */ paramReport("view_item", "region"),
    /* 8 */ { dateRanges: R30, dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
    /* 9 */ {
      dateRanges: R30,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: forEvent("inquiry_submit"),
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
    /* 10 */ { dateRanges: R30, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }] },
    /* 11 */ { dateRanges: R30, dimensions: [{ name: "city" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 6 },
    /* 12 */ { dateRanges: R30, dimensions: [{ name: "newVsReturning" }], metrics: [{ name: "activeUsers" }] },
    /* 13 */ {
      dateRanges: R7,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: ["inquiry_submit", "contact_click"] } } },
    },
  ];

  const r = await runReports(requests);
  const events = eventMapOf(r[2]);
  const events7 = eventMapOf(r[13]);

  const data: DashboardStats = {
    last7: overviewOf(r[0]),
    last30: overviewOf(r[1]),
    inquiries: events["inquiry_submit"] ?? 0,
    inquiries7: events7["inquiry_submit"] ?? 0,
    contactClicks: events["contact_click"] ?? 0,
    contactClicks7: events7["contact_click"] ?? 0,
    topTours: rankedOf(r[3]),
    topSearches: rankedOf(r[4]),
    channels: rankedOf(r[5]),
    contactByMethod: rankedOf(r[6]),
    topRegions: rankedOf(r[7]),
    dailyUsers: trendOf(r[8]),
    dailyInquiries: trendOf(r[9]),
    devices: rankedOf(r[10]),
    cities: rankedOf(r[11]),
    newVsReturning: rankedOf(r[12]),
  };
  cache = { at: Date.now(), data };
  return data;
}
