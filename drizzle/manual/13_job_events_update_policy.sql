-- ════════════════════════════════════════════════════════════════════
-- job_events was created append-only (SELECT + INSERT policies only), so no
-- code ever updated a row — until the debug "edit activity dates" tool. Without
-- an UPDATE policy, RLS silently blocks the update (0 rows, no error), so dates
-- never change. Add a member-scoped UPDATE policy (the debug action still gates
-- to owner/admin at the app layer). Mirrors the other business tables.
-- ════════════════════════════════════════════════════════════════════
CREATE POLICY "Members update job_events" ON public.job_events FOR UPDATE
  USING (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid()));
