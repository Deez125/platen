import { redirect } from "next/navigation";

import { LogoUploadCard } from "@/components/settings/logo-upload-card";
import { getActiveContext } from "@/lib/auth/session";
import { isManager, requireSettingsAccess } from "@/lib/auth/settings-access";
import { createClient } from "@/lib/supabase/server";

type OrgRow = {
  id: string;
  logo_url: string | null;
  logo_wide_url: string | null;
};

export default async function BrandingSettingsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding");
  await requireSettingsAccess(isManager(ctx.role));

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, logo_url, logo_wide_url")
    .eq("id", ctx.orgId)
    .maybeSingle<OrgRow>();

  if (!org) {
    return (
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          No organization found for this account. Finish onboarding first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Your logo and how documents look to customers.
        </p>
      </div>

      <LogoUploadCard
        orgId={org.id}
        kind="square"
        column="logo_url"
        title="Square logo (1:1)"
        description="Used in the sidebar, app icon, and other compact spots."
        initialUrl={org.logo_url}
      />

      <LogoUploadCard
        orgId={org.id}
        kind="wide"
        column="logo_wide_url"
        title="Wide logo"
        description="Used on PDFs, email headers, and the customer portal. Landscape orientation works best."
        initialUrl={org.logo_wide_url}
      />
    </div>
  );
}
