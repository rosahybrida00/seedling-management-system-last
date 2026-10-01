-- =====================================================================
-- 015 — Agenda réel pour les programmes (fini le compteur de passages
--        rigide) : chaque intervention prévue ou faite est une ligne
--        datée, cochable en un tap, qui alimente l'agenda individuel du
--        plant et le statut de couleur (vert/orange/rouge) des zones.
-- =====================================================================

create table if not exists public.field_interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  program_id uuid not null references public.field_programs(id) on delete cascade,
  due_date date,
  done boolean not null default false,
  done_date date,
  result text check (result in ('amelioration', 'stationnaire', 'echec')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_field_interventions_program on public.field_interventions (program_id);
create index if not exists idx_field_interventions_due on public.field_interventions (due_date) where done = false;

alter table public.field_interventions enable row level security;
drop policy if exists "own_field_interventions" on public.field_interventions;
create policy "own_field_interventions" on public.field_interventions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.field_interventions is 'Agenda réel des programmes : une ligne par intervention prévue ou réalisée, remplace le compteur rigide field_programs.intervention_count pour l''affichage en fil chronologique.';
