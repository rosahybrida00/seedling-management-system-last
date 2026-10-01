-- =====================================================================
-- 025 — Suivi du lot de graines après récolte : méthode de
-- stratification (cases à cocher), date de début et date de fin.
--
-- sowing_batches avait déjà deux colonnes proches mais insuffisantes :
-- `stratification` (texte libre, une seule valeur) et
-- `stratification_days` (un nombre de jours, pas de vraies dates). Elles
-- restent en place, inchangées, pour ne rien casser ; les 3 nouvelles
-- colonnes ci-dessous portent le suivi réel demandé.
--
-- La liste des méthodes est provisoire (à ajuster dès qu'elle sera
-- précisée) : c'est un text[], donc l'ajout/retrait d'une méthode ne
-- demandera qu'un changement de la liste côté app, jamais une nouvelle
-- migration.
-- =====================================================================

alter table public.sowing_batches
  add column if not exists stratification_methods text[] not null default '{}',
  add column if not exists stratification_start_date date,
  add column if not exists stratification_end_date date;

alter table public.sowing_batches drop constraint if exists sowing_batches_stratification_dates_check;
alter table public.sowing_batches add constraint sowing_batches_stratification_dates_check check (
  stratification_end_date is null
  or stratification_start_date is null
  or stratification_end_date >= stratification_start_date
);

notify pgrst, 'reload schema';
