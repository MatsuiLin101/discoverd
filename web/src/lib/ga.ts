import "server-only";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

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
const RANGE_30D = [{ startDate: "30daysAgo", endDate: "today" }];

export interface OverviewStats {
  activeUsers: number;
  sessions: number;
  pageViews: number;
}
export interface RankedItem {
  label: string;
  count: number;
}
export interface DashboardStats {
  last7: OverviewStats;
  last30: OverviewStats;
  inquiries: number; // inquiry_submit, last 30 days
  contactClicks: number; // contact_click, last 30 days
  topTours: RankedItem[]; // view_item by tour_name, last 30 days
  topSearches: RankedItem[]; // search by search_term, last 30 days
}

const num = (v: string | null | undefined) => Number(v ?? 0) || 0;

async function overview(startDate: string): Promise<OverviewStats> {
  const [res] = await getClient().runReport({
    property: PROPERTY(),
    dateRanges: [{ startDate, endDate: "today" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
  });
  const m = res.rows?.[0]?.metricValues;
  return { activeUsers: num(m?.[0]?.value), sessions: num(m?.[1]?.value), pageViews: num(m?.[2]?.value) };
}

async function eventCounts(eventNames: string[]): Promise<Record<string, number>> {
  const [res] = await getClient().runReport({
    property: PROPERTY(),
    dateRanges: RANGE_30D,
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: { fieldName: "eventName", inListFilter: { values: eventNames } },
    },
  });
  const out: Record<string, number> = {};
  for (const row of res.rows ?? []) {
    const name = row.dimensionValues?.[0]?.value ?? "";
    out[name] = num(row.metricValues?.[0]?.value);
  }
  return out;
}

// Top values of an event-scoped custom dimension for a given event.
async function topByParam(eventName: string, param: string, limit = 10): Promise<RankedItem[]> {
  const [res] = await getClient().runReport({
    property: PROPERTY(),
    dateRanges: RANGE_30D,
    dimensions: [{ name: `customEvent:${param}` }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: { fieldName: "eventName", stringFilter: { value: eventName } },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit,
  });
  return (res.rows ?? [])
    .map((row) => ({
      label: row.dimensionValues?.[0]?.value ?? "",
      count: num(row.metricValues?.[0]?.value),
    }))
    // Drop GA's "(not set)" / empty rows so the list stays meaningful.
    .filter((r) => r.label && r.label !== "(not set)");
}

// Simple in-memory TTL cache so repeated dashboard loads don't hit the API (and
// its quota) on every request. Per server instance, which is plenty here.
const TTL_MS = 15 * 60 * 1000;
let cache: { at: number; data: DashboardStats } | null = null;

export async function getDashboardStats(): Promise<DashboardStats | null> {
  if (!isGaConfigured()) return null;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const [last7, last30, events, topTours, topSearches] = await Promise.all([
    overview("7daysAgo"),
    overview("30daysAgo"),
    eventCounts(["inquiry_submit", "contact_click"]),
    topByParam("view_item", "tour_name"),
    topByParam("search", "search_term"),
  ]);

  const data: DashboardStats = {
    last7,
    last30,
    inquiries: events["inquiry_submit"] ?? 0,
    contactClicks: events["contact_click"] ?? 0,
    topTours,
    topSearches,
  };
  cache = { at: Date.now(), data };
  return data;
}
