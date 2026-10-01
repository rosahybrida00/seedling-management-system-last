-- Field placements, typed greenhouses, catalog suggestions and admin alerts.
alter table public.greenhouses add column if not exists greenhouse_type text not null default 'froide' check (greenhouse_type in ('chaude','froide'));

create table if not exists public.field_placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  parcelle_id uuid references public.parcelles(id) on delete cascade,
  variety_id uuid references public.varieties(id) on delete set null,
  seedling_id uuid references public.seedlings(id) on delete cascade,
  planted_on date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint field_placements_location_check check ((greenhouse_id is not null) <> (parcelle_id is not null)),
  constraint field_placements_subject_check check ((variety_id is not null) <> (seedling_id is not null))
);
alter table public.field_placements enable row level security;
create policy field_placements_own on public.field_placements for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.catalog_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'unknown',
  context text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);
alter table public.catalog_suggestions enable row level security;
create policy catalog_suggestions_own on public.catalog_suggestions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_catalog_suggestions_status on public.catalog_suggestions(status, created_at desc);

create table if not exists public.admin_catalog_alerts (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.catalog_suggestions(id) on delete cascade,
  alert_type text not null default 'new_catalog_suggestion',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.admin_catalog_alerts enable row level security;

create or replace function public.create_catalog_alert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_catalog_alerts (suggestion_id) values (new.id);
  return new;
end; $$;

drop trigger if exists catalog_suggestion_alert on public.catalog_suggestions;
create trigger catalog_suggestion_alert after insert on public.catalog_suggestions for each row execute function public.create_catalog_alert();

comment on table public.catalog_suggestions is 'Suggestions de variétés manquantes, à traiter par un administrateur.';
comment on table public.admin_catalog_alerts is 'Alertes générées automatiquement pour les nouvelles suggestions catalogue.';

create or replace view public.rag_field_placement_chain with (security_invoker = true) as
select p.id, p.user_id, p.planted_on, p.notes, p.greenhouse_id, p.parcelle_id, p.variety_id, p.seedling_id
from public.field_placements p;

grant select on public.rag_field_placement_chain to authenticated;
grant insert, select on public.field_placements to authenticated;
grant insert, select, update, delete on public.catalog_suggestions to authenticated;

revoke all on public.admin_catalog_alerts from anon;
revoke all on public.admin_catalog_alerts from authenticated;
revoke all on public.rag_field_placement_chain from anon;

grant select on public.rag_field_placement_chain to authenticated;

CREATE POLICY catalog_suggestions_insert_own ON public.catalog_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY catalog_suggestions_select_own ON public.catalog_suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY catalog_suggestions_update_own ON public.catalog_suggestions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY catalog_suggestions_delete_own ON public.catalog_suggestions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY field_placements_select_own ON public.field_placements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY field_placements_insert_own ON public.field_placements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY field_placements_update_own ON public.field_placements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY field_placements_delete_own ON public.field_placements FOR DELETE TO authenticated USING (auth.uid() = user_id);

create or replace function public.validate_field_placement_owner()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.greenhouse_id is not null and not exists (select 1 from public.greenhouses g where g.id = new.greenhouse_id and g.user_id = new.user_id) then
    raise exception 'Unauthorized greenhouse';
  end if;
  if new.parcelle_id is not null and not exists (select 1 from public.parcelles p where p.id = new.parcelle_id and p.user_id = new.user_id) then
    raise exception 'Unauthorized parcelle';
  end if;
  return new;
end; $$;

drop trigger if exists field_placement_owner on public.field_placements;
create trigger field_placement_owner before insert or update on public.field_placements for each row execute function public.validate_field_placement_owner();

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
