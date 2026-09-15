// Shared tag ordering: pure text collation (Traditional Chinese) rather than
// the admin-defined sortOrder, so chip lists are easy to scan. `numeric` makes
// embedded numbers sort by value, so e.g. "4天" comes before "12天".
export function compareTagName(a: string, b: string): number {
  return a.localeCompare(b, "zh-Hant", { numeric: true });
}
