-- =====================================================================
-- 026 — Type d'emplacement (Conteneur/Pot vs Pleine terre) sur chaque
-- plantation, en case à cocher à choix unique.
--
-- field_plantings avait déjà `container_type` (texte libre) : laissé
-- tel quel pour ne rien casser. `location_type` est la nouvelle case à
-- cocher demandée, strictement limitée à deux valeurs.
--
-- Rien à ajouter pour les agendas par serre/parcelle entière : la table
-- field_programs permet déjà de cibler soit une plantation précise
-- (planting_id), soit toute une serre/parcelle (greenhouse_id /
-- parcelle_id) — c'est la partie app (AgendaSection) qui ne proposait
-- pas encore ce second cas, pas le schéma.
-- =====================================================================

alter table public.field_plantings
  add column if not exists location_type text;

alter table public.field_plantings drop constraint if exists field_plantings_location_type_check;
alter table public.field_plantings add constraint field_plantings_location_type_check
  check (location_type is null or location_type in ('pot', 'pleine_terre'));

notify pgrst, 'reload schema';
