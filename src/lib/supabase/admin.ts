import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS and can call the auth admin API.
 *
 * ⚠️ SERVER-ONLY. Never import this from a client component or anything that
 * ends up in the browser bundle. It is intentionally used in exactly one place
 * (the `deleteAccount` server action), which derives the target user from the
 * authenticated session — so a caller can only ever act on themselves.
 *
 * This is the one sanctioned exception to "service role for scripts only":
 * deleting an `auth.users` row and removing other tenants' storage objects
 * genuinely require admin privileges a normal user client doesn't have.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
