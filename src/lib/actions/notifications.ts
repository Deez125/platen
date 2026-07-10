"use server";

import { getActiveContext } from "@/lib/auth/session";
import type { NotificationEntity, NotificationType } from "@/lib/notifications/notify";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  entityType: NotificationEntity | string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

type ListResult =
  | { ok: true; notifications: NotificationItem[]; unread: number }
  | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

type Row = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

const FEED_LIMIT = 30;

/** The current user's notifications in the active org, newest first. */
export async function getNotifications(): Promise<ListResult> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, entity_type, entity_id, read_at, created_at")
    .eq("tenant_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as Row[];
  const notifications: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    entityType: r.entity_type,
    entityId: r.entity_id,
    read: r.read_at !== null,
    createdAt: r.created_at,
  }));
  return {
    ok: true,
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  };
}

/** Mark one notification read (RLS scopes this to the caller's own rows). */
export async function markNotificationRead(id: string): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Mark every unread notification in the active org read. */
export async function markAllNotificationsRead(): Promise<Result> {
  const ctx = await getActiveContext();
  if (!ctx) return { ok: false, error: "No active organization" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("tenant_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
