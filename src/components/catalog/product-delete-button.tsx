"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteTenantProduct } from "@/lib/actions/catalog";

type Props = {
  productId: string;
  productName: string;
};

export function ProductDeleteButton({ productId, productName }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteTenantProduct(productId);
    if (!result.ok) {
      toast.error("Couldn't delete product", { description: result.error });
      return;
    }
    toast.success("Product deleted");
    router.push("/catalog");
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="size-4" /> Delete
        </Button>
      }
      title={`Delete ${productName}?`}
      description="This removes the product and its pricing from your catalog. Quotes that already reference it keep their saved line-item details."
      confirmLabel="Delete product"
      variant="destructive"
      onConfirm={handleDelete}
    />
  );
}
