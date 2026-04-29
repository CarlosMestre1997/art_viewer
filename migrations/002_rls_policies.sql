-- ============================================================
-- Migration 002: Row Level Security Policies
-- Run after 001_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ---- Public read access ----
CREATE POLICY "Public read artists"
  ON artists FOR SELECT USING (true);

CREATE POLICY "Public read artworks"
  ON artworks FOR SELECT USING (true);

-- ---- Favorites (anonymous sessions) ----
CREATE POLICY "Anyone can add favorites"
  ON favorites FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read favorites"
  ON favorites FOR SELECT USING (true);

CREATE POLICY "Anyone can delete favorites"
  ON favorites FOR DELETE USING (true);

-- ---- Interest requests ----
CREATE POLICY "Anyone can submit interest"
  ON interests FOR INSERT WITH CHECK (true);

-- ---- Analytics: views ----
CREATE POLICY "Anyone can log views"
  ON artwork_views FOR INSERT WITH CHECK (true);

-- ---- Admin-only policies ----
-- Admins can read all interests
CREATE POLICY "Admins read interests"
  ON interests FOR SELECT
  USING (auth.email() IN (SELECT email FROM admin_users));

-- Admins can read all views (analytics)
CREATE POLICY "Admins read views"
  ON artwork_views FOR SELECT
  USING (auth.email() IN (SELECT email FROM admin_users));

-- Admins can create/update/delete artists
CREATE POLICY "Admins manage artists"
  ON artists FOR ALL
  USING (auth.email() IN (SELECT email FROM admin_users));

-- Admins can create/update/delete artworks
CREATE POLICY "Admins manage artworks"
  ON artworks FOR ALL
  USING (auth.email() IN (SELECT email FROM admin_users));

-- ---- Storage policy (run in Storage > Policies, not SQL Editor) ----
-- Public read on artworks bucket:
--   CREATE POLICY "Public read artworks bucket"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'artworks');
--
-- Admin upload to artworks bucket:
--   CREATE POLICY "Admin upload to artworks bucket"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'artworks' AND auth.email() IN (SELECT email FROM admin_users));
