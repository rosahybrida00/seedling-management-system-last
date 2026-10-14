// ---------------------------------------------------------------------------
// notificationService — la liste des notifications, en phrases claires.
//
// Quatre sortes de notifications, calculées à partir des données existantes
// (aucune table de plus) :
//   - un problème sanitaire observé récemment et pas encore traité (urgent) ;
//   - un soin en retard (urgent) ;
//   - un soin à faire aujourd'hui ;
//   - un rappel pour demain ou après-demain.
// Chaque notification est une phrase complète et ouvre la bonne zone, au bon
// onglet. Logique pure ici ; le chargement Supabase est à part.
// ---------------------------------------------------------------------------

import { DISEASE_PRESSURE_LABELS, PEST_LABELS } from "@/lib/domain/fieldLabels"
import { SIGNAL_RULES } from "@/lib/domain/treatmentMatrix"
import { joinList, longDate, lowerFirst, programTargets, upperFirst } from "@/lib/services/narrative"
import { zoneHref, type ZoneNav } from "@/lib/navigation"

export type NotificationKind = "sanitaire" | "retard" | "aujourdhui" | "bientot"
export type NotificationSeverity = "urgent" | "aujourdhui" | "info"

export interface AppNotification {
  id: string
  kind: NotificationKind
  severity: NotificationSeverity
  /** Phrase complète, lisible telle quelle. */
  message: string
  nav: ZoneNav | null
  href: string | null
}

export interface OpenIntervention {
  id: string
  dueDate: string
  programId: string
}

export interface ProgramInfo {
  id: string
  type: string
  product: string
  notes: string | null
  /** Zone du programme : « serre:<id> », « parcelle:<id> », ou null si introuvable. */
  zoneKey: string | null
  plantingId: string | null
}

export interface RecentObservation {
  id: string
  plantingId: string
  date: string
  diseases: string[]
  pests: string[]
}

export interface PlantInfo {
  id: string
  zoneKey: string | null
  /** Nom de la variété (ou code du semis). */
  name: string
}

export interface NotificationInput {
  today: string
  interventions: OpenIntervention[]
  programs: Map<string, ProgramInfo>
  zoneNames: Map<string, string>
  plants: Map<string, PlantInfo>
  observations: RecentObservation[]
  /** Date la plus récente d'un soin curatif prévu ou fait, par plant. */
  curativeByPlant: Map<string, string>
}

export const SOON_DAYS = 2
export const RECENT_OBSERVATION_DAYS = 14

const MS_PER_DAY = 24 * 60 * 60 * 1000
function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY)
}

function placeOf(zoneKey: string | null, zoneNames: Map<string, string>): string {
  const name = zoneKey ? zoneNames.get(zoneKey) : null
  return name ? ` dans ${name}` : ""
}

function actionText(program: ProgramInfo): string {
  if (program.type === "hygiene") return program.product
  const targets = programTargets(program.notes)
  const against = targets.length > 0 ? ` contre ${joinList(targets)}` : ""
  if (program.type === "fertilisation") return `apporter ${lowerFirst(program.product)}`
  return `appliquer ${lowerFirst(program.product)}${against}`
}

function signalName(code: string): string {
  return lowerFirst(DISEASE_PRESSURE_LABELS[code] ?? PEST_LABELS[code] ?? code)
}

export function buildNotifications(input: NotificationInput): AppNotification[] {
  const { today } = input
  const out: AppNotification[] = []

  // 1. Problèmes sanitaires récents sans traitement prévu ou fait depuis l'observation.
  const pendingByPlant = new Map<string, { signals: Set<string>; latest: string }>()
  for (const obs of input.observations) {
    const age = dayDiff(obs.date, today)
    if (age < 0 || age > RECENT_OBSERVATION_DAYS) continue
    const signals = [...obs.diseases, ...obs.pests].filter((code) => code in SIGNAL_RULES || code in DISEASE_PRESSURE_LABELS || code in PEST_LABELS)
    if (signals.length === 0) continue
    const curative = input.curativeByPlant.get(obs.plantingId)
    if (curative && curative >= obs.date) continue
    const entry = pendingByPlant.get(obs.plantingId) ?? { signals: new Set<string>(), latest: obs.date }
    signals.forEach((code) => entry.signals.add(code))
    if (obs.date > entry.latest) entry.latest = obs.date
    pendingByPlant.set(obs.plantingId, entry)
  }
  for (const [plantId, entry] of pendingByPlant) {
    const plant = input.plants.get(plantId)
    const where = plant ? ` sur ${plant.name}${plant.zoneKey && input.zoneNames.get(plant.zoneKey) ? ` (${input.zoneNames.get(plant.zoneKey)})` : ""}` : ""
    const names = joinList([...entry.signals].map(signalName))
    out.push({
      id: `sanitaire:${plantId}:${entry.latest}`,
      kind: "sanitaire",
      severity: "urgent",
      message: `${upperFirst(names)} relevé${entry.signals.size > 1 ? "s" : ""} le ${longDate(entry.latest, today)}${where} : aucun traitement n'est prévu. Un plan de traitement est prêt à valider.`,
      nav: plant?.zoneKey ? { zone: plant.zoneKey, tab: "varietes", plant: plantId } : null,
      href: plant?.zoneKey ? zoneHref({ zone: plant.zoneKey, tab: "varietes", plant: plantId }) : null,
    })
  }

  // 2. Soins en retard, du jour, et rappels des prochains jours.
  const seen = new Set<string>()
  for (const intervention of input.interventions) {
    const program = input.programs.get(intervention.programId)
    if (!program) continue
    const key = `${intervention.programId}:${intervention.dueDate}`
    if (seen.has(key)) continue
    seen.add(key)
    const diff = dayDiff(today, intervention.dueDate)
    const plant = program.plantingId ? input.plants.get(program.plantingId) : null
    const zoneKey = program.zoneKey ?? plant?.zoneKey ?? null
    const place = placeOf(zoneKey, input.zoneNames)
    const onPlant = plant ? ` sur ${plant.name}` : ""
    const nav: ZoneNav | null = zoneKey ? { zone: zoneKey, tab: plant ? "varietes" : "programme", ...(plant ? { plant: plant.id } : {}) } : null
    const base = { nav, href: nav ? zoneHref(nav) : null }

    if (diff < 0) {
      out.push({ id: `retard:${key}`, kind: "retard", severity: "urgent", ...base, message: `${upperFirst(program.product)} devait être appliqué le ${longDate(intervention.dueDate, today)}${onPlant}${place} : ${-diff} jour${-diff > 1 ? "s" : ""} de retard.` })
    } else if (diff === 0) {
      out.push({ id: `aujourdhui:${key}`, kind: "aujourdhui", severity: "aujourdhui", ...base, message: `Aujourd'hui : ${actionText(program)}${onPlant}${place}.` })
    } else if (diff <= SOON_DAYS) {
      out.push({ id: `bientot:${key}`, kind: "bientot", severity: "info", ...base, message: `${diff === 1 ? "Demain" : "Après-demain"} : ${actionText(program)}${onPlant}${place}.` })
    }
  }

  // Les plus urgents d'abord : sanitaire, retards (les plus anciens en tête), aujourd'hui, rappels.
  const order: Record<NotificationKind, number> = { sanitaire: 0, retard: 1, aujourdhui: 2, bientot: 3 }
  return out.sort((a, b) => order[a.kind] - order[b.kind] || a.id.localeCompare(b.id))
}

/** Nombre affiché sur la cloche : ce qui demande une action maintenant. */
export function badgeCount(notifications: AppNotification[]): number {
  return notifications.filter((notification) => notification.severity !== "info").length
}

/** Texte de l'alerte du navigateur (une seule alerte résumée, jamais une par ligne). */
export function browserAlert(notifications: AppNotification[]): { title: string; body: string } | null {
  const count = badgeCount(notifications)
  if (count === 0) return null
  const first = notifications.find((notification) => notification.severity !== "info")
  return { title: count === 1 ? "1 chose à traiter dans vos serres et parcelles" : `${count} choses à traiter dans vos serres et parcelles`, body: first?.message ?? "" }
}
