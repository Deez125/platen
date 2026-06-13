-- ====================================================================
-- 07_product_images_bucket
--
-- Creates the product-images Storage bucket (public read, members-only
-- write) for catalog product photos — including custom products.
--
-- Path layout: product-images/{org_id}/{file}.{ext}
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Product images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Members can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Members can replace product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Members can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND organization_id::text = (storage.foldername(name))[1]
    )
  );
