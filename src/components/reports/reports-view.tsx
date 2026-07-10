"use client";

import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Combobox } from "@/components/common/combobox";
import { EmptyState } from "@/components/common/empty-state";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ReportInvoice = {
  id: string;
  number: string;
  status: string;
  issueDate: string; // YYYY-MM-DD
  total: number;
  amountPaid: number;
  amountDue: number;
  customerId: string | null;
  customer: string;
};

const ALL = "__all__";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "refunded", label: "Refunded" },
  { value: "void", label: "Void" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Period select values: "all" | "q1".."q4" | "m1".."m12".
const QUARTER_MONTHS: Record<string, [number, number]> = {
  q1: [1, 3],
  q2: [4, 6],
  q3: [7, 9],
  q4: [10, 12],
};

function yearOf(iso: string): string {
  return iso.slice(0, 4);
}
function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

export function ReportsView({ invoices }: { invoices: ReportInvoice[] }) {
  // Only years that actually have invoices, newest first — there's no "all
  // years" view; a single year is the widest span.
  const years = useMemo(() => {
    const y = new Set<string>();
    for (const inv of invoices) if (inv.issueDate) y.add(yearOf(inv.issueDate));
    return [...y].sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  const [year, setYear] = useState<string>(() => years[0] ?? "");
  const [period, setPeriod] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [customer, setCustomer] = useState(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  const customerOptions = useMemo(() => {
    const custMap = new Map<string, string>();
    for (const inv of invoices) if (inv.customerId) custMap.set(inv.customerId, inv.customer);
    return [
      { value: ALL, label: "All customers" },
      ...[...custMap.entries()]
        .map(([id, name]) => ({ value: id, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (year && yearOf(inv.issueDate) !== year) return false;
      if (period !== ALL) {
        const m = monthOf(inv.issueDate);
        if (period.startsWith("q")) {
          const range = QUARTER_MONTHS[period];
          if (range && (m < range[0] || m > range[1])) return false;
        } else if (period.startsWith("m")) {
          if (m !== Number(period.slice(1))) return false;
        }
      }
      if (status !== ALL && inv.status !== status) return false;
      if (customer !== ALL && inv.customerId !== customer) return false;
      return true;
    });
  }, [invoices, year, period, status, customer]);

  const summaryTotal = filtered.reduce((s, inv) => s + inv.total, 0);

  // Selection is intersected with the current filter so a hidden invoice never
  // rides along in an export.
  const visibleSelected = filtered.filter((inv) => selected.has(inv.id));
  const allVisibleSelected = filtered.length > 0 && visibleSelected.length === filtered.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const inv of filtered) next.delete(inv.id);
      } else {
        for (const inv of filtered) next.add(inv.id);
      }
      return next;
    });
  }

  function resetFilters() {
    setYear(years[0] ?? "");
    setPeriod(ALL);
    setStatus(ALL);
    setCustomer(ALL);
  }

  function zipName(): string {
    const parts = ["invoices"];
    if (year) parts.push(year);
    if (period.startsWith("q")) parts.push(period.toUpperCase());
    else if (period.startsWith("m")) parts.push(MONTHS[Number(period.slice(1)) - 1] ?? period);
    return `${parts.join("-")}.zip`;
  }

  async function downloadZip() {
    const ids = visibleSelected.map((inv) => inv.id);
    if (ids.length === 0) return;
    setZipping(true);
    try {
      const res = await fetch("/api/invoices/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        toast.error("Couldn't export invoices", { description: await res.text() });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${ids.length} invoice${ids.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't export invoices");
    } finally {
      setZipping(false);
    }
  }

  const periodOptions = (
    <SelectContent>
      <SelectItem value={ALL}>All periods</SelectItem>
      <SelectItem value="q1">Q1 (Jan–Mar)</SelectItem>
      <SelectItem value="q2">Q2 (Apr–Jun)</SelectItem>
      <SelectItem value="q3">Q3 (Jul–Sep)</SelectItem>
      <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
      {MONTHS.map((m, i) => (
        <SelectItem key={m} value={`m${i + 1}`}>
          {m}
        </SelectItem>
      ))}
    </SelectContent>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All periods" />
          </SelectTrigger>
          {periodOptions}
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Combobox
          options={customerOptions}
          value={customer}
          onChange={setCustomer}
          placeholder="All customers"
          searchPlaceholder="Search customers…"
          emptyText="No customers."
          className="w-52"
        />

        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
          Reset
        </Button>
      </div>

      {/* Summary + batch action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "invoice" : "invoices"} ·{" "}
          {formatCurrency(summaryTotal)}
          {visibleSelected.length > 0 ? ` · ${visibleSelected.length} selected` : ""}
        </p>
        <Button
          size="sm"
          onClick={downloadZip}
          disabled={visibleSelected.length === 0 || zipping}
          className="gap-1.5"
        >
          {zipping ? <Ring size="sm" className="text-current" /> : <Download className="size-4" />}
          Download selected
          {visibleSelected.length > 0 ? ` (${visibleSelected.length})` : ""}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices match these filters"
          description="Try a different year, period, status, or customer."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="size-4 cursor-pointer align-middle"
                />
              </TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Amount due</TableHead>
              <TableHead className="w-12 text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggle(inv.id)}
                    aria-label={`Select ${inv.number}`}
                    className="size-4 cursor-pointer align-middle"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/invoices/${inv.id}`} className="hover:underline">
                    {inv.number}
                  </Link>
                </TableCell>
                <TableCell>{inv.customer}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(inv.total)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    inv.amountDue <= 0 && "text-muted-foreground",
                  )}
                >
                  {formatCurrency(inv.amountDue)}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon-sm" aria-label="Download PDF">
                    <a href={`/api/invoices/${inv.id}/pdf`} download={`${inv.number}.pdf`}>
                      <Download className="size-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
