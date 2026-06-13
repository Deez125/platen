import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CustomerListSkeleton } from "@/components/customers/skeletons";
import { Button } from "@/components/ui/button";

export default function CustomersLoading() {
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Loading…"
        actions={
          <Button size="sm" className="gap-1.5" disabled>
            <Plus className="size-4" /> Add customer
          </Button>
        }
      />
      <CustomerListSkeleton />
    </>
  );
}
