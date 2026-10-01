-- =====================================================================
-- 021 — Rattrapage de l'« Observatoire terrain » (app/serre)
-- Complète la 020 (à lancer APRÈS elle ; les deux sont idempotentes).
--
-- Pourquoi : le composant field-observatory, affiché en haut de la page
-- Serre, insère dans field_observations avec un schéma (seedling_id,
-- variety_id, greenhouse_id, parcelle_id, weather_daily_id, observations,
-- notes, intervention_passes, intervention_result) que la prod n'a pas,
-- et sans planting_id, aujourd'hui NOT NULL. Chaque enregistrement échoue
-- donc en silence. Il utilise aussi catalog_variety_requests et
-- admin_alerts, absentes de la prod.
--
-- Additive : la table field_observations garde ses colonnes actuelles ;
-- les relevés de la page Parcelle (avec planting_id) restent valides.
-- Transaction unique : tout ou rien.
-- =====================================================================

begin;

do $$
declare t text;
begin
  foreach t in array array['field_observations','weather_daily','parcelles',
                           'greenhouses','seedlings','varieties'] loop
    if to_regclass('public.' || t) is null then
      raise exception 'Table % introuvable en production : migration annulée', t;
    end if;
  end loop;
end $$;

-- 1. Demandes de variété inconnue + alertes ---------------------------
create table if not exists public.catalog_variety_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  requested_name text not null check (length(trim(requested_name)) between 2 and 160),
  source text not null default 'user' check (source in ('user', 'unknown_variety')),
  context text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  alert_type text not null default 'catalog_request',
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
-- Le composant insère l'alerte sans user_id : on le remplit par défaut.
alter table public.admin_alerts alter column user_id set default auth.uid();

alter table public.catalog_variety_requests enable row level security;
alter table public.admin_alerts enable row level security;

drop policy if exists catalog_variety_requests_own on public.catalog_variety_requests;
create policy catalog_variety_requests_own on public.catalog_variety_requests
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists admin_alerts_own on public.admin_alerts;
create policy admin_alerts_own on public.admin_alerts
  for select to authenticated using (auth.uid() = user_id);
-- Nouveau par rapport au dépôt : sans policy d'insertion, le composant ne
-- pouvait pas créer l'alerte (la RLS la refusait).
drop policy if exists admin_alerts_insert_own on public.admin_alerts;
create policy admin_alerts_insert_own on public.admin_alerts
  for insert to authenticated with check (auth.uid() = user_id);

create index if not exists idx_catalog_variety_requests_status
  on public.catalog_variety_requests (status, created_at desc);
create index if not exists idx_admin_alerts_user
  on public.admin_alerts (user_id, is_read, created_at desc);

-- 2. field_observations : ajout des colonnes de l'observatoire --------
alter table public.field_observations
  add column if not exists seedling_id uuid references public.seedlings(id) on delete cascade,
  add column if not exists variety_id uuid references public.varieties(id) on delete set null,
  add column if not exists greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  add column if not exists parcelle_id uuid references public.parcelles(id) on delete cascade,
  add column if not exists weather_daily_id uuid references public.weather_daily(id) on delete restrict,
  add column if not exists observations text[] not null default '{}',
  add column if not exists notes text not null default '',
  add column if not exists intervention_passes integer,
  add column if not exists intervention_result text;

-- Un relevé d'observatoire n'a pas de planting_id.
alter table public.field_observations alter column planting_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'field_observations_passes_check') then
    alter table public.field_observations
      add constraint field_observations_passes_check
      check (intervention_passes is null or intervention_passes > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'field_observations_result_check') then
    alter table public.field_observations
      add constraint field_observations_result_check
      check (intervention_result is null
             or intervention_result in ('Amélioration', 'Stationnaire', 'Échec'));
  end if;
  -- Soit un relevé lié à une plantation (page Parcelle), soit un relevé
  -- d'observatoire complet : sujet, emplacement et météo du jour.
  if not exists (select 1 from pg_constraint where conname = 'field_observations_source_check') then
    alter table public.field_observations
      add constraint field_observations_source_check
      check (
        planting_id is not null
        or (
          ((seedling_id is not null) <> (variety_id is not null))
          and ((greenhouse_id is not null) <> (parcelle_id is not null))
          and weather_daily_id is not null
        )
      );
  end if;
end $$;

create index if not exists idx_field_observations_obs
  on public.field_observations (user_id, observation_date, weather_daily_id);

-- 3. Intégrité : références appartenant au même utilisateur -----------
-- Ne s'applique qu'aux relevés d'observatoire (sans planting_id).
create or replace function public.validate_field_observation_integrity()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.planting_id is not null and new.weather_daily_id is null then
    return new;
  end if;
  if new.weather_daily_id is not null and not exists (
       select 1 from public.weather_daily w
       where w.id = new.weather_daily_id
         and w.user_id = new.user_id
         and w.date = new.observation_date) then
    raise exception 'La météo doit appartenir à l''utilisateur et correspondre à la date d''observation';
  end if;
  if new.parcelle_id is not null and not exists (
       select 1 from public.parcelles p
       where p.id = new.parcelle_id and p.user_id = new.user_id) then
    raise exception 'La parcelle doit appartenir au même utilisateur';
  end if;
  return new;
end; $$;

drop trigger if exists field_observations_integrity on public.field_observations;
create trigger field_observations_integrity
  before insert or update on public.field_observations
  for each row execute function public.validate_field_observation_integrity();

notify pgrst, 'reload schema';

commit;
