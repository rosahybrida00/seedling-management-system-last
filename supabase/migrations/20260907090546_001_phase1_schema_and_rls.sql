/*
# Phase 1 — Schema & Row Level Security for Seedling Management System

## Overview
Creates the complete database schema for a rose breeding management application
with Supabase Auth. The Catalog (roses) is public-readable; all professional
breeding data (crosses, harvests, batches, seedlings, greenhouses, sensors,
pollen lots, profiles, settings) is isolated per user via RLS.

## New Tables

### Public tables (readable by anon + authenticated)
1. `roses` — Catalog of rose varieties (photo, name, obtenteur, type, parentage).
   - `id` uuid PK
   - `name` text NOT NULL
   - `obtenteur` text
   - `type` text (e.g. "Hybride de thé", "Ancienne", "Botanique")
   - `parentage` text (e.g. "Rosa gallica × Rosa moschata")
   - `photo_url` text
   - `description` text
   - `category` text: "baptisee" | "lignee" | "evaluation"
   - `user_id` uuid — owner who added the rose (nullable for seed/system roses)
   - `created_at`, `updated_at` timestamptz

### Private tables (owner-scoped by user_id, authenticated only)
2. `profiles` — User professional profile (obtenteur name, affixe, SIRET, city, avatar).
   - `id` uuid PK = auth.users.id
   - `obtenteur_name` text
   - `affixe` text (nursery affix)
   - `siret` text
   - `city` text (weather fallback)
   - `postal_code` text
   - `address` text
   - `avatar_url` text
   - `subscription` text: "free" | "pro"
   - `created_at`, `updated_at` timestamptz

3. `user_settings` — User preferences (theme, weather alert thresholds).
   - `id` uuid PK = auth.users.id
   - `theme` text: "botanical" | "dark" | "light"
   - `frost_threshold` numeric (°C, default 2)
   - `heat_threshold` numeric (°C, default 35)
   - `units` text: "metric" | "imperial"
   - `created_at`, `updated_at` timestamptz

4. `crosses` — Pollination events between two parents.
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid()
   - `code` text NOT NULL (e.g. "A")
   - `seed_parent` text
   - `pollen_parent` text
   - `pollination_date` timestamptz
   - `remarks` text
   - `created_at`, `updated_at` timestamptz

5. `hip_harvests` — Fruit (cynorrhodon) harvest from a cross.
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid()
   - `cross_id` uuid FK → crosses(id) ON DELETE CASCADE
   - `code` text NOT NULL (e.g. "Aa")
   - `harvest_date` timestamptz
   - `seed_count` int DEFAULT 0
   - `remarks` text
   - `created_at`, `updated_at` timestamptz

6. `greenhouses` — Greenhouse entity.
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid()
   - `name` text NOT NULL
   - `remarks` text
   - `created_at`, `updated_at` timestamptz

7. `greenhouse_tables` — Table/bench inside a greenhouse.
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid()
   - `greenhouse_id` uuid FK → greenhouses(id) ON DELETE CASCADE
   - `name` text NOT NULL
   - `capacity` int
   - `remarks` text
   - `created_at`, `updated_at` timestamptz

8. `sowing_batches` — Batch created at sowing time from a harvest.
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid()
   - `hip_harvest_id` uuid FK → hip_harvests(id) ON DELETE CASCADE
   - `code` text NOT NULL
   - `sowing_date` timestamptz NOT NULL DEFAULT now()
   - `harvest_date` timestamptz (copied from source harvest)
   - `seed_count` int DEFAULT 0
   - `table_id` uuid FK → greenhouse_tables(id) ON DELETE SET NULL
   - `remarks` text
   - `created_at`, `updated_at` timestamptz

9. `seedlings` — Individual seedling from a batch (Aa1, Aa2, ...).
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid()
   - `batch_id` uuid FK → sowing_batches(id) ON DELETE CASCADE
   - `code` text NOT NULL (e.g. "Aa1")
   - `index` int NOT NULL
   - `status` text NOT NULL DEFAULT 'observing' CHECK (status IN ('observing','discarded','selected'))
   - `remarks` text
   - `created_at`, `updated_at` timestamptz

10. `pollen_lots` — Pollen lot (harvest, evaluation, freezing).
    - `id` uuid PK
    - `user_id` uuid NOT NULL DEFAULT auth.uid()
    - `lot_number` text NOT NULL (e.g. "POL-2026-ROSA-01")
    - `rose_name` text
    - `anther_quality` text
    - `dehiscence` text
    - `conservation_mode` text
    - `remarks` text
    - `created_at`, `updated_at` timestamptz

11. `sensors` — IoT sensor pairing for greenhouse monitoring.
    - `id` uuid PK
    - `user_id` uuid NOT NULL DEFAULT auth.uid()
    - `greenhouse_id` uuid FK → greenhouses(id) ON DELETE CASCADE
    - `name` text NOT NULL
    - `sensor_type` text (e.g. "soil_moisture", "temperature", "surface_probe")
    - `last_value` numeric
    - `last_reading_at` timestamptz
    - `is_active` boolean DEFAULT true
    - `created_at`, `updated_at` timestamptz

12. `support_messages` — B2B contact form submissions.
    - `id` uuid PK
    - `user_id` uuid REFERENCES auth.users(id) ON DELETE SET NULL
    - `subject` text
    - `category` text CHECK (category IN ('technical', 'billing', 'dho', 'partnership'))
    - `message` text NOT NULL
    - `attachment_url` text
    - `status` text DEFAULT 'open'
    - `created_at` timestamptz

## Security
- RLS enabled on ALL tables.
- `roses`: SELECT is public (anon + authenticated); INSERT/UPDATE/DELETE owner-scoped.
- All other tables: full CRUD owner-scoped (auth.uid() = user_id).
- `profiles` and `user_settings`: user can only read/update their own row (id = auth.uid()).
- A SECURITY DEFINER trigger auto-creates a profile + settings row on signup.

## Indexes
- roses: on name, obtenteur, type (for search)
- crosses: on user_id
- hip_harvests: on cross_id, user_id
- sowing_batches: on hip_harvest_id, user_id
- seedlings: on batch_id, user_id
- greenhouse_tables: on greenhouse_id, user_id
- sensors: on greenhouse_id, user_id
*/

-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. ROSES (public catalog)
-- =====================================================================
CREATE TABLE IF NOT EXISTS roses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  obtenteur text,
  type text,
  parentage text,
  photo_url text,
  description text,
  category text DEFAULT 'baptisee' CHECK (category IN ('baptisee', 'lignee', 'evaluation')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE roses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_roses" ON roses;
CREATE POLICY "public_read_roses" ON roses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_roses" ON roses;
CREATE POLICY "insert_own_roses" ON roses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_roses" ON roses;
CREATE POLICY "update_own_roses" ON roses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_roses" ON roses;
CREATE POLICY "delete_own_roses" ON roses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_roses_name ON roses (name);
CREATE INDEX IF NOT EXISTS idx_roses_obtenteur ON roses (obtenteur);
CREATE INDEX IF NOT EXISTS idx_roses_type ON roses (type);

-- =====================================================================
-- 2. PROFILES (1:1 with auth.users)
-- =====================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  obtenteur_name text,
  affixe text,
  siret text,
  city text,
  postal_code text,
  address text,
  avatar_url text,
  subscription text DEFAULT 'free' CHECK (subscription IN ('free', 'pro')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================================================================
-- 3. USER_SETTINGS (1:1 with auth.users)
-- =====================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'botanical' CHECK (theme IN ('botanical', 'dark', 'light')),
  frost_threshold numeric DEFAULT 2,
  heat_threshold numeric DEFAULT 35,
  units text DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_settings" ON user_settings;
CREATE POLICY "read_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================================================================
-- 4. CROSSES
-- =====================================================================
CREATE TABLE IF NOT EXISTS crosses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  seed_parent text,
  pollen_parent text,
  pollination_date timestamptz,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crosses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_crosses" ON crosses;
CREATE POLICY "select_own_crosses" ON crosses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_crosses" ON crosses;
CREATE POLICY "insert_own_crosses" ON crosses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_crosses" ON crosses;
CREATE POLICY "update_own_crosses" ON crosses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_crosses" ON crosses;
CREATE POLICY "delete_own_crosses" ON crosses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_crosses_user_id ON crosses (user_id);

-- =====================================================================
-- 5. HIP_HARVESTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS hip_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cross_id uuid NOT NULL REFERENCES crosses(id) ON DELETE CASCADE,
  code text NOT NULL,
  harvest_date timestamptz,
  seed_count int NOT NULL DEFAULT 0,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hip_harvests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_hip_harvests" ON hip_harvests;
CREATE POLICY "select_own_hip_harvests" ON hip_harvests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_hip_harvests" ON hip_harvests;
CREATE POLICY "insert_own_hip_harvests" ON hip_harvests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_hip_harvests" ON hip_harvests;
CREATE POLICY "update_own_hip_harvests" ON hip_harvests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_hip_harvests" ON hip_harvests;
CREATE POLICY "delete_own_hip_harvests" ON hip_harvests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hip_harvests_cross_id ON hip_harvests (cross_id);
CREATE INDEX IF NOT EXISTS idx_hip_harvests_user_id ON hip_harvests (user_id);

-- =====================================================================
-- 6. GREENHOUSES
-- =====================================================================
CREATE TABLE IF NOT EXISTS greenhouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE greenhouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_greenhouses" ON greenhouses;
CREATE POLICY "select_own_greenhouses" ON greenhouses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_greenhouses" ON greenhouses;
CREATE POLICY "insert_own_greenhouses" ON greenhouses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_greenhouses" ON greenhouses;
CREATE POLICY "update_own_greenhouses" ON greenhouses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_greenhouses" ON greenhouses;
CREATE POLICY "delete_own_greenhouses" ON greenhouses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_greenhouses_user_id ON greenhouses (user_id);

-- =====================================================================
-- 7. GREENHOUSE_TABLES
-- =====================================================================
CREATE TABLE IF NOT EXISTS greenhouse_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  greenhouse_id uuid NOT NULL REFERENCES greenhouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity int,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE greenhouse_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_greenhouse_tables" ON greenhouse_tables;
CREATE POLICY "select_own_greenhouse_tables" ON greenhouse_tables FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_greenhouse_tables" ON greenhouse_tables;
CREATE POLICY "insert_own_greenhouse_tables" ON greenhouse_tables FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_greenhouse_tables" ON greenhouse_tables;
CREATE POLICY "update_own_greenhouse_tables" ON greenhouse_tables FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_greenhouse_tables" ON greenhouse_tables;
CREATE POLICY "delete_own_greenhouse_tables" ON greenhouse_tables FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_greenhouse_tables_greenhouse_id ON greenhouse_tables (greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_greenhouse_tables_user_id ON greenhouse_tables (user_id);

-- =====================================================================
-- 8. SOWING_BATCHES
-- =====================================================================
CREATE TABLE IF NOT EXISTS sowing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hip_harvest_id uuid NOT NULL REFERENCES hip_harvests(id) ON DELETE CASCADE,
  code text NOT NULL,
  sowing_date timestamptz NOT NULL DEFAULT now(),
  harvest_date timestamptz,
  seed_count int NOT NULL DEFAULT 0,
  table_id uuid REFERENCES greenhouse_tables(id) ON DELETE SET NULL,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sowing_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sowing_batches" ON sowing_batches;
CREATE POLICY "select_own_sowing_batches" ON sowing_batches FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sowing_batches" ON sowing_batches;
CREATE POLICY "insert_own_sowing_batches" ON sowing_batches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sowing_batches" ON sowing_batches;
CREATE POLICY "update_own_sowing_batches" ON sowing_batches FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sowing_batches" ON sowing_batches;
CREATE POLICY "delete_own_sowing_batches" ON sowing_batches FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sowing_batches_hip_harvest_id ON sowing_batches (hip_harvest_id);
CREATE INDEX IF NOT EXISTS idx_sowing_batches_user_id ON sowing_batches (user_id);

-- =====================================================================
-- 9. SEEDLINGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS seedlings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES sowing_batches(id) ON DELETE CASCADE,
  code text NOT NULL,
  index int NOT NULL,
  status text NOT NULL DEFAULT 'observing' CHECK (status IN ('observing', 'discarded', 'selected')),
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE seedlings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seedlings" ON seedlings;
CREATE POLICY "select_own_seedlings" ON seedlings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_seedlings" ON seedlings;
CREATE POLICY "insert_own_seedlings" ON seedlings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_seedlings" ON seedlings;
CREATE POLICY "update_own_seedlings" ON seedlings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_seedlings" ON seedlings;
CREATE POLICY "delete_own_seedlings" ON seedlings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_seedlings_batch_id ON seedlings (batch_id);
CREATE INDEX IF NOT EXISTS idx_seedlings_user_id ON seedlings (user_id);

-- =====================================================================
-- 10. POLLEN_LOTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS pollen_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_number text NOT NULL,
  rose_name text,
  anther_quality text,
  dehiscence text,
  conservation_mode text,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pollen_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pollen_lots" ON pollen_lots;
CREATE POLICY "select_own_pollen_lots" ON pollen_lots FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pollen_lots" ON pollen_lots;
CREATE POLICY "insert_own_pollen_lots" ON pollen_lots FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pollen_lots" ON pollen_lots;
CREATE POLICY "update_own_pollen_lots" ON pollen_lots FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pollen_lots" ON pollen_lots;
CREATE POLICY "delete_own_pollen_lots" ON pollen_lots FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pollen_lots_user_id ON pollen_lots (user_id);

-- =====================================================================
-- 11. SENSORS
-- =====================================================================
CREATE TABLE IF NOT EXISTS sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  greenhouse_id uuid REFERENCES greenhouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  sensor_type text,
  last_value numeric,
  last_reading_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sensors" ON sensors;
CREATE POLICY "select_own_sensors" ON sensors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sensors" ON sensors;
CREATE POLICY "insert_own_sensors" ON sensors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sensors" ON sensors;
CREATE POLICY "update_own_sensors" ON sensors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sensors" ON sensors;
CREATE POLICY "delete_own_sensors" ON sensors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sensors_greenhouse_id ON sensors (greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON sensors (user_id);

-- =====================================================================
-- 12. SUPPORT_MESSAGES (B2B contact form)
-- =====================================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text,
  category text CHECK (category IN ('technical', 'billing', 'dho', 'partnership')),
  message text NOT NULL,
  attachment_url text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_support_messages" ON support_messages;
CREATE POLICY "select_own_support_messages" ON support_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_support_messages" ON support_messages;
CREATE POLICY "insert_own_support_messages" ON support_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 13. Trigger: auto-create profile + settings on signup
-- =====================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  INSERT INTO user_settings (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();