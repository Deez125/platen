import { z } from "zod";

/** Money input: non-negative, at most 2 decimals. */
const money = z.coerce
  .number()
  .min(0, "Must be 0 or more")
  .multipleOf(0.01, "At most 2 decimal places");

/** Import a distributor product into the tenant catalog with a base price. */
export const importProductSchema = z.object({
  distributorProductId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  unitPrice: money,
  cost: money.nullable(),
});
export type ImportProductInput = z.infer<typeof importProductSchema>;

/** Edit a tenant product's catalog fields. */
export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  categoryId: z.string().uuid().nullable(),
  description: z.string().trim().nullable(),
  minQuantity: z.coerce.number().int().min(0).nullable(),
  isActive: z.boolean(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** A single quantity-break pricing tier. */
export const pricingTierSchema = z.object({
  id: z.string().uuid().optional(),
  minQuantity: z.coerce.number().int().min(1, "Min qty must be at least 1"),
  maxQuantity: z.coerce.number().int().min(1).nullable(),
  unitPrice: money,
  cost: money.nullable(),
});
export type PricingTierInput = z.infer<typeof pricingTierSchema>;

/** The full set of tiers for a product (replaces existing on save). */
export const pricingTiersSchema = z
  .array(pricingTierSchema)
  .min(1, "At least one pricing tier is required");
export type PricingTiersInput = z.infer<typeof pricingTiersSchema>;
