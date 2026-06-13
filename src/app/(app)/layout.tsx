import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getActiveContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type MembershipWithOrg = {
  organizations: {
    id: string;
    name: string;
    logo_url: string | null;
    subscription_plan: string | null;
  } | null;
};

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull canonical profile data (first_name/last_name/avatar_url) from the
  // profiles table — that's the source of truth, auth.user_metadata is just
  // the initial seed at signup.
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Orgs the user belongs to, via memberships.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("organizations(id, name, logo_url, subscription_plan)")
    .eq("user_id", user?.id ?? "");

  const orgs = ((memberships as MembershipWithOrg[] | null) ?? [])
    .map((m) => m.organizations)
    .filter((o): o is NonNullable<MembershipWithOrg["organizations"]> => o !== null)
    .map((o) => ({
      id: o.id,
      name: o.name,
      logoUrl: o.logo_url,
      subscriptionPlan: o.subscription_plan ?? "trial",
    }));

  // Cookie-aware active org so the switcher highlights the right one.
  const activeOrgId = (await getActiveContext())?.orgId ?? null;

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || user?.email || "Member";
  const initials =
    ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() ||
    (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: fullName,
          email: user?.email ?? "",
          initials,
          avatarUrl: profile?.avatar_url ?? null,
        }}
        orgs={orgs}
        activeOrgId={activeOrgId}
      />
      <SidebarInset>
        <AppTopbar />
        <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
