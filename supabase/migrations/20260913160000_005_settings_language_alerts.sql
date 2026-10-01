-- 007: Paramètres — langue de l'interface + activation des alertes serre
-- Ajoute les colonnes nécessaires pour rendre la page Paramètres pleinement
-- fonctionnelle (changement de langue persistant, activation des alertes
-- gel/canicule), sans toucher aux tables du Catalogue Général ni du
-- Catalogue des Semis.

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS alerts_enabled boolean NOT NULL DEFAULT true;
