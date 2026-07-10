-- ════════════════════════════════════════════════════════════════════
-- Debug/admin: fast-forward an already-approved quote through the whole
-- lifecycle in one shot — invoice (reuses quote number) → full payment (→ paid)
-- → job → all checklist items done, units ready, job delivered — and backdate
-- everything to the quote's dates (created_at → all created_at/status_changed_at;
-- quote_date → invoice issue date + payment date).
--
-- Used to bulk-import historical orders without clicking the whole flow.
-- Owner/admin + tenant-scoped. Atomic (single transaction). Re-run-safe:
-- errors if the quote already has an invoice.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.migrate_quote_to_delivered(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user       UUID := auth.uid();
  v_tenant     UUID;
  v_status     TEXT;
  v_created    TIMESTAMPTZ;
  v_qdate      DATE;
  v_total      NUMERIC;
  v_invoice_id UUID;
  v_job_id     UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tenant_id, status, created_at, quote_date
    INTO v_tenant, v_status, v_created, v_qdate
    FROM quotes WHERE id = p_quote_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user AND organization_id = v_tenant AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Quote must be approved to migrate';
  END IF;
  IF EXISTS (SELECT 1 FROM invoices WHERE quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'Quote already migrated (an invoice exists)';
  END IF;

  -- 1) Invoice (reuses the quote number via generate_invoice), then backdate.
  v_invoice_id := public.generate_invoice(p_quote_id);
  SELECT total INTO v_total FROM invoices WHERE id = v_invoice_id;
  UPDATE invoices SET created_at = v_created, issue_date = v_qdate WHERE id = v_invoice_id;

  -- 2) Full payment → the recalc trigger flips the invoice to paid.
  INSERT INTO invoice_payments
    (tenant_id, invoice_id, amount, method, paid_on, recorded_by, notes, created_at)
  VALUES
    (v_tenant, v_invoice_id, v_total, 'other', v_qdate, v_user, 'Migrated', v_created);

  -- 3) Job (reuses generate_job), then mark it fully done + delivered.
  v_job_id := public.generate_job(v_invoice_id);

  UPDATE job_work_units
    SET checklist = COALESCE(
          (SELECT jsonb_agg(item || jsonb_build_object('done', true))
             FROM jsonb_array_elements(checklist) item),
          checklist),
        status = 'ready',
        status_changed_at = v_created,
        created_at = v_created
    WHERE job_id = v_job_id;

  UPDATE jobs SET status = 'delivered', created_at = v_created WHERE id = v_job_id;

  -- Backdate the auto-created event + log the delivery.
  UPDATE job_events SET created_at = v_created WHERE job_id = v_job_id;
  INSERT INTO job_events (tenant_id, job_id, actor_id, type, message, created_at)
  VALUES (v_tenant, v_job_id, v_user, 'delivered', 'Migrated — marked delivered', v_created);

  RETURN v_job_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.migrate_quote_to_delivered(UUID) TO authenticated;
