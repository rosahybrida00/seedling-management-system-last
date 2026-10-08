"use client"

// Programme collectif d'une serre ou d'une parcelle, sur un seul écran, sans
// bouton « retour » :
//   1. Suggestions prêtes à l'emploi (produit déjà proposé) : un clic valide,
//      la suggestion se referme et le programme apparaît dans « À appliquer ».
//   2. À appliquer : un bouton « Appliqué » devant chaque soin l'enregistre comme
//      réalisé (aujourd'hui) pour toute la zone ; une autre suggestion peut alors
//      apparaître. Un clic sur la ligne permet de choisir la date et le résultat.
//   3. Appliqués : historique, corrigeable, avec « Planifier la suite ».
//   4. Intervenir sans suggestion.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, Card, Field, Input, Select } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { PROGRAM_RESULT_LABELS, PROGRAM_TYPE_LABELS } from "@/lib/domain/fieldLabels"
import { getWeatherForDate } from "@/lib/services/weatherService"
import { buildSuggestions, appliedKeysFromPrograms, type Suggestion } from "@/lib/services/suggestionEngine"
import { daysBetween, isIsoDate, newInterventionProductName, todayIso } from "@/lib/services/plantTimeline"
import {
  acceptSuggestion,
  applyIntervention,
  createProgramWithIntervention,
  deleteProgram,
  ignoreSuggestion,
  loadDismissedIds,
  reopenIntervention,
  scheduleNext,
  type EventLocation,
  type ProgramTarget,
} from "@/lib/services/programService"
import { ManualInterventionForm, SuggestionCards, type ManualDraft } from "@/components/breeding/parcelle/suggestions-ui"
import type { FieldIntervention, FieldObservation, FieldProgram, Zone } from "@/app/parcelle/types"

interface Row {
  program: FieldProgram
  intervention: FieldIntervention
}

export function zoneTarget(zone: Zone): { target: ProgramTarget; location: EventLocation; scope: "serre" | "parcelle" } {
  if (zone.kind === "serre") {
    return { target: { greenhouse_id: zone.greenhouse.id }, location: { greenhouse_id: zone.greenhouse.id, greenhouse_table_id: null, parcelle_id: null }, scope: "serre" }
  }
  return { target: { parcelle_id: zone.parcelle.id }, location: { greenhouse_id: null, greenhouse_table_id: null, parcelle_id: zone.parcelle.id }, scope: "parcelle" }
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function ZoneProgramPanel({ zone, programs, interventionsByProgram, observations, onRefresh }: {
  zone: Zone
  programs: FieldProgram[]
  interventionsByProgram: Map<string, FieldIntervention[]>
  observations: FieldObservation[]
  onRefresh: () => void
}) {
  const { target, location, scope } = useMemo(() => zoneTarget(zone), [zone])
  const targetId = "greenhouse_id" in target ? target.greenhouse_id : "parcelle_id" in target ? target.parcelle_id : target.planting_id
  const today = todayIso()

  const [temperature, setTemperature] = useState<number | null>(null)
  const [heatThreshold, setHeatThreshold] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getWeatherForDate(today).then((weather) => { if (!cancelled) setTemperature(weather?.temperature ?? null) }).catch(() => undefined)
    supabase.from("user_settings").select("heat_threshold").maybeSingle().then(({ data }) => {
      if (!cancelled) setHeatThreshold((data?.heat_threshold as number | null | undefined) ?? null)
    })
    return () => { cancelled = true }
  }, [today])

  // Fusion (et non remplacement) : une suggestion tout juste validée reste refermée pendant le rechargement.
  const refreshDismissed = useCallback(async () => {
    const loaded = await loadDismissedIds(target)
    setDismissed((current) => new Set([...current, ...loaded]))
  }, [target])
  useEffect(() => { void refreshDismissed() }, [refreshDismissed, targetId])

  const rows: Row[] = useMemo(
    () => programs.flatMap((program) => (interventionsByProgram.get(program.id) ?? []).map((intervention) => ({ program, intervention }))),
    [programs, interventionsByProgram],
  )
  const open = rows.filter((row) => !row.intervention.done).sort((a, b) => (a.intervention.due_date ?? "9999").localeCompare(b.intervention.due_date ?? "9999"))
  const done = rows.filter((row) => row.intervention.done).sort((a, b) => (b.intervention.done_date ?? "").localeCompare(a.intervention.done_date ?? ""))

  const suggestions = useMemo(
    () => buildSuggestions({
      scope,
      today,
      appliedKeys: appliedKeysFromPrograms(programs),
      observations: observations.map((observation) => ({
        id: observation.id,
        date: observation.observation_date.slice(0, 10),
        diseases: observation.disease_pressure ?? [],
        pests: observation.pests ?? [],
        plantId: observation.planting_id,
      })),
      handled: rows.filter((row) => row.program.program_type === "curatif").map((row) => ({ programType: "curatif", date: row.intervention.done_date ?? row.intervention.due_date ?? today })),
      temperature,
      heatThresholdC: heatThreshold,
      dismissedIds: dismissed,
    }),
    [scope, today, programs, observations, rows, temperature, heatThreshold, dismissed],
  )

  async function run(action: () => Promise<{ error: string | null }>, success: string) {
    setBusy(true)
    setError(null)
    const outcome = await action()
    setBusy(false)
    if (outcome.error) { setError(outcome.error); return false }
    setExpanded(null)
    setNotice(success)
    onRefresh()
    return true
  }

  function accept(suggestion: Suggestion, chosen: string[]) {
    void run(async () => {
      const outcome = await acceptSuggestion(target, location, suggestion, chosen, today)
      // La suggestion se referme tout de suite, sans attendre le rechargement de la zone.
      if (!outcome.error) setDismissed((current) => new Set(current).add(suggestion.id))
      return outcome
    }, "Programme validé : il vous reste à l'appliquer.")
  }

  function ignore(suggestion: Suggestion) {
    void run(async () => {
      const outcome = await ignoreSuggestion(target, suggestion)
      if (!outcome.error) await refreshDismissed()
      return outcome
    }, "Suggestion ignorée.")
  }

  async function submitManual(draft: ManualDraft): Promise<{ error: string | null; saved: boolean }> {
    const created = await createProgramWithIntervention(target, location, {
      programType: draft.programType,
      treatmentCodes: draft.treatmentCodes,
      fertilizerCode: draft.fertilizerCode,
      productName: newInterventionProductName(draft),
      date: draft.date,
      notes: draft.notes,
    })
    if (created.error || !created.interventionId) return { error: created.error, saved: false }
    if (draft.alreadyDone) {
      const applied = await applyIntervention(created.interventionId, { doneDate: draft.date, result: draft.result }, location)
      if (applied.error) return { error: `Soin créé mais non appliqué : ${applied.error}`, saved: true }
    }
    onRefresh()
    return { error: null, saved: true }
  }

  return (
    <div className="flex flex-col gap-4">
      {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <section className="flex flex-col gap-2" aria-label="Suggestions">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggestions</h4>
        {suggestions.length > 0 ? (
          <SuggestionCards suggestions={suggestions} onAccept={accept} onIgnore={ignore} busy={busy} />
        ) : (
          <p className="text-sm text-muted-foreground">Aucune suggestion pour le moment. Elle réapparaîtra avec la saison ou après une observation sanitaire.</p>
        )}
      </section>

      <section className="flex flex-col gap-2" aria-label="À appliquer">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">À appliquer · {open.length}</h4>
        {open.length === 0 ? <p className="text-sm text-muted-foreground">Rien à appliquer pour l&apos;instant.</p> : null}
        <ul className="flex flex-col gap-2">
          {open.map((row) => (
            <ProgramRow
              key={row.intervention.id}
              row={row}
              today={today}
              busy={busy}
              expanded={expanded === row.intervention.id}
              onToggle={() => setExpanded(expanded === row.intervention.id ? null : row.intervention.id)}
              onApply={(date, result) => void run(() => applyIntervention(row.intervention.id, { doneDate: date, result }, location), "Appliqué.")}
              onReopen={() => undefined}
              onNext={(days) => void run(() => scheduleNext(row.program.id, addDays(row.intervention.due_date ?? today, days), location), "Suite planifiée.")}
              onDelete={() => void run(() => deleteProgram(row.program.id), "Programme supprimé.")}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-label="Appliqués">
        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appliqués · {done.length}</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {done.map((row) => (
              <ProgramRow
                key={row.intervention.id}
                row={row}
                today={today}
                busy={busy}
                expanded={expanded === row.intervention.id}
                onToggle={() => setExpanded(expanded === row.intervention.id ? null : row.intervention.id)}
                onApply={(date, result) => void run(() => applyIntervention(row.intervention.id, { doneDate: date, result }, location), "Soin corrigé.")}
                onReopen={() => void run(() => reopenIntervention(row.intervention.id), "Soin rouvert.")}
                onNext={(days) => void run(() => scheduleNext(row.program.id, addDays(row.intervention.done_date ?? today, days), location), "Suite planifiée.")}
                onDelete={() => void run(() => deleteProgram(row.program.id), "Programme supprimé.")}
              />
            ))}
          </ul>
        </details>
      </section>

      {showManual ? (
        <ManualInterventionForm
          title="Intervenir sans suggestion"
          today={today}
          submit={submitManual}
          onCancel={() => setShowManual(false)}
          onDone={(message) => { setShowManual(false); setNotice(message) }}
        />
      ) : (
        <Button size="sm" variant="outline" className="w-fit gap-1.5" onClick={() => setShowManual(true)}><Plus className="size-4" /> Intervenir sans suggestion</Button>
      )}
    </div>
  )
}

function ProgramRow({ row, today, busy, expanded, onToggle, onApply, onReopen, onNext, onDelete }: {
  row: Row
  today: string
  busy: boolean
  expanded: boolean
  onToggle: () => void
  onApply: (date: string, result: string) => void
  onReopen: () => void
  onNext: (days: number) => void
  onDelete: () => void
}) {
  const { program, intervention } = row
  const isDone = intervention.done
  const due = intervention.due_date
  const late = !isDone && due != null && daysBetween(today, due) < 0
  const [date, setDate] = useState(isDone ? intervention.done_date ?? today : today)
  const [result, setResult] = useState(intervention.result ?? "")
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!isIsoDate(date)) { setError("La date est invalide."); return }
    if (date > today) { setError("Un soin ne peut pas être enregistré à une date future."); return }
    setError(null)
    onApply(date, result)
  }

  return (
    <li>
      <Card className={expanded ? "border-primary/40" : late ? "border-destructive/40" : ""}>
        <div className="flex items-center gap-2 p-2">
          {!isDone ? (
            <Button size="sm" disabled={busy} onClick={() => onApply(today, "")} aria-label={`Appliqué : ${program.product_name}`} className="shrink-0 gap-1.5">
              <Check className="size-4" /> Appliqué
            </Button>
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center text-primary" aria-label="Appliqué"><Check className="size-4" /></span>
          )}
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left hover:bg-muted/40">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{program.product_name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1">
                <Badge tone={program.program_type === "curatif" ? "danger" : program.program_type === "fertilisation" ? "accent" : "primary"}>{PROGRAM_TYPE_LABELS[program.program_type] ?? program.program_type}</Badge>
                {late ? <Badge tone="danger">En retard</Badge> : null}
                {isDone && intervention.result ? <Badge tone={intervention.result === "echec" ? "danger" : intervention.result === "amelioration" ? "success" : "neutral"}>{PROGRAM_RESULT_LABELS[intervention.result] ?? intervention.result}</Badge> : null}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{isDone ? `fait le ${formatDate(intervention.done_date ?? today)}` : due ? `prévu le ${formatDate(due)}` : "sans date"}</span>
            {expanded ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
          </button>
        </div>

        {expanded ? (
          <div className="flex flex-col gap-3 border-t border-border p-3 text-sm">
            {isDone && intervention.weather_daily?.temperature != null ? (
              <p className="text-xs text-muted-foreground">Météo du jour : {Math.round(intervention.weather_daily.temperature)} °C{intervention.weather_daily.humidity != null ? ` · ${Math.round(intervention.weather_daily.humidity)} % d'humidité` : ""}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={isDone ? "Date de réalisation" : "Date d'application"} htmlFor={`d-${intervention.id}`}>
                <Input id={`d-${intervention.id}`} type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
              </Field>
              <Field label="Résultat" htmlFor={`r-${intervention.id}`}>
                <Select id={`r-${intervention.id}`} value={result} onChange={(event) => setResult(event.target.value)}>
                  <option value="">Pas encore de résultat</option>
                  {Object.entries(PROGRAM_RESULT_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
                </Select>
              </Field>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={busy} onClick={submit}>{isDone ? "Enregistrer la correction" : "Valider"}</Button>
              {isDone ? <Button size="sm" variant="outline" disabled={busy} onClick={onReopen}>Rouvrir</Button> : null}
              <span className="text-xs text-muted-foreground">Planifier la suite :</span>
              {[7, 14, 21].map((days) => (
                <Button key={days} size="sm" variant="ghost" disabled={busy} onClick={() => onNext(days)}>+{days} j</Button>
              ))}
              <Button size="sm" variant="ghost" disabled={busy} className="ml-auto text-destructive" onClick={() => { if (window.confirm("Supprimer ce programme et toutes ses échéances ?")) onDelete() }}>Supprimer le programme</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </li>
  )
}
