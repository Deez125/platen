import { sanmarAdapter } from "./sanmar";
import { ssActivewearAdapter } from "./ssactivewear";
import type { DistributorAdapter } from "./types";

/** Registry of distributor adapters, keyed by slug (matches distributor_sources.slug). */
const adapters: Record<string, DistributorAdapter> = {
  [sanmarAdapter.slug]: sanmarAdapter,
  [ssActivewearAdapter.slug]: ssActivewearAdapter,
};

export function getDistributorAdapter(slug: string): DistributorAdapter | null {
  return adapters[slug] ?? null;
}

export function listDistributorAdapters(): DistributorAdapter[] {
  return Object.values(adapters);
}

export type {
  DistributorAdapter,
  DistributorProductInput,
  DistributorVariantInput,
  InventoryLevel,
} from "./types";
