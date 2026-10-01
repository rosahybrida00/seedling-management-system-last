-- =====================================================================
-- 023 — Corrige le trigger de récolte (sync_harvested_seeds) pour la
-- forme RÉELLE de votre base de production, qui diverge des migrations
-- 001-018 sur deux colonnes précises.
--
-- Erreur obtenue en production après la migration 022 :
--   « column "code" of relation "sowing_batches" does not exist »
--
-- Ce n'est pas un bug du trigger lui-même : sowing_batches.code existe
-- dans le schéma théorique des migrations 001-018, mais PAS dans votre
-- base réelle (déjà repéré comme écart lors de la toute première
-- comparaison prod/dépôt : « CRITIQUE, colonne absente en prod,
-- sowing_batches.code »). De la même façon, seedlings.index est
-- également absent de votre base réelle, alors que la migration 022
-- l'utilisait aussi.
--
-- Correctif : ces deux colonnes ne sont plus renseignées par le
-- trigger. seedlings.batch_id, lui, a été confirmé présent dans votre
-- base réelle lors de cette même comparaison : il reste renseigné.
--
-- En testant contre un export complet de votre schéma réel, une
-- troisième divergence est apparue : seedlings.status n'accepte que
-- des valeurs précises (Semé, Stratifié, Germé, Repiqué, En croissance,
-- Floraison, Retenu, Écarté, Mort) — pas « observing » ni
-- « Évaluation ». Ces deux colonnes ont justement pour valeur par
-- défaut réelle ce que le trigger voulait y mettre : elles ne sont
-- donc plus renseignées explicitement, laissées au défaut de la table.
--
-- Si par la suite vous ajoutez réellement ces colonnes à votre base
-- (pour retrouver le schéma des migrations 001-018), il faudra alors
-- rejouer une version du trigger qui les renseigne à nouveau — signalez-
-- le-moi, je la réécrirai.
-- =====================================================================

create or replace function public.sync_harvested_seeds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_name text := regexp_replace(new.fruit_name, '-+$', '');
  v_harvest_year integer := coalesce(new.harvest_year, extract(year from now())::integer);
  v_batch_id uuid;
begin
  -- Graines (traçabilité fine, module Croisement).
  delete from public.harvested_seeds
  where fruit_id = new.id and seed_number > greatest(new.seed_count, 0);

  if new.seed_count > 0 then
    insert into public.harvested_seeds (user_id, fruit_id, cross_id, seed_name, seed_number, harvest_year, status, greenhouse_id, greenhouse_table_id)
    select new.user_id, new.id, new.cross_id,
      v_clean_name || '-' || n || '-' || v_harvest_year,
      n, v_harvest_year, 'à semer',
      new.greenhouse_id, new.greenhouse_table_id
    from generate_series(1, new.seed_count) as n
    on conflict (fruit_id, seed_number) do update set
      seed_name = excluded.seed_name,
      cross_id = excluded.cross_id,
      harvest_year = excluded.harvest_year,
      greenhouse_id = excluded.greenhouse_id,
      greenhouse_table_id = excluded.greenhouse_table_id;
  end if;

  -- Pont vers la Serre : un lot de semis par fruit récolté.
  -- (sowing_batches.code n'existe pas dans votre base réelle : omis.)
  if new.seed_count > 0 then
    insert into public.sowing_batches (
      user_id, cross_id, fruit_id, fruit_code, sowing_date, seed_count,
      original_seed_count, table_id
    )
    values (
      new.user_id, new.cross_id, new.id, v_clean_name,
      coalesce(new.harvest_date, current_date),
      new.seed_count, new.seed_count, new.greenhouse_table_id
    )
    on conflict (fruit_id) where fruit_id is not null do update set
      seed_count = excluded.seed_count,
      table_id = excluded.table_id,
      sowing_date = excluded.sowing_date
    returning id into v_batch_id;

    -- Un semis par graine, rattaché directement au croisement.
    delete from public.seedlings
    where fruit_id = new.id and seed_code not in (
      select v_clean_name || '-' || n || '-' || v_harvest_year from generate_series(1, new.seed_count) as n
    );

    -- (seedlings.index n'existe pas dans votre base réelle : omis.
    --  status et evaluation_status ne sont pas renseignés : la
    --  contrainte de status n'accepte que des valeurs précises
    --  [Semé, Stratifié, Germé...], qui sont aussi ses valeurs par
    --  défaut réelles — on les laisse donc au défaut de la colonne.)
    insert into public.seedlings (
      user_id, cross_id, fruit_id, batch_id, fruit_code, seed_code, code,
      table_id, sowing_date
    )
    select
      new.user_id, new.cross_id, new.id, v_batch_id, v_clean_name,
      v_clean_name || '-' || n || '-' || v_harvest_year,
      v_clean_name || '-' || n || '-' || v_harvest_year,
      new.greenhouse_table_id, coalesce(new.harvest_date, current_date)
    from generate_series(1, new.seed_count) as n
    on conflict (user_id, seed_code) where seed_code is not null do update set
      table_id = excluded.table_id,
      batch_id = excluded.batch_id,
      fruit_id = excluded.fruit_id;
  else
    delete from public.seedlings where fruit_id = new.id;
    delete from public.sowing_batches where fruit_id = new.id;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
