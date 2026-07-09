import { Briefcase } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerCell } from "@/components/common/customer-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ListFilterTabs } from "@/components/common/list-filter-tabs";
import { ListViewToggle } from "@/components/common/list-view-toggle";
import { PageHeader } from "@/components/common/page-header";
import { JobCard } from "@/components/jobs/job-card";
import { JobStatusBadge } from "@/components/jobs/job-status";
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
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type JobRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  due_date: string | null;
  customer_name: string | null;
  job_work_units: { status: string }[] | null;
  customers: { company: string | null; logo_url: string | null } | null;
  // Payment status read straight from the linked invoice.
  invoices: { amount_paid: string | number | null; total: string | number | null } | null;
};

type PayStatus = "unpaid" | "partial" | "paid";
const PAYMENT: Record<PayStatus, { label: string; variant: "neutral" | "warning" | "success" }> = {
  unpaid: { label: "Unpaid", variant: "neutral" },
  partial: { label: "Partial", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_production", label: "In production" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];

export default async function JobsPage({
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
    .from("jobs")
    .select(
      "id, invoice_number, status, due_date, customer_name, job_work_units(status), customers(company, logo_url), invoices(amount_paid, total)",
    )
    .eq("tenant_id", orgId)
    .order("created_at", { ascending: false });
  if (active !== "all") query = query.eq("status", active);

  const { data } = await query;
  const rows = (data ?? []) as unknown as JobRow[];

  function customerOf(job: JobRow) {
    return job.customers?.company || job.customer_name || "—";
  }
  function readyOf(job: JobRow) {
    const units = job.job_work_units ?? [];
    return { ready: units.filter((u) => u.status === "ready").length, total: units.length };
  }
  function paymentOf(job: JobRow): PayStatus {
    const paid = Number(job.invoices?.amount_paid ?? 0) || 0;
    const total = Number(job.invoices?.total ?? 0) || 0;
    if (paid <= 0) return "unpaid";
    if (total > 0 && paid >= total) return "paid";
    return "partial";
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle={`${rows.length} ${rows.length === 1 ? "job" : "jobs"}`}
        actions={
          rows.length > 0 ? <ListViewToggle view={view} status={active} basePath="/jobs" /> : null
        }
      />

      <ListFilterTabs basePath="/jobs" active={active} view={view} filters={FILTERS} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={active === "all" ? "No jobs yet" : "No jobs match this filter"}
          description={
            active === "all"
              ? "Generate a job from a deposit-paid or paid invoice to start tracking production."
              : "Try a different status filter."
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((job) => {
            const { ready, total } = readyOf(job);
            return (
              <JobCard
                key={job.id}
                id={job.id}
                jobNumber={job.invoice_number || "Job"}
                status={job.status}
                customer={customerOf(job)}
                logoUrl={job.customers?.logo_url ?? null}
                due={formatDate(job.due_date)}
                unitsReady={ready}
                unitsTotal={total}
              />
            );
          })}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Units ready</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((job) => {
              const { ready, total } = readyOf(job);
              const pay = PAYMENT[paymentOf(job)];
              return (
                <TableRow key={job.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/jobs/${job.id}`} className="block">
                      {job.invoice_number || "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="block">
                      <CustomerCell
                        name={customerOf(job)}
                        logoUrl={job.customers?.logo_url ?? null}
                      />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/jobs/${job.id}`} className="block">
                      {formatDate(job.due_date)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="block">
                      <JobStatusBadge status={job.status} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/jobs/${job.id}`} className="block">
                      <Badge variant={pay.variant} className="text-[10px]">
                        {pay.label}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    <Link href={`/jobs/${job.id}`} className="block">
                      {total > 0 ? `${ready}/${total}` : "—"}
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
