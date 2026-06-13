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
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === ALL || p.categoryId === category;
      const matchesQuery = q === "" || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  function handlePick(product: RefProduct) {
    onPick(product);
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a product</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
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

        <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No products match.</p>
          ) : (
            filtered.map((p) => {
              const tier = tierForQuantity(p.pricing, p.minQuantity ?? 1);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePick(p)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Shirt className="size-4 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.categoryName ?? "Uncategorized"}
                    </div>
                  </div>
                  {tier ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      from {formatCurrency(tier.unitPrice)}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
