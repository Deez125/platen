"use server";

import { revalidatePath } from "next/cache";

import { getActiveContext } from "@/lib/auth/session";
import { DATE_FIELDS, ENTITY_TABLE, type EntityKind } from "@/lib/debug/date-fields";
import { createClient } from "@/lib/supabase/server";

type DatesResult = { ok: true; dates: Record<string, string> } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };
type NumberResult = { ok: true; number: string } | { ok: false; error: string };

const MANAGE_ROLES = new Set(["owner", "admin"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Reduce a stored value (date or timestamptz) to YYYY-MM-DD for a date input. */
function toDateInput(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return value.slice(0, 10);
}

/**
 * Debug-only: read an entity's editable date columns. Tenant-scoped. Returns a
 * `column -> YYYY-MM-DD` map (empty string for null).
 */
export async function getEntityDates(kind: EntityKind, id: string): Promise<DatesResult> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  const fields = DATE_FIELDS[kind];
  if (!fields) return { ok: false, error: "Unknown entity" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(ENTITY_TABLE[kind])
    .select(fields.map((f) => f.column).join(", "))
    .eq("id", id)
    .eq("tenant_id", ctx.orgId)
    .maybeSingle<Record<string, unknown>>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found" };

  const dates: Record<string, string> = {};
  for (const f of fields) dates[f.column] = toDateInput(data[f.column]);
  return { ok: true, dates };
}

/**
 * Debug-only: overwrite an entity's date columns (including created_at, which
 * the normal UI can't touch — used to backfill historical orders with real
 * dates). Owner/admin + tenant-scoped; only whitelisted columns are written.
 */
export async function setEntityDates(
  kind: EntityKind,
  id: string,
  values: Record<string, string>,
): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  if (!MANAGE_ROLES.has(ctx.role)) {
    return { ok: false, error: "Only an owner or admin can edit dates." };
  }
  const fields = DATE_FIELDS[kind];
  if (!fields) return { ok: false, error: "Unknown entity" };

  const update: Record<string, string | null> = {};
  for (const f of fields) {
    const raw = values[f.column];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (!f.nullable) return { ok: false, error: `${f.label} can't be empty.` };
      update[f.column] = null;
    } else {
      if (!ISO_DATE.test(trimmed)) return { ok: false, error: `${f.label} must be a valid date.` };
      update[f.column] = trimmed;
    }
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from(ENTITY_TABLE[kind])
    .update(update)
    .eq("id", id)
    .eq("tenant_id", ctx.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${ENTITY_TABLE[kind]}/${id}`);
  revalidatePath(`/${ENTITY_TABLE[kind]}`);
  return { ok: true };
}

/** Debug-only: read a quote's current number. Tenant-scoped. */
export async function getQuoteNumber(quoteId: string): Promise<NumberResult> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("id", quoteId)
    .eq("tenant_id", ctx.orgId)
    .maybeSingle<{ quote_number: string }>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found" };
  return { ok: true, number: data.quote_number };
}

/**
 * Debug-only: overwrite a quote's number (handy when numbering is random and you
 * want a specific value). Owner/admin + tenant-scoped; rejects duplicates.
 */
export async function setQuoteNumber(quoteId: string, quoteNumber: string): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  if (!MANAGE_ROLES.has(ctx.role)) {
    return { ok: false, error: "Only an owner or admin can edit the quote number." };
  }
  const value = quoteNumber.trim();
  if (!value) return { ok: false, error: "Quote number can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ quote_number: value })
    .eq("id", quoteId)
    .eq("tenant_id", ctx.orgId);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That quote number is already in use." };
    return { ok: false, error: error.message };
  }
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  return { ok: true };
}
