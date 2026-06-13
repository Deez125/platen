"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { MoneyInput } from "@/components/forms/money-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deletePayment, recordPayment } from "@/lib/actions/invoices";
import { paymentMethods } from "@/lib/db/schema/invoices";
import { formatCurrency, formatDate } from "@/lib/format";

export type PaymentRow = {
  id: string;
  amount: string;
  method: string | null;
  reference: string | null;
  paidOn: string;
  notes: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  check: "Check",
  ach: "ACH",
  other: "Other",
};

export function PaymentsCard({
  invoiceId,
  amountDue,
  suggestedAmount,
  canManage,
  payments,
}: {
  invoiceId: string;
  amountDue: number;
  /** Next installment's outstanding amount (from the payment schedule); the
   *  dialog prefills this when present, otherwise the full amount due. */
  suggestedAmount?: number;
  canManage: boolean;
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("card");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function openDialog() {
    const prefill = suggestedAmount && suggestedAmount > 0 ? suggestedAmount : amountDue;
    setAmount(prefill > 0 ? prefill.toFixed(2) : "");
    setMethod("card");
    setReference("");
    setNotes("");
    setOpen(true);
  }

  async function handleRecord() {
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a payment amount");
      return;
    }
    setBusy(true);
    const result = await recordPayment({
      invoiceId,
      amount: value,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't record payment", { description: result.error });
      return;
    }
    toast.success("Payment recorded");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(paymentId: string) {
    const result = await deletePayment(paymentId, invoiceId);
    if (!result.ok) {
      toast.error("Couldn't delete payment", { description: result.error });
      return;
    }
    toast.success("Payment removed");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payments</CardTitle>
            <CardDescription>{formatCurrency(amountDue)} due</CardDescription>
          </div>
          {canManage && amountDue > 0 ? (
            <Button size="sm" onClick={openDialog} className="gap-1.5">
              <Plus className="size-4" /> Record payment
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {METHOD_LABELS[p.method ?? ""] ?? p.method ?? "Payment"} ·{" "}
                    {formatDate(p.paidOn)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                {canManage ? (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete payment"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    title="Delete this payment?"
                    description="The invoice's paid amount and status will recalculate."
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={() => handleDelete(p.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>{formatCurrency(amountDue)} currently due.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <MoneyInput
                id="pay-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pay-method">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="pay-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {METHOD_LABELS[m] ?? m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-ref">Reference</Label>
                <Input
                  id="pay-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Check #1234"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notes</Label>
              <Input
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleRecord} disabled={busy}>
              {busy ? <Ring size="sm" className="text-current" /> : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
