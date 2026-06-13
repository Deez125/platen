import { redirect } from "next/navigation";

import { DeleteOrganizationCard } from "@/components/settings/delete-organization-card";
import { getActiveContext } from "@/lib/auth/session";
import { isOwnerRole, requireSettingsAccess } from "@/lib/auth/settings-access";
import { createClient } from "@/lib/supabase/server";

export default async function DangerZoneSettingsPage() {
  // Deleting the org is owner-only — non-owners get bounced back.
  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding");
  await requireSettingsAccess(isOwnerRole(ctx.role));

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", ctx.orgId)
    .maybeSingle<{ name: string }>();
  const orgName = org?.name ?? "this organization";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">Irreversible actions for this organization.</p>
      </div>

      <DeleteOrganizationCard orgName={orgName} />
    </div>
  );
}
