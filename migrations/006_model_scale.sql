-- ============================================================
-- Migration 006: Per-artwork GLB scale multiplier
-- Run in Supabase SQL Editor
-- ============================================================

-- Stores a scale multiplier for uploaded GLB models (default 1.0 = auto-fit size).
-- Increase above 1.0 to make the model appear larger, decrease to shrink it.
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS model_scale FLOAT DEFAULT 1.0;
