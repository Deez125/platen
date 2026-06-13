"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { settingsSections } from "@/components/layout/settings-nav-config";
import { cn } from "@/lib/utils";

export function SettingsNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isOwner = role === "owner";
  const isManager = role === "owner" || role === "admin";

  function allowed(minRole?: "admin" | "owner"): boolean {
    if (!minRole) return true;
    return minRole === "owner" ? isOwner : isManager;
  }

  return (
    <nav className="flex flex-col gap-6">
      {settingsSections.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const disabled = !allowed(item.minRole);
              const className = cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                item.danger
                  ? active
                    ? "bg-destructive/10 text-destructive"
                    : "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  : active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              );

              return (
                <li key={item.href}>
                  {disabled ? (
                    <span
                      aria-disabled="true"
                      className={cn(
                        "flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        item.danger ? "text-destructive/40" : "text-muted-foreground/40",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </span>
                  ) : (
                    <Link href={item.href} className={className}>
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
