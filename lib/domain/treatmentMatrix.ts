// ---------------------------------------------------------------------------
// Matrice des intrants : catégories de produits, et pour chaque problème
// sanitaire, les produits curatifs et préventifs qui lui répondent.
//
// Source : les catégories et exemples donnés par l'utilisateur
//   - Fongicides : soufre, bicarbonate de sodium, bouillie bordelaise, fongicide biologique
//   - Insecticides / acaricides : savon noir, purin d'ortie, insecticide biologique
//     (pyréthrine naturelle), huile de neem
//   - Apports et amendements de fond : fumier composté, compost mûr, engrais organique
// et son calendrier annuel. Tout est regroupé ici pour pouvoir être ajusté en un
// seul endroit, sans migration. Aucune dose n'est codée : elle dépend du produit
// et de l'étiquette.
// ---------------------------------------------------------------------------

export type ProductCategory = "fongicide" | "insecticide" | "stimulant" | "apport" | "autre"

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  fongicide: "Fongicides (contre les champignons)",
  insecticide: "Insecticides / acaricides (contre les ravageurs)",
  stimulant: "Renforcement des défenses",
  apport: "Apports et amendements de fond",
  autre: "Autres produits",
}

/** Ordre d'affichage des catégories dans les listes de choix. */
export const CATEGORY_ORDER: ProductCategory[] = ["fongicide", "insecticide", "stimulant", "apport", "autre"]

export const PRODUCT_CATEGORY: Record<string, ProductCategory> = {
  soufre: "fongicide",
  bicarbonate_sodium: "fongicide",
  bouillie_bordelaise: "fongicide",
  fongicide_bio: "fongicide",
  savon_noir: "insecticide",
  purin_ortie: "insecticide",
  insecticide_bio: "insecticide",
  huile_neem: "insecticide",
  purin_prele: "stimulant",
  remede_phytotherapeutique: "stimulant",
  compost_mur: "apport",
  fumier_composte: "apport",
  engrais_rosiers: "apport",
  amendement_humifere: "apport",
  amendement_potassique_phosphore: "apport",
  amendement_mineral: "apport",
  chimique_synthese: "autre",
  autre_traitement: "autre",
}

export function categoryOf(code: string): ProductCategory {
  return PRODUCT_CATEGORY[code] ?? "autre"
}

/**
 * Produits « génériques » : proposés seulement quand aucun produit précis ne répond
 * au problème (le fongicide ou l'insecticide « de choc » vient en dernier recours).
 */
export const GENERIC_PRODUCTS = new Set(["fongicide_bio", "insecticide_bio"])

export type SignalFamily = "maladie" | "ravageur"

export interface SignalRule {
  family: SignalFamily
  /** Faux : aucune règle précise fournie, les produits viennent de la catégorie. */
  explicit: boolean
  /** Produits curatifs, du plus adapté au moins adapté. */
  curative: string[]
  /** Produits préventifs (conditions à risque, calendrier). */
  preventive: string[]
}

export const SIGNAL_RULES: Record<string, SignalRule> = {
  // Maladies (pressions cryptogamiques) : catégorie Fongicides
  oidium: { family: "maladie", explicit: true, curative: ["soufre", "bicarbonate_sodium", "fongicide_bio"], preventive: ["soufre", "purin_prele"] },
  mildiou: { family: "maladie", explicit: true, curative: ["bouillie_bordelaise", "fongicide_bio"], preventive: ["bouillie_bordelaise", "purin_prele"] },
  marsonia: { family: "maladie", explicit: true, curative: ["bouillie_bordelaise", "fongicide_bio"], preventive: ["bouillie_bordelaise"] },
  rouille: { family: "maladie", explicit: false, curative: ["soufre", "bouillie_bordelaise", "bicarbonate_sodium", "fongicide_bio"], preventive: [] },
  botrytis: { family: "maladie", explicit: false, curative: ["bicarbonate_sodium", "bouillie_bordelaise", "soufre", "fongicide_bio"], preventive: [] },
  autre_maladie: { family: "maladie", explicit: false, curative: ["soufre", "bicarbonate_sodium", "bouillie_bordelaise", "fongicide_bio"], preventive: [] },
  // Ravageurs : catégorie Insecticides / acaricides
  pucerons: { family: "ravageur", explicit: true, curative: ["savon_noir", "insecticide_bio"], preventive: ["purin_ortie", "savon_noir"] },
  thrips: { family: "ravageur", explicit: true, curative: ["savon_noir", "insecticide_bio", "huile_neem"], preventive: [] },
  araignees_rouges: { family: "ravageur", explicit: true, curative: ["soufre", "huile_neem", "savon_noir", "insecticide_bio"], preventive: [] },
  cochenilles: { family: "ravageur", explicit: false, curative: ["huile_neem", "savon_noir", "insecticide_bio"], preventive: [] },
  altises: { family: "ravageur", explicit: false, curative: ["savon_noir", "huile_neem", "insecticide_bio"], preventive: [] },
  autre_ravageur: { family: "ravageur", explicit: false, curative: ["savon_noir", "huile_neem", "insecticide_bio"], preventive: [] },
}

/** Produits de repli par famille, utilisés si un problème est inconnu de la matrice. */
export const FAMILY_FALLBACK: Record<SignalFamily, string[]> = {
  maladie: ["soufre", "bicarbonate_sodium", "bouillie_bordelaise", "fongicide_bio"],
  ravageur: ["savon_noir", "huile_neem", "insecticide_bio"],
}

/** Rappels après la première application (jours), ex. J+7. Ajustable. */
export const CURATIVE_FOLLOW_UP_DAYS = [7]

/**
 * Décalage entre deux produits d'un même plan : deux produits ne sont pas appliqués
 * le même jour (jamais mélangés). Hypothèse de départ à valider.
 */
export const PRODUCT_STAGGER_DAYS = 3

/** Humidité (%) à partir de laquelle un traitement préventif contre le mildiou est suggéré. */
export const HUMIDITY_RISK_PERCENT = 80

export const SIGNAL_FAMILIES: Record<string, SignalFamily> = Object.fromEntries(
  Object.entries(SIGNAL_RULES).map(([code, rule]) => [code, rule.family]),
)
