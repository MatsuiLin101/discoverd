# Architecture: Connect Frontend Pages to Database

**Version:** 1.0  
**Date:** 2026-06-03  
**Author:** system-architect agent  
**Based on:** spec.md v1.0 + codebase inspection

---

## 1. Prisma Schema Changes

### Diff (Tour model only)

```diff
 model Tour {
   id                String     @id @default(cuid())
   subRegionId       String
   subRegion         SubRegion  @relation(fields: [subRegionId], references: [id], onDelete: Restrict)
   name              String
   slug              String     @unique
   thumbnail         String?
   thumbnailPublicId String?
   price             Int
+  description       String?
   tags              Tag[]      @relation("TourTags")
   files             TourFile[]
   published         Boolean    @default(false)
   createdAt         DateTime   @default(now())
   updatedAt         DateTime   @updatedAt
 }
```

No other models change. The `description` field is placed between `price` and `tags` for logical grouping.

### Migration Command

```bash
cd web
npx prisma migrate dev --name add_tour_description
```

All existing Tour rows will have `description = NULL` after migration, which is valid (field is `String?`). No backfill required.

---

## 2. Migration Strategy

- **Type:** purely additive — one nullable column added
- **Downtime:** zero; PostgreSQL adds nullable columns without table rewrite
- **Backfill:** not required — `null` description renders as nothing in the UI
- **Rollback:** `prisma migrate dev` supports `migrate reset` in dev; in production, `ALTER TABLE "Tour" DROP COLUMN "description"` reverts with no data loss (the column was always optional)
- **Admin panel compatibility:** existing tour records continue to work; the new textarea simply shows empty

---

## 3. API Routes

### 3.1 GET /api/regions

| Field | Value |
|-------|-------|
| File | `web/src/app/api/regions/route.ts` |
| Method | GET |
| Auth | None |
| Response | `RegionListItem[]` |

**Zod schema:** none (no input params)

**Prisma query:**
```typescript
const rows = await db.region.findMany({
  orderBy: { sortOrder: "asc" },
  select: {
    slug: true,
    name: true,
    thumbnail: true,
    subRegions: {
      select: {
        _count: { select: { tours: { where: { published: true } } } },
      },
    },
  },
});

return rows.map((r) => ({
  slug: r.slug,
  name: r.name,
  thumbnail: r.thumbnail,
  tourCount: r.subRegions.reduce((sum, sr) => sum + sr._count.tours, 0),
}));
```

**Response 200:** `RegionListItem[]` (JSON array)  
**Response 500:** `{ "error": "伺服器錯誤" }`

---

### 3.2 GET /api/regions/[slug]

| Field | Value |
|-------|-------|
| File | `web/src/app/api/regions/[slug]/route.ts` |
| Method | GET |
| Auth | None |
| Path param | `slug` — Region.slug |
| Response | `RegionDetail` |

**Zod schema (path param):**
```typescript
const ParamSchema = z.object({
  slug: z.string().min(1),
});
```

**Prisma query:**
```typescript
const region = await db.region.findUnique({
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
        _count: { select: { tours: { where: { published: true } } } },
      },
    },
  },
});
```

**Response 200:** `RegionDetail`  
**Response 404:** `{ "error": "Region not found" }`  
**Response 500:** `{ "error": "伺服器錯誤" }`

---

### 3.3 GET /api/regions/[slug]/tours

| Field | Value |
|-------|-------|
| File | `web/src/app/api/regions/[slug]/tours/route.ts` |
| Method | GET |
| Auth | None |
| Path param | `slug` — Region.slug |
| Response | `RegionTours` |

**Zod schema (path param):**
```typescript
const ParamSchema = z.object({
  slug: z.string().min(1),
});
```

**Prisma query:**
```typescript
const region = await db.region.findUnique({
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
              select: { url: true },
            },
          },
        },
      },
    },
  },
});

// Shape for response:
const payload: RegionTours = {
  region: { slug: region.slug, name: region.name },
  subRegions: region.subRegions.map((sr) => ({
    slug: sr.slug,
    name: sr.name,
    tours: sr.tours.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      thumbnail: t.thumbnail,
      price: t.price,
      description: t.description,
      tags: t.tags.map((tag) => tag.name),
      images: t.files.map((f) => f.url),
    })),
  })),
};
```

**Response 200:** `RegionTours`  
**Response 404:** `{ "error": "Region not found" }`  
**Response 500:** `{ "error": "伺服器錯誤" }`

---

### 3.4 POST /api/inquiries

| Field | Value |
|-------|-------|
| File | `web/src/app/api/inquiries/route.ts` |
| Method | POST |
| Auth | None |
| Body | JSON |
| Response | `{ "ok": true }` / `{ "error": "...", "details": {...} }` |

**Zod schema (full definition):**
```typescript
import { z } from "zod";

export const InquirySchema = z.object({
  tourId:  z.string().cuid().optional().nullable(),
  name:    z.string().min(1, "請填寫姓名").max(50),
  phone:   z.string()
             .min(1, "請填寫電話")
             .regex(/^[\d\-\+\(\)\s]{7,20}$/, "電話格式不正確"),
  email:   z.union([
             z.string().email("Email 格式不正確"),
             z.literal("").transform(() => null),
           ]).optional().nullable(),
  lineId:  z.union([
             z.string().max(50),
             z.literal("").transform(() => null),
           ]).optional().nullable(),
  content: z.string().min(1, "請填寫詢問內容").max(2000),
});
```

> Note: The spec uses `.or(z.literal("").transform(...))` syntax. The above uses `z.union` which is the Zod v4 equivalent and avoids the deprecated `.or()` chain. Both are functionally equivalent.

**Prisma write:**
```typescript
const body = await req.json();
const parsed = InquirySchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "驗證失敗", details: parsed.error.flatten().fieldErrors },
    { status: 400 }
  );
}
const { tourId, name, phone, email, lineId, content } = parsed.data;

await db.inquiry.create({
  data: {
    tourId:  tourId ?? null,
    name,
    phone,
    email:  email ?? null,
    lineId: lineId ?? null,
    content,
  },
});
return NextResponse.json({ ok: true }, { status: 201 });
```

**Response 201:** `{ "ok": true }`  
**Response 400:** `{ "error": "驗證失敗", "details": { fieldErrors } }`  
**Response 500:** `{ "error": "伺服器錯誤" }`

---

## 4. frontend-queries.ts Design

New file: `web/src/lib/frontend-queries.ts`

Used by Server Components for direct Prisma calls (avoiding HTTP self-call overhead). Returns the same shape as the public API routes so pages remain consistent.

```typescript
import { db } from "@/lib/db";
import type { RegionListItem, RegionDetail, RegionTours } from "@/lib/frontend-data";

// ── Function 1 ──────────────────────────────────────────────
// Used by: app/(frontend)/page.tsx (homepage)
export async function getRegionList(): Promise<RegionListItem[]> {
  const rows = await db.region.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      thumbnail: true,
      subRegions: {
        select: {
          _count: { select: { tours: { where: { published: true } } } },
        },
      },
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    thumbnail: r.thumbnail,
    tourCount: r.subRegions.reduce((sum, sr) => sum + sr._count.tours, 0),
  }));
}

// ── Function 2 ──────────────────────────────────────────────
// Used by: app/(frontend)/regions/[slug]/page.tsx (region page)
// Returns null when slug not found (caller calls notFound())
export async function getRegionDetail(slug: string): Promise<RegionDetail | null> {
  const region = await db.region.findUnique({
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
          _count: { select: { tours: { where: { published: true } } } },
        },
      },
    },
  });
  if (!region) return null;
  return {
    slug: region.slug,
    name: region.name,
    thumbnail: region.thumbnail,
    subRegions: region.subRegions.map((sr) => ({
      slug: sr.slug,
      name: sr.name,
      thumbnail: sr.thumbnail,
      tourCount: sr._count.tours,
    })),
  };
}

// ── Function 3 ──────────────────────────────────────────────
// Used by: app/(frontend)/regions/[slug]/[subSlug]/page.tsx (tour page)
// Returns null when slug not found (caller calls notFound())
export async function getRegionTours(slug: string): Promise<RegionTours | null> {
  const region = await db.region.findUnique({
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
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });
  if (!region) return null;
  return {
    region: { slug: region.slug, name: region.name },
    subRegions: region.subRegions.map((sr) => ({
      slug: sr.slug,
      name: sr.name,
      tours: sr.tours.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        thumbnail: t.thumbnail,
        price: t.price,
        description: t.description,
        tags: t.tags.map((tag) => tag.name),
        images: t.files.map((f) => f.url),
      })),
    })),
  };
}
```

**Key design decisions:**
- All three functions use the `db` singleton from `@/lib/db` (which imports from `@/generated/prisma/client`)
- Return `null` on not-found so callers can invoke `notFound()` from Next.js
- No caching decorator needed at launch; Next.js 16 Server Components already de-duplicate within a single request
- `_count` nested select is used for `tourCount` to avoid loading entire Tour rows when only the count is needed

---

## 5. New TypeScript Types

Append to `web/src/lib/frontend-data.ts` (below the existing exports):

```typescript
// ─────────────────────────────────────────────────────────────
// DB-sourced types — used by frontend-queries.ts and API routes
// (The legacy Tour / SubRegion / Region interfaces above are kept
//  for HERO_SLIDES / SEARCH_DATA; do NOT use them for live pages)
// ─────────────────────────────────────────────────────────────

/** Returned by GET /api/regions and getRegionList() */
export interface RegionListItem {
  slug: string;
  name: string;
  thumbnail: string | null;
  tourCount: number;
}

/** Returned by GET /api/regions/[slug] and getRegionDetail() */
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
  tourCount: number;
}

/** Returned by GET /api/regions/[slug]/tours and getRegionTours() */
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
  price: number;
  description: string | null;
  tags: string[];
  /** URLs of TourFile records where mimeType starts with "image/". Empty = use thumbnail. */
  images: string[];
}
```

**Naming rationale:**
- `SubRegionListItem` (not `DbSubRegion`) — matches API contract naming, avoids Db prefix confusion with Prisma internals
- `TourItem` — distinct from the static `Tour` interface already in the file

---

## 6. Page & Component Tree

### 6.1 Homepage — `app/(frontend)/page.tsx`

```
HomePage [Server Component — async]
  ├── SiteHeader (Server Component)
  ├── HeroCarousel (Client Component — "use client")
  │     props: slides={HERO_SLIDES}  ← static, unchanged
  ├── CategoryList (Server Component — no directive)
  │     props:
  │       title: string (static HTML string)
  │       stats: string[]  ← computed from DB data (region count, total tourCount)
  │       categories: CategoryItem[]
  │         mapped from RegionListItem[]:
  │           href  = /regions/${r.slug}
  │           name  = r.name           ← Chinese only
  │           count = r.tourCount      ← number from DB
  │           img   = r.thumbnail ?? ""
  └── SiteFooter (Server Component)

Data flow:
  getRegionList() [direct Prisma] → RegionListItem[] → map → CategoryItem[]
```

### 6.2 Region Page — `app/(frontend)/regions/[slug]/page.tsx`

```
RegionPage [Server Component — async]
  params: Promise<{ slug: string }>   ← Next.js 16: must await params
  ├── SiteHeader
  ├── HeroCarousel  props: slides={HERO_SLIDES}
  ├── nav.fh-page-bar  (breadcrumb: 首頁 / region.name)
  ├── CategoryList
  │     props:
  │       title: string
  │       stats: [subRegion count, total published tourCount]
  │       categories: CategoryItem[]
  │         mapped from RegionDetail.subRegions:
  │           href  = /regions/${slug}/${sr.slug}
  │           name  = sr.name
  │           count = sr.tourCount
  │           img   = sr.thumbnail ?? ""
  └── SiteFooter

Data flow:
  getRegionDetail(slug) → RegionDetail | null
  if null → notFound()
```

### 6.3 Tour Page — `app/(frontend)/regions/[slug]/[subSlug]/page.tsx`

```
ToursPage [Server Component — async]
  params: Promise<{ slug: string; subSlug: string }>  ← must await
  ├── SiteHeader
  ├── nav.fh-page-bar  (breadcrumb: 首頁 / region.name / subRegion.name)
  ├── section.fh-listing
  │     └── TourSection [Client Component — "use client"]
  │           props:
  │             parent:      { name: region.name }   ← no en field
  │             regions:     SubRegionWithTours[]     ← all subregions + their tours
  │             initialSlug: subSlug (validated against actual subRegion slugs)
  └── SiteFooter

Data flow:
  getRegionTours(slug) → RegionTours | null
  if null → notFound()
  validate subSlug: if not in subRegions list, fall back to subRegions[0].slug
  breadcrumb subRegion name: find subRegion where slug === validatedSubSlug
```

---

## 7. Component Changes

### 7.1 CategoryList (`web/src/components/frontend/CategoryList.tsx`)

**Change:** Remove `en` prop from `CategoryItem` interface; remove the `{cat.en && <span className="cat-en">{cat.en}</span>}` JSX line; rename `zh` → `name` throughout.

**Before:**
```typescript
export interface CategoryItem {
  href: string;
  zh: string;
  en?: string;
  count: string;
  img: string;
}
```

**After:**
```typescript
export interface CategoryItem {
  href: string;
  name: string;
  count: string | number;   // number from DB tourCount; string for backward compat
  img: string;
}
```

`count` type changes from `string` to `string | number` so that the numeric `tourCount` from the DB can be passed directly without string conversion.

Remove from JSX:
```tsx
// DELETE this line:
{cat.en && <span className="cat-en">{cat.en}</span>}
```

Change `cat.zh` → `cat.name` in:
- `<span className="cat-nm">{cat.zh}</span>` → `{cat.name}`
- `alt={cat.zh}` → `alt={cat.name}`

---

### 7.2 TourSection (`web/src/components/frontend/TourSection.tsx`)

**Change 1 — imports:** Replace static type imports with new DB types:
```typescript
// REMOVE:
import type { SubRegion, Tour } from "@/lib/frontend-data";

// ADD:
import type { SubRegionWithTours, TourItem } from "@/lib/frontend-data";
```

**Change 2 — interface Props:**
```typescript
// BEFORE:
interface Parent { zh: string; en: string; }
interface Props {
  parent: Parent;
  regions: SubRegion[];
  initialSlug: string;
}

// AFTER:
interface Props {
  parent: { name: string };
  regions: SubRegionWithTours[];
  initialSlug: string;
}
```

**Change 3 — modal state type:**
```typescript
// BEFORE:
const [modalTour, setModalTour] = useState<Tour | null>(null);
// AFTER:
const [modalTour, setModalTour] = useState<TourItem | null>(null);
```

**Change 4 — openModal parameter:**
```typescript
// BEFORE:
function openModal(tour: Tour) { ... }
// AFTER:
function openModal(tour: TourItem) { ... }
```

**Change 5 — gallery image logic:**
```typescript
// BEFORE (uses cross-region images):
const galleryImgs = modalTour
  ? [...new Set([modalTour.img, ...activeRegion.tours.map((t) => t.img)])]
  : [];

// AFTER (uses TourFile images with thumbnail fallback):
const galleryImgs: string[] = modalTour
  ? modalTour.images.length > 0
    ? modalTour.images
    : modalTour.thumbnail
      ? [modalTour.thumbnail]
      : []
  : [];
```

**Change 6 — tour card JSX:** Remove references to `tour.img`, `tour.en`, `tour.lede`, `tour.code`, `tour.dep`, `tour.size`, `tour.next`:
```tsx
// thumbnail src with null guard:
<Image
  src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
  alt={tour.name}
  fill
  sizes="300px"
  style={{ objectFit: "cover" }}
/>

// Remove: <p className="t-en">{tour.en}</p>

// description (renders lede; skip if null):
{tour.description && <p className="t-lede">{tour.description}</p>}

// price (Int → formatted string):
<span className="num">{tour.price.toLocaleString("zh-TW")}</span>
```

**Change 7 — section head:** Replace `parent.zh` and `activeRegion.zh` with `parent.name` and `activeRegion.name`:
```tsx
// BEFORE:
<span>{parent.zh} ・ {activeRegion.zh}</span>
// AFTER:
<span>{parent.name} ・ {activeRegion.name}</span>
```

Also in modal eyebrow:
```tsx
// BEFORE:
<div className="m-eyebrow">{parent.zh} ・ {activeRegion.zh}</div>
// AFTER:
<div className="m-eyebrow">{parent.name} ・ {activeRegion.name}</div>
```

**Change 8 — tab button text:**
```tsx
// BEFORE: {r.zh}
// AFTER:  {r.name}
```

**Change 9 — inquiry form wire-up:**

Add error state:
```typescript
const [submitError, setSubmitError] = useState<string | null>(null);
```

Replace the `handleSubmit` implementation after client-side validation passes:
```typescript
// BEFORE (after validation passes):
setFormSubmitted(true);

// AFTER:
setSubmitError(null);
try {
  const res = await fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tourId: modalTour?.id ?? null,
      name: nameRef.current!.value.trim(),
      phone: phoneRef.current!.value.trim(),
      email: emailRef.current?.value.trim() || null,
      lineId: lineRef.current?.value.trim() || null,
      content: messageRef.current!.value.trim(),
    }),
  });
  if (res.status === 201) {
    setFormSubmitted(true);
  } else {
    setSubmitError("提交失敗，請稍後再試");
  }
} catch {
  setSubmitError("提交失敗，請稍後再試");
}
```

Add error display in form JSX (just above the submit button):
```tsx
{submitError && (
  <p className="text-sm text-rose-600">{submitError}</p>
)}
```

Note: `handleSubmit` must be marked `async` after this change.

**Change 10 — modal price display:**
```tsx
// BEFORE:
<span className="num">{modalTour?.price}</span>
// AFTER:
<span className="num">{modalTour?.price.toLocaleString("zh-TW")}</span>
```

---

### 7.3 Admin Tour Form (`web/src/components/admin/tours/TourForm.tsx`)

**Change 1 — Tour interface:** Add `description` field:
```typescript
interface Tour {
  id: string;
  name: string;
  price: number;
  description: string | null;   // ADD
  thumbnail: string | null;
  published: boolean;
  subRegionId: string;
  tags: { id: string }[];
}
```

**Change 2 — state:** Add description state after `price`:
```typescript
const [description, setDescription] = useState(tour?.description ?? "");
```

**Change 3 — FormData:** Append description to FormData in `handleSubmit`:
```typescript
fd.append("description", description);
```

**Change 4 — JSX:** Add textarea field between price and region selector:
```tsx
<div>
  <label className={labelClass}>行程簡介</label>
  <textarea
    rows={4}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className={inputClass}
    placeholder="簡短描述此行程的特色（選填）"
    maxLength={500}
  />
  <p className="mt-1 text-xs text-gray-400">最多 500 字</p>
</div>
```

---

### 7.4 Admin Tour API Routes

**`POST /api/admin/tours` (route.ts):** Update `createSchema` and Prisma call:
```typescript
// Add to createSchema:
description: z.string().max(500).optional().nullable()
  .or(z.literal("").transform(() => null)),

// Add to safeParse input:
description: fd.get("description"),

// Add to db.tour.create data:
description: parsed.data.description ?? null,
```

**`PUT /api/admin/tours/[id]` (route.ts):** Update `updateSchema` and Prisma call:
```typescript
// Add to updateSchema:
description: z.string().max(500).optional().nullable()
  .or(z.literal("").transform(() => null)),

// Add to safeParse input:
description: fd.get("description"),

// Add to db.tour.update data:
description: parsed.data.description ?? null,
```

**`GET /api/admin/tours/[id]`:** The edit page (`[id]/page.tsx`) uses `db.tour.findUnique` with `include`. After migration, Prisma's type will automatically include `description` — no explicit `select` change needed.

---

## 8. Implementation Order

The order below prevents TypeScript errors at each step. Complete each step fully before starting the next.

### Step 1 — Prisma migration
```bash
cd web
npx prisma migrate dev --name add_tour_description
```
Verify: `db.tour.create({ data: { description: "..." } })` compiles without error.

### Step 2 — Add DB types to frontend-data.ts
Append `RegionListItem`, `RegionDetail`, `SubRegionListItem`, `RegionTours`, `SubRegionWithTours`, `TourItem` to `web/src/lib/frontend-data.ts`.

Why first: `frontend-queries.ts` and API routes import from here.

### Step 3 — Create frontend-queries.ts
Create `web/src/lib/frontend-queries.ts` with `getRegionList`, `getRegionDetail`, `getRegionTours`.

Why: Pages depend on these functions; must exist before pages are updated.

### Step 4 — Create public API routes
Create the four files in order (no inter-dependency):
1. `web/src/app/api/regions/route.ts`
2. `web/src/app/api/regions/[slug]/route.ts`
3. `web/src/app/api/regions/[slug]/tours/route.ts`
4. `web/src/app/api/inquiries/route.ts`

These are independent of each other and of the component changes.

### Step 5 — Update CategoryList component
Change `CategoryItem` interface (`en` removed, `zh` → `name`, `count: string | number`).

Why before pages: the pages pass props into CategoryList; compile order matters.

### Step 6 — Update TourSection component
Apply all 10 changes listed in §7.2 (import swap, Props update, gallery logic, JSX cleanup, inquiry API call).

### Step 7 — Update frontend pages (Server Components)
In order:
1. `web/src/app/(frontend)/page.tsx` — use `getRegionList()`
2. `web/src/app/(frontend)/regions/[slug]/page.tsx` — use `getRegionDetail(slug)`
3. `web/src/app/(frontend)/regions/[slug]/[subSlug]/page.tsx` — use `getRegionTours(slug)`

### Step 8 — Update Admin Tour form + API routes
Apply in order (form before API, since form shape drives what the API must accept):
1. `TourForm.tsx` — add `description` state, textarea, FormData append
2. `api/admin/tours/route.ts` — add `description` to schema and Prisma create
3. `api/admin/tours/[id]/route.ts` — add `description` to schema and Prisma update

---

## 9. Risks & Mitigations

### Risk 1 — Empty database (no Regions seeded)

**Symptom:** Homepage shows a `CategoryList` with zero cards; no error thrown.  
**Mitigation:** `getRegionList()` returns `[]` on empty DB. `CategoryList` iterates over an empty array and renders an empty `<div className="fh-cat-list">` — no crash. If desired, add an `{categories.length === 0 && <p>目前尚無旅遊系列，請稍後再回來。</p>}` guard in `CategoryList`.

### Risk 2 — Region slug not found

**Symptom:** Visitor bookmarks `/regions/japan` but slug was renamed.  
**Mitigation:** Both `getRegionDetail(slug)` and `getRegionTours(slug)` return `null`. Pages call `notFound()` which renders the nearest `not-found.tsx` (Next.js built-in 404).

### Risk 3 — SubRegion with zero published tours

**Symptom:** Region page shows SubRegion card with `tourCount = 0`.  
**Decision (from spec §Open Questions Q3):** Show SubRegion cards regardless. `tourCount = 0` is valid output. Tour page for that SubRegion will show the `fh-empty` state ("這個分類的行程正在籌備中，敬請期待。").

### Risk 4 — Tour with null thumbnail

**Symptom:** `<Image src={null}>` throws.  
**Mitigation:** All three places that render a tour thumbnail (tour card in `TourSection`, gallery in modal, admin form preview) use a null-coalescing fallback:
```tsx
src={tour.thumbnail ?? "/images/tour-placeholder.svg"}
```
The gallery logic also handles `null`:
```typescript
modalTour.images.length > 0
  ? modalTour.images
  : modalTour.thumbnail ? [modalTour.thumbnail] : []
```

### Risk 5 — Next.js 16 params must be awaited

**Symptom:** TypeScript error `Promise<{ slug: string }> is not assignable to { slug: string }`.  
**Mitigation:** All page components already use `params: Promise<{ ... }>` and `const { slug } = await params;` (confirmed in existing region and tour pages). New API route handlers must also use this pattern:
```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // ...
}
```

### Risk 6 — Prisma client import path

**Symptom:** `Cannot find module '@prisma/client'`.  
**Mitigation:** This project generates the Prisma client to `../src/generated/prisma` (see `schema.prisma` generator config). All imports must use `@/generated/prisma/client`, not `@prisma/client`. The `db.ts` singleton already uses the correct path. New files (`frontend-queries.ts`, API routes) import `db` from `@/lib/db` and do not import Prisma directly.

### Risk 7 — Zod v4 `.or()` deprecation

**Symptom:** Zod warns about deprecated `.or()` chain syntax.  
**Mitigation:** Use `z.union([..., z.literal("").transform(...)])` instead of `.or(z.literal("").transform(...))`. Spec includes the `.or()` syntax; replace with `z.union` in implementation.

### Risk 8 — `handleSubmit` must be async after inquiry API wire-up

**Symptom:** `await fetch(...)` inside a non-async function.  
**Mitigation:** Change `function handleSubmit(e: React.FormEvent)` to `async function handleSubmit(e: React.FormEvent)`. React event handlers can be async without issues.

### Risk 9 — CategoryList `count` type mismatch

**Symptom:** `Type 'number' is not assignable to type 'string'` when passing `tourCount` (number) to `count` prop.  
**Mitigation:** Update `CategoryItem.count` to `string | number`. The JSX renders it as `{cat.count} 條路線` which coerces both types correctly.

### Risk 10 — Static `REGIONS` still imported in pages after migration

**Symptom:** Pages silently continue using stale static data.  
**Mitigation:** In Step 7, completely remove the `import { REGIONS } from "@/lib/frontend-data"` line from all three frontend pages (homepage, region page, tour page). TypeScript will flag any remaining usages of `REGIONS` that were not cleaned up.
