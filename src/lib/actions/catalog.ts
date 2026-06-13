"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActiveOrgId } from "@/lib/auth/session";
import { matchTenantCategory } from "@/lib/catalog/category-match";
import type { CustomProductConfig } from "@/lib/catalog/custom-product";
import {
  type ImportProductInput,
  type PricingTiersInput,
  type UpdateProductInput,
  importProductSchema,
  pricingTiersSchema,
  updateProductSchema,
} from "@/lib/schemas/catalog";
import { createClient } from "@/lib/supabase/server";

type CreateResult = { ok: true; id: string } | { ok: false; error: string };
type ImportResult =
  | { ok: true; id: string; categoryId: string | null; categoryName: string | null }
  | { ok: false; error: string };
type MutateResult = { ok: true } | { ok: false; error: string };

/**
 * Import a distributor product into the tenant catalog: snapshots the
 * distributor name/image into a tenant_products row (source = distributor)
 * and creates a base pricing tier.
 */
export async function importDistributorProduct(input: ImportProductInput): Promise<CreateResult> {
  const parsed = importProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };

  const supabase = await createClient();

  // Pull the distributor product to snapshot its name/image (shared table).
  const { data: dp, error: dpError } = await supabase
    .from("distributor_products")
    .select("id, name, image_url")
    .eq("id", parsed.data.distributorProductId)
    .maybeSingle();
  if (dpError) return { ok: false, error: dpError.message };
  if (!dp) return { ok: false, error: "Distributor product not found" };

  const { data: product, error: productError } = await supabase
    .from("tenant_products")
    .insert({
      tenant_id: orgId,
      category_id: parsed.data.categoryId,
      source: "distributor",
      distributor_product_id: dp.id,
      name: dp.name,
      image_url: dp.image_url,
    })
    .select("id")
    .single();
  if (productError) return { ok: false, error: productError.message };

  const { error: pricingError } = await supabase.from("tenant_product_pricing").insert({
    tenant_id: orgId,
    tenant_product_id: product.id,
    min_quantity: 1,
    max_quantity: null,
    unit_price: parsed.data.unitPrice.toFixed(2),
    cost: parsed.data.cost === null ? null : parsed.data.cost.toFixed(2),
  });
  if (pricingError) {
    // Roll back the orphaned product so a failed pricing insert isn't left dangling.
    await supabase.from("tenant_products").delete().eq("id", product.id);
    return { ok: false, error: pricingError.message };
  }

  revalidatePath("/catalog");
  return { ok: true, id: product.id };
}

/**
 * One-click import of a whole distributor style into the tenant catalog.
 * Cost basis = the style's min (piece) price from the shared distributor data;
 * sell price = cost + the org's default per-item markup. Snapshots name/image
 * onto a `tenant_products` row + a base pricing tier. The distributor's category
 * is auto-matched to one of the tenant's categories when confident, else left
 * unset for manual assignment in the product editor.
 */
export async function importDistributorStyle(distributorProductId: string): Promise<ImportResult> {
  if (typeof distributorProductId !== "string" || distributorProductId.length === 0) {
    return { ok: false, error: "Invalid product" };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };

  const supabase = await createClient();

  // Guard against double-import.
  const { data: existing } = await supabase
    .from("tenant_products")
    .select("id")
    .eq("tenant_id", orgId)
    .eq("distributor_product_id", distributorProductId)
    .maybeSingle();
  if (existing) return { ok: false, error: "Already in your catalog" };

  const { data: dp, error: dpError } = await supabase
    .from("distributor_products")
    .select("id, name, image_url, min_price, category")
    .eq("id", distributorProductId)
    .maybeSingle<{
      id: string;
      name: string;
      image_url: string | null;
      min_price: string | null;
      category: string | null;
    }>();
  if (dpError) return { ok: false, error: dpError.message };
  if (!dp) return { ok: false, error: "Distributor product not found" };

  const [{ data: org }, { data: tenantCategories }] = await Promise.all([
    supabase
      .from("organizations")
      .select("default_unit_markup")
      .eq("id", orgId)
      .maybeSingle<{ default_unit_markup: string | null }>(),
    supabase.from("product_categories").select("id, name"),
  ]);

  const markup = Number(org?.default_unit_markup ?? 0) || 0;
  const cost = dp.min_price === null ? null : Number(dp.min_price);
  const unitPrice = cost === null ? markup : cost + markup;

  const categories = (tenantCategories as { id: string; name: string }[] | null) ?? [];
  const categoryId = matchTenantCategory(dp.category, categories);
  const categoryName = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? null)
    : null;

  const { data: product, error: productError } = await supabase
    .from("tenant_products")
    .insert({
      tenant_id: orgId,
      source: "distributor",
      distributor_product_id: dp.id,
      category_id: categoryId,
      name: dp.name,
      image_url: dp.image_url,
    })
    .select("id")
    .single();
  if (productError) return { ok: false, error: productError.message };

  const { error: pricingError } = await supabase.from("tenant_product_pricing").insert({
    tenant_id: orgId,
    tenant_product_id: product.id,
    min_quantity: 1,
    max_quantity: null,
    unit_price: unitPrice.toFixed(2),
    cost: cost === null ? null : cost.toFixed(2),
  });
  if (pricingError) {
    await supabase.from("tenant_products").delete().eq("id", product.id);
    return { ok: false, error: pricingError.message };
  }

  revalidatePath("/catalog");
  return { ok: true, id: product.id, categoryId, categoryName };
}

/** Set (or clear) a tenant product's category — used by the inline picker on import. */
export async function setTenantProductCategory(
  tenantProductId: string,
  categoryId: string | null,
): Promise<MutateResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_products")
    .update({ category_id: categoryId })
    .eq("id", tenantProductId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/catalog");
  return { ok: true };
}

export async function updateTenantProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<MutateResult> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_products")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      description: parsed.data.description,
      min_quantity: parsed.data.minQuantity,
      is_active: parsed.data.isActive,
    })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/catalog");
  revalidatePath(`/catalog/products/${productId}`);
  return { ok: true };
}

export async function deleteTenantProduct(productId: string): Promise<MutateResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_products").delete().eq("id", productId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/catalog");
  return { ok: true };
}

/* ----------------------------- Custom products ----------------------------- */

const customProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  categoryId: z.string().uuid().nullable(),
  description: z.string().trim().max(2000).nullable(),
  minQuantity: z.number().int().positive().nullable(),
  imageUrl: z.string().url().nullable(),
  isActive: z.boolean(),
});

export type CustomProductInput = z.infer<typeof customProductSchema> & {
  config: CustomProductConfig;
};

/** Create a fully-custom catalog product (source = custom + config JSONB). */
export async function createCustomProduct(input: CustomProductInput): Promise<CreateResult> {
  const parsed = customProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_products")
    .insert({
      tenant_id: orgId,
      source: "custom",
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      description: parsed.data.description,
      image_url: parsed.data.imageUrl,
      min_quantity: parsed.data.minQuantity,
      is_active: parsed.data.isActive,
      config: input.config,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/catalog");
  return { ok: true, id: data.id };
}

/** Update an existing custom product. */
export async function updateCustomProduct(
  productId: string,
  input: CustomProductInput,
): Promise<MutateResult> {
  const parsed = customProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_products")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      description: parsed.data.description,
      image_url: parsed.data.imageUrl,
      min_quantity: parsed.data.minQuantity,
      is_active: parsed.data.isActive,
      config: input.config,
    })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/catalog");
  revalidatePath(`/catalog/products/${productId}`);
  return { ok: true };
}

type CreateCategoryResult = { ok: true; id: string; name: string } | { ok: false; error: string };

/** Create a tenant product category from the catalog (used by "+ New category"). */
export async function createCategory(name: string): Promise<CreateCategoryResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Category name is required" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };

  const slug =
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ tenant_id: orgId, name: trimmed, slug })
    .select("id, name")
    .single<{ id: string; name: string }>();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A category with that name already exists." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/catalog");
  return { ok: true, id: data.id, name: data.name };
}

/**
 * Replace a product's pricing tiers with the supplied set. Simplest correct
 * approach for v0.1: delete existing tiers for the product, insert the new set
 * (tenant-scoped so RLS guards both ends).
 */
export async function savePricingTiers(
  productId: string,
  tiers: PricingTiersInput,
): Promise<MutateResult> {
  const parsed = pricingTiersSchema.safeParse(tiers);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid pricing" };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization" };

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("tenant_product_pricing")
    .delete()
    .eq("tenant_product_id", productId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const rows = parsed.data.map((tier) => ({
    tenant_id: orgId,
    tenant_product_id: productId,
    min_quantity: tier.minQuantity,
    max_quantity: tier.maxQuantity,
    unit_price: tier.unitPrice.toFixed(2),
    cost: tier.cost === null ? null : tier.cost.toFixed(2),
  }));

  const { error: insertError } = await supabase.from("tenant_product_pricing").insert(rows);
  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/catalog");
  revalidatePath(`/catalog/products/${productId}`);
  return { ok: true };
}
