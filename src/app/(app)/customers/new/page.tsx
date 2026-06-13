import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewCustomerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const tenantId = membership?.organization_id;
  if (!tenantId) redirect("/onboarding");

  return (
    <>
      <PageHeader title="New customer" subtitle="Add a new customer to your shop." />
      <CustomerForm tenantId={tenantId} />
    </>
  );
}
