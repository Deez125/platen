"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import type { CustomerSummary } from "@/components/customers/customer-card";
import { CustomerPickerDialog } from "@/components/quotes/customer-picker-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RefCustomer } from "@/lib/quotes/types";
import { cn } from "@/lib/utils";

export type CustomerSlice = {
  customerId: string | null;
  name: string;
  company: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  billToSameAsShipping: boolean;
  billToLine1: string;
  billToLine2: string;
  billToCity: string;
  billToState: string;
  billToPostalCode: string;
  billToCountry: string;

  isTaxExempt: boolean;
  customerTaxExemptId: string;
};

export function CustomerSection({
  value,
  onChange,
  customers,
  onSelectCustomer,
}: {
  value: CustomerSlice;
  onChange: (patch: Partial<CustomerSlice>) => void;
  customers: RefCustomer[];
  /** Fired when a saved customer is picked — lets the quote apply their
   *  defaults (e.g. payment terms) that live outside the customer slice. */
  onSelectCustomer?: (customer: RefCustomer) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const summaries: CustomerSummary[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    city: c.city,
    state: c.state,
    isTaxExempt: c.isTaxExempt,
    logoUrl: c.logoUrl,
  }));

  const selected = customers.find((c) => c.id === value.customerId) ?? null;
  const selectedLabel = selected
    ? selected.company
      ? `${selected.company} — ${selected.name}`
      : selected.name
    : "Select a customer";

  function handleSelectCustomer(customerId: string) {
    const c = customers.find((x) => x.id === customerId);
    if (!c) {
      onChange({ customerId });
      return;
    }
    // Snapshot the customer's fields onto the quote; tax-exempt defaults to
    // the customer's status (still overridable per quote).
    onChange({
      customerId: c.id,
      name: c.name,
      company: c.company ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      addressLine1: c.addressLine1 ?? "",
      addressLine2: c.addressLine2 ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      postalCode: c.postalCode ?? "",
      country: c.country ?? "US",
      isTaxExempt: c.isTaxExempt,
      customerTaxExemptId: c.taxExemptId ?? "",
    });
    onSelectCustomer?.(c);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "w-full justify-between gap-2 font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
        <CustomerPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          customers={summaries}
          onSelect={handleSelectCustomer}
        />

        {/* Contact (snapshot fields) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qcust-name">Name</Label>
            <Input
              id="qcust-name"
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qcust-company">Company</Label>
            <Input
              id="qcust-company"
              value={value.company}
              onChange={(e) => onChange({ company: e.target.value })}
              placeholder="Acme Co."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qcust-email">Email</Label>
            <Input
              id="qcust-email"
              type="email"
              value={value.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="jane@acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qcust-phone">Phone</Label>
            <Input
              id="qcust-phone"
              type="tel"
              value={value.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="(555) 555-5555"
            />
          </div>
        </div>

        {/* Shipping */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Shipping address</div>
          <Input
            value={value.addressLine1}
            onChange={(e) => onChange({ addressLine1: e.target.value })}
            placeholder="Address line 1"
          />
          <Input
            value={value.addressLine2}
            onChange={(e) => onChange({ addressLine2: e.target.value })}
            placeholder="Address line 2 (optional)"
          />
          <div className="grid grid-cols-[1fr_5rem_6rem] gap-2">
            <Input
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="City"
            />
            <Input
              value={value.state}
              maxLength={2}
              onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
              placeholder="ST"
            />
            <Input
              value={value.postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              placeholder="ZIP"
            />
          </div>
        </div>

        {/* Billing */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.billToSameAsShipping}
              onChange={(e) => onChange({ billToSameAsShipping: e.target.checked })}
              className="size-4 cursor-pointer"
            />
            <span>Bill to same as shipping</span>
          </label>
          {!value.billToSameAsShipping ? (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="text-xs font-medium text-muted-foreground">Billing address</div>
              <Input
                value={value.billToLine1}
                onChange={(e) => onChange({ billToLine1: e.target.value })}
                placeholder="Address line 1"
              />
              <Input
                value={value.billToLine2}
                onChange={(e) => onChange({ billToLine2: e.target.value })}
                placeholder="Address line 2 (optional)"
              />
              <div className="grid grid-cols-[1fr_5rem_6rem] gap-2">
                <Input
                  value={value.billToCity}
                  onChange={(e) => onChange({ billToCity: e.target.value })}
                  placeholder="City"
                />
                <Input
                  value={value.billToState}
                  maxLength={2}
                  onChange={(e) => onChange({ billToState: e.target.value.toUpperCase() })}
                  placeholder="ST"
                />
                <Input
                  value={value.billToPostalCode}
                  onChange={(e) => onChange({ billToPostalCode: e.target.value })}
                  placeholder="ZIP"
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Tax-exempt */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.isTaxExempt}
              onChange={(e) => onChange({ isTaxExempt: e.target.checked })}
              className="size-4 cursor-pointer"
            />
            <span>Tax exempt</span>
          </label>
          {value.isTaxExempt ? (
            <div className="space-y-2">
              <Label htmlFor="qcust-exempt">Resale / tax-exempt ID</Label>
              <Input
                id="qcust-exempt"
                value={value.customerTaxExemptId}
                onChange={(e) => onChange({ customerTaxExemptId: e.target.value })}
                placeholder="E-12345678"
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
