import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Canonical quote PDF template. THIS FILE IS THE SOURCE OF TRUTH for both:
 *   - the server-rendered PDF (api/quotes/[id]/pdf)
 *   - the in-app live preview (<PDFViewer> in the browser)
 * Both code paths render the exact same JSX, so they cannot diverge.
 *
 * Styling uses React-PDF's `StyleSheet` (CSS subset, flexbox-only). We can't
 * use Tailwind or shadcn primitives here — it's a separate visual artifact.
 */

export type PdfLineRow = {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type PdfQuote = {
  /** Big heading + how the doc refers to itself. Defaults to "QUOTE". */
  docType?: "QUOTE" | "INVOICE";
  /** Invoice-only payment summary, shown under the payment method/terms. */
  payment?: { amountPaid: number; balanceDue: number } | null;
  number: string;
  date: string;
  expiresAt: string | null;
  status: string;
  customer: {
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string[];
  };
  from: {
    name: string;
    address: string[];
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
  };
  items: PdfLineRow[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  /** Show the tax row with "EXEMPT" instead of an amount. */
  isTaxExempt: boolean;
  shippingAmount: number;
  total: number;
  depositAmount: number;
  paymentMethod: string | null;
  paymentTerms: string | null;
  terms: string | null;
  notes: string | null;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmt = (n: number) => usd.format(n);
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

// Strict three-color palette: true black main text, one gray for both
// secondary text AND every divider, white background. Row dividers use a
// thinner stroke so the same gray reads quieter line-by-line.
const COLORS = {
  text: "#000000",
  muted: "#4b5563",
  // Header chip background — intentionally a much lighter gray than the text
  // gray so black labels read cleanly. Technically a 4th tone, but it reads
  // as "background tint" not "secondary text" to the eye.
  headerBg: "#d1d5db",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.text,
    lineHeight: 1.35,
  },
  // Top bar — logo left, quote number right.
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  logo: { height: 44, objectFit: "contain" },
  logoTextFallback: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  quoteRef: { fontSize: 10, color: COLORS.text },
  // "QUOTE" heading + date.
  titleBlock: { marginBottom: 0 },
  title: { fontSize: 36, fontFamily: "Helvetica-Bold", color: COLORS.text, letterSpacing: 0 },
  dateLineWrap: { marginTop: 48 },
  dateLine: { fontSize: 10 },
  dateLabel: { fontFamily: "Helvetica-Bold" },
  // Billed to / From two-column block.
  twoCol: { flexDirection: "row", marginTop: 24, gap: 32 },
  column: { flex: 1 },
  colHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 6,
  },
  colLine: { color: COLORS.muted, fontSize: 9.5 },
  // Items table.
  table: { marginTop: 28 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    backgroundColor: COLORS.headerBg,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: COLORS.text,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: COLORS.muted,
    color: COLORS.muted,
  },
  colItem: { flex: 3, paddingLeft: 12 },
  // Indent so shipping / discount / taxes read as adjustments, not line items.
  // Baseline 12 (matches colItem) + 36 visual offset = 48.
  adjustmentLabel: { flex: 3, paddingLeft: 48 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colAmt: { flex: 1, textAlign: "right", paddingRight: 12 },
  rowName: { fontSize: 10 },
  rowDesc: { fontSize: 8.5, color: COLORS.muted, marginTop: 2 },
  // Totals block.
  totals: { marginTop: 14, alignItems: "flex-end" },
  totalsInner: { width: 240 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingRight: 12,
  },
  totalsLabel: { color: COLORS.muted, fontSize: 10 },
  totalsValue: { fontSize: 10 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    paddingTop: 8,
    paddingRight: 12,
    marginTop: 4,
  },
  grandTotalLabel: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  grandTotalValue: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  // Footer blocks (payment / notes / terms).
  footerBlock: { marginTop: 22 },
  footerLabel: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 3 },
  footerText: { fontSize: 9.5, color: COLORS.text },
  termsBlock: {
    marginTop: 22,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.muted,
  },
  termsText: { fontSize: 8.5, color: COLORS.muted, lineHeight: 1.45 },
});

export function QuotePdfDocument({ quote }: { quote: PdfQuote }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Top: logo + quote number */}
        <View style={styles.topRow}>
          <View>
            {quote.from.logoUrl ? (
              <Image style={styles.logo} src={quote.from.logoUrl} />
            ) : (
              <Text style={styles.logoTextFallback}>{quote.from.name}</Text>
            )}
          </View>
          <Text style={styles.quoteRef}>#{quote.number}</Text>
        </View>

        {/* QUOTE / INVOICE heading + date */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{quote.docType ?? "QUOTE"}</Text>
          <View style={styles.dateLineWrap}>
            <Text style={styles.dateLine}>
              <Text style={styles.dateLabel}>Date: </Text>
              {quote.date}
              {quote.expiresAt ? (
                <Text>
                  {"   "}
                  <Text style={styles.dateLabel}>Expires: </Text>
                  {quote.expiresAt}
                </Text>
              ) : null}
            </Text>
          </View>
        </View>

        {/* Billed to / From */}
        <View style={styles.twoCol}>
          <View style={styles.column}>
            <Text style={styles.colHeading}>Billed to:</Text>
            {/* Show company if present, otherwise the contact's full name —
                never both, and phone is intentionally not shown here. */}
            {quote.customer.company || quote.customer.name ? (
              <Text style={styles.colLine}>{quote.customer.company ?? quote.customer.name}</Text>
            ) : null}
            {quote.customer.address.map((line) => (
              <Text key={line} style={styles.colLine}>
                {line}
              </Text>
            ))}
            {quote.customer.email ? (
              <Text style={styles.colLine}>{quote.customer.email}</Text>
            ) : null}
          </View>
          <View style={styles.column}>
            <Text style={styles.colHeading}>From:</Text>
            <Text style={styles.colLine}>{quote.from.name}</Text>
            {quote.from.address.map((line) => (
              <Text key={line} style={styles.colLine}>
                {line}
              </Text>
            ))}
            {quote.from.email ? <Text style={styles.colLine}>{quote.from.email}</Text> : null}
            {quote.from.phone ? <Text style={styles.colLine}>{quote.from.phone}</Text> : null}
          </View>
        </View>

        {/* Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colQty}>Quantity</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colAmt}>Amount</Text>
          </View>
          {quote.items.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.colItem, { color: COLORS.muted }]}>(no line items)</Text>
              <Text style={styles.colQty} />
              <Text style={styles.colPrice} />
              <Text style={styles.colAmt} />
            </View>
          ) : (
            quote.items.map((item, i) => (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: PDF rows are positional and read-only
                key={i}
                style={styles.tableRow}
                wrap={false}
              >
                <View style={styles.colItem}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {item.description ? <Text style={styles.rowDesc}>{item.description}</Text> : null}
                </View>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{fmt(item.unitPrice)}</Text>
                <Text style={styles.colAmt}>{fmt(item.amount)}</Text>
              </View>
            ))
          )}

          {/* Money rows — labels indented so these read as adjustments, not items */}
          {quote.shippingAmount > 0 ? (
            <View style={styles.tableRow} wrap={false}>
              <Text style={styles.adjustmentLabel}>Shipping</Text>
              <Text style={styles.colQty} />
              <Text style={styles.colPrice} />
              <Text style={styles.colAmt}>{fmt(quote.shippingAmount)}</Text>
            </View>
          ) : null}
          {quote.discountAmount > 0 ? (
            <View style={styles.tableRow} wrap={false}>
              <Text style={styles.adjustmentLabel}>Discount</Text>
              <Text style={styles.colQty} />
              <Text style={styles.colPrice} />
              <Text style={styles.colAmt}>− {fmt(quote.discountAmount)}</Text>
            </View>
          ) : null}
          {quote.isTaxExempt ? (
            <View style={styles.tableRow} wrap={false}>
              <Text style={styles.adjustmentLabel}>Taxes</Text>
              <Text style={styles.colQty} />
              <Text style={styles.colPrice} />
              <Text style={styles.colAmt}>EXEMPT</Text>
            </View>
          ) : quote.taxAmount > 0 ? (
            <View style={styles.tableRow} wrap={false}>
              <Text style={styles.adjustmentLabel}>Taxes</Text>
              <Text style={styles.colQty} />
              <Text style={styles.colPrice}>{pct(quote.taxRate)}</Text>
              <Text style={styles.colAmt}>{fmt(quote.taxAmount)}</Text>
            </View>
          ) : null}
        </View>

        {/* Total */}
        <View style={styles.totals}>
          <View style={styles.totalsInner}>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{fmt(quote.total)}</Text>
            </View>
            {quote.depositAmount > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Deposit due</Text>
                <Text style={styles.totalsValue}>{fmt(quote.depositAmount)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer blocks — payment method/terms, then (invoices only) the
            paid / balance-due summary directly beneath. */}
        {quote.paymentMethod || quote.paymentTerms || quote.payment ? (
          <View style={styles.footerBlock}>
            {quote.paymentMethod ? (
              <Text style={styles.footerText}>
                <Text style={styles.footerLabel}>Payment method: </Text>
                {quote.paymentMethod}
              </Text>
            ) : null}
            {quote.paymentTerms ? (
              <Text style={[styles.footerText, { marginTop: 2 }]}>
                <Text style={styles.footerLabel}>Payment terms: </Text>
                {quote.paymentTerms}
              </Text>
            ) : null}
            {quote.payment ? (
              <>
                <Text style={[styles.footerText, { marginTop: 2 }]}>
                  <Text style={styles.footerLabel}>Amount paid: </Text>
                  {fmt(quote.payment.amountPaid)}
                </Text>
                <Text style={[styles.footerText, { marginTop: 2 }]}>
                  <Text style={styles.footerLabel}>Balance due: </Text>
                  {fmt(quote.payment.balanceDue)}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        {quote.notes ? (
          <View style={styles.footerBlock}>
            <Text style={styles.footerLabel}>Notes</Text>
            <Text style={styles.footerText}>{quote.notes}</Text>
          </View>
        ) : null}

        {quote.terms ? (
          <View style={styles.termsBlock}>
            <Text style={styles.footerLabel}>Terms</Text>
            <Text style={styles.termsText}>{quote.terms}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
