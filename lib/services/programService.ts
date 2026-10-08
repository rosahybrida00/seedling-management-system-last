// ---------------------------------------------------------------------------
// programService — enregistrer les suggestions et les soins d'une zone ou d'un plant.
//
// Une suggestion acceptée crée un programme et sa première échéance (prévue le
// jour choisi, aujourd'hui par défaut). « Appliqué » enregistre ensuite
// l'échéance comme réalisée : pour une zone, la base répercute la réalisation
// sur chaque plant concerné (migration 033).
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase-client"
import { humanError, weatherIdFor, type ActionResult } from "@/lib/services/plantSheetService"
import { suggestionProductLabel, type Suggestion } from "@/lib/services/suggestionEngine"

export type ProgramTarget = { greenhouse_id: string } | { parcelle_id: string } | { planting_id: string }

export interface EventLocation {
  greenhouse_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
}

export function targetKey(target: ProgramTarget): string {
  if ("greenhouse_id" in target) return `serre:${target.greenhouse_id}`
  if ("parcelle_id" in target) return `parcelle:${target.parcelle_id}`
  return `plant:${target.planting_id}`
}

function friendlyProgramError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Cette étape du calendrier est déjà enregistrée pour cette saison."
  if (error.code === "23514") return error.message
  if (error.code === "42703" || error.code === "PGRST204") return "Exécutez les migrations 030, 032 et 033 dans Supabase avant d'enregistrer ce programme."
  return humanError(error)
}

export interface ValidateResult extends ActionResult {
  programId: string | null
  interventionId: string | null
}

export interface ManualProgramInput {
  programType: "curatif" | "preventif" | "fertilisation" | "hygiene"
  treatmentCodes: string[]
  fertilizerCode: string
  productName: string
  date: string
  notes: string
  template?: { templateId: string; stepId: string; seasonYear: number } | null
}

/** Crée le programme et sa première échéance (non faite). */
export async function createProgramWithIntervention(target: ProgramTarget, location: EventLocation, input: ManualProgramInput): Promise<ValidateResult> {
  const isFertilisation = input.programType === "fertilisation"
  const { data: program, error: programError } = await supabase
    .from("field_programs")
    .insert({
      ...target,
      program_type: input.programType,
      product_name: input.productName,
      treatment_codes: isFertilisation || input.programType === "hygiene" ? [] : input.treatmentCodes,
      fertilizer_code: isFertilisation ? input.fertilizerCode : null,
      start_date: input.date,
      notes: input.notes.trim(),
      ...(input.template ? { template_id: input.template.templateId, template_step_id: input.template.stepId, season_year: input.template.seasonYear } : {}),
    })
    .select("id")
    .single()
  if (programError || !program) return { error: friendlyProgramError(programError ?? { message: "Programme non créé." }), programId: null, interventionId: null }

  const { data: intervention, error: interventionError } = await supabase
    .from("field_interventions")
    .insert({ program_id: program.id, due_date: input.date, ...location })
    .select("id")
    .single()
  if (interventionError || !intervention) {
    return { error: friendlyProgramError(interventionError ?? { message: "Échéance non créée." }), programId: program.id as string, interventionId: null }
  }
  return { error: null, programId: program.id as string, interventionId: intervention.id as string }
}

/**
 * L'utilisateur accepte une suggestion : le programme est enregistré avec le
 * produit déjà proposé (ou celui qu'il a changé). Il reste à l'appliquer.
 */
export async function acceptSuggestion(target: ProgramTarget, location: EventLocation, suggestion: Suggestion, chosen: string[], date: string): Promise<ValidateResult> {
  if (suggestion.programType !== "hygiene" && chosen.length === 0) {
    return { error: "Choisissez le produit avant d'enregistrer ce programme.", programId: null, interventionId: null }
  }
  const effective = { ...suggestion, chosen }
  return createProgramWithIntervention(target, location, {
    programType: suggestion.programType,
    treatmentCodes: suggestion.programType === "fertilisation" ? [] : chosen,
    fertilizerCode: suggestion.programType === "fertilisation" ? chosen[0] ?? "" : "",
    productName: suggestionProductLabel(effective),
    date,
    notes: "",
    template: suggestion.template,
  })
}

export interface ApplyPatch {
  doneDate: string
  result: string
}

/** « Appliqué » : l'échéance de la zone est réalisée (la base répercute sur chaque plant). */
export async function applyIntervention(interventionId: string, patch: ApplyPatch, location: EventLocation): Promise<ActionResult> {
  const weatherDailyId = await weatherIdFor(patch.doneDate)
  const { error } = await supabase
    .from("field_interventions")
    .update({ done: true, done_date: patch.doneDate, result: patch.result || null, weather_daily_id: weatherDailyId, ...location })
    .eq("id", interventionId)
  return { error: error ? friendlyProgramError(error) : null }
}

export async function reopenIntervention(interventionId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from("field_interventions")
    .update({ done: false, done_date: null, result: null, weather_daily_id: null })
    .eq("id", interventionId)
  return { error: error ? friendlyProgramError(error) : null }
}

/** Planifier la suite d'un programme : une nouvelle échéance. */
export async function scheduleNext(programId: string, date: string, location: EventLocation): Promise<ActionResult> {
  const { error } = await supabase.from("field_interventions").insert({ program_id: programId, due_date: date, ...location })
  return { error: error ? friendlyProgramError(error) : null }
}

export async function deleteProgram(programId: string): Promise<ActionResult> {
  const { error } = await supabase.from("field_programs").delete().eq("id", programId)
  return { error: error ? friendlyProgramError(error) : null }
}

// ------------------------------ Suggestions écartées ------------------------

function targetColumn(target: ProgramTarget): { column: string; value: string } {
  if ("greenhouse_id" in target) return { column: "greenhouse_id", value: target.greenhouse_id }
  if ("parcelle_id" in target) return { column: "parcelle_id", value: target.parcelle_id }
  return { column: "planting_id", value: target.planting_id }
}

export async function ignoreSuggestion(target: ProgramTarget, suggestion: Suggestion): Promise<ActionResult> {
  const { column, value } = targetColumn(target)
  const { error } = await supabase.from("field_suggestions").insert({
    [column]: value,
    template_id: suggestion.template?.templateId ?? null,
    template_step_id: suggestion.template?.stepId ?? null,
    program_type: suggestion.programType,
    reason: suggestion.reason,
    dedupe_key: `${targetKey(target)}:${suggestion.id}`,
    status: "ignoree",
    decided_at: new Date().toISOString(),
  })
  // 23505 : déjà ignorée, sans conséquence.
  if (error && error.code !== "23505") return { error: humanError(error) }
  return { error: null }
}

/** Identifiants de suggestions écartées pour cette cible. Sans la migration 033 : aucune. */
export async function loadDismissedIds(target: ProgramTarget): Promise<Set<string>> {
  const { column, value } = targetColumn(target)
  const { data, error } = await supabase.from("field_suggestions").select("dedupe_key").eq(column, value).eq("status", "ignoree")
  if (error || !data) return new Set()
  const prefix = `${targetKey(target)}:`
  return new Set((data as Array<{ dedupe_key: string }>).map((row) => row.dedupe_key).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)))
}
