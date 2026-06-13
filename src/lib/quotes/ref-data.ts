import { getActiveOrgId } from "@/lib/auth/session";
import type { CustomProductConfig } from "@/lib/catalog/custom-product";
import type { PaymentInstallment } from "@/lib/payments/payment-terms";
import type { PdfOrg } from "@/lib/pdf/snapshot";
import type {
  QuoteRefData,
  RefCategory,
  RefColor,
  RefColorTier,
  RefCustomer,
  RefFee,
  RefPaymentTerm,
  RefPlacement,
  RefProduct,
  RefSize,
} from "@/lib/quotes/types";
import { createClient } from "@/lib/supabase/server";

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  is_tax_exempt: boolean;
  tax_exempt_id: string | null;
  default_payment_terms: string | null;
  logo_url: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  category_id: string | null;
  min_quantity: number | null;
  source: string;
  config: CustomProductConfig | null;
  product_categories: { name: string } | null;
  tenant_product_pricing: {
    min_quantity: number;
    max_quantity: number | null;
    unit_price: string | number;
    cost: string | number | null;
  }[];
};

/**
 * Everything the quote builder needs, in one server call. Every per-tenant
 * query is filtered by the active org id (RLS is the backstop, but a multi-org
 * user belongs to several tenants, so the explicit filter is what scopes the
 * data). Returns null when there's no active org (caller should redirect).
 */
export async function getQuoteRefData(): Promise<QuoteRefData | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: customers },
    { data: products },
    { data: categories },
    { data: sizes },
    { data: colors },
    { data: placements },
    { data: colorTiers },
    { data: fees },
    { data: paymentTerms },
    { data: org },
    { data: membership },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, name, company, email, phone, address_line1, address_line2, city, state, postal_code, country, is_tax_exempt, tax_exempt_id, default_payment_terms, logo_url",
      )
      .eq("tenant_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("tenant_products")
      .select(
        "id, name, image_url, category_id, min_quantity, source, config, product_categories(name), tenant_product_pricing(min_quantity, max_quantity, unit_price, cost)",
      )
      .eq("tenant_id", orgId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("product_categories")
      .select("id, name")
      .eq("tenant_id", orgId)
      .order("sort_order", { ascending: true }),
    // size_options has no tenant_id of its own — scope it through its group.
    supabase
      .from("size_options")
      .select("label, upcharge, sort_order, size_groups!inner(tenant_id)")
      .eq("size_groups.tenant_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("color_options")
      .select("id, name, hex")
      .eq("tenant_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("placement_options")
      .select("id, name, default_price")
      .eq("tenant_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("color_count_pricing")
      .select("color_count, price")
      .eq("tenant_id", orgId)
      .order("color_count", { ascending: true }),
    supabase
      .from("fees")
      .select("id, name, default_amount, is_per_color")
      .eq("tenant_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("payment_term_options")
      .select("id, name, is_default, installments")
      .eq("tenant_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("organizations")
      .select("default_tax_rate, default_unit_markup")
      .eq("id", orgId)
      .maybeSingle(),
    user
      ? supabase
          .from("memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const customerList: RefCustomer[] = ((customers as CustomerRow[] | null) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    addressLine1: c.address_line1,
    addressLine2: c.address_line2,
    city: c.city,
    state: c.state,
    postalCode: c.postal_code,
    country: c.country,
    isTaxExempt: c.is_tax_exempt,
    taxExemptId: c.tax_exempt_id,
    defaultPaymentTerms: c.default_payment_terms,
    logoUrl: c.logo_url,
  }));

  // De-dupe sizes by label (a tenant may have multiple size groups in v0.1).
  const seenSizes = new Set<string>();
  const sizeList: RefSize[] = [];
  for (const s of (sizes as { label: string; upcharge: string | number | null }[] | null) ?? []) {
    if (seenSizes.has(s.label)) continue;
    seenSizes.add(s.label);
    sizeList.push({ label: s.label, upcharge: num(s.upcharge) });
  }

  const productList: RefProduct[] = ((products as unknown as ProductRow[] | null) ?? []).map(
    (p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.image_url,
      categoryId: p.category_id,
      categoryName: p.product_categories?.name ?? null,
      minQuantity: p.min_quantity,
      source: p.source,
      config: p.config,
      pricing: (p.tenant_product_pricing ?? []).map((t) => ({
        minQuantity: t.min_quantity,
        maxQuantity: t.max_quantity,
        unitPrice: num(t.unit_price),
        cost: t.cost === null ? null : num(t.cost),
      })),
    }),
  );

  const role = (membership as { role?: string } | null)?.role ?? "";

  return {
    customers: customerList,
    products: productList,
    categories: ((categories as RefCategory[] | null) ?? []) as RefCategory[],
    sizes: sizeList,
    colors: ((colors as RefColor[] | null) ?? []) as RefColor[],
    placements: (
      (placements as
        | { id: string; name: string; default_price: string | number | null }[]
        | null) ?? []
    ).map((p): RefPlacement => ({ id: p.id, name: p.name, defaultPrice: num(p.default_price) })),
    colorTiers: (
      (colorTiers as { color_count: number; price: string | number }[] | null) ?? []
    ).map((t): RefColorTier => ({ colorCount: t.color_count, price: num(t.price) })),
    fees: (
      (fees as
        | {
            id: string;
            name: string;
            default_amount: string | number | null;
            is_per_color: boolean;
          }[]
        | null) ?? []
    ).map(
      (f): RefFee => ({
        id: f.id,
        name: f.name,
        defaultAmount: num(f.default_amount),
        isPerColor: f.is_per_color,
      }),
    ),
    paymentTerms: (
      (paymentTerms as
        | {
            id: string;
            name: string;
            is_default: boolean;
            installments: PaymentInstallment[] | null;
          }[]
        | null) ?? []
    ).map(
      (t): RefPaymentTerm => ({
        id: t.id,
        name: t.name,
        isDefault: t.is_default,
        installments: t.installments ?? [],
      }),
    ),
    defaultTaxRate: num((org as { default_tax_rate?: string | number } | null)?.default_tax_rate),
    defaultMarkup: num(
      (org as { default_unit_markup?: string | number } | null)?.default_unit_markup,
    ),
    canSeeProfit: role === "owner" || role === "admin",
  };
}

type OrgPdfRow = {
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  logo_url: string | null;
  logo_wide_url: string | null;
};

/** Branding info the PDF template needs (separate from QuoteRefData so the
 *  shape lines up with PdfOrg without polluting the builder's reference data). */
export async function getOrgPdfInfo(): Promise<PdfOrg | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "name, email, phone, address_line1, address_line2, city, state, postal_code, country, logo_url, logo_wide_url",
    )
    .eq("id", orgId)
    .maybeSingle<OrgPdfRow>();

  if (!data) return null;

  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    addressLine1: data.address_line1,
    addressLine2: data.address_line2,
    city: data.city,
    state: data.state,
    postalCode: data.postal_code,
    country: data.country,
    logoUrl: data.logo_url,
    logoWideUrl: data.logo_wide_url,
  };
}
