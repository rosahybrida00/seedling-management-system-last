// Types partagés du module Serres & Parcelles (extraits de
// app/parcelle/page.tsx pour alléger le fichier de page).

export interface Greenhouse { id: string; name: string }
export interface GreenhouseTable { id: string; greenhouse_id: string; name: string }
export interface Parcelle { id: string; name: string; soil_type: string | null; location: string | null }
export interface VarietyOption {
  id: string
  name: string
  commercialName?: string | null
  obtenteur?: string | null
  type?: string | null
  color?: string | null
  flowering?: string | null
  fragrance?: string | null
  parents?: string | null
  description?: string | null
  photoUrl?: string | null
  source: "catalogue" | "semis"
}

export interface PlantDetails {
  photoUrl: string | null
  description: string | null
  fields: Array<{ label: string; value: string }>
}

export interface SeedLot {
  id: string
  fruit_id: string | null
  cross_id: string
  fruit_code: string | null
  seed_count: number
  original_seed_count: number | null
  sowing_date: string | null
  table_id: string | null
  parcelle_id: string | null
  location_type: "pot" | "pleine_terre" | null
  stratification_methods: string[] | null
  stratification_start_date: string | null
  stratification_end_date: string | null
}

export interface CrossParents {
  id: string
  seed_parent: string | null
  pollen_parent: string | null
}

export interface FieldPlanting {
  id: string
  variety_id: string | null
  seedling_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
  group_id?: string | null
  individual_number?: number | null
  planted_at: string
  plant_count?: number | null
  soil_type?: string | null
  container_type?: string | null
  location_type?: "pot" | "pleine_terre" | null
  notes: string
}

export interface FieldPlantingMove {
  id: string
  planting_id: string
  from_greenhouse_table_id: string | null
  from_parcelle_id: string | null
  to_greenhouse_table_id: string | null
  to_parcelle_id: string | null
  moved_at: string
  notes: string
}

export interface FieldObservation {
  id: string
  planting_id: string
  weather_daily_id?: string | null
  weather_daily?: { temperature: number | null; humidity: number | null; uv_index: number | null } | null
  greenhouse_table_id?: string | null
  parcelle_id?: string | null
  observation_date: string
  intervention_date: string | null
  disease_pressure: string[]
  pests: string[]
  climate_behavior: string[]
  treatment_applied: string[]
  treatment_reaction: string[]
  remarque: string
}

export interface FieldProgram {
  id: string
  planting_id: string | null
  greenhouse_id: string | null
  parcelle_id: string | null
  program_type: "curatif" | "preventif" | "fertilisation"
  product_name: string
  start_date: string
  treatment_codes?: string[] | null
  fertilizer_code?: string | null
  result: string | null
  notes: string
}

export interface FieldIntervention {
  id: string
  program_id: string
  due_date: string | null
  done: boolean
  done_date: string | null
  result: string | null
  notes: string
  weather_daily_id?: string | null
  weather_daily?: { temperature: number | null; humidity: number | null; uv_index: number | null } | null
  greenhouse_id?: string | null
  greenhouse_table_id?: string | null
  parcelle_id?: string | null
}

export type Zone = { kind: "serre"; greenhouse: Greenhouse } | { kind: "parcelle"; parcelle: Parcelle }
export type ZoneStatus = "vert" | "orange" | "rouge"
