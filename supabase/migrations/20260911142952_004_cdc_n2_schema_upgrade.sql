/*
# Cahier des Charges N2 — Schema Upgrade

## Overview
Aligns the database with the Rosa Hybrida N2 specification:
- Adds nomenclature fields to crosses (base_syllable, lot_letter, flower_letter)
- Adds seed tracking (total_seeds, germinated_seeds, failed_seeds, failure_attribution)
- Adds climate data (JSONB) and harvest data (JSONB) to crosses
- Adds automatic_synthesis and free_notes to crosses and seedlings
- Adds status with 'Avorté' option to crosses
- Creates treatments table (phytosanitary products linked to crosses)
- Adds seedling_code, evaluation_status, is_promoted_to_variety, free_notes to seedlings

## Modified Tables

### crosses — added columns
- base_syllable text — phonetic root from parent names (ex: "blape")
- lot_letter varchar(5) — season lot letter (A, B...)
- flower_letter varchar(5) — flower letter (a, b...)
- climate_data jsonb DEFAULT '{}' — temperature, humidity, stress notes
- status text CHECK (En cours, Récolté, Avorté) DEFAULT 'En cours'
- abort_cause text — cause of abortion
- harvest_data jsonb DEFAULT '{}' — fruit color, etc.
- total_seeds int DEFAULT 0 — total raw seeds extracted
- germinated_seeds int DEFAULT 0 — seeds that germinated
- failed_seeds int DEFAULT 0 — seeds that failed (active variables for analysis)
- failure_attribution text CHECK (Pollen, Mère, Climat, Incompatibilité, Non déterminé)
- automatic_synthesis text — auto-generated non-modifiable synthesis
- free_notes text — hybridizer's free notes

### seedlings — added columns
- seedling_code text UNIQUE — definitive code for germinated seedlings (ex: blapeAc1)
- evaluation_status text CHECK (Évaluation, Sélectionné, Éliminé) DEFAULT 'Évaluation'
- is_promoted_to_variety boolean DEFAULT FALSE — promoted to variety for recursive lineage
- free_notes text — hybridizer's free notes
- automatic_synthesis text — already exists as auto_report

## New Tables

### treatments — phytosanitary treatments linked to crosses
- id uuid PK
- user_id uuid NOT NULL DEFAULT auth.uid()
- cross_id uuid FK → crosses(id) ON DELETE CASCADE
- product_name text NOT NULL
- treatment_type text — Naturel, Bio, Synthèse
- repetition_count int DEFAULT 1
- applied_at timestamptz DEFAULT now()
- notes text

## Security
- RLS enabled on treatments, owner-scoped CRUD (auth.uid() = user_id)
- All existing policies preserved

## Notes
1. All ALTER TABLE ADD COLUMN use IF NOT EXISTS for idempotency
2. CHECK constraints dropped and recreated to include new values
3. user_id defaults to auth.uid() on treatments for seamless inserts
*/

-- === crosses: add nomenclature columns ===
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS base_syllable text;
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS lot_letter varchar(5);
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS flower_letter varchar(5);

-- === crosses: add climate and harvest data ===
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS climate_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS harvest_data jsonb DEFAULT '{}'::jsonb;

-- === crosses: add status with Avorté option ===
ALTER TABLE crosses DROP CONSTRAINT IF EXISTS crosses_status_check;
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS status text DEFAULT 'En cours';
ALTER TABLE crosses ADD CONSTRAINT crosses_status_check CHECK (status IN ('En cours', 'Récolté', 'Avorté'));

-- === crosses: add abort cause ===
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS abort_cause text;

-- === crosses: add seed tracking ===
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS total_seeds int DEFAULT 0;
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS germinated_seeds int DEFAULT 0;
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS failed_seeds int DEFAULT 0;

-- === crosses: add failure attribution ===
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS failure_attribution text;
ALTER TABLE crosses DROP CONSTRAINT IF EXISTS crosses_failure_attribution_check;
ALTER TABLE crosses ADD CONSTRAINT crosses_failure_attribution_check
  CHECK (failure_attribution IS NULL OR failure_attribution IN ('Pollen', 'Mère', 'Climat', 'Incompatibilité', 'Non déterminé'));

-- === crosses: add synthesis and notes ===
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS automatic_synthesis text;
ALTER TABLE crosses ADD COLUMN IF NOT EXISTS free_notes text;

-- === seedlings: add definitive code and promotion ===
ALTER TABLE seedlings ADD COLUMN IF NOT EXISTS seedling_code text;
ALTER TABLE seedlings ADD COLUMN IF NOT EXISTS evaluation_status text DEFAULT 'Évaluation';
ALTER TABLE seedlings ADD COLUMN IF NOT EXISTS is_promoted_to_variety boolean DEFAULT false;
ALTER TABLE seedlings ADD COLUMN IF NOT EXISTS free_notes text;

-- Make seedling_code unique (only for non-null values)
DROP INDEX IF EXISTS idx_seedlings_seedling_code;
CREATE UNIQUE INDEX idx_seedlings_seedling_code ON seedlings (seedling_code) WHERE seedling_code IS NOT NULL;

-- === Create treatments table ===
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cross_id uuid REFERENCES crosses(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  treatment_type text,
  repetition_count int DEFAULT 1,
  applied_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_treatments" ON treatments;
CREATE POLICY "select_own_treatments" ON treatments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_treatments" ON treatments;
CREATE POLICY "insert_own_treatments" ON treatments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_treatments" ON treatments;
CREATE POLICY "update_own_treatments" ON treatments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_treatments" ON treatments;
CREATE POLICY "delete_own_treatments" ON treatments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_treatments_cross_id ON treatments (cross_id);
CREATE INDEX IF NOT EXISTS idx_treatments_user_id ON treatments (user_id);

-- === Indexes for crosses ===
CREATE INDEX IF NOT EXISTS idx_crosses_base_syllable ON crosses (base_syllable);
CREATE INDEX IF NOT EXISTS idx_crosses_status ON crosses (status);