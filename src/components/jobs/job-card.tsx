import Link from "next/link";

import { CustomerAvatar } from "@/components/common/customer-avatar";
import { JobStatusBadge } from "@/components/jobs/job-status";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  jobNumber: string;
  status: string;
  customer: string;
  logoUrl: string | null;
  due: string;
  unitsReady: number;
  unitsTotal: number;
  /** Order is fully done (delivered + paid) — dims the card. */
  completed?: boolean;
};

export function JobCard({
  id,
  jobNumber,
  status,
  customer,
  logoUrl,
  due,
  unitsReady,
  unitsTotal,
  completed = false,
}: Props) {
  return (
    <Link href={`/jobs/${id}`} className="group block">
      <Card
        className={cn(
          "relative h-full overflow-hidden border-transparent bg-sidebar p-4 transition-colors hover:bg-sidebar-accent/50",
          completed && "opacity-60",
        )}
      >
        <div className="absolute top-3 right-3">
          <JobStatusBadge status={status} />
        </div>

        <div className="flex items-center gap-3 pr-28">
          <CustomerAvatar name={customer} logoUrl={logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold leading-tight">{jobNumber}</div>
            <div className="mt-0.5 truncate text-sm text-muted-foreground">{customer}</div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <span className="text-xs text-muted-foreground">{due}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {unitsTotal > 0 ? `${unitsReady}/${unitsTotal} ready` : "—"}
          </span>
        </div>
      </Card>
    </Link>
  );
}
