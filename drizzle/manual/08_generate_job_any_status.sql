-- ════════════════════════════════════════════════════════════════════
-- Relax generate_job: allow generating a job from an invoice regardless of
-- payment status (pending / deposit_paid / paid). Only void and refunded
-- invoices are blocked — those are dead documents that shouldn't spawn work.
--
-- Re-run-safe: CREATE OR REPLACE of the existing function. Everything below is
-- identical to the original (migration 0012) except the status guard.
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
  IF v_status IN ('void', 'refunded') THEN
    RAISE EXCEPTION 'Cannot generate a job from a void or refunded invoice';
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
