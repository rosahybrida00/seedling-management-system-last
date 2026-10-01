// Constantes et types partagés du module Croisement (extraits de
// app/croisement/page.tsx pour alléger le fichier de page).

// ---------------------------------------------------------------------------
// Architecture : Couple (parents) -> Lot (une pollinisation, table `crosses`)
// -> Fruit (une fleur pollinisée, table `cross_fruits`) -> Graine (table
// `harvested_seeds`). Navigation à 3 niveaux, en mode Focus : cliquer sur
// une carte l'isole à l'écran ; un bouton retour ramène à la liste. Plus de
// boutons Éditer/Supprimer visibles en permanence : l'édition se fait en
// cliquant directement sur un champ (Entrée pour valider), seule une
// icône de corbeille discrète reste pour supprimer.
// ---------------------------------------------------------------------------

export const PHENOLOGY_STAGES = [
  "Ovaire noué",
  "Grossissement du fruit",
  "Changement de couleur",
  "Ramollissement / début de maturation",
  "Fruit à maturité",
]

// Règle globale de l'appli : cases à cocher / choix prédéfinis partout,
// pour faciliter les bilans généraux ; seule exception, un champ Remarque
// en texte libre.
export const CALIBRE_STAGE_OPTIONS = ["Amorce (<5mm)", "Petit (5-10mm)", "Moyen (10-15mm)", "Gros (15-20mm)", "Très gros (>20mm)"]
export const COLOR_OPTIONS = ["Jaune", "Orange", "Rouge"]
export const BEHAVIOR_OPTIONS = ["Normal", "Flétrissement partiel", "Taches / lésions", "Chute imminente", "Attaque insectes/oiseaux"]

// Le pistil (organe reproducteur femelle) comprend le stigmate (capture le
// pollen), le style (relie le stigmate à l'ovaire) et l'ovaire — c'est lui
// qui, après fécondation, se transforme en fruit (d'où "ovaire noué").
export const PISTIL_GROUPS: Array<{ title: string; options: Record<string, string> }> = [
  {
    title: "Le stigmate (réception du pollen et état de réceptivité)",
    options: {
      stigmate_receptif: "Réceptif / Humide (brillant, prêt à capturer le pollen)",
      stigmate_asseche: "Asséché / Bruni prématurément (compromet la germination du pollen)",
      stigmate_parasites: "Attaque de parasites / Champignons (moisissure, pourriture)",
      stigmate_absence: "Absence ou malformation",
    },
  },
  {
    title: "Le style (canal de progression du tube pollinique)",
    options: {
      style_sain: "Sain / Bien érigé",
      style_fletri: "Flétri / Cassé",
      style_necrose: "Taches nécrotiques ou lésions",
      style_insectes: "Attaque d'insectes (ex : piqûres de parasites)",
    },
  },
  {
    title: "L'ovaire (base du pistil)",
    options: {
      ovaire_sain: "Sain et bien formé (aspect turgescent, vert, sans défaut visible)",
      ovaire_malforme: "Malformé / Asymétrique (anomalie de développement de la fleur)",
      ovaire_sousdeveloppe: "Sous-développé / Trop petit (risque d'échec de la nouaison)",
      ovaire_lesions: "Présence de lésions / blessures (traces de manipulation ou de frottement)",
    },
  },
]
export const PISTIL_OPTIONS: Record<string, string> = Object.fromEntries(PISTIL_GROUPS.flatMap((g) => Object.entries(g.options)))

export interface Cross {
  id: string
  code: string
  seed_parent: string | null
  pollen_parent: string | null
  pollination_date: string | null
  remarks: string
  created_at: string
  base_syllable: string | null
  lot_letter: string | null
  climate_data: Record<string, unknown> | null
  flower_count: number | null
  pollen_type: string | null
  pollen_lot_id: string | null
  location: string | null
  containers: string | null
  pistil_checklist: string[]
}

export interface PollenLot {
  id: string
  lot_number: string
  rose_name: string | null
  harvest_date: string | null
  weather_data: Record<string, any> | null
  anther_quality: string | null
  dehiscence: string | null
  conservation_mode: string | null
  remarks: string
  created_at: string
}

export interface Treatment {
  id: string
  cross_id: string
  product_name: string
  treatment_type: string | null
  repetition_count: number
  applied_at: string
  notes: string | null
}

export interface HarvestedSeed {
  id: string
  fruit_id: string
  seed_name: string
  seed_number: number
  greenhouse_table_id: string | null
}

export interface PhenologyObservation {
  date: string
  stages: string[]
  calibre: string
  couleur: string
  comportement: string[]
  remarque: string
}

export interface CrossFruit {
  id: string
  cross_id: string
  fruit_name: string
  flower_index: number
  status: "suivi" | "récolté" | "vide" | "avorté"
  seed_count: number
  checklist: { observations?: PhenologyObservation[] } | null
  climate_data: Record<string, unknown> | null
  harvest_date: string | null
  fruit_calibre: string | null
  maturation: string | null
  seed_extraction: string | null
  failure_causes: string[]
}

export interface VarietySuggestion {
  id: string
  name: string
  commercial_name: string | null
  source: "catalogue" | "semis"
}

export const TREATMENT_TYPE_LABELS: Record<string, string> = {
  naturelle: "Naturel",
  biologique: "Bio",
  synthese: "Synthèse",
}

