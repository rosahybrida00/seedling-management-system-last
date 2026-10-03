alter table public.field_programs
  add column if not exists fertilizer_code text;

create index if not exists idx_field_programs_fertilizer_code
  on public.field_programs (fertilizer_code)
  where fertilizer_code is not null;

comment on column public.field_programs.fertilizer_code is
  'Code de la liste fermée des amendements/fertilisants ; notes reste réservé au contexte utilisateur.';

notify pgrst, 'reload schema';