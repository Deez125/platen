/**
 * Debug-only: the date columns the date editor exposes per entity. Shared by
 * the debug menu (labels/inputs) and the server action (column whitelist — only
 * these may be written, so the editor can't touch arbitrary columns).
 *
 * `created_at` is the important one: it's auto-stamped "now", drives list
 * ordering + the activity timeline, and can't be set from the normal UI — so
 * backfilling historical orders needs it editable here.
 */

export type EntityKind = "quote" | "invoice" | "job";

export type DateField = {
  /** DB column name. */
  column: string;
  label: string;
  /** Whether the column accepts null (empty input clears it). */
  nullable: boolean;
};

export const DATE_FIELDS: Record<EntityKind, DateField[]> = {
  quote: [
    { column: "created_at", label: "Created", nullable: false },
    { column: "quote_date", label: "Quote date", nullable: false },
    { column: "expires_at", label: "Expires", nullable: true },
  ],
  invoice: [
    { column: "created_at", label: "Created", nullable: false },
    { column: "issue_date", label: "Issued", nullable: false },
    { column: "due_date", label: "Due", nullable: true },
  ],
  job: [
    { column: "created_at", label: "Created", nullable: false },
    { column: "due_date", label: "Due", nullable: true },
  ],
};

export const ENTITY_TABLE: Record<EntityKind, string> = {
  quote: "quotes",
  invoice: "invoices",
  job: "jobs",
};
