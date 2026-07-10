"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ACTIVE_ORG_COOKIE, activeOrgCookieOptions } from "@/lib/auth/session";
import { notifyOrg } from "@/lib/notifications/notify";
import { createClient } from "@/lib/supabase/server";

/** Pin the just-created/joined org as the caller's active tenant. */
async function pinActiveOrg(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, activeOrgCookieOptions());
}

export type CompleteOnboardingInput = {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  /** Stored as a decimal (e.g. 0.0925 for 9.25 %). */
  taxRate: number;
  minQuantity: number;
  quotePrefix: string;
  invoicePrefix: string;
};

export type CompleteOnboardingResult = { ok: true; orgId: string } | { ok: false; error: string };

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  if (!input.name.trim()) {
    return { ok: false, error: "Shop name is required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_name: input.name,
    p_email: input.email,
    p_address_line1: input.addressLine1,
    p_address_line2: input.addressLine2,
    p_city: input.city,
    p_state: input.state,
    p_postal_code: input.postalCode,
    p_tax_rate: input.taxRate,
    p_min_quantity: input.minQuantity,
    p_quote_prefix: input.quotePrefix,
    p_invoice_prefix: input.invoicePrefix,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  await pinActiveOrg(data as string);
  revalidatePath("/", "layout");
  return { ok: true, orgId: data as string };
}

export type JoinWithKeyResult = { ok: true; orgId: string } | { ok: false; error: string };

/** Join an existing org by its share key. Validates + creates the membership
 *  (role=member) + completes onboarding inside the SECURITY DEFINER RPC. */
export async function joinWithKey(key: string): Promise<JoinWithKeyResult> {
  if (!key.trim()) {
    return { ok: false, error: "Enter a join key" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_with_key", { p_key: key });

  if (error) {
    // The RPC raises "Invalid key" for an unknown key — surface it cleanly.
    const msg = /invalid key/i.test(error.message) ? "That join key isn't valid." : error.message;
    return { ok: false, error: msg };
  }

  const orgId = data as string;

  // Announce the new teammate to the shop (the joiner is now a member, so
  // notify_org's membership check passes).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user?.id ?? "")
    .maybeSingle<{ first_name: string | null; last_name: string | null }>();
  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  await notifyOrg(supabase, {
    tenantId: orgId,
    type: "member_joined",
    title: "New teammate joined",
    body: name ? `${name} joined your shop with the join key.` : "A new member joined your shop.",
  });

  await pinActiveOrg(orgId);
  revalidatePath("/", "layout");
  return { ok: true, orgId };
}
