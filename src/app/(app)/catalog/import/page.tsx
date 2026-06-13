import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DistributorBrowser } from "@/components/catalog/distributor-browser";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { getActiveOrgId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 24;

type ProductRow = {
  id: string;
  brand: string;
  style_number: string;
  name: string;
  category: string | null;
  color_count: number;
  min_price: string | number | null;
  image_url: string | null;
};

export default async function ImportCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    brand?: string;
    category?: string;
    page?: string;
    source?: string;
  }>;
}) {
  const { q, brand, category, page: pageParam, source: sourceParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  // Split the query into words and match each one against brand / name / style#
  // (every word must hit at least one field). Lets "gildan 64000" find the
  // Gildan style 64000 even though the brand and style# live in separate columns.
  // Strip chars that would break PostgREST's or() filter syntax / act as wildcards.
  const terms = (q ?? "")
    .replace(/[,()%.]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  // Resolve the active distributor source (default SanMar) → its id, so we can
  // browse one distributor's catalog at a time.
  const { data: sourceRows } = await supabase.from("distributor_sources").select("id, slug");
  const sources = (sourceRows as { id: string; slug: string }[] | null) ?? [];
  const source = sources.some((s) => s.slug === sourceParam) ? (sourceParam as string) : "sanmar";
  const activeSourceId = sources.find((s) => s.slug === source)?.id ?? null;

  let query = supabase
    .from("distributor_products")
    .select("id, brand, style_number, name, category, color_count, min_price, image_url", {
      count: "exact",
    })
    .eq("is_active", true);
  if (activeSourceId) query = query.eq("distributor_id", activeSourceId);
  if (brand) query = query.eq("brand", brand);
  if (category) query = query.eq("category", category);
  // Each word is its own OR-group; chained .or() calls AND together.
  for (const w of terms) {
    query = query.or(`brand.ilike.%${w}%,name.ilike.%${w}%,style_number.ilike.%${w}%`);
  }
  query = query
    .order("brand", { ascending: true })
    .order("style_number", { ascending: true })
    .range(from, to);

  let facetQuery = supabase
    .from("distributor_products")
    .select("brand, category")
    .eq("is_active", true);
  if (activeSourceId) facetQuery = facetQuery.eq("distributor_id", activeSourceId);

  const [{ data, count }, { data: facetRows }, { data: imported }, { data: tenantCats }] =
    await Promise.all([
      query,
      // Facets for the filter controls (scoped to the active source).
      facetQuery,
      supabase
        .from("tenant_products")
        .select("id, distributor_product_id, category_id")
        .eq("tenant_id", orgId),
      supabase
        .from("product_categories")
        .select("id, name")
        .eq("tenant_id", orgId)
        .order("sort_order", { ascending: true }),
    ]);

  const rows = (data ?? []) as ProductRow[];
  const total = count ?? 0;

  const brandSet = new Set<string>();
  const categorySet = new Set<string>();
  for (const r of (facetRows as { brand: string | null; category: string | null }[] | null) ?? []) {
    if (r.brand) brandSet.add(r.brand);
    if (r.category) categorySet.add(r.category);
  }
  const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b));
  const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

  const tenantCategories = (tenantCats as { id: string; name: string }[] | null) ?? [];

  // distributor_product_id → the tenant product it was imported as (+ its category).
  const importedRows =
    (imported as
      | { id: string; distributor_product_id: string | null; category_id: string | null }[]
      | null) ?? [];
  const importedInfo = importedRows
    .filter((r) => r.distributor_product_id !== null)
    .map((r) => ({
      distributorProductId: r.distributor_product_id as string,
      tenantProductId: r.id,
      categoryId: r.category_id,
    }));

  const products = rows.map((r) => ({
    id: r.id,
    brand: r.brand,
    styleNumber: r.style_number,
    name: r.name,
    category: r.category,
    colorCount: r.color_count,
    minPrice: r.min_price === null ? null : Number(r.min_price),
    imageUrl: r.image_url,
  }));

  return (
    <>
      <PageHeader
        title="Import from distributor"
        subtitle="Add blanks from a distributor's catalog to your products."
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/catalog">
              <ArrowLeft className="size-4" /> Back to catalog
            </Link>
          </Button>
        }
      />
      <DistributorBrowser
        products={products}
        brands={brands}
        categories={categories}
        tenantCategories={tenantCategories}
        imported={importedInfo}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        source={source}
        filters={{ q: q ?? "", brand: brand ?? "", category: category ?? "" }}
      />
    </>
  );
}
