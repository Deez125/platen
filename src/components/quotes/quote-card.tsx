import Link from "next/link";

import { CustomerAvatar } from "@/components/common/customer-avatar";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Props = {
  id: string;
  quoteNumber: string;
  version: number;
  status: string;
  customer: string;
  logoUrl: string | null;
  total: string | number | null;
  date: string;
};

export function QuoteCard({
  id,
  quoteNumber,
  version,
  status,
  customer,
  logoUrl,
  total,
  date,
}: Props) {
  return (
    <Link href={`/quotes/${id}`} className="group block">
      <Card className="relative h-full overflow-hidden border-transparent bg-sidebar p-4 transition-colors hover:bg-sidebar-accent/50">
        <div className="absolute top-3 right-3">
          <QuoteStatusBadge status={status} />
        </div>

        <div className="flex items-center gap-3 pr-20">
          <CustomerAvatar name={customer} logoUrl={logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-tight">
              {quoteNumber}
              {version > 1 ? (
                <span className="ml-1 text-xs text-muted-foreground">v{version}</span>
              ) : null}
            </div>
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
