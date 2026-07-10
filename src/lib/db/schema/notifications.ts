import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organizations, profiles } from "./auth";

/**
 * In-app notifications — the bell menu's activity feed. One row per recipient
 * per event (so read state is per-user), created by the `notify_org` RPC which
 * fans an event out to every member of the tenant.
 *
 * `entityType` + `entityId` let the UI deep-link to the thing that changed
 * (quote / invoice / job / customer). Notifications are immutable except for
 * `readAt`, so there's no updated_at trigger here.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Recipient.
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // quote_approved | quote_declined | payment_recorded | invoice_paid |
    // job_delivered | member_joined | ...
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    // For deep-linking: 'quote' | 'invoice' | 'job' | 'customer' | null.
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Feed query: a user's notifications in the active tenant, newest first.
    index("notifications_tenant_user_created_idx").on(
      table.tenantId,
      table.userId,
      table.createdAt,
    ),
  ],
);
