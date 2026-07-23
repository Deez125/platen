import {
  Briefcase,
  DollarSign,
  FileText,
  type LucideIcon,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { CustomerCell } from "@/components/common/customer-avatar";
import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";

export type ActivityKind = "quote" | "invoice" | "payment" | "job";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  /** What happened, e.g. "Quote MWPB-00012 created". */
  title: string;
  customer: string;
  logoUrl: string | null;
  amount: number | null;
  date: string;
  href: string;
};

/** The icon is the only type cue needed — the activity text already names the
 *  document ("Quote MWPB-00012 created"), so a separate Type column is noise. */
const ICONS: Record<ActivityKind, LucideIcon> = {
  quote: FileText,
  invoice: ReceiptText,
  payment: DollarSign,
  job: Briefcase,
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No activity yet"
        description="Quotes, invoices, payments, and jobs will show up here as they happen."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Customer</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <TableRow key={`${item.kind}-${item.id}`} className="cursor-pointer">
              <TableCell>
                <Link href={item.href} className="block">
                  <CustomerCell name={item.customer} logoUrl={item.logoUrl} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={item.href} className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="truncate text-sm">{item.title}</span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <Link href={item.href} className="block">
                  {formatDate(item.date)}
                </Link>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                <Link href={item.href} className="block">
                  {item.amount === null ? "—" : formatCurrency(item.amount)}
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
