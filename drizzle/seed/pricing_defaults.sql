-- ════════════════════════════════════════════════════════════════════
-- Pricing-rules defaults — extends seed_tenant_defaults() to also seed
-- placements, color-count tiers, and fees (spec flow A).
--
-- Apply AFTER 0007_careful_gladiator.sql. Idempotent — safe to re-run.
-- Re-declares seed_tenant_defaults with the existing categories/sizes/colors
-- sections PLUS the three pricing sections, then backfills existing orgs.
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
  -- ── Product categories ──────────────────────────────────────────────
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

  -- ── Size group "Adult Sizes" ────────────────────────────────────────
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

  -- ── Garment colors ──────────────────────────────────────────────────
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

  -- ── Placements (location drives WHERE; color tiers drive price) ──────
  IF NOT EXISTS (SELECT 1 FROM placement_options WHERE tenant_id = p_org_id) THEN
    INSERT INTO placement_options (tenant_id, name, default_price, sort_order)
    VALUES
      (p_org_id, 'Front Center', 0, 1),
      (p_org_id, 'Full Back',    0, 2),
      (p_org_id, 'Left Chest',   0, 3),
      (p_org_id, 'Left Sleeve',  0, 4),
      (p_org_id, 'Right Sleeve', 0, 5),
      (p_org_id, 'Tag / Nape',   0, 6);
  END IF;

  -- ── Color-count pricing (per garment, per location) ─────────────────
  INSERT INTO color_count_pricing (tenant_id, color_count, price)
  VALUES
    (p_org_id, 1, 2.00),
    (p_org_id, 2, 3.00),
    (p_org_id, 3, 3.75),
    (p_org_id, 4, 4.50),
    (p_org_id, 5, 5.25),
    (p_org_id, 6, 6.00)
  ON CONFLICT (tenant_id, color_count) DO NOTHING;

  -- ── Fees ────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM fees WHERE tenant_id = p_org_id) THEN
    INSERT INTO fees (tenant_id, name, default_amount, is_per_color, sort_order)
    VALUES
      (p_org_id, 'Screen fee', 25.00, true,  1),
      (p_org_id, 'Setup fee',  15.00, false, 2),
      (p_org_id, 'Rush fee',   50.00, false, 3),
      (p_org_id, 'Art fee',    35.00, false, 4);
  END IF;
END;
$$;

-- ── Backfill: any existing org missing pricing rules ───────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT o.id FROM organizations o
    WHERE NOT EXISTS (SELECT 1 FROM placement_options p WHERE p.tenant_id = o.id)
  LOOP
    PERFORM public.seed_tenant_defaults(r.id);
  END LOOP;
END $$;
