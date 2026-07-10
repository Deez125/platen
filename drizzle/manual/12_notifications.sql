-- ════════════════════════════════════════════════════════════════════
-- notify_org — fan one event out to every member of a tenant as an in-app
-- notification (one row per member, so read state is per-user).
--
-- Called from server actions after a meaningful event (quote approved, payment
-- recorded, job delivered, …). SECURITY DEFINER so it can insert rows for other
-- members (RLS on notifications has no INSERT policy); the caller must belong to
-- the tenant. Best-effort — callers ignore failures so a notification never
-- breaks the underlying action.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_org(
  p_tenant      UUID,
  p_type        TEXT,
  p_title       TEXT,
  p_body        TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id   UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user AND organization_id = p_tenant
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO notifications (tenant_id, user_id, type, title, body, entity_type, entity_id)
  SELECT p_tenant, m.user_id, p_type, p_title, p_body, p_entity_type, p_entity_id
  FROM memberships m
  WHERE m.organization_id = p_tenant;
END;
$$;
GRANT EXECUTE ON FUNCTION public.notify_org(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
