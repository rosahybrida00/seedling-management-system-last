-- =====================================================================
-- 015 — Intégrité et indexation RAG des relevés d'Observatoire terrain.
-- `field_observations` (les deux modes : plantation et observatoire)
-- est désormais créée par la migration 012 ; cette migration ne porte
-- plus que ce qui lui est propre : le trigger d'intégrité et la vue RAG.
-- =====================================================================

create or replace function public.validate_field_observation_integrity()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  -- Un relevé de plantation (page Parcelle) n'a pas de météo à vérifier ici.
  if new.planting_id is not null and new.weather_daily_id is null then
    return new;
  end if;
  if new.weather_daily_id is not null and not exists (
       select 1 from public.weather_daily w
       where w.id = new.weather_daily_id
         and w.user_id = new.user_id
         and w.date = new.observation_date) then
    raise exception 'La météo historique doit appartenir à l''utilisateur et correspondre à la date d''observation';
  end if;
  if new.parcelle_id is not null and not exists (
       select 1 from public.parcelles p where p.id = new.parcelle_id and p.user_id = new.user_id) then
    raise exception 'La parcelle doit appartenir au même utilisateur';
  end if;
  return new;
end; $$;

drop trigger if exists field_observations_integrity on public.field_observations;
create trigger field_observations_integrity before insert or update on public.field_observations for each row execute function public.validate_field_observation_integrity();

create or replace view public.rag_field_observation_chain with (security_invoker = true) as
select f.id, f.user_id, f.observation_date, f.intervention_date, f.observations, f.notes, f.intervention_passes, f.intervention_result,
       f.seedling_id, f.variety_id, f.greenhouse_id, f.parcelle_id, f.weather_daily_id
from public.field_observations f
where f.planting_id is null;
grant select on public.rag_field_observation_chain to authenticated;

comment on view public.rag_field_observation_chain is 'Chaînage propre des relevés d''Observatoire terrain pour le futur RAG agronomique (exclut les relevés de plantation).';
