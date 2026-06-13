ALTER TABLE "organizations" ADD COLUMN "join_key" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email" text;
--> statement-breakpoint

-- ════════════════════════════════════════════════════════════════════
-- Team membership: org join keys + co-member reads + role management.
-- ════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS organizations_join_key_unique
  ON public.organizations (join_key);

-- Readable 12-hex code in three groups, e.g. "K3F9-7QX2-M8RP".
CREATE OR REPLACE FUNCTION public.gen_join_key()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(
    substr(md5(random()::text || clock_timestamp()::text), 1, 4) || '-' ||
    substr(md5(random()::text || clock_timestamp()::text), 1, 4) || '-' ||
    substr(md5(random()::text || clock_timestamp()::text), 1, 4)
  );
$$;

-- Backfill a unique join key onto every existing org that lacks one.
DO $$
DECLARE r RECORD; k TEXT;
BEGIN
  FOR r IN SELECT id FROM organizations WHERE join_key IS NULL LOOP
    LOOP
      k := public.gen_join_key();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE join_key = k);
    END LOOP;
    UPDATE organizations SET join_key = k WHERE id = r.id;
  END LOOP;
END $$;

-- ── Signup trigger now stores email on the profile ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Backfill email onto existing profiles from auth.users.
UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE u.id = p.id AND p.email IS NULL;

-- ── complete_onboarding: generate a unique join key on org creation ──
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
  v_join_key  TEXT;
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

  LOOP
    v_join_key := public.gen_join_key();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM organizations WHERE join_key = v_join_key);
  END LOOP;

  INSERT INTO organizations (
    name, slug, email, join_key,
    address_line1, address_line2, city, state, postal_code,
    default_tax_rate, default_min_quantity,
    quote_number_prefix, invoice_number_prefix
  )
  VALUES (
    trim(p_name),
    v_slug,
    NULLIF(trim(p_email), ''),
    v_join_key,
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

  PERFORM public.seed_tenant_defaults(v_org_id);

  UPDATE profiles SET onboarding_complete = true WHERE id = v_user_id;

  RETURN v_org_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;

-- ── Non-recursive RLS helpers (SECURITY DEFINER bypasses memberships RLS) ──
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM memberships WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.user_org_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_co_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT user_id FROM memberships
  WHERE organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.user_co_member_ids() TO authenticated;

-- Members can read all memberships in their orgs (was own-only).
DROP POLICY IF EXISTS "Users can read their own memberships" ON public.memberships;
CREATE POLICY "Members read memberships in their orgs"
  ON public.memberships FOR SELECT
  USING (organization_id IN (SELECT public.user_org_ids()));

-- Members can read co-members' profiles (in addition to their own).
DROP POLICY IF EXISTS "Members read co-member profiles" ON public.profiles;
CREATE POLICY "Members read co-member profiles"
  ON public.profiles FOR SELECT
  USING (id IN (SELECT public.user_co_member_ids()));

-- ── join_with_key: a signed-in user joins an org by its key (role=member) ──
CREATE OR REPLACE FUNCTION public.join_with_key(p_key TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_org  UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Dash- and case-insensitive match.
  SELECT id INTO v_org FROM organizations
  WHERE replace(upper(join_key), '-', '') = replace(upper(trim(p_key)), '-', '');
  IF v_org IS NULL THEN RAISE EXCEPTION 'Invalid key'; END IF;

  INSERT INTO memberships (user_id, organization_id, role, accepted_at)
  VALUES (v_user, v_org, 'member', now())
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  UPDATE profiles SET onboarding_complete = true WHERE id = v_user;
  RETURN v_org;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_with_key(TEXT) TO authenticated;

-- ── set_member_role: owner/admin change a member's role, with guards ──
CREATE OR REPLACE FUNCTION public.set_member_role(p_org_id UUID, p_user_id UUID, p_role TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       UUID;
  v_caller_role  TEXT;
  v_target_role  TEXT;
  v_owner_count  INT;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_role NOT IN ('owner','admin','member','production','readonly') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT role INTO v_caller_role FROM memberships
    WHERE organization_id = p_org_id AND user_id = v_caller;
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  SELECT role INTO v_target_role FROM memberships
    WHERE organization_id = p_org_id AND user_id = p_user_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;

  -- Only an owner can grant or revoke the owner role.
  IF (p_role = 'owner' OR v_target_role = 'owner') AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can change owner roles';
  END IF;

  -- Never demote the last remaining owner.
  IF v_target_role = 'owner' AND p_role <> 'owner' THEN
    SELECT count(*) INTO v_owner_count FROM memberships
      WHERE organization_id = p_org_id AND role = 'owner';
    IF v_owner_count <= 1 THEN RAISE EXCEPTION 'Cannot remove the last owner'; END IF;
  END IF;

  UPDATE memberships SET role = p_role, updated_at = now()
    WHERE organization_id = p_org_id AND user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, UUID, TEXT) TO authenticated;