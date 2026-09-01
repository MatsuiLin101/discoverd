import NotFoundScreen from "@/components/frontend/NotFoundScreen";

// Rendered whenever a frontend route calls `notFound()` (unknown region,
// sub-category, tour or preview slug). Wrapped by (frontend)/layout.tsx, so it
// inherits the `.fh-root` token layer, fonts and gradient background.
export default function FrontendNotFound() {
  return <NotFoundScreen />;
}
