import type {
  DistributorAdapter,
  DistributorProductInput,
  DistributorVariantInput,
  InventoryLevel,
} from "./types";

/**
 * S&S Activewear adapter — minimal stub for v0.1 (spec §10). Returns empty so
 * the registry is complete; real REST/PromoStandards calls land when the S&S
 * account + credentials are ready.
 */
export const ssActivewearAdapter: DistributorAdapter = {
  slug: "ssactivewear",
  async syncProducts(): Promise<DistributorProductInput[]> {
    return [];
  },
  async syncVariants(_styleNumber: string): Promise<DistributorVariantInput[]> {
    return [];
  },
  async getInventory(_styleNumber: string): Promise<InventoryLevel[]> {
    return [];
  },
};
