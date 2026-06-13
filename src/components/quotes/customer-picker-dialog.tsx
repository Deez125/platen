"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { CustomerCard, type CustomerSummary } from "@/components/customers/customer-card";
import { CustomerListView } from "@/components/customers/customer-list-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CustomerPickerDialog({
  open,
  onOpenChange,
  customers,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customers: CustomerSummary[];
  onSelect: (id: string) => void;
}) {
  const [view, setView] = useState<"list" | "grid">("grid");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.company ?? ""} ${c.name} ${c.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [customers, query]);

  function pick(id: string) {
    onSelect(id);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] !max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Select a customer</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              className="pl-9"
            />
          </div>
          <div className="inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-background p-0.5">
            <ToggleButton
              active={view === "list"}
              onClick={() => setView("list")}
              label="List view"
            >
              <List className="size-4" />
            </ToggleButton>
            <ToggleButton
              active={view === "grid"}
              onClick={() => setView("grid")}
              label="Grid view"
            >
              <LayoutGrid className="size-4" />
            </ToggleButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {customers.length === 0 ? "No customers yet." : "No customers match your search."}
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CustomerCard key={c.id} customer={c} onSelect={() => pick(c.id)} />
              ))}
            </div>
          ) : (
            <CustomerListView customers={filtered} onSelect={pick} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-[5px] px-2.5 transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
