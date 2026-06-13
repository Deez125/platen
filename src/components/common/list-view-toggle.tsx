"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared list⇄grid toggle for the list pages (quotes / invoices / jobs). */
export function ListViewToggle({
  view,
  status,
  basePath,
}: {
  view: "list" | "grid";
  status?: string;
  basePath: string;
}) {
  function href(v: "list" | "grid") {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (v === "grid") params.set("view", "grid");
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border bg-background p-0.5">
      <ToggleLink href={href("list")} active={view === "list"} label="List view">
        <List className="size-4" />
      </ToggleLink>
      <ToggleLink href={href("grid")} active={view === "grid"} label="Grid view">
        <LayoutGrid className="size-4" />
      </ToggleLink>
    </div>
  );
}

function ToggleLink({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-[5px] px-2.5 transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
