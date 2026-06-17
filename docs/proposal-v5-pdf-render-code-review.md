# Proposal v5 PDF Render Code Review

Review target: implementation for `docs/proposal-v5-implementation-gaps.md`
item 1, "Frontend tour content does not render PDF files".

Reviewer note: this file records review suggestions only. No implementation files
were modified as part of the review.

## Summary

The core requirement appears to be mostly implemented:

- Frontend tour modal, permanent tour page, and preview page now share
  `TourMediaGallery`.
- Tour files are exposed as ordered `media` items instead of image-only
  `images`.
- Image and PDF files preserve admin `sortOrder`.
- Tours with no content files still fall back to the thumbnail.
- `/tours/[tourSlug]` Open Graph images still come from `ogImageKey`,
  thumbnail, or first image file only; PDFs are not used as OG images.

## Findings

### P2: Deployment Node version is now more specific than the docs say

Files:

- `docs/deployment-oracle-r2.md`
- `web/package.json`
- `web/package-lock.json`

The deployment guide says to install "Node 20", but the newly added
`react-pdf` dependency brings in `pdfjs-dist@5.4.296`, whose package engine is:

```text
node >=20.16.0 || >=22.3.0
```

This can cause environment drift on Oracle A1 if a server installs an older
Node 20 release. `npm ci` or production build may behave differently from local
development.

Recommendation:

- Update deployment documentation to require Node `>=20.16.0`.
- Consider adding a `package.json` `engines.node` entry so the runtime
  requirement is explicit in code as well as docs.

### P3: Rendering every PDF page eagerly may hurt frontend performance

File:

- `web/src/components/frontend/TourPdfDoc.tsx`

`TourPdfDoc` renders every page after `onLoadSuccess` reports `numPages`.
This satisfies the visibility requirement, but long PDFs or multiple PDF files
inside a tour modal can create many canvas elements at once. On mobile, that may
lead to slow rendering, high memory use, or janky scrolling.

Recommendation:

- Lazy render pages as they approach the viewport, or
- Render only the first few pages inline and provide a clear "open full PDF"
  link, or
- Keep the current full render but always show a visible open/download link as a
  lightweight fallback path.

## Verification Notes

Commands run during review:

```bash
npx eslint 'src/components/frontend/TourMediaGallery.tsx' 'src/components/frontend/TourPdfDoc.tsx' 'src/components/frontend/TourPreviewFrame.tsx' 'src/components/frontend/TourSection.tsx' 'src/lib/frontend-data.ts' 'src/lib/frontend-queries.ts' 'src/app/(frontend)/tours/[tourSlug]/page.tsx' 'src/app/(frontend)/tour-preview/[tourSlug]/page.tsx' 'src/app/api/regions/[slug]/tours/route.ts'
```

Result:

- Failed only on the existing `react-hooks/set-state-in-effect` warning/error in
  `TourSection.tsx`.
- No new lint errors were found in `TourMediaGallery.tsx` or `TourPdfDoc.tsx`.

```bash
npm run build
```

Result:

- With network allowed, compile and TypeScript completed successfully.
- Build later failed during page-data collection because local R2 environment
  variables were not configured:
  `R2_BUCKET / R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY`.
- That failure was not caused by the PDF rendering implementation.
