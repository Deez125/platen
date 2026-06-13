CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'US',
	"is_tax_exempt" boolean DEFAULT false NOT NULL,
	"tax_exempt_id" text,
	"default_payment_terms" text,
	"notes" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_tenant_id_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customers_tenant_company_idx" ON "customers" USING btree ("tenant_id","company");
--> statement-breakpoint

-- ── updated_at trigger ──────────────────────────────────────────────
CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ── RLS policies on customers ───────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read customers of their org"
  ON public.customers FOR SELECT
  USING (
    tenant_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert customers in their org"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update customers in their org"
  ON public.customers FOR UPDATE
  USING (
    tenant_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete customers in their org"
  ON public.customers FOR DELETE
  USING (
    tenant_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );
--> statement-breakpoint

-- ── customer-logos storage bucket ───────────────────────────────────
-- Path layout: customer-logos/{tenant_id}/{customer_id}/logo.{ext}
-- The first folder (tenant_id) is what gates the RLS check.
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-logos', 'customer-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Customer logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-logos');

CREATE POLICY "Members can upload customer logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'customer-logos'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Members can replace customer logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'customer-logos'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Members can delete customer logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'customer-logos'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
    )
  );