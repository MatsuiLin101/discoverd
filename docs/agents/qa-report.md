# QA Report — Frontend API Integration
**Agent:** qa-engineer  
**Date:** 2026-06-03  
**Scope:** Feature "Connect Frontend Pages to Database" (spec.md v1.0)  
**Overall Result:** **PARTIAL PASS** — implementation is functionally correct with one confirmed defect and one risk worth noting.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Prisma schema | Pass | `description String?` added correctly |
| New DB types | Pass | All 6 interfaces complete and consistent |
| `getRegionList` query | Pass | Matches architecture exactly |
| `getRegionDetail` query | Pass | Matches architecture exactly |
| `getRegionTours` query | Pass | Matches architecture exactly |
| `GET /api/regions` | Pass | Correct shape, 500 handler present |
| `GET /api/regions/[slug]` | Pass | 404 + 500 handlers, params awaited |
| `GET /api/regions/[slug]/tours` | Pass | 404 + 500 handlers, params awaited |
| `POST /api/inquiries` | Pass | Zod schema matches spec, 201/400/500 |
| Homepage (`/`) | Pass | `REGIONS` removed, `getRegionList` used |
| Region page | Pass | `REGIONS` removed, `getRegionDetail` used |
| Tour page | Pass | `REGIONS` removed, `getRegionTours` used |
| CategoryList component | Pass | `en` removed, `zh` → `name`, `count: string \| number` |
| TourSection component | Partial | Gallery + form + price correct; **description not in modal** |
| Admin `TourForm.tsx` | Pass | `description` state, textarea, FormData append all present |
| `POST /api/admin/tours` | Pass | `description` in schema + Prisma create |
| `PUT /api/admin/tours/[id]` | Pass | `description` in schema + Prisma update |
| Auth protection | Pass | Public routes have no `getSession`; admin routes guard all methods |
| TypeScript errors (new files) | Pass | **Zero errors** in any new or modified file |

---

## Critical Issues

None found — no blocker that would cause a runtime crash in the core happy path.

---

## Major Issues

### ISSUE-01 — `description` is not rendered in the tour detail modal

**Severity:** Major (spec requirement not met)  
**File:** `web/src/components/frontend/TourSection.tsx`  
**Line:** 264–284 (the `m-top` / `m-bottom` aside block)

**Symptom:** The tour card correctly renders `tour.description` (line 211), but the modal's side panel (`fh-modal-side`) never displays `modalTour.description`. The spec (§ UI Screens — TourSection) states: *"In the tour card and/or modal, render `tour.description` where `lede` was previously rendered."*

The modal currently shows: eyebrow, name, tags, price, and action buttons — no description paragraph.

**Expected fix (not applied here):** Inside `<div className="m-top">`, add after the tags block:
```tsx
{modalTour?.description && (
  <p className="m-lede">{modalTour.description}</p>
)}
```

---

## Minor Issues

### ISSUE-02 — `CategoryList` passes `cat.img` directly to `<Image src>` without null guard

**Severity:** Minor (would only trigger if `thumbnail` is `null` for a Region/SubRegion)  
**File:** `web/src/components/frontend/CategoryList.tsx`, line 49  

The homepage and region pages map `r.thumbnail ?? ""` before building `CategoryItem`, so `img` is an empty string (`""`) when the thumbnail is `null`. Passing an empty string to `next/image`'s `src` will not crash at runtime (Next.js will log a warning), but it produces a broken image element. The spec (Assumption 5) acknowledges thumbnails may be null and states a "placeholder background colour or hidden `<Image>`" should be used. The component currently does neither.

**Expected fix:** Change `cat.img` → `cat.img || "/images/tour-placeholder.svg"` in `CategoryList.tsx`, or apply the fallback in the page's mapping step.

### ISSUE-03 — `InquirySchema.tourId` accepts `.cuid()` only — misses other CUID2 or custom ID formats

**Severity:** Minor / Future risk  
**File:** `web/src/app/api/inquiries/route.ts`, line 6  

`z.string().cuid()` validates against CUID v1 format. Prisma's `@default(cuid())` in the current schema generates CUID v1, so this is currently correct. If the project migrates to CUID2 (`@default(cuid2())`), the validator will reject all real tour IDs. Low risk at present but worth tracking.

### ISSUE-04 — `handleSubmit` error branch does not clear `submitError` when the form is re-opened

**Severity:** Minor (UX regression)  
**File:** `web/src/components/frontend/TourSection.tsx`, line 79–88 (`openForm`)

`openForm()` resets field values and clears `errors`, but does not reset `submitError`. If a user:  
1. Submits the form → receives a network error ("提交失敗，請稍後再試")  
2. Closes the form then reopens it for the same tour  

…the error message from the previous attempt is still visible. `setSubmitError(null)` should be called inside `openForm()`.

### ISSUE-05 — `z.string().cuid()` vs `z.string()` — tourId without a tour context sends `null`, but `null` is correctly handled

**Severity:** Note (no fix needed)  
The `TourSection` always passes `tourId: modalTour?.id ?? null`. The inquiry form is only reachable from inside a tour modal, so `tourId` will always be a real CUID in practice. The nullable field on the Prisma `Inquiry` model is correctly handled on both sides.

---

## TypeScript Errors

```
.next/types/validator.ts(215,39): error TS2307: Cannot find module '../../src/app/page.js' ...
src/app/api/admin/regions/[id]/route.ts(30,52): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
src/app/api/admin/regions/[id]/subs/[subId]/route.ts(30,52): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
src/app/api/admin/regions/[id]/subs/reorder/route.ts(23,52): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
src/app/api/admin/regions/[id]/subs/route.ts(31,52): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
src/app/api/admin/regions/reorder/route.ts(19,52): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
src/app/api/admin/regions/route.ts(24,52): error TS2339: Property 'errors' does not exist on type 'ZodError<...>'
```

**All 7 errors are pre-existing** (present before this feature, in admin region routes that use deprecated `ZodError.errors` instead of `ZodError.issues`). The implementation-notes.md explicitly acknowledges them.

**Zero TypeScript errors** were introduced by the new frontend API integration work. The following new/modified files all compile cleanly:
- `web/src/lib/frontend-data.ts`
- `web/src/lib/frontend-queries.ts`
- `web/src/app/api/regions/route.ts`
- `web/src/app/api/regions/[slug]/route.ts`
- `web/src/app/api/regions/[slug]/tours/route.ts`
- `web/src/app/api/inquiries/route.ts`
- `web/src/app/(frontend)/page.tsx`
- `web/src/app/(frontend)/regions/[slug]/page.tsx`
- `web/src/app/(frontend)/regions/[slug]/[subSlug]/page.tsx`
- `web/src/components/frontend/CategoryList.tsx`
- `web/src/components/frontend/TourSection.tsx`
- `web/src/components/admin/tours/TourForm.tsx`
- `web/src/app/api/admin/tours/route.ts`
- `web/src/app/api/admin/tours/[id]/route.ts`

---

## Coverage Gaps

1. **No test for the subSlug fallback path:** When `subSlug` from the URL does not match any sub-region slug in the DB, `page.tsx` falls back to `subRegions[0].slug`. This logic is untested. If `subRegions` is empty (region exists but has no sub-regions) and `subRegions[0]` is `undefined`, then `validSlug = ""` and `currentSub` is `undefined`, triggering `notFound()` correctly — but this edge case is unverified by any automated test.

2. **No test for the inquiry `POST` when `tourId` is provided but does not correspond to an existing Tour:** The API creates the `Inquiry` row regardless — there is no FK validation because `Inquiry.tourId` is a plain `String?` (not a relation with FK enforcement in the schema). This is intentional but undocumented.

3. **Image gallery fallback in modal is untested:** The `galleryImgs` computed value correctly handles `images.length === 0 && thumbnail !== null`, `images.length === 0 && thumbnail === null`, and `images.length > 0`. No automated tests verify these branches.

---

## Sign-off Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | `description String?` added to Tour model | ✅ Pass |
| 2 | Migration file exists (`20260603051923_add_tour_description`) | ✅ Pass |
| 3 | All 6 DB-sourced types in `frontend-data.ts` | ✅ Pass |
| 4 | `getRegionList` Prisma query correct (orderBy, _count, published filter) | ✅ Pass |
| 5 | `getRegionDetail` Prisma query correct (subRegions orderBy, _count) | ✅ Pass |
| 6 | `getRegionTours` Prisma query correct (published filter, tags, files mimeType filter) | ✅ Pass |
| 7 | `GET /api/regions` returns `RegionListItem[]`, no auth required | ✅ Pass |
| 8 | `GET /api/regions/[slug]` returns `RegionDetail`, 404 on miss, params awaited | ✅ Pass |
| 9 | `GET /api/regions/[slug]/tours` returns `RegionTours`, 404 on miss, params awaited | ✅ Pass |
| 10 | `POST /api/inquiries` Zod schema correct (phone regex, email union, lineId union) | ✅ Pass |
| 11 | `POST /api/inquiries` returns 201 on success, 400 on validation fail | ✅ Pass |
| 12 | `REGIONS` import fully removed from all three frontend pages | ✅ Pass |
| 13 | `getRegionList()` called in homepage, mapped correctly to `CategoryItem` | ✅ Pass |
| 14 | `getRegionDetail(slug)` called in region page, `notFound()` on null | ✅ Pass |
| 15 | `getRegionTours(slug)` called in tour page, `notFound()` on null | ✅ Pass |
| 16 | `CategoryList`: `en` prop removed, `zh` → `name`, `count: string \| number` | ✅ Pass |
| 17 | `TourSection`: old types (`SubRegion`, `Tour`) replaced with new DB types | ✅ Pass |
| 18 | `TourSection`: old fields (`en`, `lede`, `code`, `dep`, `size`, `next`) removed from JSX | ✅ Pass |
| 19 | `TourSection`: tour card renders `description` (null-guarded) | ✅ Pass |
| 20 | `TourSection`: modal renders `description` | ❌ **Fail — ISSUE-01** |
| 21 | `TourSection`: gallery logic uses `images[]` with thumbnail fallback | ✅ Pass |
| 22 | `TourSection`: price formatted with `toLocaleString("zh-TW")` in both card and modal | ✅ Pass |
| 23 | `TourSection`: `handleSubmit` is async, calls `POST /api/inquiries` | ✅ Pass |
| 24 | `TourSection`: shows `submitError` on non-201 response | ✅ Pass |
| 25 | `TourForm`: `description` field in `Tour` interface | ✅ Pass |
| 26 | `TourForm`: `description` state initialised from `tour?.description ?? ""` | ✅ Pass |
| 27 | `TourForm`: `description` appended to FormData | ✅ Pass |
| 28 | `TourForm`: textarea rendered with correct label, rows, maxLength | ✅ Pass |
| 29 | `POST /api/admin/tours`: `description` in Zod schema and `db.tour.create` | ✅ Pass |
| 30 | `PUT /api/admin/tours/[id]`: `description` in Zod schema and `db.tour.update` | ✅ Pass |
| 31 | Admin edit page: `db.tour.findUnique` with `include` (auto-includes `description`) | ✅ Pass |
| 32 | Public API routes: no `getSession()` call | ✅ Pass |
| 33 | Admin tour routes: `getSession()` guards all methods | ✅ Pass |
| 34 | Zero TypeScript errors in new/modified files | ✅ Pass |

**Total: 33 / 34 checks pass.**
