"use client";

import { Bell, CheckCheck, type LucideIcon, ReceiptText, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  read: boolean;
};

// Sample data until notifications are wired to real events. The first one is
// unread so the bell shows its red dot out of the box.
const SAMPLE: Notification[] = [
  {
    id: "1",
    icon: ReceiptText,
    title: "Quote Q-0007 was approved",
    description: "Acme Print Co. approved their quote — you can generate an invoice now.",
    time: "2h ago",
    read: false,
  },
  {
    id: "2",
    icon: UserPlus,
    title: "New teammate joined",
    description: "Jordan Vega joined your shop with the join key.",
    time: "Yesterday",
    read: true,
  },
];

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <Popover>
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

        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            You're all caught up.
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
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
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.description}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">{n.time}</p>
                      </div>
                    </button>
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
