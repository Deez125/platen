"use client";

import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { OrgInfo } from "@/components/layout/app-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { setActiveOrg } from "@/lib/actions/organization";
import { cn } from "@/lib/utils";

function formatPlan(plan: string) {
  if (!plan) return "Trial";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function OrgBadge({ org, size = "lg" }: { org: OrgInfo; size?: "lg" | "sm" }) {
  const wrapperBase =
    size === "lg"
      ? "aspect-square size-7 rounded-md group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:inset-0 group-data-[collapsible=icon]:m-auto group-data-[collapsible=icon]:size-6"
      : "aspect-square size-6 rounded";
  const iconSize = size === "lg" ? "size-4 group-data-[collapsible=icon]:size-3.5" : "size-3";

  return (
    <div
      className={cn(
        // Always-dark wrapper so transparent logos read the same in light and
        // dark mode, and the Store fallback icon stays legible regardless.
        "flex shrink-0 items-center justify-center overflow-hidden bg-neutral-900 text-neutral-50",
        wrapperBase,
      )}
    >
      {org.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={org.logoUrl} alt={org.name} className="size-full object-cover" />
      ) : (
        <Store className={iconSize} />
      )}
    </div>
  );
}

export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrgInfo[];
  activeOrgId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;

  function switchTo(orgId: string) {
    if (orgId === activeOrg?.id) return;
    startTransition(async () => {
      const result = await setActiveOrg(orgId);
      if (!result.ok) {
        toast.error("Couldn't switch organization", { description: result.error });
        return;
      }
      // Land on the dashboard so we're never left on a detail page that
      // belongs to the org we just switched away from.
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (!activeOrg) {
    // Shouldn't happen — middleware bounces unboarded users to /onboarding,
    // and onboarding always creates exactly one org. Defensive fallback so
    // the sidebar doesn't crash if the join returns empty.
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Store className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">No organization</span>
              <span className="truncate text-xs text-muted-foreground">—</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:relative"
            >
              <OrgBadge org={activeOrg} />
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatPlan(activeOrg.subscriptionPlan)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-60 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchTo(org.id)}
                disabled={pending}
                className="gap-2"
              >
                <OrgBadge org={org} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm">{org.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatPlan(org.subscriptionPlan)}
                  </span>
                </div>
                <Check
                  className={cn(
                    "ml-auto size-4",
                    org.id === activeOrg.id ? "opacity-100" : "opacity-0",
                  )}
                />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2">
              <Link href="/onboarding">
                <Plus className="size-4" />
                Add an organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
