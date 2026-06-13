CREATE TABLE "payment_term_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"installments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_term_options" ADD CONSTRAINT "payment_term_options_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_term_options_tenant_id_idx" ON "payment_term_options" USING btree ("tenant_id");
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- updated_at trigger
-- ════════════════════════════════════════════════════════════════════
CREATE TRIGGER payment_term_options_set_updated_at
  BEFORE UPDATE ON public.payment_term_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — tenant-scoped (keyed on tenant_id via memberships)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.payment_term_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read payment_term_options" ON public.payment_term_options FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert payment_term_options" ON public.payment_term_options FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update payment_term_options" ON public.payment_term_options FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete payment_term_options" ON public.payment_term_options FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));