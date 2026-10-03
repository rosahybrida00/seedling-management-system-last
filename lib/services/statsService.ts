// ---------------------------------------------------------------------------
// statsService — calculs statistiques Phase 3.
//
// Calcule à partir des données Supabase :
//   - Taux de nouaison réel (fruits récoltés / fleurs pollinisées)
//   - Taux de vacuité (fruits vides / total récolté)
//   - Bilan sanitaire (fréquence des pathologies, couverture des traitements)
//   - Bilan par variété parentale (performance Mère / Père)
//   - Index de fertilité génétique
//
// Toutes les fonctions de calcul sont pures. L'orchestrateur `fetchSeasonBilan`
// interroge Supabase puis délègue aux fonctions de calcul.
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase-client"
import {
  buildCoupleFertility,
  wilsonRate,
  type CoupleFertility,
  type RateWithCI,
} from "@/lib/services/fertilityService"
import {
  buildFactors,
  motherSanitaryContext,
  normalizeName,
  readClimate,
  type FactorResult,
  type SanitaryObservation,
} from "@/lib/services/factorService"

export interface MonthlyReport {
  month: string
  pollinatedFlowers: number
  harvestedFruits: number
  nouaisonRate: number
  emptyFruits: number
  vacuiteRate: number
  totalSeeds: number
  diseaseFrequency: Record<string, number>
  treatmentCoverage: number
}

export interface ParentPerformance {
  parentName: string
  role: "mere" | "pere"
  crossesCount: number
  pollinatedFlowers: number
  fruitsHarvested: number
  emptyFruits: number
  nouaisonRate: number
  /** Nouaison avec effectif et intervalle de confiance à 95 %. */
  nouaison: RateWithCI
  vacuiteRate: number
  avgSeedCount: number
  totalSeedlings: number
  selectedSeedlings: number
  discardedSeedlings: number
  fertilityIndex: number
}

export interface SeasonBilan {
  monthlyReports: MonthlyReport[]
  parentPerformances: ParentPerformance[]
  /** Fertilité réelle par couple (mère × père), comparée aux croisements des mêmes parents. */
  couples: CoupleFertility[]
  /** Facteurs associés à la fertilité (météo, pollen, sanitaire), seuils calculés sur les lots. */
  factors: FactorResult[]
  overall: {
    totalCrosses: number
    totalPollinatedFlowers: number
    totalHarvestedFruits: number
    overallNouaisonRate: number
    overallVacuiteRate: number
    /** Mêmes taux avec effectif et intervalle de confiance à 95 %. */
    nouaison: RateWithCI
    vacuite: RateWithCI
    fertile: RateWithCI
    totalSeeds: number
    totalSeedlings: number
    selectedSeedlings: number
    discardedSeedlings: number
    observingSeedlings: number
    diseaseDistribution: Record<string, number>
    treatmentDistribution: Record<string, number>
  }
}

export interface RawData {
  crosses: CrossRow[]
  harvests: HarvestRow[]
  seedlings: SeedlingRow[]
  pollenLots: PollenRow[]
  /** Contexte sanitaire de la mère ; absent ou vide => « inconnu » pour tous les lots. */
  sanitary?: SanitaryContextData
}

export interface SanitaryContextData {
  plantings: Array<{ id: string; variety_id: string | null }>
  varieties: Array<{ id: string; name: string | null; commercial_name: string | null }>
  observations: SanitaryObservation[]
}

interface CrossRow {
  id: string
  code: string
  seed_parent: string | null
  pollen_parent: string | null
  pollination_date: string | null
  flower_count: number | null
  pollen_type?: string | null
  climate_data?: Record<string, unknown> | null
}

interface HarvestRow {
  id: string
  cross_id: string
  code: string
  harvest_date: string | null
  seed_count: number
  seed_extraction: string | null
  fruit_calibre: string | null
}

interface SeedlingRow {
  id: string
  batch_id: string | null
  /** Fruit d'origine (cross_fruits.id) : seul lien fiable semis → fruit en production. */
  fruit_id: string | null
  code: string
  status: string
  phenotype_vigueur: string | null
  pression_sanitaire: string | null
  traitement: string | null
}

interface PollenRow {
  id: string
  lot_number: string
  rose_name: string | null
  anther_quality: string | null
  dehiscence: string | null
}

function monthKey(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// Statuts réels de seedlings.status en base (contrainte seedlings_status_check) :
// Semé, Stratifié, Germé, Repiqué, En croissance, Floraison, Retenu, Écarté, Mort.
function isSelectedSeedling(status: string): boolean {
  return status === "Retenu"
}

function isDiscardedSeedling(status: string): boolean {
  return status === "Écarté" || status === "Mort"
}

function isEmptyFruit(h: HarvestRow): boolean {
  return h.seed_extraction === "totalement_vide" || (h.seed_count === 0 && h.seed_extraction !== "plein")
}

function computeNouaisonRate(pollinated: number, harvested: number): number {
  if (pollinated === 0) return 0
  return Math.round((harvested / pollinated) * 1000) / 10
}

function computeVacuiteRate(total: number, empty: number): number {
  if (total === 0) return 0
  return Math.round((empty / total) * 1000) / 10
}

function computeFertilityIndex(
  nouaisonRate: number,
  vacuiteRate: number,
  avgSeeds: number,
  selectedRatio: number,
): number {
  const nouaisonScore = Math.min(nouaisonRate / 100, 1) * 40
  const vacuiteScore = (1 - Math.min(vacuiteRate / 100, 1)) * 30
  const seedScore = Math.min(avgSeeds / 10, 1) * 15
  const selectionScore = selectedRatio * 15
  return Math.round((nouaisonScore + vacuiteScore + seedScore + selectionScore) * 10) / 10
}

export function buildMonthlyReports(
  crosses: CrossRow[],
  harvests: HarvestRow[],
  seedlings: SeedlingRow[],
): MonthlyReport[] {
  const months = new Map<string, {
    pollinated: number
    harvested: number
    empty: number
    seeds: number
    diseases: Record<string, number>
    treated: number
    totalSeedlings: number
  }>()

  for (const c of crosses) {
    const mk = monthKey(c.pollination_date)
    if (!months.has(mk)) months.set(mk, { pollinated: 0, harvested: 0, empty: 0, seeds: 0, diseases: {}, treated: 0, totalSeedlings: 0 })
    // Le taux de nouaison compare des fruits noués à des fleurs pollinisées,
    // pas à un nombre de lots : on additionne flower_count, pas +1 par lot.
    months.get(mk)!.pollinated += c.flower_count ?? 0
  }

  const harvestByCross = new Map<string, HarvestRow[]>()
  for (const h of harvests) {
    const arr = harvestByCross.get(h.cross_id) ?? []
    arr.push(h)
    harvestByCross.set(h.cross_id, arr)
  }

  for (const c of crosses) {
    const mk = monthKey(c.pollination_date)
    const entry = months.get(mk)
    if (!entry) continue
    const cHarvests = harvestByCross.get(c.id) ?? []
    entry.harvested += cHarvests.length
    for (const h of cHarvests) {
      entry.seeds += h.seed_count
      if (isEmptyFruit(h)) entry.empty += 1
    }
  }

  const harvestById = new Map(harvests.map((h) => [h.id, h]))
  const crossById = new Map(crosses.map((c) => [c.id, c]))

  for (const s of seedlings) {
    const fruit = s.fruit_id ? harvestById.get(s.fruit_id) : null
    const cross = fruit ? crossById.get(fruit.cross_id) : null
    if (!cross) continue
    const mk = monthKey(cross.pollination_date)
    const entry = months.get(mk)
    if (!entry) continue
    entry.totalSeedlings += 1
    if (s.pression_sanitaire) {
      entry.diseases[s.pression_sanitaire] = (entry.diseases[s.pression_sanitaire] ?? 0) + 1
    }
    if (s.traitement) {
      entry.treated += 1
    }
  }

  const sorted = Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  return sorted.map(([month, d]) => ({
    month,
    pollinatedFlowers: d.pollinated,
    harvestedFruits: d.harvested,
    nouaisonRate: computeNouaisonRate(d.pollinated, d.harvested),
    emptyFruits: d.empty,
    vacuiteRate: computeVacuiteRate(d.harvested, d.empty),
    totalSeeds: d.seeds,
    diseaseFrequency: d.diseases,
    treatmentCoverage: d.totalSeedlings > 0 ? Math.round((d.treated / d.totalSeedlings) * 1000) / 10 : 0,
  }))
}

export function buildParentPerformances(
  crosses: CrossRow[],
  harvests: HarvestRow[],
  seedlings: SeedlingRow[],
): ParentPerformance[] {
  const harvestByCross = new Map<string, HarvestRow[]>()
  for (const h of harvests) {
    const arr = harvestByCross.get(h.cross_id) ?? []
    arr.push(h)
    harvestByCross.set(h.cross_id, arr)
  }

  const seedlingsByFruit = new Map<string, SeedlingRow[]>()
  for (const s of seedlings) {
    if (!s.fruit_id) continue
    const arr = seedlingsByFruit.get(s.fruit_id) ?? []
    arr.push(s)
    seedlingsByFruit.set(s.fruit_id, arr)
  }

  type ParentAccum = {
    parentName: string
    role: "mere" | "pere"
    crossesCount: number
    pollinatedFlowers: number
    fruitsHarvested: number
    emptyFruits: number
    totalSeeds: number
    totalSeedlings: number
    selectedSeedlings: number
    discardedSeedlings: number
  }

  const parents = new Map<string, ParentAccum>()

  function track(name: string | null, role: "mere" | "pere", cross: CrossRow) {
    if (!name) return
    const key = `${role}:${name}`
    if (!parents.has(key)) {
      parents.set(key, {
        parentName: name,
        role,
        crossesCount: 0,
        pollinatedFlowers: 0,
        fruitsHarvested: 0,
        emptyFruits: 0,
        totalSeeds: 0,
        totalSeedlings: 0,
        selectedSeedlings: 0,
        discardedSeedlings: 0,
      })
    }
    const acc = parents.get(key)!
    acc.crossesCount += 1
    acc.pollinatedFlowers += cross.flower_count ?? 0
    const cHarvests = harvestByCross.get(cross.id) ?? []
    acc.fruitsHarvested += cHarvests.length
    for (const h of cHarvests) {
      acc.totalSeeds += h.seed_count
      if (isEmptyFruit(h)) acc.emptyFruits += 1
    }
    for (const h of cHarvests) {
      for (const s of seedlingsByFruit.get(h.id) ?? []) {
        acc.totalSeedlings += 1
        if (isSelectedSeedling(s.status)) acc.selectedSeedlings += 1
        if (isDiscardedSeedling(s.status)) acc.discardedSeedlings += 1
      }
    }
  }

  for (const c of crosses) {
    track(c.seed_parent, "mere", c)
    track(c.pollen_parent, "pere", c)
  }

  return Array.from(parents.values())
    .map((acc) => {
      const nouaisonRate = computeNouaisonRate(acc.pollinatedFlowers, acc.fruitsHarvested)
      const vacuiteRate = computeVacuiteRate(acc.fruitsHarvested, acc.emptyFruits)
      const avgSeedCount = acc.fruitsHarvested > 0 ? Math.round((acc.totalSeeds / acc.fruitsHarvested) * 10) / 10 : 0
      const selectedRatio = acc.totalSeedlings > 0 ? acc.selectedSeedlings / acc.totalSeedlings : 0
      const fertilityIndex = computeFertilityIndex(nouaisonRate, vacuiteRate, avgSeedCount, selectedRatio)
      return {
        parentName: acc.parentName,
        role: acc.role,
        crossesCount: acc.crossesCount,
        pollinatedFlowers: acc.pollinatedFlowers,
        fruitsHarvested: acc.fruitsHarvested,
        emptyFruits: acc.emptyFruits,
        nouaisonRate,
        nouaison: wilsonRate(acc.fruitsHarvested, acc.pollinatedFlowers),
        vacuiteRate,
        avgSeedCount,
        totalSeedlings: acc.totalSeedlings,
        selectedSeedlings: acc.selectedSeedlings,
        discardedSeedlings: acc.discardedSeedlings,
        fertilityIndex,
      }
    })
    .sort((a, b) => b.fertilityIndex - a.fertilityIndex)
}

/** Un lot par croisement : fertilité, météo de pollinisation, type de pollen, état sanitaire de la mère. */
export function buildFactorLots(raw: RawData) {
  const fruitsByCross = new Map<string, HarvestRow[]>()
  for (const h of raw.harvests) {
    const arr = fruitsByCross.get(h.cross_id) ?? []
    arr.push(h)
    fruitsByCross.set(h.cross_id, arr)
  }

  // Nom normalisé de variété -> identifiants de plants de cette variété.
  const varietyIdsByName = new Map<string, Set<string>>()
  for (const v of raw.sanitary?.varieties ?? []) {
    for (const label of [v.name, v.commercial_name]) {
      const key = normalizeName(label)
      if (!key) continue
      const set = varietyIdsByName.get(key) ?? new Set<string>()
      set.add(v.id)
      varietyIdsByName.set(key, set)
    }
  }
  const plantingsByVariety = new Map<string, string[]>()
  for (const p of raw.sanitary?.plantings ?? []) {
    if (!p.variety_id) continue
    const arr = plantingsByVariety.get(p.variety_id) ?? []
    arr.push(p.id)
    plantingsByVariety.set(p.variety_id, arr)
  }

  return raw.crosses.map((c) => {
    const climate = readClimate(c.climate_data)
    const varietyIds = varietyIdsByName.get(normalizeName(c.seed_parent)) ?? new Set<string>()
    const plantingIds = Array.from(varietyIds).flatMap((id) => plantingsByVariety.get(id) ?? [])
    return {
      id: c.id,
      flowerCount: c.flower_count,
      fertileFruits: (fruitsByCross.get(c.id) ?? []).filter((h) => !isEmptyFruit(h)).length,
      pollenType: c.pollen_type ?? null,
      temperature: climate.temperature,
      humidity: climate.humidity,
      uvIndex: climate.uvIndex,
      motherSanitary: motherSanitaryContext(c.pollination_date, plantingIds, raw.sanitary?.observations ?? []),
    }
  })
}

export function buildSeasonBilan(raw: RawData): SeasonBilan {
  const monthlyReports = buildMonthlyReports(raw.crosses, raw.harvests, raw.seedlings)
  const parentPerformances = buildParentPerformances(raw.crosses, raw.harvests, raw.seedlings)

  const totalCrosses = raw.crosses.length
  // Un couple compte pour 1 croisement mais peut avoir plusieurs lots :
  // le total de fleurs pollinisées additionne flower_count par lot.
  const totalPollinatedFlowers = raw.crosses.reduce((sum, c) => sum + (c.flower_count ?? 0), 0)
  const totalHarvestedFruits = raw.harvests.length
  const totalEmpty = raw.harvests.filter(isEmptyFruit).length
  const totalSeeds = raw.harvests.reduce((sum, h) => sum + h.seed_count, 0)

  const factors = buildFactors(buildFactorLots(raw))

  const couples = buildCoupleFertility(
    raw.crosses.map((c) => ({
      id: c.id,
      seedParent: c.seed_parent,
      pollenParent: c.pollen_parent,
      flowerCount: c.flower_count,
    })),
    raw.harvests.map((h) => ({ crossId: h.cross_id, isEmpty: isEmptyFruit(h), seedCount: h.seed_count })),
  )

  const diseaseDistribution: Record<string, number> = {}
  const treatmentDistribution: Record<string, number> = {}
  let selectedSeedlings = 0
  let discardedSeedlings = 0
  let observingSeedlings = 0

  for (const s of raw.seedlings) {
    if (isSelectedSeedling(s.status)) selectedSeedlings += 1
    else if (isDiscardedSeedling(s.status)) discardedSeedlings += 1
    else observingSeedlings += 1
    if (s.pression_sanitaire) {
      diseaseDistribution[s.pression_sanitaire] = (diseaseDistribution[s.pression_sanitaire] ?? 0) + 1
    }
    if (s.traitement) {
      treatmentDistribution[s.traitement] = (treatmentDistribution[s.traitement] ?? 0) + 1
    }
  }

  return {
    monthlyReports,
    parentPerformances,
    couples,
    factors,
    overall: {
      totalCrosses,
      totalPollinatedFlowers,
      totalHarvestedFruits,
      overallNouaisonRate: computeNouaisonRate(totalPollinatedFlowers, totalHarvestedFruits),
      overallVacuiteRate: computeVacuiteRate(totalHarvestedFruits, totalEmpty),
      nouaison: wilsonRate(totalHarvestedFruits, totalPollinatedFlowers),
      vacuite: wilsonRate(totalEmpty, totalHarvestedFruits),
      fertile: wilsonRate(totalHarvestedFruits - totalEmpty, totalPollinatedFlowers),
      totalSeeds,
      totalSeedlings: raw.seedlings.length,
      selectedSeedlings,
      discardedSeedlings,
      observingSeedlings,
      diseaseDistribution,
      treatmentDistribution,
    },
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Plants des mères (par nom de variété) et leurs observations. En cas d'erreur
 * ou de données absentes, les lots restent « inconnu » : le bilan ne casse pas.
 */
async function fetchSanitaryContext(userId: string, crosses: CrossRow[]): Promise<SanitaryContextData> {
  const empty: SanitaryContextData = { plantings: [], varieties: [], observations: [] }
  try {
    const motherNames = new Set(crosses.map((c) => normalizeName(c.seed_parent)).filter(Boolean))
    if (motherNames.size === 0) return empty

    const { data: plantingRows } = await supabase
      .from("field_plantings")
      .select("id, variety_id")
      .eq("user_id", userId)
      .not("variety_id", "is", null)
    const plantings = (plantingRows ?? []) as SanitaryContextData["plantings"]
    if (plantings.length === 0) return empty

    const varietyIds = Array.from(new Set(plantings.map((p) => p.variety_id).filter((id): id is string => Boolean(id))))
    const varietyChunks = await Promise.all(
      chunk(varietyIds, 100).map((ids) => supabase.from("varieties").select("id, name, commercial_name").in("id", ids)),
    )
    const varieties = varietyChunks.flatMap((r) => (r.data ?? []) as SanitaryContextData["varieties"])

    const plantingIds = plantings.map((p) => p.id)
    const observationChunks = await Promise.all(
      chunk(plantingIds, 100).map((ids) =>
        supabase
          .from("field_observations")
          .select("planting_id, observation_date, disease_pressure, pests")
          .eq("user_id", userId)
          .in("planting_id", ids),
      ),
    )
    const observations = observationChunks.flatMap((r) =>
      ((r.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        plantingId: (row.planting_id as string | null) ?? null,
        observationDate: row.observation_date as string,
        diseasePressure: (row.disease_pressure as string[] | null) ?? null,
        pests: (row.pests as string[] | null) ?? null,
      })),
    )
    return { plantings, varieties, observations }
  } catch {
    return empty
  }
}

export async function fetchRawData(): Promise<RawData> {
  // Les bilans ne portent que sur les données de l'utilisateur connecté, même si
  // une policy RLS trop large laissait voir celles des autres.
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id
  if (!userId) return { crosses: [], harvests: [], seedlings: [], pollenLots: [] }

  const [{ data: cData }, { data: hData }, { data: sData }, { data: pData }] = await Promise.all([
    supabase.from("crosses").select("id, code, seed_parent, pollen_parent, pollination_date, flower_count, pollen_type, climate_data").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("cross_fruits").select("id, cross_id, fruit_name, harvest_date, seed_count, seed_extraction, fruit_calibre, status").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("seedlings").select("id, batch_id, fruit_id, code, status, phenotype_vigueur, pression_sanitaire, traitement").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("pollen_lots").select("id, lot_number, rose_name, anther_quality, dehiscence").eq("user_id", userId).order("created_at", { ascending: false }),
  ])

  const sanitary = await fetchSanitaryContext(userId, (cData ?? []) as CrossRow[])

  return {
    sanitary,
    crosses: (cData ?? []) as CrossRow[],
    // cross_fruits est la source réelle des récoltes (une ligne par fruit,
    // Voie A/B) ; hip_harvests était l'ancienne table par lot, plus alimentée.
    harvests: ((hData ?? []) as Array<Record<string, unknown>>)
      .filter((row) => row.status === "récolté" || row.status === "vide")
      .map((row) => ({
        id: row.id as string,
        cross_id: row.cross_id as string,
        code: row.fruit_name as string,
        harvest_date: row.harvest_date as string | null,
        seed_count: (row.seed_count as number) ?? 0,
        seed_extraction: row.seed_extraction as string | null,
        fruit_calibre: row.fruit_calibre as string | null,
      })),
    seedlings: (sData ?? []) as SeedlingRow[],
    pollenLots: (pData ?? []) as PollenRow[],
  }
}

export async function fetchSeasonBilan(): Promise<SeasonBilan> {
  const raw = await fetchRawData()
  return buildSeasonBilan(raw)
}
