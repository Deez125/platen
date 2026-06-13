# Quote Builder Page — Required Elements

> This document lists everything that must exist on the quote create/edit page. It does not specify layout, visual design, component structure, or implementation details. Treat the order of items in this document as arbitrary — place them wherever makes the most sense for the UI.

---

## Customer section

- Toggle or selector to switch between picking an existing customer and entering a one-off customer
- Customer picker (search / select from existing customers)
- Customer name field
- Customer company field
- Customer email field
- Customer phone field
- Customer shipping address fields (line 1, line 2, city, state, postal code, country)
- "Bill to is same as shipping" toggle
- Customer billing address fields (line 1, line 2, city, state, postal code, country) — shown when bill-to differs from shipping
- Tax-exempt indicator for the selected customer (read from customer record; overridable per quote)

---

## Quote metadata

- Quote number (displayed; generated server-side)
- Quote date
- Quote expiration date
- Quote status indicator (draft / sent / viewed / approved / declined / etc.)
- Quote version indicator (when this is a revision)
- Internal notes field (not shown to customer)
- Customer-facing notes field
- Terms field (defaults from org settings; editable per quote)

---

## Line items

- Button to add a new line item / product
- Product picker (search / browse tenant catalog, with category filter)
- Option to add a custom (non-catalog) line item
- For each line item, display and allow editing of:
  - Product name (with override capability)
  - Product description / custom description
  - Product image(s) — view, add, remove, reorder
  - Selected garment color
  - Quantity per size (size breakdown table)
  - Per-size price override toggle and per-size custom prices
  - Placement selections (front, back, sleeves, etc.) with color count per placement
  - Line item subtotal
  - Line item cost (blank cost)
  - Line item notes
  - Remove line item action
  - Duplicate line item action
  - Reorder line items (move up/down or drag)

---

## Additional charges

- Screen fee toggle, description, quantity, and unit price
- Other configurable fees (setup, art, rush, etc.) — add/remove as needed
- Shipping toggle and shipping cost
- Discount (amount or percent)

---

## Tax

- Tax rate (defaults from org settings; editable per quote)
- Tax exempt toggle (defaults from customer; overridable per quote)
- Tax exempt ID / resale cert reference (when applicable)
- Tax amount (calculated, displayed)

---

## Totals & financials

- Subtotal (calculated, displayed)
- Tax amount (calculated, displayed)
- Shipping (displayed)
- Discount (displayed)
- Grand total (calculated, displayed)
- Total cost (blank cost + fees) — internal-only
- Profit — internal-only
- Margin percentage — internal-only

---

## Payment & delivery defaults

- Payment method default (cash, check, card, ACH, other)
- Payment terms (Net 30, due on receipt, etc.)
- Deposit required amount or percentage

---

## Quote summary / overview

- Read-only summary block showing the key quote details at a glance (customer, total, item count, status, dates)

---

## Actions

- Save (saves current state as draft or persists changes)
- Save and send (marks as sent; sending behavior itself is deferred)
- Delete quote (with confirmation)
- Duplicate quote
- Create revision (new version of this quote with parent reference)
- Approve quote (manual approval action)
- Decline quote
- Generate / convert to invoice (visible when quote is approved)
- Create order (placeholder action — this flow may change later)
- Export to PDF / download PDF
- Print

---

## Quote preview

- Live preview of the rendered quote document (matches the PDF that the customer would see)

---

## Activity / history

- List of changes and actions taken on this quote (created, edited, status changes, revisions)
