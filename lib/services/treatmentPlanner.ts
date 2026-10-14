// ---------------------------------------------------------------------------
// treatmentPlanner — plan de traitement sur mesure à partir d'un ou plusieurs
// problèmes sanitaires cochés ensemble.
//
// Le planificateur croise TOUS les problèmes avec la matrice des intrants
// (treatmentMatrix.ts) et choisit le plus petit nombre de produits qui les
// couvrent tous : par exemple oïdium + araignées rouges sont traités par un même
// produit, mildiou + marsonia par un autre. Il ne laisse jamais un problème sans
// produit : sans règle précise, il retombe sur la catégorie (fongicides ou
// insecticides). Le plan pose une première application (J0) puis les rappels
// (J+7 par défaut) ; deux produits sont appliqués à des jours différents.
//
// Logique pure, sans accès Supabase. Aucune dose n'est calculée : elle dépend du
// produit et de l'étiquette.
// ---------------------------------------------------------------------------

import { DISEASE_PRESSURE_LABELS, FIELD_TREATMENT_LABELS, PEST_LABELS } from "@/lib/domain/fieldLabels"
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CURATIVE_FOLLOW_UP_DAYS,
  FAMILY_FALLBACK,
  GENERIC_PRODUCTS,
  PRODUCT_STAGGER_DAYS,
  SIGNAL_RULES,
  categoryOf,
  type ProductCategory,
  type SignalRule,
} from "@/lib/domain/treatmentMatrix"

export type PlanMode = "curatif" | "preventif"

export interface PlanStep {
  productCode: string
  productLabel: string
  category: ProductCategory
  /** Problèmes traités par ce produit. */
  covers: string[]
  coversLabels: string[]
  mode: PlanMode
  /** Jours après le début du plan : première application puis rappels. */
  offsets: number[]
  /** Autres produits qui répondent aux mêmes problèmes. */
  alternatives: string[]
  /** Faux : aucune règle précise pour au moins un des problèmes (repli par catégorie). */
  explicit: boolean
  reason: string
}

export interface TreatmentPlan {
  id: string
  mode: PlanMode
  signals: string[]
  signalLabels: string[]
  steps: PlanStep[]
  summary: string
}

export interface PlanInput {
  signals: string[]
  mode: PlanMode
  followUpDays?: number[]
  staggerDays?: number
}

export function signalLabel(code: string): string {
  return DISEASE_PRESSURE_LABELS[code] ?? PEST_LABELS[code] ?? code
}

function ruleFor(code: string): SignalRule {
  const known = SIGNAL_RULES[code]
  if (known) return known
  // Problème absent de la matrice : on le rattache à sa famille et à ses produits de repli.
  const family = code in PEST_LABELS ? "ravageur" : "maladie"
  return { family, explicit: false, curative: FAMILY_FALLBACK[family], preventive: [] }
}

function productsOf(code: string, mode: PlanMode): string[] {
  const rule = ruleFor(code)
  return mode === "curatif" ? rule.curative : rule.preventive
}

function rankOf(product: string, signal: string, mode: PlanMode): number {
  const index = productsOf(signal, mode).indexOf(product)
  return index === -1 ? Number.POSITIVE_INFINITY : index
}

function productLabel(code: string): string {
  return FIELD_TREATMENT_LABELS[code] ?? code
}

/**
 * Choisit, parmi les produits possibles, celui qui couvre le plus de problèmes restants.
 * À égalité : le produit le plus adapté (rang dans la matrice), puis celui qui traite le
 * problème coché en premier, puis l'ordre alphabétique (résultat toujours identique).
 */
function pickBest(candidates: string[], uncovered: string[], mode: PlanMode): { product: string; covers: string[] } | null {
  let best: { product: string; covers: string[]; rankSum: number } | null = null
  for (const product of candidates) {
    const covers = uncovered.filter((signal) => productsOf(signal, mode).includes(product))
    if (covers.length === 0) continue
    const rankSum = covers.reduce((sum, signal) => sum + rankOf(product, signal, mode), 0)
    const firstIndex = uncovered.indexOf(covers[0])
    const bestFirstIndex = best ? uncovered.indexOf(best.covers[0]) : 0
    const better =
      !best ||
      covers.length > best.covers.length ||
      (covers.length === best.covers.length && rankSum < best.rankSum) ||
      (covers.length === best.covers.length && rankSum === best.rankSum && firstIndex < bestFirstIndex) ||
      (covers.length === best.covers.length && rankSum === best.rankSum && firstIndex === bestFirstIndex && product.localeCompare(best.product) < 0)
    if (better) best = { product, covers, rankSum }
  }
  return best ? { product: best.product, covers: best.covers } : null
}

function alternativesFor(chosen: string, covers: string[], mode: PlanMode): string[] {
  const common = Object.keys(FIELD_TREATMENT_LABELS).filter((product) => product !== chosen && covers.every((signal) => productsOf(signal, mode).includes(product)))
  const rank = (product: string) => covers.reduce((sum, signal) => sum + rankOf(product, signal, mode), 0)
  // Produits précis d'abord (du plus adapté au moins adapté), produits génériques « de choc » ensuite.
  return common.sort((a, b) => Number(GENERIC_PRODUCTS.has(a)) - Number(GENERIC_PRODUCTS.has(b)) || rank(a) - rank(b) || a.localeCompare(b))
}

function stepReason(product: string, covers: string[], mode: PlanMode): { reason: string; explicit: boolean } {
  const labels = covers.map(signalLabel).join(", ")
  const vague = covers.filter((signal) => !ruleFor(signal).explicit)
  const kind = mode === "curatif" ? "Traitement curatif" : "Traitement préventif"
  if (vague.length === 0) return { reason: `${kind} contre : ${labels}.`, explicit: true }
  const category = CATEGORY_LABELS[categoryOf(product)]
  return {
    reason: `${kind} contre : ${labels}. Aucune règle précise pour ${vague.map(signalLabel).join(", ")} : produit proposé dans la catégorie « ${category} ».`,
    explicit: false,
  }
}

export function planTreatment(input: PlanInput): TreatmentPlan {
  const mode = input.mode
  const signals = [...new Set(input.signals)].filter(Boolean)
  const followUps = mode === "curatif" ? input.followUpDays ?? CURATIVE_FOLLOW_UP_DAYS : []
  const stagger = input.staggerDays ?? PRODUCT_STAGGER_DAYS

  let uncovered = signals.filter((signal) => productsOf(signal, mode).length > 0)
  const allProducts = [...new Set(uncovered.flatMap((signal) => productsOf(signal, mode)))]
  const specific = allProducts.filter((product) => !GENERIC_PRODUCTS.has(product))
  const generic = allProducts.filter((product) => GENERIC_PRODUCTS.has(product))

  const chosen: Array<{ product: string; covers: string[] }> = []
  for (const pool of [specific, generic]) {
    while (uncovered.length > 0) {
      const pick = pickBest(pool, uncovered, mode)
      if (!pick) break
      chosen.push(pick)
      uncovered = uncovered.filter((signal) => !pick.covers.includes(signal))
    }
  }

  // Fongicides avant insecticides (ordre des catégories), puis dans l'ordre de choix.
  chosen.sort((a, b) => CATEGORY_ORDER.indexOf(categoryOf(a.product)) - CATEGORY_ORDER.indexOf(categoryOf(b.product)))

  const steps: PlanStep[] = chosen.map((pick, index) => {
    const base = index * stagger
    const { reason, explicit } = stepReason(pick.product, pick.covers, mode)
    return {
      productCode: pick.product,
      productLabel: productLabel(pick.product),
      category: categoryOf(pick.product),
      covers: pick.covers,
      coversLabels: pick.covers.map(signalLabel),
      mode,
      offsets: [base, ...followUps.map((days) => base + days)],
      alternatives: alternativesFor(pick.product, pick.covers, mode),
      explicit,
      reason,
    }
  })

  const applications = steps.reduce((sum, step) => sum + step.offsets.length, 0)
  return {
    id: `plan:${mode}:${[...signals].sort().join("+")}`,
    mode,
    signals,
    signalLabels: signals.map(signalLabel),
    steps,
    summary: steps.length === 0 ? "Aucun produit à proposer." : `${steps.length} produit${steps.length > 1 ? "s" : ""} · ${applications} application${applications > 1 ? "s" : ""}`,
  }
}

/** Remplace le produit d'une étape par l'une de ses alternatives. */
export function withProduct(plan: TreatmentPlan, stepIndex: number, productCode: string): TreatmentPlan {
  const step = plan.steps[stepIndex]
  if (!step || productCode === step.productCode || !step.alternatives.includes(productCode)) return plan
  const alternatives = [step.productCode, ...step.alternatives.filter((code) => code !== productCode)]
  const steps = plan.steps.map((item, index) =>
    index === stepIndex ? { ...item, productCode, productLabel: productLabel(productCode), category: categoryOf(productCode), alternatives } : item,
  )
  return { ...plan, steps }
}

/** Retire une étape : les produits suivants se décalent pour garder un produit par jour. */
export function withoutStep(plan: TreatmentPlan, stepIndex: number, staggerDays: number = PRODUCT_STAGGER_DAYS): TreatmentPlan {
  if (plan.steps.length <= 1) return plan
  const kept = plan.steps.filter((_, index) => index !== stepIndex)
  const steps = kept.map((step, index) => {
    const oldBase = step.offsets[0]
    const newBase = index * staggerDays
    return { ...step, offsets: step.offsets.map((offset) => offset - oldBase + newBase) }
  })
  const applications = steps.reduce((sum, step) => sum + step.offsets.length, 0)
  return { ...plan, steps, summary: `${steps.length} produit${steps.length > 1 ? "s" : ""} · ${applications} application${applications > 1 ? "s" : ""}` }
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export interface PlannedApplication {
  stepIndex: number
  productCode: string
  date: string
  /** « J0 », « J+3 », « J+7 »… relatif au début du plan. */
  label: string
}

export function planApplications(plan: TreatmentPlan, startDate: string): PlannedApplication[] {
  const out: PlannedApplication[] = []
  plan.steps.forEach((step, stepIndex) => {
    for (const offset of step.offsets) {
      out.push({ stepIndex, productCode: step.productCode, date: addDays(startDate, offset), label: offset === 0 ? "J0" : `J+${offset}` })
    }
  })
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.stepIndex - b.stepIndex)
}
