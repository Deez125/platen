import Link from "next/link";

import { cn } from "@/lib/utils";

export type ListFilter = { value: string; label: string };

/**
 * Shared pill filter chips for the list pages (quotes / invoices / jobs).
 * Preserves the chosen grid/list view when switching status.
 */
export function ListFilterTabs({
  basePath,
  active,
  view,
  filters,
}: {
  basePath: string;
  active: string;
  view?: "list" | "grid";
  filters: ListFilter[];
}) {
  function href(value: string) {
    const params = new URLSearchParams();
    if (value !== "all") params.set("status", value);
    if (view === "grid") params.set("view", "grid");
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => (
        <Link
          key={f.value}
          href={href(f.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            active === f.value
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
