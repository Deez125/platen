import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveContext } from "@/lib/auth/session";
import { isOwnerRole, requireSettingsAccess } from "@/lib/auth/settings-access";

export default async function BillingSettingsPage() {
  // Billing is owner-only — admins + members get bounced back.
  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding");
  await requireSettingsAccess(isOwnerRole(ctx.role));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Manage your plan, payment method, and invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge variant="info">Trial</Badge>
          </div>
          <CardDescription>You're on the free trial. No card on file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" disabled>
            Upgrade
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Plans & checkout land when Stripe is wired up.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <CardTitle>Payment method</CardTitle>
          </div>
          <CardDescription>No card on file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" disabled>
            Add card
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Receipts for past billing periods.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
