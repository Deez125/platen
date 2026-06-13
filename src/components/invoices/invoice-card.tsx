import Link from "next/link";

import { CustomerAvatar } from "@/components/common/customer-avatar";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Props = {
  id: string;
  invoiceNumber: string;
  status: string;
  customer: string;
  logoUrl: string | null;
  total: string | number | null;
  date: string;
};

export function InvoiceCard({ id, invoiceNumber, status, customer, logoUrl, total, date }: Props) {
  return (
    <Link href={`/invoices/${id}`} className="group block">
      <Card className="relative h-full overflow-hidden border-transparent bg-sidebar p-4 transition-colors hover:bg-sidebar-accent/50">
        <div className="absolute top-3 right-3">
          <InvoiceStatusBadge status={status} />
        </div>

        <div className="flex items-center gap-3 pr-24">
          <CustomerAvatar name={customer} logoUrl={logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-tight">{invoiceNumber}</div>
            <div className="mt-0.5 truncate text-sm text-muted-foreground">{customer}</div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <span className="text-xs text-muted-foreground">{date}</span>
          <span className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </Card>
    </Link>
  );
}
