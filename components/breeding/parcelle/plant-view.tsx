"use client"

// Carte du plant : 3 onglets — Historique, Agenda individuel, Croisement.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarClock, ClipboardList, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, Card, EmptyState, Field, SectionHeading, Select } from "@/components/breeding/ui"
import { supabase } from "@/lib/supabase-client"
import { formatDate } from "@/components/breeding/format"
import { DISEASE_PRESSURE_LABELS, FIELD_TREATMENT_LABELS, PEST_LABELS } from "@/lib/domain/fieldLabels"
import { ObservationsSection } from "@/components/breeding/parcelle/observations-section"
import { AgendaSection } from "@/components/breeding/parcelle/agenda-section"
import type {
  FieldPlanting, FieldPlantingMove, FieldObservation, FieldProgram, FieldIntervention, Greenhouse, GreenhouseTable, Parcelle, PlantDetails,
} from "@/app/parcelle/types"

export function PlantView({ planting, label, details = null, observations, programs, zonePrograms = [], interventionsByProgram, greenhouses, tables, parcelles, onBack, onRefresh }: {
  planting: FieldPlanting; label: string; details?: PlantDetails | null; observations: FieldObservation[]; programs: FieldProgram[]
  zonePrograms?: FieldProgram[]
  interventionsByProgram: Map<string, FieldIntervention[]>; greenhouses: Greenhouse[]; tables: GreenhouseTable[]; parcelles: Parcelle[]
  onBack: () => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<"historique" | "agenda" | "transfert">("historique")
  const [destination, setDestination] = useState("")
  const [moving, setMoving] = useState(false)
  const [moves, setMoves] = useState<FieldPlantingMove[]>([])

  useEffect(() => {
    supabase.from("field_planting_moves").select("*").eq("planting_id", planting.id).order("moved_at", { ascending: false })
      .then(({ data }) => setMoves((data ?? []) as FieldPlantingMove[]))
  }, [planting.id])

  async function transferPlanting() {
    if (!destination) return
    setMoving(true)
    const isGreenhouse = destination.startsWith("serre:")
    const id = destination.slice(destination.indexOf(":") + 1)
    const { error } = await supabase.from("field_plantings").update({
      greenhouse_table_id: isGreenhouse ? id : null,
      parcelle_id: isGreenhouse ? null : id,
    }).eq("id", planting.id)
    setMoving(false)
    if (error) { alert(`Transfert impossible : ${error.message}`); return }
    const { error: moveError } = await supabase.from("field_planting_moves").insert({
      planting_id: planting.id,
      from_greenhouse_table_id: planting.greenhouse_table_id,
      from_parcelle_id: planting.parcelle_id,
      to_greenhouse_table_id: isGreenhouse ? id : null,
      to_parcelle_id: isGreenhouse ? null : id,
    })
    setDestination("")
    if (moveError) alert(`Plant déplacé, mais historique de transfert non enregistré : ${moveError.message}`)
    onRefresh()
    onBack()
  }

  function locationName(tableId: string | null, parcelleId: string | null): string {
    if (tableId) {
      const table = tables.find((item) => item.id === tableId)
      const greenhouse = greenhouses.find((item) => item.id === table?.greenhouse_id)
      return `${greenhouse?.name ?? "Serre"} · ${table?.name ?? "Table supprimée"}`
    }
    return parcelles.find((item) => item.id === parcelleId)?.name ?? "Parcelle supprimée"
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour</button>
      <h2 className="font-serif text-xl text-foreground">{label}</h2>

      {details ? (
        <Card className="flex flex-col gap-4 p-4 sm:flex-row">
          {details.photoUrl ? <img src={details.photoUrl} alt={`Photo de ${label}`} className="size-32 shrink-0 rounded-md object-cover" /> : null}
          <div className="min-w-0 flex-1">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {details.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd className="text-sm text-foreground">{field.value}</dd>
                </div>
              ))}
            </dl>
            {details.description ? <p className="mt-3 text-sm text-muted-foreground">{details.description}</p> : null}
            {planting.variety_id ? (
              <Link href={`/rose/${planting.variety_id}`} className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                Ouvrir la fiche Catalogue et son historique
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <button onClick={() => setTab("historique")} className={tab === "historique" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><CalendarClock className="size-4" /> Historique</button>
        <button onClick={() => setTab("agenda")} className={tab === "agenda" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><ClipboardList className="size-4" /> Agenda</button>
        <button onClick={() => setTab("transfert")} className={tab === "transfert" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><ArrowUpCircle className="size-4" /> Transférer</button>
      </div>

      {tab === "historique" ? (
        <div className="flex flex-col gap-5">
          <ObservationsSection
            plantingId={planting.id}
            greenhouseTableId={planting.greenhouse_table_id}
            parcelleId={planting.parcelle_id}
            observations={observations}
            onRefresh={onRefresh}
          />
          {moves.length > 0 ? (
            <section className="flex flex-col gap-3">
              <SectionHeading title="Historique des déplacements" />
              {moves.map((move) => (
                <Card key={move.id} className="p-3 text-sm">
                  <p className="font-medium text-foreground">{new Date(move.moved_at).toLocaleDateString("fr-FR")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locationName(move.from_greenhouse_table_id, move.from_parcelle_id)} → {locationName(move.to_greenhouse_table_id, move.to_parcelle_id)}
                  </p>
                </Card>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
      {tab === "agenda" ? (
        <div className="flex flex-col gap-5">
          <AgendaSection
            target={{ planting_id: planting.id }}
            locationSnapshot={{
              greenhouse_id: greenhouses.find((greenhouse) => tables.some((table) => table.id === planting.greenhouse_table_id && table.greenhouse_id === greenhouse.id))?.id ?? null,
              greenhouse_table_id: planting.greenhouse_table_id,
              parcelle_id: planting.parcelle_id,
            }}
            observations={observations}
            programs={[...zonePrograms, ...programs]} interventionsByProgram={interventionsByProgram} onRefresh={onRefresh}
          />
          <section className="flex flex-col gap-3">
            <SectionHeading title="Interventions consignées sur le terrain" description="Les traitements curatifs restent des observations individuelles, pas des programmes à planifier." />
            {observations.filter((observation) => observation.disease_pressure.length > 0 || observation.pests.length > 0 || observation.treatment_applied.length > 0).length === 0 ? (
              <EmptyState title="Aucune intervention terrain consignée" />
            ) : (
              observations
                .filter((observation) => observation.disease_pressure.length > 0 || observation.pests.length > 0 || observation.treatment_applied.length > 0)
                .map((observation) => (
                  <Card key={observation.id} className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">{formatDate(observation.observation_date)}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {observation.disease_pressure.map((code) => <Badge key={code} tone="danger">{DISEASE_PRESSURE_LABELS[code] ?? code}</Badge>)}
                      {observation.pests.map((code) => <Badge key={code} tone="warning">{PEST_LABELS[code] ?? code}</Badge>)}
                      {observation.treatment_applied.map((code) => <Badge key={code} tone="primary">{FIELD_TREATMENT_LABELS[code] ?? code}</Badge>)}
                    </div>
                    {observation.remarque ? <p className="mt-2 text-xs text-muted-foreground">{observation.remarque}</p> : null}
                  </Card>
                ))
            )}
          </section>
        </div>
      ) : null}
      {tab === "transfert" ? (
        <Card className="flex flex-col gap-4 p-4">
          <div><h3 className="font-medium text-foreground">Déplacer cette variété ou ce lot</h3><p className="text-sm text-muted-foreground">L&apos;historique sanitaire et l&apos;agenda suivent toujours la carte.</p></div>
          <Field label="Nouvel emplacement">
            <Select value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option value="">-- Choisir une serre ou une parcelle --</option>
              {greenhouses.map((g) => <optgroup key={g.id} label={`Serre · ${g.name}`}>
                {tables.filter((t) => t.greenhouse_id === g.id).map((t) => <option key={t.id} value={`serre:${t.id}`}>{t.name}</option>)}
              </optgroup>)}
              <optgroup label="Parcelles">
                {parcelles.map((p) => <option key={p.id} value={`parcelle:${p.id}`}>{p.name}</option>)}
              </optgroup>
            </Select>
          </Field>
          <Button onClick={transferPlanting} disabled={!destination || moving} className="w-fit gap-1.5">{moving ? "Transfert…" : "Confirmer le transfert"}</Button>
        </Card>
      ) : null}
    </div>
  )
}
