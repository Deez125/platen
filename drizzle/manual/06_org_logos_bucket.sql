-- ====================================================================
-- 06_org_logos_bucket
--
-- Creates the org-logos Storage bucket (public read, members-only write)
-- and the RLS policies so only org owners/admins can upload/replace/delete
-- logos for their own org.
--
-- Path layout: org-logos/{org_id}/square.{ext}
--              org-logos/{org_id}/wide.{ext}
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org logos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

CREATE POLICY "Org owners and admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners and admins can replace logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners and admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
        AND role IN ('owner', 'admin')
    )
  );
