"use client";

import { Check, ChevronLeft, ChevronRight, Search, Shirt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Combobox } from "@/components/common/combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { importDistributorStyle, setTenantProductCategory } from "@/lib/actions/catalog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type DistributorProduct = {
  id: string;
  brand: string;
  styleNumber: string;
  name: string;
  category: string | null;
  colorCount: number;
  minPrice: number | null;
  imageUrl: string | null;
};

type TenantCategory = { id: string; name: string };
/** A distributor product that's already been imported, + the tenant product it became. */
type ImportedInfo = {
  distributorProductId: string;
  tenantProductId: string;
  categoryId: string | null;
};

type Filters = { q: string; brand: string; category: string };

type Props = {
  products: DistributorProduct[];
  brands: string[];
  categories: string[];
  tenantCategories: TenantCategory[];
  imported: ImportedInfo[];
  total: number;
  page: number;
  pageSize: number;
  /** Active distributor source slug (which catalog is being browsed). */
  source: string;
  filters: Filters;
};

const ALL = "__all__";
const NO_CATEGORY = "__none__";

// Distributor sources. SanMar + S&S catalogs are loaded; AlphaBroder is next.
const DISTRIBUTORS = [
  { slug: "sanmar", name: "SanMar", enabled: true },
  { slug: "ssactivewear", name: "S&S Activewear", enabled: true },
  { slug: "alphabroder", name: "AlphaBroder", enabled: false },
];

const ESC_RE = /[.*+?^${}()|[\]\\]/g;
function cleanName(name: string, brand: string, style: string): string {
  const esc = (s: string) => s.replace(ESC_RE, "\\$&");
  let n = name ?? "";
  if (style) n = n.replace(new RegExp(`[\\s.]*${esc(style)}\\s*$`, "i"), "");
  if (brand) n = n.replace(new RegExp(`^${esc(brand)}\\s*[-–]?\\s*`, "i"), "");
  n = n
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");
  return n || name;
}

export function DistributorBrowser({
  products,
  brands,
  categories,
  tenantCategories,
  imported,
  total,
  page,
  pageSize,
  source,
  filters,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // distributor_product_id → imported tenant product info (id + current category).
  const [importedMap, setImportedMap] = useState(
    () => new Map(imported.map((i) => [i.distributorProductId, i])),
  );
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(search, 350);

  function navigate(next: Partial<Filters & { page: number; source: string }>) {
    const merged = {
      q: filters.q,
      brand: filters.brand,
      category: filters.category,
      source,
      page,
      ...next,
    };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.brand) params.set("brand", merged.brand);
    if (merged.category) params.set("category", merged.category);
    if (merged.source && merged.source !== "sanmar") params.set("source", merged.source);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    const qs = params.toString();
    startTransition(() => router.push(`/catalog/import${qs ? `?${qs}` : ""}`));
  }

  // Push debounced search to the URL (reset to page 1). Skip when unchanged.
  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate derives from props
  useEffect(() => {
    if (debouncedSearch === filters.q) return;
    navigate({ q: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const brandOptions = [
    { value: ALL, label: "All brands" },
    ...brands.map((b) => ({ value: b, label: b })),
  ];

  return (
    <div className="space-y-4">
      {/* Distributor picker */}
      <div className="flex flex-wrap gap-2">
        {DISTRIBUTORS.map((d) => {
          const active = d.slug === source;
          return (
            <button
              key={d.slug}
              type="button"
              disabled={!d.enabled}
              onClick={() => {
                if (!d.enabled || active) return;
                setSearch("");
                navigate({ source: d.slug, q: "", brand: "", category: "", page: 1 });
              }}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                !d.enabled
                  ? "cursor-not-allowed border-border text-muted-foreground/50"
                  : active
                    ? "border-foreground bg-foreground text-background"
                    : "cursor-pointer border-border text-foreground hover:bg-muted",
              )}
            >
              {d.name}
              {!d.enabled ? <span className="ml-1.5 text-[10px]">soon</span> : null}
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
            placeholder="Search style # or name…"
            className="pl-9"
          />
        </div>
        <Combobox
          options={brandOptions}
          value={filters.brand === "" ? ALL : filters.brand}
          onChange={(v) => navigate({ brand: v === ALL ? "" : v, page: 1 })}
          placeholder="All brands"
          searchPlaceholder="Search brands…"
          emptyText="No brands."
          className="w-full sm:w-52"
        />
        <Select
          value={filters.category === "" ? ALL : filters.category}
          onValueChange={(v) => navigate({ category: v === ALL ? "" : v, page: 1 })}
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
      <div
        className={cn(
          "divide-y divide-border rounded-lg border border-border transition-opacity",
          isPending && "opacity-60",
        )}
      >
        {products.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No products match your filters.
          </p>
        ) : (
          products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              tenantCategories={tenantCategories}
              importedInfo={importedMap.get(p.id) ?? null}
              onImported={(info) => {
                setImportedMap((prev) => new Map(prev).set(p.id, info));
                router.refresh();
              }}
              onCategoryChange={(categoryId) => {
                setImportedMap((prev) => {
                  const next = new Map(prev);
                  const cur = next.get(p.id);
                  if (cur) next.set(p.id, { ...cur, categoryId });
                  return next;
                });
                router.refresh();
              }}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "product" : "products"}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </span>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page <= 1 || isPending}
              onClick={() => navigate({ page: page - 1 })}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page >= totalPages || isPending}
              onClick={() => navigate({ page: page + 1 })}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  tenantCategories,
  importedInfo,
  onImported,
  onCategoryChange,
}: {
  product: DistributorProduct;
  tenantCategories: TenantCategory[];
  importedInfo: ImportedInfo | null;
  onImported: (info: ImportedInfo) => void;
  onCategoryChange: (categoryId: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const name = cleanName(product.name, product.brand, product.styleNumber);
  const headline = [product.brand, product.styleNumber, product.category]
    .filter(Boolean)
    .join(" · ");

  const categoryOptions = [
    { value: NO_CATEGORY, label: "Uncategorized" },
    ...tenantCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  async function handleImport() {
    setBusy(true);
    const result = await importDistributorStyle(product.id);
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't import", { description: result.error });
      return;
    }
    toast.success("Added to catalog", {
      description: result.categoryName
        ? `Categorized as ${result.categoryName}`
        : "No category matched — pick one here or in the editor",
    });
    onImported({
      distributorProductId: product.id,
      tenantProductId: result.id,
      categoryId: result.categoryId,
    });
  }

  async function handleCategory(value: string) {
    if (!importedInfo) return;
    const categoryId = value === NO_CATEGORY ? null : value;
    const result = await setTenantProductCategory(importedInfo.tenantProductId, categoryId);
    if (!result.ok) {
      toast.error("Couldn't set category", { description: result.error });
      return;
    }
    onCategoryChange(categoryId);
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="size-full object-contain" />
        ) : (
          <Shirt className="size-5 text-muted-foreground/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{headline}</div>
        <div className="truncate text-sm text-muted-foreground">
          {name}
          {product.minPrice !== null ? ` · From ${formatCurrency(product.minPrice)}` : ""}
        </div>
      </div>
      {importedInfo ? (
        <div className="flex shrink-0 items-center gap-2">
          <Combobox
            options={categoryOptions}
            value={importedInfo.categoryId ?? NO_CATEGORY}
            onChange={handleCategory}
            placeholder="Category"
            searchPlaceholder="Search categories…"
            emptyText="No categories."
            className="h-8 w-40"
          />
          <Badge className="gap-1 border-transparent bg-success text-[10px] text-white">
            <Check className="size-3" /> In catalog
          </Badge>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={handleImport} disabled={busy}>
          {busy ? <Ring size="sm" className="text-current" /> : "Import"}
        </Button>
      )}
    </div>
  );
}
