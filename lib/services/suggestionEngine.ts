// ---------------------------------------------------------------------------
// suggestionEngine — suggestions PRÊTES À L'EMPLOI pour une zone ou un plant.
//
// Une suggestion arrive avec son produit déjà proposé : l'utilisateur n'a rien
// à choisir pour l'accepter (il peut changer de produit s'il y a plusieurs
// options). Deux sources :
//  - le calendrier type de la zone (programTemplates.ts) : les étapes du mois
//    en cours, ou du mois précédent si elles n'ont pas été appliquées ;
//  - les observations sanitaires récentes : un traitement curatif proposé
//    d'après le calendrier de l'utilisateur (voir CURATIVE_MAP).
//
// Logique pure, sans accès Supabase. Aucune suggestion n'est jamais appliquée
// automatiquement : c'est toujours l'utilisateur qui valide.
// ---------------------------------------------------------------------------

import {
  DISEASE_PRESSURE_LABELS,
  FERTILIZER_LABELS,
  FIELD_TREATMENT_LABELS,
  PEST_LABELS,
} from "@/lib/domain/fieldLabels"
import { PARCELLE_CALENDAR, SERRE_CALENDAR, type TemplateStep } from "@/lib/domain/programTemplates"

export type SuggestionKind = "curatif" | "preventif" | "fertilisation" | "hygiene"

/**
 * Traitements proposés pour un problème sanitaire observé. Ils reprennent le
 * calendrier annuel fourni par l'utilisateur (soufre, bicarbonate, bouillie
 * bordelaise, savon noir, purins). Un problème absent de cette table (rouille,
 * botrytis, cochenilles, thrips, altises, autre) n'a pas de produit proposé :
 * la suggestion demande alors de choisir le traitement.
 */
export const CURATIVE_MAP: Record<string, string[]> = {
  oidium: ["soufre", "bicarbonate_sodium", "purin_prele"],
  mildiou: ["soufre", "purin_prele"],
  marsonia: ["bouillie_bordelaise"],
  pucerons: ["savon_noir", "purin_ortie"],
  araignees_rouges: ["soufre", "bicarbonate_sodium"],
}

/** Observations plus anciennes que ce délai ne déclenchent plus de suggestion curative. */
export const RECENT_OBSERVATION_DAYS = 14

export interface SuggestionObservation {
  id: string
  /** AAAA-MM-JJ */
  date: string
  diseases: string[]
  pests: string[]
  plantId?: string | null
}

export interface HandledIntervention {
  programType: string
  /** Date prévue ou de réalisation, AAAA-MM-JJ. */
  date: string
}

export interface Suggestion {
  /** Clé stable : sert à ne jamais reproposer ce qui vient d'être fait. */
  id: string
  source: "observation" | "calendrier"
  programType: SuggestionKind
  title: string
  reason: string
  options: string[]
  chosen: string[]
  mode: "un_parmi" | "tous"
  /** Opération d'hygiène sans produit. */
  task: string | null
  /** Aucun produit proposé : l'utilisateur doit en choisir un avant d'appliquer. */
  needsChoice: boolean
  /** Étape du mois précédent restée sans suite. */
  late: boolean
  /** Étape facultative (« si nécessaire »). */
  optional: boolean
  template: { templateId: string; stepId: string; seasonYear: number } | null
}

export interface SuggestionContext {
  scope: "serre" | "parcelle" | "plant"
  /** AAAA-MM-JJ */
  today: string
  /** Pas de calendrier déjà appliqués : `${stepId}|${kind}|${seasonYear}`. */
  appliedKeys: Set<string>
  observations: SuggestionObservation[]
  /** Traitements curatifs déjà planifiés ou faits (pour ne pas reproposer le même). */
  handled: HandledIntervention[]
  temperature?: number | null
  heatThresholdC?: number | null
  /** Suggestions que l'utilisateur a écartées (« Ignorer ») : identifiants de Suggestion. */
  dismissedIds?: Set<string>
}

// ------------------------------- Utilitaires --------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function monthOf(isoDate: string): number {
  return Number.parseInt(isoDate.slice(5, 7), 10)
}

function yearOf(isoDate: string): number {
  return Number.parseInt(isoDate.slice(0, 4), 10)
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

function formatFr(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`))
}

export function productKey(stepId: string, kind: string, seasonYear: number): string {
  return `${stepId}|${kind}|${seasonYear}`
}

function inWindow(step: TemplateStep, month: number): boolean {
  if (step.endMonth == null) return month === step.month
  if (step.endMonth >= step.month) return month >= step.month && month <= step.endMonth
  return month >= step.month || month <= step.endMonth // fenêtre à cheval sur deux années (déc. → fév.)
}

/** Année de saison : une fenêtre déc. → fév. appartient à l'année de son début. */
export function seasonYearFor(step: TemplateStep, today: string): number {
  const month = monthOf(today)
  const year = yearOf(today)
  if (step.endMonth != null && step.endMonth < step.month && month <= step.endMonth) return year - 1
  return year
}

function calendarFor(scope: SuggestionContext["scope"]) {
  if (scope === "serre") return SERRE_CALENDAR
  if (scope === "parcelle") return PARCELLE_CALENDAR
  return null
}

// ------------------------------ Calendrier ----------------------------------

export function calendarSuggestions(ctx: SuggestionContext): Suggestion[] {
  const template = calendarFor(ctx.scope)
  if (!template) return []
  const month = monthOf(ctx.today)
  const previousMonth = month === 1 ? 12 : month - 1
  const hot = ctx.temperature != null && ctx.heatThresholdC != null && ctx.temperature >= ctx.heatThresholdC
  const out: Suggestion[] = []

  for (const step of template.steps) {
    const current = inWindow(step, month)
    const late = !current && step.endMonth == null && step.month === previousMonth
    if (!current && !late) continue
    const seasonYear = late && step.month === 12 ? yearOf(ctx.today) - 1 : seasonYearFor(step, ctx.today)

    for (const action of step.actions) {
      if (ctx.appliedKeys.has(productKey(step.id, action.kind, seasonYear))) continue
      const options = action.kind === "hygiene" ? [] : action.products
      let chosen = action.mode === "tous" ? options : options.slice(0, 1)
      let reason = step.reason
      if (step.heatSensitive && hot && options.includes("soufre") && options.length > 1) {
        chosen = [options.find((code) => code !== "soufre") as string]
        reason = `${reason} Forte chaleur (${Math.round(ctx.temperature as number)} °C) : le soufre est évité.`
      }
      out.push({
        id: `cal:${template.id}:${step.id}:${action.kind}:${seasonYear}`,
        source: "calendrier",
        programType: action.kind,
        title: step.label,
        reason: late ? `Étape du mois précédent restée sans suite. ${reason}` : reason,
        options,
        chosen,
        mode: action.mode,
        task: action.kind === "hygiene" ? action.task ?? null : null,
        needsChoice: false,
        late,
        optional: !action.required,
        template: { templateId: template.id, stepId: step.id, seasonYear },
      })
    }
  }
  // Étapes en retard d'abord, puis dans l'ordre du calendrier.
  return out.sort((a, b) => Number(b.late) - Number(a.late))
}

// ------------------------------ Observations --------------------------------

function signalLabel(code: string): string {
  return DISEASE_PRESSURE_LABELS[code] ?? PEST_LABELS[code] ?? code
}

export function observationSuggestions(ctx: SuggestionContext): Suggestion[] {
  const latestBySignal = new Map<string, { date: string; plants: Set<string>; observations: number }>()
  for (const obs of ctx.observations) {
    const age = daysBetween(obs.date, ctx.today)
    if (age < 0 || age > RECENT_OBSERVATION_DAYS) continue
    for (const code of [...obs.diseases, ...obs.pests]) {
      const entry = latestBySignal.get(code) ?? { date: obs.date, plants: new Set<string>(), observations: 0 }
      if (obs.date > entry.date) entry.date = obs.date
      if (obs.plantId) entry.plants.add(obs.plantId)
      entry.observations += 1
      latestBySignal.set(code, entry)
    }
  }

  const out: Suggestion[] = []
  for (const [code, entry] of latestBySignal) {
    // Déjà traité : une intervention curative est prévue ou faite depuis l'observation.
    const handled = ctx.handled.some((item) => item.programType === "curatif" && item.date >= entry.date)
    if (handled) continue
    const options = CURATIVE_MAP[code] ?? []
    const where = entry.plants.size > 1 ? ` sur ${entry.plants.size} plants` : ""
    out.push({
      id: `obs:${code}:${entry.date}`,
      source: "observation",
      programType: "curatif",
      title: `Traitement curatif · ${signalLabel(code)}`,
      reason:
        options.length > 0
          ? `${signalLabel(code)} observé le ${formatFr(entry.date)}${where}. Produits proposés d'après votre calendrier.`
          : `${signalLabel(code)} observé le ${formatFr(entry.date)}${where}. Aucun produit n'est associé à ce problème dans votre calendrier : choisissez le traitement.`,
      options,
      chosen: options.slice(0, 1),
      mode: "un_parmi",
      task: null,
      needsChoice: options.length === 0,
      late: false,
      optional: false,
      template: null,
    })
  }
  // Les observations les plus récentes d'abord.
  return out.sort((a, b) => b.id.split(":")[2].localeCompare(a.id.split(":")[2]))
}

// -------------------------------- Ensemble ----------------------------------

/** Curatif d'abord (urgent), puis calendrier. */
export function buildSuggestions(ctx: SuggestionContext): Suggestion[] {
  const dismissed = ctx.dismissedIds ?? new Set<string>()
  return [...observationSuggestions(ctx), ...calendarSuggestions(ctx)].filter((suggestion) => !dismissed.has(suggestion.id))
}

export function suggestionProductLabel(suggestion: Pick<Suggestion, "programType" | "chosen" | "task">): string {
  if (suggestion.programType === "hygiene") return suggestion.task ?? "Hygiène"
  const labels = suggestion.programType === "fertilisation" ? FERTILIZER_LABELS : FIELD_TREATMENT_LABELS
  return suggestion.chosen.map((code) => labels[code] ?? code).join(" + ")
}

/** Clés des pas de calendrier déjà enregistrés (programmes de la zone). */
export function appliedKeysFromPrograms(programs: Array<{ template_step_id?: string | null; season_year?: number | null; program_type: string }>): Set<string> {
  const keys = new Set<string>()
  for (const program of programs) {
    if (program.template_step_id && program.season_year != null) keys.add(productKey(program.template_step_id, program.program_type, program.season_year))
  }
  return keys
}
