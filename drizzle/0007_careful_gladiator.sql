CREATE TABLE "color_count_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"color_count" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	CONSTRAINT "color_count_pricing_tenant_count_unique" UNIQUE("tenant_id","color_count")
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_amount" numeric(10, 2) DEFAULT '0',
	"is_per_color" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_price" numeric(10, 2) DEFAULT '0',
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "color_count_pricing" ADD CONSTRAINT "color_count_pricing_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_options" ADD CONSTRAINT "placement_options_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "color_count_pricing_tenant_id_idx" ON "color_count_pricing" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fees_tenant_id_idx" ON "fees" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "placement_options_tenant_id_idx" ON "placement_options" USING btree ("tenant_id");
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- updated_at triggers (color_count_pricing has no timestamps by design)
-- ════════════════════════════════════════════════════════════════════
CREATE TRIGGER placement_options_set_updated_at
  BEFORE UPDATE ON public.placement_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER fees_set_updated_at
  BEFORE UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — tenant-scoped pricing rules (keyed on tenant_id)
-- ════════════════════════════════════════════════════════════════════

-- placement_options
ALTER TABLE public.placement_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read placement_options" ON public.placement_options FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert placement_options" ON public.placement_options FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update placement_options" ON public.placement_options FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete placement_options" ON public.placement_options FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- color_count_pricing
ALTER TABLE public.color_count_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read color_count_pricing" ON public.color_count_pricing FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert color_count_pricing" ON public.color_count_pricing FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update color_count_pricing" ON public.color_count_pricing FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete color_count_pricing" ON public.color_count_pricing FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- fees
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read fees" ON public.fees FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert fees" ON public.fees FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update fees" ON public.fees FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete fees" ON public.fees FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));