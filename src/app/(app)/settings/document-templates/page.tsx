import { Check, FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveContext } from "@/lib/auth/session";
import { isManager, requireSettingsAccess } from "@/lib/auth/settings-access";
import { cn } from "@/lib/utils";

const templates = [
  { id: "default", name: "Default", description: "Clean, professional layout.", active: true },
  { id: "minimal", name: "Minimal", description: "Lots of whitespace, no chrome.", active: false },
  {
    id: "branded",
    name: "Branded",
    description: "Header band uses your primary color.",
    active: false,
  },
];

export default async function DocumentTemplatesSettingsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding");
  await requireSettingsAccess(isManager(ctx.role));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Document templates</h2>
        <p className="text-sm text-muted-foreground">
          The PDF layout used for quotes and invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Pick a template, or customize one in a later phase.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                t.active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                {t.active ? <Check className="size-4 text-primary" /> : null}
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              {t.active ? (
                <Badge variant="info" className="text-[10px]">
                  Active
                </Badge>
              ) : null}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms & footer</CardTitle>
          <CardDescription>Default text appended to outgoing documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Template editor lands in a later phase.</p>
          <Button size="sm" variant="outline" className="mt-4" disabled>
            Edit template
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
