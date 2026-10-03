alter table public.field_plantings
  add column if not exists group_id uuid,
  add column if not exists individual_number integer;

update public.field_plantings
set group_id = id
where group_id is null;

alter table public.field_plantings
  drop constraint if exists field_plantings_individual_number_check;
alter table public.field_plantings
  add constraint field_plantings_individual_number_check
  check (individual_number is null or individual_number > 0);

create index if not exists idx_field_plantings_group
  on public.field_plantings (user_id, group_id);
create unique index if not exists idx_field_plantings_group_individual
  on public.field_plantings (user_id, group_id, individual_number)
  where individual_number is not null;

create table if not exists public.field_planting_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  planting_id uuid not null references public.field_plantings(id) on delete cascade,
  from_greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null,
  from_parcelle_id uuid references public.parcelles(id) on delete set null,
  to_greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null,
  to_parcelle_id uuid references public.parcelles(id) on delete set null,
  moved_at timestamptz not null default now(),
  notes text not null default '',
  constraint field_planting_moves_from_location_check check (
    (from_greenhouse_table_id is not null and from_parcelle_id is null)
    or (from_greenhouse_table_id is null and from_parcelle_id is not null)
  ),
  constraint field_planting_moves_to_location_check check (
    (to_greenhouse_table_id is not null and to_parcelle_id is null)
    or (to_greenhouse_table_id is null and to_parcelle_id is not null)
  )
);

create index if not exists idx_field_planting_moves_planting
  on public.field_planting_moves (planting_id, moved_at desc);

alter table public.field_planting_moves enable row level security;
drop policy if exists "own_field_planting_moves" on public.field_planting_moves;
create policy "own_field_planting_moves" on public.field_planting_moves
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';