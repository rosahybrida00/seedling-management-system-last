-- 017 — Collection personnelle des variétés et semis
create table if not exists public.catalog_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  variety_id uuid references public.varieties(id) on delete cascade,
  seedling_id uuid references public.seedlings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint catalog_collection_one_source check (((variety_id is not null)::int + (seedling_id is not null)::int) = 1),
  constraint catalog_collection_unique_variety unique (user_id, variety_id),
  constraint catalog_collection_unique_seedling unique (user_id, seedling_id)
);

alter table public.catalog_collection enable row level security;
drop policy if exists catalog_collection_own on public.catalog_collection;
create policy catalog_collection_own on public.catalog_collection
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_catalog_collection_user on public.catalog_collection(user_id, created_at desc);
comment on table public.catalog_collection is 'Variétés et semis enregistrés dans la collection personnelle de chaque utilisateur.';

notify pgrst, 'reload schema';
