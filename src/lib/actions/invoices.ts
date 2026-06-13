"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActiveContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
type GenerateResult = { ok: true; invoiceId: string } | { ok: false; error: string };

const MANAGE_ROLES = new Set(["owner", "admin"]);

const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.string().trim().min(1).max(40).optional(),
  reference: z.string().trim().max(120).optional(),
  paidOn: z.string().trim().min(1).optional(), // YYYY-MM-DD
  notes: z.string().trim().max(500).optional(),
});
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

/**
 * Generate an invoice from an approved quote. The heavy lifting (snapshot of
 * line items + dedupe + tenant check) is atomic inside the generate_invoice RPC.
 * Owner/admin only.
 */
export async function generateInvoice(quoteId: string): Promise<GenerateResult> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  if (!MANAGE_ROLES.has(ctx.role)) {
    return { ok: false, error: "Only an owner or admin can generate invoices." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_invoice", { p_quote_id: quoteId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/invoices");
  return { ok: true, invoiceId: data as string };
}

/**
 * Record a payment against an invoice. Inserting the row is enough — a DB
 * trigger recomputes the invoice's amount_paid and auto-advances its status
 * (pending → deposit_paid → paid). Owner/admin only.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Result> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment" };
  }
  const data = parsed.data;

  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  if (!MANAGE_ROLES.has(ctx.role)) {
    return { ok: false, error: "Only an owner or admin can record payments." };
  }

  const supabase = await createClient();

  // Confirm the invoice belongs to the active org before attaching a payment.
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", data.invoiceId)
    .eq("tenant_id", ctx.orgId)
    .maybeSingle();
  if (!invoice) return { ok: false, error: "Invoice not found." };

  const { error } = await supabase.from("invoice_payments").insert({
    tenant_id: ctx.orgId,
    invoice_id: data.invoiceId,
    amount: Number(data.amount.toFixed(2)),
    method: data.method ?? null,
    reference: data.reference ?? null,
    paid_on: data.paidOn ?? undefined,
    notes: data.notes ?? null,
    recorded_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${data.invoiceId}`);
  return { ok: true };
}

/** Delete a payment. The recalc trigger walks the invoice status back down. */
export async function deletePayment(paymentId: string, invoiceId: string): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  if (!MANAGE_ROLES.has(ctx.role)) {
    return { ok: false, error: "Only an owner or admin can delete payments." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice_payments")
    .delete()
    .eq("id", paymentId)
    .eq("tenant_id", ctx.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/** Debug-only: permanently delete an invoice (cascades line items, payments,
 *  and any job generated from it). */
export async function deleteInvoice(invoiceId: string): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("tenant_id", ctx.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  revalidatePath("/jobs");
  revalidatePath("/quotes");
  return { ok: true };
}

/** Void an invoice (keeps the record but stops it counting as owed). */
export async function voidInvoice(invoiceId: string): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };
  if (!MANAGE_ROLES.has(ctx.role)) {
    return { ok: false, error: "Only an owner or admin can void invoices." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", invoiceId)
    .eq("tenant_id", ctx.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}
