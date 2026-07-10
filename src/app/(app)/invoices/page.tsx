import { Receipt } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerCell } from "@/components/common/customer-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ListFilterTabs } from "@/components/common/list-filter-tabs";
import { ListViewToggle } from "@/components/common/list-view-toggle";
import { PageHeader } from "@/components/common/page-header";
import { InvoiceCard } from "@/components/invoices/invoice-card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActiveOrgId } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { type PaymentInstallment, scheduleWithDates } from "@/lib/payments/payment-terms";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  customer_name: string | null;
  customer_company: string | null;
  total: string;
  amount_due: string | null;
  amount_paid: string;
  payment_schedule: PaymentInstallment[] | null;
  customers: { logo_url: string | null } | null;
  // Reverse embed: this invoice's job(s), to detect delivery. Supabase returns a
  // to-one embed as an object and a to-many as an array, so allow both shapes.
  jobs: { status: string } | { status: string }[] | null;
};

/** An order is "completed" once its downstream job is delivered AND the invoice
 *  is paid in full — a delivered-but-unpaid order still needs attention. */
function isCompleted(inv: InvoiceRow): boolean {
  const jobs = inv.jobs == null ? [] : Array.isArray(inv.jobs) ? inv.jobs : [inv.jobs];
  const delivered = jobs.some((j) => j.status === "delivered");
  const due =
    inv.amount_due != null ? Number(inv.amount_due) : Number(inv.total) - Number(inv.amount_paid);
  return delivered && due <= 0;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { status, view: viewParam } = await searchParams;
  const active = FILTERS.some((f) => f.value === status) ? (status as string) : "all";
  const view: "list" | "grid" = viewParam === "grid" ? "grid" : "list";

  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, customer_name, customer_company, total, amount_due, amount_paid, payment_schedule, customers(logo_url), jobs(status)",
    )
    .eq("tenant_id", orgId)
    .order("created_at", { ascending: false });
  // "overdue" isn't a stored status — it's computed from the schedule below, so
  // don't filter on it in SQL (the other statuses are real columns).
  if (active !== "all" && active !== "overdue") query = query.eq("status", active);

  const { data } = await query;
  const today = new Date().toISOString().slice(0, 10);

  /** Stored status, upgraded to "overdue" when a live invoice has a past-due
   *  unpaid installment in its payment schedule. */
  const effectiveStatus = (inv: InvoiceRow): string => {
    if (inv.status !== "pending" && inv.status !== "deposit_paid") return inv.status;
    const sched = inv.payment_schedule ?? [];
    if (sched.length === 0) return inv.status;
    const { anyOverdue } = scheduleWithDates(
      sched,
      Number(inv.total),
      Number(inv.amount_paid),
      inv.issue_date,
      today,
    );
    return anyOverdue ? "overdue" : inv.status;
  };

  let rows = (data ?? []) as unknown as InvoiceRow[];
  if (active === "overdue") rows = rows.filter((inv) => effectiveStatus(inv) === "overdue");
  // Completed (delivered + paid) orders sink below active ones; date order within
  // each group is preserved.
  rows = [...rows.filter((inv) => !isCompleted(inv)), ...rows.filter((inv) => isCompleted(inv))];

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={`${rows.length} ${rows.length === 1 ? "invoice" : "invoices"}`}
        actions={
          rows.length > 0 ? (
            <ListViewToggle view={view} status={active} basePath="/invoices" />
          ) : null
        }
      />

      <ListFilterTabs basePath="/invoices" active={active} view={view} filters={FILTERS} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={active === "all" ? "No invoices yet" : "No invoices match this filter"}
          description={
            active === "all"
              ? "Approve a quote and generate an invoice to start billing."
              : "Try a different status filter."
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((inv) => (
            <InvoiceCard
              key={inv.id}
              id={inv.id}
              invoiceNumber={inv.invoice_number}
              status={effectiveStatus(inv)}
              customer={inv.customer_company || inv.customer_name || "—"}
              logoUrl={inv.customers?.logo_url ?? null}
              total={inv.total}
              date={formatDate(inv.issue_date)}
              completed={isCompleted(inv)}
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Amount due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((inv) => {
              const customer = inv.customer_company || inv.customer_name || "—";
              const completed = isCompleted(inv);
              return (
                <TableRow key={inv.id} className={cn("cursor-pointer", completed && "opacity-60")}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="block">
                      <CustomerCell name={customer} logoUrl={inv.customers?.logo_url ?? null} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="block">
                      {completed ? (
                        <Badge variant="success" className="text-[10px]">
                          Completed
                        </Badge>
                      ) : (
                        <InvoiceStatusBadge status={effectiveStatus(inv)} />
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      {formatDate(inv.issue_date)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      {formatCurrency(inv.total)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      {formatCurrency(inv.amount_due)}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
