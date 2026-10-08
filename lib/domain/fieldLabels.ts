// ---------------------------------------------------------------------------
// Listes de cases à cocher du module Serres & Parcelles (observations de
// terrain). Conformes à la règle globale de l'appli : choix prédéfinis
// partout, seule "remarque" reste en texte libre.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Suivi des lots de graines (module Serre, après récolte). Liste de
// méthodes PROVISOIRE — à ajuster dès qu'elle sera précisée ; un simple
// changement ici suffit, sans nouvelle migration (stocké en text[]).
// ---------------------------------------------------------------------------

export const STRATIFICATION_METHOD_LABELS: Record<string, string> = {
  froid_refrigerateur: "Stratification au froid (réfrigérateur)",
  exterieur_hiver: "Semis direct extérieur (froid naturel)",
  sable_humide: "Sable humide",
  perlite_humide: "Perlite / vermiculite humide",
  eau_oxygenee: "Trempage eau oxygénée (H2O2)",
  acide_gibberellique: "Trempage acide gibbérellique (AG3)",
  aucune: "Aucune stratification",
}

export const GERMINATED_SEEDLING_STATUSES = [
  "Germé",
  "Repiqué",
  "En croissance",
  "Floraison",
  "Retenu",
  "Écarté",
  "Mort",
] as const

export const DISEASE_PRESSURE_LABELS: Record<string, string> = {
  oidium: "Oïdium",
  mildiou: "Mildiou",
  marsonia: "Marsonia (taches noires)",
  rouille: "Rouille",
  botrytis: "Botrytis",
  autre_maladie: "Autre",
}

export const PEST_LABELS: Record<string, string> = {
  pucerons: "Pucerons",
  cochenilles: "Cochenilles",
  thrips: "Thrips",
  araignees_rouges: "Araignées rouges",
  altises: "Altises",
  autre_ravageur: "Autre",
}

export const CLIMATE_BEHAVIOR_LABELS: Record<string, string> = {
  brulures_foliaires: "Brûlures foliaires (soleil)",
  stress_hydrique: "Stress hydrique (sécheresse)",
  sensibilite_humidite: "Sensibilité humidité / asphyxie",
  retention_chlorose: "Rétention / Chlorose",
  resistance_averee: "Résistance avérée",
}

export const FIELD_TREATMENT_LABELS: Record<string, string> = {
  bicarbonate_sodium: "Bicarbonate de sodium",
  soufre: "Soufre",
  bouillie_bordelaise: "Bouillie bordelaise",
  insecticide_bio: "Insecticide biologique",
  fongicide_bio: "Fongicide biologique",
  savon_noir: "Savon noir",
  purin_ortie: "Purin d'ortie",
  purin_prele: "Purin de prêle",
  huile_neem: "Huile de neem",
  remede_phytotherapeutique: "Remède phytothérapeutique traditionnel",
  chimique_synthese: "Produit chimique de synthèse",
  autre_traitement: "Autre",
}

export const FERTILIZER_LABELS: Record<string, string> = {
  compost_mur: "Compost mûr",
  fumier_composte: "Fumier composté",
  engrais_rosiers: "Engrais organique pour rosiers",
  amendement_humifere: "Amendement humifère",
  amendement_potassique_phosphore: "Amendement potassique et phosphoré",
  amendement_mineral: "Amendement minéral de fin de cycle",
}

export const TREATMENT_REACTION_LABELS: Record<string, string> = {
  tolerance_parfaite: "Tolérance parfaite",
  phytotoxicite_legere: "Phytotoxicité légère (jaunissement)",
  phytotoxicite_forte: "Phytotoxicité forte (brûlure)",
  efficacite_rapide: "Efficacité rapide",
  aucune_efficacite: "Aucune efficacité",
}

export const SOIL_TYPE_LABELS: Record<string, string> = {
  argileux: "Argileux",
  sableux: "Sableux",
  limoneux: "Limoneux",
  calcaire: "Calcaire",
  humifere: "Humifère",
  drainage_bon: "Bon drainage",
  drainage_faible: "Drainage faible",
}

export const PROGRAM_TYPE_LABELS: Record<string, string> = {
  curatif: "Curatif",
  preventif: "Préventif",
  fertilisation: "Fertilisation de fond",
  hygiene: "Hygiène",
}

// Type de terreau pour semer un lot de graines (colonne sowing_batches.substrate).
// Liste provisoire, ajustable sans migration.
export const SUBSTRATE_LABELS: Record<string, string> = {
  terreau_semis: "Terreau de semis",
  terreau_universel: "Terreau universel",
  terreau_rosiers: "Terreau pour rosiers",
  terreau_sable: "Mélange terreau + sable",
  tourbe_perlite: "Mélange tourbe + perlite",
  sable: "Sable",
  perlite_vermiculite: "Perlite / vermiculite",
  terre_jardin: "Terre de jardin",
}

// Type de culture d'un lot semé.
export const CULTURE_TYPE_LABELS: Record<string, string> = {
  pot: "Contenant / pot",
  pleine_terre: "Pleine terre",
}

export const PROGRAM_RESULT_LABELS: Record<string, string> = {
  amelioration: "Amélioration",
  stationnaire: "Stationnaire",
  echec: "Échec",
}
