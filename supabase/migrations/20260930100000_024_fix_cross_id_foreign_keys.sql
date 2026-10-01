-- =====================================================================
-- 024 — Corrige deux clés étrangères mal orientées qui bloquent
-- TOUTE récolte, même une fois la migration 023 appliquée.
--
-- Trouvé en lisant le dump complet de votre schéma réel :
--   seedlings.cross_id      → référence public.cross_programs(id)
--   sowing_batches.cross_id → référence public.cross_programs(id)
-- alors que harvested_seeds.cross_id, lui, référence correctement
-- public.crosses(id).
--
-- cross_programs est une table héritée d'une ancienne version de
-- l'application (elle n'est plus utilisée nulle part dans le code
-- actuel). Le trigger de récolte renseigne seedlings.cross_id et
-- sowing_batches.cross_id avec l'identifiant du croisement réel, pris
-- dans crosses.id. Avec la FK actuelle, chaque récolte échoue avec une
-- violation de clé étrangère (« insert or update ... violates foreign
-- key constraint ... cross_id_fkey »), dès qu'un vrai id de crosses n'a
-- pas, par pur hasard, le même id dans cross_programs — donc à chaque
-- fois. C'est très probablement la cause du blocage persistant après
-- la migration 022, masquée jusqu'ici par l'erreur de colonnes qui
-- survenait avant même d'atteindre ce contrôle.
--
-- Cette migration remplace les deux FK pour qu'elles pointent vers la
-- bonne table (crosses), sans toucher aux données existantes.
-- =====================================================================

begin;

alter table public.seedlings
  drop constraint if exists seedlings_cross_id_fkey;
alter table public.seedlings
  add constraint seedlings_cross_id_fkey
  foreign key (cross_id) references public.crosses(id) on delete cascade;

alter table public.sowing_batches
  drop constraint if exists sowing_batches_cross_id_fkey;
alter table public.sowing_batches
  add constraint sowing_batches_cross_id_fkey
  foreign key (cross_id) references public.crosses(id) on delete cascade;

commit;

notify pgrst, 'reload schema';
