CREATE TABLE "color_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hex" text,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributor_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distributor_product_id" uuid NOT NULL,
	"color_name" text NOT NULL,
	"color_hex" text,
	"size_label" text NOT NULL,
	"sku" text,
	"wholesale_price" numeric(10, 2),
	"inventory_quantity" integer,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distributor_variants_product_color_size_unique" UNIQUE("distributor_product_id","color_name","size_label")
);
--> statement-breakpoint
CREATE TABLE "distributor_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distributor_id" uuid NOT NULL,
	"style_number" text NOT NULL,
	"brand" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw" jsonb,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distributor_products_distributor_style_unique" UNIQUE("distributor_id","style_number")
);
--> statement-breakpoint
CREATE TABLE "distributor_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "distributor_sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"decoration_method" text,
	"default_min_quantity" integer,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_tenant_slug_unique" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "size_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "size_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"size_group_id" uuid NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"upcharge" numeric(10, 2) DEFAULT '0',
	CONSTRAINT "size_options_group_label_unique" UNIQUE("size_group_id","label")
);
--> statement-breakpoint
CREATE TABLE "tenant_product_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tenant_product_id" uuid NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"max_quantity" integer,
	"unit_price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "tenant_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"source" text NOT NULL,
	"distributor_product_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"min_quantity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "color_options" ADD CONSTRAINT "color_options_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributor_product_variants" ADD CONSTRAINT "distributor_product_variants_distributor_product_id_distributor_products_id_fk" FOREIGN KEY ("distributor_product_id") REFERENCES "public"."distributor_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributor_products" ADD CONSTRAINT "distributor_products_distributor_id_distributor_sources_id_fk" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributor_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_groups" ADD CONSTRAINT "size_groups_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_options" ADD CONSTRAINT "size_options_size_group_id_size_groups_id_fk" FOREIGN KEY ("size_group_id") REFERENCES "public"."size_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_product_pricing" ADD CONSTRAINT "tenant_product_pricing_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_product_pricing" ADD CONSTRAINT "tenant_product_pricing_tenant_product_id_tenant_products_id_fk" FOREIGN KEY ("tenant_product_id") REFERENCES "public"."tenant_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_products" ADD CONSTRAINT "tenant_products_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_products" ADD CONSTRAINT "tenant_products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_products" ADD CONSTRAINT "tenant_products_distributor_product_id_distributor_products_id_fk" FOREIGN KEY ("distributor_product_id") REFERENCES "public"."distributor_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "color_options_tenant_id_idx" ON "color_options" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "distributor_variants_product_id_idx" ON "distributor_product_variants" USING btree ("distributor_product_id");--> statement-breakpoint
CREATE INDEX "distributor_products_brand_style_idx" ON "distributor_products" USING btree ("brand","style_number");--> statement-breakpoint
CREATE INDEX "product_categories_tenant_id_idx" ON "product_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "size_groups_tenant_id_idx" ON "size_groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "size_options_group_id_idx" ON "size_options" USING btree ("size_group_id");--> statement-breakpoint
CREATE INDEX "tenant_product_pricing_product_id_idx" ON "tenant_product_pricing" USING btree ("tenant_product_id");--> statement-breakpoint
CREATE INDEX "tenant_products_tenant_category_idx" ON "tenant_products" USING btree ("tenant_id","category_id");
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- updated_at triggers (reuse public.set_updated_at from earlier migration)
-- ════════════════════════════════════════════════════════════════════
CREATE TRIGGER product_categories_set_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER size_groups_set_updated_at
  BEFORE UPDATE ON public.size_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER color_options_set_updated_at
  BEFORE UPDATE ON public.color_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER distributor_products_set_updated_at
  BEFORE UPDATE ON public.distributor_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER distributor_product_variants_set_updated_at
  BEFORE UPDATE ON public.distributor_product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tenant_products_set_updated_at
  BEFORE UPDATE ON public.tenant_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — tenant-scoped catalog tables (keyed on tenant_id)
-- ════════════════════════════════════════════════════════════════════

-- product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read product_categories" ON public.product_categories FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert product_categories" ON public.product_categories FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update product_categories" ON public.product_categories FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete product_categories" ON public.product_categories FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- size_groups
ALTER TABLE public.size_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read size_groups" ON public.size_groups FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert size_groups" ON public.size_groups FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update size_groups" ON public.size_groups FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete size_groups" ON public.size_groups FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- color_options
ALTER TABLE public.color_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read color_options" ON public.color_options FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert color_options" ON public.color_options FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update color_options" ON public.color_options FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete color_options" ON public.color_options FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- tenant_products
ALTER TABLE public.tenant_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read tenant_products" ON public.tenant_products FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert tenant_products" ON public.tenant_products FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update tenant_products" ON public.tenant_products FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete tenant_products" ON public.tenant_products FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- tenant_product_pricing
ALTER TABLE public.tenant_product_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read tenant_product_pricing" ON public.tenant_product_pricing FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert tenant_product_pricing" ON public.tenant_product_pricing FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update tenant_product_pricing" ON public.tenant_product_pricing FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete tenant_product_pricing" ON public.tenant_product_pricing FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — size_options (no tenant_id; scoped through its size_group)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.size_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read size_options" ON public.size_options FOR SELECT
  USING (size_group_id IN (
    SELECT id FROM public.size_groups
    WHERE tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
  ));
CREATE POLICY "Members insert size_options" ON public.size_options FOR INSERT TO authenticated
  WITH CHECK (size_group_id IN (
    SELECT id FROM public.size_groups
    WHERE tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
  ));
CREATE POLICY "Members update size_options" ON public.size_options FOR UPDATE
  USING (size_group_id IN (
    SELECT id FROM public.size_groups
    WHERE tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
  ));
CREATE POLICY "Members delete size_options" ON public.size_options FOR DELETE
  USING (size_group_id IN (
    SELECT id FROM public.size_groups
    WHERE tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
  ));
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — shared distributor catalog (read-only to all authenticated users;
-- writes go through the service-role seed, which bypasses RLS)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.distributor_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read distributor_sources" ON public.distributor_sources FOR SELECT
  TO authenticated USING (true);

ALTER TABLE public.distributor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read distributor_products" ON public.distributor_products FOR SELECT
  TO authenticated USING (true);

ALTER TABLE public.distributor_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read distributor_product_variants" ON public.distributor_product_variants FOR SELECT
  TO authenticated USING (true);