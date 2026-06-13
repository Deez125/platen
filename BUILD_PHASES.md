# Build Phases — v0.1

> Sequenced phase plan for executing [BUILD_SPEC_V0.1.md](BUILD_SPEC_V0.1.md). Each phase ends with a runnable, demonstrable artifact. Do not start a phase until the previous one is signed off. Check items off as you go.

The full stack is locked in spec §2 and won't be re-debated here: Next.js 15 (App Router, TS strict) · React 19 · Tailwind v4 · shadcn/ui · lucide-react · TanStack Query v5 · React Hook Form + Zod · sonner · next-themes · Supabase (Auth + Postgres + Storage) · Drizzle ORM · @react-pdf/renderer · Biome · pnpm.

---

## Phase 1 — Scaffold, shell, and pretty placeholders ⭐ start here

**Goal:** `pnpm dev` opens a site that looks like the real product. Every route in the spec exists as a navigable page. Auth and data are mocked (hardcoded fixtures); no Supabase yet. The user can click around, see the sidebar, switch themes, open dialogs, and feel the UX. **The bar is "this looks ready to demo," not "this works."**

### 1.1 Project init
- [x] `pnpm create next-app` — TS strict, App Router, Tailwind, src/ dir
- [x] Replace ESLint/Prettier with Biome (`biome.json` configured for the project)
- [x] `tsconfig.json`: `"strict": true` + `"noUncheckedIndexedAccess": true`
- [x] `package.json` scripts: `dev`, `build`, `start`, `lint` (biome check), `format` (biome format --write), `typecheck` (tsc --noEmit)
- [x] Install deps: `lucide-react`, `sonner`, `next-themes`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `clsx`, `tailwind-merge`, `class-variance-authority`
- [x] `npx shadcn@latest init` — set up `components/ui/` (do NOT add as npm dep)
- [x] Package name in `package.json` is `apparel-shop-saas` (NOT a brand name)

### 1.2 Config layer
- [x] `lib/config/brand.ts` — `BRAND` const (name, shortName, tagline, supportEmail, marketingUrl). Placeholder values; never type the brand name elsewhere.
- [x] `lib/config/env.ts` — Zod-validated env loader. For now validates only `NEXT_PUBLIC_APP_URL` and `APP_ENV`. Will grow in Phase 2.
- [x] Theme tokens (primary, accent, semantic shadcn colors). No hardcoded hex downstream. *(Tailwind v4 keeps tokens in `globals.css` via `@theme inline` — no `tailwind.config.ts` needed.)*
- [x] `next-themes` provider in root layout, light mode default, dark mode available
- [x] `.env.example` checked in with placeholder values

### 1.3 Component library (the foundation)
shadcn primitives in `components/ui/`, composites in `components/common/`.

- [x] Button, Input, Textarea, Select, Combobox, DatePicker *(Combobox/DatePicker via `command` + `calendar` + `popover` primitives — full composites land when first used)*
- [x] Card, Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs, Separator
- [x] Badge (variants: success | warning | info | danger | neutral)
- [x] Table (shadcn DataTable patterns)
- [x] Skeleton (shadcn primitive)
- [x] Sonner Toaster wired into root layout, `toast.success`/`toast.error` helpers usable
- [x] `components/ui/ring.tsx` — Ring loader from loading-ui.com, size + color props, reads theme tokens
- [x] `components/common/PageHeader.tsx` — `<PageHeader title subtitle actions />`
- [x] `components/common/EmptyState.tsx` — `<EmptyState icon title description action />`
- [x] `components/common/ConfirmDialog.tsx`
- [x] `components/forms/FormField.tsx` — `<FormField name label required>{children}</FormField>` on RHF
- [x] Generic skeletons: `TableSkeleton` (rows, columns props), `CardGridSkeleton` (count prop)

**Rule from spec §15:** if a UI pattern appears twice, extract it. Don't redeclare `<label> + <input>` per page.

### 1.4 App shell
- [x] `app/layout.tsx` — root layout with providers (ThemeProvider, TanStack Query provider, Sonner Toaster)
- [x] `app/(app)/layout.tsx` — authenticated app shell *(route group; doesn't prefix URL)*
- [x] **Sidebar** (240px, collapsible to icons):
  - [x] Org switcher at top (mock orgs, dropdown to switch)
  - [x] Workspace section: Dashboard, Inbox, Quotes, Jobs (sub-items: In production / Scheduled / Completed), Production, Invoices, Customers, Catalog, Artwork, Reports
  - [x] Setup section: Branding, Templates, Pricing rules, Integrations, Settings
  - [x] User profile at bottom with dropdown (Profile, Sign out)
  - [x] Active route highlighting
- [x] **Topbar:** Cmd+K placeholder input, notifications icon, theme toggle, "New quote" primary action button
- [x] Mobile-responsive sidebar collapse
- [x] `app/(marketing)/layout.tsx` — minimal public layout
- [x] `app/(auth)/layout.tsx` — centered card layout for login/signup/forgot-password

### 1.5 Placeholder pages — every route in the spec exists
Each is a real-looking page using the component library, with **mock data** baked in. No real fetches.

**Marketing / auth:**
- [ ] `/` — landing placeholder *(currently redirects to `/dashboard`; no marketing page built)*
- [x] `/login` — wired to real Supabase Auth (exceeds placeholder scope; see Phase 2.3)
- [x] `/signup` — wired to real Supabase Auth
- [x] `/forgot-password` — wired to Supabase password reset

**Onboarding:**
- [x] `/onboarding` — 2-step wizard (shop info + defaults), creates org + membership + seeds defaults

**App pages** (all under `/*`, all with sidebar layout):
- [ ] `/dashboard` — KPI cards render with static $0 values; still needs real data wiring
- [x] `/customers` — list + grid views, real data *(search + pagination tracked in Phase 3)*
- [x] `/customers/new` — full form with staged logo upload
- [x] `/customers/[id]` — detail/edit with live logo upload + delete
- [ ] `/catalog` — product grid with mock products
- [ ] `/catalog/products/[id]` — product detail
- [ ] `/quotes` — list with status filter pills
- [ ] `/quotes/new` — quote builder skeleton: customer block (left), line items (center), totals sidebar (right). Adding items works in-memory only.
- [ ] `/quotes/[id]` — quote detail/preview
- [ ] `/invoices` — list
- [ ] `/invoices/[id]` — detail
- [ ] `/jobs` — board view with status columns
- [ ] `/jobs/[id]` — detail
- [ ] `/reports` — placeholder
- [ ] `/settings` — index
- [ ] `/settings/branding`
- [ ] `/settings/team`
- [ ] `/settings/pricing-rules`
- [ ] `/settings/document-templates`
- [ ] `/settings/billing` (placeholder for Stripe later)

### 1.6 Domain skeleton composites
Build in `components/<domain>/skeletons.tsx`. Each list/detail page wires its loading fallback to its skeleton (verify with an artificial `await sleep(800)` during dev).

- [ ] `QuoteListSkeleton`, `QuoteDetailSkeleton`
- [x] `CustomerListSkeleton`, `CustomerDetailSkeleton` — wired via `customers/loading.tsx` + `customers/[id]/loading.tsx`
- [ ] `InvoiceListSkeleton`, `InvoiceDetailSkeleton`
- [ ] `JobListSkeleton`, `JobBoardSkeleton`, `JobDetailSkeleton`
- [ ] `DashboardSkeleton`

> Remaining skeletons are built alongside their domains (the under-construction pages have no real layout to mirror yet).

### 1.7 Mock data
- [~] ~~`lib/mock/` — typed fixtures for each domain~~ **Superseded.** The build went real-data-first: Supabase + Drizzle landed early (Phase 2) and Customers is wired to live queries. Remaining domains will be built directly against real data rather than throwaway fixtures, so no `lib/mock/` layer is being created.

### Phase 1 done when:
- [ ] `pnpm dev` runs cleanly, no console errors, no TS errors, no Biome warnings
- [ ] Every route in spec §4 is reachable and renders a complete-looking page
- [ ] Light + dark mode both look good on every page
- [ ] Sidebar collapses, topbar works, theme toggle works, mock org switcher opens
- [ ] At least three skeletons render correctly (artificial delay verifies the look)
- [ ] Sonner toasts fire from form submits
- [ ] No brand-specific strings anywhere — `rg -i "pressdeck|midwest|inknav"` returns nothing
- [ ] No inline `style={{}}`, no hardcoded hex, no `any` types

---

## Phase 2 — Database, auth, and real tenancy

**Goal:** Replace mocks with real Supabase. Two users can sign up, each create their own org, log in, see only their data (empty for now). Path-based routing on `/*` with `active_org_id` cookie.

### 2.1 Drizzle schema (spec §5)
> Built per-domain (as each phase lands) rather than all-upfront.
- [x] `lib/db/schema/auth.ts` — profiles, organizations (settings folded in as columns), memberships
- [x] `lib/db/schema/customers.ts`
- [x] `lib/db/schema/catalog.ts` — product_categories, size_groups, size_options, color_options, distributor_sources, distributor_products, distributor_product_variants, tenant_products, tenant_product_pricing
- [ ] `lib/db/schema/settings.ts` — placement_options, color_count_pricing, fees, document_templates *(Phase 5)*
- [ ] `lib/db/schema/quotes.ts` *(Phase 6)*
- [ ] `lib/db/schema/invoices.ts` *(Phase 7)*
- [ ] `lib/db/schema/jobs.ts` *(Phase 8)*
- [ ] `lib/db/schema/audit_log.ts` *(deferred)*
- [x] `lib/db/schema/index.ts` barrel
- [x] `lib/db/index.ts` — Drizzle client
- [x] `drizzle.config.ts`
- [ ] `package.json` scripts: `db:generate`, `db:migrate` done; `db:studio`, `db:seed`, `db:seed:catalog` pending
- [x] Generate initial migration: `pnpm db:generate`

### 2.2 Supabase setup
- [x] Create Supabase project
- [x] Migrations applied (manually via Supabase SQL editor, not `scripts/migrate.ts`)
- [x] RLS policies on every business table per spec §5 pattern (shipped in each migration, not a single `rls.sql`)
- [x] Apply RLS via migration
- [x] Storage buckets with per-tenant/per-user prefix policies (`avatars`, `org-logos`, `customer-logos`)

### 2.3 Auth wiring
- [x] `lib/supabase/server.ts`, `lib/supabase/browser.ts` (path differs from spec's `lib/auth/`)
- [ ] `lib/auth/session.ts` — has `getActiveOrgId()`; `getTenantContext()`/`requireAuth()`/`requireRole()` pending
- [x] `src/middleware.ts` — session check + redirects to `/login` / `/onboarding` *(active_org_id cookie not used yet — active org = first membership)*
- [x] Wire `/login` to real Supabase Auth
- [x] Wire `/signup` to real Supabase Auth (creates `auth.users` + `profiles` via trigger)
- [x] Wire `/forgot-password` to Supabase password reset
- [x] Wire `/onboarding` — creates `organizations` + `memberships` (role=owner); settings are columns on `organizations`
- [x] Onboarding seeds defaults: product_categories, size_groups/size_options, colors *(placements/color tiers/fees come with Phase 5)*
- [ ] Org switcher in sidebar actually switches the cookie + router refreshes *(display-only for now)*
- [x] Sign out bounces to `/login`

### 2.4 Seed scripts
- [ ] `scripts/seed.ts` — demo user + demo org + sample data (skips onboarding)
- [x] `scripts/seed-distributor-catalog.mjs` — 30 Gildan/Bella+Canvas/Next Level styles + variants (emits `drizzle/seed/distributor_catalog.sql`)

### 2.5 Env validation
- [ ] `lib/config/env.ts` validates the public Supabase vars; `SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL`/`COOKIE_SECRET` not yet added
- [x] `.env.example` updated with new vars + comments

### Phase 2 done when:
- [x] Two test accounts can be created via `/signup`
- [x] Each onboards into a separate org with seeded defaults
- [ ] `getTenantContext()` returns the right `tenantId` *(using `getActiveOrgId()` for now)*
- [x] **RLS verified** — cross-tenant isolation confirmed (verified on catalog; same policy pattern on customers)
- [x] App pages still render (real queries; mock data removed)
- [x] Sign out works

---

## Phase 3 — Customers

CRUD with search and pagination.

- [ ] `lib/schemas/customer.ts` — Zod schemas for create/update *(still inline validation; Zod file pending)*
- [x] `lib/actions/customers.ts` — create/update/delete, tenant-scoped via `getActiveOrgId()` (`lib/auth/session.ts`)
- [ ] ~~`lib/queries/customers.ts` — TanStack Query hooks~~ *(diverged: using server components + server actions, no TanStack)*
- [x] Wire `/customers` — list (list + grid views with logos) *(server-side search + pagination still pending)*
- [x] Wire `/customers/new` — create form (with staged logo upload)
- [x] Wire `/customers/[id]` — edit form (with live logo upload)
- [x] Confirm dialog on delete
- [ ] Audit log writes on create/update/delete *(audit_log infra not built yet — deferred to its own pass)*

### Phase 3 done when:
- [x] Can create, list, edit, delete customers *(search + pagination still pending)*
- [x] Each org sees only its own customers (RLS, same pattern verified on catalog)
- [x] Deletion shows confirm dialog
- [ ] Audit log rows created for each action *(deferred)*

---

## Phase 4 — Catalog

- [x] Catalog browse page lists `tenant_products` joined with `tenant_product_pricing` (grid + starting price)
- [x] Product detail/edit page (fields + quantity-break pricing tiers + delete)
- [x] "Import from distributor" flow — searchable + category filter; picks from `distributor_products`, creates `tenant_products` + default pricing
- [x] Schema + migration `0006` (9 catalog tables + RLS), distributor seed (30 styles / 540 variants), `seed_tenant_defaults()` wired into onboarding + backfill

> **Distributor adapter layer (scaffolded).** Interface + stubs exist; the
> real catalog now loads from SanMar's bulk SDL CSV (see Phase 4b).
- [x] `lib/distributors/types.ts` — `DistributorAdapter` interface
- [x] `lib/distributors/sanmar.ts` — credential-aware shell (real API calls pending)
- [x] `lib/distributors/ssactivewear.ts` — minimal stub (empty arrays)
- [x] `lib/distributors/index.ts` — registry

### Phase 4 done when:
- [x] Can browse catalog
- [x] Can import a distributor product into the tenant catalog
- [x] Can edit pricing tiers on a tenant product

---

## Phase 4b — Real SanMar catalog (bulk SDL CSV)

Replaces the 30 seeded fakes with the real catalog (~3,899 styles / ~416K
SKU variants) from SanMar's downloadable SDL data file.

- [ ] `scripts/import-sanmar.mjs` — streams the 507MB CSV, upserts styles →
      `distributor_products` and SKUs → `distributor_product_variants` (direct
      DB load via `postgres` client; paste-SQL doesn't scale to 416K rows)
- [ ] Store **piece price** as `wholesale_price` (Option 1 cost basis) **plus**
      `case_price` + `case_size` columns alongside it — captured now, unused
      until quantity-aware pricing lands (see roadmap below)
- [ ] Denormalize `color_count` + `min_price` onto `distributor_products` for
      fast browse cards (avoid 416K-row joins on list)
- [ ] Rebuild `/catalog/import` as **server-side search + pagination**: style#/name
      search, brand dropdown (from CSV brands), category filter; results are
      **styles** (one card per style), not SKUs
- [ ] Distributor picker step (SanMar enabled; S&S + others grayed out)
- [ ] Tenant pricing model: cost lives in shared distributor data, each shop
      sets a **flat markup**, sell price = cost + markup computed live + snapshot
      on quote (no per-tenant variant table)

### v0.x roadmap — distributors & pricing (deferred, leave room in code)
- [ ] **S&S Activewear + other distributors** — real adapters behind the
      `DistributorAdapter` interface
- [ ] **PromoStandards live API** — real-time inventory + pricing (the API access
      we're waiting on; the SDL CSV is a static snapshot stand-in)
- [ ] **Quantity-aware blank pricing (Option 3)** — use `case_price` at/above
      `case_size`, piece price below, per SKU. Data captured in Phase 4b; v0.1
      uses piece price always (Option 1). *Schema must keep `case_price`/`case_size`.*
- [ ] **Per-product / per-variant markup overrides** — flat org markup is the
      default; allow overriding markup on specific products/lines later

---

## Phase 5 — Settings

- [ ] `/settings/branding` — org info form, logo upload to Supabase Storage *(org logo upload exists from Phase 2c; branding page polish pending)*
- [x] `/settings/pricing-rules` — placements CRUD (schema + RLS + seeded defaults + editor)
- [x] `/settings/pricing-rules` — color count tiers CRUD
- [x] `/settings/pricing-rules` — fees CRUD
- [ ] `/settings/pricing-rules` — size groups + options CRUD *(tables + seed exist; management UI pending)*
- [ ] `/settings/pricing-rules` — categories CRUD *(tables + seed exist; management UI pending)*
- [ ] `/settings/team` — list members
- [ ] `/settings/team` — invite by email (copy-link only; no email send)
- [ ] `/settings/team` — change role / remove member
- [ ] `/settings/document-templates` — basic chooser (one default template) *(lands with PDF work, Phase 6/7)*
- [ ] `/settings/billing` — placeholder card

### Phase 5 done when:
- [x] Pricing rules persist (placements, color tiers, fees)
- [ ] Branding shows up in sidebar (logo, name) *(logo already does via org switcher)*
- [x] Pricing rules will drive Phase 6 quote calculations (placements + color tiers + fees in place)

---

## Phase 6 — Quotes (the centerpiece)

Spec §7 flow C is the source of truth.

### 6.1 List + filters
- [ ] `/quotes` — list with filters (status, customer, date range)

### 6.2 Builder
- [ ] Customer block — pick existing or enter one-off (snapshots into `quotes` row)
- [ ] Line item builder — product picker for `tenant_products` + custom item + fee item types
- [ ] Per-line: `sizes_breakdown` (qty per size with upcharges from `size_options.upcharge`)
- [ ] Per-line: `placements_data` (placement + color count → pulls price from `color_count_pricing` + `placement_options`)
- [ ] Per-line: garment color, notes, image attachments
- [ ] Live totals sidebar (subtotal, tax, discount, shipping, total)
- [ ] Profit calc shown to admins/owners only
- [ ] Notes, internal notes, terms, payment method default

### 6.3 Number generation
- [ ] Server-side quote number from `organizations.quote_number_prefix` + `next_quote_number` + pad length
- [ ] Atomic increment of `next_quote_number`

### 6.4 Status transitions
- [ ] Save as draft
- [ ] Send (mark `sent`, show shareable link placeholder)
- [ ] Approve (mark `approved`, set `approved_at`, capture name + signature data)
- [ ] Decline
- [ ] Expire (automatic when past `expires_at`)

### 6.5 PDF
- [ ] `lib/pdf/quote-pdf.tsx` — React-PDF component
- [ ] `GET /api/quotes/[id]/pdf` — streams PDF
- [ ] Pulls branding from `organization_settings`

### 6.6 Revisions
- [ ] Duplicate quote as v2 with `parent_quote_id` set
- [ ] Version selector on quote detail

### 6.7 Audit
- [ ] Audit log on create / send / approve / decline / revise

### Phase 6 done when:
- [ ] Can build a quote with multiple line items and placements
- [ ] Calculated total matches expectations from pricing rules
- [ ] Save / send / approve all work
- [ ] PDF downloads and uses the org's branding
- [ ] Revisions chain via `parent_quote_id`

---

## Phase 7 — Invoices

- [ ] One-click "Generate invoice" on approved quote — creates `invoices` row + snapshots line items into `invoice_line_items` (editing the quote later does NOT affect the invoice)
- [ ] Invoice number generation (same atomic pattern as quotes)
- [ ] `/invoices` — list with filters
- [ ] `/invoices/[id]` — detail
- [ ] Record payment flow — creates `invoice_payments` row
- [ ] `amount_due` generated column verified working
- [ ] Status auto-progresses: `pending → deposit_paid → paid`
- [ ] `lib/pdf/invoice-pdf.tsx`
- [ ] `GET /api/invoices/[id]/pdf`
- [ ] Audit log on create / payment recorded / status change

### Phase 7 done when:
- [ ] Can generate invoice from approved quote
- [ ] Can record partial + full payments
- [ ] Status progresses correctly
- [ ] PDF downloads with org branding

---

## Phase 8 — Jobs

- [ ] "Start job" button on paid/deposit-paid invoices
- [ ] Creates `jobs` row with `items_checklist` initialized from invoice line items
- [ ] `/jobs` — board view by status column (`scheduled | pre_production | in_production | post_production | ready | delivered | cancelled`)
- [ ] `/jobs/[id]` — detail
- [ ] Status transition controls with notes per transition
- [ ] Per-item checklist ticking
- [ ] Priority badges (`low | normal | high | rush`)
- [ ] Due date display + overdue indicator
- [ ] Audit log on creation / status transitions

### Phase 8 done when:
- [ ] Full quote → invoice → payment → job → delivered lifecycle works end-to-end for one org

---

## Phase 9 — Polish

- [ ] Empty states audit — every list has one with helpful CTA
- [ ] Loading state audit — every async UI has a skeleton or Ring
- [ ] Error boundaries on every app route segment
- [ ] Confirm dialogs on all destructive actions
- [ ] Keyboard shortcut: Cmd+K (palette stub)
- [ ] Keyboard shortcut: Cmd+N (new quote)
- [ ] Audit log writes verified on all key actions
- [ ] **Cross-tenant isolation test** — sign in as org A, attempt direct URLs/IDs from org B, verify 404/403 everywhere
- [ ] Performance pass — skeleton flicker, query refetch settings, image sizes
- [ ] Biome clean, tsc clean

---

## v0.1 final acceptance (spec §16)

The developer can:
- [ ] `pnpm dev`
- [ ] Sign up two test accounts
- [ ] Onboard each as a separate org
- [ ] Build quotes, generate invoices, record payments, run jobs through production
- [ ] Confirm org A cannot see any of org B's data
- [ ] Generate quote + invoice PDFs that match each org's branding

That's the bar. Everything beyond is v0.x / v1.0.
