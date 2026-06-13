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
import { deleteAccount } from "@/lib/actions/account";

const CONFIRM_WORD = "DELETE";

export function DeleteAccountCard({ ownedOrgNames }: { ownedOrgNames: string[] }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    // On success this redirects (never returns); only failures come back.
    const result = await deleteAccount();
    setDeleting(false);
    if (result && !result.ok) {
      toast.error("Couldn't delete account", { description: result.error });
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-destructive" />
          <CardTitle>Danger zone</CardTitle>
        </div>
        <CardDescription>Permanently delete your account. This cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
          Delete account
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
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {ownedOrgNames.length > 0 ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">
                  This also deletes {ownedOrgNames.length === 1 ? "your shop" : "your shops"} and
                  everything in {ownedOrgNames.length === 1 ? "it" : "them"}:
                </p>
                <p className="mt-1 text-muted-foreground">
                  {ownedOrgNames.join(", ")} — all customers, catalog, pricing rules, quotes,
                  invoices, jobs, and uploaded files.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You don't own any shops, so only your personal account is removed.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> to
                confirm
              </Label>
              <Input
                id="confirm-delete"
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
              {deleting ? <Ring size="sm" className="text-current" /> : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
