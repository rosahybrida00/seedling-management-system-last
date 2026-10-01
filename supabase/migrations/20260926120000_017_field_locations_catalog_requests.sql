-- 016 — Gestion des emplacements et demandes de catalogue
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
  user_id uuid references auth.users(id) on delete cascade,
  alert_type text not null default 'catalog_request',
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.catalog_variety_requests enable row level security;
alter table public.admin_alerts enable row level security;

drop policy if exists catalog_variety_requests_own on public.catalog_variety_requests;
create policy catalog_variety_requests_own on public.catalog_variety_requests
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists admin_alerts_own on public.admin_alerts;
create policy admin_alerts_own on public.admin_alerts
  for select to authenticated using (auth.uid() = user_id);

create index if not exists idx_catalog_variety_requests_status on public.catalog_variety_requests(status, created_at desc);
create index if not exists idx_admin_alerts_user on public.admin_alerts(user_id, is_read, created_at desc);

comment on table public.catalog_variety_requests is 'Demandes de variété manquante ou inconnue à traiter par un administrateur.';
comment on table public.admin_alerts is 'Alertes adressées aux administrateurs ou au propriétaire de la demande.';
