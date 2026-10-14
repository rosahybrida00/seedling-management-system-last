// ---------------------------------------------------------------------------
// plantGrouping — regroupe les plants d'une zone : une variété = une carte unique
// (comme une micro-parcelle) qui réunit ses lots, eux-mêmes composés de plants
// numérotés 1, 2, 3… Aucun code technique n'est affiché.
//
// Cascade : Zone → Variété unique → Lots → Fiches détaillées (un plant).
// Logique pure, sans accès Supabase.
// ---------------------------------------------------------------------------

import type { FieldPlanting } from "@/app/parcelle/types"

export interface PlantEntry {
  planting: FieldPlanting
  /** Numéro simple du plant dans son lot : 1, 2, 3… */
  number: number
  /** « n°3 », ou « Lot 2 · n°3 » quand la variété a plusieurs lots. */
  label: string
}

export interface LotEntry {
  /** Identifiant d'affichage stable du lot (jamais montré à l'utilisateur). */
  key: string
  /** Numéro simple du lot dans la variété : 1, 2, 3… (du plus ancien au plus récent). */
  number: number
  plantedAt: string
  plants: PlantEntry[]
}

export interface VarietyGroup {
  key: string
  kind: "catalogue" | "semis" | "inconnu"
  sourceId: string | null
  name: string
  lots: LotEntry[]
  plantCount: number
  /** Types de culture présents : « pot », « pleine_terre ». */
  cultures: Array<"pot" | "pleine_terre">
  /** Tables de serre utilisées. */
  tableIds: string[]
  /** Premier plant : sert à ouvrir la fiche de la variété. */
  firstPlantingId: string
}

function sourceKey(planting: FieldPlanting): { key: string; kind: VarietyGroup["kind"]; sourceId: string | null } {
  if (planting.variety_id) return { key: `v:${planting.variety_id}`, kind: "catalogue", sourceId: planting.variety_id }
  if (planting.seedling_id) return { key: `s:${planting.seedling_id}`, kind: "semis", sourceId: planting.seedling_id }
  return { key: `p:${planting.id}`, kind: "inconnu", sourceId: null }
}

function cultureOf(planting: FieldPlanting): "pot" | "pleine_terre" | null {
  if (planting.location_type) return planting.location_type
  return planting.container_type ? "pot" : null
}

/** Numéros 1, 2, 3… : ceux saisis s'ils sont tous distincts, sinon l'ordre de saisie. */
function numberPlants(plantings: FieldPlanting[]): Array<{ planting: FieldPlanting; number: number }> {
  const sorted = [...plantings].sort((a, b) => (a.individual_number ?? Number.MAX_SAFE_INTEGER) - (b.individual_number ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id))
  const numbers = sorted.map((planting) => planting.individual_number)
  const allDistinct = numbers.every((value) => value != null && value > 0) && new Set(numbers).size === numbers.length
  return sorted.map((planting, index) => ({ planting, number: allDistinct ? (planting.individual_number as number) : index + 1 }))
}

export function groupPlantings(plantings: FieldPlanting[], nameOf: (planting: FieldPlanting) => string): VarietyGroup[] {
  const bySource = new Map<string, { meta: ReturnType<typeof sourceKey>; items: FieldPlanting[] }>()
  for (const planting of plantings) {
    const meta = sourceKey(planting)
    const entry = bySource.get(meta.key) ?? { meta, items: [] }
    entry.items.push(planting)
    bySource.set(meta.key, entry)
  }

  const groups: VarietyGroup[] = []
  for (const { meta, items } of bySource.values()) {
    const byLot = new Map<string, FieldPlanting[]>()
    for (const planting of items) {
      const lotKey = planting.group_id ?? `seul:${planting.id}`
      byLot.set(lotKey, [...(byLot.get(lotKey) ?? []), planting])
    }
    const orderedLots = [...byLot.entries()]
      .map(([key, lotPlantings]) => ({ key, lotPlantings, plantedAt: lotPlantings.reduce((min, p) => (p.planted_at < min ? p.planted_at : min), lotPlantings[0].planted_at) }))
      .sort((a, b) => a.plantedAt.localeCompare(b.plantedAt) || a.key.localeCompare(b.key))
    const several = orderedLots.length > 1

    const lots: LotEntry[] = orderedLots.map((lot, index) => ({
      key: lot.key,
      number: index + 1,
      plantedAt: lot.plantedAt,
      plants: numberPlants(lot.lotPlantings).map(({ planting, number }) => ({
        planting,
        number,
        label: several ? `Lot ${index + 1} · n°${number}` : `n°${number}`,
      })),
    }))

    const cultures = [...new Set(items.map(cultureOf).filter((value): value is "pot" | "pleine_terre" => value != null))]
    groups.push({
      key: meta.key,
      kind: meta.kind,
      sourceId: meta.sourceId,
      name: nameOf(items[0]),
      lots,
      plantCount: items.length,
      cultures,
      tableIds: [...new Set(items.map((p) => p.greenhouse_table_id).filter((id): id is string => Boolean(id)))],
      firstPlantingId: lots[0].plants[0].planting.id,
    })
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

/** Étiquette d'affichage d'un plant dans l'ensemble des plants d'une même variété. */
export function plantDisplayLabels(plantings: FieldPlanting[]): Map<string, string> {
  const labels = new Map<string, string>()
  for (const group of groupPlantings(plantings, () => "")) {
    for (const lot of group.lots) for (const plant of lot.plants) labels.set(plant.planting.id, plant.label)
  }
  return labels
}
