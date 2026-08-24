/**
 * A tour price of 0 means "no fixed price" — the UI shows a custom-quote label
 * instead of a number. Centralised so every price display stays consistent.
 */
export const CUSTOM_QUOTE_LABEL = "客製化報價";

export function isCustomQuote(price: number): boolean {
  return price <= 0;
}
