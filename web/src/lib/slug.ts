/**
 * Slug helpers shared by the admin region/subRegion forms and the Excel
 * import/export pipeline.
 *
 * A slug is the URL segment used at /regions/[slug]/[subSlug]. Only lowercase
 * ASCII letters, digits and hyphens are allowed. `slugify` best-effort derives
 * one from a name; it returns "" for names with no ASCII characters (e.g. a
 * purely Chinese name), in which case the caller must fall back to a generated
 * value.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9-]+$/.test(s);
}
