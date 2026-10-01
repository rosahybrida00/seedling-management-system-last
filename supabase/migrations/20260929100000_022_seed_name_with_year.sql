-- =====================================================================
-- NOTE (2026-09-30) : après application, la production a renvoyé
-- « column "code" of relation "sowing_batches" does not exist » — ces
-- deux colonnes (sowing_batches.code, seedlings.index) existent dans le
-- schéma théorique des migrations 001-018 mais pas dans la vraie base.
-- La migration 023 (fix_prod_schema_mismatch) corrige cette fonction
-- pour la forme réelle de la production ; elle s'applique après
-- celle-ci et la remplace. Ce fichier reste correct uniquement pour une
-- base construite intégralement à partir de 001 à 018.
-- =====================================================================

-- =====================================================================
-- 022 — Corrige la récolte des fruits (4 bugs) et ajoute l'année au nom
-- de chaque graine.
--
-- Les 4 bugs suivants ont tous été reproduits et confirmés en rejouant
-- une récolte réelle sur une base de test, avec le code exact de ce
-- dépôt — indépendamment de tout écart avec la production.
--
-- Bug n°1 : le trigger de récolte utilisait `on conflict (fruit_id)` sur
-- sowing_batches et `on conflict (user_id, seed_code)` sur seedlings,
-- alors que les deux index uniques concernés sont PARTIELS (`where
-- fruit_id is not null` / `where seed_code is not null`). Sans répéter
-- cette condition dans la clause ON CONFLICT, Postgres ne peut pas s'en
-- servir comme arbitre et renvoie « there is no unique or exclusion
-- constraint matching the ON CONFLICT specification » — la récolte du
-- fruit échoue purement et simplement, à chaque fois.
--
-- Bug n°2 : trois colonnes NOT NULL de la toute première migration
-- n'étaient jamais renseignées par cette insertion, provoquant chacune
-- la même violation de contrainte dès que le bug n°1 est corrigé :
--   - sowing_batches.code       → renseigné avec la même valeur que
--                                 fruit_code ;
--   - seedlings.batch_id        → l'identifiant du lot de semis venant
--                                 d'être créé/mis à jour juste au-dessus
--                                 est récupéré (RETURNING ... INTO) puis
--                                 réutilisé ici ;
--   - seedlings.index           → renseigné avec le numéro de la graine
--                                 (n).
--
-- Bug n°3 : le nom de graine (« seed_code ») ne comportait aucune année
-- (ex: blapego-A-a-1). Le trigger de récolte fait un UPSERT sur
-- seedlings avec pour clé (user_id, seed_code) : si ce code venait à se
-- répéter (compteur de lot dépassant 26 lettres pour un même couple de
-- parents sur plusieurs années, ou tout autre cas de doublon), l'upsert
-- ne renvoyait aucune erreur — il réécrivait silencieusement le semis
-- d'un AUTRE fruit.
--
-- Correctif : le nom de graine devient codeFruit-numéro-année (ex:
-- blapego-A-a-1-2026), année de RÉCOLTE de ce fruit (cross_fruits.
-- harvest_year, déjà renseignée par l'app à chaque récolte). Cela ne
-- change rien à la lettre de lot ni à la lettre de fruit : plusieurs
-- lots du même couple la même année continuent de recevoir B, C, D...
-- normalement, comme avant.
--
-- Les codes déjà enregistrés ne sont PAS renommés automatiquement (voir
-- le bloc optionnel commenté en bas). Tant qu'il n'est pas exécuté, les
-- graines déjà récoltées gardent leur ancien nom sans année ; seules les
-- nouvelles récoltes (et les mises à jour du nombre de graines d'un
-- fruit déjà récolté) recevront le nouveau format.
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
  if new.seed_count > 0 then
    insert into public.sowing_batches (
      user_id, cross_id, fruit_id, code, fruit_code, sowing_date, seed_count,
      original_seed_count, table_id
    )
    values (
      new.user_id, new.cross_id, new.id, v_clean_name, v_clean_name,
      coalesce(new.harvest_date, current_date),
      new.seed_count, new.seed_count, new.greenhouse_table_id
    )
    on conflict (fruit_id) where fruit_id is not null do update set
      code = excluded.code,
      seed_count = excluded.seed_count,
      table_id = excluded.table_id,
      sowing_date = excluded.sowing_date
    returning id into v_batch_id;

    -- Un semis par graine, rattaché directement au croisement.
    delete from public.seedlings
    where fruit_id = new.id and seed_code not in (
      select v_clean_name || '-' || n || '-' || v_harvest_year from generate_series(1, new.seed_count) as n
    );

    insert into public.seedlings (
      user_id, cross_id, fruit_id, batch_id, fruit_code, seed_code, code, index,
      table_id, sowing_date, status, evaluation_status
    )
    select
      new.user_id, new.cross_id, new.id, v_batch_id, v_clean_name,
      v_clean_name || '-' || n || '-' || v_harvest_year,
      v_clean_name || '-' || n || '-' || v_harvest_year, n,
      new.greenhouse_table_id, coalesce(new.harvest_date, current_date),
      'observing', 'Évaluation'
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

-- ---------------------------------------------------------------------
-- Diagnostic (lecture seule) — repère les seed_code déjà en doublon
-- AVANT ce correctif, signe qu'un upsert a pu fusionner deux semis par
-- erreur. À exécuter à la main dans Supabase Studio, à toutes fins de
-- vérification :
--
-- select user_id, seed_code, count(*), array_agg(id) as seedling_ids,
--        array_agg(fruit_id) as fruit_ids
-- from public.seedlings
-- where seed_code is not null
-- group by user_id, seed_code
-- having count(*) > 1;
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- OPTIONNEL — renommer les graines déjà récoltées au nouveau format
-- (ajoute l'année à la fin des codes existants qui n'en ont pas déjà
-- une). À ne lancer qu'après avoir vérifié la requête de diagnostic
-- ci-dessus, et après avoir confirmé qu'aucun de ces noms n'est déjà
-- utilisé ailleurs (étiquettes physiques, notes...).
--
-- update public.harvested_seeds
-- set seed_name = seed_name || '-' || harvest_year
-- where seed_name !~ ('-' || harvest_year || '$');
--
-- update public.seedlings s
-- set seed_code = seed_code || '-' || hs.harvest_year,
--     code = code || '-' || hs.harvest_year
-- from public.harvested_seeds hs
-- where hs.fruit_id = s.fruit_id
--   and s.seed_code = regexp_replace(hs.seed_name, '-' || hs.harvest_year || '$', '')
--   and s.seed_code !~ ('-' || hs.harvest_year || '$');
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';
