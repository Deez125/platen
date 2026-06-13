"use client";

import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  view: "list" | "grid";
};

export function CustomersViewToggle({ view }: Props) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border bg-background p-0.5">
      <ToggleLink href="/customers?view=list" active={view === "list"} label="List view">
        <List className="size-4" />
      </ToggleLink>
      <ToggleLink href="/customers?view=grid" active={view === "grid"} label="Grid view">
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
  children: React.ReactNode;
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
