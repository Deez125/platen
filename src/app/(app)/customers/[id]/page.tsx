import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { CustomerDeleteButton } from "@/components/customers/customer-delete-button";
import { CustomerForm } from "@/components/customers/customer-form";
import { Button } from "@/components/ui/button";
import { getActiveOrgId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  tenant_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  is_tax_exempt: boolean;
  tax_exempt_id: string | null;
  default_payment_terms: string | null;
  notes: string | null;
  logo_url: string | null;
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, tenant_id, name, company, email, phone, address_line1, address_line2, city, state, postal_code, is_tax_exempt, tax_exempt_id, default_payment_terms, notes, logo_url",
    )
    .eq("id", id)
    .eq("tenant_id", orgId)
    .maybeSingle<CustomerRow>();

  if (!customer) {
    notFound();
  }

  const initial = {
    name: customer.name,
    company: customer.company ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    addressLine1: customer.address_line1 ?? "",
    addressLine2: customer.address_line2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    postalCode: customer.postal_code ?? "",
    isTaxExempt: customer.is_tax_exempt,
    taxExemptId: customer.tax_exempt_id ?? "",
    defaultPaymentTerms: customer.default_payment_terms ?? "",
    notes: customer.notes ?? "",
  };

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={customer.company ?? "Customer details"}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/customers">
                <ArrowLeft className="size-4" /> All customers
              </Link>
            </Button>
            <CustomerDeleteButton customerId={customer.id} customerName={customer.name} />
          </div>
        }
      />
      <CustomerForm
        customerId={customer.id}
        tenantId={customer.tenant_id}
        initial={initial}
        initialLogoUrl={customer.logo_url}
      />
    </>
  );
}
