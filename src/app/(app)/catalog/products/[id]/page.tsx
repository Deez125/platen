import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomProductBuilder } from "@/components/catalog/custom-product-builder";
import { ProductDeleteButton } from "@/components/catalog/product-delete-button";
import { ProductEditor } from "@/components/catalog/product-editor";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { getActiveOrgId } from "@/lib/auth/session";
import { type CustomProductConfig, emptyCustomConfig } from "@/lib/catalog/custom-product";
import { createClient } from "@/lib/supabase/server";

type PricingRow = {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: string;
  cost: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  source: string;
  min_quantity: number | null;
  is_active: boolean;
  config: CustomProductConfig | null;
  tenant_product_pricing: PricingRow[];
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("tenant_products")
      .select(
        "id, name, description, image_url, category_id, source, min_quantity, is_active, config, tenant_product_pricing(id, min_quantity, max_quantity, unit_price, cost)",
      )
      .eq("id", id)
      .eq("tenant_id", orgId)
      .maybeSingle<ProductRow>(),
    supabase
      .from("product_categories")
      .select("id, name")
      .eq("tenant_id", orgId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!product) {
    notFound();
  }

  // Custom products open in the block builder (their own header + save/delete).
  if (product.source === "custom") {
    return (
      <CustomProductBuilder
        orgId={orgId}
        productId={product.id}
        categories={(categories ?? []) as { id: string; name: string }[]}
        initial={{
          name: product.name,
          categoryId: product.category_id,
          description: product.description ?? "",
          minQuantity: product.min_quantity,
          isActive: product.is_active,
          imageUrl: product.image_url,
          config: product.config ?? emptyCustomConfig(),
        }}
      />
    );
  }

  const tiers = [...product.tenant_product_pricing].sort((a, b) => a.min_quantity - b.min_quantity);

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={product.source === "distributor" ? "Distributor product" : "Custom product"}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/catalog">
                <ArrowLeft className="size-4" /> Catalog
              </Link>
            </Button>
            <ProductDeleteButton productId={product.id} productName={product.name} />
          </div>
        }
      />
      <ProductEditor
        productId={product.id}
        imageUrl={product.image_url}
        categories={(categories ?? []) as { id: string; name: string }[]}
        initial={{
          name: product.name,
          categoryId: product.category_id,
          description: product.description ?? "",
          minQuantity: product.min_quantity,
          isActive: product.is_active,
        }}
        initialTiers={tiers.map((t) => ({
          id: t.id,
          minQuantity: t.min_quantity,
          maxQuantity: t.max_quantity,
          unitPrice: t.unit_price,
          cost: t.cost,
        }))}
      />
    </>
  );
}
