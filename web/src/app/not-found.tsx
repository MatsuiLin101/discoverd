import NotFoundScreen from "@/components/frontend/NotFoundScreen";
import "./(frontend)/frontend.css";

// Global 404 for URLs that match no route at all (e.g. /random). Unlike the
// (frontend) not-found boundary, this renders inside the root layout, so it must
// bring its own `.fh-root` token wrapper and the frontend stylesheet to look
// identical to the in-group 404. Fonts come from the system stack (see
// `--fh-sans` in frontend.css), so no font wiring is needed here.

export default function RootNotFound() {
  return (
    <div className="fh-root">
      <NotFoundScreen />
    </div>
  );
}
