// ---------------------------------------------------------------------------
// placementService — placer une variété ou un semis dans une serre / parcelle.
//
// Logique pure (aucun accès Supabase), partagée par « Ajouter à ma collection »
// du catalogue, la collection des semis et le bandeau « Parents à placer ».
//
// Une plantation est enregistrée plant par plant (une ligne par pot ou plant,
// plant_count = 1, regroupées par group_id), comme dans la vue d'une zone.
// ---------------------------------------------------------------------------

export type PlacementSourceKind = "catalogue" | "semis"
export type LocationType = "pot" | "pleine_terre"

export interface PlacementSource {
  kind: PlacementSourceKind
  id: string
  name: string
}

export interface ZoneTableOption {
  id: string
  name: string
}

export interface ZoneOption {
  /** "serre:<id>" ou "parcelle:<id>". */
  key: string
  kind: "serre" | "parcelle"
  id: string
  name: string
  /** Tables de la serre (vide pour une parcelle). */
  tables: ZoneTableOption[]
  /** Types de sol de la parcelle, le premier sert de valeur par défaut. */
  soilTypes: string[]
}

export interface PlantingSnapshot {
  variety_id: string | null
  seedling_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
  planted_at: string
  removed_at: string | null
}

export type ZoneReason = "deja_ici" | "derniere_utilisee"

export interface RankedZone {
  zone: ZoneOption
  /** Plants en place dans la zone (tous types confondus). */
  plantCount: number
  /** Plants de cette même variété / de ce même semis déjà dans la zone. */
  sameCount: number
  reasons: ZoneReason[]
}

export const MAX_PLANTS_PER_PLACEMENT = 500

export function zoneKey(kind: "serre" | "parcelle", id: string): string {
  return `${kind}:${id}`
}

/** Zone d'un plant : la serre de sa table, ou sa parcelle. */
function zoneOfPlanting(planting: PlantingSnapshot, serreByTable: Map<string, string>): string | null {
  if (planting.greenhouse_table_id) {
    const greenhouseId = serreByTable.get(planting.greenhouse_table_id)
    return greenhouseId ? zoneKey("serre", greenhouseId) : null
  }
  if (planting.parcelle_id) return zoneKey("parcelle", planting.parcelle_id)
  return null
}

/**
 * Classe les zones de l'utilisateur pour proposer où placer une plante :
 *  1. les zones qui contiennent déjà cette variété (ou ce semis) ;
 *  2. la zone où il a planté en dernier ;
 *  3. les autres, par ordre alphabétique.
 * Seules les zones créées par l'utilisateur sont proposées.
 */
export function rankZones(zones: ZoneOption[], plantings: PlantingSnapshot[], source: Pick<PlacementSource, "kind" | "id">): RankedZone[] {
  const serreByTable = new Map<string, string>()
  for (const zone of zones) {
    if (zone.kind === "serre") for (const table of zone.tables) serreByTable.set(table.id, zone.id)
  }

  const plantCount = new Map<string, number>()
  const sameCount = new Map<string, number>()
  const lastPlanted = new Map<string, string>()

  for (const planting of plantings) {
    if (planting.removed_at) continue
    const key = zoneOfPlanting(planting, serreByTable)
    if (!key) continue
    plantCount.set(key, (plantCount.get(key) ?? 0) + 1)
    const isSame = source.kind === "catalogue" ? planting.variety_id === source.id : planting.seedling_id === source.id
    if (isSame) sameCount.set(key, (sameCount.get(key) ?? 0) + 1)
    const previous = lastPlanted.get(key)
    if (!previous || planting.planted_at > previous) lastPlanted.set(key, planting.planted_at)
  }

  let latestKey: string | null = null
  let latestDate = ""
  for (const [key, date] of lastPlanted) {
    if (date > latestDate) {
      latestDate = date
      latestKey = key
    }
  }

  const ranked: RankedZone[] = zones.map((zone) => {
    const reasons: ZoneReason[] = []
    if ((sameCount.get(zone.key) ?? 0) > 0) reasons.push("deja_ici")
    if (zone.key === latestKey) reasons.push("derniere_utilisee")
    return { zone, plantCount: plantCount.get(zone.key) ?? 0, sameCount: sameCount.get(zone.key) ?? 0, reasons }
  })

  return ranked.sort((a, b) => {
    if (a.sameCount !== b.sameCount) return b.sameCount - a.sameCount
    const aRecent = a.reasons.includes("derniere_utilisee") ? 1 : 0
    const bRecent = b.reasons.includes("derniere_utilisee") ? 1 : 0
    if (aRecent !== bRecent) return bRecent - aRecent
    return a.zone.name.localeCompare(b.zone.name, "fr")
  })
}

/**
 * Zone présélectionnée : la seule zone s'il n'y en a qu'une, ou celle qui
 * contient déjà cette plante. Sinon aucune : l'utilisateur choisit.
 */
export function defaultZoneKey(ranked: RankedZone[]): string | null {
  if (ranked.length === 1) return ranked[0].zone.key
  if (ranked.length > 1 && ranked[0].sameCount > 0 && ranked[1].sameCount === 0) return ranked[0].zone.key
  return null
}

export function defaultLocationType(zone: ZoneOption): LocationType {
  return zone.kind === "serre" ? "pot" : "pleine_terre"
}

// ------------------------------- Validation ---------------------------------

export interface PlacementInput {
  source: PlacementSource
  zone: ZoneOption | null
  /** Obligatoire pour une serre. */
  tableId: string
  locationType: LocationType
  soilType: string
  count: string
  plantedAt: string
  notes: string
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Message d'erreur en français, ou null si la saisie est valide. */
export function validatePlacement(input: PlacementInput, today: string): string | null {
  if (!input.zone) return "Choisissez la serre ou la parcelle où placer cette plante."
  if (input.zone.kind === "serre") {
    if (input.zone.tables.length === 0) return "Cette serre n'a aucune table : ajoutez-en une dans « Gérer »."
    if (!input.zone.tables.some((table) => table.id === input.tableId)) return "Choisissez la table de la serre."
  }
  if (!isIsoDate(input.plantedAt)) return "La date de mise en place est invalide."
  if (input.plantedAt > today) return "La date de mise en place ne peut pas être dans le futur."
  if (input.source.kind === "catalogue") {
    const count = Number.parseInt(input.count, 10)
    if (!Number.isInteger(count) || count < 1) return "Indiquez au moins 1 plant."
    if (count > MAX_PLANTS_PER_PLACEMENT) return `Maximum ${MAX_PLANTS_PER_PLACEMENT} plants à la fois.`
  }
  return null
}

export function placementCount(input: Pick<PlacementInput, "source" | "count">): number {
  if (input.source.kind === "semis") return 1
  return Math.min(MAX_PLANTS_PER_PLACEMENT, Math.max(1, Number.parseInt(input.count, 10) || 1))
}

export interface PlantingRow {
  variety_id: string | null
  seedling_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
  group_id: string
  individual_number: number
  planted_at: string
  plant_count: 1
  soil_type: string | null
  container_type: string | null
  location_type: LocationType
  notes: string
}

/** Lignes field_plantings à insérer : une par plant, regroupées par group_id. */
export function buildPlantingRows(input: PlacementInput, groupId: string): PlantingRow[] {
  if (!input.zone) return []
  const total = placementCount(input)
  return Array.from({ length: total }, (_, index) => ({
    variety_id: input.source.kind === "catalogue" ? input.source.id : null,
    seedling_id: input.source.kind === "semis" ? input.source.id : null,
    greenhouse_table_id: input.zone?.kind === "serre" ? input.tableId : null,
    parcelle_id: input.zone?.kind === "parcelle" ? input.zone.id : null,
    group_id: groupId,
    individual_number: index + 1,
    planted_at: input.plantedAt,
    plant_count: 1 as const,
    soil_type: input.locationType === "pleine_terre" ? input.soilType || null : null,
    container_type: input.locationType === "pot" ? "Terreau" : null,
    location_type: input.locationType,
    notes: input.notes.trim(),
  }))
}

// ------------------------- Parents à placer (migration 034) -----------------

export interface UnplacedParentRow {
  variety_id: string | null
  seedling_id: string | null
  name: string | null
  cross_count: number
  as_mother: number
  as_father: number
  last_pollination_date: string | null
}

export interface UnplacedParents {
  /** Mères : la plante qui porte le fruit doit physiquement exister. */
  mothers: UnplacedParentRow[]
  /** Pères : le pollen peut venir d'ailleurs ; liste facultative. */
  fathersOnly: UnplacedParentRow[]
}

export function splitUnplacedParents(rows: UnplacedParentRow[]): UnplacedParents {
  const usable = rows.filter((row) => row.variety_id || row.seedling_id)
  const byActivity = (a: UnplacedParentRow, b: UnplacedParentRow) =>
    b.cross_count - a.cross_count || (a.name ?? "").localeCompare(b.name ?? "", "fr")
  return {
    mothers: usable.filter((row) => row.as_mother > 0).sort(byActivity),
    fathersOnly: usable.filter((row) => row.as_mother === 0).sort(byActivity),
  }
}

export function parentToSource(row: UnplacedParentRow): PlacementSource | null {
  const name = row.name ?? "Plante"
  if (row.variety_id) return { kind: "catalogue", id: row.variety_id, name }
  if (row.seedling_id) return { kind: "semis", id: row.seedling_id, name }
  return null
}
