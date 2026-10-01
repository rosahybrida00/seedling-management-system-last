/**
 * Détection de caractéristiques (hauteur, largeur, diamètre de fleur,
 * floraison, parfum, rusticité, port, feuillage) à partir du texte libre
 * `description`, utilisée uniquement comme filet d'affichage quand la
 * colonne dédiée est vide en base (ou n'existe pas, ex. hauteur/largeur).
 * Ne modifie jamais les données — purement dérivé à l'affichage.
 */

export interface DetectedTraits {
  height?: string
  width?: string
  flowerDiameter?: string
  flowering?: string
  fragrance?: string
  hardiness?: string
  habit?: string
  foliage?: string
  soil?: string
}

interface Rule {
  regex: RegExp
  label: string | ((match: RegExpMatchArray) => string)
}

// --- Hauteur -----------------------------------------------------------
// Attention à l'ordre : le français dit aussi bien "hauteur : 80 cm" que
// "80 cm de hauteur pour 70 cm d'envergure" (nombre AVANT le mot-clé). La
// règle n°1 doit être testée en premier, sinon on capture par erreur le
// nombre d'envergure qui suit "hauteur" dans la phrase.
const HEIGHT_RULES: Rule[] = [
  {
    // "80 cm de hauteur", "1,20 m de haut"
    regex: /(\d+(?:[.,]\d+)?)\s?(cm|m)\s+de\s+haut(?:eur)?\b/i,
    label: (m) => `${m[1]} ${m[2]}`,
  },
  {
    // "hauteur : 80-100 cm", "hauteur de 1,20 m", "atteint 1,5 m", "jusqu'à 150 cm"
    regex:
      /(?:hauteur\s*(?::|de)?|atteint(?:e)?|jusqu'?à|peut atteindre)[^\d]{0,15}(\d+(?:[.,]\d+)?\s?(?:-|à)\s?\d+(?:[.,]\d+)?\s?(?:cm|m)\b|\d+(?:[.,]\d+)?\s?(?:cm|m)\b)/i,
    label: (m) => m[1].replace(/\s+/g, " ").trim(),
  },
]

// --- Largeur adulte / envergure -----------------------------------------
const WIDTH_RULES: Rule[] = [
  {
    // "70 cm d'envergure"
    regex: /(\d+(?:[.,]\d+)?)\s?(cm|m)\s+d['’]envergure\b/i,
    label: (m) => `${m[1]} ${m[2]}`,
  },
  {
    // "70 cm de large"
    regex: /(\d+(?:[.,]\d+)?)\s?(cm|m)\s+de\s+large\b/i,
    label: (m) => `${m[1]} ${m[2]}`,
  },
  {
    // "largeur adulte : 70 cm", "envergure de 70 cm"
    regex: /(?:largeur(?:\s+adulte)?|envergure)\s*(?::|de)?[^\d]{0,10}(\d+(?:[.,]\d+)?\s?(?:cm|m)\b)/i,
    label: (m) => m[1].trim(),
  },
]

// --- Diamètre de la fleur -------------------------------------------------
const FLOWER_DIAMETER_RULES: Rule[] = [
  {
    // "corolles larges de 7 cm"
    regex: /corolles?\s+larges?\s+de\s+(\d+(?:[.,]\d+)?)\s?cm\b/i,
    label: (m) => `${m[1]} cm`,
  },
  {
    // "fleurs de 8 cm de diamètre", "7 cm de diamètre"
    regex: /(\d+(?:[.,]\d+)?)\s?cm\s+de\s+diam[eè]tre\b/i,
    label: (m) => `${m[1]} cm`,
  },
  {
    // "diamètre de la fleur : 7 cm"
    regex: /diam[eè]tre(?:\s+de\s+la\s+fleur)?\s*(?::|de)?[^\d]{0,10}(\d+(?:[.,]\d+)?\s?cm\b)/i,
    label: (m) => m[1].trim(),
  },
]

// L'ordre compte : les règles les plus spécifiques passent avant les génériques
// (ex. "non remontant" doit être testé avant "remontant").
const FLOWERING_RULES: Rule[] = [
  { regex: /non[\s-]remontant/i, label: "Non remontante" },
  { regex: /remontant/i, label: "Remontante" },
  { regex: /floraison\s+continue/i, label: "Floraison continue" },
  { regex: /floraison\s+unique/i, label: "Floraison unique" },
  { regex: /floraison\s+printani[eè]re/i, label: "Floraison printanière" },
  { regex: /floraison\s+estivale/i, label: "Floraison estivale" },
]

const FRAGRANCE_RULES: Rule[] = [
  { regex: /inodore|sans parfum/i, label: "Inodore" },
  { regex: /(tr[eè]s|fortement)\s+parfum/i, label: "Parfum intense" },
  { regex: /peu\s+parfum/i, label: "Parfum léger" },
  { regex: /parfum\s+fruit[ée]/i, label: "Parfum fruité" },
  { regex: /parfum\s+musqu[ée]/i, label: "Parfum musqué" },
  { regex: /parfum\s+de\s+th[ée]/i, label: "Parfum de thé" },
  { regex: /parfum[ée]e?/i, label: "Parfumée" },
]

// --- Rusticité --------------------------------------------------------
const HARDINESS_RULES: Rule[] = [
  {
    regex: /tr[eè]s rustique\s*\(?(-?\d+\s?°c\s*(?:à|-)\s*-?\d+\s?°c)?\)?/i,
    label: (m) => (m[1] ? `Très rustique (${m[1]})` : "Très rustique"),
  },
  { regex: /peu rustique/i, label: "Peu rustique" },
  {
    regex: /rustique\s*\(?(-?\d+\s?°c\s*(?:à|-)\s*-?\d+\s?°c)?\)?/i,
    label: (m) => (m[1] ? `Rustique (${m[1]})` : "Rustique"),
  },
]

// --- Type de port -------------------------------------------------------
const HABIT_RULES: Rule[] = [
  { regex: /buisson(?:nant)?\s+dress[ée]/i, label: "Buissonnant dressé" },
  { regex: /port\s+compact/i, label: "Port compact" },
  { regex: /port\s+[ée]rig[ée]/i, label: "Port érigé" },
  { regex: /port\s+retombant/i, label: "Port retombant" },
  { regex: /port\s+[ée]tal[ée]/i, label: "Port étalé" },
  { regex: /pleureur/i, label: "Port pleureur" },
  { regex: /grimpant/i, label: "Grimpant" },
  { regex: /couvre[\s-]sol/i, label: "Couvre-sol" },
  { regex: /buisson(?:nant)?/i, label: "Buissonnant" },
]

// --- Feuillage ------------------------------------------------------------
const FOLIAGE_RULES: Rule[] = [
  { regex: /feuillage[^.]*brillant/i, label: "Feuillage brillant" },
  { regex: /feuillage[^.]*luisant/i, label: "Feuillage luisant" },
  { regex: /feuillage[^.]*(?:vert fonc[ée]|fonc[ée])/i, label: "Feuillage vert foncé" },
  { regex: /feuillage[^.]*r[ée]sistant/i, label: "Feuillage résistant aux maladies" },
  { regex: /feuillage[^.]*persistant/i, label: "Feuillage persistant" },
  { regex: /feuillage[^.]*caduc/i, label: "Feuillage caduc" },
]

// --- Type de sol --------------------------------------------------------
const SOIL_RULES: Rule[] = [
  { regex: /sol[^.]*calcaire/i, label: "Sol calcaire" },
  { regex: /sol[^.]*argileux/i, label: "Sol argileux" },
  { regex: /sol[^.]*sableux/i, label: "Sol sableux" },
  { regex: /sol[^.]*humif[eè]re/i, label: "Sol humifère" },
  { regex: /sol[^.]*(?:bien\s+)?drain[ée]/i, label: "Sol drainé" },
  { regex: /terre de jardin/i, label: "Terre de jardin ordinaire" },
]

function applyRules(text: string, rules: Rule[]): string | undefined {
  for (const rule of rules) {
    const match = text.match(rule.regex)
    if (match) {
      return typeof rule.label === "function" ? rule.label(match) : rule.label
    }
  }
  return undefined
}

/**
 * Analyse `description` pour en extraire hauteur, largeur, diamètre de
 * fleur, floraison, parfum, rusticité, port et feuillage.
 * Retourne un objet vide si rien n'a été détecté.
 */
export function detectTraitsFromDescription(description?: string | null): DetectedTraits {
  const text = description?.trim()
  if (!text) return {}

  return {
    height: applyRules(text, HEIGHT_RULES),
    width: applyRules(text, WIDTH_RULES),
    flowerDiameter: applyRules(text, FLOWER_DIAMETER_RULES),
    flowering: applyRules(text, FLOWERING_RULES),
    fragrance: applyRules(text, FRAGRANCE_RULES),
    hardiness: applyRules(text, HARDINESS_RULES),
    habit: applyRules(text, HABIT_RULES),
    foliage: applyRules(text, FOLIAGE_RULES),
    soil: applyRules(text, SOIL_RULES),
  }
}

/**
 * Choisit entre la valeur de colonne (prioritaire) et la valeur détectée dans
 * la description, en gardant la provenance pour l'affichage (badge "détecté").
 */
export function resolveTrait(
  columnValue: string | null | undefined,
  detected: string | undefined,
): { value?: string; isDetected: boolean } {
  if (columnValue && columnValue.trim()) return { value: columnValue, isDetected: false }
  if (detected) return { value: detected, isDetected: true }
  return { isDetected: false }
}
