ALTER TABLE "organizations" ADD COLUMN "document_number_mode" text DEFAULT 'sequential' NOT NULL;--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- Document numbering now supports a per-org mode: "sequential" (prefix +
-- incrementing counter) or "random" (prefix + a random padded number, unique
-- per tenant). Re-declares both allocate functions to honor the mode.
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
  v_mode   TEXT;
  v_cand   TEXT;
  v_tries  INTEGER := 0;
BEGIN
  SELECT quote_number_prefix, quote_number_pad_length, document_number_mode
    INTO v_prefix, v_pad, v_mode
    FROM organizations WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % not found', p_tenant_id;
  END IF;
  v_pad := COALESCE(v_pad, 5);
  v_prefix := COALESCE(v_prefix, 'Q-');

  IF v_mode = 'random' THEN
    LOOP
      v_tries := v_tries + 1;
      IF v_tries > 100 THEN
        RAISE EXCEPTION 'Could not allocate a unique random quote number after 100 tries';
      END IF;
      v_cand := v_prefix || lpad(
        (floor(random() * (power(10, v_pad) - power(10, v_pad - 1))) + power(10, v_pad - 1))::bigint::text,
        v_pad, '0');
      IF NOT EXISTS (
        SELECT 1 FROM quotes WHERE tenant_id = p_tenant_id AND quote_number = v_cand
      ) THEN
        RETURN v_cand;
      END IF;
    END LOOP;
  END IF;

  UPDATE organizations
    SET next_quote_number = next_quote_number + 1
    WHERE id = p_tenant_id
    RETURNING next_quote_number - 1 INTO v_num;
  RETURN v_prefix || lpad(v_num::text, v_pad, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.allocate_quote_number(UUID) TO authenticated;
--> statement-breakpoint

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
  v_mode   TEXT;
  v_cand   TEXT;
  v_tries  INTEGER := 0;
BEGIN
  SELECT invoice_number_prefix, invoice_number_pad_length, document_number_mode
    INTO v_prefix, v_pad, v_mode
    FROM organizations WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % not found', p_tenant_id;
  END IF;
  v_pad := COALESCE(v_pad, 5);
  v_prefix := COALESCE(v_prefix, 'INV-');

  IF v_mode = 'random' THEN
    LOOP
      v_tries := v_tries + 1;
      IF v_tries > 100 THEN
        RAISE EXCEPTION 'Could not allocate a unique random invoice number after 100 tries';
      END IF;
      v_cand := v_prefix || lpad(
        (floor(random() * (power(10, v_pad) - power(10, v_pad - 1))) + power(10, v_pad - 1))::bigint::text,
        v_pad, '0');
      IF NOT EXISTS (
        SELECT 1 FROM invoices WHERE tenant_id = p_tenant_id AND invoice_number = v_cand
      ) THEN
        RETURN v_cand;
      END IF;
    END LOOP;
  END IF;

  UPDATE organizations
    SET next_invoice_number = next_invoice_number + 1
    WHERE id = p_tenant_id
    RETURNING next_invoice_number - 1 INTO v_num;
  RETURN v_prefix || lpad(v_num::text, v_pad, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number(UUID) TO authenticated;