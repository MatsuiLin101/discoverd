# Feature Spec: Connect Frontend Pages to Database

**Version:** 1.0  
**Date:** 2026-06-03  
**Project:** 找到了旅遊 (Discovered Travel)  
**Stack:** Next.js 16 / React 19 / TypeScript / Prisma / PostgreSQL / Tailwind CSS 4

---

## Summary

The three public-facing frontend pages (homepage, region page, tour page) currently display hardcoded static data from `web/src/lib/frontend-data.ts`. This feature replaces the static data with live database queries via new public API endpoints. It also adds a working inquiry submission form, a `description` field to the Tour model, and updates the admin tour form accordingly.

---

## Goals

1. Remove hardcoded `REGIONS` static array from the runtime data path for all three frontend pages.
2. Implement four new API endpoints that serve public (unauthenticated) data from PostgreSQL via Prisma.
3. Wire the existing inquiry form in `TourSection` to `POST /api/inquiries`.
4. Add `Tour.description` (`String?`) to the Prisma schema and expose it in the API and admin form.
5. Replace the tour modal's placeholder image gallery with real `TourFile` images (image/* mimeType filter), falling back to `thumbnail` when no image files exist.
6. Display only `published = true` tours on all frontend pages.

---

## Non-Goals

- Search / `SEARCH_DATA` integration (SiteHeader search bar remains static; out of scope).
- Tour fields `dep`, `size`, `next`, `code` — these do not exist in the database schema and will not be added or displayed.
- English names (`en`) for Region, SubRegion, or Tour — removed from all frontend display.
- Pagination or infinite scroll for any listing.
- Authentication changes.
- Cloudinary upload logic changes.
- Admin region / sub-region / tag CRUD changes (beyond what is necessary for Tour.description).

---

## User Roles & Permissions

| Role | Capability |
|------|-----------|
| Anonymous visitor | Read-only access to public API endpoints (`GET /api/regions`, `GET /api/regions/[slug]`, `GET /api/regions/[slug]/tours`); submit inquiry via `POST /api/inquiries` |
| STAFF / ADMIN | Existing admin panel access; additionally sees and edits the new `description` field on tour management forms |

No session token is required for any of the four new API endpoints.

---

## User Stories

1. **As a visitor on the homepage**, I see all Region cards sorted by `sortOrder` with real names and thumbnails from the database, so I can navigate to a destination of interest.
2. **As a visitor on the region page** (`/regions/[slug]`), I see all SubRegion cards for that region sorted by `sortOrder`, so I can choose a sub-destination.
3. **As a visitor on the tour page** (`/regions/[slug]/[subSlug]`), I see all published tours grouped by SubRegion, each with name, price, tags, description, and images from the database, so I can evaluate a trip.
4. **As a visitor viewing a tour modal**, I see a gallery of uploaded images (`TourFile` records with `image/*` mimeType), or the tour thumbnail if no image files exist, so I always see a photo.
5. **As a visitor submitting an inquiry**, I fill in my name, phone (required), optional email, optional LINE ID, and a message, then receive a success confirmation, so I can contact the agency.
6. **As a staff/admin user managing tours**, I can enter an optional `description` (short description / lede text) for each tour in the admin form, so the website displays accurate trip summaries.

---

## Data Requirements

### 1. Prisma Schema Migration

Add `description` field to the `Tour` model:

```prisma
model Tour {
  // ... existing fields ...
  description String?   // short trip description (was "lede" in static data)
  // ... rest of fields ...
}
```

Run `prisma migrate dev` to apply. No other schema changes required.

### 2. New TypeScript Types for DB-Sourced Data

Replace static types in `frontend-data.ts` (or define in a new `src/types/frontend.ts`) with:

```typescript
// Returned by GET /api/regions
export interface RegionListItem {
  slug: string;
  name: string;        // Chinese name only (Region.name)
  thumbnail: string | null;
  tourCount: number;   // count of published tours across all SubRegions
}

// Returned by GET /api/regions/[slug]
export interface RegionDetail {
  slug: string;
  name: string;
  thumbnail: string | null;
  subRegions: SubRegionListItem[];
}

export interface SubRegionListItem {
  slug: string;
  name: string;
  thumbnail: string | null;
  tourCount: number;   // count of published tours in this SubRegion
}

// Returned by GET /api/regions/[slug]/tours
export interface RegionTours {
  region: {
    slug: string;
    name: string;
  };
  subRegions: SubRegionWithTours[];
}

export interface SubRegionWithTours {
  slug: string;
  name: string;
  tours: TourItem[];
}

export interface TourItem {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  price: number;          // Int (TWD), e.g. 42800
  description: string | null;
  tags: string[];         // Tag.name values
  images: string[];       // URLs of TourFile records where mimeType starts with "image/"
                          // Empty array means fallback to thumbnail
}
```

The existing static interfaces (`Tour`, `SubRegion`, `Region` in `frontend-data.ts`) may be kept for the static `HERO_SLIDES` and `SEARCH_DATA` exports but should no longer be used by the three frontend pages.

---

## API Endpoints

### GET /api/regions

Returns all regions sorted by `sortOrder` ascending, with the count of published tours.

**Auth:** None required.

**Query params:** None.

**Response 200:**
```json
[
  {
    "slug": "japan",
    "name": "日本",
    "thumbnail": "https://...",
    "tourCount": 14
  }
]
```

**Prisma query pattern:**
```typescript
await prisma.region.findMany({
  orderBy: { sortOrder: "asc" },
  select: {
    slug: true,
    name: true,
    thumbnail: true,
    subRegions: {
      select: {
        _count: { select: { tours: { where: { published: true } } } }
      }
    }
  }
});
// tourCount = sum of subRegion._count.tours across all subRegions
```

---

### GET /api/regions/[slug]

Returns a single region's metadata and its SubRegions (with per-SubRegion published tour count). Used by the region page (`/regions/[slug]`).

**Auth:** None required.

**Path param:** `slug` — Region.slug

**Response 200:**
```json
{
  "slug": "japan",
  "name": "日本",
  "thumbnail": "https://...",
  "subRegions": [
    {
      "slug": "hokkaido",
      "name": "北海道",
      "thumbnail": "https://...",
      "tourCount": 3
    }
  ]
}
```

**Response 404:** `{ "error": "Region not found" }` when no Region matches the slug.

**Prisma query pattern:**
```typescript
await prisma.region.findUnique({
  where: { slug },
  select: {
    slug: true,
    name: true,
    thumbnail: true,
    subRegions: {
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        thumbnail: true,
        _count: { select: { tours: { where: { published: true } } } }
      }
    }
  }
});
```

---

### GET /api/regions/[slug]/tours

Returns all SubRegions under the region, each with their published tours (including tags and image files). Used by the tour page (`/regions/[slug]/[subSlug]`).

**Auth:** None required.

**Path param:** `slug` — Region.slug

**Response 200:**
```json
{
  "region": { "slug": "japan", "name": "日本" },
  "subRegions": [
    {
      "slug": "hokkaido",
      "name": "北海道",
      "tours": [
        {
          "id": "clxxxxxx",
          "slug": "hokkaido-5-days",
          "name": "北海道五日之旅",
          "thumbnail": "https://...",
          "price": 42800,
          "description": "札幌、小樽運河與函館百萬夜景...",
          "tags": ["5 天 4 夜", "經典首選"],
          "images": ["https://...file1.jpg", "https://...file2.jpg"]
        }
      ]
    }
  ]
}
```

**Response 404:** `{ "error": "Region not found" }` when no Region matches the slug.

**Prisma query pattern:**
```typescript
await prisma.region.findUnique({
  where: { slug },
  select: {
    slug: true,
    name: true,
    subRegions: {
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        tours: {
          where: { published: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            thumbnail: true,
            price: true,
            description: true,
            tags: { select: { name: true } },
            files: {
              where: { mimeType: { startsWith: "image/" } },
              orderBy: { sortOrder: "asc" },
              select: { url: true }
            }
          }
        }
      }
    }
  }
});
// Map tags to string[]: tags.map(t => t.name)
// Map images to string[]: files.map(f => f.url)
```

---

### POST /api/inquiries

Accepts a visitor inquiry and stores it in the `Inquiry` table. Called by the form inside `TourSection`.

**Auth:** None required.

**Request body (JSON):**
```json
{
  "tourId": "clxxxxxx",   // optional — Tour.id; null/absent if inquiry is general
  "name": "王小明",
  "phone": "0912345678",
  "email": "example@email.com",  // optional
  "lineId": "@wangxm",           // optional
  "content": "我想詢問北海道五日行程的出發日期..."
}
```

**Response 201:** `{ "ok": true }`

**Response 400:** `{ "error": "...", "details": { ... } }` with Zod validation errors.

**Prisma write:**
```typescript
await prisma.inquiry.create({
  data: { tourId, name, phone, email, lineId, content }
});
```

---

## UI Screens / Components

### Homepage (`/` — `app/page.tsx`)

**Current:** Reads `REGIONS` static array and builds `categories` prop for `CategoryList`.

**After:**
1. Fetch `GET /api/regions` (server-side, inside the Server Component using `fetch` or direct Prisma call).
2. Map `RegionListItem[]` to the `categories` prop shape `{ href, name, count, img }[]`.
3. Pass to `CategoryList`.

**Data mapping:**
```
href    = /regions/${region.slug}
name    = region.name           // Chinese only; remove en prop
count   = region.tourCount
img     = region.thumbnail ?? ""
```

---

### Region Page (`/regions/[slug]` — `app/regions/[slug]/page.tsx`)

**Current:** `REGIONS.find(r => r.slug === slug)` for region metadata and subRegions.

**After:**
1. Fetch `GET /api/regions/[slug]` server-side.
2. Return 404 (`notFound()`) if response is 404.
3. Map `SubRegionListItem[]` to `categories` prop for `CategoryList`.

**Data mapping:**
```
href    = /regions/${regionSlug}/${subRegion.slug}
name    = subRegion.name        // Chinese only
count   = subRegion.tourCount
img     = subRegion.thumbnail ?? ""
```

---

### Tour Page (`/regions/[slug]/[subSlug]` — `app/regions/[slug]/[subSlug]/page.tsx`)

**Current:** `REGIONS.find(r => r.slug === slug)` then passes the full `subRegions` array to `TourSection`.

**After:**
1. Fetch `GET /api/regions/[slug]/tours` server-side.
2. Return 404 if response is 404.
3. Pass data to updated `TourSection` as new prop shape (see TourSection changes below).
4. `initialSlug` = `subSlug` path param (to pre-select the correct sub-region tab).

---

### CategoryList Component (`CategoryList.tsx`)

**Current prop shape:**
```typescript
interface Category {
  href: string;
  zh: string;
  en: string;
  count: string | number;
  img: string;
}
```

**After (proposed changes):**
- Remove `en` prop.
- Rename `zh` → `name` (or keep `zh` to minimise diff — implementer's choice, but must be consistent with page mapping).
- `count` type stays `string | number` (tourCount is `number` from API; component should render it directly).
- Remove any UI element that displayed the English subtitle.

---

### TourSection Component (`TourSection.tsx`)

**Current props:**
```typescript
interface Props {
  parent: { zh: string; en: string };
  regions: SubRegion[];   // from frontend-data.ts static type
  initialSlug: string;
}
```

**After:**

Replace the imported `SubRegion` / `Tour` types with the new DB-sourced types:

```typescript
// New internal types (or imported from src/types/frontend.ts)
interface TourItem {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  price: number;
  description: string | null;
  tags: string[];
  images: string[];
}

interface SubRegionWithTours {
  slug: string;
  name: string;
  tours: TourItem[];
}

interface Props {
  parent: { name: string };   // remove en field
  regions: SubRegionWithTours[];
  initialSlug: string;
}
```

**Tour modal image gallery logic:**
```
displayImages = tour.images.length > 0
  ? tour.images
  : (tour.thumbnail ? [tour.thumbnail] : [])
```

**Price display:**  
Format `tour.price` (Int) as a locale string: `price.toLocaleString("zh-TW")` + " 元" (or existing formatting convention in the file).

**Description display:**  
In the tour card and/or modal, render `tour.description` where `lede` was previously rendered. If `null`, render nothing.

**Remove from display:** `tour.code`, `tour.en`, `tour.dep`, `tour.size`, `tour.next` — these fields no longer exist.

**Inquiry form — wire to API:**

The form's submit handler currently does client-side validation only and sets `formSubmitted = true` without any network call. Update it to:

1. Validate fields (existing client-side validation is kept).
2. `POST /api/inquiries` with JSON body:
   ```json
   {
     "tourId": "<modalTour.id>",
     "name": nameRef.current.value,
     "phone": phoneRef.current.value,
     "email": emailRef.current.value || null,
     "lineId": lineRef.current.value || null,
     "content": messageRef.current.value
   }
   ```
3. On HTTP 201: set `formSubmitted = true` (existing success UI).
4. On HTTP 400 / network error: display a generic error message (e.g. "提交失敗，請稍後再試") without clearing the form.

---

### Admin Tour Form (`app/admin/tours/[id]/edit/page.tsx` and `app/admin/tours/new/page.tsx`)

Add an optional `description` textarea field to both the create and edit tour forms.

**Form field spec:**
- Label: "行程簡介"
- Type: `<textarea>` (multi-line), 3–4 rows
- Placeholder: "簡短描述此行程的特色（選填）"
- Max length: 500 characters (soft limit; validated server-side)
- Required: No

**API changes (admin tour routes):**
- `POST /api/admin/tours` — include `description?: string | null` in the request body schema (Zod) and the Prisma `create` call.
- `PATCH /api/admin/tours/[id]` — include `description?: string | null` in the request body schema (Zod) and the Prisma `update` call.
- `GET /api/admin/tours/[id]` — include `description` in the select/return so the edit form can pre-populate.

---

## Validation Rules

### POST /api/inquiries — Zod Schema

```typescript
import { z } from "zod";

export const InquirySchema = z.object({
  tourId:  z.string().cuid().optional().nullable(),
  name:    z.string().min(1, "請填寫姓名").max(50),
  phone:   z.string()
             .min(1, "請填寫電話")
             .regex(/^[\d\-\+\(\)\s]{7,20}$/, "電話格式不正確"),
  email:   z.string().email("Email 格式不正確").optional().nullable()
             .or(z.literal("").transform(() => null)),
  lineId:  z.string().max(50).optional().nullable()
             .or(z.literal("").transform(() => null)),
  content: z.string().min(1, "請填寫詢問內容").max(2000),
});
```

### Tour.description (admin)

```typescript
description: z.string().max(500).optional().nullable()
               .or(z.literal("").transform(() => null)),
```

---

## Assumptions

1. **Direct Prisma in Server Components:** The three frontend pages and their new API routes will call Prisma directly (not `fetch` to localhost) to avoid cold-start latency. The API routes are the source of truth for the response contract.
2. **No caching layer needed at launch:** Next.js default fetch caching / React cache is sufficient. No Redis or ISR configured initially.
3. **`sortOrder` is the canonical display order** for both Region and SubRegion; Tour display order within a SubRegion is by `createdAt ASC` (oldest first).
4. **tourCount includes only published tours** in both the homepage and region page counts.
5. **`thumbnail` fields may be null** (admin did not upload an image). UI must handle `null` gracefully (e.g. a placeholder background colour or hidden `<Image>`).
6. **`TourFile.mimeType` reliably starts with `"image/"`** for image files (enforced at upload time by existing admin logic).
7. **Price is stored in TWD (Integer, no decimals).** The static data used comma-formatted strings (e.g. `"42,800"`); the new API returns raw integers.
8. **The `HERO_SLIDES` and `SEARCH_DATA` exports in `frontend-data.ts` are kept as-is** (out of scope). Only the `REGIONS`, `Region`, `SubRegion`, and `Tour` identifiers are superseded.
9. **Migration is non-breaking for the admin panel**: existing Tour records will have `description = null` after migration, which is valid.
10. **No rate limiting** on `POST /api/inquiries` at launch (may be added later).

---

## Open Questions

1. **404 page behaviour:** When a visitor navigates to `/regions/[slug]` with a slug that no longer exists in the DB, should the app show Next.js's default 404 page or a custom styled page? (Assumption: `notFound()` from Next.js, which renders the nearest `not-found.tsx`.)
2. **Tour slug-based routing:** The current tour page is `/regions/[slug]/[subSlug]` (SubRegion slug), not a tour detail page. Should there eventually be a `/tours/[tourSlug]` detail page? If so, `TourItem.slug` is already included in the API response for future use.
3. **Empty SubRegion handling:** If a SubRegion has zero published tours, should it still appear in the region page's SubRegion list? (Current assumption: yes — the SubRegion card shows `tourCount = 0`.)
4. **Inquiry without a tourId:** The `TourSection` form is always opened from a specific tour modal, so `tourId` will always be present. However, `Inquiry.tourId` is nullable in the schema. Should a general contact form (no tourId) also exist? (Currently out of scope.)
5. **Description character limit:** The 500-character soft limit is an assumption. Confirm with the content team whether a longer description (e.g. 1000 chars) is needed for some tours.
6. **Image display count:** In the tour modal gallery, is there a maximum number of images to display (e.g. first 5)? Currently the spec returns all image files sorted by `sortOrder`.
