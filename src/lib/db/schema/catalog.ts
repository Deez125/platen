import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { CustomProductConfig } from "@/lib/catalog/custom-product";
import { organizations } from "./auth";

/**
 * Catalog schema (spec §5).
 *
 * Tenant-scoped tables: product_categories, size_groups, size_options,
 * color_options, tenant_products, tenant_product_pricing.
 *   - size_options has no tenant_id of its own — it inherits tenancy through
 *     size_group_id → size_groups.tenant_id (RLS checks via the group).
 *
 * Shared (no tenant_id, read-only to tenants): distributor_sources,
 * distributor_products, distributor_product_variants. These are synced from
 * distributor APIs (seeded locally for v0.1) and imported into tenant_products.
 */

export const decorationMethods = ["screen_print", "embroidery", "dtf", "vinyl"] as const;
export type DecorationMethod = (typeof decorationMethods)[number];

export const productSources = ["distributor", "custom"] as const;
export type ProductSource = (typeof productSources)[number];

/** Tenant-configurable replacement for hardcoded "shirt/hoodie/koozie". */
export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** One of `decorationMethods`; drives workflow logic. */
    decorationMethod: text("decoration_method"),
    defaultMinQuantity: integer("default_min_quantity"),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("product_categories_tenant_slug_unique").on(table.tenantId, table.slug),
    index("product_categories_tenant_id_idx").on(table.tenantId),
  ],
);

/** A named, ordered set of sizes (e.g. "Adult Tee Sizes"). */
export const sizeGroups = pgTable(
  "size_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("size_groups_tenant_id_idx").on(table.tenantId)],
);

/** Individual sizes within a group. Tenancy inherited via size_group_id. */
export const sizeOptions = pgTable(
  "size_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sizeGroupId: uuid("size_group_id")
      .notNull()
      .references(() => sizeGroups.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull(),
    upcharge: numeric("upcharge", { precision: 10, scale: 2 }).default("0"),
  },
  (table) => [
    unique("size_options_group_label_unique").on(table.sizeGroupId, table.label),
    index("size_options_group_id_idx").on(table.sizeGroupId),
  ],
);

/** Generic per-tenant color list (garment colors, custom inks). */
export const colorOptions = pgTable(
  "color_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hex: text("hex"),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("color_options_tenant_id_idx").on(table.tenantId)],
);

// ── Shared distributor catalog (no tenant_id) ────────────────────────

export const distributorSources = pgTable("distributor_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const distributorProducts = pgTable(
  "distributor_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    distributorId: uuid("distributor_id")
      .notNull()
      .references(() => distributorSources.id, { onDelete: "cascade" }),
    styleNumber: text("style_number").notNull(),
    brand: text("brand").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Raw category from distributor; mapped to tenant categories on import. */
    category: text("category"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    /**
     * Denormalized browse hints, computed at import time so the catalog list
     * never has to join/aggregate the ~416K variants. min_price is the lowest
     * piece price across this style's variants ("From $X.XX").
     */
    colorCount: integer("color_count").default(0).notNull(),
    minPrice: numeric("min_price", { precision: 10, scale: 2 }),
    /** Entire distributor payload for future use. */
    raw: jsonb("raw"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("distributor_products_distributor_style_unique").on(
      table.distributorId,
      table.styleNumber,
    ),
    index("distributor_products_brand_style_idx").on(table.brand, table.styleNumber),
  ],
);

export const distributorProductVariants = pgTable(
  "distributor_product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    distributorProductId: uuid("distributor_product_id")
      .notNull()
      .references(() => distributorProducts.id, { onDelete: "cascade" }),
    colorName: text("color_name").notNull(),
    colorHex: text("color_hex"),
    sizeLabel: text("size_label").notNull(),
    sku: text("sku"),
    /** Piece price — the v0.1 cost basis (Option 1). Markup builds on this. */
    wholesalePrice: numeric("wholesale_price", { precision: 10, scale: 2 }),
    /**
     * Case price + case size, captured now but unused until quantity-aware
     * pricing (Option 3, v0.x). For ~76% of SKUs case_price < piece_price;
     * the discount applies when ordering a full case of this exact SKU.
     */
    casePrice: numeric("case_price", { precision: 10, scale: 2 }),
    caseSize: integer("case_size"),
    inventoryQuantity: integer("inventory_quantity"),
    isAvailable: boolean("is_available").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("distributor_variants_product_color_size_unique").on(
      table.distributorProductId,
      table.colorName,
      table.sizeLabel,
    ),
    index("distributor_variants_product_id_idx").on(table.distributorProductId),
  ],
);

// ── Tenant products (a distributor or custom product in the tenant's catalog) ──

export const tenantProducts = pgTable(
  "tenant_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    /** One of `productSources`. */
    source: text("source").notNull(),
    /** Required when source = distributor. */
    distributorProductId: uuid("distributor_product_id").references(() => distributorProducts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    minQuantity: integer("min_quantity"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order"),
    /** Custom-product config (base price + pricing blocks + methods). Null for distributor products. */
    config: jsonb("config").$type<CustomProductConfig>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("tenant_products_tenant_category_idx").on(table.tenantId, table.categoryId)],
);

/** Per-tenant pricing on a product. Supports tiered/quantity-break pricing. */
export const tenantProductPricing = pgTable(
  "tenant_product_pricing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tenantProductId: uuid("tenant_product_id")
      .notNull()
      .references(() => tenantProducts.id, { onDelete: "cascade" }),
    minQuantity: integer("min_quantity").default(1).notNull(),
    maxQuantity: integer("max_quantity"),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    /** The tenant's blank cost — drives profit calc. */
    cost: numeric("cost", { precision: 10, scale: 2 }),
  },
  (table) => [index("tenant_product_pricing_product_id_idx").on(table.tenantProductId)],
);
