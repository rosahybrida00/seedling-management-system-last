-- =====================================================================
-- 013 — Observations plein air « RAG » et indexation agronomique.
-- `parcelles` et les colonnes RAG de `crosses` sont désormais créées
-- par la migration 012 ; cette migration ne porte plus que ce qui lui
-- est propre : `outdoor_observations`, la vue `rag_agronomic_chain` et
-- les fonctions d'intégrité associées.
--
-- Non utilisée par le code de l'application à ce jour (préparation du
-- futur moteur RAG) : à réévaluer avant de l'appliquer en production.
-- =====================================================================

-- Une observation extérieure est explicitement rattachée à une Parcelle,
-- un Semis/Catalogue et au relevé météo du jour J.
create table if not exists public.outdoor_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parcelle_id uuid not null references public.parcelles(id) on delete cascade,
  seedling_id uuid references public.seedlings(id) on delete cascade,
  variety_id uuid references public.varieties(id) on delete set null,
  observation_date date not null,
  weather_daily_id uuid not null references public.weather_daily(id) on delete restrict,
  observation_type text not null default 'culture',
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint outdoor_observations_catalogue_check check (seedling_id is not null or variety_id is not null)
);

alter table public.outdoor_observations enable row level security;
drop policy if exists outdoor_observations_own on public.outdoor_observations;
create policy outdoor_observations_own on public.outdoor_observations for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_outdoor_observations_chain on public.outdoor_observations(user_id, parcelle_id, observation_date, weather_daily_id);
create index if not exists idx_outdoor_observations_seedling on public.outdoor_observations(seedling_id) where seedling_id is not null;

-- Le relevé météo doit correspondre à la date métier de la ligne.
create or replace function public.validate_weather_day_link()
returns trigger language plpgsql set search_path = public as $$
declare weather_day date;
begin
  select date into weather_day from public.weather_daily where id = new.weather_daily_id and user_id = new.user_id;
  if weather_day is null then raise exception 'Le relevé météo appartient à un autre utilisateur ou n’existe pas'; end if;
  if tg_table_name = 'outdoor_observations' and weather_day <> new.observation_date then
    raise exception 'Le relevé météo doit correspondre au jour de l’observation';
  end if;
  return new;
end; $$;

drop trigger if exists outdoor_observations_weather_day on public.outdoor_observations;
create trigger outdoor_observations_weather_day before insert or update of weather_daily_id, observation_date, user_id on public.outdoor_observations for each row execute function public.validate_weather_day_link();

-- Vue d'indexation stable pour le futur moteur RAG : chaîne complète.
create or replace view public.rag_agronomic_chain with (security_invoker = true) as
select o.id as observation_id, o.user_id, o.observation_date, o.observation_type, o.notes,
       p.id as parcelle_id, p.name as parcelle_name, p.soil_type, p.latitude, p.longitude,
       o.seedling_id, o.variety_id, w.id as weather_daily_id, w.temperature, w.humidity, w.uv_index, w.location as weather_location
from public.outdoor_observations o
join public.parcelles p on p.id = o.parcelle_id
join public.weather_daily w on w.id = o.weather_daily_id;

grant select on public.rag_agronomic_chain to authenticated;
comment on view public.rag_agronomic_chain is 'Chaînage indexable Variété/Semis ↔ Parcelle ↔ Météo historique du jour.';

-- À exécuter après correction des données historiques :
-- select * from public.verify_orphaned_data();
create or replace function public.verify_orphaned_data()
returns table(entity text, row_id uuid, reason text)
language sql stable security invoker set search_path = public as $$
  select 'outdoor_observations', o.id, 'parcelle absente ou météo du mauvais jour'
  from public.outdoor_observations o
  left join public.parcelles p on p.id = o.parcelle_id
  left join public.weather_daily w on w.id = o.weather_daily_id and w.user_id = o.user_id and w.date = o.observation_date
  where p.id is null or w.id is null
  union all
  select 'crosses', c.id, 'parcelle ou météo référencée absente'
  from public.crosses c
  where (c.parcelle_id is not null and not exists (select 1 from public.parcelles p where p.id = c.parcelle_id and p.user_id = c.user_id))
     or (c.weather_daily_id is not null and not exists (select 1 from public.weather_daily w where w.id = c.weather_daily_id and w.user_id = c.user_id));
$$;
grant execute on function public.verify_orphaned_data() to authenticated;

-- Refuse les liens croisés Parcelle/Utilisateur sur les observations.
create or replace function public.validate_parcelle_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.parcelles p where p.id = new.parcelle_id and p.user_id = new.user_id) then
    raise exception 'La Parcelle doit appartenir au même utilisateur';
  end if;
  return new;
end; $$;
drop trigger if exists outdoor_observations_parcelle_owner on public.outdoor_observations;
create trigger outdoor_observations_parcelle_owner before insert or update of parcelle_id, user_id on public.outdoor_observations for each row execute function public.validate_parcelle_owner();

-- Les données historiques doivent être contrôlées avant de rendre ces liens NOT NULL.
-- select * from public.verify_orphaned_data();
-- alter table public.crosses alter column weather_daily_id set not null;
-- alter table public.crosses alter column parcelle_id set not null; -- uniquement pour les croisements plein air
