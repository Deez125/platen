-- ====================================================================
-- 05_drop_brand_color_from_onboarding
--
-- Recreates `complete_onboarding` without the brand color parameter,
-- since we stripped primary color from the schema and UI for v0.1.
--
-- Run AFTER 0003_slim_vision.sql (which drops the brand_color_primary
-- column from organizations).
-- ====================================================================

DROP FUNCTION IF EXISTS public.complete_onboarding(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_name             TEXT,
  p_email            TEXT,
  p_address_line1    TEXT,
  p_address_line2    TEXT,
  p_city             TEXT,
  p_state            TEXT,
  p_postal_code      TEXT,
  p_tax_rate         NUMERIC,
  p_min_quantity     INTEGER,
  p_quote_prefix     TEXT,
  p_invoice_prefix   TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_base_slug TEXT;
  v_slug      TEXT;
  v_counter   INT := 1;
  v_org_id    UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Shop name is required';
  END IF;

  v_base_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g');
  v_base_slug := regexp_replace(v_base_slug, '^-+|-+$', '', 'g');
  IF length(v_base_slug) = 0 THEN
    v_base_slug := 'shop';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter::text;
  END LOOP;

  INSERT INTO organizations (
    name,
    slug,
    email,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    default_tax_rate,
    default_min_quantity,
    quote_number_prefix,
    invoice_number_prefix
  )
  VALUES (
    trim(p_name),
    v_slug,
    NULLIF(trim(p_email), ''),
    NULLIF(trim(p_address_line1), ''),
    NULLIF(trim(p_address_line2), ''),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_state), ''),
    NULLIF(trim(p_postal_code), ''),
    COALESCE(p_tax_rate, 0),
    COALESCE(p_min_quantity, 1),
    COALESCE(NULLIF(trim(p_quote_prefix), ''), 'Q-'),
    COALESCE(NULLIF(trim(p_invoice_prefix), ''), 'INV-')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO memberships (user_id, organization_id, role, accepted_at)
  VALUES (v_user_id, v_org_id, 'owner', now());

  UPDATE profiles
  SET onboarding_complete = true
  WHERE id = v_user_id;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;
