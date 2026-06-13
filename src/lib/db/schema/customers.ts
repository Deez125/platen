import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./auth";

/**
 * customers — per-tenant CRM table. `tenant_id` is the org the customer
 * belongs to (FK to organizations). RLS scopes reads/writes by membership.
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    isTaxExempt: boolean("is_tax_exempt").default(false).notNull(),
    taxExemptId: text("tax_exempt_id"),
    defaultPaymentTerms: text("default_payment_terms"),
    notes: text("notes"),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("customers_tenant_id_idx").on(table.tenantId),
    index("customers_tenant_company_idx").on(table.tenantId, table.company),
  ],
);
