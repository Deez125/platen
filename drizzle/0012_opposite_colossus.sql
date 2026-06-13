CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"source_quote_line_item_id" uuid,
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
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text,
	"reference" text,
	"paid_on" date DEFAULT now() NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"quote_id" uuid,
	"customer_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"issue_date" date DEFAULT now() NOT NULL,
	"due_date" date,
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
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_due" numeric(12, 2) GENERATED ALWAYS AS (total - amount_paid) STORED,
	"notes" text,
	"internal_notes" text,
	"terms" text,
	"payment_terms" text,
	"payment_method_default" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_tenant_number_unique" UNIQUE("tenant_id","invoice_number")
);
--> statement-breakpoint
CREATE TABLE "job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"work_unit_id" uuid,
	"actor_id" uuid,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_work_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"name" text NOT NULL,
	"method" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"checklist" jsonb,
	"assignee_id" uuid,
	"sort_order" integer,
	"status_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"customer_id" uuid,
	"customer_name" text,
	"invoice_number" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_work_unit_id_job_work_units_id_fk" FOREIGN KEY ("work_unit_id") REFERENCES "public"."job_work_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_work_units" ADD CONSTRAINT "job_work_units_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_work_units" ADD CONSTRAINT "job_work_units_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_work_units" ADD CONSTRAINT "job_work_units_assignee_id_profiles_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_id_idx" ON "invoice_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_tenant_id_idx" ON "invoice_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_idx" ON "invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "invoices_tenant_customer_idx" ON "invoices" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "invoices_quote_id_idx" ON "invoices" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "job_events_job_id_idx" ON "job_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_work_units_job_id_idx" ON "job_work_units" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_work_units_tenant_status_idx" ON "job_work_units" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "job_work_units_assignee_idx" ON "job_work_units" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "jobs_tenant_status_idx" ON "jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "jobs_tenant_id_idx" ON "jobs" USING btree ("tenant_id");
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ════════════════════════════════════════════════════════════════════
CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoice_line_items_set_updated_at
  BEFORE UPDATE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoice_payments_set_updated_at
  BEFORE UPDATE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jobs_set_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER job_work_units_set_updated_at
  BEFORE UPDATE ON public.job_work_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- Payments → invoice rollup. Whenever invoice_payments change, recompute the
-- invoice's amount_paid and auto-advance its status (pending → deposit_paid →
-- paid). Never overrides a manual void/refunded. amount_due is generated.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recalc_invoice_payments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_paid  NUMERIC;
  v_total NUMERIC;
  v_status TEXT;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM invoice_payments WHERE invoice_id = v_invoice_id;
  SELECT total, status INTO v_total, v_status FROM invoices WHERE id = v_invoice_id;
  IF v_status IN ('void', 'refunded') THEN
    UPDATE invoices SET amount_paid = v_paid WHERE id = v_invoice_id;
  ELSE
    UPDATE invoices
      SET amount_paid = v_paid,
          status = CASE
            WHEN v_paid <= 0 THEN 'pending'
            WHEN v_paid < v_total THEN 'deposit_paid'
            ELSE 'paid'
          END
      WHERE id = v_invoice_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER invoice_payments_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_payments();
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- RLS — tenant-scoped (keyed on tenant_id via memberships)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invoices" ON public.invoices FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update invoices" ON public.invoices FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete invoices" ON public.invoices FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invoice_line_items" ON public.invoice_line_items FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert invoice_line_items" ON public.invoice_line_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update invoice_line_items" ON public.invoice_line_items FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete invoice_line_items" ON public.invoice_line_items FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read invoice_payments" ON public.invoice_payments FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert invoice_payments" ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update invoice_payments" ON public.invoice_payments FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete invoice_payments" ON public.invoice_payments FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read jobs" ON public.jobs FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update jobs" ON public.jobs FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete jobs" ON public.jobs FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

ALTER TABLE public.job_work_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read job_work_units" ON public.job_work_units FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert job_work_units" ON public.job_work_units FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members update job_work_units" ON public.job_work_units FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members delete job_work_units" ON public.job_work_units FOR DELETE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));

ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read job_events" ON public.job_events FOR SELECT
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
CREATE POLICY "Members insert job_events" ON public.job_events FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- allocate_invoice_number(tenant) — atomic prefix + zero-padded sequence.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.allocate_invoice_number(p_tenant_id UUID)
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
    SET next_invoice_number = next_invoice_number + 1
    WHERE id = p_tenant_id
    RETURNING next_invoice_number - 1, invoice_number_prefix, invoice_number_pad_length
    INTO v_num, v_prefix, v_pad;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % not found', p_tenant_id;
  END IF;
  RETURN COALESCE(v_prefix, 'INV-') || lpad(v_num::text, COALESCE(v_pad, 4), '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number(UUID) TO authenticated;
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- generate_invoice(quote) — snapshot an APPROVED quote into a new invoice +
-- invoice_line_items. SECURITY DEFINER, so it validates the caller's membership
-- explicitly. Returns the new invoice id.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_invoice(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      UUID := auth.uid();
  v_tenant    UUID;
  v_status    TEXT;
  v_number    TEXT;
  v_invoice_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tenant_id, status INTO v_tenant, v_status FROM quotes WHERE id = p_quote_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM memberships WHERE user_id = v_user AND organization_id = v_tenant) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Quote must be approved before invoicing';
  END IF;
  IF EXISTS (SELECT 1 FROM invoices WHERE quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'An invoice already exists for this quote';
  END IF;

  v_number := public.allocate_invoice_number(v_tenant);

  INSERT INTO invoices (
    tenant_id, invoice_number, quote_id, customer_id, status, issue_date,
    customer_name, customer_company, customer_email, customer_phone,
    customer_address_line1, customer_address_line2, customer_city, customer_state,
    customer_postal_code, customer_country,
    bill_to_same_as_shipping, bill_to_line1, bill_to_line2, bill_to_city,
    bill_to_state, bill_to_postal_code, bill_to_country, customer_tax_exempt_id,
    subtotal, tax_rate, tax_amount, is_tax_exempt, shipping_amount,
    discount_type, discount_value, discount_amount,
    deposit_type, deposit_value, deposit_amount,
    total, cost, profit, notes, terms, payment_terms, payment_method_default
  )
  SELECT
    q.tenant_id, v_number, q.id, q.customer_id, 'pending', now()::date,
    q.customer_name, q.customer_company, q.customer_email, q.customer_phone,
    q.customer_address_line1, q.customer_address_line2, q.customer_city, q.customer_state,
    q.customer_postal_code, q.customer_country,
    q.bill_to_same_as_shipping, q.bill_to_line1, q.bill_to_line2, q.bill_to_city,
    q.bill_to_state, q.bill_to_postal_code, q.bill_to_country, q.customer_tax_exempt_id,
    q.subtotal, q.tax_rate, q.tax_amount, q.is_tax_exempt, q.shipping_amount,
    q.discount_type, q.discount_value, q.discount_amount,
    q.deposit_type, q.deposit_value, q.deposit_amount,
    q.total, q.cost, q.profit, q.notes, q.terms, q.payment_terms, q.payment_method_default
  FROM quotes q WHERE q.id = p_quote_id
  RETURNING id INTO v_invoice_id;

  INSERT INTO invoice_line_items (
    tenant_id, invoice_id, source_quote_line_item_id, item_type, name, description,
    quantity, unit_price, unit_cost, total_price, total_cost, sort_order,
    sizes_breakdown, placements_data, color_name, notes
  )
  SELECT
    li.tenant_id, v_invoice_id, li.id, li.item_type, li.name, li.description,
    li.quantity, li.unit_price, li.unit_cost, li.total_price, li.total_cost, li.sort_order,
    li.sizes_breakdown, li.placements_data, li.color_name, li.notes
  FROM quote_line_items li WHERE li.quote_id = p_quote_id;

  RETURN v_invoice_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_invoice(UUID) TO authenticated;
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- generate_job(invoice) — create a Job (1:1 with a deposit-paid/paid invoice),
-- one work unit seeded with a checklist from the invoice line items, and a
-- "created" event. SECURITY DEFINER + explicit membership check. Returns job id.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_job(p_invoice_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_tenant  UUID;
  v_status  TEXT;
  v_number  TEXT;
  v_cust_id UUID;
  v_cust_nm TEXT;
  v_due     DATE;
  v_job_id  UUID;
  v_unit_id UUID;
  v_checklist JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tenant_id, status, invoice_number, customer_id, customer_name, due_date
    INTO v_tenant, v_status, v_number, v_cust_id, v_cust_nm, v_due
    FROM invoices WHERE id = p_invoice_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM memberships WHERE user_id = v_user AND organization_id = v_tenant) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_status NOT IN ('deposit_paid', 'paid') THEN
    RAISE EXCEPTION 'Invoice must be at least deposit-paid before generating a job';
  END IF;
  IF EXISTS (SELECT 1 FROM jobs WHERE invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'A job already exists for this invoice';
  END IF;

  INSERT INTO jobs (tenant_id, invoice_id, customer_id, customer_name, invoice_number, status, due_date)
  VALUES (v_tenant, p_invoice_id, v_cust_id, v_cust_nm, v_number, 'scheduled', v_due)
  RETURNING id INTO v_job_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', gen_random_uuid()::text,
            'label', li.name,
            'qty', li.quantity,
            'done', false,
            'sourceInvoiceLineItemId', li.id::text
          ) ORDER BY li.sort_order NULLS LAST), '[]'::jsonb)
    INTO v_checklist
    FROM invoice_line_items li WHERE li.invoice_id = p_invoice_id;

  INSERT INTO job_work_units (tenant_id, job_id, name, status, checklist, sort_order, status_changed_at)
  VALUES (v_tenant, v_job_id, 'All items', 'scheduled', v_checklist, 1, now())
  RETURNING id INTO v_unit_id;

  INSERT INTO job_events (tenant_id, job_id, work_unit_id, actor_id, type, message)
  VALUES (v_tenant, v_job_id, NULL, v_user, 'created', 'Job created from invoice ' || COALESCE(v_number, ''));

  RETURN v_job_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_job(UUID) TO authenticated;