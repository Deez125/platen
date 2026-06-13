"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { Shortcut } from "@/components/common/shortcut";
import { DebugMenu } from "@/components/dev/debug-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <button
        type="button"
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        aria-label="Open command palette"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <span className="ml-auto">
          <Shortcut keys={["mod", "k"]} />
        </span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <DebugMenu />
        <NotificationsMenu />
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-2 !h-6 !self-center" />
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/quotes/new">
            <Plus className="size-4" /> New quote
          </Link>
        </Button>
      </div>
    </header>
  );
}
