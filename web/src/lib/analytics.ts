// Lightweight client-side helper for pushing custom events into the Google Tag
// Manager dataLayer. GTM is loaded only on the (frontend) routes and forwards
// these events to GA4 via tags configured inside the GTM container — no GA code
// lives in this app, so tracking can be tuned from the GTM console.
//
// Event reference (configure matching triggers/tags in GTM):
//   inquiry_open   { tour_id, tour_name }              — inquiry modal opened
//   inquiry_submit { tour_id, tour_name }              — inquiry submitted OK
//   search         { search_term, method, result_count } — site search performed
//   share          { method, content_type, item_id }   — tour link shared
//   contact_click  { method, link_url }                — outbound contact click

type TrackParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Push a custom event to the GTM dataLayer. No-ops on the server and never
 * throws, so analytics can never break the UI. */
export function trackEvent(event: string, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  } catch {
    // Swallow — a failed analytics push must not affect the user.
  }
}
