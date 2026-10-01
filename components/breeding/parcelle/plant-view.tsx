"use client"

// Carte du plant : 3 onglets — Historique, Agenda individuel, Croisement.

import { useState } from "react"
import { ArrowLeft, CalendarClock, ClipboardList, Flower2, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Field, Select } from "@/components/breeding/ui"
import { supabase } from "@/lib/supabase-client"
import { ObservationsSection } from "@/components/breeding/parcelle/observations-section"
import { AgendaSection } from "@/components/breeding/parcelle/agenda-section"
import { CroisementBridge } from "@/components/breeding/parcelle/croisement-bridge"
import type {
  FieldPlanting, FieldObservation, FieldProgram, FieldIntervention, Greenhouse, GreenhouseTable, Parcelle,
} from "@/app/parcelle/types"

export function PlantView({ planting, label, observations, programs, interventionsByProgram, greenhouses, tables, parcelles, onBack, onRefresh }: {
  planting: FieldPlanting; label: string; observations: FieldObservation[]; programs: FieldProgram[]
  interventionsByProgram: Map<string, FieldIntervention[]>; greenhouses: Greenhouse[]; tables: GreenhouseTable[]; parcelles: Parcelle[]
  onBack: () => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<"historique" | "agenda" | "croisement" | "transfert">("historique")
  const [destination, setDestination] = useState("")
  const [moving, setMoving] = useState(false)

  async function transferPlanting() {
    if (!destination) return
    setMoving(true)
    const isGreenhouse = destination.startsWith("serre:")
    const id = destination.slice(destination.indexOf(":") + 1)
    const { error } = await supabase.from("field_plantings").update({ greenhouse_table_id: isGreenhouse ? id : null, parcelle_id: isGreenhouse ? null : id }).eq("id", planting.id)
    setMoving(false)
    if (error) { alert(`Transfert impossible : ${error.message}`); return }
    setDestination("")
    onRefresh()
    onBack()
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour</button>
      <h2 className="font-serif text-xl text-foreground">{label}</h2>

      <div className="flex gap-2">
        <button onClick={() => setTab("historique")} className={tab === "historique" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><CalendarClock className="size-4" /> Historique</button>
        <button onClick={() => setTab("agenda")} className={tab === "agenda" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><ClipboardList className="size-4" /> Agenda</button>
        <button onClick={() => setTab("croisement")} className={tab === "croisement" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><Flower2 className="size-4" /> Croisement</button>
        <button onClick={() => setTab("transfert")} className={tab === "transfert" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><ArrowUpCircle className="size-4" /> Transférer</button>
      </div>

      {tab === "historique" ? <ObservationsSection plantingId={planting.id} observations={observations} onRefresh={onRefresh} /> : null}
      {tab === "agenda" ? <AgendaSection target={{ planting_id: planting.id }} programs={programs} interventionsByProgram={interventionsByProgram} onRefresh={onRefresh} /> : null}
      {tab === "croisement" ? <CroisementBridge planting={planting} label={label} /> : null}
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
