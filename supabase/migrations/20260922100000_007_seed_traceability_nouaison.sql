-- 009 — Traçabilité complète des graines et suivi nouaison
-- Chaque graine est une ligne autonome, liée à son fruit, son croisement et son emplacement.

alter table public.cross_fruits
  add column if not exists harvest_year integer,
  add column if not exists greenhouse_id uuid references public.greenhouses(id) on delete set null,
  add column if not exists greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null;

alter table public.harvested_seeds
  add column if not exists cross_id uuid references public.crosses(id) on delete cascade;

create index if not exists idx_harvested_seeds_cross on public.harvested_seeds(cross_id);

-- Synchronise automatiquement le nombre de graines saisi sur le fruit.
create or replace function public.sync_harvested_seeds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seed_year integer := coalesce(new.harvest_year, extract(year from now())::integer);
begin
  delete from public.harvested_seeds
  where fruit_id = new.id and seed_number > greatest(new.seed_count, 0);

  if new.seed_count > 0 then
    insert into public.harvested_seeds (user_id, fruit_id, cross_id, seed_name, seed_number, harvest_year, status, greenhouse_id, greenhouse_table_id)
    select new.user_id, new.id, new.cross_id,
      regexp_replace(new.fruit_name, '-+$', '') || '-' || seed_year || '-' || n,
      n, seed_year, 'à semer', new.greenhouse_id, new.greenhouse_table_id
    from generate_series(1, new.seed_count) as n
    on conflict (fruit_id, seed_number) do update set
      seed_name = excluded.seed_name,
      harvest_year = excluded.harvest_year,
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

-- La saisie accepte uniquement un entier positif ou zéro.
alter table public.cross_fruits drop constraint if exists cross_fruits_seed_count_check;
alter table public.cross_fruits add constraint cross_fruits_seed_count_check check (seed_count >= 0);

-- Exposition Data API et sécurité propriétaire.
grant select, insert, update, delete on public.harvested_seeds to authenticated;
grant select, insert, update, delete on public.cross_fruits to authenticated;

comment on table public.harvested_seeds is 'Une ligne par graine, code fruit-année-numéro, liée au croisement et à la serre/parcelle.';
comment on column public.cross_fruits.checklist is 'Cases de nouaison: stades, calibres et couleurs.';
comment on table public.greenhouse_tables is 'Parcelles (nom SQL historique greenhouse_tables) rattachées à une serre.';