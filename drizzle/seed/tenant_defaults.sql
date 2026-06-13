-- ════════════════════════════════════════════════════════════════════
-- Tenant default seeding (categories, sizes, colors) — spec flow A.
--
-- Defines seed_tenant_defaults(org_id), wires it into complete_onboarding so
-- NEW orgs get defaults, and backfills any EXISTING org that has none yet.
--
-- Apply AFTER 0006_kind_betty_brant.sql. Idempotent — safe to re-run.
-- (Placements, color-count tiers, and fees are seeded in Phase 5 once those
--  tables exist.)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Product categories
  INSERT INTO product_categories (tenant_id, name, slug, decoration_method, default_min_quantity, sort_order)
  VALUES
    (p_org_id, 'T-Shirt',     't-shirt',     'screen_print', 24, 1),
    (p_org_id, 'Long Sleeve', 'long-sleeve', 'screen_print', 24, 2),
    (p_org_id, 'Hoodie',      'hoodie',      'screen_print', 12, 3),
    (p_org_id, 'Sweatshirt',  'sweatshirt',  'screen_print', 12, 4),
    (p_org_id, 'Tank',        'tank',        'screen_print', 24, 5),
    (p_org_id, 'Polo',        'polo',        'embroidery',   12, 6),
    (p_org_id, 'Hat',         'hat',         'embroidery',   24, 7)
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  -- Size group "Adult Sizes" (get-or-create; size_groups has no natural key)
  SELECT id INTO v_group_id
  FROM size_groups
  WHERE tenant_id = p_org_id AND name = 'Adult Sizes'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO size_groups (tenant_id, name)
    VALUES (p_org_id, 'Adult Sizes')
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO size_options (size_group_id, label, sort_order, upcharge)
  VALUES
    (v_group_id, 'S',   1, 0),
    (v_group_id, 'M',   2, 0),
    (v_group_id, 'L',   3, 0),
    (v_group_id, 'XL',  4, 0),
    (v_group_id, '2XL', 5, 2),
    (v_group_id, '3XL', 6, 3)
  ON CONFLICT (size_group_id, label) DO NOTHING;

  -- Garment colors (color_options has no natural key — only seed if empty)
  IF NOT EXISTS (SELECT 1 FROM color_options WHERE tenant_id = p_org_id) THEN
    INSERT INTO color_options (tenant_id, name, hex, sort_order)
    VALUES
      (p_org_id, 'Black',        '#1A1A1A', 1),
      (p_org_id, 'White',        '#FFFFFF', 2),
      (p_org_id, 'Navy',         '#1F2A44', 3),
      (p_org_id, 'Royal',        '#2A4FB7', 4),
      (p_org_id, 'Red',          '#C8102E', 5),
      (p_org_id, 'Maroon',       '#6A2233', 6),
      (p_org_id, 'Forest',       '#22543D', 7),
      (p_org_id, 'Kelly',        '#2E8B57', 8),
      (p_org_id, 'Gold',         '#FFB81C', 9),
      (p_org_id, 'Orange',       '#FF6A13', 10),
      (p_org_id, 'Purple',       '#5B2A86', 11),
      (p_org_id, 'Heather Grey', '#9CA3AF', 12),
      (p_org_id, 'Charcoal',     '#36454F', 13),
      (p_org_id, 'Sand',         '#C2B280', 14);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(UUID) TO authenticated;

-- ── Wire into onboarding: new orgs get defaults automatically ──────────
-- (Re-declares complete_onboarding from 05_drop_brand_color_from_onboarding.sql
--  with a single added PERFORM before RETURN.)
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
    name, slug, email,
    address_line1, address_line2, city, state, postal_code,
    default_tax_rate, default_min_quantity,
    quote_number_prefix, invoice_number_prefix
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

  -- Seed default categories / sizes / colors for the new shop.
  PERFORM public.seed_tenant_defaults(v_org_id);

  UPDATE profiles
  SET onboarding_complete = true
  WHERE id = v_user_id;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;

-- ── Backfill: any existing org with no categories yet ──────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT o.id FROM organizations o
    WHERE NOT EXISTS (SELECT 1 FROM product_categories pc WHERE pc.tenant_id = o.id)
  LOOP
    PERFORM public.seed_tenant_defaults(r.id);
  END LOOP;
END $$;
