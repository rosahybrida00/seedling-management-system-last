// ---------------------------------------------------------------------------
// plantSheetService — accès Supabase de la fiche unifiée d'un plant / variété.
//
// Chargement : une série de requêtes simples (sans jointure PostgREST), puis
// assemblage en mémoire. Actions : valider, rouvrir, reporter, exclure, créer.
// Nécessite la migration 033 (tâches par plant) ; la migration 034 enrichit la
// fiche avec l'historique de croisement mais reste facultative.
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase-client"
import { getWeatherForDate } from "@/lib/services/weatherService"
import {
  newInterventionProductName,
  type RawCrossing,
  type RawObservation,
  type RawTaskRow,
  type RawWeather,
} from "@/lib/services/plantTimeline"

export interface SheetData {
  tasks: RawTaskRow[]
  observations: RawObservation[]
  crossings: RawCrossing[]
  /** Faux si la vue de croisements (migration 034) n'existe pas encore. */
  crossingsAvailable: boolean
}

export interface ActionResult {
  error: string | null
}

const CHUNK = 100

function chunk<T>(items: T[], size: number = CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Message lisible pour une erreur Supabase (les règles de dates arrivent déjà en français). */
export function humanError(error: { code?: string; message: string }): string {
  if (error.code === "42P01" || error.code === "PGRST205") return "Exécutez la migration 033 dans Supabase : la table des tâches par plant est absente."
  if (error.code === "42703" || error.code === "PGRST204") return "Une colonne est absente : exécutez les migrations 030, 032 et 033 dans Supabase."
  return error.message
}

/** La fiche unifiée n'est proposée que si la migration 033 est appliquée. */
export async function tasksAvailable(): Promise<boolean> {
  const { error } = await supabase.from("field_intervention_tasks").select("id").limit(1)
  return !error
}

type Row = Record<string, unknown>

async function selectIn(table: string, columns: string, column: string, ids: string[]): Promise<{ data: Row[]; error: { code?: string; message: string } | null }> {
  if (ids.length === 0) return { data: [], error: null }
  const results = await Promise.all(chunk(ids).map((part) => supabase.from(table).select(columns).in(column, part)))
  const failed = results.find((result) => result.error)
  if (failed?.error) return { data: [], error: failed.error }
  return { data: results.flatMap((result) => (result.data ?? []) as unknown as Row[]), error: null }
}

export async function loadSheetData(plantIds: string[]): Promise<{ data: SheetData | null; error: string | null }> {
  if (plantIds.length === 0) return { data: { tasks: [], observations: [], crossings: [], crossingsAvailable: true }, error: null }

  const [taskRes, obsRes, crossRes] = await Promise.all([
    selectIn("field_intervention_tasks", "id,intervention_id,planting_id,done,done_date,result,notes,weather_daily_id", "planting_id", plantIds),
    selectIn("field_observations", "id,planting_id,observation_date,disease_pressure,pests,treatment_applied,remarque,weather_daily_id", "planting_id", plantIds),
    selectIn("field_planting_crossings", "planting_id,cross_id,cross_code,role,partner_name,pollination_date,status,fruit_count,seed_count", "planting_id", plantIds),
  ])
  const failure = taskRes.error ?? obsRes.error
  if (failure) return { data: null, error: humanError(failure) }

  const interventionIds = Array.from(new Set(taskRes.data.map((row) => row.intervention_id as string)))
  const interventionRes = await selectIn("field_interventions", "id,due_date,program_id", "id", interventionIds)
  if (interventionRes.error) return { data: null, error: humanError(interventionRes.error) }
  const interventionById = new Map(interventionRes.data.map((row) => [row.id as string, row]))

  const programIds = Array.from(new Set(interventionRes.data.map((row) => row.program_id as string)))
  const programRes = await selectIn("field_programs", "id,program_type,product_name,treatment_codes,fertilizer_code,planting_id,template_step_id", "id", programIds)
  if (programRes.error) return { data: null, error: humanError(programRes.error) }
  const programById = new Map(programRes.data.map((row) => [row.id as string, row]))

  const weatherIds = Array.from(new Set([
    ...taskRes.data.map((row) => row.weather_daily_id as string | null),
    ...obsRes.data.map((row) => row.weather_daily_id as string | null),
  ].filter((id): id is string => Boolean(id))))
  const weatherRes = await selectIn("weather_daily", "id,temperature,humidity,uv_index", "id", weatherIds)
  const weatherById = new Map<string, RawWeather>(
    (weatherRes.error ? [] : weatherRes.data).map((row) => [row.id as string, { temperature: (row.temperature as number | null) ?? null, humidity: (row.humidity as number | null) ?? null, uv_index: (row.uv_index as number | null) ?? null }]),
  )

  const tasks: RawTaskRow[] = []
  for (const row of taskRes.data) {
    const intervention = interventionById.get(row.intervention_id as string)
    const program = intervention ? programById.get(intervention.program_id as string) : undefined
    if (!intervention || !program) continue
    tasks.push({
      id: row.id as string,
      intervention_id: row.intervention_id as string,
      planting_id: row.planting_id as string,
      done: Boolean(row.done),
      done_date: (row.done_date as string | null) ?? null,
      result: (row.result as string | null) ?? null,
      notes: (row.notes as string | null) ?? "",
      due_date: (intervention.due_date as string | null) ?? null,
      program_id: program.id as string,
      program_type: program.program_type as string,
      product_name: (program.product_name as string) ?? "",
      treatment_codes: (program.treatment_codes as string[] | null) ?? null,
      fertilizer_code: (program.fertilizer_code as string | null) ?? null,
      program_planting_id: (program.planting_id as string | null) ?? null,
      template_step_id: (program.template_step_id as string | null) ?? null,
      weather: row.weather_daily_id ? weatherById.get(row.weather_daily_id as string) ?? null : null,
    })
  }

  const observations: RawObservation[] = obsRes.data.map((row) => ({
    id: row.id as string,
    planting_id: row.planting_id as string,
    observation_date: row.observation_date as string,
    disease_pressure: (row.disease_pressure as string[] | null) ?? null,
    pests: (row.pests as string[] | null) ?? null,
    treatment_applied: (row.treatment_applied as string[] | null) ?? null,
    remarque: (row.remarque as string | null) ?? null,
    weather: row.weather_daily_id ? weatherById.get(row.weather_daily_id as string) ?? null : null,
  }))

  return {
    data: {
      tasks,
      observations,
      crossings: crossRes.error ? [] : (crossRes.data as unknown as RawCrossing[]),
      crossingsAvailable: !crossRes.error,
    },
    error: null,
  }
}

// --------------------------------- Actions ----------------------------------

export interface CompletionTarget {
  taskId: string
  /** Emplacement actuel du plant, mémorisé avec le soin (le plant peut être déplacé ensuite). */
  greenhouseTableId: string | null
  parcelleId: string | null
}

export interface CompletionPatch {
  doneDate: string
  result: string
  notes: string
}

export async function weatherIdFor(date: string): Promise<string | null> {
  try {
    await getWeatherForDate(date)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return null
    const { data } = await supabase.from("weather_daily").select("id").eq("user_id", auth.user.id).eq("date", date).maybeSingle()
    return (data?.id as string | undefined) ?? null
  } catch {
    // La météo est un plus : son absence ne bloque jamais l'enregistrement d'un soin.
    return null
  }
}

/** Valide (ou corrige) des tâches : date, résultat, notes, météo du jour et emplacement. */
export async function completeTasks(targets: CompletionTarget[], patch: CompletionPatch): Promise<ActionResult> {
  if (targets.length === 0) return { error: null }
  const weatherDailyId = await weatherIdFor(patch.doneDate)
  const byLocation = new Map<string, CompletionTarget[]>()
  for (const target of targets) {
    const key = `${target.greenhouseTableId ?? ""}|${target.parcelleId ?? ""}`
    byLocation.set(key, [...(byLocation.get(key) ?? []), target])
  }
  for (const group of byLocation.values()) {
    const { error } = await supabase
      .from("field_intervention_tasks")
      .update({
        done: true,
        done_date: patch.doneDate,
        result: patch.result || null,
        notes: patch.notes.trim(),
        weather_daily_id: weatherDailyId,
        greenhouse_table_id: group[0].greenhouseTableId,
        parcelle_id: group[0].parcelleId,
      })
      .in("id", group.map((target) => target.taskId))
    if (error) return { error: humanError(error) }
  }
  return { error: null }
}

export async function reopenTasks(taskIds: string[]): Promise<ActionResult> {
  if (taskIds.length === 0) return { error: null }
  const { error } = await supabase
    .from("field_intervention_tasks")
    .update({ done: false, done_date: null, result: null, weather_daily_id: null })
    .in("id", taskIds)
  return { error: error ? humanError(error) : null }
}

/** Reporter l'échéance d'un programme individuel (une seule tâche concernée). */
export async function rescheduleIntervention(interventionId: string, dueDate: string): Promise<ActionResult> {
  const { error } = await supabase.from("field_interventions").update({ due_date: dueDate }).eq("id", interventionId)
  return { error: error ? humanError(error) : null }
}

/** Retirer un plant d'un programme de zone : ses tâches non faites disparaissent. */
export async function excludePlanting(programId: string, plantingId: string, reason: string): Promise<ActionResult> {
  const { error } = await supabase.from("field_program_exclusions").insert({ program_id: programId, planting_id: plantingId, reason: reason.trim() })
  return { error: error ? humanError(error) : null }
}

export interface NewIntervention {
  plantingId: string
  programType: string
  treatmentCodes: string[]
  fertilizerCode: string
  date: string
  alreadyDone: boolean
  result: string
  notes: string
  location: { greenhouseId: string | null; greenhouseTableId: string | null; parcelleId: string | null }
}

/** Crée un programme individuel avec une première échéance, éventuellement déjà faite. */
export async function createIndividualIntervention(input: NewIntervention): Promise<ActionResult & { interventionId: string | null }> {
  const isFertilisation = input.programType === "fertilisation"
  const { data: program, error: programError } = await supabase
    .from("field_programs")
    .insert({
      planting_id: input.plantingId,
      program_type: input.programType,
      product_name: newInterventionProductName(input),
      treatment_codes: isFertilisation ? [] : input.treatmentCodes,
      fertilizer_code: isFertilisation ? input.fertilizerCode : null,
      start_date: input.date,
      notes: input.notes.trim(),
    })
    .select("id")
    .single()
  if (programError || !program) return { error: humanError(programError ?? { message: "Programme non créé." }), interventionId: null }

  const { data: intervention, error: interventionError } = await supabase
    .from("field_interventions")
    .insert({
      program_id: program.id,
      due_date: input.date,
      greenhouse_id: input.location.greenhouseId,
      greenhouse_table_id: input.location.greenhouseTableId,
      parcelle_id: input.location.parcelleId,
    })
    .select("id")
    .single()
  if (interventionError || !intervention) return { error: humanError(interventionError ?? { message: "Échéance non créée." }), interventionId: null }

  if (input.alreadyDone) {
    // Le déclencheur de la base a créé la tâche du plant : on la valide.
    const { data: tasks, error: taskError } = await supabase
      .from("field_intervention_tasks")
      .select("id")
      .eq("intervention_id", intervention.id)
      .eq("planting_id", input.plantingId)
    if (taskError || !tasks || tasks.length === 0) {
      return { error: "Intervention créée, mais impossible de la marquer comme faite. Ouvrez-la dans la frise.", interventionId: intervention.id as string }
    }
    const done = await completeTasks(
      [{ taskId: tasks[0].id as string, greenhouseTableId: input.location.greenhouseTableId, parcelleId: input.location.parcelleId }],
      { doneDate: input.date, result: input.result, notes: input.notes },
    )
    if (done.error) return { error: `Intervention créée, mais non validée : ${done.error}`, interventionId: intervention.id as string }
  }
  return { error: null, interventionId: intervention.id as string }
}
