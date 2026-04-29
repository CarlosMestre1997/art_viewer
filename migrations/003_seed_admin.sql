-- ============================================================
-- Migration 003: Add Admin User
-- Run after 002_rls_policies.sql
-- Replace the email with your actual admin email
-- ============================================================

-- Add yourself as admin (use the email you sign up with in Supabase Auth)
INSERT INTO admin_users (email, role)
VALUES ('your-email@example.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- To add more editors later:
-- INSERT INTO admin_users (email, role) VALUES ('gallery-staff@example.com', 'editor');
