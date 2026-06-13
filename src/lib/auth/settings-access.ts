import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** Owner or admin — can manage most org settings. */
export function isManager(role: string): boolean {
  return role === "owner" || role === "admin";
}

/** Owner only — business info, billing, delete org. */
export function isOwnerRole(role: string): boolean {
  return role === "owner";
}

/**
 * Where to bounce someone who lacks access to a settings page: back to where
 * they came from when it's a same-origin non-settings page, else the settings
 * landing (Account, which everyone can reach). Avoids loops between restricted
 * settings pages.
 */
function backPath(referer: string | null, host: string | null): string {
  if (!referer) return "/settings";
  try {
    const url = new URL(referer);
    if (host && url.host !== host) return "/settings";
    if (url.pathname === "/settings" || url.pathname.startsWith("/settings/")) return "/settings";
    return url.pathname || "/settings";
  } catch {
    return "/settings";
  }
}

/** Redirect the caller back where they came from unless `allowed` is true. */
export async function requireSettingsAccess(allowed: boolean): Promise<void> {
  if (allowed) return;
  const h = await headers();
  redirect(backPath(h.get("referer"), h.get("host")));
}
