"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function HeartbeatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/auth/heartbeat", { method: "POST" });
      if (res.status === 401) router.push("/admin/login");
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(id);
  }, [router]);

  return <>{children}</>;
}
