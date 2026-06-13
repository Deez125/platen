"use client";

import { Check, ExternalLink, GripVertical, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CustomerAvatar } from "@/components/common/customer-avatar";
import { BOARD_LANES } from "@/components/jobs/job-status";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setWorkUnitStatus } from "@/lib/actions/jobs";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BoardUnit = {
  id: string;
  name: string;
  jobId: string;
  customerName: string;
  logoUrl: string | null;
  /** Job number + part letter for multi-unit jobs, e.g. MPBI-0001A. */
  partLabel: string;
  status: string;
  dueDate: string | null;
  method: string | null;
  checklistDone: number;
  checklistTotal: number;
};

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function ProductionBoard({ units: initial }: { units: BoardUnit[] }) {
  const router = useRouter();
  const [units, setUnits] = useState<BoardUnit[]>(initial);
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const today = todayStr();

  function move(unitId: string, status: string) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit || unit.status === status) return;

    const prev = units;
    // Optimistic: cancelled units leave the board; others just change lane.
    setUnits((list) =>
      status === "cancelled"
        ? list.filter((u) => u.id !== unitId)
        : list.map((u) => (u.id === unitId ? { ...u, status } : u)),
    );

    startTransition(async () => {
      const result = await setWorkUnitStatus(unitId, status);
      if (!result.ok) {
        setUnits(prev); // revert
        toast.error("Couldn't move", { description: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_LANES.map((lane) => {
        const laneUnits = units.filter((u) => u.status === lane.status);
        return (
          <div
            key={lane.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(lane.status);
            }}
            onDragLeave={() => setDragOver((d) => (d === lane.status ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const unitId = e.dataTransfer.getData("text/plain");
              if (unitId) move(unitId, lane.status);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors",
              dragOver === lane.status && "border-primary/50 bg-primary/5",
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-medium">{lane.label}</span>
              <Badge variant="neutral" className="text-[10px]">
                {laneUnits.length}
              </Badge>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              {laneUnits.map((u) => {
                const overdue = u.dueDate && u.dueDate < today && u.status !== "ready";
                return (
                  <div
                    key={u.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", u.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="group cursor-grab rounded-md border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
                      <CustomerAvatar name={u.customerName} logoUrl={u.logoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[u.partLabel, u.name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <Link
                          href={`/jobs/${u.jobId}`}
                          aria-label="Open job"
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="Change status"
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <MoreVertical className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {BOARD_LANES.map((l) => (
                              <DropdownMenuItem
                                key={l.status}
                                disabled={l.status === u.status}
                                onClick={() => move(u.id, l.status)}
                              >
                                {l.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => move(u.id, "cancelled")}
                            >
                              Cancel unit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 pl-5">
                      <span
                        className={cn(
                          "text-xs",
                          overdue ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {u.dueDate ? formatDate(u.dueDate) : "No due date"}
                      </span>
                      {u.checklistTotal > 0 ? (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs",
                            u.checklistDone === u.checklistTotal
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {u.checklistDone === u.checklistTotal ? (
                            <Check className="size-3" />
                          ) : null}
                          {u.checklistDone}/{u.checklistTotal}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
