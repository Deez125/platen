"use client";

import { Copy, GitBranch, MoreHorizontal, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui/ring";
import {
  approveQuote,
  createRevision,
  declineQuote,
  deleteQuote,
  duplicateQuote,
  revertQuoteToSent,
} from "@/lib/actions/quotes";

type Props = {
  quoteId: string;
  quoteNumber: string;
  status: string;
};

const APPROVABLE = new Set(["draft", "sent", "viewed", "revised"]);

export function QuoteStatusActions({ quoteId, quoteNumber, status }: Props) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [approverName, setApproverName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleApprove() {
    if (!approverName.trim()) {
      toast.error("Enter the approver's name");
      return;
    }
    setBusy(true);
    const result = await approveQuote(quoteId, approverName);
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't approve", { description: result.error });
      return;
    }
    toast.success("Quote approved");
    setApproveOpen(false);
    setApproverName("");
    router.refresh();
  }

  async function handleDecline() {
    const result = await declineQuote(quoteId);
    if (!result.ok) {
      toast.error("Couldn't decline", { description: result.error });
      return;
    }
    toast.success("Quote declined");
    router.refresh();
  }

  async function handleDuplicate() {
    const result = await duplicateQuote(quoteId);
    if (!result.ok) {
      toast.error("Couldn't duplicate", { description: result.error });
      return;
    }
    toast.success("Duplicate created");
    router.push(`/quotes/${result.id}`);
  }

  async function handleRevision() {
    const result = await createRevision(quoteId);
    if (!result.ok) {
      toast.error("Couldn't create revision", { description: result.error });
      return;
    }
    toast.success("Revision created");
    router.push(`/quotes/${result.id}`);
  }

  async function handleDelete() {
    const result = await deleteQuote(quoteId);
    if (!result.ok) {
      toast.error("Couldn't delete", { description: result.error });
      return;
    }
    toast.success("Quote deleted");
    router.push("/quotes");
  }

  async function handleUndo() {
    const result = await revertQuoteToSent(quoteId);
    if (!result.ok) {
      toast.error("Couldn't undo", { description: result.error });
      return;
    }
    toast.success(status === "approved" ? "Approval undone" : "Decline undone");
    router.refresh();
  }

  const canApprove = APPROVABLE.has(status);
  const canUndo = status === "approved" || status === "declined";

  return (
    <div className="flex items-center gap-2">
      {canApprove ? (
        <>
          <Button size="sm" variant="outline" onClick={handleDecline} className="gap-1.5">
            <X className="size-3.5" /> Decline
          </Button>
          <Button size="sm" onClick={() => setApproveOpen(true)}>
            Approve
          </Button>
        </>
      ) : null}

      {canUndo ? (
        <Button size="sm" variant="outline" onClick={handleUndo}>
          {status === "approved" ? "Undo approve" : "Undo decline"}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleDuplicate} className="gap-2">
            <Copy className="size-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRevision} className="gap-2">
            <GitBranch className="size-4" /> Create revision
          </DropdownMenuItem>
          <ConfirmDialog
            trigger={
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
                className="gap-2"
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            }
            title={`Delete ${quoteNumber}?`}
            description="This permanently removes the quote and its line items."
            confirmLabel="Delete quote"
            variant="destructive"
            onConfirm={handleDelete}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {quoteNumber}</DialogTitle>
            <DialogDescription>
              Capture who approved it on the customer's side (manually for now).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approver">Approved by</Label>
            <Input
              id="approver"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={busy}>
              {busy ? <Ring size="sm" className="text-current" /> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
