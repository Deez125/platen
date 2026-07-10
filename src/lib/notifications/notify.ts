import type { createClient } from "@/lib/supabase/server";

type DbClient = Awaited<ReturnType<typeof createClient>>;

/** Event kinds the app raises notifications for. */
export type NotificationType =
  | "quote_approved"
  | "quote_declined"
  | "payment_recorded"
  | "invoice_paid"
  | "job_delivered"
  | "member_joined";

/** Entity a notification deep-links to. */
export type NotificationEntity = "quote" | "invoice" | "job" | "customer";

type NotifyParams = {
  tenantId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: NotificationEntity;
  entityId?: string;
};

/**
 * Fan an event out to every member of the tenant as an in-app notification.
 * Best-effort: notifications should never break the action that triggered them,
 * so any failure is swallowed (and logged server-side).
 */
export async function notifyOrg(supabase: DbClient, params: NotifyParams): Promise<void> {
  const { error } = await supabase.rpc("notify_org", {
    p_tenant: params.tenantId,
    p_type: params.type,
    p_title: params.title,
    p_body: params.body ?? null,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
  });
  if (error) {
    console.error("notifyOrg failed:", error.message);
  }
}
