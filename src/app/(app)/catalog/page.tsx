import { PackagePlus, ShoppingCart, Wand2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { getActiveOrgId } from "@/lib/auth/session";
import type { CustomProductConfig } from "@/lib/catalog/custom-product";
import { createClient } from "@/lib/supabase/server";

type PricingRow = { unit_price: string | null };
type CategoryRef = { name: string } | null;

type ProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  source: string;
  config: CustomProductConfig | null;
  product_categories: CategoryRef;
  tenant_product_pricing: PricingRow[];
};

function startingPrice(pricing: PricingRow[]): number | null {
  const prices = pricing
    .map((p) => (p.unit_price === null ? Number.NaN : Number(p.unit_price)))
    .filter((n) => !Number.isNaN(n));
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

/** "Starting at" price for a custom product: base price, else lowest qty tier. */
function customStartingPrice(config: CustomProductConfig | null): number | null {
  if (!config) return null;
  const base = Number(config.basePrice);
  const baseSet = config.basePrice.trim() !== "" && Number.isFinite(base);
  if (baseSet && base > 0) return base;
  if (config.blocks?.quantity?.on) {
    const tiers = config.blocks.quantity.rows
      .map((r) => Number(r.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (tiers.length > 0) return Math.min(...tiers);
  }
  return baseSet ? base : null;
}

export default async function CatalogPage() {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const { data } = await supabase
    .from("tenant_products")
    .select(
      "id, name, image_url, is_active, source, config, product_categories(name), tenant_product_pricing(unit_price)",
    )
    .eq("tenant_id", orgId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as ProductRow[];

  return (
    <>
      <PageHeader
        title="Catalog"
        subtitle={`${rows.length} ${rows.length === 1 ? "product" : "products"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/catalog/custom/new">
                <Wand2 className="size-4" /> Add custom product
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/catalog/import">
                <PackagePlus className="size-4" /> Import from distributor
              </Link>
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No products yet"
          description="Import blanks from a distributor to start building quotes."
          action={
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/catalog/import">
                <PackagePlus className="size-4" /> Import from distributor
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((p) => {
            const isCustom = p.source === "custom";
            return (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                imageUrl={p.image_url}
                isActive={p.is_active}
                categoryName={p.product_categories?.name ?? null}
                startingPrice={
                  isCustom ? customStartingPrice(p.config) : startingPrice(p.tenant_product_pricing)
                }
                custom={isCustom}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
