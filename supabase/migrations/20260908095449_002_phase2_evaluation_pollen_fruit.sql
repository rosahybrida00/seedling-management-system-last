/*
# Phase 2 — Module Pollen, Fruit/Cynorrhodon & Évaluation Aa1

## Overview
Adds structured evaluation data for the breeding workflow:
1. `pollen_lots` gets new columns for structured checkbox data (anther quality, dehiscence, conservation mode).
2. `hip_harvests` gets new columns for fruit diagnostics (calibre, maturation, avortement causes, seed extraction).
3. `seedlings` gets new columns for the Aa1 evaluation grid (phenotype, disease pressure, treatment, selection/elimination criteria, auto-generated report).

## Modified Tables

### `pollen_lots` (add columns)
- `anther_quality` text — already exists, repurposed: "abondantes" | "rares"
- `dehiscence` text — already exists, repurposed: "excellente" | "faible"
- `conservation_mode` text — already exists, repurposed: "immediate" | "congelation" | "sechage"

### `hip_harvests` (add columns)
- `fruit_calibre` text: "bien_developpe" | "atrophie"
- `maturation` text: "optimale" | "precoce_forcee"
- `avortement_cause` text: one of "precoce", "tardif", "incompatibilite", "alteration_pollen", "stress_thermique", "stress_hydrique", "traumatisme", "attaque_sanitaire"
- `seed_extraction` text: "plein" | "partiellement_vide" | "totalement_vide"

### `seedlings` (add columns)
- `phenotype_vigueur` text: "tres_vigoureux" | "moyenne" | "chetif"
- `pression_sanitaire` text: one of "indemne", "oidium", "marsonia", "mildiou", "rouille"
- `traitement` text: "naturelle" | "biologique" | "synthese"
- `motif_elimination` text: one of "sensibilite_sanitaire", "defaut_floral", "port_degrade", "sterilite"
- `critere_selection` text: one of "aptitude_pollen", "remontance_florale", "valeur_ornementale"
- `auto_report` text — auto-generated synthesis text, editable by user

## Security
- All new columns are on existing RLS-protected tables (owner-scoped via user_id).
- No new tables, no policy changes needed.

## Notes
- Uses DO $$ ... END $$ to conditionally add columns only if they don't exist (idempotent).
- Existing data is not modified — new columns default to NULL.
*/

-- =====================================================================
-- Add evaluation columns to hip_harvests
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
-- Add evaluation columns to seedlings
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
