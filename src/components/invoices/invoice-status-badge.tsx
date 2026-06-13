import { Badge } from "@/components/ui/badge";

type BadgeVariant = "neutral" | "info" | "warning" | "success" | "danger";

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pending", variant: "neutral" },
  deposit_paid: { label: "Deposit paid", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
  refunded: { label: "Refunded", variant: "warning" },
  void: { label: "Void", variant: "neutral" },
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={s.variant} className="text-[10px]">
      {s.label}
    </Badge>
  );
}
