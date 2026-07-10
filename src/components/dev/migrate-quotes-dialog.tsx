"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CustomerAvatar } from "@/components/common/customer-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Ring } from "@/components/ui/ring";
import { type MigratableQuote, getMigratableQuotes, migrateQuote } from "@/lib/actions/debug";
import { formatDate } from "@/lib/format";

export function MigrateQuotesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<MigratableQuote[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSelected(new Set());
    getMigratableQuotes().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setQuotes(res.quotes);
      else toast.error("Couldn't load quotes", { description: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const allSelected = quotes.length > 0 && selected.size === quotes.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(quotes.map((q) => q.id)));
  }

  async function run() {
    const ids = quotes.filter((q) => selected.has(q.id)).map((q) => q.id);
    if (ids.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: ids.length });
    let ok = 0;
    let firstError: string | null = null;
    for (const id of ids) {
      const res = await migrateQuote(id);
      if (res.ok) ok += 1;
      else if (!firstError) firstError = res.error;
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setRunning(false);
    if (firstError) {
      toast.error(`Migrated ${ok}/${ids.length}`, { description: firstError });
    } else {
      toast.success(`Migrated ${ok} quote${ok === 1 ? "" : "s"}`);
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] !max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Migrate to invoices & jobs</DialogTitle>
          <DialogDescription>
            Fast-forward the selected approved quotes to delivered, paid orders — invoice, payment,
            and job all created and dated to match the quote.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={loading || quotes.length === 0}
              className="size-4 cursor-pointer"
            />
            Select all
          </label>
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Ring className="text-muted-foreground" />
            </div>
          ) : quotes.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No approved quotes left to migrate.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {quotes.map((q) => (
                <li key={q.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggle(q.id)}
                      className="size-4 cursor-pointer"
                    />
                    <CustomerAvatar name={q.customer} logoUrl={q.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{q.customer}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {q.quoteNumber}
                        {q.quoteDate ? ` · ${formatDate(q.quoteDate)}` : ""}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="border-t border-border p-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            Cancel
          </Button>
          <Button onClick={run} disabled={running || selected.size === 0}>
            {running ? (
              <span className="flex items-center gap-1.5">
                <Ring size="sm" className="text-current" />
                {progress.done}/{progress.total}
              </span>
            ) : (
              `Migrate${selected.size ? ` ${selected.size}` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
