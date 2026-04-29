-- ============================================================
-- Migration 001: Core Schema
-- Run this first in Supabase SQL Editor
-- ============================================================

-- Artists table
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nationality TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Artworks table
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  year INT,
  size TEXT,
  technique TEXT,
  price INT,
  description TEXT,
  category TEXT CHECK (category IN ('painting', 'sculpture', 'photography', 'mixed_media', 'drawing', 'ceramic')),
  image_path TEXT,        -- path in storage bucket, e.g. "aw1.jpg"
  model_type TEXT,        -- for 3D: knot, crystal, spikes, helix, totem, stack, orbit
  model_color TEXT,       -- hex color for 3D model
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites (anonymous, by session)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, artwork_id)
);

-- Interest requests (buyers contacting about an artwork)
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics: page views per artwork
CREATE TABLE artwork_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users (allowlist for /admin page access)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_artwork_views_artwork_id ON artwork_views(artwork_id);
CREATE INDEX idx_artwork_views_created_at ON artwork_views(created_at);
CREATE INDEX idx_favorites_artwork_id ON favorites(artwork_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at);
CREATE INDEX idx_interests_artwork_id ON interests(artwork_id);
CREATE INDEX idx_interests_created_at ON interests(created_at);
