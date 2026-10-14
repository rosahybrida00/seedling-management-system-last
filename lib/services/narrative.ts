// ---------------------------------------------------------------------------
// narrative — transforme les données de l'historique en phrases claires.
//
// Avant : une rangée de pastilles serrées (« Oïdium » « Thrips » « Soufre »
// « Amélioration » « 1/3 plants »…) que personne ne pouvait lire d'un coup d'œil.
// Maintenant : une phrase française par événement, avec la date, ce qui s'est
// passé, où et avec quel résultat. Logique pure, sans accès Supabase.
// ---------------------------------------------------------------------------

import {
  CLIMATE_BEHAVIOR_LABELS,
  DISEASE_PRESSURE_LABELS,
  FIELD_TREATMENT_LABELS,
  PEST_LABELS,
  PROGRAM_RESULT_LABELS,
  TREATMENT_REACTION_LABELS,
} from "@/lib/domain/fieldLabels"

export interface Weather {
  temperature: number | null
  humidity: number | null
  uv_index?: number | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** « a », « a et b », « a, b et c ». */
export function joinList(items: string[]): string {
  const clean = items.filter((item) => item.trim() !== "")
  if (clean.length <= 1) return clean[0] ?? ""
  return `${clean.slice(0, -1).join(", ")} et ${clean[clean.length - 1]}`
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** « 3 octobre » ; avec l'année si ce n'est pas l'année en cours. */
export function longDate(isoDate: string, today: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  const withYear = isoDate.slice(0, 4) !== today.slice(0, 4)
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(date)
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / MS_PER_DAY)
}

/** « aujourd'hui », « demain », « hier », « le 13 octobre ». */
export function relativeDate(isoDate: string, today: string): string {
  const diff = dayDiff(today, isoDate)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return "demain"
  if (diff === -1) return "hier"
  return `le ${longDate(isoDate, today)}`
}

export function weatherText(weather: Weather | null | undefined): string {
  if (!weather || (weather.temperature == null && weather.humidity == null && weather.uv_index == null)) return ""
  const parts = [
    weather.temperature != null ? `${Math.round(weather.temperature)} °C` : null,
    weather.humidity != null ? `${Math.round(weather.humidity)} % d'humidité` : null,
    weather.uv_index != null ? `indice UV ${Math.round(weather.uv_index)}` : null,
  ].filter(Boolean)
  return ` (${parts.join(", ")})`
}

function labels(codes: string[] | null | undefined, table: Record<string, string>): string[] {
  return (codes ?? []).map((code) => lowerFirst(table[code] ?? code))
}

const plural = (count: number, one: string, many: string) => (count > 1 ? many : one)

// ------------------------------- Observation --------------------------------

export interface ObservationFacts {
  date: string
  diseases: string[] | null
  pests: string[] | null
  climate?: string[] | null
  remark?: string | null
  /** Anciennes observations : le traitement et la réaction étaient saisis ici. */
  treatmentApplied?: string[] | null
  treatmentReaction?: string[] | null
  /** Ancien champ « date d'intervention » des observations. */
  interventionDate?: string | null
  weather?: Weather | null
}

export function describeObservation(facts: ObservationFacts, today: string, where?: string): string {
  const diseases = labels(facts.diseases, DISEASE_PRESSURE_LABELS)
  const pests = labels(facts.pests, PEST_LABELS)
  const found = [...diseases, ...pests]
  const place = where ? ` sur ${where}` : ""
  const sentences: string[] = []
  sentences.push(
    found.length > 0
      ? `Le ${longDate(facts.date, today)}, ${joinList(found)} ${plural(found.length, "relevé", "relevés")}${place}${weatherText(facts.weather)}.`
      : `Le ${longDate(facts.date, today)}, aucun problème sanitaire relevé${place}${weatherText(facts.weather)}.`,
  )
  const climate = labels(facts.climate, CLIMATE_BEHAVIOR_LABELS)
  if (climate.length > 0) sentences.push(`Comportement face au climat : ${joinList(climate)}.`)
  const treatments = labels(facts.treatmentApplied, FIELD_TREATMENT_LABELS)
  if (treatments.length > 0) sentences.push(`Traitement noté à l'époque : ${joinList(treatments)}.`)
  const reaction = labels(facts.treatmentReaction, TREATMENT_REACTION_LABELS)
  if (reaction.length > 0) sentences.push(`Réaction au traitement : ${joinList(reaction)}.`)
  if (facts.interventionDate) sentences.push(`Intervention le ${longDate(facts.interventionDate, today)}.`)
  if (facts.remark?.trim()) sentences.push(`Remarque : ${facts.remark.trim().replace(/[.\s]+$/, "")}.`)
  return sentences.join(" ")
}

// ---------------------------------- Soins -----------------------------------

/** Cibles d'un programme créé par un plan de traitement : « Curatif · Oïdium, Thrips. Dose… ». */
export function programTargets(notes: string | null | undefined): string[] {
  const match = (notes ?? "").match(/^(?:Curatif|Préventif) · (.+?)\.(?:\s|$)/)
  return match ? match[1].split(",").map((item) => lowerFirst(item.trim())).filter(Boolean) : []
}

export interface TaskFacts {
  programType: string
  product: string
  notes?: string | null
  dueDate: string | null
  members: Array<{ label: string; done: boolean; doneDate: string | null; result: string | null; weather?: Weather | null }>
  scope: "zone" | "individuel"
}

function kindPrefix(programType: string): string {
  if (programType === "curatif") return "Traitement curatif"
  if (programType === "preventif") return "Traitement préventif"
  if (programType === "fertilisation") return "Apport"
  if (programType === "hygiene") return "Hygiène"
  return "Soin"
}

export function describeTask(facts: TaskFacts, today: string): string {
  const { members } = facts
  const done = members.filter((member) => member.done)
  const open = members.filter((member) => !member.done)
  const targets = programTargets(facts.notes)
  const against = targets.length > 0 ? ` contre ${joinList(targets)}` : ""
  const head = facts.programType === "hygiene" ? facts.product : `${kindPrefix(facts.programType)} : ${lowerFirst(facts.product)}`

  if (open.length === 0) {
    const last = done.reduce((latest, member) => (member.doneDate && (!latest || member.doneDate > latest) ? member.doneDate : latest), "")
    const date = last ? longDate(last, today) : "date inconnue"
    const who = done.length === 1 ? ` sur ${done[0].label}` : ` sur ${done.length} plants`
    const results = [...new Set(done.map((member) => member.result).filter((value): value is string => Boolean(value)))].map((value) => lowerFirst(PROGRAM_RESULT_LABELS[value] ?? value))
    const verb = facts.programType === "hygiene" ? "fait" : facts.programType === "fertilisation" ? "apporté" : "appliqué"
    const result = results.length > 0 ? ` Résultat : ${joinList(results)}.` : " Pas encore de résultat noté."
    const first = done.length === 1 ? weatherText(done[0].weather) : ""
    return `${head}${against}, ${verb} le ${date}${who}${first}.${result}`
  }

  const due = facts.dueDate
  let when = "sans date prévue"
  if (due) {
    const diff = dayDiff(today, due)
    when = diff < 0 ? `prévu le ${longDate(due, today)}, en retard de ${-diff} jour${-diff > 1 ? "s" : ""}` : diff === 0 ? "à faire aujourd'hui" : diff === 1 ? "à faire demain" : `prévu le ${longDate(due, today)}`
  }
  const progress = members.length > 1 ? (done.length > 0 ? ` (${done.length} plant${done.length > 1 ? "s" : ""} sur ${members.length} déjà fait${done.length > 1 ? "s" : ""})` : ` (${members.length} plants)`) : ""
  return `${head}${against}, ${when}${progress}.`
}

// -------------------------------- Croisement --------------------------------

export interface CrossingFacts {
  role: "mere" | "pere"
  partner: string | null
  code: string | null
  pollinationDate: string | null
  fruits: number | null
  seeds: number | null
  status: string | null
}

export function describeCrossing(facts: CrossingFacts, today: string): string {
  const partner = facts.partner ?? "un parent inconnu"
  const code = facts.code ? ` (croisement ${facts.code})` : ""
  const when = facts.pollinationDate ? `, pollinisé le ${longDate(facts.pollinationDate, today)}` : ""
  const head = `Utilisée comme ${facts.role === "mere" ? "mère" : "père"} avec ${partner}${code}${when}.`
  const fruits = facts.fruits ?? 0
  const seeds = facts.seeds ?? 0
  if (fruits === 0) return facts.status === "Avorté" ? `${head} Les fleurs ont avorté, aucun fruit récolté.` : `${head} Aucun fruit récolté pour l'instant.`
  return `${head} ${fruits} fruit${fruits > 1 ? "s" : ""} récolté${fruits > 1 ? "s" : ""}${seeds > 0 ? `, ${seeds} graine${seeds > 1 ? "s" : ""}` : ", sans graine"}.`
}
