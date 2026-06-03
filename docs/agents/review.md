# Code Review — Frontend API Integration

**Agent:** code-reviewer  
**Date:** 2026-06-03  
**Scope:** "Connect Frontend Pages to Database" — all new/modified files as listed in implementation-notes.md  
**Based on:** spec.md v1.0 · architecture.md v1.0 · implementation-notes.md · qa-report.md + direct source inspection

---

## Overall Verdict

**APPROVED WITH COMMENTS**

The implementation is functionally complete, architecturally sound, and free of new TypeScript errors. All four QA issues have been correctly addressed in the working tree (verified by direct source inspection). One minor observation and two low-priority notes are recorded below, but none block merging.

---

## Security Findings

### SEC-01 — No SQL injection risk (PASS)

All three public GET routes and `POST /api/inquiries` construct Prisma queries exclusively through the Prisma Client API. No raw SQL (`$queryRaw`, `$executeRaw`) is used anywhere in new code. Prisma parameterises all inputs; `slug` is validated through `z.string().min(1)` before being passed to `findUnique({ where: { slug } })`.

### SEC-02 — Public routes correctly unauthenticated (PASS)

`GET /api/regions`, `GET /api/regions/[slug]`, `GET /api/regions/[slug]/tours`, and `POST /api/inquiries` contain no `getSession()` call, consistent with spec §User Roles. Admin routes (`POST /api/admin/tours`, `PUT /api/admin/tours/[id]`, `DELETE /api/admin/tours/[id]`) all call `getSession()` on the first line of each handler and return 403 immediately on failure.

### SEC-03 — `db` singleton not leaked to client components (PASS)

Direct inspection of all `src/components/` files confirms that no component imports from `@/lib/db` or `@/generated/prisma/client`. `TourSection.tsx` (the only new/modified client component) imports only `SubRegionWithTours` and `TourItem` types from `@/lib/frontend-data` — type-only imports that are erased at compile time and carry no server-side module graph.

`frontend-queries.ts` imports `db` but is used exclusively in async Server Components (`page.tsx` files); it is never imported by any `"use client"` file.

### SEC-04 — `dangerouslySetInnerHTML` scope is narrow and controlled (OBSERVATION)

`CategoryList.tsx` uses `dangerouslySetInnerHTML` for `title` and `stats` strings. Both call sites (homepage and region page) pass **string literals hardcoded in Server Components** — there is no DB-sourced or user-supplied value piped into these props. Risk is negligible, but developers should be aware that passing dynamic DB strings into these props in the future would create an XSS vector.

### SEC-05 — `POST /api/inquiries`: no rate limiting (ACKNOWLEDGED)

The spec explicitly documents this as a known gap (Assumption 10). There is no per-IP request throttling on the inquiry endpoint. At current scale this is acceptable; a future hardening pass should add middleware-level rate limiting (e.g. via `next-rate-limit` or Upstash Redis).

### SEC-06 — `Inquiry.tourId` has no FK enforcement (OBSERVATION)

The Prisma `Inquiry` model stores `tourId` as a plain `String?` with no foreign-key relation to `Tour`. A caller can submit any string as `tourId` and it will be persisted without validation. The QA report correctly notes this is intentional (qa-report.md §Coverage Gaps #2). It means orphaned inquiry records are possible if a tour is later deleted. Recommend adding a comment in the schema or a future task to decide whether referential integrity should be enforced.

---

## Performance Findings

### PERF-01 — All Prisma queries use `select`, never full `include` (PASS)

Every new query in `frontend-queries.ts` and the public API routes uses narrowly-scoped `select` clauses:
- `getRegionList` selects `slug`, `name`, `thumbnail`, and a nested `_count` — no Tour rows are loaded.
- `getRegionDetail` selects the same Region fields plus SubRegion metadata and `_count`.
- `getRegionTours` selects Tour fields precisely matching the `TourItem` interface; it does not load `thumbnailPublicId`, `createdAt`, or `updatedAt`.

Admin routes for tours use `include` rather than `select` (pre-existing pattern), which is acceptable for low-traffic admin screens.

### PERF-02 — No N+1 queries (PASS)

All data for a single request is fetched in **one** Prisma call per function. The `tourCount` aggregation in `getRegionList` and `getRegionDetail` uses `_count` nested select, not a per-row count loop. The tag and file arrays in `getRegionTours` are fetched as nested relations within the same query.

### PERF-03 — Code duplication between API routes and frontend-queries.ts (MINOR OBSERVATION)

The Prisma query logic in `GET /api/regions` is a verbatim copy of `getRegionList()`, and likewise for the other two GET routes. This is a deliberate design choice (architecture.md §4: "API routes are the source of truth for the response contract"). The duplication is small (three functions, ~30 lines each) and the pattern is consistent. However, if the query shape ever changes, it must be updated in two places. A future refactor could have the API routes call the `frontend-queries.ts` functions directly, reducing the surface.

This is flagged as an observation, not a required change.

### PERF-04 — No caching configured (ACKNOWLEDGED)

Per spec Assumption 2 and architecture.md §4, no explicit caching layer is configured. Next.js 16 Server Component de-duplication handles in-request deduplication. For a production launch with real traffic, ISR or `unstable_cache` on `getRegionList` (which changes only when an admin edits regions) would meaningfully reduce database load. This is out of scope for the current sprint but should be tracked.

---

## Quality & Convention Findings

### QC-01 — `z.union` used correctly throughout (PASS)

All Zod schemas in new files use `z.union([..., z.literal("").transform(...)])` instead of the deprecated `.or()` syntax, consistent with the architecture note and Zod v4.

### QC-02 — Error reporting uses `parsed.error.issues` (PASS)

New admin tour routes (`POST /api/admin/tours` and `PUT /api/admin/tours/[id]`) correctly use `parsed.error.issues[0].message`. The pre-existing admin region routes still use the invalid `.errors` property (7 pre-existing TypeScript errors); these are out of scope for this feature.

### QC-03 — Next.js 16 `params` always awaited (PASS)

All new route handlers and page components use `{ params }: { params: Promise<{ slug: string }> }` and `const { slug } = await params;`. No synchronous params access was introduced.

### QC-04 — `key` prop uses array index in tour list (MINOR)

In `TourSection.tsx` line 187, tour cards are keyed by array index (`key={i}`). Since the tour list is sorted by `createdAt ASC` and not reordered client-side, this is functionally safe. Using `tour.id` (which is already available in `TourItem`) as the key would be more idiomatic React and would protect against subtle reconciliation issues if reordering is ever introduced.

**Suggested fix:** `key={tour.id}` instead of `key={i}`.

### QC-05 — `// eslint-disable-next-line @next/next/no-img-element` in gallery (OBSERVATION)

The modal gallery uses a native `<img>` element to avoid Next.js Image optimisation for gallery thumbnails (line 247). This is acceptable since the image URLs are external Cloudinary CDN URLs already optimised at upload time. The ESLint suppression comment is appropriate. No action required.

### QC-06 — `description` state initialised with `?? ""` (PASS)

`TourForm.tsx` initialises `const [description, setDescription] = useState(tour?.description ?? "")`. Since `description` is `String?` in the schema, `null` is normalised to `""` for the controlled input, and the Zod `z.literal("").transform(() => null)` in the API route converts it back to `null` on save. The round-trip is correct.

### QC-07 — `REGIONS` static array is retained in `frontend-data.ts` (ACKNOWLEDGED)

The large static `REGIONS` array (400+ lines) remains in `frontend-data.ts`. The comment block clearly marks it as legacy data kept for `HERO_SLIDES` / `SEARCH_DATA` context — but `HERO_SLIDES` is defined separately, and `REGIONS` is not referenced by any live page. It is dead code. Removing it would reduce bundle size marginally and prevent future confusion, but this is a cleanup task, not a correctness issue. Consider a follow-up PR to extract or remove it.

---

## Architecture Conformance

### ARCH-01 — Page → frontend-queries.ts → db pattern (PASS)

All three frontend pages (`page.tsx`) call `frontend-queries.ts` functions for direct Prisma access, exactly as designed in architecture.md §4. No Server Component makes an HTTP self-call to `localhost`.

### ARCH-02 — New types appended to `frontend-data.ts` (PASS)

All six interfaces (`RegionListItem`, `RegionDetail`, `SubRegionListItem`, `RegionTours`, `SubRegionWithTours`, `TourItem`) are correctly appended to `frontend-data.ts` with the documented comment separator. The legacy interfaces are preserved above.

### ARCH-03 — `notFound()` pattern on missing slugs (PASS)

`getRegionDetail(slug)` and `getRegionTours(slug)` return `null` on miss; callers immediately invoke `notFound()`. The API routes independently return `{ "error": "Region not found" }` with status 404. Both layers handle the 404 case correctly.

### ARCH-04 — `subSlug` fallback logic in tour page (PASS)

`ToursPage` validates `subSlug` against the actual subRegion list and falls back to `subRegions[0]?.slug ?? ""`. If the fallback is `""` and `currentSub` resolves to `undefined`, `notFound()` is called. This handles the edge case of a region with no subRegions correctly (as noted in qa-report.md §Coverage Gaps #1).

### ARCH-05 — `initialSlug` reflects the validated slug, not the raw URL param (PASS)

`TourSection` receives `initialSlug={validSlug}` (the validated value), not the raw `subSlug`. This ensures the active tab is always set to an existing subRegion even when the URL contains a stale slug.

### ARCH-06 — Admin tour `GET` auto-includes `description` via `include` (PASS)

Per architecture.md §7.4, the edit page uses `db.tour.findUnique` with `include` (not `select`). After the Prisma migration, `description` is automatically included in the result. No explicit select change was needed, and none was made.

---

## QA Report Follow-up

All four issues identified by the QA agent have been verified as resolved in the working tree:

| Issue | Severity | Resolution | Verified |
|-------|----------|-----------|---------|
| ISSUE-01 — modal missing `description` | Major | `{modalTour?.description && <p className="m-lede">...}` added inside `<div className="m-top">` at line 270–272 of TourSection.tsx | Confirmed in source |
| ISSUE-02 — `CategoryList` empty img string | Minor | Conditional render: `{cat.img ? <Image ... /> : <div style={{ background: "var(--line)" }} />}` at line 48–58 | Confirmed in source |
| ISSUE-03 — `z.string().cuid()` for tourId | Minor | Changed to `z.string().optional().nullable()` (no cuid constraint) | Confirmed in source |
| ISSUE-04 — `openForm` not resetting `submitError` | Minor | `setSubmitError(null)` called at line 81 inside `openForm()` | Confirmed in source |

ISSUE-05 (Note — no fix needed) remains as documented.

---

## Praise

- **Query design is exemplary.** Every public Prisma query uses the minimum `select` scope required. The `_count` nested select for `tourCount` avoids loading thousands of Tour rows just to count them.
- **Zero new TypeScript errors.** 14 new/modified files compile cleanly against a strict TypeScript config. The engineer correctly used `parsed.error.issues` (Zod v4) rather than the deprecated `.errors`.
- **`params` handling is consistent.** All Next.js 16 route handlers and Server Components correctly `await params` before use.
- **Inquiry form wire-up is complete and robust.** `handleSubmit` is correctly marked `async`, the `catch` block handles network errors, `submitError` is cleared before each attempt, and the success state sets `formSubmitted` without clearing the form.
- **Gallery fallback logic is clean.** The three-case ternary (`images.length > 0` → use images; `thumbnail` present → use thumbnail; else empty array) correctly implements the spec with no branching bugs.
- **`server-only` boundary is respected without the package.** The absence of `import "server-only"` in `frontend-queries.ts` is mitigated by the fact that no `"use client"` file imports it. The boundary is safe in practice.

---

## Required Changes Before Merge

None. All QA issues are resolved. No blocking bugs or security vulnerabilities were found.

---

## Optional Improvements (Non-blocking)

| # | File | Suggestion |
|---|------|-----------|
| 1 | `TourSection.tsx` line 187 | Change `key={i}` → `key={tour.id}` on tour card `<article>` |
| 2 | `frontend-data.ts` | Remove dead `REGIONS` static array in a follow-up cleanup PR |
| 3 | `frontend-queries.ts` vs API routes | Future refactor: have API routes call the shared `frontend-queries` functions to eliminate query duplication |
| 4 | `POST /api/inquiries` | Add IP-based rate limiting in a future hardening sprint |
| 5 | `prisma/schema.prisma` | Add a formal FK relation from `Inquiry.tourId` to `Tour.id` (or document intentional denormalisation) |
| 6 | `getRegionList` | Consider `unstable_cache` with `revalidate` for the homepage region list (rarely changes) |
