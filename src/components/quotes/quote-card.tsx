import Link from "next/link";

import { CustomerAvatar } from "@/components/common/customer-avatar";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  quoteNumber: string;
  version: number;
  status: string;
  customer: string;
  logoUrl: string | null;
  total: string | number | null;
  date: string;
  /** Order is fully done (its job was delivered) — dims + shows "Completed". */
  completed?: boolean;
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
  completed = false,
}: Props) {
  return (
    <Link href={`/quotes/${id}`} className="group block">
      <Card
        className={cn(
          "relative h-full overflow-hidden border-transparent bg-sidebar p-4 transition-colors hover:bg-sidebar-accent/50",
          completed && "opacity-60",
        )}
      >
        <div className="absolute top-3 right-3">
          {completed ? (
            <Badge variant="success" className="text-[10px]">
              Completed
            </Badge>
          ) : (
            <QuoteStatusBadge status={status} />
          )}
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
