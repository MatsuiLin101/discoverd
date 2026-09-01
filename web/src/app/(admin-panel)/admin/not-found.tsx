import Link from "next/link";
import { adminUrl } from "@/lib/admin-path";

// Admin-side 404 boundary. Without it, `notFound()` calls in the admin panel
// would fall through to the root not-found, which is styled for the public
// frontend. This keeps the "not found" state inside the admin shell instead.
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-gray-300">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-800">找不到這個項目</h1>
      <p className="mt-2 text-sm text-gray-500">
        此資料可能已被刪除,或網址不正確。
      </p>
      <Link
        href={adminUrl()}
        className="mt-6 inline-flex h-10 items-center rounded-md bg-gray-800 px-5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        回到後台首頁
      </Link>
    </div>
  );
}
