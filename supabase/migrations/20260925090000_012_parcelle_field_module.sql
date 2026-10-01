-- =====================================================================
-- 012 — Module Parcelle, plantations, observations et programmes de
--        terrain, avec intégrité stricte pour le futur moteur RAG.
--
-- Triptyque exigé pour chaque observation/traitement/apport :
--   [Variété du Catalogue ou Semis] <-> [Serre ou Parcelle] <-> [Date /
--   Météo Historique du Jour]
-- Ce triptyque est porté par `field_plantings` (variété/semis + lieu),
-- et chaque observation/programme s'y rattache obligatoirement avec une
-- date. La météo du jour se résout via `weather_daily` (migration 011)
-- sur cette date — elle n'est pas dupliquée dans chaque table.
--
-- Fusionne ce qui était à l'origine deux migrations distinctes
-- (« 014_parcelle_field_module » et « 014_parcelles_integrite_rag »,
-- portant toutes deux le même numéro et redéfinissant partiellement
-- `parcelles`) et « 015_field_observatory » (qui redéfinissait
-- entièrement `field_observations` avec un schéma incompatible). La
-- table `field_observations` réunit ici les deux usages : un relevé
-- rattaché à une plantation (page Parcelle) ou un relevé libre de
-- l'Observatoire terrain (variété/semis + serre/parcelle + météo du
-- jour, sans plantation).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. parcelles : le pendant plein air d'une serre.
-- ---------------------------------------------------------------------
create table if not exists public.parcelles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  soil_type text[] not null default '{}',
  location text,
  latitude numeric,
  longitude numeric,
  city text,
  soil_notes text,
  area_m2 numeric check (area_m2 is null or area_m2 > 0),
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.parcelles enable row level security;
drop policy if exists "own_parcelles" on public.parcelles;
create policy "own_parcelles" on public.parcelles
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_parcelles_user on public.parcelles (user_id);

comment on table public.parcelles is 'Localisation plein air, sol et historique cultural de l''utilisateur.';

-- ---------------------------------------------------------------------
-- 2. field_plantings : quelle variété (Catalogue ou Semis) est en place
--    dans quelle Serre (table) ou Parcelle. C'est l'ancrage du triptyque :
--    toute observation ou programme passe obligatoirement par une ligne
--    ici, jamais par un texte libre d'emplacement.
-- ---------------------------------------------------------------------
create table if not exists public.field_plantings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  variety_id uuid references public.varieties(id) on delete cascade,
  seedling_id uuid references public.seedlings(id) on delete cascade,
  greenhouse_table_id uuid references public.greenhouse_tables(id) on delete cascade,
  parcelle_id uuid references public.parcelles(id) on delete cascade,
  planted_at date not null default current_date,
  removed_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  -- Exactement une source (variété du catalogue OU semis) :
  constraint field_plantings_one_source check (
    (variety_id is not null and seedling_id is null) or
    (variety_id is null and seedling_id is not null)
  ),
  -- Exactement un emplacement (table de serre OU parcelle) :
  constraint field_plantings_one_location check (
    (greenhouse_table_id is not null and parcelle_id is null) or
    (greenhouse_table_id is null and parcelle_id is not null)
  )
);

create index if not exists idx_field_plantings_variety on public.field_plantings (variety_id);
create index if not exists idx_field_plantings_seedling on public.field_plantings (seedling_id);
create index if not exists idx_field_plantings_greenhouse_table on public.field_plantings (greenhouse_table_id);
create index if not exists idx_field_plantings_parcelle on public.field_plantings (parcelle_id);

alter table public.field_plantings enable row level security;
drop policy if exists "own_field_plantings" on public.field_plantings;
create policy "own_field_plantings" on public.field_plantings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. field_observations : la grille quotidienne d'une plantation
--    (cases à cocher, remarque en texte libre), OU un relevé libre de
--    l'Observatoire terrain (variété/semis + serre/parcelle + météo du
--    jour, sans plantation). Exactement un des deux modes.
-- ---------------------------------------------------------------------
create table if not exists public.field_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Mode « plantation » (page Parcelle) :
  planting_id uuid references public.field_plantings(id) on delete cascade,
  disease_pressure text[] not null default '{}',
  pests text[] not null default '{}',
  climate_behavior text[] not null default '{}',
  treatment_applied text[] not null default '{}',
  treatment_reaction text[] not null default '{}',
  remarque text not null default '',

  -- Mode « Observatoire terrain » (page Serre) :
  seedling_id uuid references public.seedlings(id) on delete cascade,
  variety_id uuid references public.varieties(id) on delete set null,
  greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  parcelle_id uuid references public.parcelles(id) on delete cascade,
  weather_daily_id uuid references public.weather_daily(id) on delete restrict,
  observations text[] not null default '{}',
  notes text not null default '',
  intervention_passes integer,
  intervention_result text,

  -- Commun aux deux modes :
  observation_date date not null default current_date,
  intervention_date date,
  created_at timestamptz not null default now(),

  constraint field_observations_dates_check check (
    intervention_date is null or intervention_date >= observation_date
  ),
  constraint field_observations_passes_check check (
    intervention_passes is null or intervention_passes > 0
  ),
  constraint field_observations_result_check check (
    intervention_result is null
    or intervention_result in ('Amélioration', 'Stationnaire', 'Échec')
  ),
  -- Soit un relevé de plantation, soit un relevé d'observatoire complet :
  -- sujet (variété XOR semis), emplacement (serre XOR parcelle) et météo
  -- du jour renseignés.
  constraint field_observations_source_check check (
    planting_id is not null
    or (
      ((seedling_id is not null) <> (variety_id is not null))
      and ((greenhouse_id is not null) <> (parcelle_id is not null))
      and weather_daily_id is not null
    )
  )
);

create index if not exists idx_field_observations_planting on public.field_observations (planting_id);
create index if not exists idx_field_observations_date on public.field_observations (observation_date);
create index if not exists idx_field_observations_rag
  on public.field_observations (user_id, observation_date, weather_daily_id);

alter table public.field_observations enable row level security;
drop policy if exists "own_field_observations" on public.field_observations;
create policy "own_field_observations" on public.field_observations
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.field_observations is
  'Relevé de plantation (planting_id) ou relevé libre de l''Observatoire terrain (variété/semis + serre/parcelle + météo du jour).';

-- ---------------------------------------------------------------------
-- 4. field_programs : programmes collectifs/curatifs et plans de
--    fertilisation de fond, dissociés des observations quotidiennes.
--    Une ligne cible soit une plantation précise, soit tout un
--    emplacement (parcelle/serre) pour un programme collectif.
-- ---------------------------------------------------------------------
create table if not exists public.field_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  planting_id uuid references public.field_plantings(id) on delete cascade,
  greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  parcelle_id uuid references public.parcelles(id) on delete cascade,
  program_type text not null check (program_type in ('curatif', 'preventif', 'fertilisation')),
  product_name text not null,
  start_date date not null default current_date,
  intervention_count integer not null default 1,
  last_intervention_date date,
  result text check (result in ('amelioration', 'stationnaire', 'echec')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  -- Au moins une cible : une plantation précise, ou tout un emplacement.
  constraint field_programs_has_target check (
    planting_id is not null or greenhouse_id is not null or parcelle_id is not null
  )
);

create index if not exists idx_field_programs_planting on public.field_programs (planting_id);

alter table public.field_programs enable row level security;
drop policy if exists "own_field_programs" on public.field_programs;
create policy "own_field_programs" on public.field_programs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. Rattacher les lots de croisement à une Parcelle, au même titre
--    qu'à une table de serre (jusqu'ici, `location`/`containers` en
--    texte libre — remplacés par un choix réel), ainsi qu'à la météo
--    du jour pour les croisements réalisés en plein air.
-- ---------------------------------------------------------------------
alter table public.crosses
  add column if not exists greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null,
  add column if not exists parcelle_id uuid references public.parcelles(id) on delete set null,
  add column if not exists location_kind text,
  add column if not exists weather_daily_id uuid references public.weather_daily(id) on delete restrict;

alter table public.crosses drop constraint if exists crosses_one_field_location;
alter table public.crosses add constraint crosses_one_field_location check (
  greenhouse_table_id is null or parcelle_id is null
);

alter table public.crosses drop constraint if exists crosses_location_kind_check;
alter table public.crosses add constraint crosses_location_kind_check check (
  location_kind is null or location_kind in ('greenhouse', 'parcelle')
);

create index if not exists idx_crosses_rag_chain on public.crosses (user_id, parcelle_id, weather_daily_id);
