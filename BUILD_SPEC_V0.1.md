# BUILD SPEC — v0.1

> Foundation build for a multi-tenant SaaS for custom apparel / screen-printing shops. This document is the source of truth for v0.1 (initial buildable foundation, local dev only). It is written to be handed directly to an AI coding assistant (Claude Code) to execute step by step.

---

## CRITICAL: Naming & Branding

**The product name is NOT finalized.** Working name during conversations is "PressDeck" but **this name must not appear anywhere in code, file names, folder names, package names, database names, environment variables, or code identifiers.**

### Naming rules

- **Package name** (`package.json`): `apparel-shop-saas`
- **Database name** (local dev): `apparel_shop_dev`
- **Folder name** for the project root: developer's choice, suggest `apparel-shop` or similar generic
- **No "PressDeck", "InkNav", "Midwest Patriot", or any brand-specific strings** in code, comments, or config
- **All user-facing brand strings** (app display name, page titles, email sender names, marketing copy in UI) must read from a single source: `lib/config/brand.ts`
- **All user-facing brand colors** must be defined as Tailwind theme tokens, not hardcoded hex values
- When the real product name is chosen later, the rebrand should require changing **only `lib/config/brand.ts` and `tailwind.config.ts`** — nothing else

### `lib/config/brand.ts` shape

```ts
export const BRAND = {
  name: "AppName",                    // shown in UI, page titles, emails
  shortName: "App",                   // for tight spaces
  tagline: "Shop management for custom apparel",
  supportEmail: "support@example.com",
  marketingUrl: "https://example.com",
} as const;
```

Use `BRAND.name` everywhere a brand name would appear. Never type the brand name as a literal string in any component.

---

## 1. Goal & scope of v0.1

### What v0.1 IS
v0.1 is the **foundation build**: project scaffolding, auth, multi-tenancy, the core data model, and the primary CRUD screens (customers, products, quotes, invoices, jobs). It is a thing the developer can run locally, sign up two test tenants on, and walk through a full quote-to-invoice-to-job lifecycle.

### What v0.1 IS NOT
- Not deployed (local dev only)
- No payment processing (Stripe deferred)
- No email/SMS (Resend deferred)
- No background jobs (Inngest deferred — use plain async functions where needed)
- No AI features
- No customer-facing portal
- No SanMar/S&S live API integration (use seeded local catalog data, with adapter interfaces ready)
- No mobile-specific optimizations beyond responsive layout
- No automated tests beyond critical-path smoke tests

### v0.x and v1.0 (out of scope for this spec, but architecture must accommodate)
- v0.2+: Production deployment to Hostinger VPS via Coolify, real SanMar PromoStandards integration, Stripe billing, Resend email
- v0.x: Subdomain-based tenant routing (path-based for v0.1), custom domain support, AI features, customer portal, background jobs (Inngest/Trigger.dev)
- v1.0: First public release — fully polished, billing live, real distributor sync, email notifications, mobile-optimized, basic AI features

---

## 2. Tech Stack

### Core framework
- **Next.js 15+** (App Router) with **TypeScript** in strict mode
- **React 19+**
- Single Next.js application — frontend pages and backend API routes / server actions live in the same project
- Single deployable unit (one Docker container when deployment comes later)

### Database & ORM
- **Postgres** via **Supabase** (managed in dev; can self-host later)
- **Drizzle ORM** for schema definition, migrations, and type-safe queries
- **Drizzle Kit** for migration generation
- Local dev: connect to Supabase free-tier project directly, OR run Supabase locally via Docker (developer's choice — spec assumes hosted Supabase for simplicity)

### Auth
- **Supabase Auth** (email/password initially; OAuth providers can be enabled later)
- Multi-tenancy: each user belongs to one or more `organizations` (= tenants = shops); user's "active org" stored in session/cookie
- RLS policies on every business table keyed off `tenant_id`
- Service role key used only for admin/seed scripts, never in user-facing code paths

### Frontend stack
- **Tailwind CSS v4** (utility-first styling; theme tokens defined in config)
- **shadcn/ui** components — copied into `components/ui/` so they can be customized freely (not an npm dependency)
- **lucide-react** for icons (consistent set; replaces the mixed icon mess from v0.7)
- **TanStack Query (React Query) v5** for client-side data fetching, caching, and mutations
- **React Hook Form** + **Zod** for form state and validation
- **next-themes** for light/dark mode (light = default for SaaS-feel; dark mode available)
- **sonner** for toast notifications (replaces the buggy custom toast)

### Validation & shared types
- **Zod** schemas for every API input/output
- Drizzle's inferred types for database rows
- Shared types live in `lib/types/` and are imported by both server and client code

### File storage
- **Supabase Storage** with per-tenant prefixes (`tenants/<tenant_id>/...`)
- RLS policies on storage buckets

### State management
- Server state: TanStack Query
- URL state: Next.js searchParams (filters, pagination)
- Local UI state: React useState / useReducer
- No global state library needed for v0.1

### Tooling
- **Biome** for linting and formatting (faster than ESLint+Prettier, single tool)
- **TypeScript strict mode** + `noUncheckedIndexedAccess: true`
- **Drizzle Studio** for database browsing in dev
- **pnpm** as the package manager

### What is NOT in v0.1
- No Stripe, no Resend, no Inngest, no Trigger.dev
- No Sentry, no PostHog, no analytics
- No Storybook
- No E2E test framework (Playwright/Cypress) — add in v0.x
- No CI/CD pipeline — add when deployment starts

---

## 3. Multi-tenancy model

This is the most important architectural decision. **Get this right at line one.**

### Concepts

- **Organization** (= tenant = shop) — a customer of the SaaS. Has an id, name, slug, settings, branding, etc.
- **User** — a person with login credentials. Belongs to one or more organizations.
- **Membership** — the join row between a user and an organization, with a `role` (owner / admin / member / production / readonly).

### Routing strategy for v0.1

**Path-based** for v0.1. Architecture must support subdomain-based in the future without schema changes.

- `/` — redirects to `/dashboard` (no separate landing page in v0.1 — `<websitename>.com` will be the marketing site, separate property)
- `/login`, `/signup` — auth pages
- `/onboarding` — first-time setup wizard for a new org
- `/dashboard`, `/quotes`, `/customers`, etc. — app pages (live at the root, no `/app` prefix)
- Active org is stored in a secure HTTP-only cookie (`active_org_id`)
- Switching orgs updates the cookie + triggers a router refresh

When subdomain routing is added later (v0.x):
- `<orgslug>.appdomain.com` → resolves to org's workspace (the subdomain *is* the app)
- Same code paths, just a different routing-layer middleware

### Data isolation

Every business-data table has a non-null `tenant_id UUID` column.

**Database-level isolation:** Supabase RLS policies on every business table. Policies key off the user's JWT and check membership in the row's `tenant_id`.

**Application-level isolation:** A `getTenantContext()` helper runs at the top of every server action / API route. Reads the active org from cookie, validates the user is a member, returns `{ tenantId, userId, role }`. All subsequent queries use `tenantId`.

**Belt and suspenders:** even if a query forgets to include `tenant_id`, RLS prevents the leak. Even if RLS is misconfigured, the app-level helper catches it.

### Shared (non-tenant) tables

These tables are shared across all tenants — they are global reference data:

- `users` (auth)
- `organizations` (the tenants themselves)
- `memberships` (joins users to orgs)
- `subscription_plans` (Stripe plans, when added)
- `distributor_products` (SanMar/S&S catalog data — shared catalog, tenants can override with their own pricing)
- `distributor_product_variants`
- `system_audit_log`

Everything else has `tenant_id`.

### Per-tenant configurable items (must be data, not code)

From the audit, the following were hardcoded in v0.7 and must be tenant-configurable in v0.1:

- Org name, address, contact info, logo (`organizations` row + `organization_settings`)
- Quote number prefix and format (e.g., `MWPB-XXXXX` → user-defined pattern)
- Default tax rate
- Default minimum order quantity
- Default payment method
- Tax-exempt customer flag (per customer)
- Product types (no longer hardcoded to "shirt/hoodie/hat/tank top/koozie" — defined as `product_categories` rows per tenant)
- Sizes (no longer hardcoded S–4XL — defined as `size_options` rows per tenant, ordered)
- Color palette / placement options / fee types — all tenant-configurable
- Document templates (quote/invoice PDFs) — branding pulled from org settings
- Job status workflow (per-tenant configurable in v0.x; default workflow in v0.1)

---

## 4. Project structure

```
apparel-shop/
├── .env.local                      # local environment variables (gitignored)
├── .env.example                    # template for required env vars
├── .gitignore
├── biome.json                      # linter/formatter config
├── drizzle.config.ts               # Drizzle Kit config
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
├── tsconfig.json
│
├── public/                         # static assets (no brand-specific images here)
│   └── favicon.ico
│
├── drizzle/                        # generated migrations
│   ├── 0000_initial.sql
│   └── meta/
│
├── scripts/                        # one-off scripts
│   ├── seed.ts                     # seeds a demo org + sample data for local dev
│   ├── seed-distributor-catalog.ts # seeds local SanMar/S&S placeholder data
│   └── migrate.ts                  # runs migrations
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (marketing)/            # public unauthenticated routes
│   │   │   ├── page.tsx            # landing page placeholder
│   │   │   └── layout.tsx
│   │   ├── (auth)/                 # auth routes
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── onboarding/             # first-time org setup
│   │   │   └── page.tsx
│   │   ├── app/                    # authenticated app — REQUIRES login + active org
│   │   │   ├── layout.tsx          # app shell with sidebar/topbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx        # list
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx   # detail/edit
│   │   │   ├── catalog/
│   │   │   │   ├── page.tsx        # browse distributor catalog + custom products
│   │   │   │   └── products/[id]/page.tsx
│   │   │   ├── quotes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── reports/page.tsx    # placeholder, basic numbers only
│   │   │   └── settings/
│   │   │       ├── page.tsx        # general settings
│   │   │       ├── branding/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── pricing-rules/page.tsx
│   │   │       ├── document-templates/page.tsx
│   │   │       └── billing/page.tsx # placeholder for Stripe later
│   │   ├── api/                    # API routes (only when server actions don't fit)
│   │   │   ├── auth/[...]/route.ts # Supabase auth callbacks
│   │   │   ├── upload/route.ts     # file uploads to Supabase Storage
│   │   │   └── webhooks/           # for future Stripe/EasyPost webhooks
│   │   ├── layout.tsx              # root layout
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (button, input, dialog, etc.)
│   │   ├── layout/                 # AppShell, Sidebar, Topbar, MobileNav
│   │   ├── customers/              # CustomerCard, CustomerForm, CustomerList
│   │   ├── catalog/                # ProductCard, ProductPicker, VariantSelector
│   │   ├── quotes/                 # QuoteBuilder, QuoteLineItem, QuotePreview, QuoteCard
│   │   ├── invoices/               # InvoiceCard, InvoicePreview, InvoicePDF
│   │   ├── jobs/                   # JobCard, JobBoard, JobStatusBadge
│   │   ├── settings/               # branding editor, team management
│   │   ├── forms/                  # reusable form fields built on RHF + Zod
│   │   └── common/                 # PageHeader, EmptyState, ConfirmDialog, etc.
│   │
│   ├── lib/
│   │   ├── config/
│   │   │   ├── brand.ts            # display brand config (rebrand = change this only)
│   │   │   └── env.ts              # typed env var loader (validates at startup)
│   │   ├── db/
│   │   │   ├── index.ts            # Drizzle client
│   │   │   ├── schema/             # one file per schema area
│   │   │   │   ├── auth.ts         # users, orgs, memberships
│   │   │   │   ├── customers.ts
│   │   │   │   ├── catalog.ts      # products, variants, distributor data
│   │   │   │   ├── quotes.ts
│   │   │   │   ├── invoices.ts
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── settings.ts     # pricing rules, doc templates, etc.
│   │   │   │   └── index.ts        # barrel export
│   │   │   ├── queries/            # reusable typed query helpers
│   │   │   └── rls.sql             # RLS policy definitions (applied via migration)
│   │   ├── auth/
│   │   │   ├── supabase-server.ts  # server-side Supabase client
│   │   │   ├── supabase-browser.ts # browser Supabase client
│   │   │   ├── session.ts          # getTenantContext(), requireAuth(), etc.
│   │   │   └── middleware.ts       # Next.js middleware for route protection
│   │   ├── actions/                # server actions, one file per domain
│   │   │   ├── customers.ts
│   │   │   ├── quotes.ts
│   │   │   ├── invoices.ts
│   │   │   ├── jobs.ts
│   │   │   ├── settings.ts
│   │   │   └── org.ts
│   │   ├── schemas/                # Zod schemas (input validation)
│   │   │   ├── customer.ts
│   │   │   ├── quote.ts
│   │   │   └── ...
│   │   ├── pdf/                    # PDF generation (server-side)
│   │   │   ├── quote-pdf.tsx       # React-PDF for quote document
│   │   │   ├── invoice-pdf.tsx
│   │   │   └── template-renderer.ts
│   │   ├── distributors/           # distributor adapter pattern
│   │   │   ├── types.ts            # common interface
│   │   │   ├── sanmar.ts           # SanMar adapter (placeholder for v0.1, seed data only)
│   │   │   ├── ssactivewear.ts     # S&S adapter (placeholder only — minimal stub)
│   │   │   └── index.ts            # registry
│   │   ├── types/                  # shared TS types
│   │   ├── utils/                  # cn(), formatCurrency(), date helpers, etc.
│   │   └── constants.ts            # generic non-brand constants
│   │
│   └── middleware.ts               # Next.js middleware (auth + tenant routing)
│
└── docs/                           # in-repo docs
    ├── architecture.md             # high-level architecture notes
    ├── data-model.md               # ERD + table descriptions
    ├── auth-and-tenancy.md         # how multi-tenancy works
    └── developer-setup.md          # how to run locally
```

---

## 5. Database schema

All tables use UUID primary keys (`uuid_generate_v4()`). All business tables have `tenant_id UUID NOT NULL` and indexed. All tables have `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()`. Trigger updates `updated_at` on every row change.

### Auth & tenancy tables

**`users`** (managed by Supabase Auth — we extend with a `profiles` table)

**`profiles`**
- `id UUID PK` (FK to `auth.users.id`)
- `email TEXT NOT NULL`
- `first_name TEXT`
- `last_name TEXT`
- `avatar_url TEXT`
- `phone TEXT`
- timestamps

**`organizations`**
- `id UUID PK`
- `slug TEXT UNIQUE NOT NULL` (lowercase, kebab-case; used for future subdomain routing)
- `name TEXT NOT NULL`
- `logo_url TEXT`
- `address_line1 TEXT`, `address_line2 TEXT`, `city TEXT`, `state TEXT`, `postal_code TEXT`, `country TEXT DEFAULT 'US'`
- `phone TEXT`, `email TEXT`, `website TEXT`
- `default_tax_rate NUMERIC(5,4) DEFAULT 0` (e.g., 0.0925 = 9.25%)
- `default_min_quantity INT DEFAULT 1`
- `quote_number_prefix TEXT DEFAULT 'Q-'`
- `quote_number_pad_length INT DEFAULT 5`
- `invoice_number_prefix TEXT DEFAULT 'INV-'`
- `invoice_number_pad_length INT DEFAULT 5`
- `next_quote_number INT DEFAULT 1`
- `next_invoice_number INT DEFAULT 1`
- `subscription_plan TEXT DEFAULT 'trial'` (placeholder for Stripe)
- `subscription_status TEXT DEFAULT 'active'`
- timestamps

**`memberships`**
- `id UUID PK`
- `user_id UUID FK profiles(id)`
- `organization_id UUID FK organizations(id)`
- `role TEXT NOT NULL` — enum: `owner | admin | member | production | readonly`
- `invited_by UUID FK profiles(id)`
- `accepted_at TIMESTAMPTZ`
- timestamps
- UNIQUE(`user_id`, `organization_id`)

**`organization_settings`** (1:1 with `organizations`; structured + JSONB for flexibility)
- `organization_id UUID PK FK organizations(id)`
- `currency TEXT DEFAULT 'USD'`
- `timezone TEXT DEFAULT 'America/Chicago'`
- `date_format TEXT DEFAULT 'MM/DD/YYYY'`
- `pdf_template_id UUID` (FK to `document_templates`, nullable; if null use default)
- `quote_expiration_days INT DEFAULT 30`
- `extra JSONB DEFAULT '{}'` (catch-all for future settings without migrations)
- timestamps

### Customers

**`customers`**
- `id UUID PK`
- `tenant_id UUID NOT NULL FK organizations(id)`
- `name TEXT NOT NULL` (contact name)
- `company TEXT`
- `email TEXT`
- `phone TEXT`
- `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`
- `bill_to_same` BOOL DEFAULT TRUE
- `bill_to_name`, `bill_to_address_*` (mirrors above)
- `is_tax_exempt BOOL DEFAULT FALSE`
- `tax_exempt_id TEXT` (resale cert # etc.)
- `notes TEXT`
- `logo_url TEXT`
- `default_payment_terms TEXT` (e.g., "Net 30", "Due on receipt")
- timestamps
- INDEX(`tenant_id`)
- INDEX(`tenant_id`, `company`)

### Catalog: product categories, sizes, colors (tenant-configurable)

**`product_categories`** — tenant-configurable replacements for hardcoded "shirt/hoodie/koozie"
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `name TEXT NOT NULL` (e.g., "T-Shirt", "Hoodie", "Hat", "Koozie")
- `slug TEXT NOT NULL`
- `decoration_method TEXT` (e.g., "screen_print", "embroidery", "dtf", "vinyl") — drives workflow logic
- `default_min_quantity INT`
- `sort_order INT`
- timestamps
- UNIQUE(`tenant_id`, `slug`)

**`size_groups`** — a named ordered set of sizes
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `name TEXT NOT NULL` (e.g., "Adult Tee Sizes", "Youth Tee Sizes", "Hat Size", "Koozie Size")
- timestamps

**`size_options`** — individual sizes within a group
- `id UUID PK`
- `size_group_id UUID NOT NULL`
- `label TEXT NOT NULL` (e.g., "S", "M", "L", "XL", "2XL")
- `sort_order INT NOT NULL`
- `upcharge NUMERIC(10,2) DEFAULT 0` (e.g., 2XL costs +$2)
- UNIQUE(`size_group_id`, `label`)

**`color_options`** — generic color list per tenant (for placements, custom inks)
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `name TEXT NOT NULL`
- `hex TEXT`
- `sort_order INT`
- timestamps

### Catalog: distributor data (shared) and tenant products

**`distributor_sources`**
- `id UUID PK`
- `slug TEXT UNIQUE NOT NULL` (e.g., "sanmar", "ssactivewear", "alphabroder")
- `name TEXT NOT NULL`
- `is_active BOOL DEFAULT TRUE`

**`distributor_products`** — shared catalog data synced from distributor APIs
- `id UUID PK`
- `distributor_id UUID NOT NULL FK distributor_sources(id)`
- `style_number TEXT NOT NULL` (e.g., "G500")
- `brand TEXT NOT NULL` (e.g., "Gildan")
- `name TEXT NOT NULL`
- `description TEXT`
- `category TEXT` (raw category from distributor, mapped to tenant categories on import)
- `image_url TEXT`
- `is_active BOOL DEFAULT TRUE`
- `raw JSONB` (entire distributor payload for future use)
- `last_synced_at TIMESTAMPTZ`
- timestamps
- UNIQUE(`distributor_id`, `style_number`)
- INDEX(`brand`, `style_number`)

**`distributor_product_variants`**
- `id UUID PK`
- `distributor_product_id UUID NOT NULL`
- `color_name TEXT NOT NULL`
- `color_hex TEXT`
- `size_label TEXT NOT NULL`
- `sku TEXT`
- `wholesale_price NUMERIC(10,2)`
- `inventory_quantity INT` (last known)
- `is_available BOOL DEFAULT TRUE`
- timestamps
- INDEX(`distributor_product_id`)
- UNIQUE(`distributor_product_id`, `color_name`, `size_label`)

**`tenant_products`** — a product as it appears in the tenant's catalog. May reference a distributor product or be a fully custom product.
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `category_id UUID FK product_categories(id)`
- `source TEXT NOT NULL` — enum: `distributor | custom`
- `distributor_product_id UUID` (nullable; required when source = distributor)
- `name TEXT NOT NULL` (override of distributor name)
- `description TEXT`
- `image_url TEXT` (override of distributor image)
- `min_quantity INT`
- `is_active BOOL DEFAULT TRUE`
- `sort_order INT`
- timestamps
- INDEX(`tenant_id`, `category_id`)

**`tenant_product_pricing`** — per-tenant pricing on a product. Supports tiered/quantity-break pricing.
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `tenant_product_id UUID NOT NULL`
- `min_quantity INT NOT NULL DEFAULT 1`
- `max_quantity INT` (nullable for top tier)
- `unit_price NUMERIC(10,2) NOT NULL`
- `cost NUMERIC(10,2)` (the tenant's blank cost — drives profit calc)
- INDEX(`tenant_product_id`)

### Pricing rules (placements, fees, color tiers — tenant-configurable)

**`placement_options`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `name TEXT NOT NULL` (e.g., "Front Center", "Full Back", "Left Sleeve")
- `default_price NUMERIC(10,2) DEFAULT 0`
- `sort_order INT`
- timestamps

**`color_count_pricing`** — tiered pricing by # of ink colors in a print
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `color_count INT NOT NULL` (1, 2, 3, 4, ...)
- `price NUMERIC(10,2) NOT NULL`
- UNIQUE(`tenant_id`, `color_count`)

**`fees`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `name TEXT NOT NULL` (e.g., "Screen Fee", "Setup Fee", "Rush Fee", "Art Fee")
- `default_amount NUMERIC(10,2) DEFAULT 0`
- `is_per_color BOOL DEFAULT FALSE`
- `sort_order INT`
- timestamps

### Quotes

**`quotes`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `quote_number TEXT NOT NULL` (generated server-side from org's prefix/sequence)
- `customer_id UUID FK customers(id)` (nullable — quote can have one-off customer info)
- `status TEXT NOT NULL DEFAULT 'draft'` — enum: `draft | sent | viewed | revised | approved | declined | expired`
- `quote_date DATE NOT NULL DEFAULT CURRENT_DATE`
- `expires_at TIMESTAMPTZ`
- `version INT NOT NULL DEFAULT 1`
- `parent_quote_id UUID` (nullable; set when this is a revision of another quote)
- **Customer snapshot fields** (so deletions of `customers` don't break historical quotes): `customer_name`, `customer_company`, `customer_email`, `customer_phone`, `customer_address_*`, `bill_to_*`
- `subtotal NUMERIC(12,2) DEFAULT 0`
- `tax_rate NUMERIC(5,4)` (snapshot of rate at quote time)
- `tax_amount NUMERIC(12,2) DEFAULT 0`
- `is_tax_exempt BOOL DEFAULT FALSE`
- `shipping_amount NUMERIC(12,2) DEFAULT 0`
- `discount_amount NUMERIC(12,2) DEFAULT 0`
- `total NUMERIC(12,2) DEFAULT 0`
- `cost NUMERIC(12,2)` (snapshot of total blank/fee cost — drives profit)
- `profit NUMERIC(12,2)` (calculated server-side, stored for fast reports)
- `notes TEXT`
- `internal_notes TEXT`
- `terms TEXT`
- `payment_method_default TEXT`
- `approved_at TIMESTAMPTZ`
- `approved_by_name TEXT` (the customer's name as captured at approval)
- `approved_by_signature_data TEXT` (base64 sig image or "typed:Name" placeholder)
- timestamps
- UNIQUE(`tenant_id`, `quote_number`, `version`)
- INDEX(`tenant_id`, `status`)
- INDEX(`tenant_id`, `customer_id`)

**`quote_line_items`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `quote_id UUID NOT NULL FK quotes(id) ON DELETE CASCADE`
- `tenant_product_id UUID FK tenant_products(id)` (nullable for custom items)
- `item_type TEXT NOT NULL` — enum: `product | custom | fee`
- `name TEXT NOT NULL` (snapshot of product name or custom description)
- `description TEXT`
- `quantity INT NOT NULL DEFAULT 1`
- `unit_price NUMERIC(10,2) NOT NULL DEFAULT 0`
- `unit_cost NUMERIC(10,2)` (blank cost per unit)
- `total_price NUMERIC(12,2) NOT NULL DEFAULT 0` (quantity * unit_price + size upcharges)
- `total_cost NUMERIC(12,2) DEFAULT 0`
- `sort_order INT`
- `sizes_breakdown JSONB` (e.g., `[{ size: "M", qty: 10, unit_price: 8 }, { size: "XL", qty: 5, unit_price: 10 }]`)
- `placements_data JSONB` (e.g., `[{ placement_id: "...", placement_name: "Front", color_count: 2, price: 4 }, ...]`)
- `color_name TEXT` (selected garment color, snapshot)
- `notes TEXT`
- timestamps
- INDEX(`quote_id`)

**`quote_line_item_images`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `quote_line_item_id UUID NOT NULL`
- `image_url TEXT NOT NULL`
- `sort_order INT`
- `caption TEXT`
- timestamps

### Invoices

**`invoices`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `invoice_number TEXT NOT NULL`
- `quote_id UUID FK quotes(id)` (nullable — invoices can also be standalone)
- `customer_id UUID FK customers(id)` (nullable for the same reason as quotes)
- `status TEXT NOT NULL DEFAULT 'pending'` — enum: `pending | deposit_paid | paid | overdue | refunded | void`
- `invoice_date DATE NOT NULL DEFAULT CURRENT_DATE`
- `due_date DATE`
- **Snapshot fields** like on quotes
- `subtotal`, `tax_rate`, `tax_amount`, `shipping_amount`, `discount_amount`, `total` (same as quotes)
- `amount_paid NUMERIC(12,2) DEFAULT 0`
- `amount_due NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED`
- `deposit_required NUMERIC(12,2) DEFAULT 0`
- `payment_method TEXT`
- `payment_terms TEXT`
- `notes TEXT`
- `internal_notes TEXT`
- timestamps
- UNIQUE(`tenant_id`, `invoice_number`)
- INDEX(`tenant_id`, `status`)

**`invoice_line_items`** — same shape as `quote_line_items` (snapshot at invoice generation time, so editing quote later doesn't affect issued invoice)
- (Same fields as `quote_line_items`, plus `invoice_id` instead of `quote_id`)

**`invoice_payments`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `invoice_id UUID NOT NULL`
- `amount NUMERIC(12,2) NOT NULL`
- `paid_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `payment_method TEXT` (cash, check, card, ach, other)
- `reference TEXT` (check #, last 4 of card, etc.)
- `notes TEXT`
- `created_by UUID FK profiles(id)`
- timestamps
- INDEX(`invoice_id`)

### Jobs (= production work orders)

**`jobs`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `job_number TEXT NOT NULL` (can share invoice/quote number or have its own series — tenant choice in settings later; for v0.1 use the invoice number)
- `invoice_id UUID FK invoices(id)`
- `quote_id UUID FK quotes(id)`
- `customer_id UUID FK customers(id)`
- `status TEXT NOT NULL DEFAULT 'scheduled'` — enum: `scheduled | pre_production | in_production | post_production | ready | delivered | cancelled`
- `priority TEXT DEFAULT 'normal'` — enum: `low | normal | high | rush`
- `scheduled_start_date DATE`
- `due_date DATE NOT NULL`
- `started_at TIMESTAMPTZ`
- `completed_at TIMESTAMPTZ`
- `delivered_at TIMESTAMPTZ`
- `delivery_method TEXT` — enum: `pickup | local_delivery | shipping`
- `notes TEXT`
- `internal_notes TEXT`
- `items_checklist JSONB` (per-line-item production tracking; initialized from invoice line items)
- timestamps
- INDEX(`tenant_id`, `status`)
- INDEX(`tenant_id`, `due_date`)

### Document templates (per-tenant)

**`document_templates`**
- `id UUID PK`
- `tenant_id UUID NOT NULL`
- `name TEXT NOT NULL`
- `type TEXT NOT NULL` — enum: `quote | invoice`
- `is_default BOOL DEFAULT FALSE`
- `header_html TEXT`
- `footer_html TEXT`
- `accent_color TEXT`
- `show_logo BOOL DEFAULT TRUE`
- `show_signature_block BOOL DEFAULT TRUE`
- `terms TEXT`
- `style JSONB` (font, sizes, etc.)
- timestamps

### Audit log

**`audit_log`**
- `id UUID PK`
- `tenant_id UUID` (nullable for org-level actions)
- `user_id UUID FK profiles(id)`
- `action TEXT NOT NULL` (e.g., "quote.created", "invoice.paid", "membership.invited")
- `resource_type TEXT`
- `resource_id UUID`
- `metadata JSONB`
- `created_at TIMESTAMPTZ DEFAULT now()`
- INDEX(`tenant_id`, `created_at`)

### RLS policies

For every tenant-scoped table, apply the following pattern (example for `customers`):

```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant's customers"
  ON customers FOR SELECT
  USING (
    tenant_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Admins and owners can insert customers"
  ON customers FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
        AND accepted_at IS NOT NULL
    )
  );

-- Similar policies for UPDATE and DELETE
```

Generate these for every business table in `lib/db/rls.sql` and apply via migration.

---

## 6. Authentication & session management

### Sign-up flow
1. User goes to `/signup`, enters email + password + name
2. Supabase creates `auth.users` row
3. App creates `profiles` row (via trigger or post-signup callback)
4. User is redirected to `/onboarding` (no org yet)
5. Onboarding: user creates first org → app inserts `organizations` row, `memberships` row (role=owner), `organization_settings` row
6. Onboarding seeds default `product_categories`, `size_groups`/`size_options`, `placement_options`, `color_count_pricing`, `fees` for the new org from a template
7. User lands on `/dashboard`

### Login flow
1. `/login` → Supabase Auth signin
2. Middleware checks: if user has 0 orgs → redirect to `/onboarding`
3. If user has 1 org → set `active_org_id` cookie, go to `/dashboard`
4. If user has 2+ orgs and no active cookie → org picker page

### Active org cookie
- `active_org_id` HTTP-only secure cookie, signed
- Middleware reads it on every `/*` request, validates membership, attaches `tenantId` to request context

### `getTenantContext()` helper
Server-side helper called at the top of every server action:

```ts
export async function getTenantContext() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const activeOrgId = cookies().get('active_org_id')?.value;
  if (!activeOrgId) throw new NoActiveOrgError();

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, user.id), eq(memberships.organizationId, activeOrgId)),
  });
  if (!membership || !membership.acceptedAt) throw new ForbiddenError();

  return { userId: user.id, tenantId: activeOrgId, role: membership.role };
}
```

### Role-based authorization
Helper: `requireRole(role: Role, context: TenantContext)` — throws if user's role is below required.

Role hierarchy: `owner > admin > member > production > readonly`

---

## 7. Core flows (v0.1 must support these end-to-end)

### Flow A: Sign up and onboard a new shop
- User signs up → onboarding wizard captures org name, contact info, basic branding
- Defaults are seeded (categories, sizes, placements, color tiers, fees)
- User lands on dashboard

### Flow B: Create a customer
- `/customers/new` → form → save → redirect to `/customers/[id]`
- Customer list shows search, sort, pagination

### Flow C: Build a quote
- `/quotes/new` → quote builder page
- Pick customer (or enter one-off) → add line items via product picker → set placements, colors, sizes → live total in sidebar
- Save as draft, or save and send (v0.1: send = mark as `sent` + show shareable link placeholder; actual email deferred to v0.x)
- Quote number auto-generated server-side using org's prefix + next number

### Flow D: Approve a quote → generate invoice
- Approve action on a `sent` quote → status changes to `approved`, `approved_at` set
- "Generate invoice" button on approved quote → creates an `invoices` row with line items snapshot + sets `quote_id` link
- Invoice page renders with status `pending`

### Flow E: Record payment on an invoice
- Invoice detail page → "Record payment" → amount, method, reference → creates `invoice_payments` row
- Invoice `amount_paid` updated (generated column auto-updates `amount_due`)
- Status auto-progresses: `pending` → `deposit_paid` (if deposit_required > 0 and met) → `paid` (when amount_due ≤ 0)

### Flow F: Generate a job from an invoice
- Invoice with status `paid` or `deposit_paid` → "Start job" button creates a `jobs` row with `items_checklist` initialized from invoice line items
- Job appears on `/jobs` board

### Flow G: Move a job through production
- Job detail page → status transitions: `scheduled` → `pre_production` → `in_production` → `post_production` → `ready` → `delivered`
- Items checklist allows ticking off individual items as they're produced
- Notes per status transition

### Flow H: View dashboard / basic numbers
- `/dashboard` shows: revenue MTD, open quotes count, jobs in production, AR outstanding
- Recent quotes list, jobs due today
- (Full reports are v0.x)

### Flow I: Manage settings
- `/settings/branding` — org name, logo, colors, address
- `/settings/team` — invite users by email, set roles (invites stored as pending memberships; v0.1 doesn't email — copy invite link manually)
- `/settings/pricing-rules` — placements, color tiers, fees, sizes
- `/settings/document-templates` — basic template chooser (v0.1: one default template; full editor in v0.x)

---

## 8. UI/UX direction

### General principles
- **Light mode default**, dark mode supported via `next-themes`
- **Sentence case** everywhere (no Title Case page headers, no ALL CAPS)
- **Generous whitespace** but information-dense where it matters (tables, line items)
- **Consistent component library** — every button, input, badge, card built on shadcn primitives
- **Responsive but not mobile-first** for v0.1 — desktop is primary; mobile usable but not optimized

### Layout
- **Sidebar**: left, 240px wide, collapsible to icon-only at narrower widths
- **Topbar**: search (Cmd+K placeholder, real impl in v0.x), notifications icon, theme toggle, primary action button ("New quote")
- **Main**: page content with consistent `PageHeader` component (title, subtitle, actions on the right)

### Sidebar structure (matches the mockup direction we discussed)
- Org switcher up top (org logo + name + plan; dropdown to switch orgs or create new)
- Section "Workspace": Dashboard, Inbox (placeholder, no functionality v0.1), Quotes, Jobs (with sub-items In production / Scheduled / Completed), Production (placeholder), Invoices, Customers, Catalog, Artwork (placeholder), Reports
- Section "Setup": Branding, Templates, Pricing rules, Integrations (placeholder), Settings
- User profile at the bottom: avatar + name + email; dropdown for profile / sign out

### Component conventions (must exist in v0.1)
- `<Button variant="primary|secondary|destructive|ghost" size="sm|md|lg">`
- `<Input>`, `<Textarea>`, `<Select>`, `<Combobox>`, `<DatePicker>`
- `<Card>`, `<Dialog>`, `<Sheet>`, `<Popover>`, `<DropdownMenu>`
- `<Badge variant="success|warning|info|danger|neutral">`
- `<Toast>` via Sonner — toast helpers like `toast.success("Quote saved")`, `toast.error("...")`
- `<Table>` with shadcn DataTable patterns
- `<PageHeader title="..." subtitle="..." actions={<Button>...</Button>} />`
- `<EmptyState icon={...} title="..." description="..." action={...} />`
- `<ConfirmDialog>` for destructive actions
- `<Skeleton>` — shadcn/ui Skeleton primitive (https://ui.shadcn.com/docs/components/radix/skeleton); build domain-specific skeleton composites on top of it (e.g. `<QuoteCardSkeleton>`, `<TableRowSkeleton>`)
- `<Ring>` — loading ring spinner, ported from loading-ui.com (https://loading-ui.com/docs/components/ring); single source file in `components/ui/ring.tsx`, supports size and color props, reads from theme tokens

### Loading states — mandatory pattern

Every async UI state must show either a skeleton or a ring spinner. Never a blank screen, never just "Loading...", never a flash of unstyled content.

**Use skeletons when:**
- The shape and layout of the eventual content is known and stable
- The user benefits from seeing the structure of what's coming (cards in a grid, rows in a table, fields in a form)
- Examples: list pages (quotes, customers, jobs, invoices), detail pages, dashboards, anything with predictable layout

**Use the ring loader when:**
- The duration is short and the layout doesn't have a clear "shape" to skeleton
- Inside buttons during submit/save actions
- Inline indicators (e.g. "Saving..." next to a form field)
- Full-screen blockers during navigation or expensive operations
- Modal/dialog content while initial data fetches
- Anywhere a skeleton would feel like overkill

**Build skeleton composites for every list and detail screen:**
- `<QuoteListSkeleton>` — matches the quote list page layout
- `<QuoteDetailSkeleton>` — matches the quote builder/detail layout
- `<CustomerListSkeleton>`, `<CustomerDetailSkeleton>`
- `<InvoiceListSkeleton>`, `<InvoiceDetailSkeleton>`
- `<JobListSkeleton>`, `<JobBoardSkeleton>`, `<JobDetailSkeleton>`
- `<DashboardSkeleton>`
- `<TableSkeleton rows={n} columns={n} />` (generic table skeleton)
- `<CardGridSkeleton count={n} />` (generic card grid skeleton)

These live in `components/<domain>/skeletons.tsx` (e.g. `components/quotes/skeletons.tsx`).

**Ring loader usage:**
- Import from `components/ui/ring.tsx`
- Inside buttons: `<Button>{isPending ? <Ring size="sm" /> : "Save"}</Button>`
- Full-screen: `<div className="..."><Ring size="lg" /></div>`
- Inline: `{isFetching && <Ring size="xs" />}`

### Critical: every component is a real component
No inline-style soup. No "every page redeclares `<label> + <input>`". Build the form-field abstraction once and reuse:

```tsx
<FormField name="email" label="Email" required>
  <Input type="email" />
</FormField>
```

### Color & theme
- Tailwind theme tokens in `tailwind.config.ts`
- Semantic colors: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc. (shadcn convention)
- No hardcoded hex values in components

---

## 9. PDF generation

### Approach
- **Server-side** with `@react-pdf/renderer` (renders React components to PDF on the server)
- Why not html2canvas (v0.7 approach): vector quality, faster, no UI blocking, runs in API route or server action

### Templates
- `lib/pdf/quote-pdf.tsx` — React component that takes a quote + org settings and renders a PDF
- `lib/pdf/invoice-pdf.tsx` — same for invoices
- Templates read from `organization_settings` for branding (logo, colors, address)
- Optional `document_templates` overrides (v0.1: just use defaults)

### Endpoints
- `GET /api/quotes/[id]/pdf` — streams the PDF
- `GET /api/invoices/[id]/pdf` — streams the PDF

---

## 10. Distributor catalog (placeholder data for v0.1)

### Adapter pattern
Define a common interface in `lib/distributors/types.ts`:

```ts
export interface DistributorAdapter {
  slug: string;
  syncProducts(): Promise<DistributorProduct[]>;
  syncVariants(productId: string): Promise<DistributorVariant[]>;
  getInventory(sku: string): Promise<number>;
}
```

### SanMar adapter (v0.1)
- File: `lib/distributors/sanmar.ts`
- v0.1: returns seeded local data from `scripts/seed-distributor-catalog.ts`
- v0.x: real PromoStandards / SanMar API integration
- Seed data: ~30 popular Gildan, Bella+Canvas, Next Level styles with realistic variants

### S&S Activewear adapter (v0.1)
- File: `lib/distributors/ssactivewear.ts`
- v0.1: minimal stub returning empty array (placeholder file only)
- v0.x: real API integration

### Tenant onboarding default
When a new tenant onboards, they get a default "starter catalog" of ~10 common products imported from `distributor_products` into `tenant_products` (with default pricing rules).

---

## 11. Environment variables

`.env.local` (gitignored) with these vars:

```
# Database & Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                 # Postgres connection string for Drizzle migrations

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENV=development           # development | staging | production

# Secrets
COOKIE_SECRET=                # random 32+ char string for cookie signing
```

`.env.example` committed to repo with empty values + comments explaining each.

`lib/config/env.ts` validates env vars at startup using Zod — app fails fast if anything is missing.

---

## 12. Build order

Build in this order. Don't move to the next step until the previous one runs end-to-end.

### Phase 1: Foundation (no UI yet)
1. Initialize Next.js 15 project with TypeScript strict mode, Tailwind v4, Biome
2. Install Drizzle, Supabase libs, Zod, React Hook Form, TanStack Query, Sonner, lucide-react, shadcn/ui CLI
3. Set up `lib/config/brand.ts`, `lib/config/env.ts`
4. Set up `lib/db/` with Drizzle schema files (all tables from section 5)
5. Generate initial migration with `drizzle-kit generate`
6. Set up Supabase project, run migration, apply RLS policies
7. Set up `lib/auth/` with Supabase server/browser clients, `getTenantContext()`, middleware
8. Seed scripts: `seed.ts` (creates a demo org + user), `seed-distributor-catalog.ts`

### Phase 2: Auth + shell
9. Build `/login`, `/signup`, `/forgot-password` pages with full auth flow
10. Build `/onboarding` wizard
11. Build the `/app` layout with sidebar, topbar, user dropdown, org switcher
12. Build component library: Button, Input, Card, Dialog, Sheet, Badge, Table, Toast, PageHeader, EmptyState, ConfirmDialog, FormField, Skeleton (shadcn primitive + domain composites), Ring loader (from loading-ui.com)
13. Build `/dashboard` with placeholder content (real numbers when data exists)

### Phase 3: Customers
14. Build customer CRUD: list, create, edit, delete with confirm dialog
15. Search and pagination on list

### Phase 4: Catalog
16. Build catalog browse page (lists `tenant_products` joined with `tenant_product_pricing`)
17. Build product detail/edit page
18. Build "Import from distributor" flow (picks from `distributor_products`, creates `tenant_products` row with default pricing)

### Phase 5: Settings
19. Branding settings page (org info, logo upload)
20. Pricing rules pages (placements, color tiers, fees, sizes, categories)
21. Team management (list members, invite by email — invite copy-link only in v0.1)

### Phase 6: Quotes (the centerpiece)
22. Build quote list page with filters (status, customer, date range)
23. Build quote builder page: customer block, line item builder, placement/color/size selectors, live totals sidebar, notes, terms
24. Save as draft, send (mark as sent), approve flow
25. Quote PDF generation
26. Quote revision flow (duplicate as v2 with parent_quote_id)

### Phase 7: Invoices
27. Generate invoice from approved quote (one-click)
28. Build invoice list and detail pages
29. Record payment flow
30. Invoice PDF generation
31. Status auto-progression (pending → deposit_paid → paid)

### Phase 8: Jobs
32. Generate job from paid (or deposit-paid) invoice
33. Build jobs list with status board view
34. Build job detail page with status transitions and items checklist

### Phase 9: Polish
35. Empty states everywhere
36. Loading skeleton composites for every list and detail screen; ring loader on every submit button and inline async state
37. Error boundaries
38. Confirm dialogs on all destructive actions
39. Keyboard shortcuts: Cmd+K (palette stub), Cmd+N (new quote shortcut)
40. Audit log writes on key actions (quote.created, invoice.paid, etc.)

---

## 13. Out of scope for v0.1 (architecture must accommodate, code must not)

These are deliberately deferred. Leave hooks/interfaces ready but no implementation:

- **Stripe billing** — `subscription_plan` and `subscription_status` columns exist; no Stripe code
- **Email/SMS (Resend, Twilio)** — invite links shown in UI, no sending
- **Background jobs (Inngest / Trigger.dev)** — all server actions are synchronous; mark slow actions with TODO comments for queue migration
- **AI features** — no Gemini, no Claude API, no embeddings, no chat
- **Customer-facing portal** — no public quote/invoice views in v0.1 (add `/p/[token]` route placeholder only)
- **Subdomain-based tenant routing** — path-based for v0.1; middleware structured so subdomain logic can be added in one place
- **Real distributor sync** — adapters return seed data; real API calls in v0.x
- **EasyPost / shipping labels** — `delivery_method` exists, no label buying
- **QuickBooks / Xero sync** — no accounting integration
- **Inventory management** — no inventory tracking
- **Mobile-specific UI optimizations** — responsive only; native-feeling mobile in v0.x
- **Internationalization** — English only; structure copy in a way that's extractable later (no inline strings buried in logic)
- **Change orders on existing jobs** — `jobs` table doesn't have change_order entity yet; add in v0.x

---

## 14. Documentation requirements

Maintain these docs in `docs/`:

- **`architecture.md`** — system overview, request lifecycle, key abstractions
- **`data-model.md`** — ERD diagram (text-based or Mermaid), table descriptions, why each design choice
- **`auth-and-tenancy.md`** — how the multi-tenant model works, RLS policy patterns, role hierarchy
- **`developer-setup.md`** — step-by-step local setup, env vars, seeding, running migrations
- **`pdf-generation.md`** — how PDFs are rendered, how to modify templates
- **`distributor-integration.md`** — adapter pattern, how to add a new distributor

Update these as features land. They are not optional — they're the only way the project stays maintainable.

---

## 15. Non-negotiables (do not skip)

1. **No hardcoded brand strings.** Ever. All UI strings reference `BRAND` from `lib/config/brand.ts`.
2. **No hardcoded business logic per shop.** Everything tenant-specific is a row in a settings table.
3. **`tenant_id` on every business table.** No exceptions.
4. **RLS policies on every business table.** No exceptions.
5. **Zod validation on every server action input.** No exceptions.
6. **No inline `style={{}}` in components.** Use Tailwind classes or component variants.
7. **No `any` types.** Strict TypeScript mode is non-negotiable.
8. **No secrets in code.** Everything via env vars.
9. **Every server action calls `getTenantContext()` first.** No raw DB access without it.
10. **Components, not duplication.** If a UI pattern appears twice, extract it into a component.
11. **No blank loading states.** Every async UI shows a skeleton or the ring loader. No "Loading..." text, no flashes of nothing.

---

## 16. Bottom line

v0.1 is a complete, runnable, locally-deployable multi-tenant SaaS that takes a screen-printing shop from "I just signed up" through "I shipped my first paid job." It does this for two test orgs simultaneously without any data leaking between them. It has no AI, no billing, no email, no production deployment — those are v0.x and v1.0 work. But every architectural decision in v0.1 must accommodate adding those without rewrites.

When v0.1 is complete, the developer should be able to:
1. Run `pnpm dev`
2. Sign up two test accounts
3. Onboard each as a separate org
4. Build quotes, generate invoices, record payments, run jobs through production
5. Confirm that org A cannot see any of org B's data
6. Generate quote and invoice PDFs that match each org's branding

That's the bar. Build to that bar and v1.0 is straightforward from there.
