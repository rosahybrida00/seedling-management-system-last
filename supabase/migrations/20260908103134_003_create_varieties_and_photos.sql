/*
# Create varieties and varieties_photos tables

## Overview
Creates the proper catalog tables `varieties` and `varieties_photos` to replace the
simplified `roses` table. Migrates existing data from `roses` into `varieties`.

## New Tables

### `varieties` — Catalog of rose varieties (public-readable)
- `id` uuid PK
- `name` text NOT NULL
- `obtenteur` text — breeder/creator name
- `type` text — e.g. "Hybride de thé", "Ancienne", "Botanique"
- `parentage` text — e.g. "Rosa gallica × Rosa moschata"
- `description` text
- `category` text: "baptisee" | "lignee" | "evaluation" (default "baptisee")
- `user_id` uuid — owner who added the variety (nullable for system varieties)
- `created_at`, `updated_at` timestamptz

### `varieties_photos` — Multiple photos per variety
- `id` uuid PK
- `variety_id` uuid FK → varieties(id) ON DELETE CASCADE
- `photo_url` text NOT NULL
- `is_primary` boolean DEFAULT false
- `caption` text
- `created_at` timestamptz

## Security
- `varieties`: SELECT public (anon + authenticated); INSERT/UPDATE/DELETE owner-scoped.
- `varieties_photos`: SELECT public; INSERT/UPDATE/DELETE owner-scoped via variety ownership.
- RLS enabled on both tables.

## Data Migration
- Copies all rows from `roses` into `varieties` (preserving IDs and data).
- Sets `photo_url` from `roses` as a primary photo in `varieties_photos` where non-null.

## Notes
- The `roses` table is NOT dropped — existing code may still reference it.
- Idempotent: uses IF NOT EXISTS and ON CONFLICT.
*/

-- =====================================================================
-- 1. VARIETIES (public catalog)
-- =====================================================================
CREATE TABLE IF NOT EXISTS varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  obtenteur text,
  type text,
  parentage text,
  description text,
  category text DEFAULT 'baptisee' CHECK (category IN ('baptisee', 'lignee', 'evaluation')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE varieties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_varieties" ON varieties;
CREATE POLICY "public_read_varieties" ON varieties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_varieties" ON varieties;
CREATE POLICY "insert_own_varieties" ON varieties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_varieties" ON varieties;
CREATE POLICY "update_own_varieties" ON varieties FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_varieties" ON varieties;
CREATE POLICY "delete_own_varieties" ON varieties FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_varieties_name ON varieties (name);
CREATE INDEX IF NOT EXISTS idx_varieties_obtenteur ON varieties (obtenteur);
CREATE INDEX IF NOT EXISTS idx_varieties_type ON varieties (type);

-- =====================================================================
-- 2. VARIETIES_PHOTOS (multiple photos per variety)
-- =====================================================================
CREATE TABLE IF NOT EXISTS varieties_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variety_id uuid NOT NULL REFERENCES varieties(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE varieties_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_varieties_photos" ON varieties_photos;
CREATE POLICY "public_read_varieties_photos" ON varieties_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_varieties_photos" ON varieties_photos;
CREATE POLICY "insert_own_varieties_photos" ON varieties_photos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM varieties WHERE varieties.id = varieties_photos.variety_id AND varieties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_varieties_photos" ON varieties_photos;
CREATE POLICY "update_own_varieties_photos" ON varieties_photos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM varieties WHERE varieties.id = varieties_photos.variety_id AND varieties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_varieties_photos" ON varieties_photos;
CREATE POLICY "delete_own_varieties_photos" ON varieties_photos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM varieties WHERE varieties.id = varieties_photos.variety_id AND varieties.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_varieties_photos_variety_id ON varieties_photos (variety_id);

-- =====================================================================
-- 3. Migrate data from roses → varieties
-- =====================================================================
INSERT INTO varieties (id, name, obtenteur, type, parentage, description, category, user_id, created_at, updated_at)
SELECT id, name, obtenteur, type, parentage, description, category, user_id, created_at, updated_at
FROM roses
ON CONFLICT (id) DO NOTHING;

-- Migrate existing photo_url into varieties_photos
INSERT INTO varieties_photos (variety_id, photo_url, is_primary)
SELECT id, photo_url, true
FROM roses
WHERE photo_url IS NOT NULL
ON CONFLICT DO NOTHING;
