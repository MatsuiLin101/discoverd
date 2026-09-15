/** Which quota paid for a generation, and how the choice came about. */
export type KeyOwner = "personal" | "shared" | "fallback_quota" | "fallback_error";

/** Human labels shown on each generated candidate. */
export const KEY_OWNER_LABEL: Record<KeyOwner, string> = {
  personal: "使用個人額度",
  shared: "使用公用額度",
  fallback_quota: "公用額度（個人額度已用完）",
  fallback_error: "公用額度（個人金鑰無效）",
};

/** Personal usage is on the user's own account, so it is excluded from the
 * company cost estimate; everything else (shared / fallbacks) is company-paid. */
export function isCompanyPaid(owner: string | null | undefined): boolean {
  return owner !== "personal";
}
