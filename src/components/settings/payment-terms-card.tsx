"use client";

import { Check, Pencil, Plus, Star, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { savePaymentTerms } from "@/lib/actions/pricing-rules";
import { formatCurrency } from "@/lib/format";
import {
  type InstallmentMode,
  type PaymentInstallment,
  type PaymentTerm,
  type PaymentTrigger,
  TRIGGER_OPTIONS,
  coverage,
  isBalanced,
  newInstallment,
  newPaymentTerm,
  scheduleFor,
  triggerLabel,
} from "@/lib/payments/payment-terms";

const clone = (term: PaymentTerm): PaymentTerm => ({
  ...term,
  installments: term.installments.map((i) => ({ ...i })),
});

const toInput = (term: PaymentTerm) => ({
  name: term.name,
  isDefault: term.isDefault,
  installments: term.installments,
});

export function PaymentTermsCard({ initialTerms }: { initialTerms: PaymentTerm[] }) {
  const [terms, setTerms] = useState<PaymentTerm[]>(initialTerms);
  const [draft, setDraft] = useState<PaymentTerm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  function startEdit(term: PaymentTerm) {
    setDraft(clone(term));
    setIsNew(false);
  }

  function startAdd() {
    setDraft(newPaymentTerm());
    setIsNew(true);
  }

  function cancelEdit() {
    setDraft(null);
    setIsNew(false);
  }

  /** Optimistically apply `next`, persist the whole set, and revert on error. */
  async function persist(next: PaymentTerm[]) {
    const prev = terms;
    setTerms(next);
    setSaving(true);
    const result = await savePaymentTerms(next.map(toInput));
    setSaving(false);
    if (!result.ok) {
      setTerms(prev);
      toast.error("Couldn't save payment terms", { description: result.error });
    }
  }

  function saveDraft(saved: PaymentTerm) {
    let next = isNew ? [...terms, saved] : terms.map((t) => (t.id === saved.id ? saved : t));
    // Exactly one default.
    if (saved.isDefault) {
      next = next.map((t) => (t.id === saved.id ? t : { ...t, isDefault: false }));
    }
    cancelEdit();
    void persist(next);
  }

  function removeTerm(id: string) {
    let next = terms.filter((t) => t.id !== id);
    // If we deleted the default, promote the first remaining term.
    if (!next.some((t) => t.isDefault) && next.length > 0) {
      const [first, ...rest] = next;
      if (first) next = [{ ...first, isDefault: true }, ...rest];
    }
    void persist(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Payment terms
          {saving ? <Ring size="sm" className="text-muted-foreground" /> : null}
        </CardTitle>
        <CardDescription>
          How you collect payment. Pick one per quote — the default is pre-selected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {terms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment terms yet.</p>
        ) : (
          <div className="space-y-2">
            {terms.map((term) =>
              draft && draft.id === term.id ? (
                <TermEditor key={term.id} draft={draft} onSave={saveDraft} onCancel={cancelEdit} />
              ) : (
                <TermRow
                  key={term.id}
                  term={term}
                  onEdit={() => startEdit(term)}
                  onRemove={() => removeTerm(term.id)}
                  disabled={draft !== null}
                />
              ),
            )}
          </div>
        )}

        {isNew && draft ? (
          <TermEditor draft={draft} onSave={saveDraft} onCancel={cancelEdit} />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={startAdd}
            disabled={draft !== null}
          >
            <Plus className="size-4" /> Add payment term
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TermRow({
  term,
  onEdit,
  onRemove,
  disabled,
}: {
  term: PaymentTerm;
  onEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{term.name || "Untitled term"}</span>
          {term.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Star className="size-3 fill-current" /> Default
            </span>
          ) : null}
        </div>
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {term.installments.map((inst) => (
            <li key={inst.id}>
              <span className="text-foreground">{inst.label || "Installment"}</span>{" "}
              {inst.mode === "percent" ? `${inst.value}%` : formatCurrency(inst.value)} ·{" "}
              {triggerLabel(inst.trigger, inst.netDays)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          disabled={disabled}
          aria-label="Edit term"
          className="text-muted-foreground"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove term"
          className="text-muted-foreground"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function TermEditor({
  draft,
  onSave,
  onCancel,
}: {
  draft: PaymentTerm;
  onSave: (term: PaymentTerm) => void;
  onCancel: () => void;
}) {
  const [term, setTerm] = useState<PaymentTerm>(draft);
  const [sample, setSample] = useState("1000");
  const total = Number(sample) || 0;

  function updateInst(index: number, patch: Partial<PaymentInstallment>) {
    setTerm((t) => ({
      ...t,
      installments: t.installments.map((inst, i) => (i === index ? { ...inst, ...patch } : inst)),
    }));
  }

  function addInst() {
    setTerm((t) => ({
      ...t,
      installments: [...t.installments, newInstallment("Balance", "on_completion")],
    }));
  }

  function removeInst(index: number) {
    setTerm((t) => ({ ...t, installments: t.installments.filter((_, i) => i !== index) }));
  }

  const schedule = scheduleFor(term, total);
  const balanced = isBalanced(term, total);
  const pct = Math.round(coverage(term, total) * 100);
  const canSave = term.name.trim() !== "" && term.installments.length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-primary/40 bg-muted/30 p-3">
      <div className="space-y-2">
        <Label htmlFor="term-name">Name</Label>
        <Input
          id="term-name"
          value={term.name}
          onChange={(e) => setTerm((t) => ({ ...t, name: e.target.value }))}
          placeholder="50% deposit / balance on pickup"
        />
      </div>

      <div className="space-y-2">
        <Label>Installments</Label>
        {term.installments.map((inst, i) => (
          <div key={inst.id} className="flex flex-wrap items-center gap-2">
            <Input
              value={inst.label}
              onChange={(e) => updateInst(i, { label: e.target.value })}
              placeholder="Deposit"
              className="min-w-28 flex-1"
            />
            <Input
              inputMode="decimal"
              value={String(inst.value)}
              onChange={(e) => updateInst(i, { value: Number(e.target.value) || 0 })}
              className="w-20"
              aria-label="Amount"
            />
            <Select
              value={inst.mode}
              onValueChange={(v) => updateInst(i, { mode: v as InstallmentMode })}
            >
              <SelectTrigger className="w-16" aria-label="Mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="fixed">$</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={inst.trigger}
              onValueChange={(v) => updateInst(i, { trigger: v as PaymentTrigger })}
            >
              <SelectTrigger className="w-48" aria-label="Due when">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {inst.trigger === "net_days" ? (
              <Input
                inputMode="numeric"
                value={String(inst.netDays)}
                onChange={(e) => updateInst(i, { netDays: Number(e.target.value) || 0 })}
                className="w-16"
                aria-label="Net days"
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeInst(i)}
              disabled={term.installments.length === 1}
              aria-label="Remove installment"
              className="text-muted-foreground"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addInst}>
            <Plus className="size-4" /> Installment
          </Button>
          <span
            className={
              balanced
                ? "inline-flex items-center gap-1 text-xs font-medium text-success"
                : "inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-500"
            }
          >
            {balanced ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
            Collects {pct}%
          </span>
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Preview on a</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              inputMode="decimal"
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              className="h-7 w-24"
              aria-label="Sample order total"
            />
            <span className="text-xs text-muted-foreground">order</span>
          </div>
        </div>
        <ul className="space-y-1 text-sm">
          {schedule.map((inst) => (
            <li key={inst.id} className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {inst.label || "Installment"} · {inst.dueLabel}
              </span>
              <span className="font-medium tabular-nums">{formatCurrency(inst.amount)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={term.isDefault}
            onChange={(e) => setTerm((t) => ({ ...t, isDefault: e.target.checked }))}
            className="size-4 cursor-pointer"
          />
          Set as default
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => onSave(term)} disabled={!canSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
