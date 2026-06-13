"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteCustomer } from "@/lib/actions/customers";

type Props = {
  customerId: string;
  customerName: string;
};

export function CustomerDeleteButton({ customerId, customerName }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteCustomer(customerId);
    if (!result.ok) {
      toast.error("Couldn't delete customer", { description: result.error });
      return;
    }
    toast.success("Customer deleted");
    router.push("/customers");
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="size-4" /> Delete
        </Button>
      }
      title={`Delete ${customerName}?`}
      description="This permanently removes the customer. Quotes and invoices already issued to them keep their saved details and are not affected."
      confirmLabel="Delete customer"
      variant="destructive"
      onConfirm={handleDelete}
    />
  );
}
