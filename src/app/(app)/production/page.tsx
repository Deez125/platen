import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { type BoardUnit, ProductionBoard } from "@/components/jobs/production-board";
import { getActiveOrgId } from "@/lib/auth/session";
import type { JobChecklistItem } from "@/lib/db/schema/jobs";
import { createClient } from "@/lib/supabase/server";

type WorkUnitRow = {
  id: string;
  name: string;
  method: string | null;
  status: string;
  sort_order: number | null;
  checklist: JobChecklistItem[] | null;
  jobs: {
    id: string;
    customer_name: string | null;
    invoice_number: string | null;
    due_date: string | null;
    status: string;
    customers: { company: string | null; logo_url: string | null } | null;
  } | null;
};

export default async function ProductionPage() {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const { data } = await supabase
    .from("job_work_units")
    .select(
      "id, name, method, status, sort_order, checklist, jobs!inner(id, customer_name, invoice_number, due_date, status, customers(company, logo_url))",
    )
    .eq("tenant_id", orgId)
    .neq("status", "cancelled")
    .not("jobs.status", "in", "(delivered,cancelled)")
    .order("sort_order", { ascending: true });

  const rows = ((data as unknown as WorkUnitRow[] | null) ?? []).filter(
    (r): r is WorkUnitRow & { jobs: NonNullable<WorkUnitRow["jobs"]> } => r.jobs !== null,
  );

  // Count units per job (within the visible set) so multi-part jobs get A/B/…
  // letters; single-part jobs just show the job number.
  const perJob = new Map<string, number>();
  for (const r of rows) perJob.set(r.jobs.id, (perJob.get(r.jobs.id) ?? 0) + 1);
  const seen = new Map<string, number>();

  const units: BoardUnit[] = rows.map((r) => {
    const checklist = r.checklist ?? [];
    const total = perJob.get(r.jobs.id) ?? 1;
    const idx = seen.get(r.jobs.id) ?? 0;
    seen.set(r.jobs.id, idx + 1);
    const base = r.jobs.invoice_number ?? "";
    const partLabel = base && total > 1 ? `${base}${String.fromCharCode(65 + idx)}` : base;
    return {
      id: r.id,
      name: r.name,
      jobId: r.jobs.id,
      customerName: r.jobs.customers?.company || r.jobs.customer_name || "Customer",
      logoUrl: r.jobs.customers?.logo_url ?? null,
      partLabel,
      status: r.status,
      dueDate: r.jobs.due_date,
      method: r.method,
      checklistDone: checklist.filter((c) => c.done).length,
      checklistTotal: checklist.length,
    };
  });

  return (
    <>
      <PageHeader
        title="Production"
        subtitle={`${units.length} ${units.length === 1 ? "work unit" : "work units"} in production`}
      />

      {units.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing in production"
          description="Generate a job from a paid invoice and its work units will show up here."
        />
      ) : (
        <ProductionBoard units={units} />
      )}
    </>
  );
}
