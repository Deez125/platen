-- ====================================================================
-- 04_fix_recursive_policies
--
-- Drops the RLS policies that recursively reference `memberships` (the
-- subquery triggers SELECT-RLS on memberships, which re-runs the same
-- policy → "infinite recursion detected in policy" at runtime).
--
-- Replaces them with the bare minimum needed for v0.1:
--   - profiles: only own profile readable (RLS denies others)
--   - memberships: only own memberships readable
--
-- For v0.1, writes to memberships happen exclusively via the
-- `complete_onboarding` function which is SECURITY DEFINER and bypasses
-- RLS, so we don't need INSERT/UPDATE/DELETE policies on memberships at
-- this stage. Team-management policies come later with helper functions
-- (e.g. is_org_admin) to avoid recursion.
-- ====================================================================

-- Profiles --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read profiles of orgs they belong to" ON public.profiles;
-- "Users can read their own profile" stays — non-recursive, still works.

-- Memberships -----------------------------------------------------------
DROP POLICY IF EXISTS "Users can read memberships in their orgs" ON public.memberships;
DROP POLICY IF EXISTS "Users can insert their own membership when org has none" ON public.memberships;
DROP POLICY IF EXISTS "Owners and admins can invite to their org" ON public.memberships;
DROP POLICY IF EXISTS "Owners and admins can update memberships in their org" ON public.memberships;
DROP POLICY IF EXISTS "Users can accept their own invite" ON public.memberships;
DROP POLICY IF EXISTS "Owners and admins can remove memberships in their org" ON public.memberships;

CREATE POLICY "Users can read their own memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid());
