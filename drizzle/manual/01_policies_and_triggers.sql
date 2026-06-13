-- ====================================================================
-- 0001_policies_and_triggers
--
-- Run AFTER 0000_wet_luminals.sql. This file:
--   1. Adds a shared updated_at trigger function and wires it to each table
--   2. Adds a trigger on auth.users so a profiles row is auto-created on signup
--   3. Enables RLS and policies for profiles, organizations, memberships
--   4. Creates a public "avatars" Storage bucket with per-user RLS
-- ====================================================================


-- ── 1. updated_at trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER memberships_set_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 2. Auto-create profile row on signup ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 3. RLS policies ────────────────────────────────────────────────────
-- profiles --------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can read profiles of orgs they belong to"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT m.user_id
      FROM public.memberships m
      WHERE m.organization_id IN (
        SELECT organization_id
        FROM public.memberships
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- organizations ---------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners and admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete their organization"
  ON public.organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- memberships -----------------------------------------------------------
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read memberships in their orgs"
  ON public.memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Allow the FIRST membership to be created (when a new org is born and
-- the creator inserts themselves as owner). After that, only owners/admins
-- can invite further members.
CREATE POLICY "Users can insert their own membership when org has none"
  ON public.memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.memberships
      WHERE organization_id = memberships.organization_id
    )
  );

CREATE POLICY "Owners and admins can invite to their org"
  ON public.memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update memberships in their org"
  ON public.memberships FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can accept their own invite"
  ON public.memberships FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Owners and admins can remove memberships in their org"
  ON public.memberships FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );


-- ── 4. Avatars storage bucket ──────────────────────────────────────────
-- Public bucket so AvatarImage <img> tags can load without a signed URL.
-- Uploads are still gated by RLS (users can only write to their own folder).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload to their own avatar folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can replace their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
