import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerCell } from "@/components/common/customer-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { ListFilterTabs } from "@/components/common/list-filter-tabs";
import { ListViewToggle } from "@/components/common/list-view-toggle";
import { PageHeader } from "@/components/common/page-header";
import { QuoteCard } from "@/components/quotes/quote-card";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type QuoteRow = {
  id: string;
  quote_number: string;
  version: number;
  status: string;
  quote_date: string | null;
  total: string | number | null;
  customer_name: string | null;
  customer_company: string | null;
  // Live customer (via customer_id FK) — for the logo, which quotes don't snapshot.
  customers: { logo_url: string | null } | null;
  // Reverse embeds: this quote's invoice(s) and their job(s), to detect delivery.
  // Supabase returns a to-one embed as an object and a to-many as an array, so
  // both shapes are possible depending on the join's uniqueness.
  invoices: JobEmbed | JobEmbed[] | null;
};

type JobEmbed = {
  amount_due: string | number | null;
  jobs: { status: string } | { status: string }[] | null;
};

/** Normalize a Supabase embed (object for to-one, array for to-many) to an array. */
function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** An order is "completed" once its downstream job is delivered AND its invoice
 *  is paid in full — a delivered-but-unpaid order still needs attention. */
function isCompleted(q: QuoteRow): boolean {
  return asArray(q.invoices).some((inv) => {
    const due = inv.amount_due == null ? Number.POSITIVE_INFINITY : Number(inv.amount_due);
    const delivered = asArray(inv.jobs).some((j) => j.status === "delivered");
    return delivered && due <= 0;
  });
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export default async function QuotesPage({
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
    .from("quotes")
    .select(
      "id, quote_number, version, status, quote_date, total, customer_name, customer_company, customers(logo_url), invoices(amount_due, jobs(status))",
    )
    .eq("tenant_id", orgId)
    .order("created_at", { ascending: false });
  if (active !== "all") query = query.eq("status", active);

  const { data } = await query;
  // Supabase infers the to-one customers join as an array; it's an object at runtime.
  const fetched = (data ?? []) as unknown as QuoteRow[];
  // Completed (delivered + paid) orders sink below active ones; within each
  // group the date order from the query is preserved.
  const rows = [
    ...fetched.filter((q) => !isCompleted(q)),
    ...fetched.filter((q) => isCompleted(q)),
  ];

  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle={`${rows.length} ${rows.length === 1 ? "quote" : "quotes"}`}
        actions={
          <div className="flex items-center gap-2">
            {rows.length > 0 ? (
              <ListViewToggle view={view} status={active} basePath="/quotes" />
            ) : null}
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/quotes/new">
                <Plus className="size-4" /> New quote
              </Link>
            </Button>
          </div>
        }
      />

      <ListFilterTabs basePath="/quotes" active={active} view={view} filters={FILTERS} />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={active === "all" ? "No quotes yet" : "No quotes match this filter"}
          description={
            active === "all"
              ? "Build your first quote to send to a customer."
              : "Try a different status filter."
          }
          action={
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/quotes/new">
                <Plus className="size-4" /> New quote
              </Link>
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((q) => (
            <QuoteCard
              key={q.id}
              id={q.id}
              quoteNumber={q.quote_number}
              version={q.version}
              status={q.status}
              customer={q.customer_company || q.customer_name || "—"}
              logoUrl={q.customers?.logo_url ?? null}
              total={q.total}
              date={formatDate(q.quote_date)}
              completed={isCompleted(q)}
            />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Quote</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((q) => {
              const customer = q.customer_company || q.customer_name || "—";
              const completed = isCompleted(q);
              return (
                <TableRow key={q.id} className={cn("cursor-pointer", completed && "opacity-60")}>
                  <TableCell className="font-medium">
                    <Link href={`/quotes/${q.id}`} className="block">
                      {q.quote_number}
                      {q.version > 1 ? (
                        <span className="ml-1 text-xs text-muted-foreground">v{q.version}</span>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/quotes/${q.id}`} className="block">
                      <CustomerCell name={customer} logoUrl={q.customers?.logo_url ?? null} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/quotes/${q.id}`} className="block">
                      {completed ? (
                        <Badge variant="success" className="text-[10px]">
                          Completed
                        </Badge>
                      ) : (
                        <QuoteStatusBadge status={q.status} />
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link href={`/quotes/${q.id}`} className="block">
                      {formatDate(q.quote_date)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Link href={`/quotes/${q.id}`} className="block">
                      {formatCurrency(q.total)}
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
