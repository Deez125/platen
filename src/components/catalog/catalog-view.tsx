"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { Combobox } from "@/components/common/combobox";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";

export type CatalogProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
  startingPrice: number | null;
  custom: boolean;
  brand: string | null;
  /** Manufacturer style/model number (e.g. "64000"); null for custom. */
  styleNumber: string | null;
  /** "sanmar" | "ssactivewear" | "alphabroder" | null (custom) */
  distributorSlug: string | null;
  /** Display name shown on the card ("SanMar", "S&S Activewear", or "Custom"). */
  sourceLabel: string | null;
};

const ALL = "__all__";

// Distributor filter buttons — "All" first, then each source.
const SOURCES = [
  { slug: "all", name: "All" },
  { slug: "sanmar", name: "SanMar" },
  { slug: "ssactivewear", name: "S&S Activewear" },
  { slug: "alphabroder", name: "AlphaBroder" },
];

export function CatalogView({ products }: { products: CatalogProduct[] }) {
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");

  // Brand + category options, scoped to the selected distributor.
  const { brands, categories } = useMemo(() => {
    const scoped =
      source === "all" ? products : products.filter((p) => p.distributorSlug === source);
    const b = new Set<string>();
    const c = new Set<string>();
    for (const p of scoped) {
      if (p.brand) b.add(p.brand);
      if (p.categoryName) c.add(p.categoryName);
    }
    return {
      brands: [...b].sort((x, y) => x.localeCompare(y)),
      categories: [...c].sort((x, y) => x.localeCompare(y)),
    };
  }, [products, source]);

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filtered = products.filter((p) => {
    if (source !== "all" && p.distributorSlug !== source) return false;
    if (brand && p.brand !== brand) return false;
    if (category && (p.categoryName ?? "") !== category) return false;
    if (words.length > 0) {
      const hay = `${p.name} ${p.brand ?? ""} ${p.categoryName ?? ""}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  function pickSource(slug: string) {
    setSource(slug);
    setBrand("");
    setCategory("");
  }

  const brandOptions = [
    { value: ALL, label: "All brands" },
    ...brands.map((b) => ({ value: b, label: b })),
  ];

  return (
    <div className="space-y-4">
      {/* Distributor picker */}
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((d) => {
          const active = d.slug === source;
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => pickSource(d.slug)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "cursor-pointer border-border text-foreground hover:bg-muted",
              )}
            >
              {d.name}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
          />
        </div>
        <Combobox
          options={brandOptions}
          value={brand === "" ? ALL : brand}
          onChange={(v) => setBrand(v === ALL ? "" : v)}
          placeholder="All brands"
          searchPlaceholder="Search brands…"
          emptyText="No brands."
          className="w-full sm:w-52"
        />
        <Select
          value={category === "" ? ALL : category}
          onValueChange={(v) => setCategory(v === ALL ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No products match your filters"
          description="Try a different distributor, brand, category, or search."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              imageUrl={p.imageUrl}
              isActive={p.isActive}
              categoryName={p.categoryName}
              startingPrice={p.startingPrice}
              custom={p.custom}
              source={p.custom ? null : p.sourceLabel}
              brand={p.brand}
              styleNumber={p.styleNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}
