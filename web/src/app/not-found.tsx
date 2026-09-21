import { notoSans, notoSansTC } from "@/lib/frontend-fonts";
import NotFoundScreen from "@/components/frontend/NotFoundScreen";
import "./(frontend)/frontend.css";

// Global 404 for URLs that match no route at all (e.g. /random). Unlike the
// (frontend) not-found boundary, this renders inside the root layout, so it must
// bring its own `.fh-root` token wrapper, Noto fonts and the frontend stylesheet
// to look identical to the in-group 404.

export default function RootNotFound() {
  return (
    <div className={`${notoSans.variable} ${notoSansTC.variable} fh-root`}>
      <NotFoundScreen />
    </div>
  );
}
