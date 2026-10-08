// ---------------------------------------------------------------------------
// seedLotRules — règles de la stratification et du semis d'un lot de graines.
//
// La chaîne est : pollinisation <= récolte du fruit <= début de stratification
// <= fin de stratification <= semis. Le semis est un acte réalisé : il ne peut
// pas être daté dans le futur. La stratification peut être planifiée à l'avance
// (une fin de stratification à venir est normale).
//
// Logique pure, sans accès Supabase. La base applique les mêmes bornes
// (migration 034) ; ces règles évitent d'envoyer une saisie qui sera refusée.
// ---------------------------------------------------------------------------

import { isIsoDate } from "@/lib/services/plantTimeline"
import type { SeedLot } from "@/app/parcelle/types"

export interface StratificationInput {
  harvestDate: string | null
  start: string
  end: string
}

export function stratificationProblem(input: StratificationInput): string | null {
  const { harvestDate, start, end } = input
  if (start && !isIsoDate(start)) return "La date de début de stratification est invalide."
  if (end && !isIsoDate(end)) return "La date de fin de stratification est invalide."
  if (end && !start) return "Indiquez d'abord la date de début de stratification."
  if (start && harvestDate && start < harvestDate) return `La stratification (début le ${start}) ne peut pas précéder la récolte du fruit (${harvestDate}).`
  if (start && end && end < start) return "La fin de stratification ne peut pas précéder son début."
  return null
}

export interface SowingInput {
  harvestDate: string | null
  stratificationEnd: string
  sowingDate: string
  today: string
  zoneKind: "serre" | "parcelle"
  tableId: string
  cultureType: string
  substrate: string
}

/** Bornes des champs de date du formulaire de semis. */
export function sowingDateBounds(harvestDate: string | null, stratificationEnd: string, today: string): { min: string | undefined; max: string } {
  const candidates = [harvestDate, stratificationEnd].filter((value): value is string => Boolean(value))
  const min = candidates.length > 0 ? candidates.reduce((latest, value) => (value > latest ? value : latest)) : undefined
  return { min, max: today }
}

export function sowingProblem(input: SowingInput): string | null {
  if (!isIsoDate(input.sowingDate)) return "La date de semis est invalide."
  if (input.sowingDate > input.today) return "Le semis ne peut pas être daté dans le futur."
  if (input.harvestDate && input.sowingDate < input.harvestDate) return `Le semis (${input.sowingDate}) ne peut pas précéder la récolte du fruit (${input.harvestDate}).`
  if (input.stratificationEnd && isIsoDate(input.stratificationEnd) && input.sowingDate < input.stratificationEnd) {
    return `Le semis (${input.sowingDate}) ne peut pas précéder la fin de la stratification (${input.stratificationEnd}).`
  }
  if (input.cultureType !== "pot" && input.cultureType !== "pleine_terre") return "Choisissez le type de culture."
  if (input.zoneKind === "serre" && !input.tableId) return "Choisissez la planche (table) de la serre où semer."
  if (input.cultureType === "pot" && !input.substrate) return "Choisissez le type de terreau."
  return null
}

export interface LotGroups {
  /** Lots récoltés pas encore affectés à une serre ou une parcelle : à semer. */
  toSow: SeedLot[]
  /** Lots semés dans cette zone. */
  sownHere: SeedLot[]
}

export function groupLotsForZone(batches: SeedLot[], zone: { kind: "serre" | "parcelle"; id: string }, zoneTableIds: Set<string>): LotGroups {
  const sownHere = batches.filter((batch) => (zone.kind === "serre" ? batch.table_id != null && zoneTableIds.has(batch.table_id) : batch.parcelle_id === zone.id))
  const toSow = batches.filter((batch) => batch.table_id == null && batch.parcelle_id == null)
  return { toSow, sownHere }
}

export function lotLabel(batch: Pick<SeedLot, "fruit_code" | "seed_count">): string {
  return `${batch.fruit_code ?? "Lot sans code"} · ${batch.seed_count} graine${batch.seed_count > 1 ? "s" : ""}`
}

/**
 * Date d'origine d'un lot : récolte du fruit, à défaut pollinisation du croisement.
 * Les lots créés automatiquement à la récolte n'ont pas toujours leur propre date
 * de récolte : elle se déduit du fruit, puis du croisement. C'est la borne basse de
 * toute la chaîne stratification, semis, levée.
 */
export function withOriginDates(
  lots: SeedLot[],
  fruits: Array<{ id: string; harvest_date: string | null }>,
  crosses: Array<{ id: string; pollination_date?: string | null }>,
): SeedLot[] {
  const fruitDate = new Map(fruits.map((fruit) => [fruit.id, fruit.harvest_date]))
  const crossDate = new Map(crosses.map((cross) => [cross.id, cross.pollination_date ?? null]))
  return lots.map((lot) => ({
    ...lot,
    harvest_date: lot.harvest_date ?? (lot.fruit_id ? fruitDate.get(lot.fruit_id) ?? null : null) ?? crossDate.get(lot.cross_id) ?? null,
  }))
}
