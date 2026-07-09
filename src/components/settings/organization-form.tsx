"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui/ring";
import { updateOrganization } from "@/lib/actions/organization";
import { cn } from "@/lib/utils";

export type OrgFormData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  defaultTaxRate: number | null;
  defaultMinQuantity: number | null;
  quoteNumberPrefix: string | null;
  invoiceNumberPrefix: string | null;
  documentNumberMode: "sequential" | "random";
  nextQuoteNumber: number;
  nextInvoiceNumber: number;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  taxRatePct: string;
  minQuantity: string;
  quotePrefix: string;
  invoicePrefix: string;
  /** When true, quotes and invoices share one prefix string. */
  samePrefix: boolean;
  /** "sequential" = incrementing counter; "random" = random padded number. */
  numberMode: "sequential" | "random";
  /** Sequential only: the number the next document starts from. */
  startNumber: string;
};

/** Zero-pad width for the number preview (matches the org default). */
const NUMBER_PAD = 5;

function toFormState(org: OrgFormData): FormState {
  const quotePrefix = org.quoteNumberPrefix ?? "Q-";
  const invoicePrefix = org.invoiceNumberPrefix ?? "INV-";
  return {
    name: org.name,
    email: org.email ?? "",
    phone: org.phone ?? "",
    addressLine1: org.addressLine1 ?? "",
    addressLine2: org.addressLine2 ?? "",
    city: org.city ?? "",
    state: org.state ?? "",
    postalCode: org.postalCode ?? "",
    taxRatePct: org.defaultTaxRate != null ? (org.defaultTaxRate * 100).toString() : "",
    minQuantity: org.defaultMinQuantity != null ? org.defaultMinQuantity.toString() : "1",
    quotePrefix,
    invoicePrefix,
    // Pre-check the box if the two prefixes already match.
    samePrefix: quotePrefix === invoicePrefix,
    numberMode: org.documentNumberMode,
    startNumber: String(Math.max(org.nextQuoteNumber, org.nextInvoiceNumber)).padStart(
      NUMBER_PAD,
      "0",
    ),
  };
}

export function OrganizationForm({
  org,
  canEditShopInfo,
}: {
  org: OrgFormData;
  canEditShopInfo: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(org));
  const [saving, setSaving] = useState(false);
  // The number the counters currently sit at — only push a new start if it changes.
  const initialStart = Math.max(org.nextQuoteNumber, org.nextInvoiceNumber);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  // Re-pad the start number on blur so it reads like a real doc number (00232).
  const padStartNumber = () =>
    setForm((prev) => ({
      ...prev,
      startNumber:
        prev.startNumber.trim() === ""
          ? ""
          : String(Number.parseInt(prev.startNumber, 10) || 0).padStart(NUMBER_PAD, "0"),
    }));

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Shop name is required");
      return;
    }

    const taxRate = Number.parseFloat(form.taxRatePct) / 100;
    const minQuantity = Number.parseInt(form.minQuantity, 10) || 1;

    setSaving(true);
    const result = await updateOrganization({
      orgId: org.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      defaultTaxRate: Number.isFinite(taxRate) ? taxRate : 0,
      defaultMinQuantity: minQuantity,
      quotePrefix: form.quotePrefix,
      // When "same prefix" is on, invoices use the exact same prefix string.
      invoicePrefix: form.samePrefix ? form.quotePrefix : form.invoicePrefix,
      numberMode: form.numberMode,
      // Only reset the counters when sequential AND the start actually changed.
      startNumber:
        form.numberMode === "sequential" &&
        form.startNumber.trim() !== "" &&
        Number.parseInt(form.startNumber, 10) !== initialStart
          ? Number.parseInt(form.startNumber, 10)
          : null,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error("Couldn't save", { description: result.error });
      return;
    }
    toast.success("Saved");
  }

  const startInt = Number.parseInt(form.startNumber, 10);
  const startBase = Number.isFinite(startInt) && startInt > 0 ? startInt : 1;
  const seqExample = [0, 1, 2]
    .map((i) => `${form.quotePrefix}${String(startBase + i).padStart(NUMBER_PAD, "0")}`)
    .join(", ");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          Your shop's name, contact info, and address.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop info</CardTitle>
          <CardDescription>
            Shown on quotes, invoices, and emails.
            {!canEditShopInfo ? " Only the owner can edit this." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!canEditShopInfo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">
                Shop name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Acme Print Co."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-email">Contact email</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="hello@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-phone">Phone</Label>
                <Input
                  id="org-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-addr1">Address line 1</Label>
              <Input
                id="org-addr1"
                autoComplete="address-line1"
                value={form.addressLine1}
                onChange={(e) => update({ addressLine1: e.target.value })}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-addr2">
                Address line 2 <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="org-addr2"
                autoComplete="address-line2"
                value={form.addressLine2}
                onChange={(e) => update({ addressLine2: e.target.value })}
                placeholder="Suite 200"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-3">
              <div className="space-y-2">
                <Label htmlFor="org-city">City</Label>
                <Input
                  id="org-city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => update({ city: e.target.value })}
                  placeholder="Springfield"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-state">State</Label>
                <Input
                  id="org-state"
                  autoComplete="address-level1"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => update({ state: e.target.value.toUpperCase() })}
                  placeholder="IL"
                  className="w-16"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-zip">ZIP</Label>
                <Input
                  id="org-zip"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.postalCode}
                  onChange={(e) => update({ postalCode: e.target.value })}
                  placeholder="62701"
                  className="w-24"
                />
              </div>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>Used when creating new quotes and invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Default tax rate (%)</Label>
              <Input
                id="tax-rate"
                inputMode="decimal"
                value={form.taxRatePct}
                onChange={(e) => update({ taxRatePct: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-qty">Min order quantity</Label>
              <Input
                id="min-qty"
                type="number"
                value={form.minQuantity}
                onChange={(e) => update({ minQuantity: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {form.samePrefix ? (
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="doc-prefix">Document prefix</Label>
                <Input
                  id="doc-prefix"
                  value={form.quotePrefix}
                  onChange={(e) => update({ quotePrefix: e.target.value })}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="quote-prefix">Quote prefix</Label>
                  <Input
                    id="quote-prefix"
                    value={form.quotePrefix}
                    onChange={(e) => update({ quotePrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-prefix">Invoice prefix</Label>
                  <Input
                    id="invoice-prefix"
                    value={form.invoicePrefix}
                    onChange={(e) => update({ invoicePrefix: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="checkbox"
              checked={form.samePrefix}
              onChange={(e) => update({ samePrefix: e.target.checked })}
              className="sr-only"
            />
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded border transition-colors",
                form.samePrefix
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input",
              )}
            >
              {form.samePrefix ? <Check className="size-3" /> : null}
            </span>
            Use the same prefix for quotes and invoices
          </label>

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Numbering</Label>
            <div className="flex gap-2">
              {(["sequential", "random"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ numberMode: m })}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    form.numberMode === m
                      ? "border-foreground bg-foreground text-background"
                      : "cursor-pointer border-border text-foreground hover:bg-muted",
                  )}
                >
                  {m === "sequential" ? "Sequential" : "Random"}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="start-number">Start numbering at</Label>
              <Input
                id="start-number"
                inputMode="numeric"
                value={form.startNumber}
                onChange={(e) => update({ startNumber: e.target.value.replace(/[^\d]/g, "") })}
                onBlur={padStartNumber}
                disabled={form.numberMode === "random"}
                className="w-40"
              />
              {form.numberMode === "sequential" ? (
                <p className="text-xs text-muted-foreground">Counts up: {seqExample}…</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Random mode ignores this — each doc gets a random {NUMBER_PAD}-digit number, e.g.{" "}
                  {form.quotePrefix}12384, {form.quotePrefix}88471.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Ring size="sm" className="text-current" /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
