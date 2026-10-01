-- 018 — Détails de l'installation d'une variété dans une serre ou parcelle
alter table public.field_plantings
  add column if not exists plant_count integer not null default 1 check (plant_count > 0),
  add column if not exists soil_type text,
  add column if not exists container_type text;

comment on column public.field_plantings.plant_count is 'Nombre de plants de la variété installés à cet emplacement.';
comment on column public.field_plantings.soil_type is 'Type de sol ou substrat utilisé pour cette installation.';
comment on column public.field_plantings.container_type is 'Contenant utilisé, par exemple pot en terre cuite.';

notify pgrst, 'reload schema';
