-- =====================================================================
-- 033 — Agenda Serres & Parcelles : une tâche par plant.
--
-- Avant : une échéance (field_interventions) était partagée par tous les
-- plants d'une zone ; la cocher la marquait faite pour tout le monde.
-- Maintenant :
--   * field_interventions reste l'échéance PLANIFIÉE (une date d'un programme) ;
--   * field_intervention_tasks porte l'exécution PAR PLANT (fait, date,
--     résultat, météo, emplacement au moment du soin) ;
--   * field_interventions.done / done_date deviennent le reflet des tâches
--     (faite quand toutes les tâches le sont) ;
--   * field_program_exclusions retire un plant d'un programme de zone ;
--   * field_suggestions garde les suggestions acceptées ou ignorées ;
--   * field_programs mémorise le modèle de calendrier d'origine et accepte
--     le type « hygiene » (opération sans produit) ;
--   * field_task_history regroupe l'historique par plant et par zone.
--
-- Compatibilité : l'ancienne interface, qui coche l'échéance directement,
-- continue de fonctionner (cocher l'échéance coche toutes ses tâches).
-- Les échéances existantes sont converties en tâches (voir « Reprise »).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. field_programs : type « hygiene » et origine du modèle de calendrier
-- ---------------------------------------------------------------------
alter table public.field_programs drop constraint if exists field_programs_program_type_check;
alter table public.field_programs add constraint field_programs_program_type_check
  check (program_type in ('curatif', 'preventif', 'fertilisation', 'hygiene'));

alter table public.field_programs
  add column if not exists template_id text,
  add column if not exists template_step_id text,
  add column if not exists season_year integer;

alter table public.field_programs drop constraint if exists field_programs_template_origin_check;
alter table public.field_programs add constraint field_programs_template_origin_check
  check (
    (template_id is null and template_step_id is null and season_year is null)
    or (template_id is not null and template_step_id is not null and season_year is not null)
  );

-- Un même pas de calendrier ne s'applique qu'une fois par cible, saison et type.
create unique index if not exists uq_field_programs_template_step
  on public.field_programs (
    user_id, template_id, template_step_id, season_year, program_type,
    (coalesce(planting_id, greenhouse_id, parcelle_id))
  )
  where template_id is not null;

comment on column public.field_programs.template_id is
  'Identifiant du modèle de calendrier (programTemplates.ts) ; null pour un programme saisi à la main.';

-- ---------------------------------------------------------------------
-- 2. Exclusions : un plant retiré d'un programme de zone
-- ---------------------------------------------------------------------
create table if not exists public.field_program_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  program_id uuid not null references public.field_programs(id) on delete cascade,
  planting_id uuid not null references public.field_plantings(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (program_id, planting_id)
);

create index if not exists idx_field_program_exclusions_planting
  on public.field_program_exclusions (planting_id);

alter table public.field_program_exclusions enable row level security;
drop policy if exists "own_field_program_exclusions" on public.field_program_exclusions;
create policy "own_field_program_exclusions" on public.field_program_exclusions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. Tâches par plant
-- ---------------------------------------------------------------------
create table if not exists public.field_intervention_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  intervention_id uuid not null references public.field_interventions(id) on delete cascade,
  planting_id uuid not null references public.field_plantings(id) on delete cascade,
  done boolean not null default false,
  done_date date,
  result text,
  notes text not null default '',
  weather_daily_id uuid references public.weather_daily(id) on delete set null,
  -- Emplacement du plant au moment du soin (il peut être déplacé ensuite).
  greenhouse_table_id uuid references public.greenhouse_tables(id) on delete set null,
  parcelle_id uuid references public.parcelles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (intervention_id, planting_id),
  constraint field_intervention_tasks_done_date_check check (done = (done_date is not null)),
  constraint field_intervention_tasks_result_check check (
    result is null or (done and result in ('amelioration', 'stationnaire', 'echec'))
  ),
  constraint field_intervention_tasks_one_location check (
    greenhouse_table_id is null or parcelle_id is null
  )
);

create index if not exists idx_field_tasks_planting_history
  on public.field_intervention_tasks (planting_id, done_date desc);
create index if not exists idx_field_tasks_intervention
  on public.field_intervention_tasks (intervention_id);
create index if not exists idx_field_tasks_open
  on public.field_intervention_tasks (user_id, planting_id) where done = false;

alter table public.field_intervention_tasks enable row level security;
drop policy if exists "own_field_intervention_tasks" on public.field_intervention_tasks;
create policy "own_field_intervention_tasks" on public.field_intervention_tasks
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. Suggestions (acceptées / ignorées) : alimentées plus tard par le moteur
-- ---------------------------------------------------------------------
create table if not exists public.field_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  greenhouse_id uuid references public.greenhouses(id) on delete cascade,
  parcelle_id uuid references public.parcelles(id) on delete cascade,
  planting_id uuid references public.field_plantings(id) on delete cascade,
  template_id text,
  template_step_id text,
  program_type text not null check (program_type in ('curatif', 'preventif', 'fertilisation', 'hygiene')),
  reason text not null,
  signals jsonb not null default '{}'::jsonb,
  -- Clé stable pour ne jamais proposer deux fois la même suggestion.
  dedupe_key text not null,
  status text not null default 'proposee' check (status in ('proposee', 'acceptee', 'ignoree')),
  program_id uuid references public.field_programs(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, dedupe_key),
  constraint field_suggestions_one_target check (
    num_nonnulls(greenhouse_id, parcelle_id, planting_id) = 1
  ),
  constraint field_suggestions_decided_check check (
    (status = 'proposee' and decided_at is null) or (status <> 'proposee' and decided_at is not null)
  )
);

create index if not exists idx_field_suggestions_pending
  on public.field_suggestions (user_id, created_at desc) where status = 'proposee';

alter table public.field_suggestions enable row level security;
drop policy if exists "own_field_suggestions" on public.field_suggestions;
create policy "own_field_suggestions" on public.field_suggestions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. Fonctions
-- ---------------------------------------------------------------------

-- Plants concernés par un programme : le plant ciblé, ou tous les plants en
-- place de la serre / parcelle, hors exclusions.
create or replace function public.field_program_plantings(p_program_id uuid, p_include_removed boolean default false)
returns table (planting_id uuid)
language sql stable
as $$
  select pl.id
  from public.field_programs pr
  join public.field_plantings pl on pl.user_id = pr.user_id
  where pr.id = p_program_id
    and (p_include_removed or pl.removed_at is null)
    and (
      (pr.planting_id is not null and pl.id = pr.planting_id)
      or (
        pr.planting_id is null and (
          (pr.parcelle_id is not null and pl.parcelle_id = pr.parcelle_id)
          or (pr.greenhouse_id is not null and pl.greenhouse_table_id in (
                select gt.id from public.greenhouse_tables gt where gt.greenhouse_id = pr.greenhouse_id))
        )
      )
    )
    and not exists (
      select 1 from public.field_program_exclusions e
      where e.program_id = pr.id and e.planting_id = pl.id
    );
$$;

-- Garde-fou : une tâche ne relie que des lignes du même utilisateur.
create or replace function public.field_task_integrity()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.field_interventions i where i.id = new.intervention_id and i.user_id = new.user_id) then
    raise exception 'Échéance introuvable pour cet utilisateur' using errcode = '23514';
  end if;
  if not exists (select 1 from public.field_plantings p where p.id = new.planting_id and p.user_id = new.user_id) then
    raise exception 'Plant introuvable pour cet utilisateur' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.field_exclusion_integrity()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.field_programs p where p.id = new.program_id and p.user_id = new.user_id) then
    raise exception 'Programme introuvable pour cet utilisateur' using errcode = '23514';
  end if;
  if not exists (select 1 from public.field_plantings p where p.id = new.planting_id and p.user_id = new.user_id) then
    raise exception 'Plant introuvable pour cet utilisateur' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Crée les tâches d'une échéance. Un plant planté après la date de l'échéance
-- n'est pas concerné. Si l'échéance est déjà faite, les tâches le sont aussi.
create or replace function public.field_create_tasks_for_intervention(p_intervention_id uuid)
returns void
language sql
as $$
  insert into public.field_intervention_tasks
    (user_id, intervention_id, planting_id, done, done_date, result, weather_daily_id, greenhouse_table_id, parcelle_id)
  select i.user_id, i.id, pl.id,
         i.done, case when i.done then coalesce(i.done_date, current_date) end,
         case when i.done then i.result end,
         case when i.done then i.weather_daily_id end,
         case when i.done then pl.greenhouse_table_id end,
         case when i.done then pl.parcelle_id end
  from public.field_interventions i
  cross join lateral public.field_program_plantings(i.program_id) pp
  join public.field_plantings pl on pl.id = pp.planting_id
  where i.id = p_intervention_id
    and (pl.planted_at <= coalesce(i.done_date, i.due_date, current_date))
  on conflict (intervention_id, planting_id) do nothing;
$$;

-- Ajoute à un plant les tâches des échéances à venir ou non faites de ses
-- programmes. Une échéance passée et déjà faite n'est jamais rouverte pour lui.
-- Si une échéance à venir était fermée parce que tous les autres plants l'avaient
-- faite, la nouvelle tâche la rouvre.
create or replace function public.field_add_tasks_for_planting(p_planting_id uuid)
returns void
language sql
as $$
  insert into public.field_intervention_tasks (user_id, intervention_id, planting_id)
  select pl.user_id, i.id, pl.id
  from public.field_plantings pl
  join public.field_interventions i
    on i.user_id = pl.user_id
   and (i.done = false or i.due_date >= current_date)
  where pl.id = p_planting_id
    and pl.removed_at is null
    and pl.planted_at <= coalesce(i.due_date, current_date)
    and exists (
      select 1 from public.field_program_plantings(i.program_id) pp where pp.planting_id = pl.id
    )
  on conflict (intervention_id, planting_id) do nothing;
$$;

-- Reflet des tâches sur l'échéance : faite quand toutes les tâches le sont.
create or replace function public.field_sync_intervention_from_tasks()
returns trigger
language plpgsql
as $$
declare
  v_id uuid := coalesce(new.intervention_id, old.intervention_id);
  v_total integer;
  v_done integer;
  v_last date;
  v_all_done boolean;
begin
  select count(*), count(*) filter (where done), max(done_date) filter (where done)
    into v_total, v_done, v_last
  from public.field_intervention_tasks where intervention_id = v_id;

  if v_total = 0 then
    return null;
  end if;

  v_all_done := (v_done = v_total);
  update public.field_interventions
     set done = v_all_done,
         done_date = case when v_all_done then v_last else null end
   where id = v_id
     and (done is distinct from v_all_done
          or done_date is distinct from (case when v_all_done then v_last else null end));
  return null;
end;
$$;

-- Compatibilité avec l'ancienne interface : cocher ou rouvrir l'échéance
-- directement applique le changement à toutes ses tâches.
create or replace function public.field_apply_intervention_done_to_tasks()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if new.done then
    update public.field_intervention_tasks t
       set done = true,
           done_date = coalesce(new.done_date, current_date),
           result = new.result,
           weather_daily_id = new.weather_daily_id,
           greenhouse_table_id = pl.greenhouse_table_id,
           parcelle_id = pl.parcelle_id
      from public.field_plantings pl
     where t.intervention_id = new.id and t.done = false and pl.id = t.planting_id;
  else
    update public.field_intervention_tasks
       set done = false, done_date = null, result = null
     where intervention_id = new.id and done = true;
  end if;
  return null;
end;
$$;

-- Nouvelle échéance : une tâche par plant concerné.
create or replace function public.field_on_intervention_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.field_create_tasks_for_intervention(new.id);
  return null;
end;
$$;

-- Nouveau plant, plant déplacé ou retiré : ajuster ses tâches non faites.
create or replace function public.field_on_planting_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    delete from public.field_intervention_tasks t
     using public.field_interventions i
     where t.planting_id = new.id
       and t.done = false
       and i.id = t.intervention_id
       and not exists (
         select 1 from public.field_program_plantings(i.program_id) pp where pp.planting_id = new.id
       );
  end if;
  perform public.field_add_tasks_for_planting(new.id);
  return null;
end;
$$;

-- Exclusion ajoutée : supprimer les tâches non faites du plant pour ce programme.
create or replace function public.field_on_exclusion_insert()
returns trigger
language plpgsql
as $$
begin
  delete from public.field_intervention_tasks t
   using public.field_interventions i
   where t.planting_id = new.planting_id
     and t.done = false
     and i.id = t.intervention_id
     and i.program_id = new.program_id;
  return null;
end;
$$;

-- Exclusion levée : le plant retrouve les tâches des échéances ouvertes.
create or replace function public.field_on_exclusion_delete()
returns trigger
language plpgsql
as $$
begin
  perform public.field_add_tasks_for_planting(old.planting_id);
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Reprise des échéances existantes (avant la création des déclencheurs)
-- ---------------------------------------------------------------------
-- Échéances faites : chaque plant concerné à l'époque reçoit une tâche faite,
-- avec la date, le résultat et la météo déjà enregistrés. Les plants plantés
-- après la date, ou retirés avant, sont ignorés.
-- Échéances ouvertes : une tâche ouverte par plant actuellement concerné.
insert into public.field_intervention_tasks
  (user_id, intervention_id, planting_id, done, done_date, result, weather_daily_id, greenhouse_table_id, parcelle_id)
select i.user_id, i.id, pl.id,
       i.done,
       case when i.done then coalesce(i.done_date, i.due_date, i.created_at::date) end,
       case when i.done then i.result end,
       case when i.done then i.weather_daily_id end,
       case when i.done then pl.greenhouse_table_id end,
       case when i.done then pl.parcelle_id end
from public.field_interventions i
cross join lateral public.field_program_plantings(i.program_id, i.done) pp
join public.field_plantings pl on pl.id = pp.planting_id
where pl.planted_at <= coalesce(i.done_date, i.due_date, i.created_at::date)
  and (not i.done or pl.removed_at is null or pl.removed_at >= coalesce(i.done_date, i.due_date, i.created_at::date))
on conflict (intervention_id, planting_id) do nothing;

-- ---------------------------------------------------------------------
-- 7. Déclencheurs
-- ---------------------------------------------------------------------
drop trigger if exists trg_field_task_integrity on public.field_intervention_tasks;
create trigger trg_field_task_integrity
  before insert or update of intervention_id, planting_id, user_id on public.field_intervention_tasks
  for each row execute function public.field_task_integrity();

drop trigger if exists trg_field_exclusion_integrity on public.field_program_exclusions;
create trigger trg_field_exclusion_integrity
  before insert or update of program_id, planting_id, user_id on public.field_program_exclusions
  for each row execute function public.field_exclusion_integrity();

drop trigger if exists trg_field_tasks_sync_intervention on public.field_intervention_tasks;
create trigger trg_field_tasks_sync_intervention
  after insert or update of done, done_date or delete on public.field_intervention_tasks
  for each row execute function public.field_sync_intervention_from_tasks();

drop trigger if exists trg_field_intervention_done_to_tasks on public.field_interventions;
create trigger trg_field_intervention_done_to_tasks
  after update of done on public.field_interventions
  for each row when (new.done is distinct from old.done)
  execute function public.field_apply_intervention_done_to_tasks();

drop trigger if exists trg_field_intervention_insert on public.field_interventions;
create trigger trg_field_intervention_insert
  after insert on public.field_interventions
  for each row execute function public.field_on_intervention_insert();

drop trigger if exists trg_field_planting_tasks on public.field_plantings;
create trigger trg_field_planting_tasks
  after insert or update of greenhouse_table_id, parcelle_id, removed_at on public.field_plantings
  for each row execute function public.field_on_planting_change();

drop trigger if exists trg_field_exclusion_insert on public.field_program_exclusions;
create trigger trg_field_exclusion_insert
  after insert on public.field_program_exclusions
  for each row execute function public.field_on_exclusion_insert();

drop trigger if exists trg_field_exclusion_delete on public.field_program_exclusions;
create trigger trg_field_exclusion_delete
  after delete on public.field_program_exclusions
  for each row execute function public.field_on_exclusion_delete();

-- ---------------------------------------------------------------------
-- 8. Historique par plant et par zone
-- ---------------------------------------------------------------------
create or replace view public.field_task_history
with (security_invoker = true) as
select
  t.id as task_id,
  t.user_id,
  t.planting_id,
  t.intervention_id,
  pr.id as program_id,
  pr.program_type,
  pr.product_name,
  pr.treatment_codes,
  pr.fertilizer_code,
  pr.template_id,
  pr.template_step_id,
  i.due_date,
  t.done,
  t.done_date,
  t.result,
  t.notes,
  w.temperature,
  w.humidity,
  w.uv_index,
  coalesce(t.greenhouse_table_id, pl.greenhouse_table_id) as greenhouse_table_id,
  gt.greenhouse_id,
  coalesce(t.parcelle_id, pl.parcelle_id) as parcelle_id
from public.field_intervention_tasks t
join public.field_interventions i on i.id = t.intervention_id
join public.field_programs pr on pr.id = i.program_id
join public.field_plantings pl on pl.id = t.planting_id
left join public.weather_daily w on w.id = t.weather_daily_id
left join public.greenhouse_tables gt on gt.id = coalesce(t.greenhouse_table_id, pl.greenhouse_table_id);

grant select on public.field_task_history to authenticated;

comment on view public.field_task_history is
  'Historique des soins : une ligne par plant et par échéance. Filtrer par planting_id (fiche plant) ou par greenhouse_id / parcelle_id (zone).';

notify pgrst, 'reload schema';
