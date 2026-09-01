import { notFound } from "next/navigation";

// Catch-all for admin paths that match no real route (e.g. /admin/boo). Without
// it such URLs never enter the admin subtree, so Next.js falls back to the root
// not-found (styled for the public frontend). Routing them here pulls the
// request into the admin layout and triggers the admin-styled not-found instead.
export default function AdminCatchAllNotFound() {
  notFound();
}
