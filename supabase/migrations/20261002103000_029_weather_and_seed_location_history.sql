alter table public.field_interventions
  add column if not exists weather_daily_id uuid references public.weather_daily(id) on delete set null,
  add column if not exists greenhouse_id uuid references public.greenhouses(id) on delete set null,
  add column if not exists greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null,
  add column if not exists parcelle_id uuid references public.parcelles(id) on delete set null;

create index if not exists idx_field_interventions_weather
  on public.field_interventions (user_id, weather_daily_id);

alter table public.field_observations
  add column if not exists greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null,
  add column if not exists parcelle_id uuid references public.parcelles(id) on delete set null;

create index if not exists idx_field_observations_location_history
  on public.field_observations (user_id, greenhouse_table_id, parcelle_id, observation_date);

alter table public.seedlings
  add column if not exists photo_url text;

alter table public.sowing_batches
  add column if not exists parcelle_id uuid references public.parcelles(id) on delete set null,
  add column if not exists location_type text;

alter table public.sowing_batches
  drop constraint if exists sowing_batches_one_field_location;
alter table public.sowing_batches
  add constraint sowing_batches_one_field_location
  check (table_id is null or parcelle_id is null);

alter table public.sowing_batches
  drop constraint if exists sowing_batches_location_type_check;
alter table public.sowing_batches
  add constraint sowing_batches_location_type_check
  check (location_type is null or location_type in ('pot', 'pleine_terre'));

notify pgrst, 'reload schema';