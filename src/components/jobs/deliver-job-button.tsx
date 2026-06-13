"use client";

import { PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { markJobDelivered } from "@/lib/actions/jobs";

/** Shown when every work unit is ready, so the order can be marked delivered. */
export function DeliverJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDeliver() {
    setBusy(true);
    const result = await markJobDelivered(jobId);
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't mark delivered", { description: result.error });
      return;
    }
    toast.success("Job delivered");
    router.refresh();
  }

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" disabled={busy} className="gap-1.5">
          <PackageCheck className="size-4" /> Mark delivered
        </Button>
      }
      title="Mark this job delivered?"
      description="This closes out the order. You can't undo it here."
      confirmLabel="Mark delivered"
      onConfirm={handleDeliver}
    />
  );
}
