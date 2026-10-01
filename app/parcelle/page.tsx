"use client"

import { useEffect, useMemo, useState } from "react"
import { Sprout, MapPin, Warehouse, Settings, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { SectionHeading, EmptyState } from "@/components/breeding/ui"
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
  Zone,
  ZoneStatus,
} from "@/app/parcelle/types"

// ---------------------------------------------------------------------------
// Module Serres & Parcelles : tableau de bord des zones (Serre ou Parcelle),
// avec un statut de couleur (vert/orange/rouge), un agenda réel par plant
// (fini le compteur de passages rigide — chaque intervention est une ligne
// datée), une Watchlist, un bouton Flash pour l'action terrain en un tap,
// et le pont vers Croisement ("Utiliser comme parent"). Distinct de /serre,
// qui évalue les semis issus des graines (phénotype, sélection).
//
// Les types et sous-composants de ce module sont répartis dans
// app/parcelle/types.ts et components/breeding/parcelle/*.
// ---------------------------------------------------------------------------

export default function ParcellePage() {
  return (
    <AppShell>
      <ParcelleContent />
    </AppShell>
  )
}

function ParcelleContent() {
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([])
  const [tables, setTables] = useState<GreenhouseTable[]>([])
  const [parcelles, setParcelles] = useState<Parcelle[]>([])
  const [plantings, setPlantings] = useState<FieldPlanting[]>([])
  const [observations, setObservations] = useState<FieldObservation[]>([])
  const [programs, setPrograms] = useState<FieldProgram[]>([])
  const [interventions, setInterventions] = useState<FieldIntervention[]>([])
  const [varieties, setVarieties] = useState<Map<string, string>>(new Map())
  const [seedlings, setSeedlings] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<"dashboard" | "zone" | "plant" | "manage">("dashboard")
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [zoneKey, setZoneKey] = useState<string | null>(null)
  const [plantingId, setPlantingId] = useState<string | null>(null)
  const [flashOpen, setFlashOpen] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [gh, gt, pc, fp, ob, pr, iv, vr, sl] = await Promise.all([
      supabase.from("greenhouses").select("id,name").order("name"),
      supabase.from("greenhouse_tables").select("id,greenhouse_id,name").order("name"),
      supabase.from("parcelles").select("id,name,soil_type,location").order("name"),
      supabase.from("field_plantings").select("*").order("created_at", { ascending: false }),
      supabase.from("field_observations").select("*").order("observation_date", { ascending: false }),
      supabase.from("field_programs").select("*").order("start_date", { ascending: false }),
      supabase.from("field_interventions").select("*").order("due_date", { ascending: true }),
      supabase.from("varieties").select("id,name,commercial_name"),
      supabase.from("seedlings").select("id,code,seedling_code"),
    ])
    if (gh.data) setGreenhouses(gh.data)
    if (gt.data) setTables(gt.data)
    if (pc.data) setParcelles(pc.data as Parcelle[])
    if (fp.data) setPlantings(fp.data as FieldPlanting[])
    if (ob.data) setObservations(ob.data as FieldObservation[])
    if (pr.data) setPrograms(pr.data as FieldProgram[])
    if (iv.data) setInterventions(iv.data as FieldIntervention[])
    if (vr.data) setVarieties(new Map(vr.data.map((v: any) => [v.id, v.commercial_name || v.name])))
    if (sl.data) setSeedlings(new Map(sl.data.map((s: any) => [s.id, s.seedling_code || s.code])))
    setLoading(false)
  }

  const tableMap = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables])
  const programsByPlanting = useMemo(() => { const m = new Map<string, FieldProgram[]>(); programs.forEach((p) => { if (p.planting_id) { const a = m.get(p.planting_id) ?? []; a.push(p); m.set(p.planting_id, a) } }); return m }, [programs])
  const interventionsByProgram = useMemo(() => { const m = new Map<string, FieldIntervention[]>(); interventions.forEach((i) => { const a = m.get(i.program_id) ?? []; a.push(i); m.set(i.program_id, a) }); return m }, [interventions])
  const observationsByPlanting = useMemo(() => { const m = new Map<string, FieldObservation[]>(); observations.forEach((o) => { const a = m.get(o.planting_id) ?? []; a.push(o); m.set(o.planting_id, a) }); return m }, [observations])

  function plantingLabel(p: FieldPlanting): string {
    return p.variety_id ? (varieties.get(p.variety_id) ?? "Variété inconnue") : (seedlings.get(p.seedling_id ?? "") ?? "Semis inconnu")
  }
  function plantingsOfZone(zone: Zone): FieldPlanting[] {
    if (zone.kind === "serre") {
      const tableIds = new Set(tables.filter((t) => t.greenhouse_id === zone.greenhouse.id).map((t) => t.id))
      return plantings.filter((p) => p.greenhouse_table_id && tableIds.has(p.greenhouse_table_id))
    }
    return plantings.filter((p) => p.parcelle_id === zone.parcelle.id)
  }

  // Statut de couleur : rouge si une observation récente signale maladie/
  // ravageur pour un plant de la zone ; orange s'il y a une intervention
  // prévue en retard (due_date <= aujourd'hui, non faite) ; vert sinon.
  function zoneStatus(zone: Zone): ZoneStatus {
    const zonePlantings = plantingsOfZone(zone)
    const plantingIds = new Set(zonePlantings.map((p) => p.id))
    const hasAlert = observations.some((o) => plantingIds.has(o.planting_id) && (o.disease_pressure.length > 0 || o.pests.length > 0))
    if (hasAlert) return "rouge"
    const today = new Date().toISOString().split("T")[0]
    const relevantPrograms = programs.filter((p) => p.parcelle_id === (zone.kind === "parcelle" ? zone.parcelle.id : "__none__") || p.greenhouse_id === (zone.kind === "serre" ? zone.greenhouse.id : "__none__") || (p.planting_id && plantingIds.has(p.planting_id)))
    const hasDue = relevantPrograms.some((p) => (interventionsByProgram.get(p.id) ?? []).some((iv) => !iv.done && iv.due_date && iv.due_date <= today))
    return hasDue ? "orange" : "vert"
  }

  const zones: Array<{ key: string; zone: Zone }> = useMemo(() => [
    ...greenhouses.map((g) => ({ key: `serre:${g.id}`, zone: { kind: "serre" as const, greenhouse: g } })),
    ...parcelles.map((p) => ({ key: `parcelle:${p.id}`, zone: { kind: "parcelle" as const, parcelle: p } })),
  ], [greenhouses, parcelles])

  const visibleZones = watchlistOnly ? zones.filter((z) => zoneStatus(z.zone) !== "vert") : zones
  const currentZone = zoneKey ? zones.find((z) => z.key === zoneKey)?.zone ?? null : null
  const currentPlanting = plantingId ? plantings.find((p) => p.id === plantingId) ?? null : null

  if (loading) return <div className="flex items-center justify-center py-20"><Sprout className="size-8 animate-pulse text-primary" /></div>

  return (
    <div className="relative flex flex-col gap-5 pb-16">
      {view === "dashboard" ? (
        <>
          <SectionHeading
            title="Serres & Parcelles"
            description="Vue d'ensemble de vos zones : vert = tout va bien, orange = rappel en attente, rouge = alerte sanitaire."
            action={
              <div className="flex gap-2">
                <Button variant={watchlistOnly ? "default" : "outline"} size="sm" onClick={() => setWatchlistOnly((v) => !v)}>Watchlist</Button>
                <Button variant="outline" size="sm" onClick={() => setView("manage")} className="gap-1.5"><Settings className="size-3.5" /> Gérer</Button>
              </div>
            }
          />
          {visibleZones.length === 0 ? (
            <EmptyState icon={<MapPin className="size-8" />} title={watchlistOnly ? "Rien à surveiller" : "Aucune zone"} description={watchlistOnly ? "Aucune zone n'a d'alerte ou de rappel en attente." : "Créez une serre ou une parcelle dans « Gérer »."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleZones.map(({ key, zone }) => {
                const status = zoneStatus(zone)
                const count = plantingsOfZone(zone).length
                const name = zone.kind === "serre" ? zone.greenhouse.name : zone.parcelle.name
                return (
                  <button key={key} onClick={() => { setZoneKey(key); setView("zone") }} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-muted/30">
                    <span className={status === "rouge" ? "size-3 rounded-full bg-destructive" : status === "orange" ? "size-3 rounded-full bg-chart-3" : "size-3 rounded-full bg-primary"} />
                    {zone.kind === "serre" ? <Warehouse className="size-5 text-muted-foreground" /> : <MapPin className="size-5 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{count} plant{count > 1 ? "s" : ""}</p>
                    </div>
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
          plantingLabel={plantingLabel} programsByPlanting={programsByPlanting} interventionsByProgram={interventionsByProgram}
          observationsByPlanting={observationsByPlanting}
          onBack={() => { setView("dashboard"); setZoneKey(null) }}
          onOpenPlant={(id) => { setPlantingId(id); setView("plant") }}
          onRefresh={fetchData}
        />
      ) : null}

      {view === "plant" && currentPlanting ? (
          <PlantView
          planting={currentPlanting} label={plantingLabel(currentPlanting)}
          observations={observationsByPlanting.get(currentPlanting.id) ?? []}
          programs={programsByPlanting.get(currentPlanting.id) ?? []}
          interventionsByProgram={interventionsByProgram}
          greenhouses={greenhouses} tables={tables} parcelles={parcelles}
          onBack={() => { setView("zone"); setPlantingId(null) }}
          onRefresh={fetchData}
        />
      ) : null}

      {view === "manage" ? (
        <ManageView greenhouses={greenhouses} tables={tables} parcelles={parcelles} onBack={() => setView("dashboard")} onRefresh={fetchData} />
      ) : null}

      {view === "dashboard" ? (
        <>
          <button onClick={() => setFlashOpen(true)} className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90">
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
