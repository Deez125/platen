import { Badge } from "@/components/ui/badge";

type BadgeVariant = "neutral" | "info" | "warning" | "success" | "danger";

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "neutral" },
  sent: { label: "Sent", variant: "info" },
  viewed: { label: "Viewed", variant: "info" },
  revised: { label: "Revised", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  declined: { label: "Declined", variant: "danger" },
  expired: { label: "Expired", variant: "neutral" },
};

export function QuoteStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={s.variant} className="text-[10px]">
      {s.label}
    </Badge>
  );
}
