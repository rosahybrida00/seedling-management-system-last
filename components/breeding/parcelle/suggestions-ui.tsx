"use client"

// Éléments communs aux pages Serre/Parcelle et à la fiche d'un plant :
//  - SuggestionCards : suggestions prêtes à l'emploi. Un clic sur la suggestion
//    la valide (le programme est enregistré avec le produit déjà proposé) et la
//    referme ; « Ignorer » l'écarte pour de bon.
//  - ManualInterventionForm : intervenir sans passer par une suggestion.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge, Card, Field, Input, Select, Textarea } from "@/components/breeding/ui"
import { FERTILIZER_LABELS, FIELD_TREATMENT_LABELS, PROGRAM_RESULT_LABELS, PROGRAM_TYPE_LABELS } from "@/lib/domain/fieldLabels"
import { isIsoDate, newInterventionProblem, NEW_INTERVENTION_TYPES } from "@/lib/services/plantTimeline"
import { suggestionProductLabel, type Suggestion } from "@/lib/services/suggestionEngine"

export const MAX_VISIBLE_SUGGESTIONS = 3

export function SuggestionCards({ suggestions, onAccept, onIgnore, busy = false }: {
  suggestions: Suggestion[]
  onAccept: (suggestion: Suggestion, chosen: string[]) => void
  onIgnore: (suggestion: Suggestion) => void
  busy?: boolean
}) {
  const [choices, setChoices] = useState<Record<string, string[]>>({})
  const [missing, setMissing] = useState<string | null>(null)
  const visible = suggestions.slice(0, MAX_VISIBLE_SUGGESTIONS)
  const hidden = suggestions.length - visible.length

  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2" aria-label="Suggestions">
      <ul className="flex flex-col gap-2">
        {visible.map((suggestion) => {
          const chosen = choices[suggestion.id] ?? suggestion.chosen
          const selectable = suggestion.needsChoice
            ? Object.entries(FIELD_TREATMENT_LABELS)
            : suggestion.options.map((code) => [code, (suggestion.programType === "fertilisation" ? FERTILIZER_LABELS : FIELD_TREATMENT_LABELS)[code] ?? code] as const)
          const product = suggestionProductLabel({ programType: suggestion.programType, chosen, task: suggestion.task })
          const canPick = suggestion.needsChoice || suggestion.options.length > 1
          const unresolved = suggestion.programType !== "hygiene" && chosen.length === 0

          function accept() {
            if (unresolved) { setMissing(suggestion.id); return }
            setMissing(null)
            onAccept(suggestion, chosen)
          }

          return (
            <li key={suggestion.id}>
              <Card className={suggestion.source === "observation" ? "border-destructive/40" : suggestion.late ? "border-chart-3/50" : ""}>
                <div className="flex items-stretch gap-2 p-2">
                  <button
                    type="button"
                    onClick={accept}
                    disabled={busy}
                    aria-label={`Valider la suggestion : ${suggestion.title}${product ? ` (${product})` : ""}`}
                    className="min-w-0 flex-1 rounded-md p-2 text-left hover:bg-muted/40 disabled:opacity-60"
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{suggestion.title}</span>
                      <Badge tone={suggestion.source === "observation" ? "danger" : "primary"}>{suggestion.source === "observation" ? "Observation" : PROGRAM_TYPE_LABELS[suggestion.programType]}</Badge>
                      {suggestion.late ? <Badge tone="warning">En retard</Badge> : null}
                      {suggestion.optional ? <Badge tone="neutral">Si nécessaire</Badge> : null}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{suggestion.reason}</span>
                    {product ? <span className="mt-1.5 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{product}</span> : null}
                    {missing === suggestion.id ? <span role="alert" className="mt-1 block text-xs text-destructive">Choisissez le produit à droite pour valider.</span> : null}
                  </button>
                  <div className="flex shrink-0 flex-col justify-center gap-1">
                    {canPick ? (
                      <Select
                        aria-label={`Produit pour ${suggestion.title}`}
                        value={chosen[0] ?? ""}
                        onChange={(event) => setChoices((current) => ({ ...current, [suggestion.id]: event.target.value ? [event.target.value] : [] }))}
                        className="h-8 text-xs"
                      >
                        {suggestion.needsChoice ? <option value="">-- Choisir --</option> : null}
                        {selectable.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                      </Select>
                    ) : null}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onIgnore(suggestion)}>Ignorer</Button>
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      {hidden > 0 ? <p className="text-xs text-muted-foreground">+ {hidden} autre{hidden > 1 ? "s" : ""} suggestion{hidden > 1 ? "s" : ""} après celles-ci.</p> : null}
    </div>
  )
}

// ----------------------- Intervenir sans suggestion -------------------------

export interface ManualDraft {
  programType: (typeof NEW_INTERVENTION_TYPES)[number]
  treatmentCodes: string[]
  fertilizerCode: string
  date: string
  alreadyDone: boolean
  result: string
  notes: string
}

export function ManualInterventionForm({ title = "Intervenir", minDate, today, submit, onCancel, onDone }: {
  title?: string
  /** Mise en place du plant : aucun soin avant cette date. */
  minDate?: string
  today: string
  submit: (draft: ManualDraft) => Promise<{ error: string | null; saved: boolean }>
  onCancel: () => void
  onDone: (message: string) => void
}) {
  const [programType, setProgramType] = useState<ManualDraft["programType"]>("curatif")
  const [treatmentCodes, setTreatmentCodes] = useState<string[]>([])
  const [fertilizerCode, setFertilizerCode] = useState("")
  const [date, setDate] = useState(today)
  const [alreadyDone, setAlreadyDone] = useState(true)
  const [result, setResult] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFuture = isIsoDate(date) && date > today
  const effectiveDone = alreadyDone && !isFuture

  function toggleTreatment(code: string) {
    setTreatmentCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
  }

  async function onSubmit() {
    const problem = newInterventionProblem({ programType, treatmentCodes, fertilizerCode, date, alreadyDone: effectiveDone, result, plantedAt: minDate ?? "0000-01-01", today })
    if (problem) { setError(problem); return }
    setBusy(true)
    setError(null)
    const outcome = await submit({ programType, treatmentCodes, fertilizerCode, date, alreadyDone: effectiveDone, result, notes })
    setBusy(false)
    // Échec total : on reste sur le formulaire. Succès partiel : on ferme, le soin est visible dans la liste.
    if (outcome.error && !outcome.saved) { setError(outcome.error); return }
    onDone(outcome.error ?? (effectiveDone ? "Soin enregistré." : "Soin planifié."))
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" htmlFor="manual-type">
          <Select id="manual-type" value={programType} onChange={(event) => setProgramType(event.target.value as ManualDraft["programType"])}>
            {NEW_INTERVENTION_TYPES.map((type) => <option key={type} value={type}>{PROGRAM_TYPE_LABELS[type]}</option>)}
          </Select>
        </Field>
        <Field label="Date" htmlFor="manual-date" hint={isFuture ? "Date à venir : le soin sera planifié." : undefined}>
          <Input id="manual-date" type="date" value={date} min={minDate} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>

      {programType === "fertilisation" ? (
        <Field label="Amendement" htmlFor="manual-fert">
          <Select id="manual-fert" value={fertilizerCode} onChange={(event) => setFertilizerCode(event.target.value)}>
            <option value="">-- Choisir --</option>
            {Object.entries(FERTILIZER_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </Select>
        </Field>
      ) : (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Traitement</legend>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(FIELD_TREATMENT_LABELS).map(([key, text]) => (
              <label key={key} className="flex items-center gap-1.5">
                <input type="checkbox" checked={treatmentCodes.includes(key)} onChange={() => toggleTreatment(key)} /> {text}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className={isFuture ? "flex items-center gap-2 text-sm text-muted-foreground" : "flex items-center gap-2 text-sm text-foreground"}>
        <input type="checkbox" checked={effectiveDone} disabled={isFuture} onChange={(event) => setAlreadyDone(event.target.checked)} />
        Déjà fait
      </label>
      {effectiveDone ? (
        <Field label="Résultat" htmlFor="manual-result">
          <Select id="manual-result" value={result} onChange={(event) => setResult(event.target.value)}>
            <option value="">Pas encore de résultat</option>
            {Object.entries(PROGRAM_RESULT_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </Select>
        </Field>
      ) : null}
      <Field label="Note" htmlFor="manual-notes">
        <Textarea id="manual-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Facultatif" />
      </Field>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button size="sm" onClick={onSubmit} disabled={busy}>{busy ? "Enregistrement…" : effectiveDone ? "Enregistrer le soin" : "Planifier le soin"}</Button>
      </div>
    </Card>
  )
}
