-- =====================================================================
-- 012 — Pont Croisement → Serre, sur le VRAI schéma en production
--
-- La migration 011 supposait un modèle seedlings/sowing_batches via
-- batch_id + index (celui des fichiers de migration du dépôt). Ce n'est
-- pas le schéma réellement déployé : en production, `seedlings` et
-- `sowing_batches` ont déjà été étendus avec un lien direct `cross_id`,
-- ainsi que `fruit_code` / `seed_code` / `table_id` / `row` / `position`.
-- Cette migration 012 remplace la logique de pont pour cibler ce schéma
-- réel. Elle est idempotente et peut être rejouée sans risque, y compris
-- si la migration 011 ne s'est appliquée que partiellement.
--
-- Ne pas retenter la migration 011 : exécuter uniquement celle-ci.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Cette migration a toujours supposé un lien direct cross_id et les
--    colonnes fruit_code / seed_code / table_id / sowing_date, déjà en
--    place sur la production réelle mais jamais créées par les
--    migrations 001-009 (batch_id/index). Pour que la chaîne de
--    migrations reste rejouable sur une base vierge, on les crée ici,
--    au même schéma que sur la production réelle.
-- ---------------------------------------------------------------------
alter table public.sowing_batches
  add column if not exists cross_id uuid references public.crosses(id) on delete cascade,
  add column if not exists fruit_code text;
alter table public.sowing_batches
  add column if not exists original_seed_count integer;

alter table public.seedlings
  add column if not exists cross_id uuid references public.crosses(id) on delete cascade,
  add column if not exists fruit_code text,
  add column if not exists seed_code text,
  add column if not exists table_id uuid references public.greenhouse_tables(id) on delete set null,
  add column if not exists sowing_date timestamptz;

-- ---------------------------------------------------------------------
-- 1. Colonnes de rattachement précises (fruit_id), en plus du texte
--    fruit_code déjà en place : un identifiant stable est plus sûr
--    qu'un rapprochement par nom pour les mises à jour et suppressions.
-- ---------------------------------------------------------------------
alter table public.sowing_batches
  add column if not exists fruit_id uuid references public.cross_fruits(id) on delete cascade;
alter table public.sowing_batches alter column hip_harvest_id drop not null;

alter table public.seedlings
  add column if not exists fruit_id uuid references public.cross_fruits(id) on delete cascade;

create unique index if not exists uq_sowing_batches_fruit
  on public.sowing_batches (fruit_id) where fruit_id is not null;

create unique index if not exists uq_seedlings_user_seed_code
  on public.seedlings (user_id, seed_code) where seed_code is not null;

-- ---------------------------------------------------------------------
-- 2. Le trigger de récolte (posé en migration 010 sur cross_fruits)
--    alimente maintenant, en plus des graines (harvested_seeds) :
--      - un lot de semis (sowing_batches) par fruit récolté,
--      - un semis (seedlings) par graine, rattaché directement au
--        croisement via cross_id — sans passer par le lot.
--    Les champs propres à l'évaluation déjà saisis en Serre (statut,
--    phénotype, remarques...) ne sont jamais écrasés : seuls le nombre
--    de graines, la table de plantation et la date le sont.
-- ---------------------------------------------------------------------
create or replace function public.sync_harvested_seeds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_name text := regexp_replace(new.fruit_name, '-+$', '');
begin
  -- Graines (traçabilité fine, module Croisement).
  delete from public.harvested_seeds
  where fruit_id = new.id and seed_number > greatest(new.seed_count, 0);

  if new.seed_count > 0 then
    insert into public.harvested_seeds (user_id, fruit_id, cross_id, seed_name, seed_number, harvest_year, status, greenhouse_id, greenhouse_table_id)
    select new.user_id, new.id, new.cross_id,
      v_clean_name || '-' || n,
      n, coalesce(new.harvest_year, extract(year from now())::integer), 'à semer',
      new.greenhouse_id, new.greenhouse_table_id
    from generate_series(1, new.seed_count) as n
    on conflict (fruit_id, seed_number) do update set
      seed_name = excluded.seed_name,
      cross_id = excluded.cross_id,
      greenhouse_id = excluded.greenhouse_id,
      greenhouse_table_id = excluded.greenhouse_table_id;
  end if;

  -- Pont vers la Serre : un lot de semis par fruit récolté.
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
    on conflict (fruit_id) do update set
      seed_count = excluded.seed_count,
      table_id = excluded.table_id,
      sowing_date = excluded.sowing_date;

    -- Un semis par graine, rattaché directement au croisement.
    delete from public.seedlings
    where fruit_id = new.id and seed_code not in (
      select v_clean_name || '-' || n from generate_series(1, new.seed_count) as n
    );

    insert into public.seedlings (
      user_id, cross_id, fruit_id, fruit_code, seed_code, code,
      table_id, sowing_date, status, evaluation_status
    )
    select
      new.user_id, new.cross_id, new.id, v_clean_name,
      v_clean_name || '-' || n, v_clean_name || '-' || n,
      new.greenhouse_table_id, coalesce(new.harvest_date, current_date),
      'observing', 'Évaluation'
    from generate_series(1, new.seed_count) as n
    on conflict (user_id, seed_code) do update set
      table_id = excluded.table_id,
      fruit_id = excluded.fruit_id;
  else
    delete from public.seedlings where fruit_id = new.id;
    delete from public.sowing_batches where fruit_id = new.id;
  end if;

  return new;
end;
$$;

-- Le trigger cross_fruits_sync_seeds (migration 010) appelle déjà cette
-- fonction ; aucune recréation de trigger n'est nécessaire, seule la
-- fonction est remplacée.

comment on column public.sowing_batches.fruit_id is 'Fruit (cross_fruits) dont ce lot de semis est issu.';
comment on column public.seedlings.fruit_id is 'Fruit (cross_fruits) dont ce semis est issu. cross_id reste la référence directe au croisement.';
