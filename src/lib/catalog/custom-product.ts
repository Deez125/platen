/**
 * Shared shape for a fully-custom catalog product's configuration. Stored as
 * JSONB on `tenant_products.config` and produced by the custom product builder.
 *
 * Prices are kept as the user-entered strings here (the builder works in
 * strings); they're parsed to numbers when pricing flows into quotes.
 */

export type QtyRow = { min: string; max: string; price: string };
export type SizeRow = { label: string; upcharge: string };
export type ColorRow = { colors: string; price: string };
export type OptionChoice = { label: string; delta: string };
export type OptionGroup = { name: string; choices: OptionChoice[] };
export type FeeRow = { label: string; amount: string; perUnit: boolean };

export type CustomBlocks = {
  quantity: { on: boolean; rows: QtyRow[] };
  size: { on: boolean; rows: SizeRow[] };
  color: { on: boolean; rows: ColorRow[] };
  dimension: { on: boolean; unit: string; price: string; min: string };
  options: { on: boolean; groups: OptionGroup[] };
  fees: { on: boolean; rows: FeeRow[] };
};

export type CustomMethod = { id: string; name: string; steps: string[] };

export type CustomProductConfig = {
  unitLabel: string;
  basePrice: string;
  blocks: CustomBlocks;
  methods: CustomMethod[];
};

export function emptyBlocks(): CustomBlocks {
  return {
    quantity: { on: false, rows: [{ min: "1", max: "", price: "" }] },
    size: { on: false, rows: [{ label: "S", upcharge: "0" }] },
    color: { on: false, rows: [{ colors: "1", price: "" }] },
    dimension: { on: false, unit: "sqft", price: "", min: "" },
    options: { on: false, groups: [{ name: "", choices: [{ label: "", delta: "" }] }] },
    fees: { on: false, rows: [{ label: "", amount: "", perUnit: false }] },
  };
}

export function emptyCustomConfig(): CustomProductConfig {
  return { unitLabel: "", basePrice: "", blocks: emptyBlocks(), methods: [] };
}

/* --------------------------- Quote-time selections --------------------------- */

/** A customer's choices for a custom product on a quote line. */
export type CustomSelections = {
  /** Option group name → chosen choice label. */
  options: Record<string, string>;
  colorCount: string;
};

export function defaultSelections(config: CustomProductConfig): CustomSelections {
  const options: Record<string, string> = {};
  if (config.blocks.options.on) {
    for (const g of config.blocks.options.groups) {
      options[g.name] = g.choices[0]?.label ?? "";
    }
  }
  return { options, colorCount: config.blocks.color.on ? "1" : "" };
}

const toNum = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function quantityTierPrice(rows: QtyRow[], qty: number): number | null {
  if (rows.length === 0) return null;
  const tiers = rows
    .map((r) => ({
      min: Math.trunc(toNum(r.min)) || 1,
      max: r.max.trim() === "" ? null : Math.trunc(toNum(r.max)),
      price: toNum(r.price),
    }))
    .sort((a, b) => a.min - b.min);
  let match: number | null = tiers[0]?.price ?? null;
  for (const t of tiers) {
    if (qty >= t.min && (t.max === null || qty <= t.max)) return t.price;
    if (qty >= t.min) match = t.price;
  }
  return match;
}

function colorCountAdd(rows: ColorRow[], colorCount: number): number {
  if (colorCount <= 0) return 0;
  const tiers = rows
    .map((r) => ({ colors: Math.trunc(toNum(r.colors)), price: toNum(r.price) }))
    .filter((r) => r.colors > 0)
    .sort((a, b) => a.colors - b.colors);
  let add = 0;
  for (const t of tiers) {
    if (colorCount >= t.colors) add = t.price;
  }
  return add;
}

/**
 * Per-unit price for a custom product at a given total quantity + selections.
 * Combines: base price (or the matching quantity-tier price) + option deltas +
 * color-count add. Excludes per-size upcharge and flat fees (handled elsewhere).
 */
export function customUnitBase(
  config: CustomProductConfig,
  totalQty: number,
  sel: CustomSelections,
): number {
  let price = toNum(config.basePrice);
  if (config.blocks.quantity.on) {
    const tier = quantityTierPrice(config.blocks.quantity.rows, totalQty);
    if (tier !== null) price = tier;
  }
  if (config.blocks.options.on) {
    for (const g of config.blocks.options.groups) {
      const chosen = sel.options[g.name];
      const choice = g.choices.find((c) => c.label === chosen) ?? g.choices[0];
      price += toNum(choice?.delta ?? "");
    }
  }
  price += colorCountAdd(config.blocks.color.rows, Math.trunc(toNum(sel.colorCount)));
  return price;
}
