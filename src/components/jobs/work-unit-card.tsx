"use client";

import { CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { statusLabel } from "@/components/jobs/job-status";
import { OrganizeUnitsDialog } from "@/components/jobs/organize-units-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setWorkUnitStatus, toggleChecklistItem } from "@/lib/actions/jobs";
import type { JobChecklistItem } from "@/lib/db/schema/jobs";
import { workUnitStatuses } from "@/lib/db/schema/jobs";
import { cn } from "@/lib/utils";

export type WorkUnit = {
  id: string;
  name: string;
  method: string | null;
  status: string;
  checklist: JobChecklistItem[];
};

export function WorkUnitCard({
  unit,
  number,
  canEdit,
  jobId,
  allUnits,
}: {
  unit: WorkUnit;
  number?: string;
  canEdit: boolean;
  jobId: string;
  /** Every unit on the job — the organizer works across all of them at once. */
  allUnits: WorkUnit[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<JobChecklistItem[]>(unit.checklist);
  const [, startTransition] = useTransition();

  // Re-sync from the server whenever this unit's checklist changes — e.g. after
  // a split moves items out, or another user edits it. Without this the local
  // optimistic copy goes stale: a split would still show the moved item here,
  // making it look like the item was copied rather than moved.
  const serverSig = unit.checklist.map((i) => `${i.id}:${i.done ? 1 : 0}`).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: resync only when the server checklist changes
  useEffect(() => {
    setItems(unit.checklist);
  }, [serverSig]);

  const done = items.filter((i) => i.done).length;

  function changeStatus(status: string) {
    if (status === unit.status) return;
    startTransition(async () => {
      const result = await setWorkUnitStatus(unit.id, status);
      if (!result.ok) {
        toast.error("Couldn't change status", { description: result.error });
        return;
      }
      router.refresh();
    });
  }

  function toggle(itemId: string, next: boolean) {
    const prev = items;
    setItems((list) => list.map((i) => (i.id === itemId ? { ...i, done: next } : i)));
    startTransition(async () => {
      const result = await toggleChecklistItem(unit.id, itemId, next);
      if (!result.ok) {
        setItems(prev);
        toast.error("Couldn't update checklist", { description: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {number ? <p className="font-mono text-xs text-muted-foreground">{number}</p> : null}
            <p className="truncate font-medium">{unit.name}</p>
            <p className="text-xs text-muted-foreground">
              {items.length > 0 ? `${done}/${items.length} done` : "No checklist"}
              {unit.method ? ` · ${unit.method}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && allUnits.reduce((n, u) => n + u.checklist.length, 0) >= 2 ? (
              <OrganizeUnitsDialog jobId={jobId} units={allUnits} />
            ) : null}
            {canEdit ? (
              <Select value={unit.status} onValueChange={changeStatus}>
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workUnitStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-muted-foreground">{statusLabel(unit.status)}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items in this unit.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggle(item.id, !item.done)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    canEdit && "hover:bg-muted/60",
                    !canEdit && "cursor-default",
                  )}
                >
                  {item.done ? (
                    <CheckSquare className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn("flex-1", item.done && "text-muted-foreground line-through")}>
                    {item.label}
                  </span>
                  {item.qty ? (
                    <span className="shrink-0 text-xs text-muted-foreground">×{item.qty}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
