/**
 * Renders one or more Schema.org objects as a JSON-LD script tag.
 *
 * Server-rendered so the structured data is present in the initial HTML for
 * crawlers. Pass a single object or an array (an array is emitted as a
 * `@graph`-free list of separate JSON-LD entries within one script tag).
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  // Escape "<" so admin-entered text containing "</script>" cannot break out of
  // the script element (JSON.stringify only escapes quotes, not angle brackets).
  const json = JSON.stringify(Array.isArray(data) ? data : [data]).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
