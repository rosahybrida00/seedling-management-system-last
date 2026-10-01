-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP TYPE public.gtrgm;

CREATE TYPE public.gtrgm (
	INPUT = gtrgm_in,
	OUTPUT = gtrgm_out,
	ALIGNMENT = 4,
	STORAGE = plain,
	CATEGORY = U,
	DELIMITER = ',');

-- DROP SEQUENCE public.rose_classes_id_seq;

CREATE SEQUENCE public.rose_classes_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 32767
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.rose_classes_id_seq OWNER TO postgres;
GRANT ALL ON SEQUENCE public.rose_classes_id_seq TO postgres;
GRANT ALL ON SEQUENCE public.rose_classes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.rose_classes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.rose_classes_id_seq TO service_role;

-- DROP SEQUENCE public.varieties_photos_id_seq;

CREATE SEQUENCE public.varieties_photos_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE public.varieties_photos_id_seq OWNER TO postgres;
GRANT ALL ON SEQUENCE public.varieties_photos_id_seq TO postgres;
GRANT ALL ON SEQUENCE public.varieties_photos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.varieties_photos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.varieties_photos_id_seq TO service_role;
-- public.cross_lots definition

-- Drop table

-- DROP TABLE public.cross_lots;

CREATE TABLE public.cross_lots ( id uuid DEFAULT uuid_generate_v4() NOT NULL, cross_program_id uuid NULL, letter text NOT NULL, seed_count int4 DEFAULT 0 NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT cross_lots_pkey PRIMARY KEY (id));
ALTER TABLE public.cross_lots ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.cross_lots OWNER TO postgres;
GRANT ALL ON TABLE public.cross_lots TO postgres;
GRANT ALL ON TABLE public.cross_lots TO anon;
GRANT ALL ON TABLE public.cross_lots TO authenticated;
GRANT ALL ON TABLE public.cross_lots TO service_role;


-- public.crossing_reports definition

-- Drop table

-- DROP TABLE public.crossing_reports;

CREATE TABLE public.crossing_reports ( id uuid DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, registration_date timestamptz NOT NULL, flower_count int4 DEFAULT 0 NULL, pollination_date timestamptz NOT NULL, "program" text NOT NULL, follow_up text DEFAULT 'Aucun suivi complémentaire'::text NULL, pollination_reliability text DEFAULT 'Fiable'::text NULL, pollen_type text DEFAULT 'Frais'::text NULL, storage_days int4 DEFAULT 0 NULL, fruit_quality text DEFAULT 'Moyen'::text NULL, sterility_level text DEFAULT 'Faible'::text NULL, seed_parent_variety text DEFAULT 'Non renseigné'::text NULL, auto_pollination_date timestamptz NULL, abortion_date timestamptz NULL, fruit_harvested bool DEFAULT false NULL, seed_count int4 DEFAULT 0 NULL, fruit_color text DEFAULT 'Non renseigné'::text NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT crossing_reports_pkey PRIMARY KEY (id));
ALTER TABLE public.crossing_reports ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create crossing_reports" ON public.crossing_reports
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete crossing_reports" ON public.crossing_reports
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read crossing_reports" ON public.crossing_reports
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update crossing_reports" ON public.crossing_reports
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY crossing_reports_insert_public ON public.crossing_reports
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK (true);
CREATE POLICY crossing_reports_select_public ON public.crossing_reports
 AS PERMISSIVE
 FOR SELECT
 USING (true);

-- Permissions

ALTER TABLE public.crossing_reports OWNER TO postgres;
GRANT ALL ON TABLE public.crossing_reports TO postgres;
GRANT ALL ON TABLE public.crossing_reports TO anon;
GRANT ALL ON TABLE public.crossing_reports TO authenticated;
GRANT ALL ON TABLE public.crossing_reports TO service_role;


-- public.rosa_hybrida definition

-- Drop table

-- DROP TABLE public.rosa_hybrida;

CREATE TABLE public.rosa_hybrida ( id uuid DEFAULT gen_random_uuid() NOT NULL, nom_commercial varchar(255) NOT NULL, nom_enregistrement varchar(255) NULL, obtenteur varchar(255) NULL, type_de_rosier varchar(255) NULL, port varchar(255) NULL, floraison varchar(255) NULL, nombre_petale varchar(100) NULL, diametre_fleur float8 NULL, couleur varchar(255) NULL, hauteur float8 NULL, largeur float8 NULL, feuillage varchar(255) NULL, vigueur varchar(100) NULL, parfum varchar(100) NULL, resistance_maladies jsonb NULL, rusticite varchar(50) NULL, prix text NULL, photo_url text NULL, created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL, CONSTRAINT rosa_hybrida_nom_commercial_key UNIQUE (nom_commercial), CONSTRAINT rosa_hybrida_pkey PRIMARY KEY (id));
ALTER TABLE public.rosa_hybrida ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create rosa_hybrida" ON public.rosa_hybrida
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rosa_hybrida" ON public.rosa_hybrida
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read rosa_hybrida" ON public.rosa_hybrida
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update rosa_hybrida" ON public.rosa_hybrida
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY "Permettre l'insertion par authentification" ON public.rosa_hybrida
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK (true);
CREATE POLICY "Permettre la lecture publique" ON public.rosa_hybrida
 AS PERMISSIVE
 FOR SELECT
 USING (true);

-- Permissions

ALTER TABLE public.rosa_hybrida OWNER TO postgres;
GRANT ALL ON TABLE public.rosa_hybrida TO postgres;
GRANT ALL ON TABLE public.rosa_hybrida TO anon;
GRANT ALL ON TABLE public.rosa_hybrida TO authenticated;
GRANT ALL ON TABLE public.rosa_hybrida TO service_role;


-- public.rose_classes definition

-- Drop table

-- DROP TABLE public.rose_classes;

CREATE TABLE public.rose_classes ( id int2 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START 1 CACHE 1 NO CYCLE) NOT NULL, "name" text NOT NULL, CONSTRAINT rose_classes_name_key UNIQUE (name), CONSTRAINT rose_classes_pkey PRIMARY KEY (id));
ALTER TABLE public.rose_classes ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.rose_classes OWNER TO postgres;
GRANT ALL ON TABLE public.rose_classes TO postgres;
GRANT ALL ON TABLE public.rose_classes TO anon;
GRANT ALL ON TABLE public.rose_classes TO authenticated;
GRANT ALL ON TABLE public.rose_classes TO service_role;


-- public.rose_varieties definition

-- Drop table

-- DROP TABLE public.rose_varieties;

CREATE TABLE public.rose_varieties ( id uuid DEFAULT gen_random_uuid() NOT NULL, variety_name text NOT NULL, botanical_name text NULL, breeder_code text NULL, rose_class_id int2 NULL, rose_class_raw text NULL, bloom_period text NULL, bloom_start_month int2 NULL, bloom_end_month int2 NULL, description_short text NULL, description_long text NULL, habit_foliage text NULL, flower_color text NULL, fragrance_level text NULL, petal_count int4 NULL, disease_resistance text NULL, parent_seed_id uuid NULL, parent_pollen_id uuid NULL, ploidy int2 NULL, is_hybridization_candidate bool DEFAULT true NULL, image_url text NULL, source_url text NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT rose_varieties_pkey PRIMARY KEY (id), CONSTRAINT rose_varieties_source_url_key UNIQUE (source_url), CONSTRAINT rose_varieties_parent_pollen_id_fkey FOREIGN KEY (parent_pollen_id) REFERENCES public.rose_varieties(id), CONSTRAINT rose_varieties_parent_seed_id_fkey FOREIGN KEY (parent_seed_id) REFERENCES public.rose_varieties(id), CONSTRAINT rose_varieties_rose_class_id_fkey FOREIGN KEY (rose_class_id) REFERENCES public.rose_classes(id));
CREATE INDEX idx_rose_varieties_bloom ON public.rose_varieties USING btree (bloom_start_month, bloom_end_month);
CREATE INDEX idx_rose_varieties_class ON public.rose_varieties USING btree (rose_class_id);
CREATE INDEX idx_rose_varieties_name_trgm ON public.rose_varieties USING gin (variety_name gin_trgm_ops);

-- Table Triggers

create trigger trg_rose_varieties_updated before
update
    on
    public.rose_varieties for each row execute function set_updated_at();
ALTER TABLE public.rose_varieties ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.rose_varieties OWNER TO postgres;
GRANT ALL ON TABLE public.rose_varieties TO postgres;
GRANT ALL ON TABLE public.rose_varieties TO anon;
GRANT ALL ON TABLE public.rose_varieties TO authenticated;
GRANT ALL ON TABLE public.rose_varieties TO service_role;


-- public.seeds definition

-- Drop table

-- DROP TABLE public.seeds;

CREATE TABLE public.seeds ( id uuid DEFAULT uuid_generate_v4() NOT NULL, lot_id uuid NULL, identity_code text NOT NULL, seed_number int4 NOT NULL, status text DEFAULT 'en_attente'::text NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT seeds_pkey PRIMARY KEY (id), CONSTRAINT seeds_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.cross_lots(id) ON DELETE CASCADE);
ALTER TABLE public.seeds ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.seeds OWNER TO postgres;
GRANT ALL ON TABLE public.seeds TO postgres;
GRANT ALL ON TABLE public.seeds TO anon;
GRANT ALL ON TABLE public.seeds TO authenticated;
GRANT ALL ON TABLE public.seeds TO service_role;


-- public.timeline_events definition

-- Drop table

-- DROP TABLE public.timeline_events;

CREATE TABLE public.timeline_events ( id uuid DEFAULT uuid_generate_v4() NOT NULL, cross_program_id uuid NULL, cross_lot_id uuid NULL, seed_id uuid NULL, event_type text NOT NULL, event_date date NOT NULL, title text NOT NULL, description text NULL, metadata jsonb NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT timeline_events_pkey PRIMARY KEY (id), CONSTRAINT timeline_events_cross_lot_id_fkey FOREIGN KEY (cross_lot_id) REFERENCES public.cross_lots(id) ON DELETE CASCADE, CONSTRAINT timeline_events_seed_id_fkey FOREIGN KEY (seed_id) REFERENCES public.seeds(id) ON DELETE CASCADE);
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.timeline_events OWNER TO postgres;
GRANT ALL ON TABLE public.timeline_events TO postgres;
GRANT ALL ON TABLE public.timeline_events TO anon;
GRANT ALL ON TABLE public.timeline_events TO authenticated;
GRANT ALL ON TABLE public.timeline_events TO service_role;


-- public.admin_alerts definition

-- Drop table

-- DROP TABLE public.admin_alerts;

CREATE TABLE public.admin_alerts ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NULL, alert_type text DEFAULT 'catalog_request'::text NOT NULL, title text NOT NULL, payload jsonb DEFAULT '{}'::jsonb NOT NULL, is_read bool DEFAULT false NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT admin_alerts_pkey PRIMARY KEY (id));
CREATE INDEX idx_admin_alerts_user ON public.admin_alerts USING btree (user_id, is_read, created_at DESC);
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY admin_alerts_insert_own ON public.admin_alerts
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY admin_alerts_own ON public.admin_alerts
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.admin_alerts OWNER TO postgres;
GRANT ALL ON TABLE public.admin_alerts TO postgres;
GRANT ALL ON TABLE public.admin_alerts TO anon;
GRANT ALL ON TABLE public.admin_alerts TO authenticated;
GRANT ALL ON TABLE public.admin_alerts TO service_role;


-- public.catalog_collection definition

-- Drop table

-- DROP TABLE public.catalog_collection;

CREATE TABLE public.catalog_collection ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, variety_id uuid NULL, seedling_id uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT catalog_collection_one_source CHECK (((((variety_id IS NOT NULL))::integer + ((seedling_id IS NOT NULL))::integer) = 1)), CONSTRAINT catalog_collection_pkey PRIMARY KEY (id), CONSTRAINT catalog_collection_unique_seedling UNIQUE (user_id, seedling_id), CONSTRAINT catalog_collection_unique_variety UNIQUE (user_id, variety_id));
CREATE INDEX idx_catalog_collection_user ON public.catalog_collection USING btree (user_id, created_at DESC);
ALTER TABLE public.catalog_collection ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY catalog_collection_own ON public.catalog_collection
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.catalog_collection OWNER TO postgres;
GRANT ALL ON TABLE public.catalog_collection TO postgres;
GRANT ALL ON TABLE public.catalog_collection TO anon;
GRANT ALL ON TABLE public.catalog_collection TO authenticated;
GRANT ALL ON TABLE public.catalog_collection TO service_role;


-- public.catalog_variety_requests definition

-- Drop table

-- DROP TABLE public.catalog_variety_requests;

CREATE TABLE public.catalog_variety_requests ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, requested_name text NOT NULL, "source" text DEFAULT 'user'::text NOT NULL, context text DEFAULT ''::text NOT NULL, status text DEFAULT 'pending'::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT catalog_variety_requests_pkey PRIMARY KEY (id), CONSTRAINT catalog_variety_requests_requested_name_check CHECK (((length(TRIM(BOTH FROM requested_name)) >= 2) AND (length(TRIM(BOTH FROM requested_name)) <= 160))), CONSTRAINT catalog_variety_requests_source_check CHECK ((source = ANY (ARRAY['user'::text, 'unknown_variety'::text]))), CONSTRAINT catalog_variety_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))));
CREATE INDEX idx_catalog_variety_requests_status ON public.catalog_variety_requests USING btree (status, created_at DESC);
ALTER TABLE public.catalog_variety_requests ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY catalog_variety_requests_own ON public.catalog_variety_requests
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.catalog_variety_requests OWNER TO postgres;
GRANT ALL ON TABLE public.catalog_variety_requests TO postgres;
GRANT ALL ON TABLE public.catalog_variety_requests TO anon;
GRANT ALL ON TABLE public.catalog_variety_requests TO authenticated;
GRANT ALL ON TABLE public.catalog_variety_requests TO service_role;


-- public.cross_fruits definition

-- Drop table

-- DROP TABLE public.cross_fruits;

CREATE TABLE public.cross_fruits ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, cross_id uuid NOT NULL, fruit_name text NOT NULL, flower_index int4 NOT NULL, status text DEFAULT 'suivi'::text NOT NULL, checklist jsonb DEFAULT '{}'::jsonb NOT NULL, climate_data jsonb DEFAULT '{}'::jsonb NOT NULL, sensor_data jsonb DEFAULT '{}'::jsonb NOT NULL, seed_count int4 DEFAULT 0 NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, harvest_year int4 NULL, greenhouse_id uuid NULL, greenhouse_table_id uuid NULL, harvest_date date NULL, fruit_calibre text NULL, maturation text NULL, seed_extraction text NULL, failure_causes _text DEFAULT '{}'::text[] NOT NULL, CONSTRAINT cross_fruits_calibre_check CHECK (((fruit_calibre IS NULL) OR (fruit_calibre = ANY (ARRAY['bien_developpe'::text, 'atrophie'::text])))), CONSTRAINT cross_fruits_cross_id_flower_index_key UNIQUE (cross_id, flower_index), CONSTRAINT cross_fruits_extraction_check CHECK (((seed_extraction IS NULL) OR (seed_extraction = ANY (ARRAY['plein'::text, 'partiellement_vide'::text, 'totalement_vide'::text])))), CONSTRAINT cross_fruits_flower_index_check CHECK ((flower_index > 0)), CONSTRAINT cross_fruits_maturation_check CHECK (((maturation IS NULL) OR (maturation = ANY (ARRAY['optimale'::text, 'precoce_forcee'::text])))), CONSTRAINT cross_fruits_pkey PRIMARY KEY (id), CONSTRAINT cross_fruits_seed_count_check CHECK ((seed_count >= 0)), CONSTRAINT cross_fruits_status_check2 CHECK ((status = ANY (ARRAY['suivi'::text, 'récolté'::text, 'vide'::text, 'avorté'::text]))));
CREATE INDEX idx_cross_fruits_cross ON public.cross_fruits USING btree (cross_id);
COMMENT ON TABLE public.cross_fruits IS 'Un fruit par fleur pollinisée du lot. Voie A (récolte) renseigne seed_count/harvest_date/fruit_calibre/maturation/seed_extraction. Voie B (échec) renseigne failure_causes.';

-- Column comments

COMMENT ON COLUMN public.cross_fruits.checklist IS 'Cases de nouaison: stades, calibres et couleurs.';
COMMENT ON COLUMN public.cross_fruits.failure_causes IS 'Causes d''échec cochées (Voie B) : precoce, tardif, incompatibilite, alteration_pollen, stress_thermique, stress_hydrique, traumatisme, attaque_sanitaire.';

-- Table Triggers

create trigger cross_fruits_sync_seeds after
insert
    or
update
    of seed_count,
    fruit_name,
    harvest_year,
    greenhouse_id,
    greenhouse_table_id,
    cross_id on
    public.cross_fruits for each row execute function sync_harvested_seeds();
create trigger fruit_within_flower_count before
insert
    on
    public.cross_fruits for each row execute function trg_fruit_within_flower_count();
ALTER TABLE public.cross_fruits ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_cross_fruits ON public.cross_fruits
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.cross_fruits OWNER TO postgres;
GRANT ALL ON TABLE public.cross_fruits TO postgres;
GRANT ALL ON TABLE public.cross_fruits TO anon;
GRANT ALL ON TABLE public.cross_fruits TO authenticated;
GRANT ALL ON TABLE public.cross_fruits TO service_role;


-- public.cross_programs definition

-- Drop table

-- DROP TABLE public.cross_programs;

CREATE TABLE public.cross_programs ( id uuid DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, code text NULL, female_parent_id uuid NULL, female_parent_name text NULL, male_parent_id uuid NULL, male_parent_name text NULL, objectives text NULL, pedigree text NULL, notes text NULL, conclusions text NULL, created_by uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, behavior_notes text NULL, behavior_stage text NULL, pollen_type text NULL, storage_duration text NULL, is_frozen bool NULL, pollination_notes text NULL, pollinated_count int4 NULL, fruit_status text NULL, fruit_count int4 NULL, aborted_count int4 NULL, abortion_rate text NULL, fruit_size text NULL, fruit_color text NULL, abortion_cause text NULL, CONSTRAINT cross_programs_code_key UNIQUE (code), CONSTRAINT cross_programs_pkey PRIMARY KEY (id));

-- Column comments

COMMENT ON COLUMN public.cross_programs.behavior_notes IS 'Observations about cross behavior and growth';
COMMENT ON COLUMN public.cross_programs.behavior_stage IS 'Current fruit behavior stage in the cross cycle';
ALTER TABLE public.cross_programs ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Allow insert for all" ON public.cross_programs
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK (true);
CREATE POLICY "Allow select for all" ON public.cross_programs
 AS PERMISSIVE
 FOR SELECT
 TO anon,authenticated
 USING (true);
CREATE POLICY "Authenticated users can create cross_programs" ON public.cross_programs
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete cross_programs" ON public.cross_programs
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read cross_programs" ON public.cross_programs
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update cross_programs" ON public.cross_programs
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY cross_programs_authenticated_all ON public.cross_programs
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY cross_programs_owner ON public.cross_programs
 AS PERMISSIVE
 FOR ALL
 USING ((created_by = auth.uid()))
 WITH CHECK ((created_by = auth.uid()));

-- Permissions

ALTER TABLE public.cross_programs OWNER TO postgres;
GRANT ALL ON TABLE public.cross_programs TO postgres;
GRANT ALL ON TABLE public.cross_programs TO anon;
GRANT ALL ON TABLE public.cross_programs TO authenticated;
GRANT ALL ON TABLE public.cross_programs TO service_role;


-- public.crosses definition

-- Drop table

-- DROP TABLE public.crosses;

CREATE TABLE public.crosses ( id uuid DEFAULT gen_random_uuid() NOT NULL, seed_parent_id uuid NULL, pollen_parent_id uuid NULL, cross_date date NULL, seed_count int4 NULL, germination_count int4 NULL, notes text NULL, created_at timestamptz DEFAULT now() NOT NULL, flower_count int4 NULL, code text NULL, seed_parent text NULL, pollen_parent text NULL, pollination_date date DEFAULT CURRENT_DATE NULL, remarks text NULL, base_syllable text NULL, lot_letter varchar(5) NULL, flower_letter varchar(5) NULL, climate_data jsonb DEFAULT '{}'::jsonb NULL, harvest_data jsonb DEFAULT '{}'::jsonb NULL, status text DEFAULT 'En cours'::text NULL, abort_cause text NULL, total_seeds int4 DEFAULT 0 NULL, germinated_seeds int4 DEFAULT 0 NULL, failed_seeds int4 DEFAULT 0 NULL, failure_attribution text NULL, automatic_synthesis text NULL, free_notes text NULL, pollen_lot_id uuid NULL, stress_notes text NULL, user_id uuid NULL, pollen_type text NULL, fresh_anther_quality text NULL, fresh_dehiscence text NULL, abortion_cause text NULL, pollinated_flowers_count int4 NULL, success_rate numeric NULL, updated_at timestamptz DEFAULT now() NULL, pollen_quality jsonb DEFAULT '{}'::jsonb NOT NULL, "location" text NULL, containers text NULL, pair_key text GENERATED ALWAYS AS ((lower(COALESCE(seed_parent, ''::text)) || '×'::text) || lower(COALESCE(pollen_parent, ''::text))) STORED NULL, pistil_checklist _text DEFAULT '{}'::text[] NOT NULL, greenhouse_table_id uuid NULL, parcelle_id uuid NULL, CONSTRAINT crosses_failure_attribution_check CHECK (((failure_attribution IS NULL) OR (failure_attribution = ANY (ARRAY['Pollen'::text, 'Mère'::text, 'Climat'::text, 'Incompatibilité'::text, 'Non déterminé'::text])))), CONSTRAINT crosses_one_field_location CHECK (((greenhouse_table_id IS NULL) OR (parcelle_id IS NULL))), CONSTRAINT crosses_pkey PRIMARY KEY (id), CONSTRAINT crosses_pollen_type_check CHECK ((pollen_type = ANY (ARRAY['frais'::text, 'conservé'::text]))), CONSTRAINT crosses_status_check CHECK ((status = ANY (ARRAY['En cours'::text, 'Récolté'::text, 'Avorté'::text]))));
CREATE INDEX idx_crosses_base_syllable ON public.crosses USING btree (base_syllable);
CREATE INDEX idx_crosses_parents ON public.crosses USING btree (seed_parent_id, pollen_parent_id);
CREATE INDEX idx_crosses_status ON public.crosses USING btree (status);
CREATE INDEX idx_crosses_user_id ON public.crosses USING btree (user_id);
CREATE UNIQUE INDEX uq_crosses_pair_lot ON public.crosses USING btree (user_id, pair_key, lot_letter) WHERE (lot_letter IS NOT NULL);

-- Column comments

COMMENT ON COLUMN public.crosses.pollen_type IS 'frais (utilisation directe) ou conservé (issu d''un lot du module Pollen).';
COMMENT ON COLUMN public.crosses.pistil_checklist IS 'Observation du pistil au moment de la pollinisation : stigmate_receptif, style_intact, ovaire_forme.';

-- Table Triggers

create trigger lock_flower_count before
update
    of flower_count on
    public.crosses for each row execute function trg_lock_flower_count();
ALTER TABLE public.crosses ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Allow public full access crosses" ON public.crosses
 AS PERMISSIVE
 FOR ALL
 USING (true)
 WITH CHECK (true);
CREATE POLICY "Allow public read/write crosses" ON public.crosses
 AS PERMISSIVE
 FOR ALL
 USING (true)
 WITH CHECK (true);
CREATE POLICY public_crosses ON public.crosses
 AS PERMISSIVE
 FOR ALL
 USING (true);

-- Permissions

ALTER TABLE public.crosses OWNER TO postgres;
GRANT ALL ON TABLE public.crosses TO postgres;
GRANT ALL ON TABLE public.crosses TO anon;
GRANT ALL ON TABLE public.crosses TO authenticated;
GRANT ALL ON TABLE public.crosses TO service_role;


-- public.field_interventions definition

-- Drop table

-- DROP TABLE public.field_interventions;

CREATE TABLE public.field_interventions ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, program_id uuid NOT NULL, due_date date NULL, done bool DEFAULT false NOT NULL, done_date date NULL, "result" text NULL, notes text DEFAULT ''::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT field_interventions_pkey PRIMARY KEY (id), CONSTRAINT field_interventions_result_check CHECK ((result = ANY (ARRAY['amelioration'::text, 'stationnaire'::text, 'echec'::text]))));
CREATE INDEX idx_field_interventions_due ON public.field_interventions USING btree (due_date) WHERE (done = false);
CREATE INDEX idx_field_interventions_program ON public.field_interventions USING btree (program_id);
ALTER TABLE public.field_interventions ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_field_interventions ON public.field_interventions
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.field_interventions OWNER TO postgres;
GRANT ALL ON TABLE public.field_interventions TO postgres;
GRANT ALL ON TABLE public.field_interventions TO anon;
GRANT ALL ON TABLE public.field_interventions TO authenticated;
GRANT ALL ON TABLE public.field_interventions TO service_role;


-- public.field_observations definition

-- Drop table

-- DROP TABLE public.field_observations;

CREATE TABLE public.field_observations ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, planting_id uuid NULL, observation_date date DEFAULT CURRENT_DATE NOT NULL, intervention_date date NULL, disease_pressure _text DEFAULT '{}'::text[] NOT NULL, pests _text DEFAULT '{}'::text[] NOT NULL, climate_behavior _text DEFAULT '{}'::text[] NOT NULL, treatment_applied _text DEFAULT '{}'::text[] NOT NULL, treatment_reaction _text DEFAULT '{}'::text[] NOT NULL, remarque text DEFAULT ''::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, seedling_id uuid NULL, variety_id uuid NULL, greenhouse_id uuid NULL, parcelle_id uuid NULL, weather_daily_id uuid NULL, observations _text DEFAULT '{}'::text[] NOT NULL, notes text DEFAULT ''::text NOT NULL, intervention_passes int4 NULL, intervention_result text NULL, CONSTRAINT field_observations_passes_check CHECK (((intervention_passes IS NULL) OR (intervention_passes > 0))), CONSTRAINT field_observations_pkey PRIMARY KEY (id), CONSTRAINT field_observations_result_check CHECK (((intervention_result IS NULL) OR (intervention_result = ANY (ARRAY['Amélioration'::text, 'Stationnaire'::text, 'Échec'::text])))), CONSTRAINT field_observations_source_check CHECK (((planting_id IS NOT NULL) OR (((seedling_id IS NOT NULL) <> (variety_id IS NOT NULL)) AND ((greenhouse_id IS NOT NULL) <> (parcelle_id IS NOT NULL)) AND (weather_daily_id IS NOT NULL)))));
CREATE INDEX idx_field_observations_date ON public.field_observations USING btree (observation_date);
CREATE INDEX idx_field_observations_obs ON public.field_observations USING btree (user_id, observation_date, weather_daily_id);
CREATE INDEX idx_field_observations_planting ON public.field_observations USING btree (planting_id);

-- Table Triggers

create trigger field_observations_integrity before
insert
    or
update
    on
    public.field_observations for each row execute function validate_field_observation_integrity();
ALTER TABLE public.field_observations ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_field_observations ON public.field_observations
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.field_observations OWNER TO postgres;
GRANT ALL ON TABLE public.field_observations TO postgres;
GRANT ALL ON TABLE public.field_observations TO anon;
GRANT ALL ON TABLE public.field_observations TO authenticated;
GRANT ALL ON TABLE public.field_observations TO service_role;


-- public.field_plantings definition

-- Drop table

-- DROP TABLE public.field_plantings;

CREATE TABLE public.field_plantings ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, variety_id uuid NULL, seedling_id uuid NULL, greenhouse_table_id uuid NULL, parcelle_id uuid NULL, planted_at date DEFAULT CURRENT_DATE NOT NULL, removed_at date NULL, notes text DEFAULT ''::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, plant_count int4 DEFAULT 1 NOT NULL, soil_type text NULL, container_type text NULL, CONSTRAINT field_plantings_one_location CHECK ((((greenhouse_table_id IS NOT NULL) AND (parcelle_id IS NULL)) OR ((greenhouse_table_id IS NULL) AND (parcelle_id IS NOT NULL)))), CONSTRAINT field_plantings_one_source CHECK ((((variety_id IS NOT NULL) AND (seedling_id IS NULL)) OR ((variety_id IS NULL) AND (seedling_id IS NOT NULL)))), CONSTRAINT field_plantings_pkey PRIMARY KEY (id), CONSTRAINT field_plantings_plant_count_check CHECK ((plant_count > 0)));
CREATE INDEX idx_field_plantings_greenhouse_table ON public.field_plantings USING btree (greenhouse_table_id);
CREATE INDEX idx_field_plantings_parcelle ON public.field_plantings USING btree (parcelle_id);
CREATE INDEX idx_field_plantings_seedling ON public.field_plantings USING btree (seedling_id);
CREATE INDEX idx_field_plantings_variety ON public.field_plantings USING btree (variety_id);

-- Column comments

COMMENT ON COLUMN public.field_plantings.plant_count IS 'Nombre de plants de la variété installés à cet emplacement.';
COMMENT ON COLUMN public.field_plantings.soil_type IS 'Type de sol ou substrat utilisé pour cette installation.';
COMMENT ON COLUMN public.field_plantings.container_type IS 'Contenant utilisé, par exemple pot en terre cuite.';
ALTER TABLE public.field_plantings ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_field_plantings ON public.field_plantings
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.field_plantings OWNER TO postgres;
GRANT ALL ON TABLE public.field_plantings TO postgres;
GRANT ALL ON TABLE public.field_plantings TO anon;
GRANT ALL ON TABLE public.field_plantings TO authenticated;
GRANT ALL ON TABLE public.field_plantings TO service_role;


-- public.field_programs definition

-- Drop table

-- DROP TABLE public.field_programs;

CREATE TABLE public.field_programs ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, planting_id uuid NULL, greenhouse_id uuid NULL, parcelle_id uuid NULL, program_type text NOT NULL, product_name text NOT NULL, start_date date DEFAULT CURRENT_DATE NOT NULL, intervention_count int4 DEFAULT 1 NOT NULL, last_intervention_date date NULL, "result" text NULL, notes text DEFAULT ''::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT field_programs_has_target CHECK (((planting_id IS NOT NULL) OR (greenhouse_id IS NOT NULL) OR (parcelle_id IS NOT NULL))), CONSTRAINT field_programs_pkey PRIMARY KEY (id), CONSTRAINT field_programs_program_type_check CHECK ((program_type = ANY (ARRAY['curatif'::text, 'preventif'::text, 'fertilisation'::text]))), CONSTRAINT field_programs_result_check CHECK ((result = ANY (ARRAY['amelioration'::text, 'stationnaire'::text, 'echec'::text]))));
CREATE INDEX idx_field_programs_planting ON public.field_programs USING btree (planting_id);
ALTER TABLE public.field_programs ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_field_programs ON public.field_programs
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.field_programs OWNER TO postgres;
GRANT ALL ON TABLE public.field_programs TO postgres;
GRANT ALL ON TABLE public.field_programs TO anon;
GRANT ALL ON TABLE public.field_programs TO authenticated;
GRANT ALL ON TABLE public.field_programs TO service_role;


-- public.greenhouse_tables definition

-- Drop table

-- DROP TABLE public.greenhouse_tables;

CREATE TABLE public.greenhouse_tables ( id uuid DEFAULT gen_random_uuid() NOT NULL, greenhouse_id uuid NOT NULL, table_number int4 DEFAULT 1 NOT NULL, capacity int4 DEFAULT 0 NOT NULL, description text NULL, "name" text NULL, CONSTRAINT greenhouse_tables_pkey PRIMARY KEY (id));
CREATE INDEX idx_greenhouse_tables_gh ON public.greenhouse_tables USING btree (greenhouse_id);
COMMENT ON TABLE public.greenhouse_tables IS 'Parcelles (nom SQL historique greenhouse_tables) rattachées à une serre.';
ALTER TABLE public.greenhouse_tables ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Allow public read/write greenhouse" ON public.greenhouse_tables
 AS PERMISSIVE
 FOR ALL
 USING (true)
 WITH CHECK (true);
CREATE POLICY "Authenticated users can create greenhouse_tables" ON public.greenhouse_tables
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete greenhouse_tables" ON public.greenhouse_tables
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read greenhouse_tables" ON public.greenhouse_tables
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update greenhouse_tables" ON public.greenhouse_tables
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY greenhouse_tables_via_gh ON public.greenhouse_tables
 AS PERMISSIVE
 FOR ALL
 USING ((EXISTS ( SELECT 1
   FROM greenhouses g
  WHERE ((g.id = greenhouse_tables.greenhouse_id) AND (g.created_by = auth.uid())))))
 WITH CHECK ((EXISTS ( SELECT 1
   FROM greenhouses g
  WHERE ((g.id = greenhouse_tables.greenhouse_id) AND (g.created_by = auth.uid())))));
CREATE POLICY public_greenhouse_tables ON public.greenhouse_tables
 AS PERMISSIVE
 FOR ALL
 USING (true);

-- Permissions

ALTER TABLE public.greenhouse_tables OWNER TO postgres;
GRANT ALL ON TABLE public.greenhouse_tables TO postgres;
GRANT ALL ON TABLE public.greenhouse_tables TO anon;
GRANT ALL ON TABLE public.greenhouse_tables TO authenticated;
GRANT ALL ON TABLE public.greenhouse_tables TO service_role;


-- public.greenhouses definition

-- Drop table

-- DROP TABLE public.greenhouses;

CREATE TABLE public.greenhouses ( id uuid DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, "location" text NULL, description text NULL, created_by uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, user_id uuid DEFAULT auth.uid() NULL, CONSTRAINT greenhouses_pkey PRIMARY KEY (id));
ALTER TABLE public.greenhouses ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create greenhouses" ON public.greenhouses
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete greenhouses" ON public.greenhouses
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read greenhouses" ON public.greenhouses
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update greenhouses" ON public.greenhouses
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY delete_own_greenhouses ON public.greenhouses
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY greenhouses_owner ON public.greenhouses
 AS PERMISSIVE
 FOR ALL
 USING ((created_by = auth.uid()))
 WITH CHECK ((created_by = auth.uid()));
CREATE POLICY insert_own_greenhouses ON public.greenhouses
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY public_greenhouses ON public.greenhouses
 AS PERMISSIVE
 FOR ALL
 USING (true);
CREATE POLICY select_own_greenhouses ON public.greenhouses
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY update_own_greenhouses ON public.greenhouses
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.greenhouses OWNER TO postgres;
GRANT ALL ON TABLE public.greenhouses TO postgres;
GRANT ALL ON TABLE public.greenhouses TO anon;
GRANT ALL ON TABLE public.greenhouses TO authenticated;
GRANT ALL ON TABLE public.greenhouses TO service_role;


-- public.harvested_seeds definition

-- Drop table

-- DROP TABLE public.harvested_seeds;

CREATE TABLE public.harvested_seeds ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, fruit_id uuid NOT NULL, seed_name text NOT NULL, seed_number int4 NOT NULL, harvest_year int4 NOT NULL, status text DEFAULT 'recoltee'::text NOT NULL, greenhouse_id uuid NULL, greenhouse_table_id uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, cross_id uuid NULL, CONSTRAINT harvested_seeds_fruit_id_seed_number_key UNIQUE (fruit_id, seed_number), CONSTRAINT harvested_seeds_pkey PRIMARY KEY (id), CONSTRAINT harvested_seeds_seed_number_check CHECK ((seed_number > 0)));
CREATE INDEX idx_harvested_seeds_cross ON public.harvested_seeds USING btree (cross_id);
CREATE INDEX idx_harvested_seeds_fruit ON public.harvested_seeds USING btree (fruit_id);
CREATE INDEX idx_harvested_seeds_status ON public.harvested_seeds USING btree (user_id, status);
CREATE UNIQUE INDEX uq_harvested_seeds_user_seed_name ON public.harvested_seeds USING btree (user_id, seed_name);
COMMENT ON TABLE public.harvested_seeds IS 'Une ligne par graine, code fruit-année-numéro, liée au croisement et à la serre/parcelle.';
ALTER TABLE public.harvested_seeds ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_harvested_seeds ON public.harvested_seeds
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.harvested_seeds OWNER TO postgres;
GRANT ALL ON TABLE public.harvested_seeds TO postgres;
GRANT ALL ON TABLE public.harvested_seeds TO anon;
GRANT ALL ON TABLE public.harvested_seeds TO authenticated;
GRANT ALL ON TABLE public.harvested_seeds TO service_role;


-- public.harvests definition

-- Drop table

-- DROP TABLE public.harvests;

CREATE TABLE public.harvests ( id uuid DEFAULT gen_random_uuid() NOT NULL, cross_id uuid NOT NULL, fruit_code text NULL, harvest_date date NULL, fruit_quality text DEFAULT 'Moyen'::text NOT NULL, hip_size text DEFAULT 'Moyen'::text NOT NULL, hip_color text DEFAULT 'Non renseigné'::text NOT NULL, seed_count int4 DEFAULT 0 NOT NULL, hip_shape text NULL, aborted bool NULL, abortion_cause text NULL, seed_quality text NULL, notes text NULL, created_at timestamptz DEFAULT now() NOT NULL, lot_id uuid NULL, lot_name text NULL, fruit_number int4 NULL, harvested bool DEFAULT false NULL, germinated_count int4 DEFAULT 0 NULL, CONSTRAINT harvests_fruit_code_key UNIQUE (fruit_code), CONSTRAINT harvests_pkey PRIMARY KEY (id));
CREATE INDEX idx_harvests_cross ON public.harvests USING btree (cross_id);
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Allow upsert for harvests" ON public.harvests
 AS PERMISSIVE
 FOR ALL
 USING (true)
 WITH CHECK (true);
CREATE POLICY "Authenticated users can create harvests" ON public.harvests
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete harvests" ON public.harvests
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read harvests" ON public.harvests
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update harvests" ON public.harvests
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY harvests_via_cross ON public.harvests
 AS PERMISSIVE
 FOR ALL
 USING ((EXISTS ( SELECT 1
   FROM cross_programs c
  WHERE ((c.id = harvests.cross_id) AND (c.created_by = auth.uid())))))
 WITH CHECK ((EXISTS ( SELECT 1
   FROM cross_programs c
  WHERE ((c.id = harvests.cross_id) AND (c.created_by = auth.uid())))));

-- Permissions

ALTER TABLE public.harvests OWNER TO postgres;
GRANT ALL ON TABLE public.harvests TO postgres;
GRANT ALL ON TABLE public.harvests TO anon;
GRANT ALL ON TABLE public.harvests TO authenticated;
GRANT ALL ON TABLE public.harvests TO service_role;


-- public.hip_harvests definition

-- Drop table

-- DROP TABLE public.hip_harvests;

CREATE TABLE public.hip_harvests ( id uuid DEFAULT gen_random_uuid() NOT NULL, cross_id uuid NULL, code text NOT NULL, harvest_date timestamptz NULL, seed_count int4 DEFAULT 0 NOT NULL, remarks text DEFAULT ''::text NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, fruit_calibre text NULL, maturation text NULL, avortement_cause text NULL, seed_extraction text NULL, user_id uuid DEFAULT auth.uid() NULL, CONSTRAINT hip_harvests_pkey PRIMARY KEY (id));
ALTER TABLE public.hip_harvests ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY delete_own_hip_harvests ON public.hip_harvests
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY insert_own_hip_harvests ON public.hip_harvests
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY public_hip_harvests ON public.hip_harvests
 AS PERMISSIVE
 FOR ALL
 USING (true);
CREATE POLICY select_own_hip_harvests ON public.hip_harvests
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY update_own_hip_harvests ON public.hip_harvests
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.hip_harvests OWNER TO postgres;
GRANT ALL ON TABLE public.hip_harvests TO postgres;
GRANT ALL ON TABLE public.hip_harvests TO anon;
GRANT ALL ON TABLE public.hip_harvests TO authenticated;
GRANT ALL ON TABLE public.hip_harvests TO service_role;


-- public.parcelles definition

-- Drop table

-- DROP TABLE public.parcelles;

CREATE TABLE public.parcelles ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, "name" text NOT NULL, soil_type _text DEFAULT '{}'::text[] NOT NULL, "location" text NULL, latitude numeric NULL, longitude numeric NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT parcelles_pkey PRIMARY KEY (id));
ALTER TABLE public.parcelles ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_parcelles ON public.parcelles
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.parcelles OWNER TO postgres;
GRANT ALL ON TABLE public.parcelles TO postgres;
GRANT ALL ON TABLE public.parcelles TO anon;
GRANT ALL ON TABLE public.parcelles TO authenticated;
GRANT ALL ON TABLE public.parcelles TO service_role;


-- public.parent_alerts definition

-- Drop table

-- DROP TABLE public.parent_alerts;

CREATE TABLE public.parent_alerts ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, cross_id uuid NULL, parent_name text NOT NULL, parent_role text NOT NULL, message text DEFAULT ''::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT parent_alerts_parent_role_check CHECK ((parent_role = ANY (ARRAY['seed'::text, 'pollen'::text]))), CONSTRAINT parent_alerts_pkey PRIMARY KEY (id));
CREATE INDEX idx_parent_alerts_user ON public.parent_alerts USING btree (user_id, created_at DESC);
ALTER TABLE public.parent_alerts ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY parent_alerts_own ON public.parent_alerts
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.parent_alerts OWNER TO postgres;
GRANT ALL ON TABLE public.parent_alerts TO postgres;
GRANT ALL ON TABLE public.parent_alerts TO anon;
GRANT ALL ON TABLE public.parent_alerts TO authenticated;
GRANT ALL ON TABLE public.parent_alerts TO service_role;


-- public.parent_attributes definition

-- Drop table

-- DROP TABLE public.parent_attributes;

CREATE TABLE public.parent_attributes ( id uuid DEFAULT gen_random_uuid() NOT NULL, variety_id uuid NOT NULL, parent_role text NOT NULL, fruit_set_quality text NULL, seed_quantity text NULL, hip_size text NULL, hip_color text NULL, germination_rate text NULL, pollen_quantity text NULL, pollen_viability text NULL, compatibility text NULL, "comments" text NULL, user_id uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT parent_attributes_parent_role_check CHECK ((parent_role = ANY (ARRAY['female'::text, 'male'::text]))), CONSTRAINT parent_attributes_pkey PRIMARY KEY (id));
CREATE INDEX idx_parent_attributes_variety ON public.parent_attributes USING btree (variety_id);
ALTER TABLE public.parent_attributes ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create parent_attributes" ON public.parent_attributes
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete parent_attributes" ON public.parent_attributes
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read parent_attributes" ON public.parent_attributes
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update parent_attributes" ON public.parent_attributes
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY parent_attributes_read_all ON public.parent_attributes
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY parent_attributes_write_auth ON public.parent_attributes
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK ((auth.uid() IS NOT NULL));

-- Permissions

ALTER TABLE public.parent_attributes OWNER TO postgres;
GRANT ALL ON TABLE public.parent_attributes TO postgres;
GRANT ALL ON TABLE public.parent_attributes TO anon;
GRANT ALL ON TABLE public.parent_attributes TO authenticated;
GRANT ALL ON TABLE public.parent_attributes TO service_role;


-- public.pollen_batches definition

-- Drop table

-- DROP TABLE public.pollen_batches;

CREATE TABLE public.pollen_batches ( id uuid DEFAULT gen_random_uuid() NOT NULL, variety_id uuid NULL, batch_code text NOT NULL, anther_quality text NULL, dehiscence text NULL, conservation_mode text NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT pollen_batches_batch_code_key UNIQUE (batch_code), CONSTRAINT pollen_batches_pkey PRIMARY KEY (id));
ALTER TABLE public.pollen_batches ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.pollen_batches OWNER TO postgres;
GRANT ALL ON TABLE public.pollen_batches TO postgres;
GRANT ALL ON TABLE public.pollen_batches TO anon;
GRANT ALL ON TABLE public.pollen_batches TO authenticated;
GRANT ALL ON TABLE public.pollen_batches TO service_role;


-- public.pollen_lots definition

-- Drop table

-- DROP TABLE public.pollen_lots;

CREATE TABLE public.pollen_lots ( id uuid DEFAULT gen_random_uuid() NOT NULL, lot_number text NOT NULL, rose_name text NULL, anther_quality text NULL, dehiscence text NULL, conservation_mode text NULL, remarks text DEFAULT ''::text NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, user_id uuid DEFAULT auth.uid() NULL, harvest_date date NULL, weather_data jsonb DEFAULT '{}'::jsonb NOT NULL, CONSTRAINT pollen_lots_pkey PRIMARY KEY (id));
ALTER TABLE public.pollen_lots ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY delete_own_pollen_lots ON public.pollen_lots
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY insert_own_pollen_lots ON public.pollen_lots
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY public_pollen_lots ON public.pollen_lots
 AS PERMISSIVE
 FOR ALL
 USING (true);
CREATE POLICY select_own_pollen_lots ON public.pollen_lots
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY update_own_pollen_lots ON public.pollen_lots
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.pollen_lots OWNER TO postgres;
GRANT ALL ON TABLE public.pollen_lots TO postgres;
GRANT ALL ON TABLE public.pollen_lots TO anon;
GRANT ALL ON TABLE public.pollen_lots TO authenticated;
GRANT ALL ON TABLE public.pollen_lots TO service_role;


-- public.pollinations definition

-- Drop table

-- DROP TABLE public.pollinations;

CREATE TABLE public.pollinations ( id uuid DEFAULT gen_random_uuid() NOT NULL, cross_id uuid NOT NULL, registration_date date NULL, pollination_date date NULL, auto_pollination_date date NULL, abortion_date date NULL, flower_count int4 DEFAULT 0 NOT NULL, pollination_reliability text DEFAULT 'Fiable'::text NOT NULL, pollen_type text DEFAULT 'Frais'::text NOT NULL, storage_days int4 DEFAULT 0 NOT NULL, sterility_level text DEFAULT 'Faible'::text NOT NULL, temperature text NULL, humidity text NULL, sky_condition text NULL, wind text NULL, abortion_cause text NULL, "comments" text NULL, created_at timestamptz DEFAULT now() NOT NULL, lot_name text NULL, status text NULL, storage_duration text NULL, is_frozen bool NULL, pollination_notes text NULL, behavior_stage text NULL, behavior_notes text NULL, harvested bool DEFAULT false NULL, fruit_count int4 DEFAULT 0 NULL, CONSTRAINT pollinations_pkey PRIMARY KEY (id));
CREATE INDEX idx_pollinations_cross ON public.pollinations USING btree (cross_id);
ALTER TABLE public.pollinations ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create pollinations" ON public.pollinations
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete pollinations" ON public.pollinations
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read pollinations" ON public.pollinations
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update pollinations" ON public.pollinations
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY pollinations_authenticated_all ON public.pollinations
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY pollinations_via_cross ON public.pollinations
 AS PERMISSIVE
 FOR ALL
 USING ((EXISTS ( SELECT 1
   FROM cross_programs c
  WHERE ((c.id = pollinations.cross_id) AND (c.created_by = auth.uid())))))
 WITH CHECK ((EXISTS ( SELECT 1
   FROM cross_programs c
  WHERE ((c.id = pollinations.cross_id) AND (c.created_by = auth.uid())))));

-- Permissions

ALTER TABLE public.pollinations OWNER TO postgres;
GRANT ALL ON TABLE public.pollinations TO postgres;
GRANT ALL ON TABLE public.pollinations TO anon;
GRANT ALL ON TABLE public.pollinations TO authenticated;
GRANT ALL ON TABLE public.pollinations TO service_role;


-- public.profiles definition

-- Drop table

-- DROP TABLE public.profiles;

CREATE TABLE public.profiles ( id uuid NOT NULL, obtenteur_name text NULL, affixe text NULL, siret text NULL, city text NULL, postal_code text NULL, address text NULL, avatar_url text NULL, "subscription" text DEFAULT 'free'::text NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, latitude numeric NULL, longitude numeric NULL, CONSTRAINT profiles_pkey PRIMARY KEY (id), CONSTRAINT profiles_subscription_check CHECK ((subscription = ANY (ARRAY['free'::text, 'pro'::text]))));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY insert_own_profile ON public.profiles
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = id));
CREATE POLICY read_own_profile ON public.profiles
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = id));
CREATE POLICY update_own_profile ON public.profiles
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = id))
 WITH CHECK ((auth.uid() = id));

-- Permissions

ALTER TABLE public.profiles OWNER TO postgres;
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


-- public.seedling_evaluations definition

-- Drop table

-- DROP TABLE public.seedling_evaluations;

CREATE TABLE public.seedling_evaluations ( id uuid DEFAULT gen_random_uuid() NOT NULL, seedling_id uuid NOT NULL, evaluation_date date NULL, vigor text DEFAULT 'Moyenne'::text NOT NULL, flower_form text DEFAULT 'Semi-double'::text NOT NULL, fragrance text DEFAULT 'Moyen'::text NOT NULL, disease_resistance text DEFAULT 'Moyenne'::text NOT NULL, perfume text NULL, colors text NULL, special_features text NULL, "comments" text NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT seedling_evaluations_pkey PRIMARY KEY (id));
CREATE INDEX idx_seedling_evaluations_seedling ON public.seedling_evaluations USING btree (seedling_id);
ALTER TABLE public.seedling_evaluations ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create seedling_evaluations" ON public.seedling_evaluations
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete seedling_evaluations" ON public.seedling_evaluations
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read seedling_evaluations" ON public.seedling_evaluations
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update seedling_evaluations" ON public.seedling_evaluations
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY seedling_evaluations_via_seedling ON public.seedling_evaluations
 AS PERMISSIVE
 FOR ALL
 USING ((EXISTS ( SELECT 1
   FROM seedlings s
  WHERE ((s.id = seedling_evaluations.seedling_id) AND (s.created_by = auth.uid())))))
 WITH CHECK ((EXISTS ( SELECT 1
   FROM seedlings s
  WHERE ((s.id = seedling_evaluations.seedling_id) AND (s.created_by = auth.uid())))));

-- Permissions

ALTER TABLE public.seedling_evaluations OWNER TO postgres;
GRANT ALL ON TABLE public.seedling_evaluations TO postgres;
GRANT ALL ON TABLE public.seedling_evaluations TO anon;
GRANT ALL ON TABLE public.seedling_evaluations TO authenticated;
GRANT ALL ON TABLE public.seedling_evaluations TO service_role;


-- public.seedlings definition

-- Drop table

-- DROP TABLE public.seedlings;

CREATE TABLE public.seedlings ( id uuid DEFAULT gen_random_uuid() NOT NULL, cross_id uuid NOT NULL, code text NULL, fruit_code text NULL, seed_code text NULL, batch_id uuid NULL, table_id uuid NULL, "row" int4 NULL, "position" int4 NULL, sowing_date date NULL, germination_date date NULL, planted_date date NULL, status text DEFAULT 'Semé'::text NOT NULL, observations text NULL, created_by uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, phenotype_vigueur text NULL, pression_sanitaire text NULL, traitement text NULL, motif_elimination text NULL, critere_selection text NULL, auto_report text NULL, seedling_code text NULL, evaluation_status text DEFAULT 'Évaluation'::text NULL, is_promoted_to_variety bool DEFAULT false NULL, free_notes text NULL, user_id uuid DEFAULT auth.uid() NULL, vigor text NULL, sanitary_status text NULL, is_remontant bool DEFAULT false NULL, is_fragrant bool DEFAULT false NULL, petal_type text NULL, growth_habit text NULL, fruit_id uuid NULL, remarks text DEFAULT ''::text NOT NULL, CONSTRAINT seedlings_code_key UNIQUE (code), CONSTRAINT seedlings_pkey PRIMARY KEY (id), CONSTRAINT seedlings_status_check CHECK ((status = ANY (ARRAY['Semé'::text, 'Stratifié'::text, 'Germé'::text, 'Repiqué'::text, 'En croissance'::text, 'Floraison'::text, 'Retenu'::text, 'Écarté'::text, 'Mort'::text]))));
CREATE INDEX idx_seedlings_cross ON public.seedlings USING btree (cross_id);
CREATE UNIQUE INDEX idx_seedlings_seedling_code ON public.seedlings USING btree (seedling_code) WHERE (seedling_code IS NOT NULL);
CREATE INDEX idx_seedlings_status ON public.seedlings USING btree (status);
CREATE INDEX idx_seedlings_user_id ON public.seedlings USING btree (user_id);
CREATE UNIQUE INDEX uq_seedlings_user_seed_code ON public.seedlings USING btree (user_id, seed_code) WHERE (seed_code IS NOT NULL);

-- Column comments

COMMENT ON COLUMN public.seedlings.fruit_id IS 'Fruit (cross_fruits) dont ce semis est issu. cross_id reste la référence directe au croisement.';
ALTER TABLE public.seedlings ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Authenticated users can create seedlings" ON public.seedlings
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete seedlings" ON public.seedlings
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read seedlings" ON public.seedlings
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update seedlings" ON public.seedlings
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY delete_own_seedlings ON public.seedlings
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY insert_own_seedlings ON public.seedlings
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY public_seedlings ON public.seedlings
 AS PERMISSIVE
 FOR ALL
 USING (true);
CREATE POLICY seedlings_owner ON public.seedlings
 AS PERMISSIVE
 FOR ALL
 USING ((created_by = auth.uid()))
 WITH CHECK ((created_by = auth.uid()));
CREATE POLICY select_own_seedlings ON public.seedlings
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY update_own_seedlings ON public.seedlings
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.seedlings OWNER TO postgres;
GRANT ALL ON TABLE public.seedlings TO postgres;
GRANT ALL ON TABLE public.seedlings TO anon;
GRANT ALL ON TABLE public.seedlings TO authenticated;
GRANT ALL ON TABLE public.seedlings TO service_role;


-- public.sensors definition

-- Drop table

-- DROP TABLE public.sensors;

CREATE TABLE public.sensors ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, greenhouse_id uuid NULL, "name" text NOT NULL, sensor_type text NULL, "last_value" numeric NULL, last_reading_at timestamptz NULL, is_active bool DEFAULT true NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT sensors_pkey PRIMARY KEY (id));
CREATE INDEX idx_sensors_greenhouse_id ON public.sensors USING btree (greenhouse_id);
CREATE INDEX idx_sensors_user_id ON public.sensors USING btree (user_id);
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY sensors_own ON public.sensors
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.sensors OWNER TO postgres;
GRANT ALL ON TABLE public.sensors TO postgres;
GRANT ALL ON TABLE public.sensors TO anon;
GRANT ALL ON TABLE public.sensors TO authenticated;
GRANT ALL ON TABLE public.sensors TO service_role;


-- public.sowing_batches definition

-- Drop table

-- DROP TABLE public.sowing_batches;

CREATE TABLE public.sowing_batches ( id uuid DEFAULT gen_random_uuid() NOT NULL, cross_id uuid NOT NULL, fruit_code text NULL, sowing_date date NULL, seed_count int4 DEFAULT 0 NOT NULL, substrate text NULL, stratification text NULL, stratification_days int4 NULL, table_id uuid NULL, notes text NULL, created_by uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, harvest_date timestamptz NULL, original_seed_count int4 DEFAULT 0 NULL, sprouted_count int4 DEFAULT 0 NULL, user_id uuid DEFAULT auth.uid() NULL, hip_harvest_id uuid NULL, fruit_id uuid NULL, CONSTRAINT sowing_batches_pkey PRIMARY KEY (id));
CREATE INDEX idx_sowing_batches_cross ON public.sowing_batches USING btree (cross_id);
CREATE UNIQUE INDEX uq_sowing_batches_fruit ON public.sowing_batches USING btree (fruit_id) WHERE (fruit_id IS NOT NULL);

-- Column comments

COMMENT ON COLUMN public.sowing_batches.fruit_id IS 'Fruit (cross_fruits) dont ce lot de semis est issu.';
ALTER TABLE public.sowing_batches ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Allow upsert for sowing_batches" ON public.sowing_batches
 AS PERMISSIVE
 FOR ALL
 USING (true)
 WITH CHECK (true);
CREATE POLICY "Authenticated users can create sowing_batches" ON public.sowing_batches
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete sowing_batches" ON public.sowing_batches
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read sowing_batches" ON public.sowing_batches
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update sowing_batches" ON public.sowing_batches
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY delete_own_sowing_batches ON public.sowing_batches
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY insert_own_sowing_batches ON public.sowing_batches
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY public_sowing_batches ON public.sowing_batches
 AS PERMISSIVE
 FOR ALL
 USING (true);
CREATE POLICY select_own_sowing_batches ON public.sowing_batches
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY sowing_batches_owner ON public.sowing_batches
 AS PERMISSIVE
 FOR ALL
 USING ((created_by = auth.uid()))
 WITH CHECK ((created_by = auth.uid()));
CREATE POLICY update_own_sowing_batches ON public.sowing_batches
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.sowing_batches OWNER TO postgres;
GRANT ALL ON TABLE public.sowing_batches TO postgres;
GRANT ALL ON TABLE public.sowing_batches TO anon;
GRANT ALL ON TABLE public.sowing_batches TO authenticated;
GRANT ALL ON TABLE public.sowing_batches TO service_role;


-- public.support_messages definition

-- Drop table

-- DROP TABLE public.support_messages;

CREATE TABLE public.support_messages ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NULL, subject text NULL, category text NULL, message text NOT NULL, attachment_url text NULL, status text DEFAULT 'open'::text NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT support_messages_category_check CHECK (((category IS NULL) OR (category = ANY (ARRAY['technical'::text, 'bug'::text, 'suggestion'::text, 'billing'::text, 'dho'::text, 'partnership'::text])))), CONSTRAINT support_messages_pkey PRIMARY KEY (id), CONSTRAINT support_messages_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text]))));
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY insert_own_support_messages ON public.support_messages
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY select_own_support_messages ON public.support_messages
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.support_messages OWNER TO postgres;
GRANT ALL ON TABLE public.support_messages TO postgres;
GRANT ALL ON TABLE public.support_messages TO anon;
GRANT ALL ON TABLE public.support_messages TO authenticated;
GRANT ALL ON TABLE public.support_messages TO service_role;


-- public.treatments definition

-- Drop table

-- DROP TABLE public.treatments;

CREATE TABLE public.treatments ( id uuid DEFAULT gen_random_uuid() NOT NULL, cross_id uuid NULL, product_name text NOT NULL, treatment_type text NULL, repetition_count int4 DEFAULT 1 NULL, applied_at timestamptz DEFAULT now() NULL, user_id uuid DEFAULT auth.uid() NOT NULL, notes text NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT treatments_pkey PRIMARY KEY (id));
CREATE INDEX idx_treatments_cross_id ON public.treatments USING btree (cross_id);
CREATE INDEX idx_treatments_user_id ON public.treatments USING btree (user_id);
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY delete_own_treatments ON public.treatments
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY insert_own_treatments ON public.treatments
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));
CREATE POLICY select_own_treatments ON public.treatments
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = user_id));
CREATE POLICY update_own_treatments ON public.treatments
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.treatments OWNER TO postgres;
GRANT ALL ON TABLE public.treatments TO postgres;
GRANT ALL ON TABLE public.treatments TO anon;
GRANT ALL ON TABLE public.treatments TO authenticated;
GRANT ALL ON TABLE public.treatments TO service_role;


-- public.user_profiles definition

-- Drop table

-- DROP TABLE public.user_profiles;

CREATE TABLE public.user_profiles ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NULL, "role" text DEFAULT 'user'::text NOT NULL, geographical_zone text NOT NULL, created_at timestamptz DEFAULT timezone('utc'::text, now()) NULL, CONSTRAINT user_profiles_pkey PRIMARY KEY (id), CONSTRAINT user_profiles_user_id_key UNIQUE (user_id));
CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Permissions

ALTER TABLE public.user_profiles OWNER TO postgres;
GRANT ALL ON TABLE public.user_profiles TO postgres;
GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


-- public.user_settings definition

-- Drop table

-- DROP TABLE public.user_settings;

CREATE TABLE public.user_settings ( id uuid NOT NULL, theme text DEFAULT 'botanical'::text NULL, frost_threshold numeric DEFAULT 2 NULL, heat_threshold numeric DEFAULT 35 NULL, units text DEFAULT 'metric'::text NULL, "language" text DEFAULT 'fr'::text NOT NULL, alerts_enabled bool DEFAULT true NOT NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT user_settings_language_check CHECK ((language = ANY (ARRAY['fr'::text, 'en'::text]))), CONSTRAINT user_settings_pkey PRIMARY KEY (id), CONSTRAINT user_settings_theme_check CHECK ((theme = ANY (ARRAY['botanical'::text, 'dark'::text, 'light'::text]))), CONSTRAINT user_settings_units_check CHECK ((units = ANY (ARRAY['metric'::text, 'imperial'::text]))));
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY insert_own_settings ON public.user_settings
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = id));
CREATE POLICY read_own_settings ON public.user_settings
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING ((auth.uid() = id));
CREATE POLICY update_own_settings ON public.user_settings
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = id))
 WITH CHECK ((auth.uid() = id));

-- Permissions

ALTER TABLE public.user_settings OWNER TO postgres;
GRANT ALL ON TABLE public.user_settings TO postgres;
GRANT ALL ON TABLE public.user_settings TO anon;
GRANT ALL ON TABLE public.user_settings TO authenticated;
GRANT ALL ON TABLE public.user_settings TO service_role;


-- public.varieties definition

-- Drop table

-- DROP TABLE public.varieties;

CREATE TABLE public.varieties ( id uuid DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, commercial_name text NULL, registration_name text NULL, obtenteur text DEFAULT 'Inconnu'::text NOT NULL, adr_label bool DEFAULT false NOT NULL, "type" text NULL, color text NULL, flowering text NULL, fragrance text NULL, parents text NULL, description text NULL, photo_url text NULL, details jsonb DEFAULT '{}'::jsonb NOT NULL, created_by uuid NULL, created_at timestamptz DEFAULT now() NOT NULL, image_url text NULL, parentage text NULL, CONSTRAINT varieties_pkey PRIMARY KEY (id));
CREATE INDEX idx_varieties_color ON public.varieties USING btree (color);
CREATE INDEX idx_varieties_details ON public.varieties USING gin (details);
CREATE INDEX idx_varieties_name_trgm ON public.varieties USING gin (name gin_trgm_ops);
CREATE INDEX idx_varieties_type ON public.varieties USING btree (type);
ALTER TABLE public.varieties ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Allow public read access on varieties" ON public.varieties
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY "Authenticated users can create varieties" ON public.varieties
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY "Authenticated users can delete varieties" ON public.varieties
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can read varieties" ON public.varieties
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY "Authenticated users can update varieties" ON public.varieties
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY delete_own_varieties ON public.varieties
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (((created_by IS NULL) OR (auth.uid() = created_by)));
CREATE POLICY insert_own_varieties ON public.varieties
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY public_read_varieties ON public.varieties
 AS PERMISSIVE
 FOR SELECT
 TO anon,authenticated
 USING (true);
CREATE POLICY update_own_varieties ON public.varieties
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (((created_by IS NULL) OR (auth.uid() = created_by)))
 WITH CHECK (((created_by IS NULL) OR (auth.uid() = created_by)));
CREATE POLICY varieties_delete_auth ON public.varieties
 AS PERMISSIVE
 FOR DELETE
 USING ((auth.uid() IS NOT NULL));
CREATE POLICY varieties_read_all ON public.varieties
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY varieties_update_auth ON public.varieties
 AS PERMISSIVE
 FOR UPDATE
 USING ((auth.uid() IS NOT NULL));
CREATE POLICY varieties_write_auth ON public.varieties
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK ((auth.uid() IS NOT NULL));

-- Permissions

ALTER TABLE public.varieties OWNER TO postgres;
GRANT ALL ON TABLE public.varieties TO postgres;
GRANT ALL ON TABLE public.varieties TO anon;
GRANT ALL ON TABLE public.varieties TO authenticated;
GRANT ALL ON TABLE public.varieties TO service_role;


-- public.varieties_photos definition

-- Drop table

-- DROP TABLE public.varieties_photos;

CREATE TABLE public.varieties_photos ( id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL, "name" text NOT NULL, photo_url text NOT NULL, variety_id uuid NULL, is_primary bool DEFAULT false NOT NULL, caption text NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT varieties_photos_pkey PRIMARY KEY (id));
CREATE INDEX idx_varieties_photos_variety ON public.varieties_photos USING btree (variety_id);
ALTER TABLE public.varieties_photos ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY "Autoriser insertion publique" ON public.varieties_photos
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK (true);
CREATE POLICY "Lecture publique des photos" ON public.varieties_photos
 AS PERMISSIVE
 FOR SELECT
 USING (true);
CREATE POLICY delete_own_varieties_photos ON public.varieties_photos
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY insert_own_varieties_photos ON public.varieties_photos
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY public_read_varieties_photos ON public.varieties_photos
 AS PERMISSIVE
 FOR SELECT
 TO anon,authenticated
 USING (true);
CREATE POLICY update_own_varieties_photos ON public.varieties_photos
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true);

-- Permissions

ALTER TABLE public.varieties_photos OWNER TO postgres;
GRANT ALL ON TABLE public.varieties_photos TO postgres;
GRANT ALL ON TABLE public.varieties_photos TO anon;
GRANT ALL ON TABLE public.varieties_photos TO authenticated;
GRANT ALL ON TABLE public.varieties_photos TO service_role;


-- public.weather_daily definition

-- Drop table

-- DROP TABLE public.weather_daily;

CREATE TABLE public.weather_daily ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, "date" date NOT NULL, temperature numeric NULL, humidity numeric NULL, uv_index numeric NULL, "location" text NULL, "source" text DEFAULT 'live'::text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT weather_daily_pkey PRIMARY KEY (id), CONSTRAINT weather_daily_source_check CHECK ((source = ANY (ARRAY['live'::text, 'archive'::text]))));
CREATE UNIQUE INDEX uq_weather_daily_user_date ON public.weather_daily USING btree (user_id, date);
ALTER TABLE public.weather_daily ENABLE ROW LEVEL SECURITY;

-- Table Policies

CREATE POLICY own_weather_daily ON public.weather_daily
 AS PERMISSIVE
 FOR ALL
 TO authenticated
 USING ((auth.uid() = user_id))
 WITH CHECK ((auth.uid() = user_id));

-- Permissions

ALTER TABLE public.weather_daily OWNER TO postgres;
GRANT ALL ON TABLE public.weather_daily TO postgres;
GRANT ALL ON TABLE public.weather_daily TO anon;
GRANT ALL ON TABLE public.weather_daily TO authenticated;
GRANT ALL ON TABLE public.weather_daily TO service_role;


-- public.admin_alerts foreign keys

ALTER TABLE public.admin_alerts ADD CONSTRAINT admin_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.catalog_collection foreign keys

ALTER TABLE public.catalog_collection ADD CONSTRAINT catalog_collection_seedling_id_fkey FOREIGN KEY (seedling_id) REFERENCES public.seedlings(id) ON DELETE CASCADE;
ALTER TABLE public.catalog_collection ADD CONSTRAINT catalog_collection_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.catalog_collection ADD CONSTRAINT catalog_collection_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.varieties(id) ON DELETE CASCADE;


-- public.catalog_variety_requests foreign keys

ALTER TABLE public.catalog_variety_requests ADD CONSTRAINT catalog_variety_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.cross_fruits foreign keys

ALTER TABLE public.cross_fruits ADD CONSTRAINT cross_fruits_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.crosses(id) ON DELETE CASCADE;
ALTER TABLE public.cross_fruits ADD CONSTRAINT cross_fruits_greenhouse_id_fkey FOREIGN KEY (greenhouse_id) REFERENCES public.greenhouses(id) ON DELETE SET NULL;
ALTER TABLE public.cross_fruits ADD CONSTRAINT cross_fruits_greenhouse_table_id_fkey FOREIGN KEY (greenhouse_table_id) REFERENCES public.greenhouse_tables(id) ON DELETE SET NULL;
ALTER TABLE public.cross_fruits ADD CONSTRAINT cross_fruits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.cross_programs foreign keys

ALTER TABLE public.cross_programs ADD CONSTRAINT cross_programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.cross_programs ADD CONSTRAINT cross_programs_female_parent_id_fkey FOREIGN KEY (female_parent_id) REFERENCES public.varieties(id);
ALTER TABLE public.cross_programs ADD CONSTRAINT cross_programs_male_parent_id_fkey FOREIGN KEY (male_parent_id) REFERENCES public.varieties(id);


-- public.crosses foreign keys

ALTER TABLE public.crosses ADD CONSTRAINT crosses_greenhouse_table_id_fkey FOREIGN KEY (greenhouse_table_id) REFERENCES public.greenhouse_tables(id) ON DELETE SET NULL;
ALTER TABLE public.crosses ADD CONSTRAINT crosses_parcelle_id_fkey FOREIGN KEY (parcelle_id) REFERENCES public.parcelles(id) ON DELETE SET NULL;
ALTER TABLE public.crosses ADD CONSTRAINT crosses_pollen_lot_id_fkey FOREIGN KEY (pollen_lot_id) REFERENCES public.pollen_lots(id) ON DELETE SET NULL;
ALTER TABLE public.crosses ADD CONSTRAINT crosses_pollen_parent_id_fkey FOREIGN KEY (pollen_parent_id) REFERENCES public.rose_varieties(id);
ALTER TABLE public.crosses ADD CONSTRAINT crosses_seed_parent_id_fkey FOREIGN KEY (seed_parent_id) REFERENCES public.rose_varieties(id);
ALTER TABLE public.crosses ADD CONSTRAINT crosses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.field_interventions foreign keys

ALTER TABLE public.field_interventions ADD CONSTRAINT field_interventions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.field_programs(id) ON DELETE CASCADE;
ALTER TABLE public.field_interventions ADD CONSTRAINT field_interventions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.field_observations foreign keys

ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_greenhouse_id_fkey FOREIGN KEY (greenhouse_id) REFERENCES public.greenhouses(id) ON DELETE CASCADE;
ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_parcelle_id_fkey FOREIGN KEY (parcelle_id) REFERENCES public.parcelles(id) ON DELETE CASCADE;
ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.field_plantings(id) ON DELETE CASCADE;
ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_seedling_id_fkey FOREIGN KEY (seedling_id) REFERENCES public.seedlings(id) ON DELETE CASCADE;
ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.varieties(id) ON DELETE SET NULL;
ALTER TABLE public.field_observations ADD CONSTRAINT field_observations_weather_daily_id_fkey FOREIGN KEY (weather_daily_id) REFERENCES public.weather_daily(id) ON DELETE RESTRICT;


-- public.field_plantings foreign keys

ALTER TABLE public.field_plantings ADD CONSTRAINT field_plantings_greenhouse_table_id_fkey FOREIGN KEY (greenhouse_table_id) REFERENCES public.greenhouse_tables(id) ON DELETE CASCADE;
ALTER TABLE public.field_plantings ADD CONSTRAINT field_plantings_parcelle_id_fkey FOREIGN KEY (parcelle_id) REFERENCES public.parcelles(id) ON DELETE CASCADE;
ALTER TABLE public.field_plantings ADD CONSTRAINT field_plantings_seedling_id_fkey FOREIGN KEY (seedling_id) REFERENCES public.seedlings(id) ON DELETE CASCADE;
ALTER TABLE public.field_plantings ADD CONSTRAINT field_plantings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.field_plantings ADD CONSTRAINT field_plantings_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.varieties(id) ON DELETE CASCADE;


-- public.field_programs foreign keys

ALTER TABLE public.field_programs ADD CONSTRAINT field_programs_greenhouse_id_fkey FOREIGN KEY (greenhouse_id) REFERENCES public.greenhouses(id) ON DELETE CASCADE;
ALTER TABLE public.field_programs ADD CONSTRAINT field_programs_parcelle_id_fkey FOREIGN KEY (parcelle_id) REFERENCES public.parcelles(id) ON DELETE CASCADE;
ALTER TABLE public.field_programs ADD CONSTRAINT field_programs_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.field_plantings(id) ON DELETE CASCADE;
ALTER TABLE public.field_programs ADD CONSTRAINT field_programs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.greenhouse_tables foreign keys

ALTER TABLE public.greenhouse_tables ADD CONSTRAINT greenhouse_tables_greenhouse_id_fkey FOREIGN KEY (greenhouse_id) REFERENCES public.greenhouses(id) ON DELETE CASCADE;


-- public.greenhouses foreign keys

ALTER TABLE public.greenhouses ADD CONSTRAINT greenhouses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.greenhouses ADD CONSTRAINT greenhouses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.harvested_seeds foreign keys

ALTER TABLE public.harvested_seeds ADD CONSTRAINT harvested_seeds_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.crosses(id) ON DELETE CASCADE;
ALTER TABLE public.harvested_seeds ADD CONSTRAINT harvested_seeds_fruit_id_fkey FOREIGN KEY (fruit_id) REFERENCES public.cross_fruits(id) ON DELETE CASCADE;
ALTER TABLE public.harvested_seeds ADD CONSTRAINT harvested_seeds_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.harvests foreign keys

ALTER TABLE public.harvests ADD CONSTRAINT harvests_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.cross_programs(id) ON DELETE CASCADE;


-- public.hip_harvests foreign keys

ALTER TABLE public.hip_harvests ADD CONSTRAINT hip_harvests_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.crosses(id) ON DELETE CASCADE;
ALTER TABLE public.hip_harvests ADD CONSTRAINT hip_harvests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.parcelles foreign keys

ALTER TABLE public.parcelles ADD CONSTRAINT parcelles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.parent_alerts foreign keys

ALTER TABLE public.parent_alerts ADD CONSTRAINT parent_alerts_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.crosses(id) ON DELETE CASCADE;
ALTER TABLE public.parent_alerts ADD CONSTRAINT parent_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.parent_attributes foreign keys

ALTER TABLE public.parent_attributes ADD CONSTRAINT parent_attributes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.parent_attributes ADD CONSTRAINT parent_attributes_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.varieties(id) ON DELETE CASCADE;


-- public.pollen_batches foreign keys

ALTER TABLE public.pollen_batches ADD CONSTRAINT pollen_batches_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.varieties(id) ON DELETE CASCADE;


-- public.pollen_lots foreign keys

ALTER TABLE public.pollen_lots ADD CONSTRAINT pollen_lots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.pollinations foreign keys

ALTER TABLE public.pollinations ADD CONSTRAINT pollinations_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.cross_programs(id) ON DELETE CASCADE;


-- public.profiles foreign keys

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.seedling_evaluations foreign keys

ALTER TABLE public.seedling_evaluations ADD CONSTRAINT seedling_evaluations_seedling_id_fkey FOREIGN KEY (seedling_id) REFERENCES public.seedlings(id) ON DELETE CASCADE;


-- public.seedlings foreign keys

ALTER TABLE public.seedlings ADD CONSTRAINT seedlings_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.sowing_batches(id);
ALTER TABLE public.seedlings ADD CONSTRAINT seedlings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.seedlings ADD CONSTRAINT seedlings_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.cross_programs(id) ON DELETE CASCADE;
ALTER TABLE public.seedlings ADD CONSTRAINT seedlings_fruit_id_fkey FOREIGN KEY (fruit_id) REFERENCES public.cross_fruits(id) ON DELETE CASCADE;
ALTER TABLE public.seedlings ADD CONSTRAINT seedlings_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.greenhouse_tables(id);
ALTER TABLE public.seedlings ADD CONSTRAINT seedlings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.sensors foreign keys

ALTER TABLE public.sensors ADD CONSTRAINT sensors_greenhouse_id_fkey FOREIGN KEY (greenhouse_id) REFERENCES public.greenhouses(id) ON DELETE CASCADE;
ALTER TABLE public.sensors ADD CONSTRAINT sensors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.sowing_batches foreign keys

ALTER TABLE public.sowing_batches ADD CONSTRAINT sowing_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.sowing_batches ADD CONSTRAINT sowing_batches_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.cross_programs(id) ON DELETE CASCADE;
ALTER TABLE public.sowing_batches ADD CONSTRAINT sowing_batches_fruit_id_fkey FOREIGN KEY (fruit_id) REFERENCES public.cross_fruits(id) ON DELETE CASCADE;
ALTER TABLE public.sowing_batches ADD CONSTRAINT sowing_batches_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.greenhouse_tables(id);
ALTER TABLE public.sowing_batches ADD CONSTRAINT sowing_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.support_messages foreign keys

ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- public.treatments foreign keys

ALTER TABLE public.treatments ADD CONSTRAINT treatments_cross_id_fkey FOREIGN KEY (cross_id) REFERENCES public.crosses(id) ON DELETE CASCADE;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.user_profiles foreign keys

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.user_settings foreign keys

ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- public.varieties foreign keys

ALTER TABLE public.varieties ADD CONSTRAINT varieties_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- public.varieties_photos foreign keys

ALTER TABLE public.varieties_photos ADD CONSTRAINT varieties_photos_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.varieties(id) ON DELETE CASCADE;


-- public.weather_daily foreign keys

ALTER TABLE public.weather_daily ADD CONSTRAINT weather_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;



-- DROP FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

-- Permissions

ALTER FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) TO public;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal) TO service_role;

-- DROP FUNCTION public.gin_extract_value_trgm(text, internal);

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

-- Permissions

ALTER FUNCTION public.gin_extract_value_trgm(text, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO public;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO service_role;

-- DROP FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

-- Permissions

ALTER FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) TO public;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal) TO service_role;

-- DROP FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

-- Permissions

ALTER FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) TO public;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal) TO service_role;

-- DROP FUNCTION public.gtrgm_compress(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_compress(internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO service_role;

-- DROP FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal) TO service_role;

-- DROP FUNCTION public.gtrgm_decompress(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_decompress(internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO service_role;

-- DROP FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal) TO service_role;

-- DROP FUNCTION public.gtrgm_in(cstring);

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_in(cstring) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO public;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO service_role;

-- DROP FUNCTION public.gtrgm_options(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_options(internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO service_role;

-- DROP FUNCTION public.gtrgm_out(gtrgm);

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_out(gtrgm) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_out(gtrgm) TO public;
GRANT ALL ON FUNCTION public.gtrgm_out(gtrgm) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_out(gtrgm) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_out(gtrgm) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_out(gtrgm) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_out(gtrgm) TO service_role;

-- DROP FUNCTION public.gtrgm_penalty(internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_penalty(internal, internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO service_role;

-- DROP FUNCTION public.gtrgm_picksplit(internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_picksplit(internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO service_role;

-- DROP FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal) TO service_role;

-- DROP FUNCTION public.gtrgm_union(internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

-- Permissions

ALTER FUNCTION public.gtrgm_union(internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO public;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO service_role;

-- DROP FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  INSERT INTO user_settings (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT ALL ON FUNCTION public.handle_new_user() TO public;
GRANT ALL ON FUNCTION public.handle_new_user() TO postgres;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

-- DROP FUNCTION public.immutable_unaccent(text);

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select public.unaccent('public.unaccent'::regdictionary, $1);
$function$
;

-- Permissions

ALTER FUNCTION public.immutable_unaccent(text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO public;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO postgres;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO anon;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO authenticated;
GRANT ALL ON FUNCTION public.immutable_unaccent(text) TO service_role;

-- DROP FUNCTION public.search_varieties(text, _text, _text, int4, int4);

CREATE OR REPLACE FUNCTION public.search_varieties(p_search text DEFAULT NULL::text, p_type_filters text[] DEFAULT NULL::text[], p_colors text[] DEFAULT NULL::text[], p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, commercial_name text, registration_name text, obtenteur text, adr_label boolean, type text, color text, flowering text, fragrance text, parents text, description text, photo_url text, details jsonb, created_by uuid, total_count bigint)
 LANGUAGE sql
 STABLE
AS $function$
    WITH filtered AS (
        SELECT
            v.id,
            v.name,
            v.commercial_name,
            v.registration_name,
            v.obtenteur,
            v.adr_label,
            v.type,
            v.color,
            v.flowering,
            v.fragrance,
            v.parents,
            v.description,
            COALESCE(v.photo_url, vp.photo_url) AS photo_url,
            v.details,
            v.created_by
        FROM varieties v
        LEFT JOIN LATERAL (
            SELECT vp.photo_url
            FROM varieties_photos vp
            WHERE vp.name = v.name
            LIMIT 1
        ) vp ON true
        WHERE (p_search IS NULL OR 
               v.name ILIKE '%' || p_search || '%' OR 
               v.commercial_name ILIKE '%' || p_search || '%' OR
               v.registration_name ILIKE '%' || p_search || '%')
          AND (p_type_filters IS NULL OR v.type = ANY(p_type_filters))
          AND (p_colors IS NULL OR v.color = ANY(p_colors))
    )
    SELECT f.id, f.name, f.commercial_name, f.registration_name, f.obtenteur,
           f.adr_label, f.type, f.color, f.flowering, f.fragrance, f.parents,
           f.description, f.photo_url, f.details, f.created_by, COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.name
    LIMIT p_limit OFFSET p_offset;
$function$
;

-- Permissions

ALTER FUNCTION public.search_varieties(text, _text, _text, int4, int4) OWNER TO postgres;
GRANT ALL ON FUNCTION public.search_varieties(text, _text, _text, int4, int4) TO public;
GRANT ALL ON FUNCTION public.search_varieties(text, _text, _text, int4, int4) TO postgres;
GRANT ALL ON FUNCTION public.search_varieties(text, _text, _text, int4, int4) TO anon;
GRANT ALL ON FUNCTION public.search_varieties(text, _text, _text, int4, int4) TO authenticated;
GRANT ALL ON FUNCTION public.search_varieties(text, _text, _text, int4, int4) TO service_role;

-- DROP FUNCTION public.set_limit(float4);

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

-- Permissions

ALTER FUNCTION public.set_limit(float4) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.set_limit(float4) TO public;
GRANT ALL ON FUNCTION public.set_limit(float4) TO supabase_admin;
GRANT ALL ON FUNCTION public.set_limit(float4) TO postgres;
GRANT ALL ON FUNCTION public.set_limit(float4) TO anon;
GRANT ALL ON FUNCTION public.set_limit(float4) TO authenticated;
GRANT ALL ON FUNCTION public.set_limit(float4) TO service_role;

-- DROP FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$
;

-- Permissions

ALTER FUNCTION public.set_updated_at() OWNER TO postgres;
GRANT ALL ON FUNCTION public.set_updated_at() TO public;
GRANT ALL ON FUNCTION public.set_updated_at() TO postgres;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

-- DROP FUNCTION public.show_limit();

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

-- Permissions

ALTER FUNCTION public.show_limit() OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.show_limit() TO public;
GRANT ALL ON FUNCTION public.show_limit() TO supabase_admin;
GRANT ALL ON FUNCTION public.show_limit() TO postgres;
GRANT ALL ON FUNCTION public.show_limit() TO anon;
GRANT ALL ON FUNCTION public.show_limit() TO authenticated;
GRANT ALL ON FUNCTION public.show_limit() TO service_role;

-- DROP FUNCTION public.show_trgm(text);

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

-- Permissions

ALTER FUNCTION public.show_trgm(text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.show_trgm(text) TO public;
GRANT ALL ON FUNCTION public.show_trgm(text) TO supabase_admin;
GRANT ALL ON FUNCTION public.show_trgm(text) TO postgres;
GRANT ALL ON FUNCTION public.show_trgm(text) TO anon;
GRANT ALL ON FUNCTION public.show_trgm(text) TO authenticated;
GRANT ALL ON FUNCTION public.show_trgm(text) TO service_role;

-- DROP FUNCTION public.similarity(text, text);

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

-- Permissions

ALTER FUNCTION public.similarity(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.similarity(text, text) TO public;
GRANT ALL ON FUNCTION public.similarity(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION public.similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity(text, text) TO service_role;

-- DROP FUNCTION public.similarity_dist(text, text);

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

-- Permissions

ALTER FUNCTION public.similarity_dist(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO public;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO postgres;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO service_role;

-- DROP FUNCTION public.similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

-- Permissions

ALTER FUNCTION public.similarity_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO public;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO service_role;

-- DROP FUNCTION public.strict_word_similarity(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

-- Permissions

ALTER FUNCTION public.strict_word_similarity(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO public;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO service_role;

-- DROP FUNCTION public.strict_word_similarity_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

-- Permissions

ALTER FUNCTION public.strict_word_similarity_commutator_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO public;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO service_role;

-- DROP FUNCTION public.strict_word_similarity_dist_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

-- Permissions

ALTER FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO public;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO service_role;

-- DROP FUNCTION public.strict_word_similarity_dist_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

-- Permissions

ALTER FUNCTION public.strict_word_similarity_dist_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO public;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO service_role;

-- DROP FUNCTION public.strict_word_similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

-- Permissions

ALTER FUNCTION public.strict_word_similarity_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO public;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO service_role;

-- DROP FUNCTION public.sync_harvested_seeds();

CREATE OR REPLACE FUNCTION public.sync_harvested_seeds()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clean_name text := regexp_replace(new.fruit_name, '-+$', '');
  v_harvest_year integer := coalesce(new.harvest_year, extract(year from now())::integer);
  v_batch_id uuid;
begin
  -- Graines (traçabilité fine, module Croisement).
  delete from public.harvested_seeds
  where fruit_id = new.id and seed_number > greatest(new.seed_count, 0);

  if new.seed_count > 0 then
    insert into public.harvested_seeds (user_id, fruit_id, cross_id, seed_name, seed_number, harvest_year, status, greenhouse_id, greenhouse_table_id)
    select new.user_id, new.id, new.cross_id,
      v_clean_name || '-' || n || '-' || v_harvest_year,
      n, v_harvest_year, 'à semer',
      new.greenhouse_id, new.greenhouse_table_id
    from generate_series(1, new.seed_count) as n
    on conflict (fruit_id, seed_number) do update set
      seed_name = excluded.seed_name,
      cross_id = excluded.cross_id,
      harvest_year = excluded.harvest_year,
      greenhouse_id = excluded.greenhouse_id,
      greenhouse_table_id = excluded.greenhouse_table_id;
  end if;

  -- Pont vers la Serre : un lot de semis par fruit récolté.
  if new.seed_count > 0 then
    insert into public.sowing_batches (
      user_id, cross_id, fruit_id, code, fruit_code, sowing_date, seed_count,
      original_seed_count, table_id
    )
    values (
      new.user_id, new.cross_id, new.id, v_clean_name, v_clean_name,
      coalesce(new.harvest_date, current_date),
      new.seed_count, new.seed_count, new.greenhouse_table_id
    )
    on conflict (fruit_id) where fruit_id is not null do update set
      code = excluded.code,
      seed_count = excluded.seed_count,
      table_id = excluded.table_id,
      sowing_date = excluded.sowing_date
    returning id into v_batch_id;

    -- Un semis par graine, rattaché directement au croisement.
    delete from public.seedlings
    where fruit_id = new.id and seed_code not in (
      select v_clean_name || '-' || n || '-' || v_harvest_year from generate_series(1, new.seed_count) as n
    );

    insert into public.seedlings (
      user_id, cross_id, fruit_id, batch_id, fruit_code, seed_code, code, index,
      table_id, sowing_date, status, evaluation_status
    )
    select
      new.user_id, new.cross_id, new.id, v_batch_id, v_clean_name,
      v_clean_name || '-' || n || '-' || v_harvest_year,
      v_clean_name || '-' || n || '-' || v_harvest_year, n,
      new.greenhouse_table_id, coalesce(new.harvest_date, current_date),
      'observing', 'Évaluation'
    from generate_series(1, new.seed_count) as n
    on conflict (user_id, seed_code) where seed_code is not null do update set
      table_id = excluded.table_id,
      batch_id = excluded.batch_id,
      fruit_id = excluded.fruit_id;
  else
    delete from public.seedlings where fruit_id = new.id;
    delete from public.sowing_batches where fruit_id = new.id;
  end if;

  return new;
end;
$function$
;

-- Permissions

ALTER FUNCTION public.sync_harvested_seeds() OWNER TO postgres;
GRANT ALL ON FUNCTION public.sync_harvested_seeds() TO public;
GRANT ALL ON FUNCTION public.sync_harvested_seeds() TO postgres;
GRANT ALL ON FUNCTION public.sync_harvested_seeds() TO anon;
GRANT ALL ON FUNCTION public.sync_harvested_seeds() TO authenticated;
GRANT ALL ON FUNCTION public.sync_harvested_seeds() TO service_role;

-- DROP FUNCTION public.trg_fruit_within_flower_count();

CREATE OR REPLACE FUNCTION public.trg_fruit_within_flower_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
begin
  select flower_count into v_count from public.crosses where id = new.cross_id;
  if v_count is null then
    raise exception 'Le nombre de fleurs pollinisées de ce lot n''est pas encore validé.';
  end if;
  if new.flower_index < 1 or new.flower_index > v_count then
    raise exception 'Le fruit n° % dépasse le nombre de fleurs pollinisées (%).', new.flower_index, v_count;
  end if;
  return new;
end;
$function$
;

-- Permissions

ALTER FUNCTION public.trg_fruit_within_flower_count() OWNER TO postgres;
GRANT ALL ON FUNCTION public.trg_fruit_within_flower_count() TO public;
GRANT ALL ON FUNCTION public.trg_fruit_within_flower_count() TO postgres;
GRANT ALL ON FUNCTION public.trg_fruit_within_flower_count() TO anon;
GRANT ALL ON FUNCTION public.trg_fruit_within_flower_count() TO authenticated;
GRANT ALL ON FUNCTION public.trg_fruit_within_flower_count() TO service_role;

-- DROP FUNCTION public.trg_lock_flower_count();

CREATE OR REPLACE FUNCTION public.trg_lock_flower_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.flower_count is not null
     and new.flower_count is distinct from old.flower_count
     and exists (select 1 from public.cross_fruits where cross_id = new.id) then
    raise exception 'Le nombre de fleurs pollinisées est déjà validé pour ce lot et ne peut plus être modifié.';
  end if;
  return new;
end;
$function$
;

-- Permissions

ALTER FUNCTION public.trg_lock_flower_count() OWNER TO postgres;
GRANT ALL ON FUNCTION public.trg_lock_flower_count() TO public;
GRANT ALL ON FUNCTION public.trg_lock_flower_count() TO postgres;
GRANT ALL ON FUNCTION public.trg_lock_flower_count() TO anon;
GRANT ALL ON FUNCTION public.trg_lock_flower_count() TO authenticated;
GRANT ALL ON FUNCTION public.trg_lock_flower_count() TO service_role;

-- DROP FUNCTION public.unaccent(text);

CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

-- Permissions

ALTER FUNCTION public.unaccent(text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent(text) TO public;
GRANT ALL ON FUNCTION public.unaccent(text) TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent(text) TO postgres;
GRANT ALL ON FUNCTION public.unaccent(text) TO anon;
GRANT ALL ON FUNCTION public.unaccent(text) TO authenticated;
GRANT ALL ON FUNCTION public.unaccent(text) TO service_role;

-- DROP FUNCTION public.unaccent(regdictionary, text);

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

-- Permissions

ALTER FUNCTION public.unaccent(regdictionary, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent(regdictionary, text) TO public;
GRANT ALL ON FUNCTION public.unaccent(regdictionary, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent(regdictionary, text) TO postgres;
GRANT ALL ON FUNCTION public.unaccent(regdictionary, text) TO anon;
GRANT ALL ON FUNCTION public.unaccent(regdictionary, text) TO authenticated;
GRANT ALL ON FUNCTION public.unaccent(regdictionary, text) TO service_role;

-- DROP FUNCTION public.unaccent_init(internal);

CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$
;

-- Permissions

ALTER FUNCTION public.unaccent_init(internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent_init(internal) TO public;
GRANT ALL ON FUNCTION public.unaccent_init(internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent_init(internal) TO postgres;
GRANT ALL ON FUNCTION public.unaccent_init(internal) TO anon;
GRANT ALL ON FUNCTION public.unaccent_init(internal) TO authenticated;
GRANT ALL ON FUNCTION public.unaccent_init(internal) TO service_role;

-- DROP FUNCTION public.unaccent_lexize(internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$
;

-- Permissions

ALTER FUNCTION public.unaccent_lexize(internal, internal, internal, internal) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent_lexize(internal, internal, internal, internal) TO public;
GRANT ALL ON FUNCTION public.unaccent_lexize(internal, internal, internal, internal) TO supabase_admin;
GRANT ALL ON FUNCTION public.unaccent_lexize(internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.unaccent_lexize(internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.unaccent_lexize(internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.unaccent_lexize(internal, internal, internal, internal) TO service_role;

-- DROP FUNCTION public.validate_field_observation_integrity();

CREATE OR REPLACE FUNCTION public.validate_field_observation_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.planting_id is not null and new.weather_daily_id is null then
    return new;
  end if;
  if new.weather_daily_id is not null and not exists (
       select 1 from public.weather_daily w
       where w.id = new.weather_daily_id
         and w.user_id = new.user_id
         and w.date = new.observation_date) then
    raise exception 'La météo doit appartenir à l''utilisateur et correspondre à la date d''observation';
  end if;
  if new.parcelle_id is not null and not exists (
       select 1 from public.parcelles p
       where p.id = new.parcelle_id and p.user_id = new.user_id) then
    raise exception 'La parcelle doit appartenir au même utilisateur';
  end if;
  return new;
end; $function$
;

-- Permissions

ALTER FUNCTION public.validate_field_observation_integrity() OWNER TO postgres;
GRANT ALL ON FUNCTION public.validate_field_observation_integrity() TO public;
GRANT ALL ON FUNCTION public.validate_field_observation_integrity() TO postgres;
GRANT ALL ON FUNCTION public.validate_field_observation_integrity() TO anon;
GRANT ALL ON FUNCTION public.validate_field_observation_integrity() TO authenticated;
GRANT ALL ON FUNCTION public.validate_field_observation_integrity() TO service_role;

-- DROP FUNCTION public.word_similarity(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

-- Permissions

ALTER FUNCTION public.word_similarity(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO public;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO service_role;

-- DROP FUNCTION public.word_similarity_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

-- Permissions

ALTER FUNCTION public.word_similarity_commutator_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO public;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO service_role;

-- DROP FUNCTION public.word_similarity_dist_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

-- Permissions

ALTER FUNCTION public.word_similarity_dist_commutator_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO public;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO service_role;

-- DROP FUNCTION public.word_similarity_dist_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

-- Permissions

ALTER FUNCTION public.word_similarity_dist_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO public;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO service_role;

-- DROP FUNCTION public.word_similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;

-- Permissions

ALTER FUNCTION public.word_similarity_op(text, text) OWNER TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO public;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO supabase_admin;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO service_role;


-- Permissions

GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT TRIGGER, MAINTAIN, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT, UPDATE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;