import type { PdfLineRow, PdfQuote } from "@/lib/pdf/quote-pdf";
import { computeLineTotals, computeQuoteTotals, round2 } from "@/lib/quotes/totals";
import type { BuilderLine } from "@/lib/quotes/types";
import { lineToCalc, sizeRank } from "@/lib/quotes/types";

/** Org-side branding info the PDF needs. */
export type PdfOrg = {
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  logoWideUrl: string | null;
  logoUrl: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dateFormatter.format(d);
}

function buildAddress(
  line1: string | null,
  line2: string | null,
  city: string | null,
  state: string | null,
  postal: string | null,
  country: string | null,
): string[] {
  const out: string[] = [];
  if (line1?.trim()) out.push(line1.trim());
  if (line2?.trim()) out.push(line2.trim());
  const region = [state, postal]
    .filter((v) => v?.trim())
    .join(" ")
    .trim();
  const cityLine = [city?.trim(), region].filter(Boolean).join(", ");
  if (cityLine) out.push(cityLine);
  if (country && country !== "US") out.push(country);
  return out;
}

function orgToFrom(org: PdfOrg): PdfQuote["from"] {
  return {
    name: org.name,
    address: buildAddress(
      org.addressLine1,
      org.addressLine2,
      org.city,
      org.state,
      org.postalCode,
      org.country,
    ),
    email: org.email,
    phone: org.phone,
    logoUrl: org.logoWideUrl ?? org.logoUrl,
  };
}

// ── From a saved DB quote row ───────────────────────────────────────────

type DbQuote = {
  quote_number: string;
  status: string;
  quote_date: string;
  expires_at: string | null;
  customer_name: string | null;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address_line1: string | null;
  customer_address_line2: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_postal_code: string | null;
  customer_country: string | null;
  subtotal: string | number;
  discount_amount: string | number;
  tax_rate: string | number | null;
  tax_amount: string | number;
  is_tax_exempt: boolean;
  shipping_amount: string | number;
  total: string | number;
  deposit_amount: string | number;
  payment_method_default: string | null;
  payment_terms: string | null;
  terms: string | null;
  notes: string | null;
};

type DbLineItem = {
  name: string;
  description: string | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  color_name: string | null;
  sort_order: number | null;
  sizes_breakdown: { size: string; qty: number; unitPrice: number }[] | null;
  placements_data: { price: number }[] | null;
};

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

// Sizes 2XL and up carry upcharges, so they bill on their own row. Unknown
// labels (rank last) stay with the standard group.
const EXTENDED_FROM = sizeRank("2XL");
const UNKNOWN_RANK = sizeRank("__unknown__");
const isExtendedSize = (label: string): boolean => {
  const r = sizeRank(label);
  return r >= EXTENDED_FROM && r !== UNKNOWN_RANK;
};

type SizeCell = { size: string; qty: number; unitPrice: number };

/**
 * Expand one line's per-size breakdown into display rows: standard sizes
 * (XS–XL) share one row, and each extended size (2XL, 3XL, …) gets its own row.
 * Each placement's per-garment charge is folded into the per-unit price so the
 * rows still add up to the line total. Returns [] when there are no sized units
 * (caller falls back to a single blended row).
 */
function sizeRows(
  baseName: string,
  color: string | null,
  cells: SizeCell[],
  placementPerGarment: number,
  description: string | null,
): PdfLineRow[] {
  const active = cells.filter((c) => c.qty > 0);
  // Standard sizes (XS–XL) share one row. Each extended size (2XL, 3XL, …) gets
  // its own row — they're priced individually, so blending them would misreport
  // the per-unit price.
  const standard = active.filter((c) => !isExtendedSize(c.size));
  const extended = active
    .filter((c) => isExtendedSize(c.size))
    .sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
  const buckets: SizeCell[][] = [standard, ...extended.map((c) => [c])];

  const rows: PdfLineRow[] = [];
  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    const sorted = [...bucket].sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
    const qty = sorted.reduce((s, c) => s + c.qty, 0);
    const amount = round2(
      sorted.reduce((s, c) => s + c.qty * (c.unitPrice + placementPerGarment), 0),
    );
    const list = sorted.map((c) => c.size).join(", ");
    rows.push({
      name: color ? `${baseName} — ${color} ${list}` : `${baseName} ${list}`,
      description: rows.length === 0 ? description : null,
      quantity: qty,
      unitPrice: qty > 0 ? amount / qty : 0,
      amount,
    });
  }
  return rows;
}

/** Shared line-item → display-row expansion for saved quotes AND invoices
 *  (their line items are the same snapshot shape). */
function dbLineItemsToRows(items: DbLineItem[]): PdfLineRow[] {
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted.flatMap((li) => {
    const cells = (li.sizes_breakdown ?? []).map((s) => ({
      size: s.size,
      qty: s.qty || 0,
      unitPrice: s.unitPrice || 0,
    }));
    if (cells.some((c) => c.qty > 0)) {
      const placement = (li.placements_data ?? []).reduce((s, p) => s + (p.price || 0), 0);
      return sizeRows(li.name, li.color_name, cells, placement, li.description);
    }
    const qty = li.quantity;
    const amount = num(li.total_price);
    const unit = qty > 0 ? amount / qty : num(li.unit_price);
    return [
      {
        name: li.color_name ? `${li.name} — ${li.color_name}` : li.name,
        description: li.description,
        quantity: qty,
        unitPrice: unit,
        amount,
      },
    ];
  });
}

export function pdfQuoteFromDb(quote: DbQuote, items: DbLineItem[], org: PdfOrg): PdfQuote {
  const rows = dbLineItemsToRows(items);

  return {
    number: quote.quote_number,
    date: formatDate(quote.quote_date) ?? "",
    expiresAt: formatDate(quote.expires_at),
    status: quote.status,
    customer: {
      name: quote.customer_name,
      company: quote.customer_company,
      email: quote.customer_email,
      phone: quote.customer_phone,
      address: buildAddress(
        quote.customer_address_line1,
        quote.customer_address_line2,
        quote.customer_city,
        quote.customer_state,
        quote.customer_postal_code,
        quote.customer_country,
      ),
    },
    from: orgToFrom(org),
    items: rows,
    subtotal: num(quote.subtotal),
    discountAmount: num(quote.discount_amount),
    taxRate: num(quote.tax_rate),
    taxAmount: num(quote.tax_amount),
    isTaxExempt: quote.is_tax_exempt,
    shippingAmount: num(quote.shipping_amount),
    total: num(quote.total),
    depositAmount: num(quote.deposit_amount),
    paymentMethod: quote.payment_method_default,
    paymentTerms: quote.payment_terms,
    terms: quote.terms,
    notes: quote.notes,
  };
}

// ── From a saved DB invoice row ─────────────────────────────────────────

type DbInvoice = {
  invoice_number: string;
  status: string;
  issue_date: string;
  customer_name: string | null;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address_line1: string | null;
  customer_address_line2: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_postal_code: string | null;
  customer_country: string | null;
  subtotal: string | number;
  discount_amount: string | number;
  tax_rate: string | number | null;
  tax_amount: string | number;
  is_tax_exempt: boolean;
  shipping_amount: string | number;
  total: string | number;
  deposit_amount: string | number;
  amount_paid: string | number;
  amount_due: string | number | null;
  payment_method_default: string | null;
  payment_terms: string | null;
  terms: string | null;
  notes: string | null;
};

/**
 * Build the PDF model from a saved invoice — identical to the quote PDF (same
 * template) except the heading reads "INVOICE" and a paid / balance-due summary
 * is shown under the payment section.
 */
export function pdfInvoiceFromDb(invoice: DbInvoice, items: DbLineItem[], org: PdfOrg): PdfQuote {
  const rows = dbLineItemsToRows(items);
  const total = num(invoice.total);
  const amountPaid = num(invoice.amount_paid);
  const balanceDue = invoice.amount_due != null ? num(invoice.amount_due) : total - amountPaid;

  return {
    docType: "INVOICE",
    payment: { amountPaid, balanceDue },
    number: invoice.invoice_number,
    date: formatDate(invoice.issue_date) ?? "",
    expiresAt: null,
    status: invoice.status,
    customer: {
      name: invoice.customer_name,
      company: invoice.customer_company,
      email: invoice.customer_email,
      phone: invoice.customer_phone,
      address: buildAddress(
        invoice.customer_address_line1,
        invoice.customer_address_line2,
        invoice.customer_city,
        invoice.customer_state,
        invoice.customer_postal_code,
        invoice.customer_country,
      ),
    },
    from: orgToFrom(org),
    items: rows,
    subtotal: num(invoice.subtotal),
    discountAmount: num(invoice.discount_amount),
    taxRate: num(invoice.tax_rate),
    taxAmount: num(invoice.tax_amount),
    isTaxExempt: invoice.is_tax_exempt,
    shippingAmount: num(invoice.shipping_amount),
    total,
    depositAmount: num(invoice.deposit_amount),
    paymentMethod: invoice.payment_method_default,
    paymentTerms: invoice.payment_terms,
    terms: invoice.terms,
    notes: invoice.notes,
  };
}

// ── From the live builder state ─────────────────────────────────────────

export type BuilderSnapshot = {
  number: string; // "DRAFT" when unsaved
  status: string;
  quoteDate: string;
  expiresAt: string;
  customer: {
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
  };
  lines: BuilderLine[];
  adjustments: {
    discountType: "amount" | "percent";
    discountValue: number;
    shippingAmount: number;
    depositType: "amount" | "percent";
    depositValue: number;
    taxRate: number;
    isTaxExempt: boolean;
  };
  paymentMethod: string;
  paymentTerms: string;
  terms: string;
  notes: string;
};

export function pdfQuoteFromBuilder(snap: BuilderSnapshot, org: PdfOrg): PdfQuote {
  const totals = computeQuoteTotals(snap.lines.map(lineToCalc), snap.adjustments);

  const rows: PdfLineRow[] = snap.lines.flatMap((line) => {
    const baseName = line.name || "Untitled item";
    const description = line.description.trim() === "" ? null : line.description;
    const cells = (line.sizes ?? []).map((s) => ({
      size: s.size,
      qty: Math.trunc(Number(s.qty) || 0),
      unitPrice: Number(s.unitPrice) || 0,
    }));
    if (cells.some((c) => c.qty > 0)) {
      const placement = (line.placements ?? []).reduce((s, p) => s + (Number(p.price) || 0), 0);
      return sizeRows(baseName, line.colorName || null, cells, placement, description);
    }
    const lineTotals = computeLineTotals(lineToCalc(line));
    const qty = lineTotals.quantity;
    const amount = lineTotals.totalPrice;
    const unit = qty > 0 ? amount / qty : Number(line.unitPrice) || 0;
    return [
      {
        name: line.colorName ? `${baseName} — ${line.colorName}` : baseName,
        description,
        quantity: qty,
        unitPrice: unit,
        amount,
      },
    ];
  });

  return {
    number: snap.number,
    date: formatDate(snap.quoteDate) ?? "",
    expiresAt: formatDate(snap.expiresAt),
    status: snap.status,
    customer: {
      name: snap.customer.name || null,
      company: snap.customer.company || null,
      email: snap.customer.email || null,
      phone: snap.customer.phone || null,
      address: buildAddress(
        snap.customer.addressLine1,
        snap.customer.addressLine2,
        snap.customer.city,
        snap.customer.state,
        snap.customer.postalCode,
        snap.customer.country,
      ),
    },
    from: orgToFrom(org),
    items: rows,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxRate: snap.adjustments.taxRate,
    taxAmount: totals.taxAmount,
    isTaxExempt: snap.adjustments.isTaxExempt,
    shippingAmount: totals.shippingAmount,
    total: totals.total,
    depositAmount: totals.depositAmount,
    paymentMethod: snap.paymentMethod || null,
    paymentTerms: snap.paymentTerms || null,
    terms: snap.terms || null,
    notes: snap.notes || null,
  };
}
