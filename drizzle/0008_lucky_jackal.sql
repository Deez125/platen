CREATE TABLE "quote_line_item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_line_item_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"sort_order" integer,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"tenant_product_id" uuid,
	"item_type" text DEFAULT 'product' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(10, 2),
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0',
	"sort_order" integer,
	"sizes_breakdown" jsonb,
	"placements_data" jsonb,
	"color_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quote_number" text NOT NULL,
	"customer_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"quote_date" date DEFAULT now() NOT NULL,
	"expires_at" date,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_quote_id" uuid,
	"customer_name" text,
	"customer_company" text,
	"customer_email" text,
	"customer_phone" text,
	"customer_address_line1" text,
	"customer_address_line2" text,
	"customer_city" text,
	"customer_state" text,
	"customer_postal_code" text,
	"customer_country" text DEFAULT 'US',
	"bill_to_same_as_shipping" boolean DEFAULT true NOT NULL,
	"bill_to_line1" text,
	"bill_to_line2" text,
	"bill_to_city" text,
	"bill_to_state" text,
	"bill_to_postal_code" text,
	"bill_to_country" text DEFAULT 'US',
	"customer_tax_exempt_id" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0',
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_tax_exempt" boolean DEFAULT false NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_type" text DEFAULT 'amount' NOT NULL,
	"discount_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_type" text DEFAULT 'amount' NOT NULL,
	"deposit_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(12, 2) DEFAULT '0',
	"profit" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"internal_notes" text,
	"terms" text,
	"payment_terms" text,
	"payment_method_default" text,
	"approved_at" timestamp with time zone,
	"approved_by_name" text,
	"approved_by_signature_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_tenant_number_version_unique" UNIQUE("tenant_id","quote_number","version")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "next_quote_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "next_invoice_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "quote_number_pad_length" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "invoice_number_pad_length" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_line_item_images" ADD CONSTRAINT "quote_line_item_images_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_item_images" ADD CONSTRAINT "quote_line_item_images_quote_line_item_id_quote_line_items_id_fk" FOREIGN KEY ("quote_line_item_id") REFERENCES "public"."quote_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_tenant_product_id_tenant_products_id_fk" FOREIGN KEY ("tenant_product_id") REFERENCES "public"."tenant_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_parent_quote_id_quotes_id_fk" FOREIGN KEY ("parent_quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_line_item_images_item_id_idx" ON "quote_line_item_images" USING btree ("quote_line_item_id");--> statement-breakpoint
CREATE INDEX "quote_line_items_quote_id_idx" ON "quote_line_items" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quotes_tenant_status_idx" ON "quotes" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "quotes_tenant_customer_idx" ON "quotes" USING btree ("tenant_id","customer_id");
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ════════════════════════════════════════════════════════════════════
CREATE TRIGGER quotes_set_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quote_line_items_set_updated_at
  BEFORE UPDATE ON public.quote_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quote_line_item_images_set_updated_at
  BEFORE UPDATE ON public.quote_line_item_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — tenant-scoped quote tables (keyed on tenant_id)
-- ════════════════════════════════════════════════════════════════════

-- quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read quotes" ON public.quotes FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update quotes" ON public.quotes FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete quotes" ON public.quotes FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- quote_line_items
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read quote_line_items" ON public.quote_line_items FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert quote_line_items" ON public.quote_line_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update quote_line_items" ON public.quote_line_items FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete quote_line_items" ON public.quote_line_items FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

-- quote_line_item_images
ALTER TABLE public.quote_line_item_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read quote_line_item_images" ON public.quote_line_item_images FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert quote_line_item_images" ON public.quote_line_item_images FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update quote_line_item_images" ON public.quote_line_item_images FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete quote_line_item_images" ON public.quote_line_item_images FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- allocate_quote_number(tenant) — atomic: increments the org's sequence and
-- returns the formatted number (prefix + zero-padded). SECURITY DEFINER so it
-- can update organizations regardless of RLS; the caller's tenant is validated
-- in the server action before this is invoked.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.allocate_quote_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num    INTEGER;
  v_prefix TEXT;
  v_pad    INTEGER;
BEGIN
  UPDATE organizations
    SET next_quote_number = next_quote_number + 1
    WHERE id = p_tenant_id
    RETURNING next_quote_number - 1, quote_number_prefix, quote_number_pad_length
    INTO v_num, v_prefix, v_pad;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % not found', p_tenant_id;
  END IF;

  RETURN COALESCE(v_prefix, 'Q-') || lpad(v_num::text, COALESCE(v_pad, 4), '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.allocate_quote_number(UUID) TO authenticated;