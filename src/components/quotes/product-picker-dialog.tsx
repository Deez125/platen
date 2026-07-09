"use client";

import { Search, Shirt } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { type RefCategory, type RefProduct, tierForQuantity } from "@/lib/quotes/types";

const ALL = "__all__";

export function ProductPickerDialog({
  open,
  onOpenChange,
  products,
  categories,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: RefProduct[];
  categories: RefCategory[];
  onPick: (product: RefProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);

  const filtered = useMemo(() => {
    // Each word must hit name / brand / style# / category — so "gildan 64000"
    // finds the Gildan style 64000 even though brand + style live apart.
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (category !== ALL && p.categoryId !== category) return false;
      if (words.length === 0) return true;
      const hay =
        `${p.name} ${p.brand ?? ""} ${p.styleNumber ?? ""} ${p.categoryName ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [products, query, category]);

  function handlePick(product: RefProduct) {
    onPick(product);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] !max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Add a product</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand, style #, or name…"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No products match.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p) => {
                const tier = tierForQuantity(p.pricing, p.minQuantity ?? 1);
                const model = [p.brand, p.styleNumber].filter(Boolean).join(" · ");
                const sub = [model ? p.name : null, p.categoryName ?? "Uncategorized"]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePick(p)}
                    className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Shirt className="size-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{model || p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{sub}</div>
                    </div>
                    {tier ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        from {formatCurrency(tier.unitPrice)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
