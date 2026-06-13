"use client";

import { ArrowLeft, ArrowRight, Check, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { completeOnboarding, joinWithKey } from "@/lib/actions/onboarding";
import { BRAND } from "@/lib/config/brand";
import { cn } from "@/lib/utils";

type Step = 1 | 2;

type FormState = {
  name: string;
  email: string;
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
};

const initialState: FormState = {
  name: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  taxRatePct: "9.25",
  minQuantity: "12",
  quotePrefix: "Q-",
  invoicePrefix: "INV-",
  samePrefix: false,
};

const steps: Array<{ id: Step; title: string; description: string }> = [
  { id: 1, title: "Shop info", description: "Name, contact, and address" },
  { id: 2, title: "Defaults", description: "Tax, quote numbering, minimums" },
];

/**
 * `isReturning` = the user already belongs to an org and is here to add another
 * (or join one with a key). It surfaces a "Back to dashboard" escape hatch,
 * since this page is full-screen with no sidebar.
 */
export function OnboardingWizard({ isReturning }: { isReturning: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialState);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinKey, setJoinKey] = useState("");
  const [joining, setJoining] = useState(false);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  async function handleJoin() {
    if (!joinKey.trim()) {
      toast.error("Enter a join key");
      return;
    }
    setJoining(true);
    const result = await joinWithKey(joinKey);
    setJoining(false);
    if (!result.ok) {
      toast.error("Couldn't join", { description: result.error });
      return;
    }
    toast.success("You're in", { description: "Joined the shop — heading to the dashboard." });
    router.push("/dashboard");
    router.refresh();
  }

  function canAdvance() {
    if (step === 1) return form.name.trim().length > 0;
    return true;
  }

  async function handleFinish() {
    if (!form.name.trim()) {
      toast.error("Shop name is required", {
        description: "Add one in step 1 before finishing.",
      });
      setStep(1);
      return;
    }

    const taxRate = Number.parseFloat(form.taxRatePct) / 100;
    const minQuantity = Number.parseInt(form.minQuantity, 10) || 1;

    setSubmitting(true);
    const result = await completeOnboarding({
      name: form.name,
      email: form.email,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      taxRate: Number.isFinite(taxRate) ? taxRate : 0,
      minQuantity,
      quotePrefix: form.quotePrefix,
      // When "same prefix" is on, invoices use the exact same prefix string.
      invoicePrefix: form.samePrefix ? form.quotePrefix : form.invoicePrefix,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error("Couldn't finish onboarding", { description: result.error });
      return;
    }

    toast.success(isReturning ? "Organization created" : "Welcome to your shop", {
      description: "All set — heading to your dashboard.",
    });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        {isReturning ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        ) : null}

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Store className="size-4" />
            </div>
            {BRAND.name}
          </div>
          <span className="text-xs text-muted-foreground">
            Step {step} of {steps.length}
          </span>
        </header>

        {isReturning ? (
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Add an organization</h1>
            <p className="text-sm text-muted-foreground">
              Set up another shop, or join an existing one with a key.
            </p>
          </div>
        ) : null}

        <nav className="flex items-center gap-3">
          {steps.map((s, i) => {
            const isActive = s.id === step;
            const isComplete = s.id < step;
            const isLast = i === steps.length - 1;
            return (
              <div key={s.id} className={cn("flex items-center gap-3", !isLast && "flex-1")}>
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    isComplete
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="size-3.5" /> : s.id}
                </div>
                {i < steps.length - 1 ? (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      isComplete ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">{steps[step - 1]!.title}</h2>
            <p className="text-sm text-muted-foreground">{steps[step - 1]!.description}</p>
          </div>

          {step === 1 ? <ShopInfoStep form={form} update={update} /> : null}
          {step === 2 ? <DefaultsStep form={form} update={update} /> : null}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              disabled={step === 1 || submitting}
            >
              Back
            </Button>
            {step < steps.length ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canAdvance()}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={submitting}>
                {submitting ? <Ring size="sm" className="text-current" /> : "Finish setup"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Joining a shop?{" "}
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="font-medium text-foreground hover:underline"
          >
            Enter your key
          </button>
        </p>
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a shop</DialogTitle>
            <DialogDescription>
              Enter the join key your shop's owner or admin gave you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="join-key">Join key</Label>
            <Input
              id="join-key"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value)}
              placeholder="K3F9-7QX2-M8RP"
              autoComplete="off"
              className="font-mono tracking-wider"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)} disabled={joining}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={joining}>
              {joining ? <Ring size="sm" className="text-current" /> : "Join shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StepProps = {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
};

function ShopInfoStep({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="ob-name">
          Shop name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ob-name"
          placeholder="Acme Print Co."
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ob-email">Contact email</Label>
        <Input
          id="ob-email"
          type="email"
          placeholder="hello@example.com"
          value={form.email}
          onChange={(e) => update({ email: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ob-addr1">Address line 1</Label>
        <Input
          id="ob-addr1"
          placeholder="123 Main St"
          autoComplete="address-line1"
          value={form.addressLine1}
          onChange={(e) => update({ addressLine1: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ob-addr2">
          Address line 2 <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="ob-addr2"
          placeholder="Suite 200"
          autoComplete="address-line2"
          value={form.addressLine2}
          onChange={(e) => update({ addressLine2: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-3">
        <div className="grid gap-2">
          <Label htmlFor="ob-city">City</Label>
          <Input
            id="ob-city"
            placeholder="Springfield"
            autoComplete="address-level2"
            value={form.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-state">State</Label>
          <Input
            id="ob-state"
            placeholder="IL"
            autoComplete="address-level1"
            maxLength={2}
            value={form.state}
            onChange={(e) => update({ state: e.target.value.toUpperCase() })}
            className="w-16"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-zip">ZIP</Label>
          <Input
            id="ob-zip"
            placeholder="62701"
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={10}
            value={form.postalCode}
            onChange={(e) => update({ postalCode: e.target.value })}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}

function DefaultsStep({ form, update }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ob-tax">Default tax rate (%)</Label>
          <Input
            id="ob-tax"
            inputMode="decimal"
            value={form.taxRatePct}
            onChange={(e) => update({ taxRatePct: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-min">Min quantity</Label>
          <Input
            id="ob-min"
            type="number"
            value={form.minQuantity}
            onChange={(e) => update({ minQuantity: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {form.samePrefix ? (
          <div className="col-span-2 grid gap-2 sm:col-span-1">
            <Label htmlFor="ob-doc-prefix">Document prefix</Label>
            <Input
              id="ob-doc-prefix"
              value={form.quotePrefix}
              onChange={(e) => update({ quotePrefix: e.target.value })}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="ob-quote-prefix">Quote prefix</Label>
              <Input
                id="ob-quote-prefix"
                value={form.quotePrefix}
                onChange={(e) => update({ quotePrefix: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ob-inv-prefix">Invoice prefix</Label>
              <Input
                id="ob-inv-prefix"
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
            form.samePrefix ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {form.samePrefix ? <Check className="size-3" /> : null}
        </span>
        Use the same prefix for quotes and invoices
      </label>
    </div>
  );
}
