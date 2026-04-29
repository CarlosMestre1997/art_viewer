-- ============================================================
-- Migration 004: Allow signed-in users to check their own admin status
-- Run in Supabase SQL Editor after 003_seed_admin.sql
-- ============================================================

-- Lets a signed-in user query admin_users to verify they are an admin.
-- Without this, the admin page cannot confirm the logged-in user's role.
CREATE POLICY "Users can check own admin status"
  ON admin_users FOR SELECT
  USING (auth.email() = email);
