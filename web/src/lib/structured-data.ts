/**
 * Schema.org (JSON-LD) builders for the public frontend.
 *
 * Each function returns a plain object that is serialized into a
 * <script type="application/ld+json"> tag by the <JsonLd> component. Keeping the
 * shapes here (rather than inline in pages) makes them easy to reuse and keep
 * consistent across routes.
 *
 * The canonical brand strings and base URL live here so every schema agrees
 * with the metadata declared in the (frontend) layout.
 */

export const SITE_NAME = "找到了旅遊 FOUND HOLIDAY";
export const LEGAL_NAME = "找到了旅行社股份有限公司";

/** Site base URL, matching metadataBase in the (frontend) layout. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Resolve a site-relative path (or pass through an already-absolute URL). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, siteUrl()).toString();
}

interface OrganizationInput {
  /** Social profile URLs used for `sameAs`; falsy entries are dropped. */
  social?: (string | null | undefined)[];
  /** Brand name override (defaults to SITE_NAME). */
  name?: string;
}

/**
 * TravelAgency (a subtype of Organization + LocalBusiness). Emitted once,
 * site-wide, from the frontend layout.
 */
export function organizationSchema({ social, name }: OrganizationInput = {}) {
  const sameAs = (social ?? []).filter((u): u is string => Boolean(u));
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${siteUrl()}/#organization`,
    name: name || SITE_NAME,
    legalName: LEGAL_NAME,
    url: siteUrl(),
    logo: absoluteUrl("/images/tour-placeholder.svg"),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * WebSite node with a SearchAction so Google can offer a sitelinks search box
 * pointing at the on-site search page.
 */
export function websiteSchema(name?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    name: name || SITE_NAME,
    url: siteUrl(),
    inLanguage: "zh-TW",
    publisher: { "@id": `${siteUrl()}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path or absolute URL. */
  path: string;
}

/** BreadcrumbList reflecting the on-page breadcrumb trail. */
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

interface TourSchemaInput {
  name: string;
  description: string | null;
  /** Canonical site-relative path, e.g. /tours/ABC123. */
  path: string;
  /** Absolute image URLs (thumbnail / gallery). Empty is allowed. */
  images: string[];
  /** Price in TWD; <= 0 means custom quote (no fixed price). */
  price: number;
  regionName: string;
}

/**
 * A tour as a schema.org Product with an Offer. Product is used (rather than
 * TouristTrip) because it earns richer search treatment for a bookable item;
 * for a custom-quote tour the Offer is omitted since there is no fixed price.
 */
export function tourSchema({ name, description, path, images, price, regionName }: TourSchemaInput) {
  const hasFixedPrice = price > 0;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(description ? { description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    category: regionName,
    brand: { "@type": "Brand", name: SITE_NAME },
    url: absoluteUrl(path),
    ...(hasFixedPrice
      ? {
          offers: {
            "@type": "Offer",
            price,
            priceCurrency: "TWD",
            availability: "https://schema.org/InStock",
            url: absoluteUrl(path),
          },
        }
      : {}),
  };
}
