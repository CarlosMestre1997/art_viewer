-- ============================================================
-- Migration 007: Per-artwork image fit mode
-- Run in Supabase SQL Editor
-- ============================================================

-- "cover" = fill frame, crop edges (default)
-- "contain" = show full image, letterbox/pillarbox background
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS image_fit TEXT DEFAULT 'cover'
  CHECK (image_fit IN ('cover', 'contain'));
