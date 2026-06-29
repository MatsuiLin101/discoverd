"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminPath } from "@/components/admin/AdminPathProvider";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function HeartbeatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const adminPath = useAdminPath();

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/auth/heartbeat", { method: "POST" });
      if (res.status === 401) router.push(`${adminPath}/login`);
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(id);
  }, [router, adminPath]);

  return <>{children}</>;
}
