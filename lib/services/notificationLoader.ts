// ---------------------------------------------------------------------------
// notificationLoader — charge les données et produit les notifications.
//
// Ne lève jamais d'exception : si la connexion est coupée ou si une table manque,
// la liste est simplement vide ou partielle (la cloche ne doit jamais casser la page).
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase-client"
import { selectIn } from "@/lib/services/plantSheetService"
import {
  RECENT_OBSERVATION_DAYS,
  SOON_DAYS,
  buildNotifications,
  type AppNotification,
  type PlantInfo,
  type ProgramInfo,
} from "@/lib/services/notificationService"
import { addDays } from "@/lib/services/treatmentPlanner"
import { todayIso } from "@/lib/services/plantTimeline"

type Row = Record<string, unknown>

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export async function loadNotifications(today: string = todayIso()): Promise<AppNotification[]> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id
    if (!userId) return []

    const horizon = addDays(today, SOON_DAYS)
    const since = addDays(today, -RECENT_OBSERVATION_DAYS)
    const [ivRes, obsRes] = await Promise.all([
      supabase.from("field_interventions").select("id,due_date,program_id").eq("user_id", userId).eq("done", false).lte("due_date", horizon),
      supabase.from("field_observations").select("id,planting_id,observation_date,disease_pressure,pests").eq("user_id", userId).gte("observation_date", since),
    ])
    const interventions = ((ivRes.data ?? []) as Row[]).filter((row) => str(row.due_date) && str(row.program_id))
    const observations = ((obsRes.data ?? []) as Row[]).filter((row) => str(row.planting_id) && str(row.observation_date))
    const withSignals = observations.filter((row) => ((row.disease_pressure as string[] | null) ?? []).length + ((row.pests as string[] | null) ?? []).length > 0)
    if (interventions.length === 0 && withSignals.length === 0) return []

    const programIds = [...new Set(interventions.map((row) => row.program_id as string))]
    const programRes = await selectIn("field_programs", "id,program_type,product_name,notes,planting_id,greenhouse_id,parcelle_id", "id", programIds)
    const programRows = programRes.error ? [] : programRes.data

    const plantIds = [...new Set([...programRows.map((row) => str(row.planting_id)), ...withSignals.map((row) => str(row.planting_id))].filter((id): id is string => Boolean(id)))]
    const [plantRes, ghRes, parcelleRes, tableRes] = await Promise.all([
      selectIn("field_plantings", "id,variety_id,seedling_id,greenhouse_table_id,parcelle_id", "id", plantIds),
      supabase.from("greenhouses").select("id,name").eq("user_id", userId),
      supabase.from("parcelles").select("id,name").eq("user_id", userId),
      supabase.from("greenhouse_tables").select("id,greenhouse_id"),
    ])
    const plantRows = plantRes.error ? [] : plantRes.data
    const varietyIds = [...new Set(plantRows.map((row) => str(row.variety_id)).filter((id): id is string => Boolean(id)))]
    const seedlingIds = [...new Set(plantRows.map((row) => str(row.seedling_id)).filter((id): id is string => Boolean(id)))]
    const [varietyRes, seedlingRes] = await Promise.all([
      selectIn("varieties", "id,name,commercial_name", "id", varietyIds),
      selectIn("seedlings", "id,code", "id", seedlingIds),
    ])

    const zoneNames = new Map<string, string>()
    for (const row of (ghRes.data ?? []) as Row[]) zoneNames.set(`serre:${row.id}`, String(row.name))
    for (const row of (parcelleRes.data ?? []) as Row[]) zoneNames.set(`parcelle:${row.id}`, String(row.name))
    const serreByTable = new Map(((tableRes.data ?? []) as Row[]).map((row) => [String(row.id), String(row.greenhouse_id)]))
    const varietyName = new Map((varietyRes.error ? [] : varietyRes.data).map((row) => [String(row.id), String(row.commercial_name || row.name)]))
    const seedlingCode = new Map((seedlingRes.error ? [] : seedlingRes.data).map((row) => [String(row.id), String(row.code)]))

    const plants = new Map<string, PlantInfo>()
    for (const row of plantRows) {
      const tableId = str(row.greenhouse_table_id)
      const greenhouseId = tableId ? serreByTable.get(tableId) : null
      const zoneKey = greenhouseId ? `serre:${greenhouseId}` : str(row.parcelle_id) ? `parcelle:${row.parcelle_id}` : null
      const varietyId = str(row.variety_id)
      const seedlingId = str(row.seedling_id)
      plants.set(String(row.id), { id: String(row.id), zoneKey, name: (varietyId ? varietyName.get(varietyId) : seedlingId ? seedlingCode.get(seedlingId) : null) ?? "un plant" })
    }

    const programs = new Map<string, ProgramInfo>()
    for (const row of programRows) {
      const greenhouseId = str(row.greenhouse_id)
      const parcelleId = str(row.parcelle_id)
      programs.set(String(row.id), {
        id: String(row.id),
        type: String(row.program_type),
        product: String(row.product_name ?? ""),
        notes: str(row.notes),
        zoneKey: greenhouseId ? `serre:${greenhouseId}` : parcelleId ? `parcelle:${parcelleId}` : null,
        plantingId: str(row.planting_id),
      })
    }

    // Soins curatifs déjà prévus ou faits, par plant (pour ne pas alerter sur un problème déjà pris en charge).
    const curativeByPlant = new Map<string, string>()
    const observedPlantIds = [...new Set(withSignals.map((row) => String(row.planting_id)))]
    if (observedPlantIds.length > 0) {
      const taskRes = await selectIn("field_intervention_tasks", "intervention_id,planting_id", "planting_id", observedPlantIds)
      const link: Array<{ plantId: string; interventionId: string }> = []
      if (!taskRes.error) {
        for (const row of taskRes.data) link.push({ plantId: String(row.planting_id), interventionId: String(row.intervention_id) })
      }
      const ivIds = [...new Set(link.map((item) => item.interventionId))]
      const ivDates = await selectIn("field_interventions", "id,due_date,done_date,program_id", "id", ivIds)
      const ivPrograms = await selectIn("field_programs", "id,program_type", "id", [...new Set((ivDates.error ? [] : ivDates.data).map((row) => String(row.program_id)))])
      const typeByProgram = new Map((ivPrograms.error ? [] : ivPrograms.data).map((row) => [String(row.id), String(row.program_type)]))
      const dateByIv = new Map((ivDates.error ? [] : ivDates.data).map((row) => [String(row.id), { date: str(row.done_date) ?? str(row.due_date), type: typeByProgram.get(String(row.program_id)) }]))
      for (const { plantId, interventionId } of link) {
        const info = dateByIv.get(interventionId)
        if (info?.type === "curatif" && info.date && (!curativeByPlant.get(plantId) || info.date > (curativeByPlant.get(plantId) as string))) curativeByPlant.set(plantId, info.date)
      }
    }

    return buildNotifications({
      today,
      interventions: interventions.map((row) => ({ id: String(row.id), dueDate: String(row.due_date), programId: String(row.program_id) })),
      programs,
      zoneNames,
      plants,
      observations: withSignals.map((row) => ({ id: String(row.id), plantingId: String(row.planting_id), date: String(row.observation_date).slice(0, 10), diseases: (row.disease_pressure as string[] | null) ?? [], pests: (row.pests as string[] | null) ?? [] })),
      curativeByPlant,
    })
  } catch {
    return []
  }
}
