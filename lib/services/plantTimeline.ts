// ---------------------------------------------------------------------------
// plantTimeline — frise chronologique unique d'un plant ou d'une variété.
//
// Regroupe au même endroit, sur une seule échelle de temps, l'histoire de la
// variété : ses soins planifiés ou faits (programmes de zone et programmes
// individuels du calendrier choisi), ses observations sanitaires et les
// croisements réalisés. Rien d'autre : ni autre variété, ni comparaison.
//
// Logique pure (aucun accès Supabase) : construction des éléments, classement
// passé / aujourd'hui / à venir, et règles de validation des saisies.
// ---------------------------------------------------------------------------

import {
  DISEASE_PRESSURE_LABELS,
  FERTILIZER_LABELS,
  FIELD_TREATMENT_LABELS,
  PEST_LABELS,
  PROGRAM_RESULT_LABELS,
  PROGRAM_TYPE_LABELS,
} from "@/lib/domain/fieldLabels"

export type TimelineKind = "tache" | "observation" | "croisement"
export type Bucket = "sans_date" | "en_retard" | "aujourdhui" | "cette_semaine" | "plus_tard" | "passe"
export type BadgeTone = "neutral" | "primary" | "accent" | "warning" | "danger" | "success"

export interface TimelineBadge {
  label: string
  tone: BadgeTone
}

export interface PlantRef {
  id: string
  label: string
  plantedAt: string
}

// ----------------------------- Données brutes -------------------------------

export interface RawWeather {
  temperature: number | null
  humidity: number | null
  uv_index: number | null
}

export interface RawTaskRow {
  id: string
  intervention_id: string
  planting_id: string
  done: boolean
  done_date: string | null
  result: string | null
  notes: string
  due_date: string | null
  program_id: string
  program_type: string
  product_name: string
  treatment_codes: string[] | null
  fertilizer_code: string | null
  /** Renseigné si le programme est individuel (un seul plant), null pour un programme de zone. */
  program_planting_id: string | null
  template_step_id: string | null
  weather: RawWeather | null
}

export interface RawObservation {
  id: string
  planting_id: string
  observation_date: string
  disease_pressure: string[] | null
  pests: string[] | null
  treatment_applied: string[] | null
  remarque: string | null
  weather: RawWeather | null
}

export interface RawCrossing {
  planting_id: string
  cross_id: string
  cross_code: string | null
  role: "mere" | "pere"
  partner_name: string | null
  pollination_date: string | null
  status: string | null
  fruit_count: number | null
  seed_count: number | null
}

// ------------------------------- Éléments -----------------------------------

export interface TaskMember {
  taskId: string
  plantingId: string
  plantLabel: string
  plantedAt: string
  done: boolean
  doneDate: string | null
  result: string | null
  notes: string
  weather: RawWeather | null
}

export interface TimelineTask {
  interventionId: string
  programId: string
  programType: string
  productName: string
  treatmentCodes: string[]
  fertilizerCode: string | null
  scope: "zone" | "individuel"
  dueDate: string | null
  templateStepId: string | null
  members: TaskMember[]
}

export interface TimelineItem {
  key: string
  kind: TimelineKind
  /** Date de référence : échéance si à faire, date de réalisation si fait. */
  date: string | null
  title: string
  detail: string | null
  badges: TimelineBadge[]
  task?: TimelineTask
  /** Plants concernés pour un élément non-tâche (affichage en portée « variété »). */
  plantLabels: string[]
}

export interface BuildInput {
  plants: PlantRef[]
  tasks: RawTaskRow[]
  observations: RawObservation[]
  crossings: RawCrossing[]
}

// ------------------------------- Utilitaires --------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

function datePart(value: string | null | undefined): string | null {
  if (!value) return null
  const day = value.slice(0, 10)
  return isIsoDate(day) ? day : null
}

function labelList(codes: string[] | null | undefined, labels: Record<string, string>): string[] {
  return (codes ?? []).map((code) => labels[code] ?? code)
}

function productLabel(row: Pick<RawTaskRow, "program_type" | "product_name" | "treatment_codes" | "fertilizer_code">): string {
  if (row.product_name?.trim()) return row.product_name
  if (row.program_type === "fertilisation" && row.fertilizer_code) return FERTILIZER_LABELS[row.fertilizer_code] ?? row.fertilizer_code
  return labelList(row.treatment_codes, FIELD_TREATMENT_LABELS).join(" + ") || "Intervention"
}

// --------------------------- Construction de la frise -----------------------

export function buildTimeline(input: BuildInput): TimelineItem[] {
  const plantById = new Map(input.plants.map((plant) => [plant.id, plant]))
  const items: TimelineItem[] = []

  // Soins : une ligne par échéance, avec un membre par plant concerné.
  const byIntervention = new Map<string, RawTaskRow[]>()
  for (const row of input.tasks) {
    if (!plantById.has(row.planting_id)) continue
    const list = byIntervention.get(row.intervention_id) ?? []
    list.push(row)
    byIntervention.set(row.intervention_id, list)
  }
  for (const [interventionId, rows] of byIntervention) {
    const first = rows[0]
    const members: TaskMember[] = rows
      .map((row) => {
        const plant = plantById.get(row.planting_id) as PlantRef
        return {
          taskId: row.id,
          plantingId: row.planting_id,
          plantLabel: plant.label,
          plantedAt: plant.plantedAt,
          done: row.done,
          doneDate: row.done_date,
          result: row.result,
          notes: row.notes ?? "",
          weather: row.weather,
        }
      })
      .sort((a, b) => a.plantLabel.localeCompare(b.plantLabel, "fr", { numeric: true }))
    const allDone = members.every((member) => member.done)
    const doneCount = members.filter((member) => member.done).length
    const lastDone = members.reduce<string | null>((latest, m) => (m.doneDate && (!latest || m.doneDate > latest) ? m.doneDate : latest), null)
    const badges: TimelineBadge[] = [
      { label: PROGRAM_TYPE_LABELS[first.program_type] ?? first.program_type, tone: first.program_type === "curatif" ? "danger" : first.program_type === "fertilisation" ? "accent" : "primary" },
      { label: first.program_planting_id ? "Individuel" : "Zone", tone: "neutral" },
    ]
    if (members.length > 1) badges.push({ label: `${doneCount}/${members.length} plants`, tone: allDone ? "success" : doneCount > 0 ? "warning" : "neutral" })
    else if (allDone) badges.push({ label: "Fait", tone: "success" })
    const resultLabels = Array.from(new Set(members.filter((m) => m.done && m.result).map((m) => PROGRAM_RESULT_LABELS[m.result as string] ?? (m.result as string))))
    for (const label of resultLabels) badges.push({ label, tone: label === PROGRAM_RESULT_LABELS.echec ? "danger" : label === PROGRAM_RESULT_LABELS.amelioration ? "success" : "neutral" })

    items.push({
      key: `tache:${interventionId}`,
      kind: "tache",
      date: allDone ? lastDone : first.due_date,
      title: productLabel(first),
      detail: null,
      badges,
      plantLabels: members.map((member) => member.plantLabel),
      task: {
        interventionId,
        programId: first.program_id,
        programType: first.program_type,
        productName: productLabel(first),
        treatmentCodes: first.treatment_codes ?? [],
        fertilizerCode: first.fertilizer_code,
        scope: first.program_planting_id ? "individuel" : "zone",
        dueDate: first.due_date,
        templateStepId: first.template_step_id,
        members,
      },
    })
  }

  // Observations : une ligne par observation (par plant).
  for (const obs of input.observations) {
    const plant = plantById.get(obs.planting_id)
    if (!plant) continue
    const badges: TimelineBadge[] = [
      ...labelList(obs.disease_pressure, DISEASE_PRESSURE_LABELS).map((label) => ({ label, tone: "danger" as const })),
      ...labelList(obs.pests, PEST_LABELS).map((label) => ({ label, tone: "warning" as const })),
      ...labelList(obs.treatment_applied, FIELD_TREATMENT_LABELS).map((label) => ({ label, tone: "primary" as const })),
    ]
    items.push({
      key: `observation:${obs.id}`,
      kind: "observation",
      date: datePart(obs.observation_date),
      title: "Observation",
      detail: obs.remarque?.trim() || null,
      badges,
      plantLabels: [plant.label],
    })
  }

  // Croisements : un par croisement, même si plusieurs plants de la variété sont affichés.
  const seenCrossings = new Set<string>()
  for (const crossing of input.crossings) {
    if (!plantById.has(crossing.planting_id)) continue
    const key = `${crossing.cross_id}:${crossing.role}`
    if (seenCrossings.has(key)) continue
    seenCrossings.add(key)
    const counts = [
      crossing.fruit_count ? `${crossing.fruit_count} fruit${crossing.fruit_count > 1 ? "s" : ""}` : null,
      crossing.seed_count ? `${crossing.seed_count} graine${crossing.seed_count > 1 ? "s" : ""}` : null,
    ].filter(Boolean).join(" · ")
    items.push({
      key: `croisement:${key}`,
      kind: "croisement",
      date: datePart(crossing.pollination_date),
      title: `${crossing.role === "mere" ? "Mère" : "Père"} × ${crossing.partner_name ?? "parent inconnu"}`,
      detail: [crossing.cross_code, counts].filter(Boolean).join(" · ") || null,
      badges: crossing.status ? [{ label: crossing.status, tone: crossing.status === "Avorté" ? "danger" : crossing.status === "Récolté" ? "success" : "primary" }] : [],
      plantLabels: [],
    })
  }

  return items
}

// ------------------------------ Classement ----------------------------------

function isOpenTask(item: TimelineItem): boolean {
  return item.kind === "tache" && !!item.task && item.task.members.some((member) => !member.done)
}

export function bucketOf(item: TimelineItem, today: string): Bucket {
  if (isOpenTask(item)) {
    const due = item.task?.dueDate ?? null
    if (!due) return "sans_date"
    const diff = daysBetween(today, due)
    if (diff < 0) return "en_retard"
    if (diff === 0) return "aujourdhui"
    if (diff <= 7) return "cette_semaine"
    return "plus_tard"
  }
  return "passe"
}

export interface TimelineSection {
  id: string
  bucket: Bucket
  label: string
  items: TimelineItem[]
}

const BUCKET_LABELS: Record<Exclude<Bucket, "passe">, string> = {
  sans_date: "À planifier (sans date)",
  en_retard: "En retard",
  aujourdhui: "Aujourd'hui",
  cette_semaine: "Cette semaine",
  plus_tard: "Plus tard",
}

const KIND_ORDER: Record<TimelineKind, number> = { tache: 0, observation: 1, croisement: 2 }

export function monthLabel(isoDate: string): string {
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Sections dans l'ordre de lecture : ce qui demande une action d'abord (retards,
 * aujourd'hui, cette semaine, plus tard), puis l'historique du plus récent au
 * plus ancien, par mois.
 */
export function groupTimeline(items: TimelineItem[], today: string): TimelineSection[] {
  const buckets = new Map<Bucket, TimelineItem[]>()
  const past: TimelineItem[] = []
  for (const item of items) {
    const bucket = bucketOf(item, today)
    if (bucket === "passe") past.push(item)
    else buckets.set(bucket, [...(buckets.get(bucket) ?? []), item])
  }

  const sections: TimelineSection[] = []
  for (const bucket of ["en_retard", "aujourdhui", "cette_semaine", "plus_tard", "sans_date"] as const) {
    const list = buckets.get(bucket)
    if (!list || list.length === 0) continue
    // Retards : les plus anciens d'abord (les plus urgents) ; avenir : les plus proches d'abord.
    list.sort((a, b) => (a.task?.dueDate ?? "").localeCompare(b.task?.dueDate ?? "") || a.title.localeCompare(b.title, "fr"))
    sections.push({ id: bucket, bucket, label: BUCKET_LABELS[bucket], items: list })
  }

  past.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
  const months = new Map<string, TimelineItem[]>()
  const undated: TimelineItem[] = []
  for (const item of past) {
    if (!item.date) { undated.push(item); continue }
    const key = item.date.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), item])
  }
  for (const [key, list] of months) sections.push({ id: `passe:${key}`, bucket: "passe", label: monthLabel(`${key}-01`), items: list })
  if (undated.length > 0) sections.push({ id: "passe:sans-date", bucket: "passe", label: "Sans date", items: undated })
  return sections
}

export interface TimelineSummary {
  overdue: number
  today: number
  week: number
  later: number
  done: number
}

export function summarize(items: TimelineItem[], today: string): TimelineSummary {
  const summary: TimelineSummary = { overdue: 0, today: 0, week: 0, later: 0, done: 0 }
  for (const item of items) {
    if (item.kind !== "tache") continue
    switch (bucketOf(item, today)) {
      case "en_retard": summary.overdue += 1; break
      case "aujourdhui": summary.today += 1; break
      case "cette_semaine": summary.week += 1; break
      case "plus_tard": summary.later += 1; break
      case "passe": summary.done += 1; break
      default: break
    }
  }
  return summary
}

// ------------------------------- Validation ---------------------------------

export const RESULT_KEYS = Object.keys(PROGRAM_RESULT_LABELS)

/** Date de réalisation : ni avant la mise en place d'un plant concerné, ni dans le futur. */
export function completionProblem(input: { doneDate: string; result: string; members: TaskMember[]; today: string }): string | null {
  if (!isIsoDate(input.doneDate)) return "La date de réalisation est invalide."
  if (input.doneDate > input.today) return "Un soin ne peut pas être enregistré à une date future : planifiez-le plutôt."
  if (input.result && !RESULT_KEYS.includes(input.result)) return "Résultat inconnu."
  const tooEarly = input.members.filter((member) => input.doneDate < member.plantedAt)
  if (tooEarly.length > 0) {
    const first = tooEarly[0]
    return `Le soin (${input.doneDate}) ne peut pas précéder la mise en place de ${first.plantLabel} (${first.plantedAt}).`
  }
  return null
}

export function rescheduleProblem(input: { newDate: string; members: TaskMember[] }): string | null {
  if (!isIsoDate(input.newDate)) return "La date est invalide."
  const latestPlanted = input.members.reduce((latest, member) => (member.plantedAt > latest ? member.plantedAt : latest), "")
  if (latestPlanted && input.newDate < latestPlanted) return `La date ne peut pas précéder la mise en place du plant (${latestPlanted}).`
  return null
}

export interface NewInterventionInput {
  programType: string
  treatmentCodes: string[]
  fertilizerCode: string
  date: string
  alreadyDone: boolean
  result: string
  plantedAt: string
  today: string
}

export const NEW_INTERVENTION_TYPES = ["preventif", "curatif", "fertilisation"] as const

export function newInterventionProblem(input: NewInterventionInput): string | null {
  if (!(NEW_INTERVENTION_TYPES as readonly string[]).includes(input.programType)) return "Choisissez le type d'intervention."
  if (input.programType === "fertilisation") {
    if (!input.fertilizerCode || !(input.fertilizerCode in FERTILIZER_LABELS)) return "Choisissez l'amendement."
  } else if (input.treatmentCodes.length === 0 || input.treatmentCodes.some((code) => !(code in FIELD_TREATMENT_LABELS))) {
    return "Choisissez au moins un traitement."
  }
  if (!isIsoDate(input.date)) return "La date est invalide."
  if (input.date < input.plantedAt) return `La date ne peut pas précéder la mise en place du plant (${input.plantedAt}).`
  if (input.alreadyDone) {
    if (input.date > input.today) return "Une intervention à venir ne peut pas être marquée comme faite."
    if (input.result && !RESULT_KEYS.includes(input.result)) return "Résultat inconnu."
  }
  return null
}

export function newInterventionProductName(input: Pick<NewInterventionInput, "programType" | "treatmentCodes" | "fertilizerCode">): string {
  if (input.programType === "fertilisation") return FERTILIZER_LABELS[input.fertilizerCode] ?? ""
  return input.treatmentCodes.map((code) => FIELD_TREATMENT_LABELS[code] ?? code).join(" + ")
}
