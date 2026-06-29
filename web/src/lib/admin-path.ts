/**
 * Server-side helpers for the configurable admin URL prefix.
 *
 * The physical admin route folder is always `/admin` (Next.js file-system
 * routing cannot be moved via env). Instead we serve it behind a secret
 * prefix configured by the `ADMIN_PATH` env var, and `proxy.ts` rewrites the
 * secret prefix to the physical `/admin` route. These helpers are the single
 * source of truth for that prefix on the server.
 *
 * `ADMIN_PATH` is intentionally NOT a `NEXT_PUBLIC_*` var so it can be changed
 * at runtime (restart only, no rebuild). Client components receive the value
 * through `AdminPathProvider` instead of reading `process.env`.
 */

/** Read and normalize the admin prefix. Falls back to `/admin` when unset. */
export function getAdminPath(): string {
  const raw = process.env.ADMIN_PATH?.trim() || "/admin";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  // Strip a trailing slash (but keep a bare "/").
  return withLead.length > 1 && withLead.endsWith("/")
    ? withLead.slice(0, -1)
    : withLead;
}

/**
 * Build a path under the admin prefix.
 * `adminUrl()` -> "/console-7x9k", `adminUrl("/login")` -> "/console-7x9k/login".
 */
export function adminUrl(sub = ""): string {
  const base = getAdminPath();
  if (!sub || sub === "/") return base;
  return `${base}${sub.startsWith("/") ? sub : `/${sub}`}`;
}
