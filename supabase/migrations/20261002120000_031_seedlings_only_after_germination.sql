alter table public.harvested_seeds
  add column if not exists germination_date date;

update public.harvested_seeds harvested
set status = 'germinated',
    germination_date = coalesce(harvested.germination_date, seedling.germination_date)
from public.seedlings seedling
where seedling.fruit_id = harvested.fruit_id
  and seedling.seed_code = harvested.seed_name
  and seedling.status in ('Germé', 'Repiqué', 'En croissance', 'Floraison', 'Retenu', 'Écarté', 'Mort');

create or replace function public.sync_harvested_seeds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_name text := regexp_replace(new.fruit_name, '-+$', '');
  v_harvest_year integer := coalesce(new.harvest_year, extract(year from now())::integer);
begin
  delete from public.harvested_seeds
  where fruit_id = new.id
    and seed_number > greatest(new.seed_count, 0)
    and germination_date is null
    and status <> 'germinated';

  if new.seed_count > 0 then
    insert into public.harvested_seeds (
      user_id, fruit_id, cross_id, seed_name, seed_number, harvest_year,
      status, greenhouse_id, greenhouse_table_id
    )
    select
      new.user_id, new.id, new.cross_id,
      v_clean_name || '-' || seed_number || '-' || v_harvest_year,
      seed_number, v_harvest_year, 'à semer', new.greenhouse_id, new.greenhouse_table_id
    from generate_series(1, new.seed_count) as seed_number
    on conflict (fruit_id, seed_number) do update set
      seed_name = excluded.seed_name,
      cross_id = excluded.cross_id,
      harvest_year = excluded.harvest_year,
      greenhouse_id = excluded.greenhouse_id,
      greenhouse_table_id = excluded.greenhouse_table_id;

    insert into public.sowing_batches (
      user_id, cross_id, fruit_id, fruit_code, sowing_date, seed_count,
      original_seed_count, table_id
    )
    values (
      new.user_id, new.cross_id, new.id, v_clean_name,
      coalesce(new.harvest_date, current_date), new.seed_count,
      new.seed_count, new.greenhouse_table_id
    )
    on conflict (fruit_id) where fruit_id is not null do update set
      seed_count = greatest(public.sowing_batches.seed_count, excluded.seed_count),
      original_seed_count = greatest(public.sowing_batches.original_seed_count, excluded.original_seed_count),
      table_id = excluded.table_id,
      sowing_date = excluded.sowing_date;
  else
    delete from public.harvested_seeds
    where fruit_id = new.id and germination_date is null and status <> 'germinated';
    delete from public.sowing_batches
    where fruit_id = new.id
      and not exists (
        select 1 from public.harvested_seeds harvested
        where harvested.fruit_id = new.id and harvested.status = 'germinated'
      );
  end if;

  return new;
end;
$$;

create or replace function public.mark_seed_germinated(
  p_seed_id uuid,
  p_germination_date date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  seed_row public.harvested_seeds%rowtype;
  batch_row public.sowing_batches%rowtype;
  seedling_id uuid;
begin
  select * into seed_row
  from public.harvested_seeds
  where id = p_seed_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Graine introuvable ou accès refusé';
  end if;

  select * into batch_row
  from public.sowing_batches
  where fruit_id = seed_row.fruit_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Le lot de cette graine est introuvable';
  end if;

  if batch_row.table_id is null and batch_row.parcelle_id is null then
    raise exception 'Affectez d’abord le lot à une serre/table ou une parcelle';
  end if;

  update public.harvested_seeds
  set status = 'germinated', germination_date = p_germination_date
  where id = seed_row.id;

  insert into public.seedlings (
    user_id, cross_id, fruit_id, batch_id, fruit_code, seed_code, code,
    table_id, sowing_date, germination_date, status
  )
  values (
    seed_row.user_id, batch_row.cross_id, seed_row.fruit_id, batch_row.id,
    batch_row.fruit_code, seed_row.seed_name, seed_row.seed_name,
    batch_row.table_id, batch_row.sowing_date::date, p_germination_date, 'Germé'
  )
  on conflict (user_id, seed_code) where seed_code is not null do update set
    fruit_id = excluded.fruit_id,
    batch_id = excluded.batch_id,
    fruit_code = excluded.fruit_code,
    table_id = excluded.table_id,
    germination_date = excluded.germination_date,
    status = 'Germé'
  returning id into seedling_id;

  insert into public.field_plantings (
    user_id, seedling_id, greenhouse_table_id, parcelle_id, planted_at,
    plant_count, location_type, container_type, group_id, individual_number
  )
  values (
    seed_row.user_id, seedling_id, batch_row.table_id, batch_row.parcelle_id,
    p_germination_date, 1, batch_row.location_type,
    case when batch_row.location_type = 'pot' then 'Terreau' else null end,
    batch_row.id, seed_row.seed_number
  )
  on conflict (user_id, group_id, individual_number)
    where individual_number is not null do nothing;

  return seedling_id;
end;
$$;

revoke all on function public.mark_seed_germinated(uuid, date) from public;
grant execute on function public.mark_seed_germinated(uuid, date) to authenticated;

notify pgrst, 'reload schema';