# Proposal v5 Implementation Gaps

This document records the differences found when comparing `docs/proposals/proposal-v5.md`
against the current implementation. It is intended as an implementation brief
for Claude Code.

## Context

- Source proposal: `docs/proposals/proposal-v5.md`
- Selected delivery scope: Plan A, multi-file upload
- Current app: `web/` Next.js 16 + React 19 + Prisma
- Important constraint: Keep the implementation aligned with the current code
  style and avoid unrelated refactors.

## Highest Priority Gaps

### 1. Frontend tour content does not render PDF files

Proposal v5 says Plan A supports uploading PDF or image files, and the frontend
should display uploaded itinerary content.

Current behavior:

- Admin can upload images and PDFs.
- Admin can preview, delete, and reorder both images and PDFs.
- Frontend region tour modal only queries image files.
- Frontend permanent tour page only queries image files.
- Uploaded PDFs are therefore not visible to visitors.

Relevant files:

- `web/src/lib/frontend-queries.ts`
  - `getRegionTours()` filters files with:
    `where: { mimeType: { startsWith: "image/" } }`
- `web/src/app/(frontend)/tours/[tourSlug]/page.tsx`
  - metadata query filters files to images
  - page query filters files to images
  - render path maps files into `images`
- `web/src/components/frontend/TourSection.tsx`
  - modal expects `modalTour.images`
  - gallery currently renders only `<img>`
- `web/src/lib/frontend-data.ts`
  - frontend tour types only expose `images`

Expected implementation:

- Query all tour files needed for Plan A, not only images.
- Preserve uploaded sort order for images and PDFs.
- Render image files inline as currently done.
- Render PDF files in a visitor-friendly way.
  - Acceptable options:
    - inline `<iframe>` / `<object>` PDF viewer with a fallback open/download
      link, or
    - visible PDF card/link in the content stream.
- Make the modal and `/tours/[tourSlug]` permanent page consistent.
- Ensure thumbnail fallback behavior still works when a tour has no image files
  but does have PDF files.
- Open Graph image should still use `ogImageKey`, thumbnail, or first image
  file. Do not use PDFs as OG images.

Acceptance checks:

- A tour with only image files displays those images on the modal and permanent
  page.
- A tour with only PDF files displays the PDF content or a clear PDF preview/link
  on the modal and permanent page.
- A tour with mixed image/PDF files respects admin sort order.
- Existing share URL `/tours/[slug]` still works.

### 2. Header is missing the two-level destination menu

Proposal v5 says the global navigation should include a destination category
menu with two levels: main region to sub-region.

Current behavior:

- `SiteHeader` has logo, search, and social links.
- There is no destination dropdown or mega menu.
- Breadcrumbs exist on pages, but not as a category menu.

Relevant files:

- `web/src/components/frontend/SiteHeader.tsx`
- `web/src/lib/frontend-queries.ts`
- Existing routes:
  - `/regions/[slug]`
  - `/regions/[slug]/[subSlug]`

Expected implementation:

- Add a destination navigation menu to the header.
- It should list regions and their sub-regions.
- Clicking a main region should go to `/regions/[slug]`.
- Clicking a sub-region should go to `/regions/[slug]/[subSlug]`.
- Preserve current header layout and responsive behavior.
- Hide empty regions/sub-regions only if that matches existing frontend data
  behavior; otherwise keep it simple and follow current data conventions.

Acceptance checks:

- Header shows a destination menu on desktop.
- Mobile layout remains usable.
- All menu links resolve to existing frontend pages.

### 3. Search does not include destination category filtering

Proposal v5 says keyword search should include destination category filtering
and instant search suggestions.

Current behavior:

- Instant search suggestions exist.
- Search has only a keyword input.
- There is no region/sub-region filter UI.

Relevant files:

- `web/src/components/frontend/SiteHeader.tsx`
- `web/src/app/api/search/route.ts`

Expected implementation:

- Add category filtering to search.
- Reasonable implementation:
  - Add a compact region/sub-region selector near the search input, or
  - integrate category selection into the destination menu/search UI.
- Update `/api/search` to accept optional region/sub-region filter params.
- Preserve current instant suggestion behavior.

Acceptance checks:

- Searching without filters behaves as before.
- Searching with a region or sub-region filter returns only matching published
  tours.
- Search result links still open the target tour modal via
  `/regions/[regionSlug]/[subRegionSlug]?tour=[tourSlug]`.

## Medium Priority Gaps

### 4. Footer company information lacks tax ID

Proposal v5 says the footer should include company information: license and tax
ID.

Current behavior:

- Footer includes company name, address, business hours, and license-like
  numbers.
- No tax ID is visible.

Relevant file:

- `web/src/components/frontend/SiteFooter.tsx`

Expected implementation:

- Add the company's tax ID once confirmed.
- If the real tax ID is not available, use a clearly marked placeholder only if
  acceptable for the current environment.

Acceptance checks:

- Footer visibly includes both license information and tax ID.

### 5. Middleware only verifies JWT, not server-side session

Proposal v5 says backend login uses JWT plus server-side session, with a
single active backend login.

Current behavior:

- `getSession()` checks the database session.
- Admin layout and APIs generally call `getSession()`.
- `proxy.ts` only verifies JWT, so an invalidated or expired DB session can pass
  middleware and is rejected later by layout/API.

Relevant files:

- `web/src/proxy.ts`
- `web/src/lib/auth.ts`
- `web/src/app/(admin-panel)/admin/layout.tsx`

Expected implementation:

- Decide whether this is acceptable.
- If strict middleware enforcement is desired, update middleware-compatible
  logic to also validate the server-side session.
- Be careful: Next middleware cannot directly use Prisma in the same way as
  server components/routes, depending on runtime constraints.

Acceptance checks:

- When a second login invalidates the first session, the first browser is
  redirected out of admin quickly and consistently.
- Heartbeat still extends the active session.

## Deployment / Operations Gaps

### 6. Usage monitoring at 80% is documented but not implemented in code

Proposal v5 says Oracle A1, PostgreSQL, Cloudflare R2, Cloudflare, and Gmail
SMTP should send email notifications at 80% usage.

Current behavior:

- `docs/deployment-oracle-r2.md` documents this.
- No application code or automation was found for these monitors.

Expected implementation:

- Treat this as an operations task, not necessarily a Next.js app feature.
- Possible implementation paths:
  - external monitoring service,
  - server cron/systemd timer on Oracle A1,
  - Cloudflare/Oracle native alerts where available.

Acceptance checks:

- There is a documented and enabled alerting path for each monitored service.
- Alert recipients are configured.

### 7. SSL, Nginx, Oracle A1, Cloudflare DNS cannot be verified from app code

Proposal v5 includes deployment architecture:

- Cloudflare DNS / SSL
- Oracle A1 VPS
- Nginx reverse proxy
- PostgreSQL on the same host
- Cloudflare R2 for files

Current repository state:

- App code and deployment notes support this direction.
- Actual live infrastructure setup cannot be verified from the repository alone.

Expected implementation:

- Verify on the target server or deployment environment.
- Keep `docs/deployment-oracle-r2.md` updated with final production values and
  operational steps.

## Already Mostly Aligned

These areas appear broadly aligned with `docs/proposals/proposal-v5.md`:

- Next.js 16 / React 19 frontend and API routes.
- Prisma + PostgreSQL schema.
- Admin login by username.
- Admin and staff roles.
- Single active session per user via `Session.userId @unique`.
- Heartbeat-based session extension.
- Region and sub-region CRUD with SEO fields.
- Tag CRUD and sorting.
- Tour CRUD with thumbnail, tags, price, SEO fields, publish status.
- Tour batch delete, publish/unpublish, region change, and tag changes.
- Drag sorting for tours, regions, sub-regions, tags, hero banners, and tour
  files.
- Hero banner management.
- Social link settings for Facebook, Instagram, and LINE.
- Inquiry form sends Gmail SMTP notification and does not persist inquiry rows.
- Activity logs for many admin CUD/reorder/auth operations.
- Google Tag Manager integration via `NEXT_PUBLIC_GTM_ID`.
- Sitemap and robots route.
- Admin tour preview with desktop/mobile modes.
