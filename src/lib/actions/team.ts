"use server";

import { revalidatePath } from "next/cache";

import { getActiveOrgId } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** Change a member's role. Permission + guard logic lives in the SQL RPC. */
export async function setMemberRole(userId: string, role: string): Promise<Result> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_org_id: orgId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/team");
  return { ok: true };
}

/**
 * Remove a member from the caller's active org. Mirrors the role-change guards:
 * caller must be owner/admin, admins can't remove an owner, you can't remove
 * yourself, and the last owner can't be removed. If the removed member is left
 * with no other org, their onboarding flag is reset so they re-onboard.
 */
export async function removeMember(userId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };
  if (userId === user.id) return { ok: false, error: "You can't remove yourself." };

  const admin = createAdminClient();

  const { data: caller } = await admin
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (caller?.role !== "owner" && caller?.role !== "admin") {
    return { ok: false, error: "You don't have permission to remove members." };
  }

  const { data: target } = await admin
    .from("memberships")
    .select("id, role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) return { ok: false, error: "That member isn't in this organization." };

  if (target.role === "owner") {
    if (caller.role !== "owner") {
      return { ok: false, error: "Only an owner can remove an owner." };
    }
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) return { ok: false, error: "You can't remove the last owner." };
  }

  const { error } = await admin.from("memberships").delete().eq("id", target.id);
  if (error) return { ok: false, error: error.message };

  // If the removed member now belongs to no org, force them back to onboarding.
  const { count: remaining } = await admin
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((remaining ?? 0) === 0) {
    await admin.from("profiles").update({ onboarding_complete: false }).eq("id", userId);
  }

  revalidatePath("/settings/team");
  return { ok: true };
}
