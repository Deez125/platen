import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

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
      <EmptyState
        icon={PageIcon}
        title="Under construction"
        description="This page is a placeholder while we wire the rest of the app. Real content lands in a later phase."
        className="flex-1"
      />
    </>
  );
}
