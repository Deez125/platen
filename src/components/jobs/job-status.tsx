import { Badge } from "@/components/ui/badge";

type BadgeVariant = "neutral" | "info" | "warning" | "success" | "danger";

/** Shared labels + badge variants for job + work-unit statuses (same vocab). */
export const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: "Scheduled", variant: "neutral" },
  pre_production: { label: "Pre-production", variant: "info" },
  in_production: { label: "In production", variant: "info" },
  post_production: { label: "Post-production", variant: "warning" },
  ready: { label: "Ready", variant: "success" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

/** The production board's lanes, in order (no delivered/cancelled). */
export const BOARD_LANES = [
  { status: "scheduled", label: "Scheduled" },
  { status: "pre_production", label: "Pre-production" },
  { status: "in_production", label: "In production" },
  { status: "post_production", label: "Post-production" },
  { status: "ready", label: "Ready" },
] as const;

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

export function JobStatusBadge({ status }: { status: string }) {
  const s = STATUS_META[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={s.variant} className="text-[10px]">
      {s.label}
    </Badge>
  );
}
