import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  description?: string;
  /** Page-specific icon shown big in the empty state. */
  pageIcon?: LucideIcon;
};

export function UnderConstruction({
  title,
  description,
  pageIcon: PageIcon = Construction,
}: Props) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <Card className="flex-1">
        <CardContent className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PageIcon className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Under construction</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              This page is a placeholder while we wire the rest of the app. Real content lands in a
              later phase.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
