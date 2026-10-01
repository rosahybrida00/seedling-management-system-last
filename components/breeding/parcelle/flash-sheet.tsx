"use client"

// Bouton Flash : valider une intervention en un tap, ou ajouter une
// observation rapide, sans naviguer dans les menus.

import { useState, useMemo } from "react"
import { ArrowLeft, Check, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Field, Select } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { DISEASE_PRESSURE_LABELS, PEST_LABELS } from "@/lib/domain/fieldLabels"
import type { FieldPlanting, FieldIntervention, FieldProgram } from "@/app/parcelle/types"

export function FlashSheet({ plantings, plantingLabel, interventions, programs, onClose, onRefresh }: {
  plantings: FieldPlanting[]; plantingLabel: (p: FieldPlanting) => string
  interventions: FieldIntervention[]; programs: FieldProgram[]
  onClose: () => void; onRefresh: () => void
}) {
  const [mode, setMode] = useState<"choix" | "intervention" | "observation">("choix")
  const [plantingId, setPlantingId] = useState("")
  const [disease, setDisease] = useState<string[]>([])
  const [pests, setPests] = useState<string[]>([])

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const due = interventions.filter((i) => !i.done)

  async function markDone(intervention: FieldIntervention) {
    await supabase.from("field_interventions").update({ done: true, done_date: new Date().toISOString().split("T")[0] }).eq("id", intervention.id)
    onRefresh()
  }

  async function submitObservation() {
    if (!plantingId) return
    await supabase.from("field_observations").insert({
      planting_id: plantingId, observation_date: new Date().toISOString().split("T")[0],
      disease_pressure: disease, pests, climate_behavior: [], treatment_applied: [], treatment_reaction: [], remarque: "",
    })
    onRefresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 sm:items-center" onClick={onClose}>
      <Card className="w-full max-w-md p-4 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        {mode === "choix" ? (
          <div className="grid gap-2">
            <p className="mb-1 text-sm font-medium text-foreground">Action rapide</p>
            <Button className="justify-start gap-2" onClick={() => setMode("intervention")}><Check className="size-4" /> Valider une intervention</Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => setMode("observation")}><Circle className="size-4" /> Observation rapide</Button>
            <Button variant="ghost" onClick={onClose}>Fermer</Button>
          </div>
        ) : mode === "intervention" ? (
          <div className="grid gap-2">
            <button onClick={() => setMode("choix")} className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Retour</button>
            {due.length === 0 ? <p className="text-sm text-muted-foreground">Aucune intervention en attente.</p> : due.map((iv) => {
              const prog = programById.get(iv.program_id)
              return (
                <div key={iv.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <span className="flex-1">{prog?.product_name ?? "Intervention"} {iv.due_date ? `· ${formatDate(iv.due_date)}` : ""}</span>
                  <Button size="sm" onClick={() => markDone(iv)} className="gap-1"><Check className="size-3.5" /> Fait</Button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-2">
            <button onClick={() => setMode("choix")} className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Retour</button>
            <Field label="Plant">
              <Select value={plantingId} onChange={(e) => setPlantingId(e.target.value)}>
                <option value="">-- Sélectionner --</option>
                {plantings.map((p) => <option key={p.id} value={p.id}>{plantingLabel(p)}</option>)}
              </Select>
            </Field>
            <div className="grid gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Maladie</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(DISEASE_PRESSURE_LABELS).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={disease.includes(k)} onChange={(e) => setDisease((c) => e.target.checked ? [...c, k] : c.filter((x) => x !== k))} /> {v}</label>
                ))}
              </div>
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ravageurs</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(PEST_LABELS).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={pests.includes(k)} onChange={(e) => setPests((c) => e.target.checked ? [...c, k] : c.filter((x) => x !== k))} /> {v}</label>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={submitObservation} disabled={!plantingId}>Enregistrer</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
