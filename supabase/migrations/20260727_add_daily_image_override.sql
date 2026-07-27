-- Migration: Add custom image override support for daily liturgy
-- Allows admin to manually upload and set custom images for:
--   1. Saint of the day image (stored in saint JSONB as imageUrl)
--   2. Daily/Evangelio image (stored as top-level image_url)
--
-- The daily_liturgy table already has these columns:
--   - image_url (text): URL of the main daily image
--   - saint (jsonb): contains imageUrl for the saint image
-- This migration documents the feature and ensures columns exist.

ALTER TABLE public.daily_liturgy ADD COLUMN IF NOT EXISTS image_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_liturgy' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.daily_liturgy ADD COLUMN image_url text;
  END IF;
END
$$;