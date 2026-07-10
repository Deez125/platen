import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { type ReportInvoice, ReportsView } from "@/components/reports/reports-view";
import { getActiveOrgId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total: string | number | null;
  amount_paid: string | number | null;
  amount_due: string | number | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_company: string | null;
};

const num = (v: string | number | null): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const { data } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, total, amount_paid, amount_due, customer_id, customer_name, customer_company",
    )
    .eq("tenant_id", orgId)
    .order("issue_date", { ascending: false });

  const rows = (data ?? []) as InvoiceRow[];
  const invoices: ReportInvoice[] = rows.map((r) => ({
    id: r.id,
    number: r.invoice_number,
    status: r.status,
    issueDate: r.issue_date,
    total: num(r.total),
    amountPaid: num(r.amount_paid),
    amountDue: num(r.amount_due),
    customerId: r.customer_id,
    customer: r.customer_company || r.customer_name || "—",
  }));

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Find and export invoices by period, status, or customer."
      />
      <ReportsView invoices={invoices} />
    </>
  );
}
