-- =====================================================================
-- 011 — Pont Croisement → Serre (sowing_batches / seedlings)
--
-- La page Serre (app/serre/page.tsx) lit encore exclusivement les tables
-- historiques `sowing_batches` et `seedlings`, jamais `cross_fruits` ni
-- `harvested_seeds`. Plutôt que de réécrire la page Serre, cette migration
-- fait apparaître automatiquement, dans ces mêmes tables, chaque graine
-- récoltée via un fruit (Voie A du module Croisement) :
--   1 fruit récolté  -> 1 sowing_batch (le « lot de semis » vu par la Serre)
--   1 graine (harvested_seeds) -> 1 seedling (le semis individuel suivi)
--
-- Rejouer cette migration est sans danger (idempotente).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. sowing_batches doit pouvoir exister sans lien vers l'ancienne table
--    hip_harvests (plus alimentée), et se rattacher directement au fruit.
-- ---------------------------------------------------------------------
alter table public.sowing_batches
  add column if not exists fruit_id uuid references public.cross_fruits(id) on delete cascade;

alter table public.sowing_batches alter column hip_harvest_id drop not null;

create unique index if not exists uq_sowing_batches_fruit
  on public.sowing_batches (fruit_id) where fruit_id is not null;

create unique index if not exists uq_seedlings_batch_index
  on public.seedlings (batch_id, index);

-- ---------------------------------------------------------------------
-- 2. Étend le trigger de récolte : en plus des graines (harvested_seeds,
--    déjà géré depuis la migration 010), il crée/actualise le lot de
--    semis et les semis individuels correspondants dans la Serre.
--    Les champs propres à la Serre déjà renseignés par l'utilisateur
--    (statut du semis, remarques du lot) ne sont jamais écrasés : seuls
--    le nombre de graines, la table de plantation et la date le sont.
-- ---------------------------------------------------------------------
create or replace function public.sync_harvested_seeds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_id uuid;
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

  -- Pont vers la Serre (sowing_batches / seedlings).
  if new.seed_count > 0 then
    insert into public.sowing_batches (user_id, fruit_id, code, sowing_date, seed_count, table_id, remarks)
    values (
      new.user_id, new.id, v_clean_name,
      coalesce(new.harvest_date::timestamptz, now()),
      new.seed_count, new.greenhouse_table_id, ''
    )
    on conflict (fruit_id) do update set
      seed_count = excluded.seed_count,
      table_id = excluded.table_id,
      sowing_date = excluded.sowing_date
    returning id into v_batch_id;

    if v_batch_id is null then
      select id into v_batch_id from public.sowing_batches where fruit_id = new.id;
    end if;

    delete from public.seedlings
    where batch_id = v_batch_id and index > new.seed_count;

    insert into public.seedlings (user_id, batch_id, code, seedling_code, index, status)
    select new.user_id, v_batch_id, v_clean_name || '-' || n, v_clean_name || '-' || n, n, 'observing'
    from generate_series(1, new.seed_count) as n
    on conflict (batch_id, index) do update set
      code = excluded.code,
      seedling_code = excluded.seedling_code;
  else
    delete from public.seedlings
    where batch_id in (select id from public.sowing_batches where fruit_id = new.id);
    delete from public.sowing_batches where fruit_id = new.id;
  end if;

  return new;
end;
$$;

-- Le trigger cross_fruits_sync_seeds (migration 010) appelle déjà cette
-- fonction ; aucune recréation de trigger n'est nécessaire, seule la
-- fonction est remplacée.

comment on column public.sowing_batches.fruit_id is 'Fruit (cross_fruits) dont ce lot de semis est issu. Remplace le lien historique vers hip_harvests, qui n''est plus alimenté.';
