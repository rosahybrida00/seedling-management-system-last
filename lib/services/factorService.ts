// ---------------------------------------------------------------------------
// factorService — couche 3 de la page Bilans : facteurs associés à la fertilité.
//
// Pour chaque facteur (météo à la pollinisation, type de pollen, état sanitaire
// de la mère), les lots sont répartis en groupes et leur fertilité réelle
// (fleurs → fruits avec graines) est comparée. Aucun seuil n'est imposé : les
// bornes météo sont des terciles calculés sur les lots de l'utilisateur.
//
// Garde-fous :
//   - l'unité d'analyse est le lot (les fleurs d'un même lot partagent leurs
//     conditions) : un groupe doit contenir au moins MIN_LOTS_PER_GROUP lots ;
//   - une différence n'est affichée que si les intervalles de confiance des
//     deux groupes extrêmes ne se chevauchent pas ;
//   - une absence d'observation n'est jamais comptée comme « sans problème ».
//
// Le résultat est une association observée, jamais une preuve de cause.
// Fonctions pures, sans accès Supabase.
// ---------------------------------------------------------------------------

import { compareRates, wilsonRate, type RateWithCI } from "@/lib/services/fertilityService"

export const MIN_LOTS_PER_GROUP = 3
export const MIN_FLOWERS_PER_GROUP = 10
/** Nombre minimal de lots disposant d'une mesure pour calculer des terciles. */
export const MIN_LOTS_FOR_TERCILES = 9
/** Fenêtre (jours) autour de la pollinisation pour rattacher une observation de la mère. */
export const SANITARY_WINDOW_DAYS = 14

export type SanitaryContext = "signale" | "sans_signalement" | "inconnu"

export interface FactorLotInput {
  id: string
  flowerCount: number | null
  /** Fruits menés à la récolte avec au moins une graine. */
  fertileFruits: number
  pollenType: string | null
  temperature: number | null
  humidity: number | null
  uvIndex: number | null
  motherSanitary: SanitaryContext
}

export interface FactorGroup {
  label: string
  lots: number
  flowers: number
  fertile: RateWithCI
  /** Faux si le groupe est trop petit pour entrer dans la comparaison. */
  eligible: boolean
}

export type FactorVerdict = "difference" | "aucune_difference" | "insuffisant"

export interface FactorResult {
  id: string
  title: string
  groups: FactorGroup[]
  verdict: FactorVerdict
  summary: string
  /** Précision sur les lots exclus (mesure absente, mère non observée). */
  note: string | null
}

// ----------------------------- Utilitaires ---------------------------------

/** Quantile par interpolation linéaire sur un tableau déjà trié. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN
  const pos = (sorted.length - 1) * q
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower)
}

function fmt(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace(".", ",")
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function readClimate(climate: Record<string, unknown> | null | undefined): {
  temperature: number | null
  humidity: number | null
  uvIndex: number | null
} {
  const data = climate ?? {}
  return {
    temperature: toNumber(data.temperature),
    humidity: toNumber(data.humidity),
    uvIndex: toNumber(data.uv_index),
  }
}

function makeGroup(label: string, lots: FactorLotInput[]): FactorGroup {
  const flowers = lots.reduce((sum, l) => sum + (l.flowerCount ?? 0), 0)
  const fertile = lots.reduce((sum, l) => sum + Math.min(l.fertileFruits, l.flowerCount ?? 0), 0)
  return {
    label,
    lots: lots.length,
    flowers,
    fertile: wilsonRate(fertile, flowers),
    eligible: lots.length >= MIN_LOTS_PER_GROUP && flowers >= MIN_FLOWERS_PER_GROUP,
  }
}

function conclude(id: string, title: string, groups: FactorGroup[], note: string | null): FactorResult {
  const eligible = groups.filter((g) => g.eligible && g.fertile.rate != null)
  if (eligible.length < 2) {
    return {
      id,
      title,
      groups,
      verdict: "insuffisant",
      summary: "Trop peu de lots dans chaque groupe pour comparer.",
      note,
    }
  }
  const ranked = [...eligible].sort((a, b) => (b.fertile.rate ?? 0) - (a.fertile.rate ?? 0))
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  if (compareRates(best.fertile, worst.fertile) === "superieur") {
    return {
      id,
      title,
      groups,
      verdict: "difference",
      summary: `${best.label} : ${fmt(best.fertile.rate ?? 0)} % de fleurs fertiles, contre ${fmt(worst.fertile.rate ?? 0)} % pour ${worst.label}.`,
      note,
    }
  }
  return {
    id,
    title,
    groups,
    verdict: "aucune_difference",
    summary: "Pas de différence démontrable avec les données actuelles.",
    note,
  }
}

// ----------------------------- Facteurs ------------------------------------

function terciles(
  id: string,
  title: string,
  unit: string,
  lots: FactorLotInput[],
  pick: (lot: FactorLotInput) => number | null,
): FactorResult | null {
  const measured = lots.filter((l) => (l.flowerCount ?? 0) > 0 && pick(l) != null)
  if (measured.length < MIN_LOTS_FOR_TERCILES) return null
  const sorted = measured.map((l) => pick(l) as number).sort((a, b) => a - b)
  const c1 = quantile(sorted, 1 / 3)
  const c2 = quantile(sorted, 2 / 3)

  const low = measured.filter((l) => (pick(l) as number) <= c1)
  const high = measured.filter((l) => (pick(l) as number) > c2)
  const mid = measured.filter((l) => (pick(l) as number) > c1 && (pick(l) as number) <= c2)

  const groups: FactorGroup[] = []
  if (low.length > 0) groups.push(makeGroup(`≤ ${fmt(c1)} ${unit}`, low))
  if (mid.length > 0) groups.push(makeGroup(`${fmt(c1)} à ${fmt(c2)} ${unit}`, mid))
  if (high.length > 0) groups.push(makeGroup(`> ${fmt(c2)} ${unit}`, high))
  if (groups.length < 2) return null

  const missing = lots.filter((l) => (l.flowerCount ?? 0) > 0).length - measured.length
  return conclude(id, title, groups, missing > 0 ? `${missing} lot(s) sans mesure ne sont pas inclus.` : null)
}

function pollenType(lots: FactorLotInput[]): FactorResult | null {
  const usable = lots.filter((l) => (l.flowerCount ?? 0) > 0 && (l.pollenType === "frais" || l.pollenType === "conservé"))
  const fresh = usable.filter((l) => l.pollenType === "frais")
  const stored = usable.filter((l) => l.pollenType === "conservé")
  if (fresh.length === 0 || stored.length === 0) return null
  return conclude(
    "pollen",
    "Type de pollen",
    [makeGroup("Pollen frais", fresh), makeGroup("Pollen conservé", stored)],
    null,
  )
}

function motherSanitary(lots: FactorLotInput[]): FactorResult | null {
  const withFlowers = lots.filter((l) => (l.flowerCount ?? 0) > 0)
  const flagged = withFlowers.filter((l) => l.motherSanitary === "signale")
  const clean = withFlowers.filter((l) => l.motherSanitary === "sans_signalement")
  const unknown = withFlowers.length - flagged.length - clean.length
  if (flagged.length === 0 || clean.length === 0) return null
  return conclude(
    "sanitaire_mere",
    "État sanitaire de la mère à la pollinisation",
    [makeGroup("Maladie ou ravageur signalé", flagged), makeGroup("Aucun signalement", clean)],
    unknown > 0 ? `${unknown} lot(s) dont la mère n'a pas été observée autour de la pollinisation ne sont pas comptés.` : null,
  )
}

export function buildFactors(lots: FactorLotInput[]): FactorResult[] {
  return [
    terciles("temperature", "Température le jour de la pollinisation", "°C", lots, (l) => l.temperature),
    terciles("humidite", "Humidité le jour de la pollinisation", "%", lots, (l) => l.humidity),
    terciles("uv", "Indice UV le jour de la pollinisation", "UV", lots, (l) => l.uvIndex),
    pollenType(lots),
    motherSanitary(lots),
  ].filter((f): f is FactorResult => f !== null)
}

// ----------------------- Contexte sanitaire de la mère ---------------------

/** Minuscules, sans accents ni ponctuation, espaces simples. */
export function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export interface SanitaryObservation {
  plantingId: string | null
  observationDate: string
  diseasePressure: string[] | null
  pests: string[] | null
}

/**
 * Observations des plants de la mère dans la fenêtre autour de la pollinisation.
 *  - aucune observation : « inconnu » (jamais « sans problème ») ;
 *  - au moins une avec maladie ou ravageur : « signalé » ;
 *  - sinon : « sans signalement ».
 */
export function motherSanitaryContext(
  pollinationDate: string | null,
  plantingIds: string[],
  observations: SanitaryObservation[],
  windowDays: number = SANITARY_WINDOW_DAYS,
): SanitaryContext {
  if (!pollinationDate || plantingIds.length === 0) return "inconnu"
  const center = Date.parse(pollinationDate)
  if (Number.isNaN(center)) return "inconnu"
  const ids = new Set(plantingIds)
  const windowMs = windowDays * 24 * 60 * 60 * 1000

  let observed = false
  for (const obs of observations) {
    if (!obs.plantingId || !ids.has(obs.plantingId)) continue
    const when = Date.parse(obs.observationDate)
    if (Number.isNaN(when) || Math.abs(when - center) > windowMs) continue
    observed = true
    if ((obs.diseasePressure?.length ?? 0) > 0 || (obs.pests?.length ?? 0) > 0) return "signale"
  }
  return observed ? "sans_signalement" : "inconnu"
}
