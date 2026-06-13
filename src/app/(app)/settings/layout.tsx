import type { ReactNode } from "react";

import { SettingsNav } from "@/components/layout/settings-nav";
import { getActiveContext } from "@/lib/auth/session";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const ctx = await getActiveContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1 border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, your organization, and how you bill.
        </p>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <SettingsNav role={ctx?.role ?? ""} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
