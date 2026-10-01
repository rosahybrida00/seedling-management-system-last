-- =====================================================================
-- 010 — Correction de l'architecture Croisement (Couple → Lot → Fruit → Graine)
--
-- Contexte : les colonnes flower_count, pollen_type, pollen_lot_id sur
-- `crosses` étaient utilisées par l'application sans exister dans aucune
-- migration versionnée (dérive de schéma, probablement ajoutées à la main).
-- Cette migration les rend explicites, corrige la nomenclature (plus
-- d'année insérée dans les codes) et ajoute les garde-fous qui empêchent
-- une génération de fruits incohérente avec le nombre de fleurs saisi.
-- Elle est idempotente : elle peut être rejouée sans erreur.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colonnes du lot (table `crosses`, une ligne = un lot)
-- ---------------------------------------------------------------------
alter table public.crosses
  add column if not exists flower_count integer,
  add column if not exists pollen_type text not null default 'frais',
  add column if not exists pollen_lot_id uuid references public.pollen_lots(id) on delete set null,
  add column if not exists pollen_quality jsonb not null default '{}'::jsonb,
  add column if not exists location text,
  add column if not exists containers text;

-- Le nombre de fleurs reste vide tant qu'il n'est pas saisi : plus de
-- valeur par défaut à 1 (le bouton « Suivi des fruits » doit rester grisé).
alter table public.crosses alter column flower_count drop default;
alter table public.crosses alter column flower_count drop not null;

alter table public.crosses drop constraint if exists crosses_pollen_type_check;
alter table public.crosses add constraint crosses_pollen_type_check
  check (pollen_type in ('frais', 'conservé'));

-- ---------------------------------------------------------------------
-- 2. Clé de couple stable (indépendante de la racine phonétique, qui
--    peut théoriquement entrer en collision entre deux couples distincts)
-- ---------------------------------------------------------------------
alter table public.crosses
  add column if not exists pair_key text
  generated always as (lower(coalesce(seed_parent, '')) || '×' || lower(coalesce(pollen_parent, ''))) stored;

-- Renumérote les lettres de lot en double ou manquantes à l'intérieur
-- d'un même couple (dérive de l'ancien calcul par comptage), par ordre
-- de création, avant de poser la contrainte d'unicité.
with broken as (
  select user_id, pair_key
  from public.crosses
  where lot_letter is not null
  group by user_id, pair_key
  having count(*) <> count(distinct lot_letter)
), reassigned as (
  select c.id,
         chr(64 + (row_number() over (partition by c.user_id, c.pair_key order by c.created_at, c.id))::int) as letter
  from public.crosses c
  join broken b on b.user_id = c.user_id and b.pair_key = c.pair_key
  where c.lot_letter is not null
)
update public.crosses c
set lot_letter = r.letter
from reassigned r
where c.id = r.id and c.lot_letter is distinct from r.letter;

create unique index if not exists uq_crosses_pair_lot
  on public.crosses (user_id, pair_key, lot_letter)
  where lot_letter is not null;

-- ---------------------------------------------------------------------
-- 3. Normalisation des codes existants : suppression de l'année
--    accidentellement insérée (ex: blapego-2026-A -> blapego-A).
-- ---------------------------------------------------------------------
update public.crosses
set code = regexp_replace(code, '^(.*)-\d{4}-([A-Z])$', '\1-\2')
where code ~ '^.*-\d{4}-[A-Z]$';

update public.cross_fruits f
set fruit_name = regexp_replace(f.fruit_name, '^(.*)-\d{4}-([A-Z])-([a-z])-?$', '\1-\2-\3')
from public.crosses c
where f.cross_id = c.id
  and f.fruit_name ~ '^.*-\d{4}-[A-Z]-[a-z]-?$';

-- ---------------------------------------------------------------------
-- 4. cross_fruits : champs de récolte / échec par fruit (Voie A / Voie B)
-- ---------------------------------------------------------------------
alter table public.cross_fruits
  add column if not exists harvest_date date,
  add column if not exists fruit_calibre text,
  add column if not exists maturation text,
  add column if not exists seed_extraction text,
  add column if not exists failure_causes text[] not null default '{}';

alter table public.cross_fruits drop constraint if exists cross_fruits_calibre_check;
alter table public.cross_fruits add constraint cross_fruits_calibre_check
  check (fruit_calibre is null or fruit_calibre in ('bien_developpe', 'atrophie'));
alter table public.cross_fruits drop constraint if exists cross_fruits_maturation_check;
alter table public.cross_fruits add constraint cross_fruits_maturation_check
  check (maturation is null or maturation in ('optimale', 'precoce_forcee'));
alter table public.cross_fruits drop constraint if exists cross_fruits_extraction_check;
alter table public.cross_fruits add constraint cross_fruits_extraction_check
  check (seed_extraction is null or seed_extraction in ('plein', 'partiellement_vide', 'totalement_vide'));
alter table public.cross_fruits drop constraint if exists cross_fruits_status_check2;
alter table public.cross_fruits add constraint cross_fruits_status_check2
  check (status in ('suivi', 'récolté', 'vide', 'avorté'));

-- ---------------------------------------------------------------------
-- 5. Garde-fous « règle d'or anti-anarchie »
--    - aucun fruit ne peut être créé avant la validation du nombre de
--      fleurs, ni au-delà de ce nombre ;
--    - le nombre de fleurs ne peut plus être modifié une fois des fruits
--      générés (il devient définitif pour ce lot).
-- ---------------------------------------------------------------------
create or replace function public.trg_fruit_within_flower_count()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  select flower_count into v_count from public.crosses where id = new.cross_id;
  if v_count is null then
    raise exception 'Le nombre de fleurs pollinisées de ce lot n''est pas encore validé.';
  end if;
  if new.flower_index < 1 or new.flower_index > v_count then
    raise exception 'Le fruit n° % dépasse le nombre de fleurs pollinisées (%).', new.flower_index, v_count;
  end if;
  return new;
end;
$$;

drop trigger if exists fruit_within_flower_count on public.cross_fruits;
create trigger fruit_within_flower_count
  before insert on public.cross_fruits
  for each row execute function public.trg_fruit_within_flower_count();

create or replace function public.trg_lock_flower_count()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.flower_count is not null
     and new.flower_count is distinct from old.flower_count
     and exists (select 1 from public.cross_fruits where cross_id = new.id) then
    raise exception 'Le nombre de fleurs pollinisées est déjà validé pour ce lot et ne peut plus être modifié.';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_flower_count on public.crosses;
create trigger lock_flower_count
  before update of flower_count on public.crosses
  for each row execute function public.trg_lock_flower_count();

-- ---------------------------------------------------------------------
-- 6. harvested_seeds : unicité par utilisateur (et non plus globale),
--    et nom de graine corrigé (plus d'année : fruit-numéro).
-- ---------------------------------------------------------------------
alter table public.harvested_seeds drop constraint if exists harvested_seeds_seed_name_key;
drop index if exists idx_harvested_seeds_seed_name_unique;
create unique index if not exists uq_harvested_seeds_user_seed_name
  on public.harvested_seeds (user_id, seed_name);

update public.harvested_seeds s
set seed_name = regexp_replace(s.seed_name, '^(.*)-\d{4}-(\d+)$', '\1-\2')
where s.seed_name ~ '^.*-\d{4}-\d+$'
  and not exists (
    select 1 from public.harvested_seeds s2
    where s2.user_id = s.user_id
      and s2.id <> s.id
      and s2.seed_name = regexp_replace(s.seed_name, '^(.*)-\d{4}-(\d+)$', '\1-\2')
  );

create or replace function public.sync_harvested_seeds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.harvested_seeds
  where fruit_id = new.id and seed_number > greatest(new.seed_count, 0);

  if new.seed_count > 0 then
    insert into public.harvested_seeds (user_id, fruit_id, cross_id, seed_name, seed_number, harvest_year, status, greenhouse_id, greenhouse_table_id)
    select new.user_id, new.id, new.cross_id,
      regexp_replace(new.fruit_name, '-+$', '') || '-' || n,
      n, coalesce(new.harvest_year, extract(year from now())::integer), 'à semer',
      new.greenhouse_id, new.greenhouse_table_id
    from generate_series(1, new.seed_count) as n
    on conflict (fruit_id, seed_number) do update set
      seed_name = excluded.seed_name,
      cross_id = excluded.cross_id,
      greenhouse_id = excluded.greenhouse_id,
      greenhouse_table_id = excluded.greenhouse_table_id;
  end if;
  return new;
end;
$$;

drop trigger if exists cross_fruits_sync_seeds on public.cross_fruits;
create trigger cross_fruits_sync_seeds
after insert or update of seed_count, fruit_name, harvest_year, greenhouse_id, greenhouse_table_id, cross_id
on public.cross_fruits
for each row execute function public.sync_harvested_seeds();

grant select, insert, update, delete on public.harvested_seeds to authenticated;
grant select, insert, update, delete on public.cross_fruits to authenticated;

comment on column public.crosses.pollen_type is 'frais (utilisation directe) ou conservé (issu d''un lot du module Pollen).';
comment on column public.cross_fruits.failure_causes is 'Causes d''échec cochées (Voie B) : precoce, tardif, incompatibilite, alteration_pollen, stress_thermique, stress_hydrique, traumatisme, attaque_sanitaire.';
comment on table public.cross_fruits is 'Un fruit par fleur pollinisée du lot. Voie A (récolte) renseigne seed_count/harvest_date/fruit_calibre/maturation/seed_extraction. Voie B (échec) renseigne failure_causes.';
