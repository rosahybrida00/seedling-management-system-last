// ---------------------------------------------------------------------------
// navigation — liens directs vers une serre, une parcelle, un onglet ou un plant.
//
// Une notification (ou, plus tard, un tag de l'historique) ouvre directement la
// bonne zone au bon endroit : /serre?zone=serre:<id>&tab=programme&plant=<id>.
// Sur la page /serre déjà ouverte, le lien ne recharge rien : un événement
// prévient la page, qui bascule sur l'onglet « Serres & Parcelles » et ouvre la zone.
// ---------------------------------------------------------------------------

export type ZoneTab = "varietes" | "graines" | "programme"
export const ZONE_TABS: ZoneTab[] = ["varietes", "graines", "programme"]
export const NAVIGATE_EVENT = "seedling:navigate"
export const DATA_CHANGED_EVENT = "seedling:data-changed"

export interface ZoneNav {
  /** « serre:<id> » ou « parcelle:<id> » */
  zone: string
  tab?: ZoneTab
  /** Identifiant d'un plant à ouvrir directement. */
  plant?: string
}

const ZONE_PATTERN = /^(serre|parcelle):[A-Za-z0-9-]+$/
const PLANT_PATTERN = /^[A-Za-z0-9-]+$/

export function zoneHref(nav: ZoneNav): string {
  const params = new URLSearchParams()
  params.set("zone", nav.zone)
  if (nav.tab) params.set("tab", nav.tab)
  if (nav.plant) params.set("plant", nav.plant)
  return `/serre?${params.toString()}`
}

/** Lit un lien direct ; ignore tout ce qui n'a pas la forme attendue (jamais d'identifiant inventé). */
export function parseZoneNav(search: string): ZoneNav | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const zone = params.get("zone")
  if (!zone || !ZONE_PATTERN.test(zone)) return null
  const tab = params.get("tab")
  const plant = params.get("plant")
  return {
    zone,
    ...(tab && (ZONE_TABS as string[]).includes(tab) ? { tab: tab as ZoneTab } : {}),
    ...(plant && PLANT_PATTERN.test(plant) ? { plant } : {}),
  }
}

export function emitZoneNav(nav: ZoneNav): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<ZoneNav>(NAVIGATE_EVENT, { detail: nav }))
}

export function emitDataChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
}
