import type { PdfLineRow, PdfQuote } from "@/lib/pdf/quote-pdf";
import { computeLineTotals, computeQuoteTotals } from "@/lib/quotes/totals";
import type { BuilderLine } from "@/lib/quotes/types";
import { lineToCalc } from "@/lib/quotes/types";

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
};

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

export function pdfQuoteFromDb(quote: DbQuote, items: DbLineItem[], org: PdfOrg): PdfQuote {
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const rows: PdfLineRow[] = sorted.map((li) => {
    const qty = li.quantity;
    const amount = num(li.total_price);
    const unit = qty > 0 ? amount / qty : num(li.unit_price);
    return {
      name: li.color_name ? `${li.name} — ${li.color_name}` : li.name,
      description: li.description,
      quantity: qty,
      unitPrice: unit,
      amount,
    };
  });

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

  const rows: PdfLineRow[] = snap.lines.map((line) => {
    const lineTotals = computeLineTotals(lineToCalc(line));
    const qty = lineTotals.quantity;
    const amount = lineTotals.totalPrice;
    const unit = qty > 0 ? amount / qty : Number(line.unitPrice) || 0;
    return {
      name: line.colorName
        ? `${line.name || "Untitled item"} — ${line.colorName}`
        : line.name || "Untitled item",
      description: line.description.trim() === "" ? null : line.description,
      quantity: qty,
      unitPrice: unit,
      amount,
    };
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
