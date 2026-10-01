-- =====================================================================
-- Schema Phase 2 — Semis, Pollen, Fruit/Cynorrhodon & Grille Aa1
-- Généré le 2026-09-08
-- Contient exclusivement les CREATE TABLE, ALTER TABLE et politiques
-- RLS pour les modules Semis, Pollen, Fruit/Cynorrhodon et Évaluation Aa1.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. CROSSES — Enregistrement des pollinisations entre deux parents
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
-- 2. HIP_HARVESTS — Récolte des fruits (cynorrhodons) + diagnostics
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
-- 3. GREENHOUSES — Serres
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
-- 4. GREENHOUSE_TABLES — Tables/bancs dans une serre
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
-- 5. SOWING_BATCHES — Lots de semis à partir d'une récolte
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
-- 6. SEEDLINGS — Semis individuels (Aa1, Aa2, ...) + grille d'évaluation
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
-- 7. POLLEN_LOTS — Lots de pollen (récolte, évaluation, congélation)
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
-- 8. ALTER TABLE — Colonnes diagnostics Fruit/Cynorrhodon (hip_harvests)
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hip_harvests' AND column_name = 'fruit_calibre') THEN
    ALTER TABLE hip_harvests ADD COLUMN fruit_calibre text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hip_harvests' AND column_name = 'maturation') THEN
    ALTER TABLE hip_harvests ADD COLUMN maturation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hip_harvests' AND column_name = 'avortement_cause') THEN
    ALTER TABLE hip_harvests ADD COLUMN avortement_cause text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hip_harvests' AND column_name = 'seed_extraction') THEN
    ALTER TABLE hip_harvests ADD COLUMN seed_extraction text;
  END IF;
END $$;

-- =====================================================================
-- 9. ALTER TABLE — Colonnes grille d'évaluation Aa1 (seedlings)
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seedlings' AND column_name = 'phenotype_vigueur') THEN
    ALTER TABLE seedlings ADD COLUMN phenotype_vigueur text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seedlings' AND column_name = 'pression_sanitaire') THEN
    ALTER TABLE seedlings ADD COLUMN pression_sanitaire text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seedlings' AND column_name = 'traitement') THEN
    ALTER TABLE seedlings ADD COLUMN traitement text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seedlings' AND column_name = 'motif_elimination') THEN
    ALTER TABLE seedlings ADD COLUMN motif_elimination text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seedlings' AND column_name = 'critere_selection') THEN
    ALTER TABLE seedlings ADD COLUMN critere_selection text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seedlings' AND column_name = 'auto_report') THEN
    ALTER TABLE seedlings ADD COLUMN auto_report text;
  END IF;
END $$;
