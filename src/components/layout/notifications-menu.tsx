"use client";

import {
  Bell,
  CheckCheck,
  CircleCheck,
  DollarSign,
  FileText,
  type LucideIcon,
  PackageCheck,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Ring } from "@/components/ui/ring";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type NotificationItem,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  quote_approved: ReceiptText,
  quote_declined: FileText,
  payment_recorded: DollarSign,
  invoice_paid: CircleCheck,
  job_delivered: PackageCheck,
  member_joined: UserPlus,
};

const ENTITY_PATH: Record<string, string> = {
  quote: "/quotes",
  invoice: "/invoices",
  job: "/jobs",
  customer: "/customers",
};

function hrefFor(n: NotificationItem): string | null {
  if (!n.entityType || !n.entityId) return null;
  const base = ENTITY_PATH[n.entityType];
  return base ? `${base}/${n.entityId}` : null;
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    const res = await getNotifications();
    setLoading(false);
    if (res.ok) setNotifications(res.notifications);
  }, []);

  // Fetch once on mount so the unread dot is accurate before the menu opens,
  // then refresh each time it's opened.
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void markNotificationRead(id);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    void markAllNotificationsRead();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span
                  className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background"
                  aria-hidden="true"
                />
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all as read
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Ring className="text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            You're all caught up.
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                const href = hrefFor(n);
                const inner = (
                  <>
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                        {!n.read ? (
                          <span className="mt-1.5 ml-auto size-2 shrink-0 rounded-full bg-destructive" />
                        ) : null}
                      </div>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </>
                );
                const cls =
                  "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50";
                return (
                  <li key={n.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className={cls}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => markRead(n.id)} className={cls}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
