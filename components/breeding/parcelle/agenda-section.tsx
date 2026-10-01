"use client"

import { useState } from "react"
import { Plus, Check, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, EmptyState, Select } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { PROGRAM_TYPE_LABELS, PROGRAM_RESULT_LABELS } from "@/lib/domain/fieldLabels"
import type { FieldProgram, FieldIntervention } from "@/app/parcelle/types"

export function AgendaSection({ plantingId, programs, interventionsByProgram, onRefresh }: {
  plantingId: string; programs: FieldProgram[]; interventionsByProgram: Map<string, FieldIntervention[]>; onRefresh: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [programType, setProgramType] = useState<"curatif" | "preventif" | "fertilisation">("preventif")
  const [productName, setProductName] = useState("")
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split("T")[0])

  async function createProgram() {
    if (!productName.trim()) return
    const { data, error } = await supabase.from("field_programs").insert({
      planting_id: plantingId, program_type: programType, product_name: productName.trim(), start_date: firstDueDate,
    }).select("id").single()
    if (error) { alert(`Erreur : ${error.message}`); return }
    await supabase.from("field_interventions").insert({ program_id: data.id, due_date: firstDueDate })
    setProductName(""); setCreating(false)
    onRefresh()
  }

  async function addNextIntervention(programId: string, dueDate: string) {
    if (!dueDate) return
    await supabase.from("field_interventions").insert({ program_id: programId, due_date: dueDate })
    onRefresh()
  }

  async function markDone(intervention: FieldIntervention, result: string) {
    await supabase.from("field_interventions").update({ done: true, done_date: new Date().toISOString().split("T")[0], result: result || null }).eq("id", intervention.id)
    onRefresh()
  }

  const rows = programs.flatMap((p) => (interventionsByProgram.get(p.id) ?? []).map((iv) => ({ program: p, iv })))
    .sort((a, b) => (b.iv.due_date ?? "").localeCompare(a.iv.due_date ?? ""))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating((v) => !v)} className="gap-1.5"><Plus className="size-4" /> Nouveau programme</Button>
      </div>

      {creating ? (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type"><Select value={programType} onChange={(e) => setProgramType(e.target.value as any)}>{Object.entries(PROGRAM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Produit"><Input value={productName} onChange={(e) => setProductName(e.target.value)} /></Field>
            <Field label="Prochaine intervention"><Input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} /></Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Annuler</Button>
            <Button size="sm" onClick={createProgram} disabled={!productName.trim()}>Créer</Button>
          </div>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" />} title="Aucun programme" description="Créez un programme pour planifier fertilisation ou traitements sur ce plant." />
      ) : (
        <div className="grid gap-2">
          {rows.map(({ program, iv }) => (
            <AgendaRow key={iv.id} program={program} intervention={iv} onDone={(result) => markDone(iv, result)} onScheduleNext={(date) => addNextIntervention(program.id, date)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgendaRow({ program, intervention, onDone, onScheduleNext }: {
  program: FieldProgram; intervention: FieldIntervention; onDone: (result: string) => void; onScheduleNext: (date: string) => void
}) {
  const [choosingResult, setChoosingResult] = useState(false)
  const [nextDate, setNextDate] = useState("")
  const overdue = !intervention.done && intervention.due_date != null && intervention.due_date <= new Date().toISOString().split("T")[0]

  return (
    <Card className="flex flex-wrap items-center gap-2 p-3 text-sm">
      <Badge tone="primary">{PROGRAM_TYPE_LABELS[program.program_type]}</Badge>
      <span className="font-medium text-foreground">{program.product_name}</span>
      <span className="text-xs text-muted-foreground">{intervention.due_date ? formatDate(intervention.due_date) : "sans date"}</span>
      {intervention.done ? (
        <Badge tone={intervention.result === "amelioration" ? "success" : intervention.result === "echec" ? "danger" : "warning"} className="ml-auto">
          Fait{intervention.result ? ` · ${PROGRAM_RESULT_LABELS[intervention.result]}` : ""}
        </Badge>
      ) : choosingResult ? (
        <div className="ml-auto flex flex-wrap gap-1.5">
          {Object.entries(PROGRAM_RESULT_LABELS).map(([k, v]) => <Button key={k} size="sm" variant="outline" onClick={() => onDone(k)}>{v}</Button>)}
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-1.5">
          {overdue ? <Badge tone="danger">En retard</Badge> : null}
          <Button size="sm" onClick={() => setChoosingResult(true)} className="gap-1"><Check className="size-3.5" /> Fait</Button>
        </div>
      )}
      {intervention.done ? (
        <div className="flex w-full items-center gap-1.5 border-t border-border pt-2">
          <Input type="date" className="h-7 w-36" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => nextDate && onScheduleNext(nextDate)} disabled={!nextDate}>Planifier la suite</Button>
        </div>
      ) : null}
    </Card>
  )
}
