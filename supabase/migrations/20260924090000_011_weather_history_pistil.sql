-- =====================================================================
-- 013 — Historique météo de l'application, observation du pistil,
--        date + météo sur les lots de pollen
--
-- La météo n'est plus interrogée en direct à chaque saisie : un module
-- météo unique (weather_daily) enregistre la météo du jour une fois par
-- jour et par utilisateur (zone géographique automatique, tirée du
-- profil — jamais un champ saisi à la main). Croisement, Lot, Fruit et
-- Module Pollen viennent y lire la météo de la date demandée ; si une
-- date passée n'a encore jamais été enregistrée, l'historique archive
-- (open-meteo) est interrogé une fois puis mis en cache ici.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. weather_daily : un relevé par utilisateur et par jour.
-- ---------------------------------------------------------------------
create table if not exists public.weather_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  temperature numeric,
  humidity numeric,
  uv_index numeric,
  location text,
  source text not null default 'live' check (source in ('live', 'archive')),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_weather_daily_user_date on public.weather_daily (user_id, date);

alter table public.weather_daily enable row level security;
drop policy if exists "own_weather_daily" on public.weather_daily;
create policy "own_weather_daily" on public.weather_daily
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 2. Zone géographique automatique : latitude/longitude/ville sur le
--    profil, jamais un champ visible ailleurs dans l'appli.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    alter table public.profiles add column if not exists latitude numeric;
    alter table public.profiles add column if not exists longitude numeric;
    alter table public.profiles add column if not exists city text;
    alter table public.profiles add column if not exists postal_code text;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Observation du pistil à la pollinisation (stigmate / style / ovaire).
-- ---------------------------------------------------------------------
alter table public.crosses add column if not exists pistil_checklist text[] not null default '{}';
comment on column public.crosses.pistil_checklist is 'Observation du pistil au moment de la pollinisation : stigmate_receptif, style_intact, ovaire_forme.';

-- ---------------------------------------------------------------------
-- 4. Module Pollen : date de récolte du pollen + météo du jour, pour le
--    futur bilan de fiabilité du pollen par mois / météo / zone.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'pollen_lots') then
    alter table public.pollen_lots add column if not exists harvest_date date;
    alter table public.pollen_lots add column if not exists weather_data jsonb not null default '{}'::jsonb;
  end if;
end $$;
