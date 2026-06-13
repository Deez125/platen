"use client";

import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui/ring";
import { deleteOrganization } from "@/lib/actions/organization";

const CONFIRM_WORD = "DELETE";

export function DeleteOrganizationCard({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    // On success this redirects to onboarding (never returns); only failures come back.
    const result = await deleteOrganization();
    setDeleting(false);
    if (result && !result.ok) {
      toast.error("Couldn't delete organization", { description: result.error });
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-destructive" />
          <CardTitle className="text-destructive">Delete organization</CardTitle>
        </div>
        <CardDescription>
          Permanently delete this organization and everything in it. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
          Delete organization
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {orgName}?</DialogTitle>
            <DialogDescription>
              This permanently removes the organization and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">This deletes everything in {orgName}:</p>
              <p className="mt-1 text-muted-foreground">
                All customers, catalog, pricing rules, quotes, invoices, jobs, team memberships, and
                uploaded files. Your account stays, but you'll be sent back to set up a new shop.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete-org">
                Type <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> to
                confirm
              </Label>
              <Input
                id="confirm-delete-org"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || deleting}>
              {deleting ? <Ring size="sm" className="text-current" /> : "Delete organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
