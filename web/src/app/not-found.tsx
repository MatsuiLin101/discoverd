import { Noto_Sans, Noto_Sans_TC } from "next/font/google";
import NotFoundScreen from "@/components/frontend/NotFoundScreen";
import "./(frontend)/frontend.css";

// Global 404 for URLs that match no route at all (e.g. /random). Unlike the
// (frontend) not-found boundary, this renders inside the root layout, so it must
// bring its own `.fh-root` token wrapper, Noto fonts and the frontend stylesheet
// to look identical to the in-group 404.
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});

export default function RootNotFound() {
  return (
    <div className={`${notoSans.variable} ${notoSansTC.variable} fh-root`}>
      <NotFoundScreen />
    </div>
  );
}
