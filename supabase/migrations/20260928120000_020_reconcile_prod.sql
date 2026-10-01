-- =====================================================================
-- 020 — Migration de RATTRAPAGE de la production
-- Fait suite à la comparaison prod / dépôt du 2026-09-28.
--
-- Principes :
--   * additive et idempotente (create ... if not exists partout) :
--     rien n'est supprimé ni renommé, aucune donnée existante n'est modifiée ;
--   * ne rattrape QUE ce que le code vivant utilise réellement
--     (les migrations 20260925100000, 20260926100000 et les tables
--     field_placements / outdoor_observations / catalog_* ne sont pas
--     reprises : le code de l'appli ne s'en sert pas) ;
--   * s'exécute dans une transaction : au moindre échec, rien n'est appliqué.
--
-- À lancer dans Supabase Studio > SQL Editor (projet de PRODUCTION).
-- =====================================================================

begin;

-- 0. Garde-fou : les tables référencées doivent exister -----------------
do $$
declare t text;
begin
  foreach t in array array['greenhouses','varieties','varieties_photos',
                           'seedlings','crosses','field_programs'] loop
    if to_regclass('public.' || t) is null then
      raise exception 'Table % introuvable en production : migration annulée', t;
    end if;
  end loop;
end $$;

-- 1. Tables utilisées par le code mais absentes en prod -----------------

-- 1.1 sensors (app/meteo) — définition reprise de la migration 001
create table if not exists public.sensors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  name text not null,
  sensor_type text,
  last_value numeric,
  last_reading_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.sensors enable row level security;
drop policy if exists sensors_own on public.sensors;
create policy sensors_own on public.sensors
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_sensors_greenhouse_id on public.sensors (greenhouse_id);
create index if not exists idx_sensors_user_id on public.sensors (user_id);

-- 1.2 catalog_collection (app/page.tsx, app/serre) — migration 017
create table if not exists public.catalog_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  variety_id uuid references public.varieties(id) on delete cascade,
  seedling_id uuid references public.seedlings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint catalog_collection_one_source
    check (((variety_id is not null)::int + (seedling_id is not null)::int) = 1),
  constraint catalog_collection_unique_variety unique (user_id, variety_id),
  constraint catalog_collection_unique_seedling unique (user_id, seedling_id)
);
alter table public.catalog_collection enable row level security;
drop policy if exists catalog_collection_own on public.catalog_collection;
create policy catalog_collection_own on public.catalog_collection
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_catalog_collection_user
  on public.catalog_collection (user_id, created_at desc);

-- 1.3 field_interventions (app/parcelle, agenda) — migration 015 agenda
create table if not exists public.field_interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  program_id uuid not null references public.field_programs(id) on delete cascade,
  due_date date,
  done boolean not null default false,
  done_date date,
  result text check (result in ('amelioration', 'stationnaire', 'echec')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_field_interventions_program
  on public.field_interventions (program_id);
create index if not exists idx_field_interventions_due
  on public.field_interventions (due_date) where done = false;
alter table public.field_interventions enable row level security;
drop policy if exists own_field_interventions on public.field_interventions;
create policy own_field_interventions on public.field_interventions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 1.4 parent_alerts (app/croisement) — jamais créée par une migration ;
--     colonnes déduites de l'insert du code : parent_name, parent_role,
--     cross_id (= id d'un croisement), message.
create table if not exists public.parent_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cross_id uuid references public.crosses(id) on delete cascade,
  parent_name text not null,
  parent_role text not null check (parent_role in ('seed', 'pollen')),
  message text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_parent_alerts_user on public.parent_alerts (user_id, created_at desc);
alter table public.parent_alerts enable row level security;
drop policy if exists parent_alerts_own on public.parent_alerts;
create policy parent_alerts_own on public.parent_alerts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Colonnes utilisées par le code mais absentes en prod ---------------

-- app/serre enregistre remarks à chaque évaluation d'un semis : sans cette
-- colonne, l'enregistrement de l'évaluation échoue.
alter table public.seedlings add column if not exists remarks text not null default '';

-- app/page.tsx et app/parcelle recherchent / affichent varieties.parentage
-- (la prod n'a que « parents »).
alter table public.varieties add column if not exists parentage text;

-- app/rose/[id] lit variety_id, is_primary et caption des photos.
alter table public.varieties_photos
  add column if not exists variety_id uuid references public.varieties(id) on delete cascade;
alter table public.varieties_photos add column if not exists is_primary boolean not null default false;
alter table public.varieties_photos add column if not exists caption text;
alter table public.varieties_photos add column if not exists created_at timestamptz not null default now();
create index if not exists idx_varieties_photos_variety on public.varieties_photos (variety_id);

-- OPTIONNEL (décommenter si vous voulez que « parentage » reprenne « parents ») :
-- update public.varieties set parentage = parents where parentage is null and parents is not null;

-- 3. Recharger le cache de schéma de l'API Supabase ---------------------
notify pgrst, 'reload schema';

commit;
