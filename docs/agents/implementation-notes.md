# Implementation Notes

**Agent:** fullstack-engineer  
**Date:** 2026-06-03  
**Based on:** architecture.md v1.0

---

## Files Created

| File | Description |
|------|-------------|
| `web/src/lib/frontend-queries.ts` | Three Prisma query functions: `getRegionList`, `getRegionDetail`, `getRegionTours` |
| `web/src/app/api/regions/route.ts` | `GET /api/regions` — public, no auth |
| `web/src/app/api/regions/[slug]/route.ts` | `GET /api/regions/[slug]` — public, no auth |
| `web/src/app/api/regions/[slug]/tours/route.ts` | `GET /api/regions/[slug]/tours` — public, no auth |
| `web/src/app/api/inquiries/route.ts` | `POST /api/inquiries` — public, no auth |
| `web/prisma/migrations/20260603051923_add_tour_description/migration.sql` | Migration: adds `description String?` to Tour table |

## Files Modified

| File | Change Summary |
|------|----------------|
| `web/prisma/schema.prisma` | Added `description String?` between `price` and `tags` in Tour model |
| `web/src/lib/frontend-data.ts` | Appended 6 new DB-sourced interfaces: `RegionListItem`, `RegionDetail`, `SubRegionListItem`, `RegionTours`, `SubRegionWithTours`, `TourItem` |
| `web/src/components/frontend/CategoryList.tsx` | Removed `en` field; renamed `zh` → `name`; widened `count` to `string \| number` |
| `web/src/components/frontend/TourSection.tsx` | Full rewrite: import swap to new DB types, Props update, gallery logic, JSX cleanup, async inquiry API call |
| `web/src/app/(frontend)/page.tsx` | Converted to async Server Component; uses `getRegionList()` from DB |
| `web/src/app/(frontend)/regions/[slug]/page.tsx` | Uses `getRegionDetail(slug)` from DB; removed REGIONS static import |
| `web/src/app/(frontend)/regions/[slug]/[subSlug]/page.tsx` | Uses `getRegionTours(slug)` from DB; removed REGIONS static import |
| `web/src/components/admin/tours/TourForm.tsx` | Added `description` field to Tour interface, state, FormData append, and textarea JSX |
| `web/src/app/api/admin/tours/route.ts` | Added `description` to createSchema and `db.tour.create` data |
| `web/src/app/api/admin/tours/[id]/route.ts` | Added `description` to updateSchema and `db.tour.update` data |

---

## Deviations from Architecture Document

1. **`submitError` placement in JSX:** Architecture §7.2 says to place the error display "just above the submit button." The existing form footer uses `<div className="fh-form-foot">` which contains both the cancel and submit buttons. The error `<p>` was placed inside `fh-form-foot` before the cancel button so it is still visually above the submit button without breaking the flex layout.

2. **`z.string().max(500).optional().nullable().or(...)` → `z.union`:** Architecture §7.4 shows the old `.or()` syntax for illustration but explicitly notes to use `z.union`. Implementation uses `z.union([z.string().max(500), z.literal("").transform(() => null)])` throughout, as required.

3. **Existing TypeScript errors (pre-existing, not introduced):** Several admin API routes use `parsed.error.errors` which does not exist in Zod v4 (`ZodError.errors` was renamed to `ZodError.issues`). These errors existed before this implementation and were not introduced by the current changes.

---

## Commands the Developer Must Run Manually

The Prisma migration was already applied during implementation. No further manual steps are required for the database.

However, if setting up a fresh environment:

```bash
cd web
npx prisma migrate deploy   # production
# or
npx prisma migrate dev       # development (already done)
```

To verify the build after these changes:

```bash
cd web
npm run build
```
