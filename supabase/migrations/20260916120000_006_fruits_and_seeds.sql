-- Fruit and seed traceability for each recorded cross.
create table if not exists public.cross_fruits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cross_id uuid not null references public.crosses(id) on delete cascade,
  fruit_name text not null,
  flower_index integer not null check (flower_index > 0),
  status text not null default 'suivi',
  checklist jsonb not null default '{}'::jsonb,
  climate_data jsonb not null default '{}'::jsonb,
  sensor_data jsonb not null default '{}'::jsonb,
  seed_count integer not null default 0 check (seed_count >= 0),
  created_at timestamptz not null default now(),
  unique(cross_id, flower_index)
);

create table if not exists public.harvested_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fruit_id uuid not null references public.cross_fruits(id) on delete cascade,
  seed_name text not null unique,
  seed_number integer not null check (seed_number > 0),
  harvest_year integer not null,
  status text not null default 'recoltee',
  greenhouse_id uuid,
  greenhouse_table_id uuid,
  created_at timestamptz not null default now(),
  unique(fruit_id, seed_number)
);

-- A code métier ne doit jamais être réattribué après suppression ou archivage.
create unique index if not exists idx_harvested_seeds_seed_name_unique
  on public.harvested_seeds(seed_name);

alter table public.cross_fruits enable row level security;
alter table public.harvested_seeds enable row level security;

drop policy if exists "own_cross_fruits" on public.cross_fruits;
create policy "own_cross_fruits" on public.cross_fruits for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_harvested_seeds" on public.harvested_seeds;
create policy "own_harvested_seeds" on public.harvested_seeds for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_cross_fruits_cross on public.cross_fruits(cross_id);
create index if not exists idx_harvested_seeds_fruit on public.harvested_seeds(fruit_id);
create index if not exists idx_harvested_seeds_status on public.harvested_seeds(user_id,status);
