alter table public.field_programs
  add column if not exists treatment_codes text[] not null default '{}';

create index if not exists idx_field_programs_treatment_codes
  on public.field_programs using gin (treatment_codes);

comment on column public.field_programs.treatment_codes is
  'Codes normalisés issus de fieldLabels.ts ; product_name reste le libellé affiché.';

notify pgrst, 'reload schema';