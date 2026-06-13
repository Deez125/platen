import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { CustomerCard, type CustomerSummary } from "@/components/customers/customer-card";
import { CustomerListView } from "@/components/customers/customer-list-view";
import { CustomersViewToggle } from "@/components/customers/customers-view-toggle";
import { Button } from "@/components/ui/button";
import { getActiveOrgId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_tax_exempt: boolean;
  logo_url: string | null;
  created_at: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view: "list" | "grid" = viewParam === "grid" ? "grid" : "list";

  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, company, email, phone, city, state, is_tax_exempt, logo_url, created_at")
    .eq("tenant_id", orgId)
    .order("created_at", { ascending: false });

  const rows = (customers ?? []) as CustomerRow[];
  const summaries: CustomerSummary[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    city: c.city,
    state: c.state,
    isTaxExempt: c.is_tax_exempt,
    logoUrl: c.logo_url,
  }));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} ${rows.length === 1 ? "customer" : "customers"}`}
        actions={
          <div className="flex items-center gap-2">
            {rows.length > 0 ? <CustomersViewToggle view={view} /> : null}
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/customers/new">
                <Plus className="size-4" /> Add customer
              </Link>
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start building quotes and invoices."
          action={
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/customers/new">
                <Plus className="size-4" /> Add customer
              </Link>
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {summaries.map((c) => (
            <CustomerCard key={c.id} customer={c} />
          ))}
        </div>
      ) : (
        <CustomerListView customers={summaries} />
      )}
    </>
  );
}
