/**
 * Distributor adapter contract (spec §10).
 *
 * Each distributor (SanMar, S&S, …) implements this once. The shapes below are
 * NORMALIZED — independent of any distributor's wire format — and map directly
 * onto our `distributor_products` / `distributor_product_variants` tables. A
 * sync job calls these and upserts the results, so adding a real distributor
 * never changes the rest of the app.
 */

/** A catalog style (maps to distributor_products). */
export type DistributorProductInput = {
  styleNumber: string;
  brand: string;
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
};

/** A color/size variant of a style (maps to distributor_product_variants). */
export type DistributorVariantInput = {
  styleNumber: string;
  colorName: string;
  colorHex: string | null;
  sizeLabel: string;
  sku: string | null;
  wholesalePrice: number | null;
};

/** A live inventory level for one variant. */
export type InventoryLevel = {
  sku: string;
  colorName: string;
  sizeLabel: string;
  available: number;
};

export interface DistributorAdapter {
  /** Matches distributor_sources.slug (e.g. "sanmar"). */
  readonly slug: string;
  /** Pull the catalog styles. */
  syncProducts(): Promise<DistributorProductInput[]>;
  /** Pull color/size variants for one style. */
  syncVariants(styleNumber: string): Promise<DistributorVariantInput[]>;
  /** Live inventory for one style. */
  getInventory(styleNumber: string): Promise<InventoryLevel[]>;
}
