"use client";

import { createContext, useContext } from "react";

/**
 * Provides the configurable admin URL prefix to client components.
 *
 * `ADMIN_PATH` is a runtime (non-NEXT_PUBLIC) env var, so client code cannot
 * read it from `process.env`. A server component (the admin layout) reads it
 * via `getAdminPath()` and passes it down through this provider. Client
 * components then build admin links with `useAdminUrl()`.
 */
const AdminPathContext = createContext<string>("/admin");

export function AdminPathProvider({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <AdminPathContext.Provider value={value}>
      {children}
    </AdminPathContext.Provider>
  );
}

/** The admin prefix, e.g. "/console-7x9k". */
export function useAdminPath(): string {
  return useContext(AdminPathContext);
}

/**
 * Build a path under the admin prefix.
 * `useAdminUrl("/login")` -> "/console-7x9k/login", `useAdminUrl()` -> prefix.
 */
export function useAdminUrl(sub = ""): string {
  const base = useContext(AdminPathContext);
  if (!sub || sub === "/") return base;
  return `${base}${sub.startsWith("/") ? sub : `/${sub}`}`;
}
