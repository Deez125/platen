# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repo currently contains only [BUILD_SPEC_V0.1.md](BUILD_SPEC_V0.1.md) — a ~50KB build specification. **No code has been generated yet.** Your job is to execute the spec; treat it as the source of truth and re-read the relevant section before implementing each phase. The build order is defined in spec §12 — do not skip ahead.

## Naming — read this before anything else

The product name is **not finalized**. The working name in conversations is "PressDeck" but **this string (and "PressDeck", "InkNav", "Midwest Patriot", or any other brand-specific name) must never appear in code, file names, folder names, package names, db names, env vars, or identifiers.**

- Package name: `apparel-shop-saas`
- Local DB name: `apparel_shop_dev`
- All user-facing brand strings come from `lib/config/brand.ts` (single `BRAND` const)
- All brand colors are Tailwind theme tokens, never inline hex
- A future rebrand should require editing **only** `lib/config/brand.ts` and `tailwind.config.ts`

## Tech stack (locked decisions)

- Next.js 15+ App Router, React 19+, TypeScript strict + `noUncheckedIndexedAccess`
- Postgres via Supabase + Drizzle ORM (schema, migrations, typed queries) + Drizzle Kit
- Supabase Auth (email/password); RLS policies on every business table
- Tailwind v4, shadcn/ui (copied into `components/ui/`, not an npm dep), lucide-react, sonner, next-themes
- TanStack Query v5 for server state; URL state via Next searchParams; no global state lib
- React Hook Form + Zod for forms; Zod for every server-action input
- `@react-pdf/renderer` for server-side PDFs (do not use html2canvas)
- Biome for lint+format (not ESLint/Prettier)
- pnpm

Explicitly **not** in v0.1: Stripe, Resend, Inngest/Trigger.dev, Sentry, PostHog, Storybook, Playwright/Cypress, CI/CD, real distributor APIs, AI features, customer portal, subdomain routing, email/SMS sending.

## Multi-tenancy — the most important architecture

This is the architectural decision the rest of the codebase depends on. Get it right at line one.

- **Organization** = tenant = shop. **Membership** joins users to orgs with a role (`owner | admin | member | production | readonly`).
- **Routing for v0.1: no `/app` prefix** — app pages live at the root (`/dashboard`, `/customers`, etc.). `/` redirects to `/dashboard`. Active org stored in signed HTTP-only `active_org_id` cookie. Subdomain routing comes in v0.x (`<orgslug>.appdomain.com`) — when it lands, the per-tenant subdomain *is* the app, so no rewrite needed.
- **Every business table has `tenant_id UUID NOT NULL`** (indexed). Shared tables (no `tenant_id`): `users`, `profiles`, `organizations`, `memberships`, `subscription_plans`, `distributor_sources`, `distributor_products`, `distributor_product_variants`, `system_audit_log`.
- **Belt and suspenders isolation:**
  1. Supabase RLS policies on every business table keyed off `tenant_id` + `memberships`.
  2. `getTenantContext()` (in `lib/auth/session.ts`) runs at the top of every server action / API route, validates membership, returns `{ userId, tenantId, role }`. Every query uses that `tenantId`.
- The service role key is for admin/seed scripts only — never in user-facing code paths.

## Tenant-configurable items (data, not code)

These were hardcoded in the previous version (v0.7) and **must be DB rows in v0.1**, not constants:

- Org info, logo, brand colors, address, tax rate, min order quantity
- Quote/invoice number prefix + pad length + sequence (`organizations.next_quote_number`, etc.)
- Product categories (no hardcoded "shirt/hoodie/koozie" — `product_categories` per tenant)
- Sizes (`size_groups` + `size_options`, with `upcharge` per size)
- Colors (`color_options`), placements (`placement_options`), color-count pricing tiers (`color_count_pricing`), fees (`fees`)
- Document templates (`document_templates`) — branding pulled from `organization_settings`

## Schema patterns to internalize

- UUID PKs everywhere (`uuid_generate_v4()`), `created_at` + `updated_at TIMESTAMPTZ` with trigger updating `updated_at`.
- **Quotes and invoices snapshot the customer fields** (`customer_name`, `customer_company`, address, etc.) so deleting a `customers` row doesn't break historical docs.
- **Invoice line items are a snapshot** of quote line items at invoice-generation time — editing the quote later does not affect an issued invoice.
- `invoices.amount_due` is a `GENERATED ALWAYS AS (total - amount_paid) STORED` column.
- `quote_line_items.sizes_breakdown` and `placements_data` are JSONB (variable shape per item).
- Quote status: `draft | sent | viewed | revised | approved | declined | expired`. Invoice status: `pending | deposit_paid | paid | overdue | refunded | void`. Job status: `scheduled | pre_production | in_production | post_production | ready | delivered | cancelled`. These transitions are part of the core flows in spec §7.
- Quote revisions: `parent_quote_id` + `version` (UNIQUE `tenant_id, quote_number, version`).
- Job items checklist: JSONB initialized from invoice line items when the job is generated.

## Project layout (key directories)

```
src/app/                Next.js App Router. Route groups: (auth), (app); app pages live at the root (no /app prefix)
src/components/         ui/ = shadcn primitives; domain folders (customers/, quotes/, etc.); skeletons in components/<domain>/skeletons.tsx
src/lib/config/         brand.ts (rebrand target) and env.ts (Zod-validated env loader)
src/lib/db/             schema/ (one file per area), queries/, rls.sql (RLS applied via migration)
src/lib/auth/           supabase-server.ts, supabase-browser.ts, session.ts (getTenantContext, requireAuth, requireRole), middleware.ts
src/lib/actions/        server actions, one file per domain (customers.ts, quotes.ts, ...)
src/lib/schemas/        Zod input schemas per domain
src/lib/pdf/            React-PDF templates (quote-pdf.tsx, invoice-pdf.tsx, template-renderer.ts)
src/lib/distributors/   adapter pattern: types.ts + sanmar.ts + ssactivewear.ts + index.ts registry
src/middleware.ts       Next middleware for auth + tenant routing
scripts/                seed.ts, seed-distributor-catalog.ts, migrate.ts
drizzle/                generated migrations
docs/                   architecture.md, data-model.md, auth-and-tenancy.md, developer-setup.md, pdf-generation.md, distributor-integration.md
```

## Distributor adapter pattern

`lib/distributors/types.ts` defines `DistributorAdapter` (`slug`, `syncProducts`, `syncVariants`, `getInventory`). For v0.1:

- `sanmar.ts` returns seeded local data from `scripts/seed-distributor-catalog.ts` (~30 popular Gildan/Bella+Canvas/Next Level styles). Real PromoStandards API is v0.x.
- `ssactivewear.ts` is a minimal stub returning empty arrays.
- On tenant onboarding, ~10 starter products are imported from `distributor_products` into `tenant_products` with default pricing.

## UI conventions

- **Light mode default**, dark mode via `next-themes`. Sentence case everywhere (no Title Case headers, no ALL CAPS).
- **Sidebar 240px, collapsible to icons.** Org switcher at top (with plan), workspace section (Dashboard, Inbox, Quotes, Jobs with sub-items, Production, Invoices, Customers, Catalog, Artwork, Reports), Setup section (Branding, Templates, Pricing rules, Integrations, Settings), user profile at bottom.
- **Topbar:** Cmd+K placeholder, notifications icon, theme toggle, primary action button ("New quote").
- Every page uses `<PageHeader title subtitle actions />`. Every empty list uses `<EmptyState>`. Every destructive action uses `<ConfirmDialog>`.
- Toasts via Sonner (`toast.success`, `toast.error`); tables via shadcn DataTable patterns.
- **Forms:** build `<FormField name label required>` abstraction once; never redeclare `<label> + <input>` per page.
- **No inline `style={{}}`** — Tailwind classes or component variants only.

## Loading states — mandatory pattern

Every async UI state must show a skeleton or the `<Ring>` spinner. **Never** a blank screen, "Loading..." text, or flash of unstyled content.

- **Skeletons** when the eventual layout is known (lists, detail pages, dashboards). Build domain composites: `<QuoteListSkeleton>`, `<QuoteDetailSkeleton>`, `<CustomerListSkeleton>`, `<CustomerDetailSkeleton>`, `<InvoiceListSkeleton>`, `<InvoiceDetailSkeleton>`, `<JobListSkeleton>`, `<JobBoardSkeleton>`, `<JobDetailSkeleton>`, `<DashboardSkeleton>`, plus generics `<TableSkeleton rows columns />` and `<CardGridSkeleton count />`. Live in `components/<domain>/skeletons.tsx`.
- **Ring spinner** (`components/ui/ring.tsx`, ported from loading-ui.com — single source file, size+color props, reads theme tokens) for: inside submit buttons, inline indicators, full-screen blockers, modal/dialog initial fetches.

## Core flows v0.1 must support end-to-end (spec §7)

A: Sign up → onboard new shop (seeds defaults: categories, sizes, placements, color tiers, fees) → dashboard.
B: Create customer (CRUD with search + pagination).
C: Build quote — pick customer, add line items via product picker, set placements/colors/sizes, live total sidebar, save draft or send. Quote number generated server-side from org's prefix + sequence.
D: Approve quote → "Generate invoice" one-click (snapshot line items + link `quote_id`).
E: Record payment → creates `invoice_payments` row → status auto-progresses `pending → deposit_paid → paid`.
F: Generate job from paid/deposit-paid invoice (initialize `items_checklist` from invoice line items).
G: Move job through production (status transitions + items checklist + notes).
H: Dashboard shows revenue MTD, open quotes, jobs in production, AR outstanding.
I: Settings — branding, team (invites are copy-link only in v0.1, no email), pricing rules, document templates.

## Non-negotiables (spec §15)

1. No hardcoded brand strings — always `BRAND` from `lib/config/brand.ts`.
2. No hardcoded per-shop business logic — everything tenant-specific is a row in a settings table.
3. `tenant_id` on every business table. No exceptions.
4. RLS policies on every business table. No exceptions.
5. Zod validation on every server action input. No exceptions.
6. No inline `style={{}}`.
7. No `any` types. Strict TS is non-negotiable.
8. No secrets in code. Env vars only, validated at startup by `lib/config/env.ts`.
9. Every server action calls `getTenantContext()` first. No raw DB access without it.
10. Components, not duplication — extract on second occurrence.
11. No blank loading states — skeleton or `<Ring>`, always.

## Hooks for deferred work

When you write code that will later need Stripe / Resend / Inngest / real distributor APIs / customer portal / subdomain routing, leave the **interface** in place (DB columns, adapter files, route placeholders) but no implementation. Mark slow synchronous server actions with a `TODO` comment for future queue migration. Don't build the deferred feature; don't make it impossible to add either.

## Environment variables

`.env.local` (gitignored), template in `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                 # Postgres connection string for Drizzle migrations
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENV=development           # development | staging | production
COOKIE_SECRET=                # random 32+ char string for cookie signing
```

`lib/config/env.ts` validates with Zod and fails fast at startup if anything is missing.

## Common commands (once scaffolded)

The project hasn't been initialized. After Phase 1 of the build order, expected commands will be:

```
pnpm dev                          # Next dev server
pnpm build                        # production build
pnpm lint                         # biome check
pnpm format                       # biome format --write
pnpm typecheck                    # tsc --noEmit
pnpm db:generate                  # drizzle-kit generate (new migration from schema diff)
pnpm db:migrate                   # apply migrations (scripts/migrate.ts)
pnpm db:studio                    # drizzle-kit studio
pnpm db:seed                      # scripts/seed.ts (demo org + sample data)
pnpm db:seed:catalog              # scripts/seed-distributor-catalog.ts
```

Add these to `package.json` scripts when initializing.

## Definition of done for v0.1

The developer can `pnpm dev`, sign up two test accounts, onboard each as a separate org, run the full quote → invoice → payment → job → delivered lifecycle for both, confirm org A cannot see any of org B's data (test RLS), and generate quote+invoice PDFs that reflect each org's branding. That's the bar.
