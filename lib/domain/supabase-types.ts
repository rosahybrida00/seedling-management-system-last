// ---------------------------------------------------------------------------
// Types métier Supabase — complètent les types existants (types.ts)
// pour le Catalogue des rosiers, le Profil, les Paramètres et les Capteurs.
// Les noms de champs correspondent exactement aux colonnes SQL (snake_case).
// ---------------------------------------------------------------------------

/** Catégorie de rosier dans le catalogue. */
export type RoseCategory = "baptisee" | "lignee" | "evaluation"

export const ROSE_CATEGORIES: readonly RoseCategory[] = [
  "baptisee",
  "lignee",
  "evaluation",
] as const

export const ROSE_CATEGORY_LABELS: Record<RoseCategory, string> = {
  baptisee: "Variété baptisée",
  lignee: "Lignée / Souche parentale",
  evaluation: "En évaluation",
}

/** Rosier du catalogue (public en lecture, édition par le propriétaire). */
export interface Rose {
  id: string
  name: string
  obtenteur: string | null
  type: string | null
  parentage: string | null
  photo_url: string | null
  description: string | null
  category: RoseCategory
  user_id: string | null
  created_at: string
  updated_at: string
}

/** Variété du catalogue (table varieties). */
export interface Variety {
  id: string
  name: string
  obtenteur: string | null
  type: string | null
  parentage: string | null
  description: string | null
  category: RoseCategory
  user_id: string | null
  created_at: string
  updated_at: string
}

/** Photo associée à une variété (table varieties_photos). */
export interface VarietyPhoto {
  id: string
  variety_id: string
  photo_url: string
  is_primary: boolean
  caption: string | null
  created_at: string
}

/** Profil professionnel de l'hybrideur. */
export interface Profile {
  id: string
  obtenteur_name: string | null
  affixe: string | null
  siret: string | null
  city: string | null
  postal_code: string | null
  address: string | null
  avatar_url: string | null
  subscription: "free" | "pro"
  created_at: string
  updated_at: string
}

/** Préférences et seuils d'alerte. */
export interface UserSettings {
  id: string
  theme: "botanical" | "dark" | "light"
  frost_threshold: number
  heat_threshold: number
  units: "metric" | "imperial"
  created_at: string
  updated_at: string
}

/** Capteur IoT appairé en serre. */
export interface Sensor {
  id: string
  user_id: string
  greenhouse_id: string | null
  name: string
  sensor_type: string | null
  last_value: number | null
  last_reading_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Lot de pollen (récolte, évaluation, congélation). */
export interface PollenLot {
  id: string
  user_id: string
  lot_number: string
  rose_name: string | null
  anther_quality: string | null
  dehiscence: string | null
  conservation_mode: string | null
  remarks: string
  created_at: string
  updated_at: string
}

/** Message de support B2B. */
export interface SupportMessage {
  id: string
  user_id: string | null
  subject: string | null
  category: "technical" | "billing" | "dho" | "partnership"
  message: string
  attachment_url: string | null
  status: "open" | "in_progress" | "resolved"
  created_at: string
}

/** Récolte de fruit (cynorrhodon) avec diagnostics Phase 2. */
export interface HipHarvest {
  id: string
  user_id: string
  cross_id: string
  code: string
  harvest_date: string | null
  seed_count: number
  remarks: string
  fruit_calibre: string | null
  maturation: string | null
  avortement_cause: string | null
  seed_extraction: string | null
  created_at: string
  updated_at: string
}

/** Croisement avec nomenclature, climat et traçabilité des graines (N2). */
export interface Cross {
  id: string
  user_id: string
  code: string
  seed_parent: string | null
  pollen_parent: string | null
  pollination_date: string | null
  remarks: string
  base_syllable: string | null
  lot_letter: string | null
  flower_letter: string | null
  climate_data: Record<string, unknown> | null
  status: "En cours" | "Récolté" | "Avorté" | null
  abort_cause: string | null
  harvest_data: Record<string, unknown> | null
  total_seeds: number | null
  germinated_seeds: number | null
  failed_seeds: number | null
  failure_attribution: string | null
  automatic_synthesis: string | null
  free_notes: string | null
  created_at: string
  updated_at: string
}

/** Traitement phytosanitaire lié à un croisement. */
export interface Treatment {
  id: string
  user_id: string
  cross_id: string | null
  product_name: string
  treatment_type: string | null
  repetition_count: number
  applied_at: string
  notes: string | null
  created_at: string
}

/** Semis avec grille d'évaluation Aa1 Phase 2 + traçabilité N2. */
export interface Seedling {
  id: string
  user_id: string
  // Lien direct vers le croisement (nouveau modèle) : n'a plus besoin de
  // passer par un lot de semis pour savoir de quel couple/fruit vient le
  // semis. batch_id/index sont conservés pour les semis créés avant ce
  // changement et restent optionnels.
  cross_id: string
  fruit_code: string | null
  seed_code: string | null
  table_id: string | null
  row: number | null
  position: number | null
  batch_id: string | null
  index: number | null
  code: string
  photo_url: string | null
  status: "Semé" | "Stratifié" | "Germé" | "Repiqué" | "En croissance" | "Floraison" | "Retenu" | "Écarté" | "Mort" | "observing" | "discarded" | "selected"
  remarks: string
  phenotype_vigueur: string | null
  pression_sanitaire: string | null
  traitement: string | null
  motif_elimination: string | null
  critere_selection: string | null
  auto_report: string | null
  seedling_code: string | null
  evaluation_status: "Évaluation" | "Sélectionné" | "Éliminé" | null
  is_promoted_to_variety: boolean | null
  free_notes: string | null
  created_at: string
  updated_at: string
}

/** Données météo affichées dans le bandeau. */
export interface WeatherData {
  temperature: number | null
  humidity: number | null
  uvIndex: number | null
  cloudCover: number | null
  location: string
  source: "gps" | "profile" | "manual"
}

/** Localisation plein air et caractéristiques du sol. */
export interface Parcelle {
  id: string
  user_id: string
  name: string
  latitude: number | null
  longitude: number | null
  city: string | null
  soil_type: string | null
  soil_notes: string | null
  area_m2: number | null
  remarks: string
  created_at: string
  updated_at: string
}

/** Observation reliée à un sujet, une parcelle et la météo du même jour. */
export interface OutdoorObservation {
  id: string
  user_id: string
  parcelle_id: string
  seedling_id: string | null
  variety_id: string | null
  observation_date: string
  weather_daily_id: string
  observation_type: string
  notes: string
  created_at: string
}

export interface RagAgronomicChainRow extends OutdoorObservation {
  parcelle_name: string
  soil_type: string | null
  latitude: number | null
  longitude: number | null
  weather_location: string | null
  temperature: number | null
  humidity: number | null
  uv_index: number | null
}

// --- Phase 2: Labels pour les cases à cocher contextuelles ---

export const ANTHER_QUALITY_LABELS: Record<string, string> = {
  abondantes: "Abondantes et bien développées",
  rares: "Rares / Malformées",
}

export const DEHISCENCE_LABELS: Record<string, string> = {
  excellente: "Excellente libération",
  faible: "Faible libération",
}

export const CONSERVATION_LABELS: Record<string, string> = {
  immediate: "Utilisation immédiate",
  congelation: "Congélation à -18°C",
  sechage: "Séchage préalable",
}

export const FRUIT_CALIBRE_LABELS: Record<string, string> = {
  bien_developpe: "Fruit bien développé",
  atrophie: "Fruit atrophié / Sub-normal",
}

export const MATURATION_LABELS: Record<string, string> = {
  optimale: "Maturation optimale",
  precoce_forcee: "Maturation précoce / Forcée",
}

export const AVORTEMENT_LABELS: Record<string, string> = {
  precoce: "Avortement précoce",
  tardif: "Avortement tardif",
  incompatibilite: "Incompatibilité génétique",
  alteration_pollen: "Altération du pollen",
  stress_thermique: "Stress thermique / Climatique",
  stress_hydrique: "Stress hydrique / Nutritionnel",
  traumatisme: "Traumatisme mécanique",
  attaque_sanitaire: "Attaque sanitaire sur fleur",
}

export const SEED_EXTRACTION_LABELS: Record<string, string> = {
  plein: "Fruit plein (graines denses)",
  partiellement_vide: "Fruit partiellement vide",
  totalement_vide: "Fruit totalement vide / Graines creuses",
}

export const PHENOTYPE_LABELS: Record<string, string> = {
  tres_vigoureux: "Très vigoureux",
  moyenne: "Vigueur moyenne",
  chetif: "Chétif / Rabougri",
}

export const PRESSION_SANITAIRE_LABELS: Record<string, string> = {
  indemne: "Indemne / Tolérant",
  oidium: "Oïdium / Blanc",
  marsonia: "Marsonia / Taches noires",
  mildiou: "Mildiou du rosier",
  rouille: "Rouille",
}

export const TRAITEMENT_LABELS: Record<string, string> = {
  naturelle: "Méthode naturelle",
  biologique: "Produit biologique",
  synthese: "Produit de synthèse",
}

export const MOTIF_ELIMINATION_LABELS: Record<string, string> = {
  sensibilite_sanitaire: "Sensibilité sanitaire excessive",
  defaut_floral: "Défaut floral majeur",
  port_degrade: "Port / Habitus dégradé",
  sterilite: "Stérilité constatée",
}

export const CRITERE_SELECTION_LABELS: Record<string, string> = {
  aptitude_pollen: "Aptitude au pollen",
  remontance_florale: "Remontance florale",
  valeur_ornementale: "Valeur ornementale unique",
}
