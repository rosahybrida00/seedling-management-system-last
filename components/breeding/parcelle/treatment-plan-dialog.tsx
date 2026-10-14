"use client"

// Pop-up « Plan de traitement » : s'ouvre après une observation ou depuis une
// suggestion. Il montre les problèmes pris en compte, le produit retenu pour
// chacun (par catégorie), le calendrier daté (J0 puis rappels) et se valide en un
// clic. Tout reste ajustable : changer de produit parmi ceux qui conviennent,
// retirer un produit. Jamais vide : si aucun produit précis n'existe, la
// catégorie fournit un produit et la raison est affichée.

import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, Select } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { FIELD_TREATMENT_LABELS } from "@/lib/domain/fieldLabels"
import { CATEGORY_LABELS } from "@/lib/domain/treatmentMatrix"
import { planApplications, withProduct, withoutStep, type TreatmentPlan } from "@/lib/services/treatmentPlanner"

export function TreatmentPlanDialog({ plan, startDate, busy = false, error = null, onValidate, onClose }: {
  plan: TreatmentPlan
  startDate: string
  busy?: boolean
  error?: string | null
  onValidate: (plan: TreatmentPlan) => void
  onClose: () => void
}) {
  const [current, setCurrent] = useState(plan)
  useEffect(() => setCurrent(plan), [plan])

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const applications = useMemo(() => planApplications(current, startDate), [current, startDate])
  const modeLabel = current.mode === "curatif" ? "curatif" : "préventif"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-dialog-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-xl sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 id="plan-dialog-title" className="font-serif text-lg text-foreground">Plan de traitement {modeLabel}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Problèmes pris en compte">
              {current.signalLabels.map((label) => <Badge key={label} tone={current.mode === "curatif" ? "danger" : "primary"}>{label}</Badge>)}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">{current.summary}. Première application aujourd&apos;hui, puis les rappels sont posés dans le calendrier.</p>

          <ul className="flex flex-col gap-3">
            {current.steps.map((step, index) => {
              const dates = applications.filter((application) => application.stepIndex === index)
              const choices = [step.productCode, ...step.alternatives]
              return (
                <li key={`${step.productCode}-${index}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={step.category === "fongicide" ? "primary" : "accent"}>{CATEGORY_LABELS[step.category].split(" (")[0]}</Badge>
                    <span className="text-xs text-muted-foreground">contre {step.coversLabels.join(", ")}</span>
                    {current.steps.length > 1 ? (
                      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setCurrent(withoutStep(current, index))}>Retirer ce produit</Button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {choices.length > 1 ? (
                      <Select aria-label={`Produit contre ${step.coversLabels.join(", ")}`} value={step.productCode} onChange={(event) => setCurrent(withProduct(current, index, event.target.value))} className="h-9 max-w-xs">
                        {choices.map((code) => <option key={code} value={code}>{FIELD_TREATMENT_LABELS[code] ?? code}</option>)}
                      </Select>
                    ) : (
                      <span className="text-sm font-medium text-foreground">{step.productLabel}</span>
                    )}
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Calendrier de ${step.productLabel}`}>
                    {dates.map((application) => (
                      <li key={application.date} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                        <span className="font-semibold">{application.label}</span> · {formatDate(application.date)}
                      </li>
                    ))}
                  </ul>
                  {!step.explicit ? <p className="mt-2 text-xs italic text-muted-foreground">{step.reason}</p> : null}
                </li>
              )
            })}
          </ul>

          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {current.steps.length > 1 ? <li>Un produit à la fois : ils ne sont pas appliqués le même jour, jamais mélangés.</li> : null}
            <li>Dose et mode d&apos;emploi : selon l&apos;étiquette du produit.</li>
          </ul>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Plus tard</Button>
          <Button size="sm" onClick={() => onValidate(current)} disabled={busy || current.steps.length === 0}>
            {busy ? "Enregistrement…" : "Valider le plan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
