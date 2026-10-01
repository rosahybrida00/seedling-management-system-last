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

export interface FieldPlanting {
  id: string
  variety_id: string | null
  seedling_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
  planted_at: string
  plant_count?: number | null
  soil_type?: string | null
  container_type?: string | null
  location_type?: "pot" | "pleine_terre" | null
  notes: string
}

export interface FieldObservation {
  id: string
  planting_id: string
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
}

export type Zone = { kind: "serre"; greenhouse: Greenhouse } | { kind: "parcelle"; parcelle: Parcelle }
export type ZoneStatus = "vert" | "orange" | "rouge"
