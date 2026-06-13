import { Mail, Package, ShoppingBag } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveContext } from "@/lib/auth/session";
import { isManager, requireSettingsAccess } from "@/lib/auth/settings-access";

const integrations = [
  {
    name: "SanMar",
    description: "Sync the SanMar catalog and inventory in real time.",
    Icon: Package,
    status: "available" as const,
  },
  {
    name: "S&S Activewear",
    description: "Pull S&S Activewear products and pricing.",
    Icon: ShoppingBag,
    status: "available" as const,
  },
  {
    name: "Resend (email)",
    description: "Send transactional emails to customers from your domain.",
    Icon: Mail,
    status: "coming-soon" as const,
  },
];

export default async function IntegrationsSettingsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding");
  await requireSettingsAccess(isManager(ctx.role));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect distributors, email, and other external services.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>Click any service to start the connection flow.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {integrations.map(({ name, description, Icon, status }) => (
            <div key={name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{name}</p>
                    {status === "coming-soon" ? (
                      <Badge variant="neutral" className="text-[10px]">
                        Coming soon
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={status === "coming-soon"}>
                Connect
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
