-- ============================================================
-- Migration 008: Fix Favorites RLS Policies
-- Restricts favorites read/delete to the session that created them
-- Run after 007_image_fit.sql
-- ============================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can read favorites" ON favorites;
DROP POLICY IF EXISTS "Anyone can delete favorites" ON favorites;

-- Create new policies that check session_id
CREATE POLICY "Users can read own favorites"
  ON favorites FOR SELECT
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id');

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (session_id = current_setting('request.headers', true)::json->>'x-session-id');

-- Allow admins to read all favorites for analytics
CREATE POLICY "Admins can read all favorites"
  ON favorites FOR SELECT
  USING (auth.email() IN (SELECT email FROM admin_users));
