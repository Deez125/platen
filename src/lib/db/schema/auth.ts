import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Mirror of `auth.users` so we can foreign-key into it from our public
 * schema. Supabase manages this table — we only declare the `id` column.
 */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

/**
 * profiles — 1:1 with auth.users.id. Holds editable user data that we want
 * queryable in joins (unlike auth.user_metadata, which lives in the JWT).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  // Denormalized from auth.users at signup so co-members' emails are queryable
  // without admin access (auth.users isn't readable under normal RLS).
  email: text("email"),
  // Flipped to true the moment the onboarding wizard completes successfully.
  // Middleware reads this to decide whether to force the wizard.
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  settings: jsonb("settings").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * organizations — a customer of the SaaS (a shop / company).
 * `tenant_id` on business tables is FK'd to organizations.id.
 */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Shareable code teammates enter at onboarding to join this org. */
    joinKey: text("join_key"),
    /** Square (1:1) logo. Used in the sidebar org switcher and other compact contexts. */
    logoUrl: text("logo_url"),
    /** Wide/landscape logo. Used in PDFs, email headers, and the customer portal. */
    logoWideUrl: text("logo_wide_url"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 4 }).default("0"),
    defaultMinQuantity: numeric("default_min_quantity").default("1"),
    quoteNumberPrefix: text("quote_number_prefix").default("Q-"),
    invoiceNumberPrefix: text("invoice_number_prefix").default("INV-"),
    // Server-side document numbering: prefix + zero-padded sequence.
    nextQuoteNumber: integer("next_quote_number").default(1).notNull(),
    nextInvoiceNumber: integer("next_invoice_number").default(1).notNull(),
    quoteNumberPadLength: integer("quote_number_pad_length").default(5).notNull(),
    invoiceNumberPadLength: integer("invoice_number_pad_length").default(5).notNull(),
    /** "sequential" = incrementing counter; "random" = random padded number. */
    documentNumberMode: text("document_number_mode").default("sequential").notNull(),
    /**
     * Default per-item markup added on top of each unit's wholesale cost when
     * computing tenant sell price. For v0.1 this is a flat $ amount; later
     * we'll support percent / tiered methods.
     */
    defaultUnitMarkup: numeric("default_unit_markup", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    subscriptionPlan: text("subscription_plan").default("trial"),
    subscriptionStatus: text("subscription_status").default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("organizations_slug_unique").on(table.slug)],
);

/**
 * memberships — JOIN between profiles and organizations.
 * Role lives here (not on profiles or organizations) because a person can
 * have different roles in different orgs.
 */
export const membershipRoles = ["owner", "admin", "member", "production", "readonly"] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    invitedBy: uuid("invited_by").references(() => profiles.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("memberships_user_org_unique").on(table.userId, table.organizationId),
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_organization_id_idx").on(table.organizationId),
  ],
);
