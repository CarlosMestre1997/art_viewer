-- ============================================================
-- Migration 005: Storage Policies + Multi-Image Support
-- Run in Supabase SQL Editor
-- ============================================================

-- ---- Storage bucket policies (run these first) ----
-- These allow signed-in admins to upload/update/delete files in the artworks bucket.

CREATE POLICY "Public read artworks bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artworks');

CREATE POLICY "Admin upload to artworks bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artworks'
    AND auth.email() IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admin update artworks bucket"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'artworks'
    AND auth.email() IN (SELECT email FROM admin_users)
  );

CREATE POLICY "Admin delete from artworks bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artworks'
    AND auth.email() IN (SELECT email FROM admin_users)
  );

-- ---- Multiple images per artwork ----

CREATE TABLE artwork_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  path TEXT NOT NULL,    -- Supabase storage path OR external URL
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_artwork_images_artwork_id ON artwork_images(artwork_id);
CREATE INDEX idx_artwork_images_sort ON artwork_images(artwork_id, sort_order);

ALTER TABLE artwork_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read artwork images"
  ON artwork_images FOR SELECT USING (true);

CREATE POLICY "Admins manage artwork images"
  ON artwork_images FOR ALL
  USING (auth.email() IN (SELECT email FROM admin_users));

-- ---- Uploaded GLB model path ----
-- Stores the Supabase Storage path of an uploaded .glb file.
-- When set, takes precedence over model_type/model_color (procedural model).
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS model_path TEXT;

-- IMPORTANT: Supabase server-side MIME detection classifies .glb files as
-- application/octet-stream regardless of the Content-Type header sent by the client.
-- You must add application/octet-stream to the artworks bucket's allowed MIME types:
-- Dashboard → Storage → artworks → Edit bucket → Allowed MIME types:
--   image/jpeg, image/png, image/webp, model/gltf-binary, application/octet-stream
