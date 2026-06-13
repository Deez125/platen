import { redirect } from "next/navigation";

import { type OrgFormData, OrganizationForm } from "@/components/settings/organization-form";
import { getActiveContext } from "@/lib/auth/session";
import { isManager, isOwnerRole, requireSettingsAccess } from "@/lib/auth/settings-access";
import { createClient } from "@/lib/supabase/server";

type OrgRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  default_tax_rate: string | null;
  default_min_quantity: string | null;
  quote_number_prefix: string | null;
  invoice_number_prefix: string | null;
};

export default async function OrganizationSettingsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding");
  await requireSettingsAccess(isManager(ctx.role));

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, email, phone, address_line1, address_line2, city, state, postal_code, default_tax_rate, default_min_quantity, quote_number_prefix, invoice_number_prefix",
    )
    .eq("id", ctx.orgId)
    .maybeSingle<OrgRow>();

  if (!org) {
    return (
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          No organization found for this account. Finish onboarding first.
        </p>
      </div>
    );
  }

  const formData: OrgFormData = {
    id: org.id,
    name: org.name,
    email: org.email,
    phone: org.phone,
    addressLine1: org.address_line1,
    addressLine2: org.address_line2,
    city: org.city,
    state: org.state,
    postalCode: org.postal_code,
    defaultTaxRate: org.default_tax_rate != null ? Number(org.default_tax_rate) : null,
    defaultMinQuantity: org.default_min_quantity != null ? Number(org.default_min_quantity) : null,
    quoteNumberPrefix: org.quote_number_prefix,
    invoiceNumberPrefix: org.invoice_number_prefix,
  };

  return <OrganizationForm org={formData} canEditShopInfo={isOwnerRole(ctx.role)} />;
}
