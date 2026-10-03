"use client"

import { useEffect, useMemo, useState } from "react"
import { Sprout, MapPin, Warehouse, Settings, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { SectionHeading, EmptyState, Badge } from "@/components/breeding/ui"
import { GERMINATED_SEEDLING_STATUSES } from "@/lib/domain/fieldLabels"
import { FlashSheet } from "@/components/breeding/parcelle/flash-sheet"
import { ZoneView } from "@/components/breeding/parcelle/zone-view"
import { PlantView } from "@/components/breeding/parcelle/plant-view"
import { ManageView } from "@/components/breeding/parcelle/manage-view"
import type {
  Greenhouse,
  GreenhouseTable,
  Parcelle,
  FieldPlanting,
  FieldObservation,
  FieldProgram,
  FieldIntervention,
  PlantDetails,
  SeedLot,
  CrossParents,
  Zone,
  ZoneStatus,
} from "@/app/parcelle/types"

interface SensorReading {
  id: string
  greenhouse_id: string | null
  name: string
  sensor_type: string | null
  last_value: number | null
  last_reading_at: string | null
  is_active: boolean
}

interface AlertSettings {
  alerts_enabled: boolean
  frost_threshold: number
  heat_threshold: number
}

export function ZoneWorkspace() {
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([])
  const [tables, setTables] = useState<GreenhouseTable[]>([])
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [plantings, setPlantings] = useState<FieldPlanting[]>([])
  const [observations, setObservations] = useState<FieldObservation[]>([])
  const [programs, setPrograms] = useState<FieldProgram[]>([])
  const [interventions, setInterventions] = useState<FieldIntervention[]>([])
  const [seedLots, setSeedLots] = useState<SeedLot[]>([])
  const [seedLotError, setSeedLotError] = useState<string | null>(null)
  const [crosses, setCrosses] = useState<CrossParents[]>([])
  const [varieties, setVarieties] = useState<Map<string, string>>(new Map())
  const [seedlings, setSeedlings] = useState<Map<string, string>>(new Map())
  const [varietyDetails, setVarietyDetails] = useState<Map<string, PlantDetails>>(new Map())
  const [seedlingDetails, setSeedlingDetails] = useState<Map<string, PlantDetails>>(new Map())
  const [sensors, setSensors] = useState<SensorReading[]>([])
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({ alerts_enabled: true, frost_threshold: 2, heat_threshold: 35 })
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<"dashboard" | "zone" | "plant" | "manage">("dashboard")
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [zoneKey, setZoneKey] = useState<string | null>(null)
  const [plantingId, setPlantingId] = useState<string | null>(null)
  const [flashOpen, setFlashOpen] = useState(false)
  const [manageSubTab, setManageSubTab] = useState<"serres" | "parcelles">("serres")
  const [openCreateParcelle, setOpenCreateParcelle] = useState(false)

  function openManage(subTab: "serres" | "parcelles", createParcelle = false) {
    setManageSubTab(subTab)
    setOpenCreateParcelle(createParcelle)
    setView("manage")
  }

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [gh, gt, pc, fp, ob, pr, iv, vr, photoRows, sl, cr, seedLotsResult, sensorRows, settingsRow] = await Promise.all([
      supabase.from("greenhouses").select("id,name").order("name"),
      supabase.from("greenhouse_tables").select("id,greenhouse_id,name").order("name"),
      supabase.from("parcelles").select("id,name,soil_type,location").order("name"),
      supabase.from("field_plantings").select("*").order("created_at", { ascending: false }),
      supabase.from("field_observations").select("*").order("observation_date", { ascending: false }),
      supabase.from("field_programs").select("*").order("start_date", { ascending: false }),
      supabase.from("field_interventions").select("*").order("due_date", { ascending: true }),
      supabase.from("varieties").select("id,name,commercial_name,obtenteur,type,color,flowering,fragrance,parents,parentage,description,photo_url,image_url"),
      supabase.from("varieties_photos").select("id,variety_id,photo_url,is_primary"),
      supabase.from("seedlings").select("*").in("status", [...GERMINATED_SEEDLING_STATUSES]),
      supabase.from("crosses").select("id,seed_parent,pollen_parent"),
      supabase.from("sowing_batches").select("id,fruit_id,cross_id,fruit_code,seed_count,original_seed_count,sowing_date,table_id,parcelle_id,location_type,stratification_methods,stratification_start_date,stratification_end_date").order("sowing_date", { ascending: false }),
      supabase.from("sensors").select("id,greenhouse_id,name,sensor_type,last_value,last_reading_at,is_active"),
      supabase.from("user_settings").select("alerts_enabled,frost_threshold,heat_threshold").maybeSingle(),
    ])
    if (gh.data) setGreenhouses(gh.data)
    if (gt.data) setTables(gt.data)
    if (pc.data) setParcelles(pc.data as Parcelle[])
    if (fp.data) setPlantings(fp.data as FieldPlanting[])
    if (seedLotsResult.error) {
      setSeedLotError(`Suivi des lots indisponible : exécutez la migration 029 dans Supabase. ${seedLotsResult.error.message}`)
    } else {
      setSeedLotError(null)
      if (seedLotsResult.data) setSeedLots(seedLotsResult.data as SeedLot[])
    }
    if (cr.data) setCrosses(cr.data as CrossParents[])
    if (ob.data) {
      const rows = ob.data as FieldObservation[]
      const weatherIds = [...new Set(rows.map((observation) => observation.weather_daily_id).filter((id): id is string => Boolean(id)))]
      const { data: weatherRows } = weatherIds.length > 0
        ? await supabase.from("weather_daily").select("id,temperature,humidity,uv_index").in("id", weatherIds)
        : { data: [] }
      const weatherById = new Map((weatherRows ?? []).map((weather) => [weather.id, weather]))
      setObservations(rows.map((observation) => ({
        ...observation,
        weather_daily: observation.weather_daily_id ? weatherById.get(observation.weather_daily_id) ?? null : null,
      })))
    }
    if (pr.data) setPrograms(pr.data as FieldProgram[])
    if (iv.data) {
      const rows = iv.data as FieldIntervention[]
      const weatherIds = [...new Set(rows.map((intervention) => intervention.weather_daily_id).filter((id): id is string => Boolean(id)))]
      const { data: weatherRows } = weatherIds.length > 0
        ? await supabase.from("weather_daily").select("id,temperature,humidity,uv_index").in("id", weatherIds)
        : { data: [] }
      const weatherById = new Map((weatherRows ?? []).map((weather) => [weather.id, weather]))
      setInterventions(rows.map((intervention) => ({
        ...intervention,
        weather_daily: intervention.weather_daily_id ? weatherById.get(intervention.weather_daily_id) ?? null : null,
      })))
    }
    if (sensorRows.data) setSensors(sensorRows.data as SensorReading[])
    if (settingsRow.data) setAlertSettings(settingsRow.data as AlertSettings)
    if (vr.data) {
      const primaryPhotos = new Map<string, string>()
      for (const photo of photoRows.data ?? []) {
        if (photo.is_primary || !primaryPhotos.has(photo.variety_id)) primaryPhotos.set(photo.variety_id, photo.photo_url)
      }
      setVarieties(new Map(vr.data.map((v: any) => [v.id, v.commercial_name || v.name])))
      setVarietyDetails(new Map(vr.data.map((v: any) => [v.id, {
        photoUrl: primaryPhotos.get(v.id) || v.photo_url || v.image_url || null,
        description: v.description,
        fields: [
          ["Nom", v.name], ["Nom commercial", v.commercial_name], ["Obtenteur", v.obtenteur],
          ["Type / port", v.type], ["Couleur", v.color], ["Floraison", v.flowering],
          ["Parfum", v.fragrance], ["Parents", v.parents || v.parentage],
        ].filter((field): field is [string, string] => typeof field[1] === "string" && field[1].length > 0).map(([label, value]) => ({ label, value })),
      }])))
    }
    if (sl.data) {
      setSeedlings(new Map(sl.data.map((s: any) => [s.id, s.seedling_code || s.code])))
      const crossById = new Map((cr.data ?? []).map((cross: any) => [cross.id, cross]))
      setSeedlingDetails(new Map(sl.data.map((s: any) => {
        const cross = crossById.get(s.cross_id)
        const parentage = cross ? `${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"}` : null
        return [s.id, {
          photoUrl: s.photo_url || s.image_url || null,
          description: s.auto_report || s.remarks || s.free_notes || null,
          fields: [
            ["Code individuel", s.seedling_code || s.seed_code || s.code], ["Croisement", parentage],
            ["Fruit", s.fruit_code], ["Évaluation", s.evaluation_status], ["Phénotype", s.phenotype_vigueur],
            ["Pression sanitaire", s.pression_sanitaire], ["Traitement", s.traitement],
            ["Critère de sélection", s.critere_selection], ["Motif d'élimination", s.motif_elimination],
          ].filter((field): field is [string, string] => typeof field[1] === "string" && field[1].length > 0).map(([label, value]) => ({ label, value })),
        }] as const
      })))
    }
    setLoading(false)
  }

  const programsByPlanting = useMemo(() => {
    const map = new Map<string, FieldProgram[]>()
    programs.forEach((program) => {
      if (!program.planting_id) return
      const list = map.get(program.planting_id) ?? []
      list.push(program)
      map.set(program.planting_id, list)
    })
    return map
  }, [programs])

  const interventionsByProgram = useMemo(() => {
    const map = new Map<string, FieldIntervention[]>()
    interventions.forEach((intervention) => {
      const list = map.get(intervention.program_id) ?? []
      list.push(intervention)
      map.set(intervention.program_id, list)
    })
    return map
  }, [interventions])

  const observationsByPlanting = useMemo(() => {
    const map = new Map<string, FieldObservation[]>()
    observations.forEach((observation) => {
      const list = map.get(observation.planting_id) ?? []
      list.push(observation)
      map.set(observation.planting_id, list)
    })
    return map
  }, [observations])

  const crossMap = useMemo(() => new Map(crosses.map((cross) => [cross.id, cross])), [crosses])

  function plantingLabel(planting: FieldPlanting): string {
    return planting.variety_id
      ? (varieties.get(planting.variety_id) ?? "Variété inconnue")
      : (seedlings.get(planting.seedling_id ?? "") ?? "Semis inconnu")
  }

  function plantingDetails(planting: FieldPlanting): PlantDetails | null {
    return planting.variety_id
      ? varietyDetails.get(planting.variety_id) ?? null
      : seedlingDetails.get(planting.seedling_id ?? "") ?? null
  }

  function plantingsOfZone(zone: Zone): FieldPlanting[] {
    if (zone.kind === "serre") {
      const tableIds = new Set(tables.filter((table) => table.greenhouse_id === zone.greenhouse.id).map((table) => table.id))
      return plantings.filter((planting) => planting.greenhouse_table_id && tableIds.has(planting.greenhouse_table_id))
    }
    return plantings.filter((planting) => planting.parcelle_id === zone.parcelle.id)
  }

  function lastObservationDate(zone: Zone): string | null {
    const plantingIds = new Set(plantingsOfZone(zone).map((planting) => planting.id))
    const dates = observations.filter((observation) => plantingIds.has(observation.planting_id)).map((observation) => observation.observation_date)
    return dates.length > 0 ? dates.reduce((latest, date) => latest > date ? latest : date) : null
  }

  function hasSensorAlert(zone: Zone): boolean {
    if (zone.kind !== "serre" || !alertSettings.alerts_enabled) return false
    return sensors.some((sensor) => {
      if (!sensor.is_active || sensor.greenhouse_id !== zone.greenhouse.id || sensor.sensor_type !== "temperature" || sensor.last_value == null) return false
      return sensor.last_value <= alertSettings.frost_threshold || sensor.last_value >= alertSettings.heat_threshold
    })
  }

  function zoneStatus(zone: Zone): ZoneStatus {
    const zonePlantings = plantingsOfZone(zone)
    const plantingIds = new Set(zonePlantings.map((planting) => planting.id))
    const hasAlert = observations.some((observation) => plantingIds.has(observation.planting_id) && (observation.disease_pressure.length > 0 || observation.pests.length > 0))
    if (hasAlert || hasSensorAlert(zone)) return "rouge"
    const today = new Date().toISOString().split("T")[0]
    const relevantPrograms = programs.filter((program) =>
      program.parcelle_id === (zone.kind === "parcelle" ? zone.parcelle.id : "__none__") ||
      program.greenhouse_id === (zone.kind === "serre" ? zone.greenhouse.id : "__none__") ||
      (program.planting_id != null && plantingIds.has(program.planting_id))
    )
    const hasDue = relevantPrograms.some((program) =>
      (interventionsByProgram.get(program.id) ?? []).some((intervention) => !intervention.done && intervention.due_date && intervention.due_date <= today)
    )
    return hasDue ? "orange" : "vert"
  }

  const zones: Array<{ key: string; zone: Zone }> = useMemo(() => [
    ...greenhouses.map((greenhouse) => ({ key: `serre:${greenhouse.id}`, zone: { kind: "serre" as const, greenhouse } })),
    ...parcelles.map((parcelle) => ({ key: `parcelle:${parcelle.id}`, zone: { kind: "parcelle" as const, parcelle } })),
  ], [greenhouses, parcelles])

  const visibleZones = watchlistOnly ? zones.filter(({ zone }) => zoneStatus(zone) !== "vert") : zones
  const currentZone = zoneKey ? zones.find((item) => item.key === zoneKey)?.zone ?? null : null
  const currentPlanting = plantingId ? plantings.find((planting) => planting.id === plantingId) ?? null : null
  const currentZonePrograms = useMemo(() => {
    if (!currentZone) return []
    return programs.filter((program) =>
      program.planting_id == null &&
      (currentZone.kind === "serre" ? program.greenhouse_id === currentZone.greenhouse.id : program.parcelle_id === currentZone.parcelle.id)
    )
  }, [programs, currentZone])

  if (loading) return <div className="flex items-center justify-center py-20"><Sprout className="size-8 animate-pulse text-primary" /></div>

  return (
    <div className="relative flex flex-col gap-5 pb-16">
      {view === "dashboard" ? (
        <>
          <SectionHeading
            title="Serres & Parcelles"
            description="Vue d'ensemble des zones : vert = aucun signalement, orange = intervention en attente, rouge = alerte sanitaire ou capteur hors seuil."
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant={watchlistOnly ? "default" : "outline"} size="sm" onClick={() => setWatchlistOnly((value) => !value)}>Watchlist</Button>
                <Button variant="outline" size="sm" onClick={() => openManage("serres")} className="gap-1.5"><Warehouse className="size-3.5" /> Ajouter une serre</Button>
                <Button variant="outline" size="sm" onClick={() => openManage("parcelles", true)} className="gap-1.5"><MapPin className="size-3.5" /> Ajouter une parcelle</Button>
                <Button variant="ghost" size="sm" onClick={() => openManage(manageSubTab)} className="gap-1.5"><Settings className="size-3.5" /> Gérer</Button>
              </div>
            }
          />
          {visibleZones.length === 0 ? (
            <EmptyState icon={<MapPin className="size-8" />} title={watchlistOnly ? "Rien à surveiller" : "Aucune zone"} description={watchlistOnly ? "Aucune zone n'a d'alerte ou de rappel en attente." : "Créez une serre ou une parcelle dans « Gérer »."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleZones.map(({ key, zone }) => {
                const status = zoneStatus(zone)
                const count = plantingsOfZone(zone).reduce((total, planting) => total + Math.max(1, planting.plant_count ?? 1), 0)
                const lastObservation = lastObservationDate(zone)
                const sensorAlert = hasSensorAlert(zone)
                const name = zone.kind === "serre" ? zone.greenhouse.name : zone.parcelle.name
                return (
                  <button key={key} onClick={() => { setZoneKey(key); setView("zone") }} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-muted/30">
                    <span className={status === "rouge" ? "size-3 rounded-full bg-destructive" : status === "orange" ? "size-3 rounded-full bg-chart-3" : "size-3 rounded-full bg-primary"} />
                    {zone.kind === "serre" ? <Warehouse className="size-5 text-muted-foreground" /> : <MapPin className="size-5 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} plant{count > 1 ? "s" : ""}{lastObservation ? ` · dernière observation le ${new Date(lastObservation).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    {sensorAlert ? <Badge tone="danger">Capteur hors seuil</Badge> : null}
                  </button>
                )
              })}
            </div>
          )}
        </>
      ) : null}

      {view === "zone" && currentZone ? (
        <ZoneView
          zone={currentZone} plantings={plantingsOfZone(currentZone)} greenhouses={greenhouses} tables={tables} parcelles={parcelles}
          seedLots={seedLots} seedLotError={seedLotError} crossMap={crossMap}
          plantingLabel={plantingLabel} programsByPlanting={programsByPlanting} interventionsByProgram={interventionsByProgram}
          observationsByPlanting={observationsByPlanting} zonePrograms={currentZonePrograms}
          onBack={() => { setView("dashboard"); setZoneKey(null) }}
          onOpenPlant={(id) => { setPlantingId(id); setView("plant") }}
          onRefresh={fetchData}
        />
      ) : null}

      {view === "plant" && currentPlanting ? (
        <PlantView
          planting={currentPlanting} label={plantingLabel(currentPlanting)}
          details={plantingDetails(currentPlanting)}
          observations={observationsByPlanting.get(currentPlanting.id) ?? []}
          programs={programsByPlanting.get(currentPlanting.id) ?? []}
          zonePrograms={currentZonePrograms}
          interventionsByProgram={interventionsByProgram}
          greenhouses={greenhouses} tables={tables} parcelles={parcelles}
          onBack={() => { setView("zone"); setPlantingId(null) }}
          onRefresh={fetchData}
        />
      ) : null}

      {view === "manage" ? (
        <ManageView
          greenhouses={greenhouses} tables={tables} parcelles={parcelles}
          initialSubTab={manageSubTab} openCreateParcelle={openCreateParcelle}
          onBack={() => setView("dashboard")} onRefresh={fetchData}
        />
      ) : null}

      {view === "dashboard" ? (
        <>
          <button onClick={() => setFlashOpen(true)} className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90" aria-label="Action terrain rapide">
            <Zap className="size-6" />
          </button>
          {flashOpen ? (
            <FlashSheet
              plantings={plantings} plantingLabel={plantingLabel} interventions={interventions} programs={programs}
              onClose={() => setFlashOpen(false)} onRefresh={fetchData}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}