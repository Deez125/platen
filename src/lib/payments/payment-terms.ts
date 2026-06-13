/**
 * Payment terms — the reusable "how do we collect money" presets shown at the
 * top of the pricing-rules page and picked per quote/invoice.
 *
 * A term is a name plus an ordered list of installments. Each installment takes
 * a portion of the order total (a percent or a flat dollar amount) and is due on
 * a trigger (at order, on completion, net N days, …). One installment list
 * expresses every common shape: paid-in-full, net terms, deposit splits, and
 * multi-stage progress billing.
 *
 * This module is pure (no DB) so it can back both the mock and, later, the
 * persisted version + the quote/invoice schedule math.
 */

export type PaymentTrigger =
  | "at_order"
  | "on_completion"
  | "on_delivery"
  | "net_days"
  | "on_receipt";

export type InstallmentMode = "percent" | "fixed";

export type PaymentInstallment = {
  id: string;
  label: string;
  mode: InstallmentMode;
  /** Percent (0–100) when mode is "percent"; dollars when "fixed". */
  value: number;
  trigger: PaymentTrigger;
  /** Days after invoice; only meaningful when trigger is "net_days". */
  netDays: number;
};

export type PaymentTerm = {
  id: string;
  name: string;
  isDefault: boolean;
  installments: PaymentInstallment[];
};

export const TRIGGER_OPTIONS: { value: PaymentTrigger; label: string }[] = [
  { value: "at_order", label: "At order" },
  { value: "on_completion", label: "On completion" },
  { value: "on_delivery", label: "On delivery / pickup" },
  { value: "net_days", label: "Net days after invoice" },
  { value: "on_receipt", label: "Due on receipt" },
];

/** Human phrase for an installment's due trigger, e.g. "net 30 days". */
export function triggerLabel(trigger: PaymentTrigger, netDays: number): string {
  switch (trigger) {
    case "at_order":
      return "at order";
    case "on_completion":
      return "on completion";
    case "on_delivery":
      return "on delivery";
    case "on_receipt":
      return "due on receipt";
    case "net_days":
      return `net ${netDays} days`;
  }
}

/** Dollar amount an installment collects against a given order total. */
export function installmentAmount(inst: PaymentInstallment, total: number): number {
  return inst.mode === "percent" ? (total * inst.value) / 100 : inst.value;
}

export type ScheduledInstallment = PaymentInstallment & {
  amount: number;
  dueLabel: string;
};

/** Resolve a term into concrete amounts + due labels for a sample total. */
export function scheduleFor(term: PaymentTerm, total: number): ScheduledInstallment[] {
  return term.installments.map((inst) => ({
    ...inst,
    amount: installmentAmount(inst, total),
    dueLabel: triggerLabel(inst.trigger, inst.netDays),
  }));
}

export type AllocatedInstallment = ScheduledInstallment & {
  /** Of this installment's amount, how much is covered by payments so far. */
  paid: number;
  remaining: number;
  /** "paid" = fully covered; "due" = the next installment to collect; "upcoming" = later. */
  state: "paid" | "due" | "upcoming";
};

/**
 * Spread `amountPaid` across a schedule's installments in order (earliest first)
 * and tag each with how much is covered + whether it's the next one due. Drives
 * the invoice's payment-schedule view and the "next payment" suggestion.
 */
export function allocateSchedule(
  installments: PaymentInstallment[],
  total: number,
  amountPaid: number,
): { rows: AllocatedInstallment[]; nextDue: AllocatedInstallment | null } {
  let pool = Math.max(0, amountPaid);
  let foundNext = false;
  const rows: AllocatedInstallment[] = installments.map((inst) => {
    const amount = installmentAmount(inst, total);
    const applied = Math.min(pool, amount);
    pool -= applied;
    const remaining = Math.max(0, amount - applied);
    let state: AllocatedInstallment["state"];
    if (remaining <= 0.005) {
      state = "paid";
    } else if (!foundNext) {
      state = "due";
      foundNext = true;
    } else {
      state = "upcoming";
    }
    return {
      ...inst,
      amount,
      dueLabel: triggerLabel(inst.trigger, inst.netDays),
      paid: applied,
      remaining,
      state,
    };
  });
  return { rows, nextDue: rows.find((r) => r.state === "due") ?? null };
}

/**
 * How much of `total` the term collects, as a fraction. 1 means it adds up
 * exactly; <1 under-collects, >1 over-collects. Fixed installments are measured
 * against the sample total, so coverage is total-dependent when fixed amounts
 * are mixed in.
 */
export function coverage(term: PaymentTerm, total: number): number {
  if (total <= 0) return 0;
  const collected = term.installments.reduce((sum, i) => sum + installmentAmount(i, total), 0);
  return collected / total;
}

/** A term adds up when its installments collect the whole total (±1¢). */
export function isBalanced(term: PaymentTerm, total: number): boolean {
  if (total <= 0) return false;
  const collected = term.installments.reduce((sum, i) => sum + installmentAmount(i, total), 0);
  return Math.abs(collected - total) < 0.01;
}

let counter = 0;
/** Stable-enough id for mock rows; the DB will assign real UUIDs later. */
function localId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function newInstallment(
  label = "",
  trigger: PaymentTrigger = "at_order",
): PaymentInstallment {
  return { id: localId("inst"), label, mode: "percent", value: 0, trigger, netDays: 30 };
}

export function newPaymentTerm(): PaymentTerm {
  return {
    id: localId("term"),
    name: "",
    isDefault: false,
    installments: [newInstallment("Deposit", "at_order")],
  };
}

/** Starter terms for the mock (no DB). Mirrors what onboarding will seed. */
export function sampleTerms(): PaymentTerm[] {
  return [
    {
      id: "seed-paid-in-full",
      name: "Paid in full",
      isDefault: true,
      installments: [
        {
          id: "seed-pif-1",
          label: "Full payment",
          mode: "percent",
          value: 100,
          trigger: "at_order",
          netDays: 30,
        },
      ],
    },
    {
      id: "seed-deposit-split",
      name: "50% deposit / balance on pickup",
      isDefault: false,
      installments: [
        {
          id: "seed-ds-1",
          label: "Deposit",
          mode: "percent",
          value: 50,
          trigger: "at_order",
          netDays: 30,
        },
        {
          id: "seed-ds-2",
          label: "Balance",
          mode: "percent",
          value: 50,
          trigger: "on_delivery",
          netDays: 30,
        },
      ],
    },
    {
      id: "seed-net-30",
      name: "Net 30",
      isDefault: false,
      installments: [
        {
          id: "seed-n30-1",
          label: "Full payment",
          mode: "percent",
          value: 100,
          trigger: "net_days",
          netDays: 30,
        },
      ],
    },
  ];
}
